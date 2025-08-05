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
3. Open `out.pdf` and verify it contains the provided data.