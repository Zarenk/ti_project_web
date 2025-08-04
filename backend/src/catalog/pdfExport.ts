import puppeteer from 'puppeteer';

/**
 * Generate a PDF from a HTML template replacing `{{key}}` placeholders with
 * provided data values.
 *
 * @param data Key/value pairs used to interpolate the template.
 * @param template HTML template containing `{{key}}` placeholders.
 * @returns Buffer with the generated PDF.
 */
export async function pdfExport(
  data: Record<string, any>,
  template: string,
): Promise<Buffer> {
  const compiledHtml = template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : '';
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(compiledHtml, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await page.close();
    return pdf;
  } finally {
    await browser.close();
  }
}

/**
 * Build a simple catalog PDF using the generic {@link pdfExport} helper.
 * The current implementation renders the provided filter values inside a
 * basic HTML template and returns the resulting PDF as a Buffer.
 *
 * @param filters Query parameters used to filter the catalog.
 * @returns Buffer containing a valid PDF document.
 */
export async function exportCatalogPdf(
  filters: Record<string, any>,
): Promise<Buffer> {
  const template = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Catálogo</title>
    </head>
    <body>
      <h1>Catálogo</h1>
      <p>Generado el {{date}}</p>
      <pre>{{filters}}</pre>
    </body>
  </html>`;

  return pdfExport(
    {
      date: new Date().toLocaleString(),
      filters: JSON.stringify(filters, null, 2),
    },
    template,
  );
}