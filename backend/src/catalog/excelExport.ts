import path from 'path';
import ExcelJS from 'exceljs';
import { getCatalogItems, type CatalogItem } from './catalogData';

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
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Precio', key: 'price', width: 15 },
    { header: 'Marca', key: 'brand', width: 15 },
    { header: 'GPU', key: 'gpu', width: 15 },
    { header: 'CPU', key: 'cpu', width: 15 },
    { header: 'Categoría', key: 'categoryName', width: 20 },
  ];

  const grouped = items.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const cat = item.categoryName || 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const title = `CATALOGO DE ${categories.join(', ')} de la empresa TECNOLOGIA INFORMATICA de la fecha ${new Date().toLocaleDateString()}`;
  worksheet.spliceRows(1, 0, [title]);
  worksheet.mergeCells('A1:G1');
  const titleRow = worksheet.getRow(1);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.alignment = { horizontal: 'center' };
  titleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
  };
  titleRow.height = 30;

  const headerRow = worksheet.getRow(2);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF333333' },
  };
  headerRow.height = 20;

  categories.forEach((cat) => {
    const catRow = worksheet.addRow({ name: cat });
    const rowNumber = catRow.number;
    worksheet.mergeCells(`A${rowNumber}:G${rowNumber}`);
    catRow.font = { bold: true };
    catRow.alignment = { horizontal: 'center' };

    grouped[cat]
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const row = worksheet.addRow({
          name: item.name,
          description: item.description,
          price: item.price,
          brand: item.brand,
          gpu: item.gpu,
          cpu: item.cpu,
          categoryName: item.categoryName,
        });

        row.getCell('price').numFmt = '#,##0.00';
        row.height = 60;
        row.alignment = { vertical: 'top', wrapText: true } as any;

        const rNumber = row.number;
        const insertLogo = (file: string, column: string) => {
          if (!file) return;
          try {
            const ext = path.extname(file).slice(1).toLowerCase();
            let excelExt: 'jpeg' | 'png' | 'gif';
            if (ext === 'jpg' || ext === 'jpeg') {
              excelExt = 'jpeg';
            } else if (ext === 'png') {
              excelExt = 'png';
            } else if (ext === 'gif') {
              excelExt = 'gif';
            } else {
              return;
            }

            const imageId = workbook.addImage({
              filename: file,
              extension: excelExt,
            });
            const colNumber = worksheet.getColumn(column).number;
            const tl = new (ExcelJS as any).Anchor(worksheet, {
              col: colNumber - 1,
              row: rNumber - 1,
            });
            const br = new (ExcelJS as any).Anchor(worksheet, {
              col: colNumber,
              row: rNumber,
            });
            worksheet.addImage(imageId, { tl, br, editAs: 'oneCell' });
          } catch {}
        };

        insertLogo(item.brandLogo ?? '', 'D');
        insertLogo(item.gpuLogo ?? '', 'E');
        insertLogo(item.cpuLogo ?? '', 'F');
      });
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
  filters: Record<string, any>,
): Promise<{ buffer: Buffer }> {
  const items: CatalogItem[] = await getCatalogItems(filters);
  const workbook = populateWorkbook(items);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer) };
}

export default buildCatalogExcel;
