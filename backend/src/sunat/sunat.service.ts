// filepath: c:\Users\Usuario\Documents\Proyectos PROGRAMACION\TI_projecto_web\backend\src\sunat\sunat.service.ts
import { Injectable } from '@nestjs/common';
import { generateBoletaXML, generateInvoiceXML } from './utils/xml-generator';
import { firmarDocumentoUBL } from './utils/signer';
import { generateZip } from './utils/zip-generator';
import { sendToSunat } from './utils/sunat-client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { resolveBackendPath } from 'src/utils/path-utils';

@Injectable()
export class SunatService {
  constructor(private prismaService: PrismaService) {}

  async sendDocument(
    data: any,
    documentType: string,
    privateKeyPath: string,
    certificatePath: string,
  ) {
    let xml: string;

    try {
      // Generar el XML según el tipo de documento
      if (documentType === 'invoice') {
        xml = generateInvoiceXML(data);
      } else if (documentType === 'boleta') {
        xml = generateBoletaXML(data);
      } else if (documentType === 'creditNote') {
        xml = generateInvoiceXML(data);
      } else {
        throw new Error('Tipo de documento no soportado');
      }

      console.log('XML generado:', xml);

      // Firmar el XML
      const signedXml = firmarDocumentoUBL(
        xml,
        privateKeyPath,
        certificatePath,
      );
      // Elimina encabezado XML

      const tipoComprobante =
        documentType === 'invoice'
          ? '01'
          : documentType === 'boleta'
            ? '03'
            : documentType === 'creditNote'
              ? '07'
              : '00';

      // Generar el nombre del archivo ZIP
      const zipFileName = `${data.emisor.ruc}-${tipoComprobante}-${data.serie}-${data.correlativo}`;

      // Generar el archivo ZIP
      const zipFilePath = generateZip(
        zipFileName,
        await signedXml,
        documentType,
      );

      // Enviar el archivo ZIP a la SUNAT
      const sunatUrl =
        'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
      const username = '20123456789MODDATOS';
      const password = 'moddatos';

      const response = await sendToSunat(
        zipFilePath,
        zipFileName,
        sunatUrl,
        username,
        password,
      );

      console.log('Respuesta de la SUNAT:', response);

      return response;
    } catch (error: any) {
      console.error('Error en el proceso:', error.message);
      throw error; // Vuelve a lanzar el error para que sea manejado adecuadamente
    }
  }

  async generarYEnviarConSerie(
    documentType: string,
  ): Promise<{ serie: string; correlativo: string }> {
    const tipo =
      documentType === 'invoice'
        ? '01'
        : documentType === 'boleta'
          ? '03'
          : documentType === 'creditNote'
            ? '07'
            : '00';

    if (!['invoice', 'boleta', 'creditNote'].includes(documentType)) {
      throw new Error(`Tipo de documento no soportado: ${documentType}`);
    }

    const prefix = tipo === '01' ? 'F001' : tipo === '03' ? 'B001' : 'N001';

    const ultimo = await this.prismaService.invoiceSales.findFirst({
      where: { serie: prefix },
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

  getComprobantePdfPath(tipo: 'boleta' | 'factura', filename: string): string {
    const basePath = resolveBackendPath('comprobantes/pdf', tipo);
    const filePath = path.join(basePath, filename);

    console.log('🔍 Buscando PDF en:', filePath); // 👈 Aquí lo agregas

    if (!fs.existsSync(filePath)) {
      throw new Error('Archivo no encontrado');
    }

    return filePath;
  }
}
