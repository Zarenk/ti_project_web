import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';

export interface ImageVariant {
  path: string;
  width: number;
  height: number;
  size: number;
}

export interface ProcessedImageResult {
  url: string;
  full: ImageVariant;
  card: ImageVariant;
  thumb: ImageVariant;
}

const VARIANT_CONFIGS = [
  { suffix: '', maxWidth: 1200, quality: 80 },
  { suffix: '-card', maxWidth: 400, quality: 75 },
  { suffix: '-thumb', maxWidth: 150, quality: 70 },
] as const;

/** MIME types that should NOT be converted to WebP */
const SKIP_MIMES = new Set(['image/gif', 'image/svg+xml']);

/**
 * Convert an uploaded image to WebP and generate size variants (full, card, thumb).
 * Falls back to the original file if conversion fails.
 *
 * @param absoluteFilePath  Path where multer saved the original
 * @param uploadsSubdir     Subdirectory under /uploads/ (e.g. 'products', 'clients')
 * @param mimetype          Original MIME type — GIF/SVG are skipped
 */
export async function processUploadedImage(
  absoluteFilePath: string,
  uploadsSubdir: string,
  mimetype?: string,
): Promise<{ url: string; variants?: ProcessedImageResult }> {
  // Skip conversion for GIF (may be animated) and SVG (already optimal)
  if (mimetype && SKIP_MIMES.has(mimetype)) {
    return {
      url: `/uploads/${uploadsSubdir}/${basename(absoluteFilePath)}`,
    };
  }

  try {
    const inputBuffer = await fs.readFile(absoluteFilePath);
    const ext = extname(absoluteFilePath);
    const base = basename(absoluteFilePath, ext);
    const dir = dirname(absoluteFilePath);

    const variants: ImageVariant[] = [];

    for (const config of VARIANT_CONFIGS) {
      const outputFilename = `${base}${config.suffix}.webp`;
      const outputPath = join(dir, outputFilename);
      const relativePath = `/uploads/${uploadsSubdir}/${outputFilename}`;

      let pipeline = sharp(inputBuffer);

      pipeline = pipeline.resize(config.maxWidth, config.maxWidth, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      const result = await pipeline
        .webp({ quality: config.quality })
        .toBuffer({ resolveWithObject: true });

      await fs.writeFile(outputPath, result.data);

      variants.push({
        path: relativePath,
        width: result.info.width,
        height: result.info.height,
        size: result.info.size,
      });
    }

    // Delete original (jpg/png) — replaced by WebP variants
    await fs.unlink(absoluteFilePath).catch(() => {});

    return {
      url: variants[0].path,
      variants: {
        url: variants[0].path,
        full: variants[0],
        card: variants[1],
        thumb: variants[2],
      },
    };
  } catch (error) {
    // Fallback: keep original file untouched
    console.error('WebP conversion failed, keeping original:', error);
    return {
      url: `/uploads/${uploadsSubdir}/${basename(absoluteFilePath)}`,
    };
  }
}
