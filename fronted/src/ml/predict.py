import sys
import joblib

# Cargar los modelos entrenados
try:
    quantity_model = joblib.load("quantity_model.pkl")
    value_model = joblib.load("value_model.pkl")
except FileNotFoundError as e:
    print(f"Error: {e}")
    sys.exit(1)

# Obtener el texto de entrada
if len(sys.argv) < 2:
    print("Error: No se proporcionó texto de entrada.")
    sys.exit(1)

input_text = sys.argv[1]

# Realizar predicciones
try:
    predicted_quantity = quantity_model.predict([input_text])[0]
    predicted_value = value_model.predict([input_text])[0]
    print(int(predicted_quantity))
    print(float(predicted_value))
except Exception as e:
    print(f"Error al realizar predicciones: {e}")
    sys.exit(1)