import { promises as fs } from 'fs';
import sharp from 'sharp';

function getPngDimensions(buffer: Buffer) {
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

export async function convertPngToSvg(pngPath: string, svgPath: string) {
  const buffer = await fs.readFile(pngPath);
  const { width, height } = getPngDimensions(buffer);
  const base64 = buffer.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="data:image/png;base64,${base64}" width="${width}" height="${height}"/></svg>`;
  await fs.writeFile(svgPath, svg, 'utf8');
}

export async function convertJpegToPng(jpegPath: string, pngPath: string) {
  try {
    await sharp(jpegPath).png().toFile(pngPath);
    await fs.unlink(jpegPath);
  } catch (error) {
    console.error('Failed to convert JPEG to PNG:', error);
    return;
  }
}