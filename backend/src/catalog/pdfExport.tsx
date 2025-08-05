import React from 'react';
import { renderToString } from 'react-dom/server';
import CatalogTemplate from './catalog-template';
import type { CatalogItem } from './catalogData';
import { getCatalogItems } from './catalogData';

export function renderCatalogHtml(items: CatalogItem[]): string {
  const templateItems = items.map((item) => ({
    title: item.name,
    description: item.description,
    price: item.price ? item.price.toString() : undefined,
    imageUrl: item.imageUrl,
  }));
  return renderToString(<CatalogTemplate items={templateItems} />);
}

async function htmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return pdf;
  } finally {
    await browser.close();
  }
}

export async function exportCatalogPdf(
  filters: Record<string, any>,
): Promise<Buffer> {
  const items = getCatalogItems(filters);
  const html = renderCatalogHtml(items);
  return htmlToPdf(html);
}