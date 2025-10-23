import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

/**
 * Comprime un XML firmado en un archivo ZIP con el formato requerido por SUNAT.
 *
 * @param xmlFilePath Ruta absoluta al archivo XML firmado
 * @param ruc RUC del emisor (remitente)
 * @param fileNameWithoutExtension Nombre base sin extensión (ej: T001-00012345)
 * @returns Ruta absoluta del archivo ZIP generado
 */
export function zipSignedXmlFromString(
  xmlContent: string,
  ruc: string,
  fileNameWithoutExtension: string,
): Buffer {
  const tipoCpe = '09'; // guía
  const finalXmlName = `${ruc}-${tipoCpe}-${fileNameWithoutExtension}.xml`;
  const finalZipName = `${ruc}-${tipoCpe}-${fileNameWithoutExtension}.zip`;

  const zip = new AdmZip();
  zip.addFile(finalXmlName, Buffer.from(xmlContent, 'utf8'));

  const zipBuffer = zip.toBuffer();

  // Ruta donde guardar el ZIP (ajustar si es necesario)
  const zipDir = path.resolve(__dirname, '..', '..', 'temp');
  if (!fs.existsSync(zipDir)) fs.mkdirSync(zipDir);

  const zipPath = path.join(zipDir, finalZipName);
  fs.writeFileSync(zipPath, zipBuffer); // ✅ Guarda el archivo ZIP

  console.log('✅ ZIP guardado en:', zipPath);

  return zipBuffer;
}
