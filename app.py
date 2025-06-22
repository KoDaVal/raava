# app.py
from flask import Flask, request, jsonify, render_template # Añadir render_template
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

# --- NUEVA RUTA PARA SERVIR EL FRONTEND ---
@app.route('/') # Ruta para la raíz del sitio
def index():
    return render_template('index.html') # Renderiza tu archivo index.html
# --- FIN NUEVA RUTA ---

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

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
