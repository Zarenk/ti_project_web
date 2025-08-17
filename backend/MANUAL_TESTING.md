# Manual Testing

## pdfExport
1. Navigate to the backend project:
   ```bash
   cd backend
   ```
2. Create a small script (or use Node REPL) that calls the exporter:
   ```typescript
   import { exportCatalogPdf } from './src/catalog/pdfExport';
   import { writeFileSync } from 'fs';

   exportCatalogPdf({ title: 'Hello PDF' }).then(buf => writeFileSync('out.pdf', buf));
   ```
3. Seed or mock at least one product whose `brand` is `"Lenovo"` (trailing spaces are fine).
4. Open `out.pdf` and verify that the Lenovo logo is embedded next to the corresponding product.

## Brand upload resilience
1. Start the backend application.
2. Simulate a failing image conversion by temporarily making `convertJpegToPng` throw (for example, rename the uploaded file to a non-image).
3. Upload a `.jpg` logo when creating a brand.
4. Verify that the brand is created successfully even though no `logoPng` or `logoSvg` paths are returned.