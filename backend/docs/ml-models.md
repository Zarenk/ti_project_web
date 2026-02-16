# Modelos De Clasificación De Plantillas

## Clasificador Python v1.0
- **Tipo:** `TfidfVectorizer` + `LogisticRegression` (scikit-learn).
- **Dataset base:** `backend/ml/template-training-data.json` (lista de `{ templateId, text, organizationId?, companyId?, source, createdAt }`).
- **Artefactos generados:**
  - Modelo: `backend/ml/template_classifier.joblib`
  - Métricas: `backend/ml/template_classifier_metrics.json`
    - Incluye `per_tenant_accuracy` (precision por organizacion/compañia) y `dataset_distribution` (volumen de datos por tenant).

### Dependencias
```bash
pip install scikit-learn joblib
pip install torch transformers pdf2image pillow
```
> Instala `poppler-utils` (Linux/mac) o `poppler` (Windows) para que `pdf2image` convierta PDFs.

### Entrenamiento
```bash
python backend/ml/train_template_classifier.py \
  --dataset backend/ml/template-training-data.json \
  --output backend/ml/template_classifier.joblib \
  --metrics backend/ml/template_classifier_metrics.json
```

### Predicción
El backend ejecuta `backend/ml/predict_template.py` para obtener la plantilla más probable. Uso manual:
```bash
python backend/ml/predict_template.py \
  --model backend/ml/template_classifier.joblib \
  --text "Factura electrónica serie F001..." \
  --candidate 1 --candidate 2
```
Salida:
```json
{"templateId":1,"score":0.78}
```

### Actualización del dataset
1. Añade ejemplos reales a `backend/ml/template-training-data.json`.
2. Vuelve a ejecutar `train_template_classifier.py`.
3. Reinicia el backend para que use el nuevo modelo.

Registra cada retraining (fecha, precisión, dataset) aquí.


### Reentrenamiento automático controlado
- `TemplateTrainingService` agrega automáticamente cada muestra confirmada (detección automática o asignación manual) al dataset.
- El backend sólo dispara `train_template_classifier.py` cuando se acumulan al menos `TEMPLATE_TRAIN_MIN_SAMPLES` ejemplos nuevos **y** han pasado `TEMPLATE_TRAIN_INTERVAL_MS` milisegundos desde el último entrenamiento.
- Ambos parámetros se pueden ajustar por variables de entorno (por defecto: 20 muestras y 30 minutos) y el estado persiste en `backend/ml/template-training-meta.json`.
- Ajusta `PYTHON_BIN` si necesitas un binario distinto (virtualenv, Conda, etc.).
- Cada ejecución del script deja `template_classifier_metrics.json` con accuracy global y `per_tenant_accuracy`, lo que permite auditar el desempeño por tenant.


### Extracción asistida por ML
- Cuando no existe coincidencia de plantilla, `MlExtractionService` anonimiza el texto (enmascara RUC y números largos) y trata de ejecutar `backend/ml/donut_inference.py` sobre el PDF original (`DONUT_EXTRACTION_SCRIPT`).
- Si no tienes Donut disponible, la capa cae al heurístico (`ML_EXTRACTION_SCRIPT`, `ML_EXTRACTION_BIN`).
- Ejemplo de uso del script Donut:
  ```bash
  python backend/ml/donut_inference.py --input storage/invoices/sample.pdf
  ```
- Dependencias necesarias: `torch`, `transformers`, `pdf2image`, `pillow` (y `poppler` en el sistema) para poder convertir PDFs a imágenes y ejecutar el modelo.
- La salida JSON incluye `fields`, `confidence`, `modelVersion` y se registra con `mlProvider=donut-open-source`; puedes extender el script para añadir `mlDebug`.
- El endpoint `POST /invoice-templates/suggest-pdf` acepta un PDF, lo corre por Donut y devuelve `regexRules`/`fieldMappings` sugeridos y el `mlConfidence` calculado; útil para poblar el modal sin pegar texto manual.
- Para pruebas sin Donut instalado puedes seguir usando `backend/ml/mock_ml_service.py` (el mock HTTP que envía el payload al heurístico), exportar `ML_EXTRACTION_ENDPOINT` y seguir desarrollando la UI.

### Integración en el backend
- El servicio Node ejecuta \\predict_template.py\\ usando la variable \\PYTHON_BIN\\ (por defecto \\python\\).
- La ruta del modelo se puede sobreescribir con \\TEMPLATE_CLASSIFIER_MODEL\\ (valor por defecto: \\backend/ml/template_classifier.joblib\\).
- Si el modelo o el script no existen, el sistema vuelve automáticamente al motor heurístico + asignación manual.





