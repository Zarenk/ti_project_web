# Inventario Inicial De Plantillas De Factura

Este archivo sirve como registro vivo de las plantillas configuradas en la tabla `InvoiceTemplate`. Completarlo forma parte del **Paso 1** del plan `invoice-pdf-ingestion-plan.md`.

## Convenciones
- **Identificador**: `ORG-SLUG / COMPANY / PROVIDER / DOCUMENT_TYPE / VERSION`.
- **Layout**: descripción breve del formato (por ejemplo, “PDF SUNAT estándar proveedor X”).
- **Campos críticos**: serie, correlativo, RUC emisor, fecha de emisión, tipo de moneda, subtotal, IGV, total.
- **Regex/Mapeos**: referencia al JSON almacenado en `regexRules` / `fieldMappings`.
- **Estado**: `pendiente`, `validada`, `en revisión`.

## Plantillas Registradas
| Identificador | ProviderId | Document Type | Layout / Notas | Campos críticos | Estado | Checklist |
|---------------|------------|---------------|----------------|-----------------|--------|-----------|
| _Ejemplo: ecoterra / matriz / PROV-123 / FACTURA / v1_ | `null` | `FACTURA` | Parser original (proveedor Ecoterra). Extrae totales, IGV, fechas. | Serie, correlativo, total, IGV, subtotal, moneda. | **Pendiente** | - [ ] PDF de muestra<br>- [ ] Regex documentado<br>- [ ] Validación contable |

> Añade una fila por cada parser existente. Marca el checklist una vez que el archivo PDF de referencia esté almacenado y la plantilla se haya cargado vía API.

## Procedimiento Para Registrar Una Plantilla
1. **Reunir datos**: proveedor, tipo de documento, PDF de ejemplo, campos obligatorios SUNAT.
2. **Mapear reglas**: construir los `regexRules`, `fieldMappings` y `extractionHints` a usar por el parser.
3. **Cargarla** vía API:
   ```bash
   curl -X POST http://localhost:4000/api/invoice-templates \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "documentType": "FACTURA",
       "providerId": 123,
       "version": 1,
       "priority": 10,
       "regexRules": { "...": "..." },
       "fieldMappings": { "...": "..." },
       "sampleFilename": "factura_ecoterra_v1.pdf",
       "notes": "Plantilla migrada del parser legacy"
     }'
   ```
4. **Actualizar esta tabla**: documentar el identificador, campos y estado.
5. **Validar** con un documento real y registrar en `AuditLog` al usuario que aprobó la extracción.

## Pendientes
- [ ] Inventariar los parsers existentes y completarlos en la tabla.
- [ ] Almacenar muestras en `storage/invoice-samples/<provider>/...` (o bucket equivalente).
- [ ] Agregar pruebas unitarias para cada plantilla migrada.

## Convención De Archivos
- Carpeta base local: `storage/invoice-samples`.
- Subcarpetas sugeridas: `<org-slug>/<provider>/<documentType>/ejemplo_v1.pdf`.
- Al registrar la plantilla, referencia la ruta relativa en `sampleFilename`.

## Flujo Para Subir PDFs (Backend)
1. **Recopilar el PDF** desde soporte o registros existentes.
2. **Almacenar** el archivo en `storage/invoice-samples/<org>/<provider>/<documentType>/...`.
3. **Registrar metadata**:
   - Actualiza `invoice-template-inventory.md` con la ruta.
   - Crea/actualiza la plantilla vía `POST /api/invoice-templates` asignando `sampleFilename`.
4. **Verificar acceso**: asegurarse de que el backend pueda leer `storage/invoice-samples/...` para pruebas o futuros procesos ML. Considerar moverlo a un bucket con cifrado y permisos por tenant cuando se pase a producción.
