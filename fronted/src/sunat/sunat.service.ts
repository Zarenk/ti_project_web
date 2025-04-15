// filepath: c:\Users\Usuario\Documents\Proyectos PROGRAMACION\TI_projecto_web\backend\src\sunat\sunat.service.ts
import { Injectable } from '@nestjs/common';
import { generateInvoiceXML, generateBoletaXML, generateCreditNoteXML } from './utils/xml-generator';
import { firmarDocumentoUBL } from './utils/signer';
import { generateZip } from './utils/zip-generator';
import { sendToSunat } from './utils/sunat-client';

@Injectable()
export class SunatService {

  async sendDocument(data: any, documentType: string, privateKeyPath: string, certificatePath: string) {
    let xml: string;

  try {  
    // Generar el XML según el tipo de documento
    if (documentType === 'invoice') {
      xml = generateInvoiceXML(data);
    } else if (documentType === 'boleta') {
      xml = generateBoletaXML(data);
    } else if (documentType === 'creditNote') {
      xml = generateCreditNoteXML(data);
    } else {
      throw new Error('Tipo de documento no soportado');
    }

    // Firmar el XML
    const signedXml = firmarDocumentoUBL(xml, privateKeyPath, certificatePath);

    const tipoComprobante = documentType === 'invoice' ? '01' :
                        documentType === 'boleta' ? '03' :
                        documentType === 'creditNote' ? '07' : '00';

    // Generar el nombre del archivo ZIP
    const zipFileName = `${data.emisor.ruc}-${tipoComprobante}-${data.serie}-${data.correlativo}`;

    // Generar el archivo ZIP
    const zipFilePath = generateZip(zipFileName, signedXml);

    console.log('Archivo ZIP generado:', zipFilePath);

    // Enviar el archivo ZIP a la SUNAT
    const sunatUrl = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
    const username = '20123456789MODDATOS';
    const password = 'moddatos';

    const response = await sendToSunat(zipFilePath, zipFileName, sunatUrl, username, password);

    console.log('Respuesta de la SUNAT:', response);

    return response;
  }
  catch (error:any) {
    console.error('Error en el proceso:', error.message);
    throw error;  // Vuelve a lanzar el error para que sea manejado adecuadamente
  }
}
}