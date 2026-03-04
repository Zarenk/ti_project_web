import path from 'path';
import { existsSync } from 'fs';
import ExcelJS from 'exceljs';
import sharp from 'sharp';
import {
  getCatalogItems,
  getCatalogMeta,
  type CatalogItem,
} from './catalogData';
import { resolveStoragePath } from '../utils/path-utils';

/* ------------------------------------------------------------------ */
/*  Colour palette                                                     */
/* ------------------------------------------------------------------ */
const COLORS = {
  primary: 'FF1A1A2E', // Dark navy header
  primaryText: 'FFFFFFFF',
  accent: 'FF16213E', // Slightly lighter navy
  accentText: 'FFFFFFFF',
  categoryBg: 'FF0F3460', // Blue for category headers
  categoryText: 'FFFFFFFF',
  rowEven: 'FFF8F9FA', // Light grey
  rowOdd: 'FFFFFFFF', // White
  border: 'FFD1D5DB', // Soft grey border
  priceText: 'FF059669', // Green for prices
  brandText: 'FF6B7280', // Muted grey for brand
  footerBg: 'FFF3F4F6',
  footerText: 'FF6B7280',
};

const TOTAL_COLS = 5; // A..E

/* ------------------------------------------------------------------ */
/*  Image helpers                                                      */
/* ------------------------------------------------------------------ */

/** Resolve a product image path (e.g. /uploads/products/abc.webp) to an
 *  absolute filesystem path.  Returns undefined when the file is missing. */
