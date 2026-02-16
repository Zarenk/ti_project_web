import AdmZip from 'adm-zip';

type CdrResult = {
  cdrXml: string | null;
  cdrCode: string | null;
  cdrDescription: string | null;
};

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

export function extractCdrFromSoap(soapXml: string): CdrResult {
  try {
    const base64 = extractTag(soapXml, 'applicationResponse');
    if (!base64) {
      return { cdrXml: null, cdrCode: null, cdrDescription: null };
    }
    const zipBuffer = Buffer.from(base64, 'base64');
    const zip = new AdmZip(zipBuffer);
    const entry = zip.getEntries().find((e) => e.entryName.endsWith('.xml'));
    if (!entry) {
      return { cdrXml: null, cdrCode: null, cdrDescription: null };
    }
    const cdrXml = entry.getData().toString('utf-8');
    const cdrCode = extractTag(cdrXml, 'cbc:ResponseCode');
    const cdrDescription = extractTag(cdrXml, 'cbc:Description');
    return { cdrXml, cdrCode, cdrDescription };
  } catch (error) {
    console.warn('[sunat] error parsing CDR', error);
    return { cdrXml: null, cdrCode: null, cdrDescription: null };
  }
}

