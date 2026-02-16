import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { assertSafeUrl } from '../../common/security/ssrf.util';
import { extractCdrFromSoap } from './cdr-parser';

/**
 * Envía un archivo ZIP a la SUNAT.
 * @param zipFilePath Ruta del archivo ZIP.
 * @param fileName Nombre del archivo ZIP (sin extensión).
 * @param sunatUrl URL del servicio de la SUNAT.
 * @param username Usuario para autenticación.
 * @param password Contraseña para autenticación.
 * @returns Respuesta de la SUNAT.
 */
export async function sendToSunat(
  zipFilePath: string,
  fileName: string,
  sunatUrl: string,
  username: string,
  password: string,
): Promise<any> {
  try {
    // Validar que el archivo ZIP exista
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`El archivo ZIP no existe en la ruta: ${zipFilePath}`);
    }

    await assertSafeUrl(sunatUrl);

    // Leer el contenido del archivo ZIP y convertirlo a base64
    const zipContent = fs.readFileSync(zipFilePath).toString('base64');

    // Construir el sobre SOAP para enviar a la SUNAT
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
        <soapenv:Header/>
        <soapenv:Body>
          <ser:sendBill>
            <fileName>${fileName}.zip</fileName>
            <contentFile>${zipContent}</contentFile>
          </ser:sendBill>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    //console.log('Archivo a enviar:', zipFilePath);
    //console.log('Contenido base64 (inicio):', zipContent.slice(0, 100));
    //console.log('SOAP Envelope:', soapEnvelope);

    // Enviar la solicitud a la SUNAT
    const response = await axios.post(sunatUrl, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: '',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true, // para pruebas (usar true en prod con certificados válidos)
      }),
      auth: {
        username,
        password,
      },
    });

    const cdr = extractCdrFromSoap(response.data);
    return {
      raw: response.data,
      cdrXml: cdr.cdrXml,
      cdrCode: cdr.cdrCode,
      cdrDescription: cdr.cdrDescription,
    };
  } catch (error: any) {
    console.error('Error al enviar el archivo a la SUNAT:', error.message);
    if (error.response) {
      console.error(
        'Respuesta de SUNAT:',
        error.response.status,
        error.response.data,
      );
    }
    throw error;
  }
}
