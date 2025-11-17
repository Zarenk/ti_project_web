# Plan De Implementación: Ingesta Y Lectura Inteligente De Facturas PDF

Este documento resume los pasos para evolucionar el módulo de carga de comprobantes (`/dashboard/entries/new`) desde el parser puntual que ya existe hacia una solución escalable, auditable y alineada con normativas peruanas.

## 1. Normalización Inicial
- Inventario de formatos (proveedor, tipo de documento, layout) y datos obligatorios SUNAT/PLE.
- Definir políticas de retención y cifrado de PDFs; registrar quién sube cada archivo.
- Establecer una nomenclatura para versiones de plantilla/modelo y un repositorio controlado (ej. `prisma.seed` o tabla `pdf_layout_templates`).

## 2. Pipeline De Ingesta
1. **Subida**: almacenar el PDF original sin alteraciones, con metadatos (`companyId`, `orgId`, `userId`, hash SHA-256).
2. **Extracción base**: convertir a texto estructurado usando `pdfplumber` y, si detectamos imágenes/escaneos, ejecutar OCR (Tesseract/Textract). Guardar la salida en una tabla temporal para depuración.
3. **Validación técnica**: verificar que el PDF no esté vacío, tenga texto utilizable y no exceda tamaños soportados por el motor.

## 3. Motor De Plantillas Parametrizadas
- Crear una entidad tipo `InvoiceTemplate` con campos: `providerId`, `documentType`, `version`, `regex_rules`, `field_mappings`.
- El parser actual por proveedor se migra a estas plantillas; cada plantilla debe tener pruebas unitarias que aseguren que extrae subtotal, IGV, total, fechas.
- Permitir activar/desactivar plantillas por organización para no mezclar tenants.

## 4. Clasificador Del Documento
- Entrenar un modelo simple (TF‑IDF + Logistic Regression) con facturas etiquetadas (proveedor/tipo). El modelo solo decide qué plantilla aplicar.
- Versionar el modelo y almacenar métricas (precision, recall). Documentar en `docs/ml-models.md`.
- Si el clasificador tiene baja confianza (< umbral configurable), saltar a modo “pendiente”: solicitar al usuario elegir el proveedor y guardar la elección como dato supervisado.

## 5. Extracción Asistida Por ML / Servicios
- Evaluar LayoutLM, Donut o servicios como Azure Form Recognizer / Google DocAI para casos sin plantilla. Requisitos:
  - Asegurar que el servicio cumpla con protección de datos (ubicación, contratos).
  - Enviar PDFs anonimizados siempre que sea posible (enmascarar RUC, montos).
- Guardar la respuesta del servicio junto con un puntaje de confianza y permitir correcciones manuales.

## 6. Validaciones Contables Y Normativas
- Comparar los montos extraídos: `subtotal + impuestos = total`. Si hay diferencias, marcar como “requiere revisión”.
- Verificar campos obligatorios SUNAT: RUC emisor, serie, correlativo, fecha de emisión, tipo de moneda, IGV aplicado. Incluir reglas de negocio (ej. validez de RUC).
- Mantener el PDF original y el JSON resultante para auditoría; registrar quién aprobó la extracción antes de registrarse en contabilidad.

## 7. Flujo De Aprobación Y Feedback
- Mostrar al usuario los campos extraídos con indicadores de confianza.
- Si el usuario edita algún valor, guardar esa corrección como `training_data` (input + output confirmado). El pipeline debe poder exportar estos ejemplos para reentrenar.
- Emitir un log de auditoría (`AuditLog`) con: usuario, plantilla/modelo aplicado, cambios manuales, timestamps.

## 8. Monitoreo Y Mejora Continua
- Dashboard de métricas: número de facturas procesadas, tasa de aciertos por plantilla/modelo, errores recurrentes por proveedor.
- Alertas cuando:
  - un proveedor supera cierto número de fallos.
  - se detecta un cambio de layout (por ejemplo, baja repentina en confianza).
- Calendario de revalidación: revisar plantillas cada trimestre o al detectar cambios.

## 9. Seguridad Y Cumplimiento
- Almacenar los PDFs en un bucket cifrado (S3/Wasabi + SSE); restringir acceso por `companyId`.
- En entrenamiento/ML externo, anonimizar o firmar acuerdos de procesamiento de datos.
- Mantener copias de respaldo y seguimiento de quién accede a cada documento, cumpliendo las normas de protección de datos (Ley N.º 29733) y requisitos SUNAT.

## 10. Roadmap De Implementación
1. Documentar plantillas actuales y migrarlas a la tabla configurada.
2. Añadir pipeline de extracción estandarizado + logging.
3. Implementar clasificador básico y fallback manual.
4. Integrar un servicio ML o modelo propio como segunda capa.
5. Añadir validaciones contables + interfaz de confirmación.
6. Incorporar feedback loop y monitoreo.
7. Formalizar procesos de seguridad / cumplimiento y auditorías.

> **Nota**: Cada etapa debe incluir pruebas unitarias/integración, así como planes de despliegue controlados por tenant para evitar que un parser defectuoso afecte a todas las organizaciones.
