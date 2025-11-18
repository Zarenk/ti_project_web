# Plan De Implementacion: Ingesta Y Lectura Inteligente De Facturas PDF

Este documento resume los pasos para evolucionar el modulo de carga de comprobantes (`/dashboard/entries/new`) desde el parser puntual que ya existe hacia una solucion escalable, auditable y alineada con normativas peruanas.

## 1. Normalizacion Inicial
- Inventario de formatos (proveedor, tipo de documento, layout) y datos obligatorios SUNAT/PLE.
- Definir politicas de retencion y cifrado de PDFs; registrar quiÃ©n sube cada archivo.
- Establecer una nomenclatura para versiones de plantilla/modelo y un repositorio controlado (ej. `prisma.seed` o tabla `pdf_layout_templates`).

## 2. Pipeline De Ingesta
1. **Subida**: almacenar el PDF original sin alteraciones, con metadatos (`companyId`, `orgId`, `userId`, hash SHA-256).
2. **Extraccion base**: convertir a texto estructurado usando `pdfplumber` y, si detectamos imagenes/escaneos, ejecutar OCR (Tesseract/Textract). Guardar la salida en una tabla temporal para depuraciÃ³n.
3. **Validacion tecnica**: verificar que el PDF no estÃ© vacÃ­o, tenga texto utilizable y no exceda tamaÃ±os soportados por el motor.

## 3. Motor De Plantillas Parametrizadas
- Crear una entidad tipo `InvoiceTemplate` con campos: `providerId`, `documentType`, `version`, `regex_rules`, `field_mappings`.
- El parser actual por proveedor se migra a estas plantillas; cada plantilla debe tener pruebas unitarias que aseguren que extrae subtotal, IGV, total, fechas.
- Permitir activar/desactivar plantillas por organizacion para no mezclar tenants.

## 4. Clasificador Del Documento
- Entrenar un modelo simple (TF IDF + Logistic Regression) con facturas etiquetadas (proveedor/tipo). El modelo solo decide quÃ© plantilla aplicar.
- Versionar el modelo y almacenar metricas (precision, recall). Documentar en `docs/ml-models.md`.
- Si el clasificador tiene baja confianza (< umbral configurable), saltar a modo independiente: solicitar al usuario elegir el proveedor y guardar la eleccion como dato supervisado.

## 5. Extraccion Asistida Por ML / Servicios
- Evaluar LayoutLM, Donut o servicios como Azure Form Recognizer / Google DocAI para casos sin plantilla. Requisitos:
  - Asegurar que el servicio cumpla con proteccion de datos (ubicacion, contratos).
  - Enviar PDFs anonimizados siempre que sea posible (enmascarar RUC, montos).
- Guardar la respuesta del servicio junto con un puntaje de confianza y permitir correcciones manuales.

## 6. Validaciones Contables Y Normativas
- Comparar los montos extrai­dos: `subtotal + impuestos = total`. Si hay diferencias, marcar como requiere revision.
- Verificar campos obligatorios SUNAT: RUC emisor, serie, correlativo, fecha de emision, tipo de moneda, IGV aplicado. Incluir reglas de negocio (ej. validez de RUC).
- Mantener el PDF original y el JSON resultante para auditori­a; registrar quien aprobara la extraccion antes de registrarse en contabilidad.

## 7. Flujo De Aprobacion Y Feedback
- Mostrar al usuario los campos extrai­dos con indicadores de confianza.
- Si el usuario edita algun valor, guardar esa correccion como `training_data` (input + output confirmado). El pipeline debe poder exportar estos ejemplos para reentrenar.
- Emitir un log de auditoria (`AuditLog`) con: usuario, plantilla/modelo aplicado, cambios manuales, timestamps.

## 8. Monitoreo Y Mejora Continua
- Dashboard de metricas: numero de facturas procesadas, tasa de aciertos por plantilla/modelo, errores recurrentes por proveedor.
- Alertas cuando:
  - un proveedor supera cierto numero de fallos.
  - se detecta un cambio de layout (por ejemplo, baja repentina en confianza).
- Calendario de revalidaciÃ³n: revisar plantillas cada trimestre o al detectar cambios.

## 9. Seguridad Y Cumplimiento
- Almacenar los PDFs en un bucket cifrado (S3/Wasabi + SSE); restringir acceso por `companyId`.
- En entrenamiento/ML externo, anonimizar o firmar acuerdos de procesamiento de datos.
- Mantener copias de respaldo y seguimiento de quien accede a cada documento, cumpliendo las normas de proteccion de datos (Ley N. 29733) y requisitos SUNAT.

## 10. Roadmap De Implementacion
1. Documentar plantillas actuales y migrarlas a la tabla configurada.
2. AÃ±adir pipeline de extraccion estandarizado + logging.
3. Implementar clasificador basico y fallback manual.
4. Integrar un servicio ML o modelo propio como segunda capa.
5. AÃ±adir validaciones contables + interfaz de confirmacion.
6. Incorporar feedback loop y monitoreo.
7. Formalizar procesos de seguridad / cumplimiento y auditoris.

> **Nota**: Cada etapa debe incluir pruebas unitarias/integracion, asi­ como planes de despliegue controlados por tenant para evitar que un parser defectuoso afecte a todas las organizaciones.

### Estado Paso 1
- [x] Tabla InvoiceTemplate + API CRUD.
- [x] Inventario documentado en docs/invoice-template-inventory.md.
- [x] Plantillas legacy migradas a la tabla (auto-import desde storage/invoice-samples).

### Estado Paso 2
- [x] Registro de muestras y logs automático al subir PDFs.
- [x] Servicio de extracción básico (processSample) con texto preliminar.
- [x] Endpoint GET /invoice-samples/entry/:entryId y /:sampleId/logs para exponer metadatos.
- [x] UI de estado, revisión de campos extraídos y selección manual de plantillas.

### Paso 3 (Clasificador + Fallback)
- [x] Clasificador Python (TF-IDF + Logistic) entrenado con scripts en backend/ml/ y documentado en docs/ml-models.md.
- [x] Detector heurístico `regexRules` + `fieldMappings` como respaldo.
- [x] Validaciones contables/SUNAT tras la extracción y logging de inconsistencias.
- [x] Fallback manual (endpoint POST /invoice-samples/:id/template) y UI para inspección.
  - [x] Retraining automático con datos reales y almacenamiento de métricas por tenant.

### Paso 4 (Extracción asistida por ML/Servicios)
- [x] Servicio `MlExtractionService` que anonimiza texto y delega a un modelo externo o script Python (`backend/ml/extract_invoice_fields.py`) cuando no hay coincidencias de plantilla.
- [x] Script heurístico base que devuelve campos clave (serie, correlativo, montos) y puntajes de confianza para auditoría.
- [x] Logs y payloads enriquecidos con `mlProvider`, `mlConfidence` y hash del texto para cumplir con los requisitos de trazabilidad y protección de datos.

