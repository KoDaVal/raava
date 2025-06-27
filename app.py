from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64 # Necesario para decodificar la imagen si se envía como base64
import json # Necesario para parsear el historial JSON

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

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/') # Ruta para la raíz del sitio
def index():
    return render_template('index.html') # Renderiza tu archivo index.html
# --- FIN RUTA DEL FRONTEND ---

@app.route('/chat', methods=['POST'])
def chat():
    # Obtener el historial de la conversación y el mensaje actual del formulario
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')

    # Convertir el historial JSON a un objeto Python
    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    # Lista de "partes" para enviar a Gemini, incluyendo el historial
    # Cada entrada en el historial ya tiene el formato esperado por la API de Gemini:
    # { 'role': 'user'/'model', 'parts': [{ 'text': '...' }] }
    parts_for_gemini = conversation_history
    
    response_message = "Lo siento, hubo un error desconocido."

    # <--- INSTRUCCIÓN PARA CONTROLAR LA LONGITUD Y EL TONO --->
    instruction = "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"
    # <--- FIN INSTRUCCIÓN DE LONGITUD Y TONO --->

    # Añadir el mensaje actual del usuario y el archivo (si existe) como la última "parte"
    current_user_parts = []
    if user_message:
        current_user_parts.append({'text': f"{instruction} {user_message}"}) # Aplicamos la instrucción al mensaje actual

    if uploaded_file:
        file_name = uploaded_file.filename
        file_type = uploaded_file.content_type

        try:
            if file_type.startswith('image/'):
                image_bytes = uploaded_file.read()
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                current_user_parts.append({
                    "inlineData": {
                        "mimeType": file_type,
                        "data": base64_image
                    }
                })
                # Añadir contexto de imagen al mensaje si no hay texto principal
                if not user_message:
                    current_user_parts.append({'text': f"{instruction} Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
                else: # Si hay mensaje de texto, solo informa que hay una imagen adjunta
                    current_user_parts.append({'text': f"Imagen adjunta: '{file_name}'."})

            elif file_type.startswith('text/'):
                text_content = uploaded_file.read().decode('utf-8')
                current_user_parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{text_content}"})
                # Añadir contexto de archivo de texto si no hay texto principal
                if not user_message:
                     current_user_parts.append({'text': f"{instruction} Adjuntaste el archivo de texto '{file_name}'. ¿Qué quieres que analice?"})
                else: # Si hay mensaje de texto, solo informa que hay un archivo adjunto
                    current_user_parts.append({'text': f"Archivo de texto adjunto: '{file_name}'."})
            else:
                current_user_parts.append({'text': f"{instruction} Se adjuntó un archivo de tipo {file_type} ('{file_name}'). Actualmente, solo puedo procesar imágenes y texto simple directamente. ¿Hay algo más en lo que pueda ayudarte?"})

        except Exception as e:
            print(f"Error al procesar el archivo adjunto: {e}")
            return jsonify({"response": "Lo siento, hubo un error al procesar el archivo adjunto."}), 500
    
    # Si no hay ninguna parte (ni mensaje ni archivo), retorna un error
    if not current_user_parts:
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido para que pueda responderte."}), 400

    # Añadir el mensaje actual del usuario (y el archivo) al final del historial
    parts_for_gemini.append({'role': 'user', 'parts': current_user_parts})


    try:
        # Envía todas las "partes" (historial + mensaje actual) al modelo de Gemini
        gemini_response = model.generate_content(parts_for_gemini)
        response_message = gemini_response.text

    except Exception as e:
        print(f"Error al conectar con la API de Gemini: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

if __name__ == '__main__':
    # Obtiene el puerto del entorno (para Render) o usa 5000 por defecto (para local)
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