function resolveImagePath(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  // Strip leading slash so resolveStoragePath can join correctly
  const relative = imageUrl.replace(/^\//, '');
  const abs = resolveStoragePath(relative);
  return existsSync(abs) ? abs : undefined;
}

/** Convert any supported image (including WebP) to a PNG buffer that
 *  ExcelJS can embed.  Returns undefined on failure. */
async function toPngBuffer(
  filePath: string,
  size = 80,
): Promise<Buffer | undefined> {
  try {
    const buf = await sharp(filePath)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    return Buffer.from(buf);
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/*  Styling helpers                                                    */
/* ------------------------------------------------------------------ */

function applyThinBorder(
  row: ExcelJS.Row,
  cols: number,
  color = COLORS.border,
) {
  const borderStyle: ExcelJS.Border = {
    style: 'thin',
    color: { argb: color },
  };
  for (let c = 1; c <= cols; c++) {
    row.getCell(c).border = {
      top: borderStyle,
      bottom: borderStyle,
      left: borderStyle,
      right: borderStyle,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Main workbook builder                                              */
/* ------------------------------------------------------------------ */

async function populateWorkbook(
  items: CatalogItem[],
  companyName: string,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = companyName;
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Catálogo', {
    properties: { defaultRowHeight: 18 },
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Column widths: Image | Producto | Descripción | Precio | Marca
  ws.columns = [
    { key: 'image', width: 14 },
    { key: 'name', width: 32 },
    { key: 'description', width: 38 },
    { key: 'price', width: 16 },
    { key: 'brand', width: 16 },
  ];

  /* ---------- Row 1: Company title ---------- */
  const titleText = `CATÁLOGO DE PRODUCTOS`;
  ws.mergeCells('A1:E1');
  const titleCell = ws.getCell('A1');
  titleCell.value = titleText;
  titleCell.font = { bold: true, size: 18, color: { argb: COLORS.primaryText } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.primary },
  };
  ws.getRow(1).height = 36;

  /* ---------- Row 2: Company name + date ---------- */
  const dateStr = new Date().toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ws.mergeCells('A2:E2');
  const subCell = ws.getCell('A2');
  subCell.value = `${companyName}  •  ${dateStr}`;
  subCell.font = {
    size: 11,
    color: { argb: COLORS.accentText },
    italic: true,
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.accent },
  };
  ws.getRow(2).height = 24;

  /* ---------- Row 3: Spacer ---------- */
  ws.getRow(3).height = 6;

  /* ---------- Group items by category ---------- */
  const grouped = items.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const cat = item.categoryName || 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  let currentRow = 4;
  let productIndex = 0;

  for (const cat of categories) {
    /* ---- Category header ---- */
    ws.mergeCells(`A${currentRow}:E${currentRow}`);
    const catCell = ws.getCell(`A${currentRow}`);
    catCell.value = `  ${cat.toUpperCase()}`;
    catCell.font = {
      bold: true,
      size: 12,
      color: { argb: COLORS.categoryText },
    };
    catCell.alignment = { horizontal: 'left', vertical: 'middle' };
    catCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.categoryBg },
    };
    ws.getRow(currentRow).height = 26;
    currentRow++;

    /* ---- Column sub-headers for this group ---- */
    const hdrRow = ws.getRow(currentRow);
    const headers = ['', 'Producto', 'Descripción', 'Precio', 'Marca'];
    headers.forEach((h, i) => {
      const cell = hdrRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } };
      cell.alignment = { horizontal: i === 3 ? 'right' : 'left', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
    });
    hdrRow.height = 20;
    applyThinBorder(hdrRow, TOTAL_COLS);
    currentRow++;

    /* ---- Product rows ---- */
    const sortedItems = grouped[cat].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const item of sortedItems) {
      const isEven = productIndex % 2 === 0;
      const bgColor = isEven ? COLORS.rowEven : COLORS.rowOdd;

      const row = ws.getRow(currentRow);
      row.height = 70; // Tall enough for product image

      // Col A: Image placeholder (will add image below)
      row.getCell(1).value = '';

      // Col B: Product name
      const nameCell = row.getCell(2);
      nameCell.value = item.name;
      nameCell.font = { bold: true, size: 11, color: { argb: 'FF111827' } };
      nameCell.alignment = {
        vertical: 'middle',
        wrapText: true,
      };

      // Col C: Description
      const descCell = row.getCell(3);
      descCell.value = item.description || '—';
      descCell.font = { size: 10, color: { argb: 'FF4B5563' } };
      descCell.alignment = { vertical: 'middle', wrapText: true };

      // Col D: Price (selling price preferred, fallback to cost)
      const displayPrice = item.priceSell ?? item.price;
      const priceCell = row.getCell(4);
      priceCell.value = displayPrice;
      priceCell.numFmt = '"S/." #,##0.00';
      priceCell.font = {
        bold: true,
        size: 12,
        color: { argb: COLORS.priceText },
      };
      priceCell.alignment = { horizontal: 'right', vertical: 'middle' };

      // Col E: Brand
      const brandCell = row.getCell(5);
      brandCell.value = item.brand || '—';
      brandCell.font = { size: 10, color: { argb: COLORS.brandText } };
      brandCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Background colour for all cells
      for (let c = 1; c <= TOTAL_COLS; c++) {
        row.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor },
        };
      }
      applyThinBorder(row, TOTAL_COLS);

      // Insert product image (if available)
      const imgPath = resolveImagePath(item.imageUrl);
      if (imgPath) {
        const pngBuf = await toPngBuffer(imgPath, 80);
        if (pngBuf) {
          const imageId = workbook.addImage({
            buffer: pngBuf,
            extension: 'png',
          } as any);
          ws.addImage(imageId, {
            tl: { col: 0.15, row: currentRow - 1 + 0.1 } as any,
            ext: { width: 75, height: 60 },
          });
        }
      }

      currentRow++;
      productIndex++;
    }

    // Small gap between categories
    ws.getRow(currentRow).height = 8;
    currentRow++;
  }

  /* ---------- Footer ---------- */
  ws.mergeCells(`A${currentRow}:E${currentRow}`);
  const footerCell = ws.getCell(`A${currentRow}`);
  const totalProducts = items.length;
  const totalCategories = categories.length;
  footerCell.value = `Total: ${totalProducts} productos en ${totalCategories} categorías  •  Precios sujetos a disponibilidad de stock  •  Consultas: contactar a ${companyName}`;
  footerCell.font = { size: 9, italic: true, color: { argb: COLORS.footerText } };
  footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  footerCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.footerBg },
  };
  ws.getRow(currentRow).height = 24;

  /* ---------- Print settings ---------- */
  ws.headerFooter.oddFooter = `&C&"Arial,Italic"&8Página &P de &N  •  ${companyName}`;

  return workbook;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Builds an Excel catalog file with styled headers, formatted cells and logos.
 */
export async function buildCatalogExcel(
  items: CatalogItem[],
  outputPath: string,
): Promise<void> {
  const workbook = await populateWorkbook(items, 'Mi Empresa');
  await workbook.xlsx.writeFile(outputPath);
}

/**
 * Builds an Excel catalog and returns the document as a Buffer.
 */
export async function exportCatalogExcel(
  filters: Record<string, any>,
  options: { organizationId?: number | null; companyId?: number | null } = {},
): Promise<{ buffer: Buffer }> {
  const [items, meta] = await Promise.all([
    getCatalogItems(filters, options),
    getCatalogMeta(options),
  ]);
  const workbook = await populateWorkbook(items, meta.companyName);
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer) };
}

export default buildCatalogExcel;
