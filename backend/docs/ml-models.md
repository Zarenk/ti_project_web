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
```

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
- Cuando no existe coincidencia de plantilla, `MlExtractionService` anonimiza el texto (enmascara RUC y números largos) y delega la extracción a:
  1. Un endpoint externo (`ML_EXTRACTION_ENDPOINT` + `ML_EXTRACTION_API_KEY`), o
  2. El script local `backend/ml/extract_invoice_fields.py` (configurable con `ML_EXTRACTION_SCRIPT`).
- El script lee un payload JSON desde `stdin` y devuelve campos clave con un puntaje de confianza. Ejemplo:
  ```bash
  cat sample-text.json | python backend/ml/extract_invoice_fields.py
  ```
- Variables extra:
  - `ML_EXTRACTION_SANITIZE` (`true` por defecto) controla si se anonimizan los textos antes de invocar la capa ML.
  - `ML_EXTRACTION_BIN` permite usar un intérprete de Python distinto.
- Los resultados guardan `mlProvider`, `mlConfidence`, `mlModelVersion` y un hash del texto original para auditabilidad.
- Para pruebas rápidas sin depender de servicios externos puedes ejecutar un servidor local:
  ```bash
  python backend/ml/mock_ml_service.py --port 5055
  export ML_EXTRACTION_ENDPOINT=http://127.0.0.1:5055/extract
  ```
  Este servicio reutiliza la lógica heurística y responde en JSON como lo haría un proveedor real.

### Integración en el backend
- El servicio Node ejecuta \\predict_template.py\\ usando la variable \\PYTHON_BIN\\ (por defecto \\python\\).
- La ruta del modelo se puede sobreescribir con \\TEMPLATE_CLASSIFIER_MODEL\\ (valor por defecto: \\backend/ml/template_classifier.joblib\\).
- Si el modelo o el script no existen, el sistema vuelve automáticamente al motor heurístico + asignación manual.





