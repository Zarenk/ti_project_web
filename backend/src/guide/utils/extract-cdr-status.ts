import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

/**
 * Extrae el estado del CDR XML que devuelve SUNAT.
 */
export async function extractCdrStatus(cdrZipBuffer: Buffer): Promise<{
  accepted: boolean;
  code: string;
  description: string;
}> {
  const zip = new AdmZip(cdrZipBuffer);
  const zipEntries = zip.getEntries();

  if (zipEntries.length === 0) {
    throw new Error('El ZIP del CDR está vacío');
  }

  const xmlEntry = zipEntries.find((entry) => entry.entryName.endsWith('.xml'));
  if (!xmlEntry) {
    throw new Error('No se encontró el XML del CDR en el ZIP');
  }

  const xml = xmlEntry.getData().toString('utf8');
  const parsed = await parseStringPromise(xml);

  const responseCode = parsed['ApplicationResponse']['cbc:ResponseCode'][0];
  const description = parsed['ApplicationResponse']['cbc:Description'][0];

  return {
    accepted: responseCode === '0',
    code: responseCode,
    description,
  };
}
