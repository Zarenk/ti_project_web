import axios from 'axios';
import * as dns from 'dns';
import * as fs from 'fs';
import * as https from 'https';
import { assertSafeUrl } from '../../common/security/ssrf.util';
import { extractCdrFromSoap, extractSoapFault } from './cdr-parser';

/**
 * Custom DNS lookup that falls back to Google/Cloudflare public DNS
 * when the system DNS resolver fails (common on cloud providers like
 * Railway that may not resolve .gob.pe domains).
 */
function createFallbackLookup(): (
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
) => void {
  const resolver = new dns.Resolver();
  resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

  return (hostname, options, callback) => {
    // First try system DNS
    dns.lookup(hostname, options, (err, address, family) => {
      if (!err) {
        return callback(null, address as string, family as number);
      }
      // System DNS failed — try public DNS resolvers
      resolver.resolve4(hostname, (resolveErr, addresses) => {
        if (resolveErr || !addresses?.length) {
          // Both failed — return the original error
          return callback(err, '' as any, 4);
        }
        callback(null, addresses[0], 4);
      });
    });
  };
}

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

    // Construir el sobre SOAP con WS-Security UsernameToken para autenticación.
    // SUNAT SEE-Del Contribuyente requiere WS-Security (no HTTP Basic Auth).
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <soapenv:Header>
          <wsse:Security>
            <wsse:UsernameToken>
              <wsse:Username>${username}</wsse:Username>
              <wsse:Password>${password}</wsse:Password>
            </wsse:UsernameToken>
          </wsse:Security>
        </soapenv:Header>
        <soapenv:Body>
          <ser:sendBill>
            <fileName>${fileName}.zip</fileName>
            <contentFile>${zipContent}</contentFile>
          </ser:sendBill>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    // Enviar la solicitud a la SUNAT
    // - timeout: 45s for axios (covers response wait)
    // - signal: AbortSignal.timeout 60s as absolute hard limit (covers DNS + TLS + response)
    // - Uses fallback DNS lookup for .gob.pe domains that may not resolve on cloud providers
    // - NO HTTP Basic Auth: authentication is done via WS-Security UsernameToken in SOAP header
    const response = await axios.post(sunatUrl, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        SOAPAction: '',
      },
      timeout: 45_000,
      signal: AbortSignal.timeout(60_000),
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
        lookup: createFallbackLookup() as any,
        timeout: 15_000,
      }),
    });

    const cdr = extractCdrFromSoap(response.data);
    const soapFault = !cdr.cdrCode
      ? extractSoapFault(response.data)
      : null;
    return {
      raw: response.data,
      cdrXml: cdr.cdrXml,
      cdrCode: cdr.cdrCode,
      cdrDescription: cdr.cdrDescription,
      soapFault,
    };
  } catch (error: any) {
    console.error('[sendToSunat] Error:', error.message);
    if (error.response) {
      const body = typeof error.response.data === 'string'
        ? error.response.data.substring(0, 1500)
        : JSON.stringify(error.response.data).substring(0, 1500);
      console.error(
        `[sendToSunat] HTTP ${error.response.status} | auth=WS-Security | url=${sunatUrl} | user=${username}`,
      );
      console.error('[sendToSunat] Response body:', body);
    }
    throw error;
  }
}
