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

    items.forEach((item) => {
      doc.fontSize(16).text(item.name);
      if (item.description) {
        doc.moveDown(0.5);
        doc.fontSize(12).text(item.description);
      }
      if (item.price) {
        doc.moveDown(0.25);
        doc.fontSize(12).text(`Price: ${item.price}`);
      }
      doc.moveDown();
    });

    doc.end();
  });
}

export async function exportCatalogPdf(
  filters: Record<string, any>,
): Promise<Buffer> {
  const items = getCatalogItems(filters);
  return itemsToPdf(items);
}