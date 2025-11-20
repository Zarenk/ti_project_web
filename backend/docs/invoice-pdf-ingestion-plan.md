# Plan De Implementacion: Ingesta Y Lectura Inteligente De Facturas PDF

Este documento resume los pasos para evolucionar el modulo de carga de comprobantes (`/dashboard/entries/new`) desde el parser puntual que ya existe hacia una solucion escalable, auditable y alineada con normativas peruanas.

## 1. Normalizacion Inicial
- Inventario de formatos (proveedor, tipo de documento, layout) y datos obligatorios SUNAT/PLE.
- Definir politicas de retencion y cifrado de PDFs; registrar quién sube cada archivo.
- Establecer una nomenclatura para versiones de plantilla/modelo y un repositorio controlado (ej. `prisma.seed` o tabla `pdf_layout_templates`).

## 2. Pipeline De Ingesta
1. **Subida**: almacenar el PDF original sin alteraciones, con metadatos (`companyId`, `orgId`, `userId`, hash SHA-256).
2. **Extraccion base**: convertir a texto estructurado usando `pdfplumber` y, si detectamos imagenes/escaneos, ejecutar OCR (Tesseract/Textract). Guardar la salida en una tabla temporal para depuración.
3. **Validacion tecnica**: verificar que el PDF no esté vacío, tenga texto utilizable y no exceda tamaños soportados por el motor.

## 3. Motor De Plantillas Parametrizadas
- Crear una entidad tipo `InvoiceTemplate` con campos: `providerId`, `documentType`, `version`, `regex_rules`, `field_mappings`.
- El parser actual por proveedor se migra a estas plantillas; cada plantilla debe tener pruebas unitarias que aseguren que extrae subtotal, IGV, total, fechas.
- Permitir activar/desactivar plantillas por organizacion para no mezclar tenants.

## 4. Clasificador Del Documento
- Entrenar un modelo simple (TF IDF + Logistic Regression) con facturas etiquetadas (proveedor/tipo). El modelo solo decide qué plantilla aplicar.
- Versionar el modelo y almacenar metricas (precision, recall). Documentar en `docs/ml-models.md`.
- Si el clasificador tiene baja confianza (< umbral configurable), saltar a modo independiente: solicitar al usuario elegir el proveedor y guardar la eleccion como dato supervisado.

## 5. Extraccion Asistida Por ML / Servicios
- Evaluar LayoutLM, Donut o servicios como Azure Form Recognizer / Google DocAI para casos sin plantilla. Requisitos:
  - Asegurar que el servicio cumpla con proteccion de datos (ubicacion, contratos).
  - Enviar PDFs anonimizados siempre que sea posible (enmascarar RUC, montos).
- Guardar la respuesta del servicio junto con un puntaje de confianza y permitir correcciones manuales.

## 6. Validaciones Contables Y Normativas
- Comparar los montos extraidos: `subtotal + impuestos = total`. Si hay diferencias, marcar como requiere revision.
- Verificar campos obligatorios SUNAT: RUC emisor, serie, correlativo, fecha de emision, tipo de moneda, IGV aplicado. Incluir reglas de negocio (ej. validez de RUC).
- Mantener el PDF original y el JSON resultante para auditoria; registrar quien aprobara la extraccion antes de registrarse en contabilidad.

## 7. Flujo De Aprobacion Y Feedback
- Mostrar al usuario los campos extraidos con indicadores de confianza.
- Si el usuario edita algun valor, guardar esa correccion como `training_data` (input + output confirmado). El pipeline debe poder exportar estos ejemplos para reentrenar.
- Emitir un log de auditoria (`AuditLog`) con: usuario, plantilla/modelo aplicado, cambios manuales, timestamps.
- El proceso manual consume POST /invoice-samples/:sampleId/corrections y guarda el training_data generado, serializando los fields si no hay texto explicito.
- Cada correccion registra mlMetadata (hash/redacted-path, proveedor ML, region) en el log TRAINING_DATA, junto al mlProvider que genero la inferencia.
- El modal muestra una notificación adicional cuando la corrección incluye metadata (`source`, `fileHash`), de modo que el usuario sabe qué inferencia se sobreescribió.
- Se añadió un test de integración que crea una plantilla y luego envía una corrección para esa muestra mediante `supertest`, validando que la respuesta provee `mlMetadata` y que los logs `TRAINING_DATA` contengan ese mismo metadata para auditoría.
- Las pruebas unitarias de recordCorrection verifican que TemplateTrainingService.recordSample reciba el texto correcto y que TRAINING_DATA se loguee con mlMetadata completa.

