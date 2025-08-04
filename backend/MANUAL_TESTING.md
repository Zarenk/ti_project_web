# Manual Testing

## pdfExport
1. Navigate to the backend project and install Puppeteer:
   ```bash
   cd backend
   npm install puppeteer
   ```
2. Create a small script (or use Node REPL) that calls the exporter:
   ```typescript
   import { pdfExport } from './src/catalog/pdfExport';
   import { writeFileSync } from 'fs';

   const template = `<html><head><style>h1{color:red;}</style></head><body><img src="logo.png" /><h1>{{title}}</h1></body></html>`;
   pdfExport({ title: 'Hello PDF' }, template).then(buf => writeFileSync('out.pdf', buf));
   ```
3. Open `out.pdf` and verify:
   - The logo image is visible.
   - The title text appears in red, confirming styles are applied.