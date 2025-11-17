import AdmZip from 'adm-zip';
import { join } from 'path';
import fs from 'fs';

/**
 * Genera un archivo ZIP con el XML firmado.
 * @param fileName Nombre base del archivo (sin extensión).
 * @param signedXmlContent Contenido del XML firmado.
 * @returns Ruta del archivo ZIP generado.
 */
export function generateZip(
  fileName: string,
  signedXmlContent: string,
  documentType: 'invoice' | 'boleta' | 'creditNote',
): string {
  // Mapear el tipo de documento a la carpeta correspondiente
  const folderName =
    documentType === 'invoice'
      ? 'factura'
      : documentType === 'boleta'
        ? 'boleta'
        : 'creditNote';

  const zip = new AdmZip();
  const xmlFileName = `${fileName}.xml`; // Nombre del archivo XML dentro del ZIP

  // Agregar el contenido del XML firmado al ZIP
  zip.addFile(xmlFileName, Buffer.from(signedXmlContent, 'utf-8'));

  // Definir la carpeta donde se guardarán los ZIP
  const zipFolderPath = join(
    __dirname,
    '..',
    '..',
    '..',
    'sunat.zip',
    folderName,
  );
  if (!fs.existsSync(zipFolderPath)) {
    fs.mkdirSync(zipFolderPath, { recursive: true }); // Crear la carpeta si no existe
  }

  const zipFilePath = join(zipFolderPath, `${fileName}.zip`); // Ruta del archivo ZIP generado
  zip.writeZip(zipFilePath);

  return zipFilePath;
}
