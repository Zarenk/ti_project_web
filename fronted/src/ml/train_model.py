import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
import joblib

# Datos de entrenamiento
data = pd.DataFrame([
    {"input": "MEM RAM 16G KF BEAST 5.20G DR5 291.00", "quantity": 2, "value": 91.00},
    {"input": "NB LEN 15 I5-13 16 512 FREE 2846.00", "quantity": 2, "value": 846.00},
    {"input": "PROC INT CORE I7-12700 2.10GHZ 1270.00", "quantity": 1, "value": 270.00},
    {"input": "NB LEN 15 I5-12 16 512 FREE 2774.00", "quantity": 2, "value": 774.00},
    {"input": "NB LEN 15 I7-13 16 512 FREE 1569.00", "quantity": 1, "value": 569},
    {"input": "NB LEN V15 R5-7520U/16/512/FRE 31,068", "quantity": 3, "value": 1068.00},{"input": "NB LEN V15 R5-7520U/16/512/FRE 31,068", "quantity": 3, "value": 1068.00},
    {"input": "PROC INT CORE I7-12700F 2.10GZ 1240.00", "quantity": 1, "value": 240.00},
    {"input": "PROC INT CORE I7-12700 2.10GHZ 1270.00", "quantity": 1, "value": 270.00},
    {"input": "MEM 16G TF VULCAN Z 3.20GHZ 499.60", "quantity": 4, "value": 99.60},
    {"input": "MB MS PRO B760M-E S/V/L DDR4 173.85", "quantity": 1, "value": 73.85},
    {"input": "PSU MS MPG A850G PCIE5 1104.50", "quantity": 1, "value": 104.50},
    {"input": "COOLER PARA NB TE-7020N 842.60", "quantity": 8, "value": 42.60},
    {"input": "NBG LOQ 15 I5-12 8 512 V6G FRE 1620.00", "quantity": 1, "value": 620.00},
])

# Dividir en características (X) y etiquetas (y)
X = data["input"]
y_quantity = data["quantity"]
y_value = data["value"]

# Dividir en conjuntos de entrenamiento y prueba
X_train, X_test, y_quantity_train, y_quantity_test = train_test_split(X, y_quantity, test_size=0.2, random_state=42)
_, _, y_value_train, y_value_test = train_test_split(X, y_value, test_size=0.2, random_state=42)

# Crear un pipeline para preprocesar texto y entrenar un modelo
from sklearn.pipeline import Pipeline

pipeline_quantity = Pipeline([
    ("vectorizer", TfidfVectorizer()),  # Convertir texto en vectores
    ("model", RandomForestRegressor())  # Modelo de regresión
])

pipeline_value = Pipeline([
    ("vectorizer", TfidfVectorizer()),
    ("model", RandomForestRegressor())
])

# Entrenar los modelos
pipeline_quantity.fit(X_train, y_quantity_train)
pipeline_value.fit(X_train, y_value_train)

# Guardar los modelos entrenados
joblib.dump(pipeline_quantity, "quantity_model.pkl")
joblib.dump(pipeline_value, "value_model.pkl")

print("Modelos entrenados y guardados correctamente.")