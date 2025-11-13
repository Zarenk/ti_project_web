# Multi-tenant SUNAT PDF storage plan

## Objetivo

Asegurar que los PDFs generados (comprobantes enviados a SUNAT) se almacenen y consulten respetando el aislamiento multi-tenant del sistema y cumpliendo los requerimientos de SUNAT en cuanto a trazabilidad por empresa/RUC.

## Alcance

1. Identificación de tenant: cada subida debe validar `organizationId` y `companyId` mediante `TenantContext`.
2. Estructura de carpetas segregada (`comprobantes/pdf/org-{orgId}/company-{companyId}/{tipo}`).
3. Registro en base de datos para cada archivo (metadata mínima: IDs de organización/empresa, tipo, ruta, usuario).
4. Control de acceso al descargar/consultar PDFs.
5. Ajustes de frontend para enviar `companyId` cuando corresponda y propagar token (ya resuelto).

## Pasos

1. **Resolver tenant en `SunatController.uploadPdf`:**
   - Inyectar `@CurrentTenant`.
   - Validar que exista `companyId` (de la request o del tenant) y coincida con el contexto.

2. **Crear estructura de almacenamiento por tenant:**
   - Directorios `comprobantes/pdf/org-{orgId}/company-{companyId}/{tipo}`.
   - Asegurar creación recursiva y manejo de colisiones.

3. **Persistir metadata:**
   - Nueva tabla o reutilizar `SunatTransmission` para guardar:
     - `companyId`, `organizationId`, `tipo`, `filename`, `relativePath`, `createdBy`.
   - Registrar tras cada carga exitosa.

4. **Restringir lectura:**
   - En `GET /sunat/pdf/:tipo/:filename` (y otros endpoints) resolver el registro en BD y verificar que el tenant actual tenga acceso.

5. **Actualizar frontend (si aplica):**
   - Usar el token (ya resuelto) e incluir `companyId` al subir cuando el usuario cambie de empresa.

6. **Pruebas y documentación:**
   - Unit tests para validar rutas, metadata y permisos.
   - E2E manual para confirmar flujo completo y acceso restringido.

## Avance actual

- Paso 1 completado: `uploadPdf` valida el tenant activo.
- Paso 2 completado: PDFs se guardan en `comprobantes/pdf/org-{orgId}/company-{companyId}/{tipo}`.
- Paso 3 completado: nueva tabla `SunatStoredPdf` registra la metadata.
- Paso 4 completado: `GET /sunat/pdf/...` valida el tenant mediante la metadata y se agregó `GET /sunat/pdfs` para listar archivos por empresa.
- Paso 5 completado: el dashboard de empresas muestra los PDFs almacenados y permite descargarlos respetando los permisos del tenant.

## Pruebas sugeridas

1. **Subida válida**
   - Autenticarse como usuario de la empresa A.
   - Subir un PDF y verificar que:
     - Se crea el registro en `SunatStoredPdf` con `companyId`/`organizationId` correctos.
     - El archivo aparece en `comprobantes/pdf/org-A/company-A/...`.
2. **Aislamiento**
   - Cambiar al tenant B e intentar descargar el PDF de A via `GET /sunat/pdf/...`.
   - Debe responder 403.
3. **Descarga autorizada**
   - Desde la empresa A descargar el mismo PDF: debe devolver 200 y el contenido correcto.
4. **Sobrescritura controlada**
   - Repetir la subida con el mismo nombre; confirmar que se actualiza el registro (no duplicado) y que el archivo se reemplaza.
5. **Auditoría**
   - Revisar que `SunatStoredPdf` conserva `createdBy` y `createdAt` para trazabilidad.

Documentar los resultados (fecha, tenant utilizado, sale/order relacionada) en la bitácora general.
