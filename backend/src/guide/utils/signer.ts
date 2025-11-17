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

  const placeholder = '<PlaceholderSignature/>';

  if (!xml.includes(placeholder)) {
    throw new Error('El marcador de firma no fue encontrado en el XML');
  }

  const [inicioDigest, finDigest] = xml.split(placeholder);
  const xmlSinFirma = `${inicioDigest}<ext:ExtensionContent></ext:ExtensionContent>${finDigest}`;
  const digestValue = generateDigest(xmlSinFirma);

  const signedInfoXml = buildSignedInfoXmlForGuia(digestValue);
  const signatureValue = signWithPrivateKey(signedInfoXml, privateKeyPath);

  const cert = fs
    .readFileSync(certificatePath, 'utf8')
    .replace('-----BEGIN CERTIFICATE-----', '')
    .replace('-----END CERTIFICATE-----', '')
    .replace(/\r?\n|\r/g, '');

  const signedInfoNode = create(signedInfoXml).root();

  const firmaDoc = create().ele('ds:Signature', {
    xmlns: 'http://www.w3.org/2000/09/xmldsig#',
    Id: 'SignatureKG',
  });

  firmaDoc.import(signedInfoNode);
  firmaDoc.ele('ds:SignatureValue').txt(signatureValue);
  const keyInfo = firmaDoc.ele('ds:KeyInfo');
  const x509 = keyInfo.ele('ds:X509Data');
  x509.ele('ds:X509Certificate').txt(cert);

  const firmaXml = firmaDoc.end({ headless: true });

  const xmlFirmado = `${inicioDigest}${firmaXml}${finDigest}`;

  return xmlFirmado;
}
