import AdmZip from 'adm-zip';

type CdrResult = {
  cdrXml: string | null;
  cdrCode: string | null;
  cdrDescription: string | null;
};

function extractTag(xml: string, tag: string): string | null {
  // Match with or without namespace prefix (e.g. <cbc:ResponseCode> or <ResponseCode>)
  const pattern = new RegExp(
    `<(?:[\\w-]+:)?${tag}>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`,
    'i',
  );
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

export function extractCdrFromSoap(soapXml: string): CdrResult {
  try {
    const base64 = extractTag(soapXml, 'applicationResponse');
    if (!base64) {
      console.warn(
        '[sunat] No <applicationResponse> found in SOAP response. Length:',
        soapXml?.length ?? 0,
        'First 500 chars:',
        soapXml?.substring(0, 500),
      );
      return { cdrXml: null, cdrCode: null, cdrDescription: null };
    }
    const zipBuffer = Buffer.from(base64, 'base64');
    const zip = new AdmZip(zipBuffer);
    const entry = zip.getEntries().find((e) => e.entryName.endsWith('.xml'));
    if (!entry) {
      console.warn('[sunat] CDR ZIP has no XML entry');
      return { cdrXml: null, cdrCode: null, cdrDescription: null };
    }
    const cdrXml = entry.getData().toString('utf-8');
    const cdrCode = extractTag(cdrXml, 'ResponseCode');
    const cdrDescription = extractTag(cdrXml, 'Description');
    return { cdrXml, cdrCode, cdrDescription };
  } catch (error) {
    console.warn('[sunat] error parsing CDR', error);
    return { cdrXml: null, cdrCode: null, cdrDescription: null };
  }
}

/**
 * Extract SOAP fault message when SUNAT returns an error
 * outside of the CDR format (e.g. auth failure, service unavailable).
 */
export function extractSoapFault(soapXml: string): string | null {
  const faultString = extractTag(soapXml, 'faultstring');
  if (faultString) return faultString;
  const faultCode = extractTag(soapXml, 'faultcode');
  if (faultCode) return `SOAP Fault: ${faultCode}`;
  return null;
}

