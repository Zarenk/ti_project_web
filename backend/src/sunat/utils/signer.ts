import * as fs from 'fs';
import { SignedXml } from 'xml-crypto';

/**
 * Firma un documento UBL 2.1 (factura, boleta, nota de crédito) usando xml-crypto.
 * Implementa XML-DSIG con C14N canonicalization, enveloped-signature transform,
 * SHA-256 digest y RSA-SHA256 signing — compatible con SUNAT.
 */
export async function firmarDocumentoUBL(
  xml: string,
  privateKeyPath: string,
  certificatePath: string,
): Promise<string> {
  // 1. Detectar el nodo raíz (Invoice, CreditNote, etc.)
  const rootMatch = xml.match(/<([A-Za-z0-9:]+)([^>]*)>/);
  if (!rootMatch) {
    throw new Error('No se pudo detectar el nodo raíz del XML.');
  }
  const rootTag = rootMatch[1].includes(':')
    ? rootMatch[1].split(':')[1]
    : rootMatch[1];

  // 2. Reemplazar el placeholder de firma con ExtensionContent vacío
  const placeholder = '<__raw><!-- Firma digital no disponible --></__raw>';
  if (!xml.includes(placeholder)) {
    throw new Error('El marcador de firma no fue encontrado en el XML');
  }
  xml = xml.replace(placeholder, '');

  // 3. Leer clave privada y certificado
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const rawCert = fs.readFileSync(certificatePath, 'utf8');

  // Extract ONLY the base64 content between PEM markers.
  // This handles files exported from .pfx that include "Bag Attributes" metadata
  // before the actual certificate block.
  const certMatch = rawCert.match(
    /-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/,
  );
  if (!certMatch) {
    throw new Error(
      `El archivo de certificado no contiene un bloque PEM válido (-----BEGIN CERTIFICATE-----). ` +
        `Archivo: ${certificatePath} | Primeros 60 chars: ${rawCert.substring(0, 60)}`,
    );
  }
  const cert = certMatch[1].replace(/\r?\n|\r|\s/g, '');

  // Validate base64
  const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(cert);
  console.log(
    `[signer] cert: length=${cert.length} | validBase64=${isValidBase64}`,
  );
  if (!isValidBase64) {
    throw new Error(
      '[signer] Certificate contains non-base64 characters after extraction. SUNAT will reject.',
    );
  }

  // 4. Configurar xml-crypto con los algoritmos requeridos por SUNAT
  const sig = new SignedXml({
    privateKey,
    signatureAlgorithm:
      'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm:
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    getKeyInfoContent: (args) => {
      const p = args?.prefix ? `${args.prefix}:` : '';
      return `<${p}X509Data><${p}X509Certificate>${cert}</${p}X509Certificate></${p}X509Data>`;
    },
  });

  // 5. Agregar referencia con URI vacío (SUNAT error 2090).
  //    Dos transforms obligatorios:
  //    - enveloped-signature: remueve el nodo ds:Signature antes de computar el digest
  //    - exc-c14n: canonicaliza el XML (xml-crypto NO aplica C14N automáticamente,
  //      solo ejecuta los transforms listados y luego llama .toString())
  sig.addReference({
    xpath: `//*[local-name()='${rootTag}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: '',
    isEmptyUri: true,
  });

  // 6. Computar firma y colocarla dentro de <ext:ExtensionContent>
  sig.computeSignature(xml, {
    prefix: 'ds',
    attrs: { Id: 'SignatureKG' },
    location: {
      reference: "//*[local-name()='ExtensionContent']",
      action: 'append',
    },
    existingPrefixes: {
      ds: 'http://www.w3.org/2000/09/xmldsig#',
    },
  });

  return sig.getSignedXml();
}
