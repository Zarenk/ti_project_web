import path from 'path';
import ExcelJS from 'exceljs';
import type { CatalogItem } from './catalogData';

/**
 * Builds an Excel catalog file with styled headers, formatted cells and logos.
 * @param items      Data used to populate the worksheet
 * @param outputPath Location where the xlsx file will be written
 */
export async function buildCatalogExcel(
  items: CatalogItem[],
  outputPath: string,
): Promise<void> {
  const workbook = populateWorkbook(items);
  await workbook.xlsx.writeFile(outputPath);
}

/**
 * Creates a workbook populated with the catalog data.
 * @param items Data used to populate the worksheet
 */
function populateWorkbook(items: CatalogItem[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Catalog');

  worksheet.columns = [
    { header: 'Nombre', key: 'name', width: 30 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Marca', key: 'brand', width: 15 },
    { header: 'GPU', key: 'gpu', width: 15 },
    { header: 'CPU', key: 'cpu', width: 15 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
  };
  headerRow.height = 20;

  items.forEach((item) => {
    const row = worksheet.addRow({
      name: item.name,
      price: item.price,
    });

    row.getCell('price').numFmt = '#,##0.00';
    row.height = 60;

    const rowNumber = row.number;
    const insertLogo = (file: string, column: string) => {
      if (!file) return;
      try {
        // Only allow supported extensions for ExcelJS
        const ext = path.extname(file).slice(1).toLowerCase();
        let excelExt: 'jpeg' | 'png' | 'gif';
        if (ext === 'jpg' || ext === 'jpeg') {
          excelExt = 'jpeg';
        } else if (ext === 'png') {
          excelExt = 'png';
        } else if (ext === 'gif') {
          excelExt = 'gif';
        } else {
          // Skip unsupported formats (e.g. svg)
          return;
        }

        const imageId = workbook.addImage({ filename: file, extension: excelExt });
        const colNumber = worksheet.getColumn(column).number;
        const tl: ExcelJS.Anchor = {
          col: colNumber - 1,
          row: rowNumber - 1,
          nativeCol: colNumber - 1,
          nativeRow: rowNumber - 1,
          nativeColOff: 0,
          nativeRowOff: 0,
        };
        const br: ExcelJS.Anchor = {
          col: colNumber,
          row: rowNumber,
          nativeCol: colNumber,
          nativeRow: rowNumber,
          nativeColOff: 0,
          nativeRowOff: 0,
        };
        worksheet.addImage(imageId, { tl, br, editAs: 'oneCell' });

      } catch {
        // Ignore logos that cannot be inserted
      }
    };

    insertLogo(item.brandLogo ?? '', 'C');
    insertLogo(item.gpuLogo ?? '', 'D');
    insertLogo(item.cpuLogo ?? '', 'E');
  });

  return workbook;
}

/**
 * Builds an Excel catalog and returns the document as a Buffer instead of
 * writing it to disk.
 *
 * @param filters Query parameters used to filter the catalog
 * @returns Buffer containing the generated xlsx file
 */
export async function exportCatalogExcel(
  products: { name: string; price: number }[],
): Promise<Buffer> {
  const items: CatalogItem[] = products.map((p) => ({
    name: p.name,
    price: p.price,
    brandLogo: '',
    gpuLogo: '',
    cpuLogo: '',
  }));
  const workbook = populateWorkbook(items);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export default buildCatalogExcel;