import React from 'react';
import { renderToString } from 'react-dom/server';
import CatalogTemplate from './catalog-template';
import type { CatalogItem } from './catalogData';
import { getCatalogItems } from './catalogData';
import PDFDocument from 'pdfkit';

export function renderCatalogHtml(items: CatalogItem[]): string {
  const templateItems = items.map((item) => ({
    title: item.name,
    description: item.description,
    price: item.price ? item.price.toString() : undefined,
    imageUrl: item.imageUrl,
  }));
  return renderToString(<CatalogTemplate items={templateItems} />);
}

function itemsToPdf(items: CatalogItem[]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];
    doc.on('data', (b) => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    const grouped = items.reduce<Record<string, CatalogItem[]>>((acc, item) => {
      const category = item.categoryName || 'Sin categoría';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {});

    const entries = Object.entries(grouped);
    entries.forEach(([category, items], idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 50) {
        doc.addPage();
      }
      doc.fontSize(18).text(category);
      doc.moveDown();
      items.forEach((item) => {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
          doc.addPage();
        }
        doc
          .fontSize(16)
          .text(item.name, {
            width:
              doc.page.width -
              doc.page.margins.left -
              doc.page.margins.right,
          });
        if (item.description) {
          doc.moveDown(0.5);
          doc.fontSize(12).text(item.description);
        }
        if (item.price) {
          doc.moveDown(0.25);
          doc.fontSize(12).text(item.description, {
            width:
              doc.page.width -
              doc.page.margins.left -
              doc.page.margins.right,
          });
        }
        doc.moveDown();
      });
      if (idx < entries.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  });
}

export async function exportCatalogPdf(
  filters: Record<string, any>,
): Promise<Buffer> {
  const items = await getCatalogItems(filters);
  return itemsToPdf(items);
}