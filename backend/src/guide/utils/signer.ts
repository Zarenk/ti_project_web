import * as fs from 'fs';
import * as crypto from 'crypto';
import { create } from 'xmlbuilder2';

/**
 * Genera el DigestValue del XML.
 */
function generateDigest(xml: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(xml);
  return hash.digest('base64');
}

/**
 * Construye el nodo SignedInfo para Guías de Remisión.
 */
function buildSignedInfoXmlForGuia(digestValue: string): string {
  return create()
    .ele('ds:SignedInfo', { xmlns: 'http://www.w3.org/2000/09/xmldsig#' })
    .ele('ds:CanonicalizationMethod', {
      Algorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    })
    .up()
    .ele('ds:SignatureMethod', {
      Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    })
    .up()
    .ele('ds:Reference', { URI: '' }) // ID específico de guía
    .ele('ds:Transforms')
    .ele('ds:Transform', {
      Algorithm: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    })
    .up()
    .up()
    .ele('ds:DigestMethod', {
      Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    })
    .up()
    .ele('ds:DigestValue')
    .txt(digestValue)
    .up()
    .up()
    .end({ headless: true });
}

/**
 * Firma el SignedInfo con la clave privada.
 */
function signWithPrivateKey(
  signedInfo: string,
  privateKeyPath: string,
): string {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signedInfo);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

/**
 * Firma una Guía de Remisión UBL 2.1 (DespatchAdvice).
 */
export async function firmarGuiaUBL(
  xml: string,
  privateKeyPath: string,
  certificatePath: string,
): Promise<string> {
  // Asegurar que el nodo raíz tenga el ID "DespatchAdvice"

  // Usar la última ExtensionContent (firma en 2da UBLExtension)
  const extensionContentPattern =
    /<ext:ExtensionContent(?:\s*\/>|>\s*<\/ext:ExtensionContent>)(?![\s\S]*<ext:ExtensionContent)/;

  if (!extensionContentPattern.test(xml)) {
    throw new Error('No se encontró el ExtensionContent vacío en el XML');
  }

  const xmlSinFirma = xml.replace(
    extensionContentPattern,
    '<ext:ExtensionContent></ext:ExtensionContent>',
  );
  const digestValue = generateDigest(xmlSinFirma);

  const signedInfoXml = buildSignedInfoXmlForGuia(digestValue);
  const signatureValue = signWithPrivateKey(signedInfoXml, privateKeyPath);

  // Extract ONLY the base64 content between PEM markers.
  // This handles files exported from .pfx that include "Bag Attributes" metadata
  // before the actual certificate block.
  const rawCert = fs.readFileSync(certificatePath, 'utf8');
  const certMatch = rawCert.match(
    /-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/,
  );
  if (!certMatch) {
    throw new Error(
      `El archivo de certificado no contiene un bloque PEM válido. Archivo: ${certificatePath}`,
    );
  }
  const cert = certMatch[1].replace(/\r?\n|\r|\s/g, '');

  const signedInfoNode = create(signedInfoXml).root();

  const firmaDoc = create().ele('ds:Signature', {
    xmlns: 'http://www.w3.org/2000/09/xmldsig#',
    Id: 'SignatureSP',
  });

  firmaDoc.import(signedInfoNode);
  firmaDoc.ele('ds:SignatureValue').txt(signatureValue);
  const keyInfo = firmaDoc.ele('ds:KeyInfo');
  const x509 = keyInfo.ele('ds:X509Data');
  x509.ele('ds:X509Certificate').txt(cert);

  const firmaXml = firmaDoc.end({ headless: true });

  const xmlFirmado = xml.replace(
    extensionContentPattern,
    `<ext:ExtensionContent>${firmaXml}</ext:ExtensionContent>`,
  );

  return xmlFirmado;
}
