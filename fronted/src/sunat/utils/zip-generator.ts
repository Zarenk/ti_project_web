import AdmZip from 'adm-zip';

/**
 * Genera un archivo ZIP con el XML firmado.
 * @param fileName Nombre base del archivo (sin extensión).
 * @param signedXmlContent Contenido del XML firmado.
 * @returns Ruta del archivo ZIP generado.
 */
export function generateZip(fileName: string, signedXmlContent: string): string {
  const zip = new AdmZip();
  const xmlFileName = `${fileName}.xml`; // Nombre del archivo XML dentro del ZIP

  // Agregar el contenido del XML firmado al ZIP
  zip.addFile(xmlFileName, Buffer.from(signedXmlContent, 'utf-8'));

  const zipFilePath = `${fileName}.zip`; // Ruta del archivo ZIP generado
  zip.writeZip(zipFilePath);

  return zipFilePath;
}