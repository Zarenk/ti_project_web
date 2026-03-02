import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateDespatchXML } from './utils/generate-despatch-xml';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { zipSignedXmlFromString } from './utils/zip-signed-xml';
import { sendDespatchToSunat } from './utils/send-despatch-to-sunat';
import { extractCdrStatus } from './utils/extract-cdr-status';
import { CreateGuideDto } from './dto/create-guide.dto';
import { firmarGuiaUBL } from './utils/signer';
import AdmZip from 'adm-zip';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { resolveStoragePath } from 'src/utils/path-utils';
import { InventoryService } from 'src/inventory/inventory.service';

@Injectable()
export class GuideService {
  private readonly logger = new Logger(GuideService.name);

  constructor(
    private prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly inventoryService: InventoryService,
  ) {}

  /** Resolve per-company SUNAT credentials and certificate paths. */
  private async resolveCompanyCredentials(companyId: number | null) {
    if (!companyId) {
      throw new BadRequestException(
        'Debe seleccionar una empresa antes de generar una guía.',
      );
    }

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

    const isProd = company.sunatEnvironment === 'PROD';
    const environment = isProd ? 'PROD' : 'BETA';

    const solUser = isProd
      ? company.sunatSolUserProd
      : company.sunatSolUserBeta;
    const solPassword = isProd
      ? company.sunatSolPasswordProd
      : company.sunatSolPasswordBeta;

    if (!solUser || !solPassword) {
      throw new BadRequestException(
        `La empresa no tiene configurados el usuario y la clave SOL para el ambiente ${environment}.`,
      );
    }

    const certPathRaw = isProd
      ? company.sunatCertPathProd
      : company.sunatCertPathBeta;
    const keyPathRaw = isProd
      ? company.sunatKeyPathProd
      : company.sunatKeyPathBeta;

    const certificatePath = this.resolveSunatFilePath(
      certPathRaw,
      `certificado (${environment})`,
    );
    const privateKeyPath = this.resolveSunatFilePath(
      keyPathRaw,
      `clave privada (${environment})`,
    );

    const ruc =
      company.sunatRuc?.trim() ?? company.taxId?.trim() ?? '';

    if (!ruc) {
      throw new BadRequestException(
        'No se encuentra un RUC configurado para el emisor.',
      );
    }

    return {
      company,
      environment,
      isProd,
      ruc,
      solUser,
      solPassword,
      certificatePath,
      privateKeyPath,
      businessName: company.sunatBusinessName ?? company.name ?? '',
    };
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

  async generarGuia(
    dto: CreateGuideDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const creds = await this.resolveCompanyCredentials(companyId);

    this.ensureValidGuide(dto);
    const { serie, correlativo } = dto.serie?.trim() && dto.correlativo?.trim()
      ? { serie: dto.serie!.trim(), correlativo: dto.correlativo!.trim() }
      : await this.allocateGuideSequence(companyId, organizationId);
    const ruc = dto.numeroDocumentoRemitente || creds.ruc;
    const fileNameBase = `${serie}-${correlativo}`;

    // Override DTO sender info from company if not provided
    if (!dto.numeroDocumentoRemitente) dto.numeroDocumentoRemitente = creds.ruc;
    if (!dto.razonSocialRemitente) dto.razonSocialRemitente = creds.businessName;
    if (!dto.tipoDocumentoRemitente) dto.tipoDocumentoRemitente = '6'; // RUC

    // 1. Generate unsigned XML
    const unsignedXml = generateDespatchXML(dto, serie, correlativo);

    // 2. Sign XML with Node signer using per-company certificate
    const signedXml = this.sanitizeSignedXml(
      await firmarGuiaUBL(
        unsignedXml,
        creds.privateKeyPath,
        creds.certificatePath,
      ),
    );
    this.logger.log('[Guide] Firmador: Node (per-company cert)');

    // 3. Persist trace files
    const trace = this.persistTraceFiles(
      signedXml,
      null,
      ruc,
      serie,
      correlativo,
      fileNameBase,
    );

    // 4. Compress signed XML to ZIP
    const zipBuffer = zipSignedXmlFromString(signedXml, ruc, fileNameBase);

    // Verify ZIP integrity
    const testZip = new AdmZip(zipBuffer);
    const zippedXmlBuffer = testZip.getEntries()[0].getData();
    const zippedXml = zippedXmlBuffer.toString('latin1');
    this.persistTraceFiles(
      zippedXml,
      zipBuffer,
      ruc,
      serie,
      correlativo,
      fileNameBase,
    );

    const originalBuffer = Buffer.from(signedXml, 'latin1');
    if (!originalBuffer.equals(zippedXmlBuffer)) {
      this.logger.warn('XML dentro del ZIP no es idéntico al XML firmado.');
    }

    const zipFileName = `${ruc}-09-${fileNameBase}.zip`;

    // 5. Send to SUNAT REST (returns numTicket for async processing)
    const envioResult = await this.sendGuideToSunatRest(
      zipBuffer,
      zipFileName,
      creds,
    );

    this.logger.log(`[GRE] Resultado envio: ${JSON.stringify(envioResult).substring(0, 300)}`);

    // 6. Handle response: REST API returns { numTicket, fecRecepcion }
    // SOAP fallback returns { applicationResponse } directly
    let cdrInfo: { accepted: boolean; code: string; description: string };
    let cdrName: string | null = null;

    if (envioResult.numTicket) {
      // REST async flow: poll for CDR using ticket
      this.logger.log(`[GRE] Ticket recibido: ${envioResult.numTicket} — Consultando estado...`);
      const statusResult = await this.pollTicketStatus(envioResult.numTicket, creds);

      if (statusResult.codRespuesta === '0' && statusResult.arcCdr) {
        // Success — CDR available, extract it
        const cdrBuffer = Buffer.from(statusResult.arcCdr, 'base64');
        cdrInfo = await extractCdrStatus(cdrBuffer);
        this.logger.log(`[GRE] CDR extraído: accepted=${cdrInfo.accepted}, code=${cdrInfo.code}, desc=${cdrInfo.description}`);
        cdrName = this.persistCdrFile(cdrBuffer, trace.zipName);
      } else if (statusResult.codRespuesta === '0') {
        // Accepted by SUNAT but CDR not yet generated after all retries
        this.logger.log('[GRE] SUNAT aceptó la guía pero el CDR no está disponible aún');
        cdrInfo = {
          accepted: true,
          code: '0',
          description: 'Aceptado por SUNAT — CDR pendiente de generación',
        };
      } else if (statusResult.codRespuesta === '98') {
        // Still processing — save as pending
        cdrInfo = {
          accepted: false,
          code: '98',
          description: 'En proceso — SUNAT aún está procesando la guía',
        };
      } else {
        // Error or rejection
        const errMsg = statusResult.error?.desError
          || statusResult.error?.numError
          || `Código de respuesta: ${statusResult.codRespuesta}`;
        cdrInfo = {
          accepted: false,
          code: statusResult.codRespuesta || '99',
          description: errMsg,
        };
      }
    } else if (envioResult.applicationResponse) {
      // SOAP sync flow: CDR returned directly
      const cdrBuffer = Buffer.from(envioResult.applicationResponse, 'base64');
      cdrInfo = await extractCdrStatus(cdrBuffer);
      cdrName = this.persistCdrFile(cdrBuffer, trace.zipName);
    } else {
      // Unknown response format
      this.logger.warn(`[GRE] Formato de respuesta inesperado: ${JSON.stringify(envioResult).substring(0, 300)}`);
      cdrInfo = {
        accepted: false,
        code: 'UNKNOWN',
        description: 'Respuesta inesperada de SUNAT: ' + JSON.stringify(envioResult).substring(0, 200),
      };
    }

    // 7. Save to DB
    const saved = await this.prismaService.shippingGuide.create({
      data: {
        serie,
        correlativo,
        motivoTraslado: dto.motivoTraslado,
        fechaTraslado: new Date(dto.fechaTraslado),
        puntoPartida: dto.puntoPartida,
        puntoLlegada: dto.puntoLlegada,
        transportistaTipoDocumento: dto.transportista.tipoDocumento,
        transportistaNumeroDocumento: dto.transportista.numeroDocumento,
        transportistaRazonSocial: dto.transportista.razonSocial,
        transportistaNumeroPlaca: dto.transportista.numeroPlaca || '',
        destinatarioTipoDocumento: dto.destinatario.tipoDocumento,
        destinatarioNumeroDocumento: dto.destinatario.numeroDocumento,
        destinatarioRazonSocial: dto.destinatario.razonSocial,
        xmlName: trace.xmlName,
        zipName: trace.zipName,
        cdrAceptado: cdrInfo.accepted,
        cdrCode: cdrInfo.code,
        cdrDescription: cdrInfo.description,
        organizationId,
        companyId,
        guideData: dto as any,
        puntoPartidaDireccion: dto.puntoPartidaDireccion || null,
        puntoPartidaUbigeo: dto.puntoPartidaUbigeo || null,
        puntoLlegadaDireccion: dto.puntoLlegadaDireccion || null,
        puntoLlegadaUbigeo: dto.puntoLlegadaUbigeo || null,
        pesoBrutoTotal: dto.pesoBrutoTotal || null,
        pesoBrutoUnidad: dto.pesoBrutoUnidad || null,
        modalidadTraslado: dto.modalidadTraslado || null,
        remitenteRuc: ruc,
        remitenteRazonSocial: dto.razonSocialRemitente || creds.businessName || null,
        isInterStore: dto.isInterStore || false,
        sourceStoreId: dto.isInterStore ? (dto.sourceStoreId || null) : null,
        destinationStoreId: dto.isInterStore ? (dto.destinationStoreId || null) : null,
      },
    });

    // 8. Execute inter-store transfers (post-creation, non-blocking for guide)
    if (dto.isInterStore && dto.transferItems?.length && dto.sourceStoreId && dto.destinationStoreId && dto.userId) {
      try {
        const transferIds: number[] = [];
        for (const item of dto.transferItems) {
          const transferId = await this.inventoryService.transferProductWithSeries({
            sourceStoreId: dto.sourceStoreId,
            destinationStoreId: dto.destinationStoreId,
            productId: item.productId,
            quantity: item.quantity,
            serials: item.serials,
            description: `Transferencia por Guía ${serie}-${correlativo}`,
            userId: dto.userId,
            organizationId,
            companyId,
            shippingGuideId: saved.id,
          });
          transferIds.push(transferId);
        }

        // Update guide with transfer IDs
        await this.prismaService.shippingGuide.update({
          where: { id: saved.id },
          data: { transferIds },
        });
      } catch (transferError: unknown) {
        // Log but don't fail the guide — transfers can be retried
        const errMsg = transferError instanceof Error ? transferError.message : String(transferError);
        const errStack = transferError instanceof Error ? transferError.stack : undefined;
        this.logger.error(
          `Inter-store transfer failed for guide ${serie}-${correlativo}: ${errMsg}`,
          errStack,
        );
      }
    }

    return {
      message: 'Guía enviada y procesada por SUNAT',
      estadoSunat: cdrInfo.accepted ? 'ACEPTADO' : (cdrInfo.code === '98' ? 'EN PROCESO' : 'OBSERVADO / RECHAZADO'),
      codigoRespuesta: cdrInfo.code,
      descripcionRespuesta: cdrInfo.description,
      cdrName,
      shippingGuide: saved,
    };
  }

  async validateGuide(dto: CreateGuideDto, companyId: number | null, organizationId: number | null) {
    const creds = await this.resolveCompanyCredentials(companyId);

    this.ensureValidGuide(dto);
    const serie = dto.serie?.trim() || 'T001';
    const correlativo = dto.correlativo?.trim() || await this.nextCorrelativo(serie, organizationId);
    const ruc = dto.numeroDocumentoRemitente || creds.ruc;
    const fileNameBase = `${serie}-${correlativo}`;

    if (!dto.numeroDocumentoRemitente) dto.numeroDocumentoRemitente = creds.ruc;
    if (!dto.razonSocialRemitente) dto.razonSocialRemitente = creds.businessName;
    if (!dto.tipoDocumentoRemitente) dto.tipoDocumentoRemitente = '6';

    const unsignedXml = generateDespatchXML(dto, serie, correlativo);
    const signedXml = this.sanitizeSignedXml(
      await firmarGuiaUBL(
        unsignedXml,
        creds.privateKeyPath,
        creds.certificatePath,
      ),
    );

    const zipBuffer = zipSignedXmlFromString(signedXml, ruc, fileNameBase);
    const zipFileName = `${ruc}-09-${fileNameBase}.zip`;

    return {
      message: 'XML generado para validación',
      serie,
      correlativo,
      xmlPreview: signedXml.slice(0, 2000),
      zipFileName,
      zipSize: zipBuffer.length,
    };
  }

  async getGuideStatus(id: number, organizationId: number | null) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!guide) {
      throw new NotFoundException('Guía no encontrada');
    }
    const cdrName = guide.zipName ? `R-${guide.zipName}` : null;
    return {
      id: guide.id,
      serie: guide.serie,
      correlativo: guide.correlativo,
      estadoSunat: guide.cdrAceptado ? 'ACEPTADO' : 'OBSERVADO / RECHAZADO',
      cdrCode: guide.cdrCode,
      cdrDescription: guide.cdrDescription,
      xmlName: guide.xmlName,
      zipName: guide.zipName,
      cdrName,
      createdAt: guide.createdAt,
    };
  }

  async getGuideFilePath(
    id: number,
    type: 'xml' | 'zip' | 'cdr',
    organizationId: number | null,
  ) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!guide) {
      throw new NotFoundException('Guía no encontrada');
    }
    const baseDir = path.join(process.cwd(), 'temp', 'gre');
    let filePath: string | null = null;
    if (type === 'xml' && guide.xmlName) {
      filePath = path.join(baseDir, guide.xmlName);
    }
    if (type === 'zip' && guide.zipName) {
      filePath = path.join(baseDir, guide.zipName);
    }
    if (type === 'cdr' && guide.zipName) {
      filePath = path.join(baseDir, `R-${guide.zipName}`);
    }
    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return filePath;
  }

  async findAllShippingGuides(organizationId: number | null) {
    return this.prismaService.shippingGuide.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Re-poll SUNAT to refresh the CDR status of a pending guide.
   * Only works for guides that are not yet accepted (cdrAceptado = false).
   */
  async refreshGuideStatus(id: number, organizationId: number | null, companyId: number | null) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!guide) {
      throw new NotFoundException('Guía no encontrada');
    }
    if (guide.cdrAceptado) {
      return { message: 'La guía ya fue aceptada por SUNAT', guide };
    }

    // We need the company credentials to query SUNAT
    const creds = await this.resolveCompanyCredentials(companyId || guide.companyId);

    // Re-read the ZIP from disk to get the original signed XML
    // We need the numTicket or a way to re-query. Since SUNAT REST GEM API
    // uses ticket-based polling, we can re-submit to get a new ticket and poll again.
    // However, if the guide was already accepted, re-sending would create a duplicate.
    //
    // Better approach: query SUNAT's status endpoint by RUC + serie + correlativo.
    // The GEM API provides: GET /comprobantes/{ruc}-09-{serie}-{correlativo}
    // This returns the CDR directly if available.

    const isProd = creds.isProd ?? false;
    const gemBaseUrl = isProd
      ? (process.env.SUNAT_GEM_ENDPOINT ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem')
      : (process.env.SUNAT_GEM_ENDPOINT_BETA ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem');
    const normalizedBase = gemBaseUrl.replace(/\/+$/, '');

    const clientId = process.env.SUNAT_CLIENT_ID!;
    const clientSecret = process.env.SUNAT_CLIENT_SECRET!;
    const authBaseUrl = 'https://api-seguridad.sunat.gob.pe/v1';
    const oauthUsername = `${creds.ruc}${creds.solUser}`;

    // Get OAuth token
    let token: string;
    try {
      const authResponse = await firstValueFrom(
        this.httpService.post(
          `${authBaseUrl}/clientessol/${clientId}/oauth2/token/`,
          new URLSearchParams({
            grant_type: 'password',
            scope: 'https://api-cpe.sunat.gob.pe',
            client_id: clientId,
            client_secret: clientSecret,
            username: oauthUsername,
            password: creds.solPassword,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );
      token = authResponse.data.access_token;
    } catch (err: any) {
      this.logger.error('[GRE refresh] Error obteniendo token:', err.response?.data || err.message);
      throw new BadRequestException('Error al obtener token SUNAT para consultar estado');
    }

    // Query status by document identifier: GET /comprobantes/{ruc}-09-{serie}-{correlativo}
    const docId = `${creds.ruc}-09-${guide.serie}-${guide.correlativo}`;
    const statusUrl = normalizedBase.endsWith('/comprobantes')
      ? `${normalizedBase}/${docId}`
      : `${normalizedBase}/comprobantes/${docId}`;

    this.logger.log(`[GRE refresh] Consultando estado: GET ${statusUrl}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(statusUrl, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      const data = response.data;
      this.logger.log(`[GRE refresh] Respuesta: codRespuesta=${data.codRespuesta}, indCdrGenerado=${data.indCdrGenerado}`);

      if (data.codRespuesta === '0' && data.arcCdr) {
        // CDR available — extract and update
        const cdrBuffer = Buffer.from(data.arcCdr, 'base64');
        const cdrInfo = await extractCdrStatus(cdrBuffer);
        this.logger.log(`[GRE refresh] CDR extraído: accepted=${cdrInfo.accepted}, code=${cdrInfo.code}, desc=${cdrInfo.description}`);

        // Persist CDR file
        if (guide.zipName) {
          this.persistCdrFile(cdrBuffer, guide.zipName);
        }

        // Update DB
        const updated = await this.prismaService.shippingGuide.update({
          where: { id: guide.id },
          data: {
            cdrAceptado: cdrInfo.accepted,
            cdrCode: cdrInfo.code,
            cdrDescription: cdrInfo.description,
          },
        });

        return {
          message: cdrInfo.accepted ? 'Guía aceptada por SUNAT' : 'Estado actualizado',
          estadoSunat: cdrInfo.accepted ? 'ACEPTADO' : 'RECHAZADO',
          cdrCode: cdrInfo.code,
          cdrDescription: cdrInfo.description,
          guide: updated,
        };
      } else if (data.codRespuesta === '0') {
        // Accepted but CDR not yet generated
        const updated = await this.prismaService.shippingGuide.update({
          where: { id: guide.id },
          data: {
            cdrAceptado: true,
            cdrCode: '0',
            cdrDescription: 'Aceptado por SUNAT — CDR pendiente de generación',
          },
        });
        return {
          message: 'Guía aceptada por SUNAT (CDR pendiente)',
          estadoSunat: 'ACEPTADO',
          cdrCode: '0',
          cdrDescription: 'Aceptado por SUNAT — CDR pendiente de generación',
          guide: updated,
        };
      } else if (data.codRespuesta === '98') {
        return {
          message: 'SUNAT aún está procesando la guía',
          estadoSunat: 'EN PROCESO',
          cdrCode: '98',
          cdrDescription: 'En proceso — SUNAT aún está procesando la guía',
        };
      } else {
        // Error or rejection — update DB
        const errMsg = data.error?.desError || data.error?.numError || `Código: ${data.codRespuesta}`;
        const updated = await this.prismaService.shippingGuide.update({
          where: { id: guide.id },
          data: {
            cdrAceptado: false,
            cdrCode: data.codRespuesta || '99',
            cdrDescription: errMsg,
          },
        });
        return {
          message: 'Guía rechazada por SUNAT',
          estadoSunat: 'RECHAZADO',
          cdrCode: data.codRespuesta,
          cdrDescription: errMsg,
          guide: updated,
        };
      }
    } catch (err: any) {
      const statusCode = err.response?.status;
      const errData = err.response?.data;
      this.logger.error(`[GRE refresh] Error consultando estado (HTTP ${statusCode}):`, errData || err.message);

      // If 404, the document may not exist yet in SUNAT
      if (statusCode === 404) {
        return {
          message: 'SUNAT no tiene registro de esta guía. Puede que aún no haya sido procesada.',
          estadoSunat: 'NO ENCONTRADA',
        };
      }

      throw new BadRequestException(
        'Error al consultar estado SUNAT: ' + JSON.stringify(errData || err.message),
      );
    }
  }

  /** Public lookup by RUC + serie + correlativo (no auth required). */
  async findPublicGuide(ruc: string, serie: string, correlativo: string) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { remitenteRuc: ruc, serie, correlativo },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        motivoTraslado: true,
        fechaTraslado: true,
        modalidadTraslado: true,
        puntoPartida: true,
        puntoPartidaDireccion: true,
        puntoPartidaUbigeo: true,
        puntoLlegada: true,
        puntoLlegadaDireccion: true,
        puntoLlegadaUbigeo: true,
        destinatarioTipoDocumento: true,
        destinatarioNumeroDocumento: true,
        destinatarioRazonSocial: true,
        transportistaTipoDocumento: true,
        transportistaNumeroDocumento: true,
        transportistaRazonSocial: true,
        transportistaNumeroPlaca: true,
        pesoBrutoTotal: true,
        pesoBrutoUnidad: true,
        remitenteRuc: true,
        remitenteRazonSocial: true,
        cdrAceptado: true,
        cdrCode: true,
        cdrDescription: true,
        createdAt: true,
        guideData: true,
      },
    });
    return guide;
  }

  // ── Deletion / Voiding ──────────────────────────────────────────

  /**
   * Delete a guide that was NOT accepted by SUNAT.
   * Removes the DB record and associated files from disk.
   */
  async deleteGuide(id: number, organizationId: number | null) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!guide) {
      throw new NotFoundException('Guía no encontrada');
    }
    if (guide.cdrAceptado) {
      throw new ConflictException(
        'No se puede eliminar una guía aceptada por SUNAT. Debe anularla desde el Portal SOL de SUNAT y luego marcarla como anulada en el sistema.',
      );
    }
    if (guide.status === 'VOIDED') {
      throw new ConflictException('Esta guía ya fue anulada.');
    }

    // Clean up files from disk
    const baseDir = path.join(process.cwd(), 'temp', 'gre');
    const filesToDelete = [
      guide.xmlName,
      guide.zipName,
      guide.zipName ? `R-${guide.zipName}` : null,
    ].filter(Boolean) as string[];

    for (const fileName of filesToDelete) {
      const filePath = path.join(baseDir, fileName);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (err) {
        this.logger.warn(`[Guide] No se pudo eliminar archivo: ${filePath}`);
      }
    }

    // Unlink from sale/entry if connected
    await this.prismaService.shippingGuide.delete({ where: { id: guide.id } });

    this.logger.log(`[Guide] Guía ${guide.serie}-${guide.correlativo} eliminada (id=${id})`);
    return { message: 'Guía eliminada correctamente' };
  }

  /**
   * Mark a SUNAT-accepted guide as voided.
   * The user must first void it in the SUNAT SOL Portal manually.
   */
  async voidGuide(id: number, organizationId: number | null, reason?: string) {
    const guide = await this.prismaService.shippingGuide.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
    });
    if (!guide) {
      throw new NotFoundException('Guía no encontrada');
    }
    if (guide.status === 'VOIDED') {
      throw new ConflictException('Esta guía ya fue anulada.');
    }

    const updated = await this.prismaService.shippingGuide.update({
      where: { id: guide.id },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: reason || null,
        ventaId: null,
        entryId: null,
      },
    });

    this.logger.log(`[Guide] Guía ${guide.serie}-${guide.correlativo} marcada como ANULADA (id=${id})`);
    return updated;
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Allocate the next serie + correlativo for a guide using CompanyDocumentSequence.
   * Falls back to legacy behaviour (T001 + max from ShippingGuide table) when no
   * sequence has been configured for the company.
   */
  private async allocateGuideSequence(
    companyId: number | null,
    organizationId: number | null,
  ): Promise<{ serie: string; correlativo: string }> {
    if (companyId) {
      const sequence = await this.prismaService.companyDocumentSequence.findUnique({
        where: {
          companyId_documentType: {
            companyId,
            documentType: 'GUIA',
          },
        },
      });

      if (sequence) {
        const updated = await this.prismaService.companyDocumentSequence.update({
          where: { id: sequence.id },
          data: { nextCorrelative: { increment: 1 } },
          select: { nextCorrelative: true, serie: true, correlativeLength: true },
        });

        const issuedNumber = updated.nextCorrelative - 1;
        const padding = updated.correlativeLength ?? sequence.correlativeLength ?? 8;

        return {
          serie: updated.serie,
          correlativo: String(issuedNumber).padStart(padding, '0'),
        };
      }
    }

    // Fallback: legacy behaviour — T001 + max from ShippingGuide table
    const serie = 'T001';
    const correlativo = await this.nextCorrelativo(serie, organizationId);
    return { serie, correlativo };
  }

  /**
   * Get the next correlativo for a given serie by querying the last used number.
   * Returns zero-padded 8-digit string (e.g. "00000001").
   */
  private async nextCorrelativo(serie: string, organizationId: number | null): Promise<string> {
    const last = await this.prismaService.shippingGuide.findFirst({
      where: {
        serie,
        ...(organizationId ? { organizationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { correlativo: true },
    });

    let nextNum = 1;
    if (last?.correlativo) {
      const parsed = parseInt(last.correlativo, 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    return String(nextNum).padStart(8, '0');
  }

  private ensureValidGuide(dto: CreateGuideDto) {
    const errors: string[] = [];

    if (!dto.motivoTraslado) errors.push('motivoTraslado');
    if (!dto.fechaTraslado) errors.push('fechaTraslado');
    if (!dto.puntoPartida) errors.push('puntoPartida');
    if (!dto.puntoLlegada) errors.push('puntoLlegada');
    if (!dto.transportista?.numeroDocumento)
      errors.push('transportista.numeroDocumento');
    if (!dto.destinatario?.numeroDocumento)
      errors.push('destinatario.numeroDocumento');
    if (!dto.items || dto.items.length === 0) errors.push('items');

    if (dto.pesoBrutoTotal != null && Number(dto.pesoBrutoTotal) <= 0) {
      errors.push('pesoBrutoTotal');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Datos incompletos para la guía',
        fields: errors,
      });
    }
  }

  private persistTraceFiles(
    signedXml: string,
    zipBuffer: Buffer | null,
    ruc: string,
    serie: string,
    correlativo: string,
    fileNameBase: string,
  ) {
    const tempDir = path.join(process.cwd(), 'temp', 'gre');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const traceId = `${ruc}-09-${fileNameBase}-${Date.now()}`;
    const xmlName = `${traceId}.xml`;
    const zipName = `${traceId}.zip`;
    const xmlPath = path.join(tempDir, xmlName);
    fs.writeFileSync(xmlPath, signedXml, 'latin1');

    if (zipBuffer) {
      const zipPath = path.join(tempDir, zipName);
      fs.writeFileSync(zipPath, zipBuffer);
    }

    return { xmlName, zipName };
  }

  private sanitizeSignedXml(xml: string) {
    const sanitized = xml
      .replace(/<PlaceholderSignature\s*\/>/g, '')
      .replace(/<PlaceholderSignature>\s*<\/PlaceholderSignature>/g, '');

    if (sanitized !== xml) {
      this.logger.log('PlaceholderSignature eliminado del XML firmado');
    }

    return sanitized;
  }

  private persistCdrFile(cdrBuffer: Buffer, zipName: string) {
    const tempDir = path.join(process.cwd(), 'temp', 'gre');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const cdrName = `R-${zipName}`;
    const cdrPath = path.join(tempDir, cdrName);
    fs.writeFileSync(cdrPath, cdrBuffer);
    return cdrName;
  }

  /**
   * Poll SUNAT for the ticket status until CDR is ready or max retries reached.
   * codRespuesta: "0" = OK, "98" = in progress, "99" = error
   */
  private async pollTicketStatus(
    numTicket: string,
    creds: { ruc: string; solUser: string; solPassword: string; isProd?: boolean },
    maxRetries = 8,
    delayMs = 3000,
  ): Promise<{
    codRespuesta: string;
    arcCdr?: string;
    indCdrGenerado?: string;
    error?: { numError?: string; desError?: string };
  }> {
    const isProd = creds.isProd ?? false;
    const gemBaseUrl = isProd
      ? (process.env.SUNAT_GEM_ENDPOINT ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem')
      : (process.env.SUNAT_GEM_ENDPOINT_BETA ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem');
    const normalizedBase = gemBaseUrl.replace(/\/+$/, '');

    const clientId = process.env.SUNAT_CLIENT_ID!;
    const clientSecret = process.env.SUNAT_CLIENT_SECRET!;
    const authBaseUrl = 'https://api-seguridad.sunat.gob.pe/v1';
    const oauthUsername = `${creds.ruc}${creds.solUser}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      const statusUrl = normalizedBase.endsWith('/comprobantes')
        ? `${normalizedBase}/envios/${numTicket}`
        : `${normalizedBase}/comprobantes/envios/${numTicket}`;

      this.logger.log(`[GRE] Consultando ticket (intento ${attempt}/${maxRetries}): GET ${statusUrl}`);

      try {
        // Get token using same OAuth password flow as submission
        const authResponse = await firstValueFrom(
          this.httpService.post(
            `${authBaseUrl}/clientessol/${clientId}/oauth2/token/`,
            new URLSearchParams({
              grant_type: 'password',
              scope: 'https://api-cpe.sunat.gob.pe',
              client_id: clientId,
              client_secret: clientSecret,
              username: oauthUsername,
              password: creds.solPassword,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
          ),
        );
        const token = authResponse.data.access_token;

        const response = await firstValueFrom(
          this.httpService.get(statusUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );

        const data = response.data;
        this.logger.log(`[GRE] Estado ticket: codRespuesta=${data.codRespuesta}, indCdrGenerado=${data.indCdrGenerado}`);

        if (data.codRespuesta === '98' || (data.codRespuesta === '0' && data.indCdrGenerado !== '1')) {
          // Still processing or accepted but CDR not yet generated — retry
          this.logger.log(`[GRE] CDR aún no disponible (cod=${data.codRespuesta}, cdr=${data.indCdrGenerado}), reintentando en ${delayMs}ms...`);
          continue;
        }

        return data;
      } catch (err: any) {
        this.logger.error(
          `[GRE] Error al consultar ticket (intento ${attempt}):`,
          err.response?.data || err.message,
        );
        if (attempt === maxRetries) {
          return {
            codRespuesta: '98',
            error: { desError: 'Timeout: SUNAT no respondió después de ' + maxRetries + ' intentos' },
          };
        }
      }
    }

    return {
      codRespuesta: '98',
      error: { desError: 'SUNAT aún procesando después de ' + maxRetries + ' intentos' },
    };
  }

  async sendGuideToSunatRest(
    signedZipBuffer: Buffer,
    fileName: string,
    creds: {
      ruc: string;
      solUser: string;
      solPassword: string;
      isProd?: boolean;
    },
  ): Promise<any> {
    const clientId = process.env.SUNAT_CLIENT_ID;
    const clientSecret = process.env.SUNAT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'SUNAT_CLIENT_ID y SUNAT_CLIENT_SECRET deben estar configurados en las variables de entorno.',
      );
    }

    // OAuth username = RUC + SOL_USER (e.g., 20519857538MODDATOS)
    const oauthUsername = `${creds.ruc}${creds.solUser}`;
    const oauthPassword = creds.solPassword;

    // Determine environment URLs
    const isProd = creds.isProd ?? false;
    const authBaseUrl = isProd
      ? 'https://api-seguridad.sunat.gob.pe/v1'
      : 'https://api-seguridad.sunat.gob.pe/v1';
    const gemBaseUrl = isProd
      ? (process.env.SUNAT_GEM_ENDPOINT ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem')
      : (process.env.SUNAT_GEM_ENDPOINT_BETA ?? 'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem');

    this.logger.log(`[GRE] Ambiente: ${isProd ? 'PRODUCCION' : 'BETA'}`);
    this.logger.log(`[GRE] Auth URL: ${authBaseUrl}/clientessol/${clientId}/oauth2/token/`);
    this.logger.log(`[GRE] OAuth username: ${oauthUsername}`);
    this.logger.log(`[GRE] SOL user: ${creds.solUser}, password: ${creds.solPassword ? creds.solPassword.substring(0, 2) + '***' : '(vacío)'}`);

    // Step 1: Get OAuth 2.0 token
    let token: string;
    try {
      const authResponse = await firstValueFrom(
        this.httpService.post(
          `${authBaseUrl}/clientessol/${clientId}/oauth2/token/`,
          new URLSearchParams({
            grant_type: 'password',
            scope: 'https://api-cpe.sunat.gob.pe',
            client_id: clientId,
            client_secret: clientSecret,
            username: oauthUsername,
            password: oauthPassword,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      token = authResponse.data.access_token;
      this.logger.log(`[GRE] Token obtenido OK (expira en ${authResponse.data.expires_in}s)`);
    } catch (err: any) {
      const errData = err.response?.data || err.message;
      this.logger.error('[GRE] Error al obtener token OAuth:', errData);
      this.logger.error(`[GRE] Verifica: 1) SUNAT_CLIENT_ID/SECRET correspondan al RUC ${creds.ruc} 2) Usuario SOL "${creds.solUser}" y contraseña estén correctos en la configuración de la empresa 3) Para BETA usa usuario MODDATOS con contraseña moddatos (minúsculas)`);
      const hint = errData?.error === 'access_denied'
        ? ` — Verifica que el CLIENT_ID/SECRET correspondan al RUC ${creds.ruc} y que la contraseña SOL sea correcta (BETA: moddatos en minúsculas).`
        : '';
      throw new BadRequestException(
        'Error al obtener token SUNAT: ' +
          (errData?.error_description || JSON.stringify(errData)) + hint,
      );
    }

    try {
      // Step 2: Compute SHA-256 hash of ZIP buffer
      const hashZip = crypto.createHash('sha256').update(signedZipBuffer).digest('hex');

      // Step 3: Build correct request body per SUNAT GRE API spec
      // Body format: { archivo: { nomArchivo, arcGreZip, hashZip } }
      const requestBody = {
        archivo: {
          nomArchivo: fileName,
          arcGreZip: signedZipBuffer.toString('base64'),
          hashZip: hashZip,
        },
      };

      // Step 4: Submit to GEM endpoint
      // URL format: {base}/comprobantes/{filename_without_extension}
      const fileNameWithoutExt = fileName.replace(/\.zip$/i, '');
      const normalizedBase = gemBaseUrl.replace(/\/+$/, '');
      const submitUrl = normalizedBase.endsWith('/comprobantes')
        ? `${normalizedBase}/${fileNameWithoutExt}`
        : `${normalizedBase}/comprobantes/${fileNameWithoutExt}`;

      this.logger.log(`[GRE] Enviando a: POST ${submitUrl}`);
      this.logger.log(`[GRE] Archivo: ${fileName} (${signedZipBuffer.length} bytes, hash: ${hashZip.substring(0, 16)}...)`);

      const response = await firstValueFrom(
        this.httpService.post(submitUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`[GRE] Respuesta SUNAT: ${JSON.stringify(response.data).substring(0, 200)}`);
      return response.data;
    } catch (err: any) {
      const statusCode = err.response?.status;
      const errorData = err.response?.data;

      this.logger.error(
        `[GRE] Error al enviar a SUNAT (HTTP ${statusCode}):`,
        JSON.stringify(errorData || err.message),
      );

      // If REST fails with 404, try SOAP fallback
      if (statusCode === 404) {
        const disableSoapFallback =
          process.env.SUNAT_DISABLE_SOAP_FALLBACK === 'true';
        if (!disableSoapFallback) {
          this.logger.log('[GRE] Intentando fallback SOAP...');
          const tempDir = path.join(process.cwd(), 'temp', 'gre');
          if (!fs.existsSync(tempDir))
            fs.mkdirSync(tempDir, { recursive: true });
          const zipPath = path.join(tempDir, fileName);
          fs.writeFileSync(zipPath, signedZipBuffer);
          return await sendDespatchToSunat(zipPath, fileName, {
            username: oauthUsername,
            password: oauthPassword,
            endpoint: process.env.SUNAT_SOAP_ENDPOINT,
          });
        }
      }

      throw new BadRequestException(
        'Error SUNAT: ' + JSON.stringify(errorData || err.message),
      );
    }
  }
}
