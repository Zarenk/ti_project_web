import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  generateBoletaXML,
  generateCreditNoteXML,
  generateInvoiceXML,
} from './utils/xml-generator';
import { firmarDocumentoUBL } from './utils/signer';
import { generateZip } from './utils/zip-generator';
import { sendToSunat } from './utils/sunat-client';
import * as path from 'path';
import * as fs from 'fs';
import { resolveStoragePath } from 'src/utils/path-utils';
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
  creditNoteId?: number | null;
  subscriptionInvoiceId?: number | null;
}

@Injectable()
export class SunatService {
  private readonly logger = new Logger(SunatService.name);

  constructor(
    private prismaService: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async sendDocument(params: SendDocumentParams) {
    const {
      documentType,
      documentData,
      companyId,
      privateKeyPathOverride,
      certificatePathOverride,
      environmentOverride,
      saleId,
      creditNoteId,
      subscriptionInvoiceId,
    } = params;

    let transmissionId: number | null = null;
    try {
      const normalizedType = this.normalizeDocumentType(documentType);
      const company = await this.prismaService.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          organizationId: true,
          name: true,
          taxId: true,
          sunatEnvironment: true,
          sunatRuc: true,
          sunatBusinessName: true,
          sunatAddress: true,
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

      const emisorDefaults = {
        razonSocial: company.sunatBusinessName ?? company.name ?? '',
        direccion: company.sunatAddress ?? '',
      };
      const payload = {
        ...documentData,
        emisor: {
          ...emisorDefaults,
          ...(documentData?.emisor ?? {}),
          ruc, // company RUC always wins
        },
      };

      let xml: string;
      if (normalizedType === 'invoice') {
        xml = generateInvoiceXML(payload);
      } else if (normalizedType === 'boleta') {
        xml = generateBoletaXML(payload);
      } else {
        xml = generateCreditNoteXML(payload);
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

      // Validate serie format against SUNAT requirements
      this.validateSerieFormat(serie, tipoComprobante, normalizedType);

      const zipFileName = `${ruc}-${tipoComprobante}-${serie}-${correlativo}`;
      const zipFilePath = generateZip(zipFileName, signedXml, normalizedType);
      const xmlFolder = resolveStoragePath('sunat', 'xml', normalizedType);
      if (!fs.existsSync(xmlFolder)) {
        fs.mkdirSync(xmlFolder, { recursive: true });
      }
      const xmlFilePath = path.join(xmlFolder, `${zipFileName}.xml`);
      fs.writeFileSync(xmlFilePath, signedXml, 'utf-8');

      const sunatUrl = isProd ? SUNAT_ENDPOINTS.PROD : SUNAT_ENDPOINTS.BETA;

      const transmission = await this.prismaService.sunatTransmission.create({
        data: {
          companyId,
          organizationId: company.organizationId ?? null,
          saleId: saleId ?? null,
          creditNoteId: creditNoteId ?? null,
          subscriptionInvoiceId: subscriptionInvoiceId ?? null,
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
      const responsePayload = {
        ...response,
        cdrXml: undefined,
      };
      const cdrCode = response?.cdrCode ?? null;
      const cdrDescription = response?.cdrDescription ?? null;
      const cdrXml = response?.cdrXml ?? null;
      const soapFault = response?.soapFault ?? null;
      let status = 'SENT';
      let errorMessage: string | null = null;
      if (cdrCode) {
        if (cdrCode === '0') {
          status = 'ACCEPTED';
        } else if (cdrCode === '98') {
          status = 'PENDING';
        } else if (cdrCode === '99') {
          status = 'REJECTED';
        } else {
          status = 'OBSERVED';
        }
      } else if (soapFault) {
        // SUNAT returned a SOAP Fault (no CDR)
        status = 'FAILED';
        errorMessage = soapFault;
      } else {
        // Response received but no CDR and no fault — mark as SENT for retry
        errorMessage =
          'Respuesta recibida de SUNAT pero sin CDR. Será reintentado automáticamente.';
      }
      let cdrFilePath: string | null = null;
      if (cdrXml) {
        const cdrFolder = resolveStoragePath('sunat', 'cdr', normalizedType);
        if (!fs.existsSync(cdrFolder)) {
          fs.mkdirSync(cdrFolder, { recursive: true });
        }
        cdrFilePath = path.join(cdrFolder, `${zipFileName}-cdr.xml`);
        fs.writeFileSync(cdrFilePath, cdrXml, 'utf-8');
      }

      await this.prismaService.sunatTransmission.update({
        where: { id: transmission.id },
        data: {
          status,
          response: this.wrapJsonResponse(responsePayload),
          xmlFilePath,
          cdrFilePath,
          cdrCode,
          cdrDescription,
          errorMessage,
        },
      });

      this.logger.log(
        `SUNAT ${environment} [${normalizedType}] ${serie}-${correlativo} → ${status}` +
          (cdrCode ? ` (CDR: ${cdrCode})` : '') +
          (cdrDescription ? ` — ${cdrDescription}` : '') +
          (soapFault ? ` — SOAP Fault: ${soapFault}` : ''),
      );

      // Fire-and-forget: notify WhatsApp automation when invoice is accepted
      if (status === 'ACCEPTED' && saleId) {
        this.eventEmitter.emit('sale.sunat-accepted', {
          saleId,
          organizationId: company.organizationId,
          companyId,
          documentType: normalizedType,
          serie,
          correlativo,
        });
      }

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
    tipo: 'boleta' | 'factura' | 'nota_credito',
    filename: string,
    relativePath?: string,
  ): string {
    const filePath = relativePath
      ? resolveStoragePath(relativePath)
      : path.join(resolveStoragePath('comprobantes/pdf', tipo), filename);

    if (!fs.existsSync(filePath)) {
      throw new Error('Archivo no encontrado');
    }

    return filePath;
  }

  /**
   * Validates that the serie matches SUNAT naming requirements.
   * - Facturas (01): must start with F
   * - Boletas (03): must start with B
   * - Notas de Crédito (07): must start with F or B
   */
  private validateSerieFormat(
    serie: string,
    tipoComprobante: string,
    documentType: SunatDocumentType,
  ) {
    if (!serie || serie.length < 4) {
      throw new BadRequestException(
        `La serie "${serie}" es inválida. Debe tener al menos 4 caracteres (ej: F001, B001).`,
      );
    }

    const firstChar = serie.charAt(0).toUpperCase();

    if (tipoComprobante === '01' && firstChar !== 'F') {
      throw new BadRequestException(
        `La serie "${serie}" es inválida para facturas. ` +
          `Las facturas electrónicas deben tener una serie que inicie con "F" (ej: F001). ` +
          `Corrija la serie en Configuración > Empresa > Comprobantes.`,
      );
    }

    if (tipoComprobante === '03' && firstChar !== 'B') {
      throw new BadRequestException(
        `La serie "${serie}" es inválida para boletas. ` +
          `Las boletas electrónicas deben tener una serie que inicie con "B" (ej: B001). ` +
          `Corrija la serie en Configuración > Empresa > Comprobantes.`,
      );
    }

    if (tipoComprobante === '07' && firstChar !== 'F' && firstChar !== 'B') {
      throw new BadRequestException(
        `La serie "${serie}" es inválida para notas de crédito. ` +
          `Debe iniciar con "F" o "B" según el comprobante original. ` +
          `Corrija la serie en Configuración > Empresa > Comprobantes.`,
      );
    }
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
      : resolveStoragePath(value);

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

  // ── Public verification methods ──────────────────────────

  async getPublicInvoiceByCode(code: string) {
    const invoice = await this.prismaService.invoiceSales.findUnique({
      where: { verificationCode: code },
      include: {
        company: {
          select: {
            name: true,
            taxId: true,
            sunatAddress: true,
            sunatPhone: true,
            logoUrl: true,
            sunatRuc: true,
          },
        },
        sales: {
          select: {
            total: true,
            description: true,
            createdAt: true,
            client: {
              select: { name: true, type: true },
            },
            salesDetails: {
              select: {
                quantity: true,
                price: true,
                productId: true,
                entryDetail: {
                  select: {
                    product: {
                      select: { name: true, barcode: true },
                    },
                  },
                },
              },
            },
            sunatTransmissions: {
              orderBy: { createdAt: 'desc' as const },
              take: 1,
              select: {
                status: true,
                cdrCode: true,
                cdrDescription: true,
                environment: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) return null;

    const sale = invoice.sales;
    const sunatTx = sale.sunatTransmissions?.[0] ?? null;
    const ruc = invoice.company.sunatRuc ?? invoice.company.taxId ?? null;

    return {
      verificationCode: invoice.verificationCode,
      comprobante: {
        tipo: invoice.tipoComprobante,
        serie: invoice.serie,
        correlativo: invoice.nroCorrelativo,
        moneda: invoice.tipoMoneda ?? 'PEN',
        fechaEmision: invoice.fechaEmision,
        total: invoice.total,
      },
      emisor: {
        razonSocial: invoice.company.name,
        ruc,
        direccion: invoice.company.sunatAddress,
        telefono: invoice.company.sunatPhone,
        logo: invoice.company.logoUrl,
      },
      cliente: {
        nombre: sale.client?.name ?? null,
        tipoDocumento: sale.client?.type ?? null,
      },
      items: sale.salesDetails.map((d) => ({
        producto: d.entryDetail?.product?.name ?? 'Producto',
        sku: d.entryDetail?.product?.barcode ?? null,
        cantidad: d.quantity,
        precioUnitario: d.price,
        subtotal: d.quantity * d.price,
      })),
      montos: this.calculateMontos(sale.salesDetails, invoice.total),
      sunat: sunatTx
        ? {
            estado: sunatTx.status,
            codigo: sunatTx.cdrCode,
            descripcion: sunatTx.cdrDescription,
            ambiente: sunatTx.environment,
            fecha: sunatTx.createdAt,
          }
        : null,
      hasPdf: await this.hasStoredPdf(invoice),
    };
  }

  async getPublicInvoiceBySearch(ruc: string, serie: string, correlativo: string) {
    const company = await this.prismaService.company.findFirst({
      where: {
        OR: [
          { sunatRuc: ruc },
          { taxId: ruc },
        ],
      },
      select: { id: true },
    });

    if (!company) return null;

    const invoice = await this.prismaService.invoiceSales.findFirst({
      where: {
        companyId: company.id,
        serie: serie.toUpperCase(),
        nroCorrelativo: correlativo,
      },
      select: { verificationCode: true },
    });

    if (!invoice?.verificationCode) return null;

    return { verificationCode: invoice.verificationCode };
  }

  async getPublicPdfPath(code: string): Promise<string | null> {
    const invoice = await this.prismaService.invoiceSales.findUnique({
      where: { verificationCode: code },
      select: {
        companyId: true,
        tipoComprobante: true,
        serie: true,
        nroCorrelativo: true,
      },
    });

    if (!invoice) return null;

    const tipo = invoice.tipoComprobante?.toUpperCase() === 'FACTURA' ? 'factura' : 'boleta';
    const filename = `${invoice.serie}-${invoice.nroCorrelativo}.pdf`;

    const storedPdf = await this.prismaService.sunatStoredPdf.findFirst({
      where: {
        companyId: invoice.companyId,
        filename,
      },
      select: { relativePath: true },
    });

    if (storedPdf?.relativePath) {
      const filePath = resolveStoragePath(storedPdf.relativePath);
      if (fs.existsSync(filePath)) return filePath;
    }

    // Fallback: try the standard path
    const standardPath = path.join(
      resolveStoragePath('comprobantes/pdf', tipo),
      filename,
    );
    if (fs.existsSync(standardPath)) return standardPath;

    return null;
  }

  private calculateMontos(
    details: { quantity: number; price: number }[],
    invoiceTotal: number | null,
  ) {
    const subtotal = details.reduce((sum, d) => sum + d.quantity * d.price, 0);
    const total = invoiceTotal ?? subtotal;
    const igv = +(total - total / 1.18).toFixed(2);
    const gravada = +(total - igv).toFixed(2);

    return {
      gravada,
      igv,
      exonerada: 0,
      inafecta: 0,
      total,
    };
  }

  private async hasStoredPdf(invoice: {
    companyId: number;
    serie: string;
    nroCorrelativo: string;
    tipoComprobante: string;
  }): Promise<boolean> {
    const filename = `${invoice.serie}-${invoice.nroCorrelativo}.pdf`;
    const stored = await this.prismaService.sunatStoredPdf.findFirst({
      where: { companyId: invoice.companyId, filename },
      select: { id: true },
    });
    if (stored) return true;

    const tipo = invoice.tipoComprobante?.toUpperCase() === 'FACTURA' ? 'factura' : 'boleta';
    const standardPath = path.join(
      resolveStoragePath('comprobantes/pdf', tipo),
      filename,
    );
    return fs.existsSync(standardPath);
  }
}
