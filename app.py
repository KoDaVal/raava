# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde tu frontend

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno de Render.
# Si no la encuentra (ej. al correr localmente sin la variable), usa la clave de respaldo.
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)

# Inicializa el modelo de Gemini. 'gemini-1.5-flash' es una buena opción gratuita y rápida para chat.
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    response_message = "Lo siento, hubo un error desconocido."

    if not user_message:
        return jsonify({"response": "Por favor, envía un mensaje válido."}), 400

    try:
        gemini_response = model.generate_content(user_message)
        response_message = gemini_response.text

    except Exception as e:
        print(f"Error al conectar con la API de Gemini: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

# Este bloque solo se ejecuta cuando corres `python app.py` directamente en tu máquina local.
# Cuando se despliega en Render con Gunicorn, Gunicorn se encarga de iniciar la aplicación y no usa este bloque.
if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000)) # Obtiene el puerto del entorno o usa 5000 por defecto
    app.run(debug=True, host='0.0.0.0', port=port)
