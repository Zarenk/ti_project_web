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

function getLogos(item: CatalogItem): Logo[] {
  const logos: Logo[] = [];
  const pushLogo = (logo?: string) => {
    const normalized = normalizeLogo(logo);
    if (normalized) logos.push(normalized);
  };
  if (item.brand) {
    pushLogo(brandAssets.brands[item.brand.toLowerCase()]);
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

async function itemsToPdf(items: CatalogItem[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
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

      const logos = getLogos(item);
      if (logos.length > 0) {
        doc.moveDown(0.5);
        const startX = doc.x;
        const y = doc.y;
        for (const [idx, logo] of logos.entries()) {
          try {
            doc.image(logo, startX + idx * 26, y, { width: 24, height: 24 });
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
): Promise<Buffer> {
  const items = await getCatalogItems(filters);
  return itemsToPdf(items);
}

export { itemsToPdf };