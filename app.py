# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde tu frontend

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno de Render.
# El segundo argumento es un valor de respaldo si la variable de entorno no se encuentra (útil para pruebas locales).
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)

# Inicializa el modelo de Gemini. 'gemini-1.5-flash' es una buena opción gratuita y rápida para chat.
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- RUTA PARA SERVIR EL FRONTEND ---
# Esta ruta servirá el archivo index.html cuando alguien acceda a la URL principal de tu servicio en Render.
@app.route('/')
def index():
    return render_template('index.html')
# --- FIN RUTA DEL FRONTEND ---

# --- RUTA DEL CHAT (AHORA CON SOPORTE PARA ARCHIVOS) ---
@app.route('/chat', methods=['POST'])
def chat():
    user_data = request.json # Recibe todos los datos JSON del frontend
    user_message = user_data.get('message', '') # Mensaje de texto del usuario
    file_content = user_data.get('fileContent') # Contenido del archivo en base64 (para imágenes) o texto
    file_type = user_data.get('fileType')       # Tipo MIME del archivo (ej. 'image/png', 'text/plain')
    file_name = user_data.get('fileName', 'archivo_adjunto') # Nombre del archivo para contexto

    parts = [] # Lista de "partes" para enviar a Gemini (texto, imágenes, etc.)
    response_message = "Lo siento, hubo un error desconocido."

    # Si hay un mensaje de texto, lo añade como una parte
    if user_message:
        parts.append({'text': user_message})

    # Si se adjuntó un archivo, lo procesa y añade como una parte
    if file_content and file_type:
        try:
            if file_type.startswith('image/'):
                # Para imágenes, se envían como inlineData (base64)
                parts.append({
                    "inlineData": {
                        "mimeType": file_type,
                        "data": file_content # El contenido ya viene base64 sin prefijo
                    }
                })
                # Añade un texto descriptivo para que el modelo sepa que hay una imagen
                if not user_message: # Si no hay mensaje de texto, da una pista
                    parts.append({'text': f"Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
            elif file_type.startswith('text/'):
                # Para archivos de texto simple, se añade su contenido como texto
                parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{file_content}"})
                # También un mensaje inicial si no hay texto del usuario
                if not user_message:
                     parts.append({'text': f"Adjuntaste el archivo de texto '{file_name}'. ¿Qué quieres que analice?"})
            else:
                # Para otros tipos de archivo no soportados directamente por este ejemplo
                parts.append({'text': f"Se adjuntó un archivo de tipo {file_type} ('{file_name}'). Actualmente, solo puedo procesar imágenes y texto simple directamente. ¿Hay algo más en lo que pueda ayudarte?"})

        except Exception as e:
            print(f"Error al procesar el archivo adjunto: {e}")
            return jsonify({"response": "Lo siento, hubo un error al procesar el archivo adjunto."}), 500

    # Si no hay mensaje ni archivo, retorna un error
    if not parts:
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido para que pueda responderte."}), 400

    try:
        # Envía todas las "partes" (texto, imagen, etc.) al modelo de Gemini
        gemini_response = model.generate_content(parts)
        response_message = gemini_response.text

    except Exception as e:
        print(f"Error al conectar con la API de Gemini: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

# Este bloque solo se ejecuta cuando corres `python app.py` directamente en tu máquina local.
# Cuando se despliega en Render con Gunicorn, Gunicorn se encarga de iniciar la aplicación y no usa este bloque.
if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)