import AdmZip from 'adm-zip';
import { parseStringPromise } from 'xml2js';

/**
 * Recursively find a value by key suffix in a parsed xml2js object.
 * xml2js preserves namespace prefixes, so "cbc:ResponseCode" may appear as
 * "cbc:ResponseCode" or just "ResponseCode" depending on settings.
 *
 * IMPORTANT: xml2js wraps ALL child elements in arrays, so we must recurse
 * into arrays as well as plain objects. A max depth guard prevents runaway
 * recursion on circular or very deep structures.
 */
function findByKeySuffix(obj: any, suffix: string, maxDepth = 10): any {
  if (maxDepth <= 0 || !obj || typeof obj !== 'object') return undefined;

  // If obj is an array, search each element
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findByKeySuffix(item, suffix, maxDepth - 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  // Check keys at this level
  for (const key of Object.keys(obj)) {
    if (key === suffix || key.endsWith(`:${suffix}`)) {
      return obj[key];
    }
  }

  // Recurse into child objects/arrays (skip '$' attributes node)
  for (const key of Object.keys(obj)) {
    if (key === '$') continue;
    if (typeof obj[key] === 'object') {
      const found = findByKeySuffix(obj[key], suffix, maxDepth - 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

/**
 * Extracts the text content from an xml2js parsed value.
 * xml2js returns either a plain string or an object { _: 'text', $: { attrs } }
 * when the element has XML attributes.
 */
function extractText(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && '_' in val) return String(val._);
  return String(val);
}

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

  // Find ResponseCode and Description regardless of namespace prefix
  const responseCodeArr = findByKeySuffix(parsed, 'ResponseCode');
  const descriptionArr = findByKeySuffix(parsed, 'Description');

  const responseCode = Array.isArray(responseCodeArr)
    ? extractText(responseCodeArr[0])
    : extractText(responseCodeArr);

  const description = Array.isArray(descriptionArr)
    ? extractText(descriptionArr[0])
    : extractText(descriptionArr);

  return {
    accepted: responseCode === '0',
    code: responseCode,
    description,
  };
}
