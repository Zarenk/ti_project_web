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

## Permissions configuration
1. En el panel de Opciones (`/dashboard/options`), habilita el modo mantenimiento y navega a la sección **Permisos de usuarios**.
2. Activa y desactiva un módulo (por ejemplo, "Panel principal") y verifica que el botón de guardar indique cambios pendientes.
3. Guarda los cambios y confirma que se persisten al recargar la página.

## Sidebar feature flags
1. Configura un usuario con rol `EMPLOYEE` y asegúrate de que las banderas `ACCOUNTING_ENABLED` y `ads` estén deshabilitadas en las configuraciones del sitio.
2. Inicia sesión con este usuario y abre el dashboard.
3. Confirma que el sidebar no muestra los accesos "Contabilidad" ni "Publicidad", pero sí otros módulos disponibles (por ejemplo, "Productos").

## Backend permission guard
1. Desactiva un módulo específico (p. ej., `inventory`) en la configuración de permisos.
2. Realiza una petición a un endpoint protegido con `@ModulePermission('inventory')` usando un usuario con rol distinto de `ADMIN` y verifica que responde `403`.
3. Repite la petición con un usuario `ADMIN` y valida que el acceso sea exitoso incluso con el módulo deshabilitado.