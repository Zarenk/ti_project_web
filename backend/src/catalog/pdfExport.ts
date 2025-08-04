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