import { Injectable } from '@nestjs/common';

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
    const serie = 'T001';
    const correlativo = '00012345';
    const ruc = dto.numeroDocumentoRemitente;
    const fileNameBase = `${serie}-${correlativo}`;

    // 1. Generar XML base
    const unsignedXml = generateDespatchXML(dto, serie, correlativo);

    // 2. Firmar XML usando función específica para guías
    const certDir = path.join(process.cwd(), 'certificates');

    /*
      const signedXml = await firmarGuiaUBL(
      unsignedXml,
      path.join(certDir, 'private_key_pkcs8.pem'),
      path.join(certDir, 'certificate.crt')
    );
    */

    const signedXml =
      await this.firmadorJavaService.firmarXmlConJava(unsignedXml);

    // 3. Guardar XML firmado
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const debugSignedPath = path.join(tempDir, 'debug-signed-before-zip.xml');
    fs.writeFileSync(debugSignedPath, signedXml, 'utf8');

    // 3. Comprimir XML firmado a ZIP
    const zipBuffer = zipSignedXmlFromString(signedXml, ruc, fileNameBase);

    // 🧪 Extraer XML DESDE el ZIP y guardarlo
    const testZip = new AdmZip(zipBuffer);
    const zippedXmlBuffer = testZip.getEntries()[0].getData();
    const zippedXml = zippedXmlBuffer.toString('utf8');
    const debugFromZipPath = path.join(tempDir, 'debug-from-zip.xml');
    fs.writeFileSync(debugFromZipPath, zippedXml, 'utf8');

    // Comparación
    const originalBuffer = Buffer.from(signedXml, 'utf8');
    if (!originalBuffer.equals(zippedXmlBuffer)) {
      console.warn('[WARN] XML dentro del ZIP no es idéntico al XML firmado.');
    }

    // Nombre archivo ZIP
    const zipFileName = `${ruc}-09-${fileNameBase}.zip`;

    // Envío a SUNAT REST
    const envioResult = await this.sendGuideToSunatRest(zipBuffer, zipFileName);

    const cdrBase64 = envioResult.applicationResponse;
    const cdrBuffer = Buffer.from(cdrBase64, 'base64');
    const cdrInfo = await extractCdrStatus(cdrBuffer);

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
        //xmlName: path.basename(xmlFilePath),
        //zipName: path.basename(zipFilePath),
        cdrAceptado: cdrInfo.accepted,
        cdrCode: cdrInfo.code,
        cdrDescription: cdrInfo.description,
      },
    });

    // 7. Retornar resultado
    return {
      message: 'Guía enviada y procesada por SUNAT',
      //archivoXml: path.basename(xmlFilePath),
      //archivoZip: path.basename(zipFilePath),
      estadoSunat: cdrInfo.accepted ? 'ACEPTADO' : 'OBSERVADO / RECHAZADO',
      codigoRespuesta: cdrInfo.code,
      descripcionRespuesta: cdrInfo.description,
      shippingGuide: saved,
    };
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
      console.log('🔑 TOKEN?', token);

      // Paso 2: Enviar el ZIP firmado
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api-cpe.sunat.gob.pe/v1/contribuyente/gem/comprobantes',
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
      console.error(
        '❌ Error al enviar a SUNAT:',
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
