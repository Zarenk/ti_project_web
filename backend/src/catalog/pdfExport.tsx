import React from 'react';
import { renderToString } from 'react-dom/server';
import CatalogTemplate from './catalog-template';
import type { CatalogItem } from './catalogData';
import { getCatalogItems } from './catalogData';
import PDFDocument from 'pdfkit';
import { brandAssets } from './brandAssets';
import path from 'path';
import fs from 'fs';
import SVGtoPDF from 'svg-to-pdfkit';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { resolveBackendPath } from '../utils/path-utils';

const prisma = new PrismaClient();

let cachedBrandLogos: Record<string, string> | null = null;
async function getBrandLogos(): Promise<Record<string, string>> {
  if (!cachedBrandLogos) {
    const brands = await prisma.brand.findMany({
      select: { name: true, logoSvg: true, logoPng: true },
    });
    cachedBrandLogos = {};
    for (const b of brands) {
      const rel = b.logoSvg || b.logoPng;
      if (rel) {
        cachedBrandLogos[b.name.toLowerCase()] = path.resolve(
          __dirname,
          '../..',
          rel.replace(/^\//, ''),
        );
      }
    }
  }
  return cachedBrandLogos;
}

async function getActiveCoverPath(options: {
  organizationId?: number | null;
  companyId?: number | null;
} = {}): Promise<string | null> {
  const { organizationId, companyId } = options;
  if (organizationId == null) {
    return null;
  }
  const cover = await prisma.catalogCover.findFirst({
    where: {
      isActive: true,
      organizationId,
      companyId: companyId ?? null,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!cover) {
    return null;
  }
  if (cover.imagePath.startsWith('http')) {
    return null;
  }
  const relative = cover.imagePath.replace(/^[/\\]+/, '');
  const absolute = resolveBackendPath(...relative.split(/[\\/]+/));
  return fs.existsSync(absolute) ? absolute : null;
}

export function renderCatalogHtml(items: CatalogItem[]): string {
  const templateItems = items.map((item) => ({
    title: item.name,
    description: item.description,
    price: item.price ? item.price.toString() : undefined,
    imageUrl: item.imageUrl,
  }));
  return renderToString(<CatalogTemplate items={templateItems} />);
}

type Logo = { path: string; isSvg: boolean };

function normalizeLogo(logoPath: string | undefined): Logo | null {
  if (!logoPath) return null;
  const ext = path.extname(logoPath).toLowerCase();
  if (ext === '.svg') return { path: logoPath, isSvg: true };
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
    return { path: logoPath, isSvg: false };
  }
  const pngFallback = logoPath.replace(/\.[^.]+$/, '.png');
  return fs.existsSync(pngFallback) ? { path: pngFallback, isSvg: false } : null;
}

async function getLogos(item: CatalogItem): Promise<Logo[]> {
  const logos: Logo[] = [];
  const pushLogo = (logo?: string) => {
    const normalized = normalizeLogo(logo);
    if (normalized) logos.push(normalized);
  };
  if (item.brand) {
    const brandLogos = await getBrandLogos();
    pushLogo(brandLogos[item.brand.toLowerCase()]);
  }
  const cpu = item.cpu?.toLowerCase() || '';
  for (const [key, logoPath] of Object.entries(brandAssets.cpus)) {
    if (cpu.includes(key)) {
      pushLogo(logoPath);
      break;
    }
  }
  const gpu = item.gpu?.toLowerCase() || '';
  for (const [key, logoPath] of Object.entries(brandAssets.gpus)) {
    if (gpu.includes(key)) {
      pushLogo(logoPath);
      break;
    }
  }
  return logos;
}

async function itemsToPdf(items: CatalogItem[], options: { coverImagePath?: string | null } = {}): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const { coverImagePath } = options;
  const buffers: Buffer[] = [];
  doc.on('data', (b) => buffers.push(b));
  const endPromise = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(buffers))),
  );

  const grouped = items.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const category = item.categoryName || 'Sin categoría';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const title = `CATALOGO DE ${categories.join(', ')} de la empresa TECNOLOGIA INFORMATICA de la fecha ${new Date().toLocaleDateString()}`;

  const drawTitleBanner = () => {
    doc.rect(0, 0, doc.page.width, 80).fill('#333333');
    doc
      .fillColor('white')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(title, doc.page.margins.left, 30, {
        width:
          doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center',
      });
  };

  let coverRendered = false;
  if (coverImagePath) {
    try {
      const coverWidth = Math.max(800, Math.round(doc.page.width * 4));
      const coverHeight = Math.max(1120, Math.round(doc.page.height * 4));
      const coverBuffer = await sharp(coverImagePath)
        .resize({ width: coverWidth, height: coverHeight, fit: 'cover' })
        .jpeg()
        .toBuffer();
      doc.image(coverBuffer, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
      });
      doc.save();
      doc.fillOpacity(0.55);
      doc.rect(0, doc.page.height - 160, doc.page.width, 160).fill('#000000');
      doc.restore();
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(26)
        .text(title, doc.page.margins.left, doc.page.height - 130, {
          width:
            doc.page.width - doc.page.margins.left - doc.page.margins.right,
          align: 'center',
        });
      coverRendered = true;
    } catch (error) {
      coverRendered = false;
    }
  }

  if (!coverRendered) {
    drawTitleBanner();
  }

  doc.addPage();
  doc.fillColor('black');

  const entries = Object.entries(grouped).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (let i = 0; i < entries.length; i++) {
    const [category, items] = entries[i];
    if (doc.y > doc.page.height - doc.page.margins.bottom - 50) {
      doc.addPage();
    }
    doc.font('Helvetica-Bold').fontSize(24).text(category, { align: 'center' });
    doc.moveDown();
    doc.font('Helvetica');

    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
      }
      doc.fontSize(16).text(item.name, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center',
      });
      if (item.description) {
        doc.moveDown(0.5);
        doc.fontSize(12).text(item.description, { align: 'center' });
      }
      if (typeof item.price === 'number') {
        doc.moveDown(0.25);
        doc.fontSize(12).text(item.price.toString(), { align: 'center' });
      }

      const logos = await getLogos(item);
      if (logos.length > 0) {
        doc.moveDown(0.5);
        const startX = doc.x;
        const y = doc.y;
        for (const [idx, logo] of logos.entries()) {
          try {
            if (logo.isSvg) {
              const svg = fs.readFileSync(logo.path, 'utf8');
              SVGtoPDF(doc, svg, startX + idx * 26, y, {
                width: 24,
                height: 24,
              });
            } else {
              const imgBuffer = await sharp(logo.path)
                .resize({ width: 256, height: 256, fit: 'inside' })
                .png()
                .toBuffer();
              doc.image(imgBuffer, startX + idx * 26, y, {
                width: 24,
                height: 24,
              });
            }
          } catch {}
        }
        doc.moveDown(1.5);
      } else {
        doc.moveDown();
      }
    }
    if (i < entries.length - 1) {
      doc.addPage();
    }
  }

  doc.end();
  return endPromise;
}

export async function exportCatalogPdf(
  filters: Record<string, any>,
  options: { organizationId?: number | null; companyId?: number | null } = {},
): Promise<Buffer> {
  const [items, coverImagePath] = await Promise.all([
    getCatalogItems(filters, options),
    getActiveCoverPath(options),
  ]);
  return itemsToPdf(items, { coverImagePath });
}

export { itemsToPdf };

