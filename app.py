# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde tu frontend

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno.
# En Render, debes configurar una variable de entorno llamada 'GEMINI_API_KEY'.
# El segundo argumento es un valor de respaldo si la variable de entorno no se encuentra (útil para pruebas locales).
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
        # Envía el mensaje del usuario al modelo de Gemini para obtener una respuesta inteligente.
        gemini_response = model.generate_content(user_message)
        response_message = gemini_response.text

    except Exception as e:
        # Registra el error en la consola del servidor (para que lo veas en los logs de Render).
        print(f"Error al conectar con la API de Gemini: {e}")
        # Envía un mensaje de error amigable al frontend del chatbot.
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

# Este bloque solo se ejecuta cuando corres `python app.py` directamente en tu máquina local.
# Cuando se despliega en Render con Gunicorn, Gunicorn se encarga de iniciar la aplicación y no usa este bloque.
if __name__ == '__main__':
    # Obtiene el puerto del entorno (Render asigna el suyo) o usa 5000 por defecto para desarrollo local.
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