## 8. Monitoreo Y Mejora Continua
- Dashboard de metricas: numero de facturas procesadas, tasa de aciertos por plantilla/modelo, errores recurrentes por proveedor.
- Alertas cuando:
  - un proveedor supera cierto numero de fallos.
  - se detecta un cambio de layout (por ejemplo, baja repentina en confianza).
- Calendario de revalidación: revisar plantillas cada trimestre o al detectar cambios.

## 9. Seguridad Y Cumplimiento
- Almacenar los PDFs en un bucket cifrado (S3/Wasabi + SSE); restringir acceso por `companyId`.
- En entrenamiento/ML externo, anonimizar o firmar acuerdos de procesamiento de datos.
- Mantener copias de respaldo y seguimiento de quien accede a cada documento, cumpliendo las normas de proteccion de datos (Ley N. 29733) y requisitos SUNAT.

## 10. Roadmap De Implementacion
1. Documentar plantillas actuales y migrarlas a la tabla configurada.
2. Añadir pipeline de extraccion estandarizado + logging.
3. Implementar clasificador basico y fallback manual.
4. Integrar un servicio ML o modelo propio como segunda capa.
5. Añadir validaciones contables + interfaz de confirmacion.
6. Incorporar feedback loop y monitoreo.
7. Formalizar procesos de seguridad / cumplimiento y auditoris.

> **Nota**: Cada etapa debe incluir pruebas unitarias/integracion, asi como planes de despliegue controlados por tenant para evitar que un parser defectuoso afecte a todas las organizaciones.

### Estado Paso 1
- [x] Tabla InvoiceTemplate + API CRUD.
- [x] Inventario documentado en docs/invoice-template-inventory.md.
- [x] Plantillas legacy migradas a la tabla (auto-import desde storage/invoice-samples).

### Estado Paso 2
- [x] Registro de muestras y logs automatico al subir PDFs.
- [x] Servicio de extraccion basico (processSample) con texto preliminar.
- [x] Endpoint GET /invoice-samples/entry/:entryId y /:sampleId/logs para exponer metadatos.
- [x] UI de estado, revision de campos extraidos y seleccion manual de plantillas.

### Paso 3 (Clasificador + Fallback)
- [x] Clasificador Python (TF-IDF + Logistic) entrenado con scripts en backend/ml/ y documentado en docs/ml-models.md.
- [x] Detector heuristico `regexRules` + `fieldMappings` como respaldo.
- [x] Validaciones contables/SUNAT tras la extraccion y logging de inconsistencias.
- [x] Fallback manual (endpoint POST /invoice-samples/:id/template) y UI para inspeccion.
- [x] Retraining automatico con datos reales y almacenamiento de metricas por tenant.

### Paso 4 (Extraccion asistida por ML/Servicios)
- [x] Servicio `MlExtractionService` que anonimiza texto y tambien llama a un modelo open-source (Donut) cuando no hay coincidencias.
- [x] Script `backend/ml/donut_inference.py` que toma el PDF original, ejecuta Donut `naver-clova-ix/donut-base-finetuned-rvlcdip` y devuelve campos estructurados con confianza.
- [x] Logs y payloads enriquecidos con `mlProvider`, `mlConfidence` y hash del documento para trazabilidad.

### Paso 5 (Auditoria y trazabilidad de la inferencia ML)
- [x] Registrar `mlCompliance` (proveedor, region y endpoint) junto a cada resultado ML.
- [x] Mantener copias redactadas de los PDFs antes de enviarlos al ML y guardar su hash en `mlMetadata`.
- [x] `donut-placeholder` genera sugerencias cuando Donut retorna `FAILED` y el backend loguea la respuesta completa para analisis posterior.
- [x] Se habilita un log `AUDIT` con usuario, plantilla/modelo, proveedor ML y tipo de comprobante al aprobar una extraccion valida.

### Paso 6 (Validaciones contables y normativas)
- [x] Comparar montos (`subtotal + impuestos = total`) y marcar como requiere revision cuando divergen.
- [x] Verificar campos SUNAT obligatorios (RUC, serie, numero, fecha, moneda, IGV) y registrar las inconsistencias.
- [x] Guardar el PDF original, el JSON resultante y el hash/redacted path en `mlMetadata` para auditoria completa.
