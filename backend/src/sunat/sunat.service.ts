import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma.service';
import { generateBoletaXML, generateInvoiceXML } from './utils/xml-generator';
import { firmarDocumentoUBL } from './utils/signer';
import { generateZip } from './utils/zip-generator';
import { sendToSunat } from './utils/sunat-client';
import * as path from 'path';
import * as fs from 'fs';
import { resolveBackendPath } from 'src/utils/path-utils';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

const SUNAT_ENDPOINTS = {
  BETA: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
  PROD: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService',
} as const;

type SunatDocumentType = 'invoice' | 'boleta' | 'creditNote';

interface SendDocumentParams {
  documentType: SunatDocumentType;
  documentData: any;
  companyId: number;
  privateKeyPathOverride?: string | null;
  certificatePathOverride?: string | null;
  environmentOverride?: string;
  saleId?: number | null;
}

@Injectable()
export class SunatService {
  constructor(private prismaService: PrismaService) {}

  async sendDocument(params: SendDocumentParams) {
    const {
      documentType,
      documentData,
      companyId,
      privateKeyPathOverride,
      certificatePathOverride,
      environmentOverride,
      saleId,
    } = params;

    let transmissionId: number | null = null;
    try {
      const normalizedType = this.normalizeDocumentType(documentType);
      const company = await this.prismaService.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          organizationId: true,
          taxId: true,
          sunatEnvironment: true,
          sunatRuc: true,
          sunatSolUserBeta: true,
          sunatSolPasswordBeta: true,
          sunatCertPathBeta: true,
          sunatKeyPathBeta: true,
          sunatSolUserProd: true,
          sunatSolPasswordProd: true,
          sunatCertPathProd: true,
          sunatKeyPathProd: true,
        },
      });
      if (!company) {
        throw new BadRequestException(
          'La empresa indicada no existe o no tienes acceso.',
        );
      }

      const environment =
        environmentOverride === 'PROD' || environmentOverride === 'BETA'
          ? environmentOverride
          : company.sunatEnvironment === 'PROD'
            ? 'PROD'
            : 'BETA';

      const isProd = environment === 'PROD';

      const username = isProd
        ? company.sunatSolUserProd
        : company.sunatSolUserBeta;
      const password = isProd
        ? company.sunatSolPasswordProd
        : company.sunatSolPasswordBeta;

      if (!username || !password) {
        throw new BadRequestException(
          `La empresa no tiene configurados el usuario y la clave SOL para el ambiente ${environment}.`,
        );
      }

      const certificatePath = this.resolveSunatFilePath(
        certificatePathOverride ??
          (isProd ? company.sunatCertPathProd : company.sunatCertPathBeta),
        `certificado (${environment})`,
      );
      const privateKeyPath = this.resolveSunatFilePath(
        privateKeyPathOverride ??
          (isProd ? company.sunatKeyPathProd : company.sunatKeyPathBeta),
        `clave privada (${environment})`,
      );

      const ruc =
        company.sunatRuc?.trim() ??
        company.taxId?.trim() ??
        documentData?.emisor?.ruc;

      if (!ruc) {
        throw new BadRequestException(
          'No se encuentra un RUC configurado para el emisor.',
        );
      }

      const payload = {
        ...documentData,
        emisor: {
          ...(documentData?.emisor ?? {}),
          ruc,
        },
      };

      let xml: string;
      if (normalizedType === 'invoice') {
        xml = generateInvoiceXML(payload);
      } else if (normalizedType === 'boleta') {
        xml = generateBoletaXML(payload);
      } else {
        xml = generateInvoiceXML(payload);
      }

      const signedXml = await firmarDocumentoUBL(
        xml,
        privateKeyPath,
        certificatePath,
      );

      const tipoComprobante =
        normalizedType === 'invoice'
          ? '01'
          : normalizedType === 'boleta'
            ? '03'
            : normalizedType === 'creditNote'
              ? '07'
              : '00';

      const serie = payload.serie ?? documentData?.serie ?? '000';
      const correlativo =
        payload.correlativo ?? documentData?.correlativo ?? '000000';

      const zipFileName = `${ruc}-${tipoComprobante}-${serie}-${correlativo}`;
      const zipFilePath = generateZip(zipFileName, signedXml, normalizedType);

      const sunatUrl = isProd ? SUNAT_ENDPOINTS.PROD : SUNAT_ENDPOINTS.BETA;

      const transmission = await this.prismaService.sunatTransmission.create({
        data: {
          companyId,
          organizationId: company.organizationId ?? null,
          saleId: saleId ?? null,
          environment,
          documentType: normalizedType,
          serie,
          correlativo,
          status: 'PENDING',
          payload: this.normalizeJsonInput(payload),
        },
      });
      transmissionId = transmission.id;

      await this.prismaService.sunatTransmission.update({
        where: { id: transmission.id },
        data: {
          zipFilePath,
          status: 'SENDING',
        },
      });

      const response = await sendToSunat(
        zipFilePath,
        zipFileName,
        sunatUrl,
        username,
        password,
      );

      await this.prismaService.sunatTransmission.update({
        where: { id: transmission.id },
        data: {
          status: 'SENT',
          response: this.wrapJsonResponse(response),
        },
      });

      return response;
    } catch (error: any) {
      console.error('Error en el proceso:', error.message);
      if (transmissionId !== null) {
        await this.prismaService.sunatTransmission
          .update({
            where: { id: transmissionId },
            data: {
              status: 'FAILED',
              errorMessage: error?.message ?? 'Error desconocido',
              response: this.wrapJsonResponse(error?.response ?? null),
            },
          })
          .catch(() => undefined);
      }
      throw error;
    }
  }

  async retryTransmission(
    transmissionId: number,
    tenant: TenantContext | null,
  ) {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'Solo los super administradores pueden reintentar envÃ­os.',
      );
    }

    const transmission = await this.prismaService.sunatTransmission.findUnique({
      where: { id: transmissionId },
      include: {
        company: { select: { organizationId: true } },
      },
    });

    if (!transmission) {
      throw new BadRequestException('El envÃ­o indicado no existe.');
    }

    this.ensureOrganizationAccess(transmission.company.organizationId, tenant);

    if (!transmission.payload) {
      throw new BadRequestException(
        'No se puede reintentar porque no se almacenÃ³ el payload.',
      );
    }

    await this.prismaService.sunatTransmission.update({
      where: { id: transmissionId },
      data: { status: 'RETRYING' },
    });

    return this.sendDocument({
      companyId: transmission.companyId,
      documentType: this.normalizeDocumentType(transmission.documentType),
      documentData: transmission.payload,
      environmentOverride: transmission.environment,
      saleId: transmission.saleId ?? null,
    });
  }

  async generarYEnviarConSerie(
    documentType: string,
    companyId?: number | null,
  ): Promise<{ serie: string; correlativo: string }> {
    const normalizedType = this.normalizeDocumentType(documentType);
    const tipo =
      normalizedType === 'invoice'
        ? '01'
        : normalizedType === 'boleta'
          ? '03'
          : normalizedType === 'creditNote'
            ? '07'
            : '00';

    const prefix = tipo === '01' ? 'F001' : tipo === '03' ? 'B001' : 'N001';

    const where: Prisma.InvoiceSalesWhereInput = { serie: prefix };
    if (typeof companyId === 'number') {
      where.companyId = companyId;
    }

    const ultimo = await this.prismaService.invoiceSales.findFirst({
      where,
      orderBy: { nroCorrelativo: 'desc' },
      select: { serie: true, nroCorrelativo: true },
    });

    const siguiente = ultimo?.nroCorrelativo
      ? String(Number(ultimo.nroCorrelativo) + 1).padStart(3, '0')
      : '001';

    return {
      serie: prefix,
      correlativo: siguiente,
    };
  }

  getComprobantePdfPath(
    tipo: 'boleta' | 'factura',
    filename: string,
    relativePath?: string,
  ): string {
    const filePath = relativePath
      ? resolveBackendPath(relativePath)
      : path.join(resolveBackendPath('comprobantes/pdf', tipo), filename);

    if (!fs.existsSync(filePath)) {
      throw new Error('Archivo no encontrado');
    }

    return filePath;
  }

  private normalizeDocumentType(type: string): SunatDocumentType {
    if (type === 'invoice' || type === 'boleta' || type === 'creditNote') {
      return type;
    }
    throw new BadRequestException(
      'Tipo de documento no soportado. Use "invoice", "boleta" o "creditNote".',
    );
  }

  private resolveSunatFilePath(
    value: string | null | undefined,
    label: string,
  ): string {
    if (!value || !value.trim()) {
      throw new BadRequestException(
        `Debe configurar ${label} antes de enviar documentos a la SUNAT.`,
      );
    }

    const candidate = path.isAbsolute(value)
      ? value
      : resolveBackendPath(value);

    if (!fs.existsSync(candidate)) {
      throw new BadRequestException(
        `El archivo configurado para ${label} no existe (${value}).`,
      );
    }

    return candidate;
  }

  private wrapJsonResponse(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return Prisma.JsonNull;
    }
    if (typeof value === 'object') {
      return value as Prisma.JsonObject;
    }
    return { raw: String(value) };
  }

  private normalizeJsonInput(
    value: unknown,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === undefined || value === null) {
      return Prisma.JsonNull;
    }
    if (typeof value === 'object') {
      return value as Prisma.JsonObject;
    }
    return { raw: String(value) };
  }

  private ensureOrganizationAccess(
    organizationId: number | null,
    tenant: TenantContext | null,
  ) {
    if (!tenant?.isSuperAdmin && !tenant?.isOrganizationSuperAdmin) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar envÃ­os de esta empresa.',
      );
    }

    if (!organizationId) {
      return;
    }

    const allowed = new Set<number>();
    if (tenant.organizationId !== null) {
      allowed.add(tenant.organizationId);
    }
    for (const orgId of tenant.allowedOrganizationIds ?? []) {
      if (typeof orgId === 'number') {
        allowed.add(orgId);
      }
    }
    if (allowed.size > 0 && !allowed.has(organizationId)) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar envÃ­os de esta organizaciÃ³n.',
      );
    }
  }
  async registerStoredPdf(params: {
    organizationId: number;
    companyId: number;
    type: string;
    filename: string;
    relativePath: string;
    userId?: number | null;
  }) {
    const { organizationId, companyId, type, filename, relativePath, userId } =
      params;

    await this.prismaService.sunatStoredPdf.upsert({
      where: {
        companyId_filename: {
          companyId,
          filename,
        },
      },
      update: {
        type,
        relativePath,
        createdBy: userId ?? undefined,
      },
      create: {
        organizationId,
        companyId,
        type,
        filename,
        relativePath,
        createdBy: userId ?? undefined,
      },
    });
  }

  async getStoredPdfForTenant(params: {
    filename: string;
    type: string;
    tenant: TenantContext | null;
  }) {
    const { filename, type, tenant } = params;

    const record = await this.prismaService.sunatStoredPdf.findFirst({
      where: {
        filename,
        type,
      },
    });

    if (!record) {
      throw new NotFoundException('PDF no encontrado.');
    }

    this.ensureOrganizationAccess(record.organizationId, tenant);

    if (
      tenant &&
      !tenant.isSuperAdmin &&
      tenant.companyId !== null &&
      record.companyId !== tenant.companyId &&
      !(tenant.allowedCompanyIds ?? []).includes(record.companyId)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a este PDF.',
      );
    }

    return record;
  }

  async listStoredPdfsForTenant(tenant: TenantContext | null) {
    if (!tenant) {
      throw new ForbiddenException('Contexto de tenant no disponible.');
    }

    const where: Prisma.SunatStoredPdfWhereInput = {};

    if (tenant.companyId !== null && !tenant.isSuperAdmin) {
      where.companyId = {
        in: [
          tenant.companyId,
          ...(tenant.allowedCompanyIds ?? []).filter(
            (id): id is number => typeof id === 'number',
          ),
        ],
      };
    }

    if (!tenant.isSuperAdmin && tenant.organizationId !== null) {
      where.organizationId = tenant.organizationId;
    }

    return this.prismaService.sunatStoredPdf.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
