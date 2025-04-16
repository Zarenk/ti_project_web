import * as fs from 'fs';
import * as crypto from 'crypto';
import { convert, create } from 'xmlbuilder2';

/**
 * Genera el DigestValue del XML.
 */
function generateDigest(xml: string): string {
  const canonicalObj = convert(xml, { format: 'object' });
  const root = create(canonicalObj); // No usamos .end()

  const canonicalXml = root.toString({ prettyPrint: false }); // Solo el nodo, sin encabezado

  const hash = crypto.createHash('sha256');
  hash.update(canonicalXml);
  return hash.digest('base64');
}

/**
 * Construye el nodo SignedInfo.
 */
function buildSignedInfo(digestValue: string): string {
  const signedInfoXml = create()
    .ele('SignedInfo', { xmlns: 'http://www.w3.org/2000/09/xmldsig#' })
    .ele('CanonicalizationMethod', {
      Algorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    }).up()
    .ele('SignatureMethod', {
      Algorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    }).up()
    .ele('Reference', { URI: '#Invoice' })
      .ele('Transforms')
        .ele('Transform', {
          Algorithm: 'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        }).up()
      .up()
      .ele('DigestMethod', {
        Algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      }).up()
      .ele('DigestValue').txt(digestValue).up()
    .up()
    .end({ prettyPrint: false, headless: true });

  return signedInfoXml;
}

/**
 * Firma el SignedInfo con la clave privada.
 */
function signWithPrivateKey(signedInfo: string, privateKeyPath: string): string {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signedInfo);
  signer.end();
  return signer.sign(privateKey, 'base64');
}

/**
 * Inserta la firma en el XML.
 */
function insertSignatureIntoXml(xml: string, signature: string): string {
  // Elimina la declaración XML antes de insertar la firma
  const processedSignature = signature
    .replace(/<\?xml.*\?>/, '') // Elimina la declaración XML
    .replace(/\r?\n|\r/g, '') // Elimina saltos de línea
    .replace(/\s{2,}/g, ' ') // Reemplaza espacios múltiples por un solo espacio
    .trim(); // Elimina espacios al inicio y al final

  // Carga el documento XML como texto y reemplaza el marcador __raw
  const firmaSinIndentar = signature
  .replace(/\r?\n|\r/g, '') // Elimina saltos de línea
  .replace(/\s{2,}/g, ' ') // Reemplaza espacios múltiples por un solo espacio
  .trim(); // Elimina espacios al inicio y al final

  const updatedXml = xml.replace(
    /<__raw>.*<\/__raw>/,
    firmaSinIndentar
  );

  console.log("Signature XML:", processedSignature); // Debugging: imprime la firma procesada

  return updatedXml;
}
/**
 * Firma un documento UBL 2.1 (factura, boleta, nota de crédito).
 */
export function firmarDocumentoUBL(xml: string, privateKeyPath: string, certificatePath: string): string {
  xml = xml.trimStart(); // Elimina espacios/líneas antes del <?xml ... ?>
  const digestValue = generateDigest(xml);
  const signedInfo = buildSignedInfo(digestValue);
  const signatureValue = signWithPrivateKey(signedInfo, privateKeyPath);

  // Construye el XML completo con la firma incluida
  const signedXml = create()
    .ele('ext:UBLExtensions', {
      'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2', // Define el prefijo ext si no está definido
    })
      .import(create(xml).root()) // Importa el contenido original del XML
      .ele('ext:UBLExtensions')
        .ele('ext:UBLExtension')
          .ele('ext:ExtensionContent')
            .ele('Signature', { xmlns: 'http://www.w3.org/2000/09/xmldsig#', id: 'Signature' })
              .import(create(signedInfo).root())
              .ele('SignatureValue').txt(signatureValue).up()
              .ele('KeyInfo')
                .ele('X509Data')
                  .ele('X509Certificate').txt(
                    fs.readFileSync(certificatePath, 'utf8')
                      .replace('-----BEGIN CERTIFICATE-----', '')
                      .replace('-----END CERTIFICATE-----', '')
                      .replace(/\r?\n|\r/g, '')
                  ).up()
                .up()
              .up()
            .up()
          .up()
        .up()
      .up()
    .end({ prettyPrint: false }); // Genera el XML completo sin encabezado innecesario

  return signedXml;
}