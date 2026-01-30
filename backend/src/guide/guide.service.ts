import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { generateDespatchXML } from './utils/generate-despatch-xml';
import * as fs from 'fs';
import * as path from 'path';
import { zipSignedXmlFromString } from './utils/zip-signed-xml';
import { sendDespatchToSunat } from './utils/send-despatch-to-sunat';
import { extractCdrStatus } from './utils/extract-cdr-status';
import { CreateGuideDto } from './dto/create-guide.dto';
import { firmarGuiaUBL } from './utils/signer';
import AdmZip from 'adm-zip';
import { FirmadorJavaService } from './firmador-java.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class GuideService {
  constructor(
    private prismaService: PrismaService,
    private readonly firmadorJavaService: FirmadorJavaService,
    private readonly httpService: HttpService,
  ) {}

  async generarGuia(dto: CreateGuideDto) {
    this.ensureValidGuide(dto);
    const serie = dto.serie?.trim() || 'T001';
    const correlativo = dto.correlativo?.trim() || '00012345';
    const ruc = dto.numeroDocumentoRemitente;
    const fileNameBase = `${serie}-${correlativo}`;

    // 1. Generar XML base
    const unsignedXml = generateDespatchXML(dto, serie, correlativo);

    // 2. Firmar XML usando funciÃ³n especÃ­fica para guÃ­as
    const certDir = path.join(process.cwd(), 'certificates');

    const preferJavaSigner = process.env.SUNAT_USE_JAVA_SIGNER !== 'false';
    let signedXml: string;
    if (preferJavaSigner) {
      try {
        signedXml = await this.firmadorJavaService.firmarXmlConJava(unsignedXml);
        console.log('[Guide] Firmador: Java');
      } catch (error) {
        console.warn('[Guide] Falló firmador Java, usando firmador Node');
        signedXml = await firmarGuiaUBL(
          unsignedXml,
          path.join(certDir, 'private_key_pkcs8.pem'),
          path.join(certDir, 'certificate.crt'),
        );
      }
    } else {
      signedXml = await firmarGuiaUBL(
        unsignedXml,
        path.join(certDir, 'private_key_pkcs8.pem'),
        path.join(certDir, 'certificate.crt'),
      );
      console.log('[Guide] Firmador: Node');
    }
    signedXml = this.sanitizeSignedXml(signedXml);

    // 3. Guardar XML firmado y ZIP para trazabilidad
    const trace = this.persistTraceFiles(
      signedXml,
      null,
      ruc,
      serie,
      correlativo,
      fileNameBase,
    );

    // 3. Comprimir XML firmado a ZIP
    const zipBuffer = zipSignedXmlFromString(signedXml, ruc, fileNameBase);

    // ðŸ§ª Extraer XML DESDE el ZIP y guardarlo
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

    // ComparaciÃ³n
    const originalBuffer = Buffer.from(signedXml, 'latin1');
    if (!originalBuffer.equals(zippedXmlBuffer)) {
      console.warn('[WARN] XML dentro del ZIP no es idÃ©ntico al XML firmado.');
    }

    // Nombre archivo ZIP
    const zipFileName = `${ruc}-09-${fileNameBase}.zip`;

    // EnvÃ­o a SUNAT REST
    const envioResult = await this.sendGuideToSunatRest(zipBuffer, zipFileName);

    const cdrBase64 = envioResult.applicationResponse;
    const cdrBuffer = Buffer.from(cdrBase64, 'base64');
    const cdrInfo = await extractCdrStatus(cdrBuffer);
    const cdrName = this.persistCdrFile(cdrBuffer, trace.zipName);

    // 6. Guardar en BD
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
      },
    });

    // 7. Retornar resultado
    return {
      message: 'GuÃ­a enviada y procesada por SUNAT',
      //archivoXml: path.basename(xmlFilePath),
      //archivoZip: path.basename(zipFilePath),
      estadoSunat: cdrInfo.accepted ? 'ACEPTADO' : 'OBSERVADO / RECHAZADO',
      codigoRespuesta: cdrInfo.code,
      descripcionRespuesta: cdrInfo.description,
      cdrName,
      shippingGuide: saved,
    };
  }

  
  async validateGuide(dto: CreateGuideDto) {
    this.ensureValidGuide(dto);
    const serie = dto.serie?.trim() || 'T001';
    const correlativo = dto.correlativo?.trim() || '00012345';
    const ruc = dto.numeroDocumentoRemitente;
    const fileNameBase = `${serie}-${correlativo}`;

    const unsignedXml = generateDespatchXML(dto, serie, correlativo);
    const certDir = path.join(process.cwd(), 'certificates');
    const preferJavaSigner = process.env.SUNAT_USE_JAVA_SIGNER !== 'false';
    let signedXml: string;
    if (preferJavaSigner) {
      try {
        signedXml = await this.firmadorJavaService.firmarXmlConJava(unsignedXml);
        console.log('[Guide] Firmador: Java');
      } catch (error) {
        console.warn('[Guide] Falló firmador Java, usando firmador Node');
        signedXml = await firmarGuiaUBL(
          unsignedXml,
          path.join(certDir, 'private_key_pkcs8.pem'),
          path.join(certDir, 'certificate.crt'),
        );
      }
    } else {
      signedXml = await firmarGuiaUBL(
        unsignedXml,
        path.join(certDir, 'private_key_pkcs8.pem'),
        path.join(certDir, 'certificate.crt'),
      );
      console.log('[Guide] Firmador: Node');
    }
    signedXml = this.sanitizeSignedXml(signedXml);

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

  async getGuideStatus(id: number) {
    const guide = await this.prismaService.shippingGuide.findUnique({
      where: { id },
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

  getGuideFilePath(id: number, type: 'xml' | 'zip' | 'cdr') {
    return this.prismaService.shippingGuide
      .findUnique({ where: { id } })
      .then((guide) => {
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
      });
  }

  private ensureValidGuide(dto: CreateGuideDto) {
    const errors: string[] = [];

    if (!dto.numeroDocumentoRemitente) errors.push('numeroDocumentoRemitente');
    if (!dto.razonSocialRemitente) errors.push('razonSocialRemitente');
    if (!dto.motivoTraslado) errors.push('motivoTraslado');
    if (!dto.fechaTraslado) errors.push('fechaTraslado');
    if (!dto.puntoPartida) errors.push('puntoPartida');
    if (!dto.puntoLlegada) errors.push('puntoLlegada');
    if (!dto.transportista?.numeroDocumento) errors.push('transportista.numeroDocumento');
    if (!dto.destinatario?.numeroDocumento) errors.push('destinatario.numeroDocumento');
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
      console.log('[Guide] PlaceholderSignature eliminado del XML firmado');
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

  async sendGuideToSunatRest(
    signedZipBuffer: Buffer,
    fileName: string,
  ): Promise<any> {
    const clientId = process.env.SUNAT_CLIENT_ID;
    const clientSecret = process.env.SUNAT_CLIENT_SECRET;
    const username = process.env.SUNAT_USERNAME;
    const password = process.env.SUNAT_PASSWORD;

    console.log({
      clientId: process.env.SUNAT_CLIENT_ID,
      clientSecret: process.env.SUNAT_CLIENT_SECRET,
      username: process.env.SUNAT_USERNAME,
      password: process.env.SUNAT_PASSWORD,
    });

    // Paso 1: Obtener el token OAuth 2.0
    const authResponse = await firstValueFrom(
      this.httpService.post(
        'https://api-seguridad.sunat.gob.pe/v1/clientessol/' +
          clientId +
          '/oauth2/token/',
        new URLSearchParams({
          grant_type: 'password',
          scope: 'https://api-cpe.sunat.gob.pe',
          client_id: clientId ?? '',
          client_secret: clientSecret ?? '',
          username: username ?? '',
          password: password ?? '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      ),
    );

    try {
      const token = authResponse.data.access_token;
      console.log('ðŸ”‘ TOKEN?', token);

      // Paso 2: Enviar el ZIP firmado
      const baseEndpoint =
        process.env.SUNAT_GEM_ENDPOINT ??
        'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem';
      const normalizedBase = baseEndpoint.replace(/\/+$/, '');
      const candidates = [normalizedBase];
      if (normalizedBase.endsWith('/comprobantes')) {
        candidates.push(normalizedBase.replace(/\/comprobantes$/, ''));
      } else {
        candidates.push(`${normalizedBase}/comprobantes`);
      }

      let lastError: any;
      for (const endpoint of candidates) {
        try {
          const response = await firstValueFrom(
            this.httpService.post(
              endpoint,
              {
                archivo: signedZipBuffer.toString('base64'),
                nombreArchivo: fileName,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            ),
          );
          return response.data;
        } catch (err: any) {
          const status = err.response?.status;
          if (status === 404) {
            lastError = err;
            continue;
          }
          throw err;
        }
      }

      const disableSoapFallback =
        process.env.SUNAT_DISABLE_SOAP_FALLBACK === 'true';
      if (lastError?.response?.status === 404) {
        if (disableSoapFallback) {
          throw lastError;
        }
        const tempDir = path.join(process.cwd(), 'temp', 'gre');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const zipPath = path.join(tempDir, fileName);
        fs.writeFileSync(zipPath, signedZipBuffer);
        return await sendDespatchToSunat(zipPath, fileName, {
          username,
          password,
          endpoint: process.env.SUNAT_SOAP_ENDPOINT,
        });
      }

      throw lastError ?? new Error('SUNAT GEM endpoint not found');
    } catch (err: any) {
      console.error(
        'âŒ Error al enviar a SUNAT:',
        err.response?.data || err.message,
      );
      throw new Error(
        'Error SUNAT: ' + JSON.stringify(err.response?.data || err.message),
      );
    }
  }

  async findAllShippingGuides() {
    return this.prismaService.shippingGuide.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}








