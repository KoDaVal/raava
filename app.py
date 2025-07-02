from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests # ¡NUEVO! Necesario para las solicitudes HTTP a Eleven Labs

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- CONFIGURACIÓN DE ELEVEN LABS (¡NUEVO BLOQUE!) ---
# ¡IMPORTANTE! Reemplaza "TU_API_KEY_DE_ELEVEN_LABS" con tu clave real de Eleven Labs.
eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY", "sk_14db6d8f72f6b97fd8d6bd0b03c3fb8ba2325db35d317513")
# Voz predeterminada de Eleven Labs. Puedes elegir una voz. Ejemplo: 'Rachel' (ID: 21m00Tcm4TlvDq8ikWAM)
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM" # Puedes cambiar este ID si lo deseas

# ¡NUEVO! Variable global para almacenar el ID de la voz clonada temporalmente.
# Esto es temporal; se perderá si el servidor de Flask se reinicia.
cloned_voice_id = None
# --- FIN CONFIGURACIÓN DE ELEVEN LABS ---

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/')
def index():
    return render_template('index.html')
# --- FIN RUTA DEL FRONTEND ---

# ¡NUEVO ENDPOINT! Para subir el archivo de voz y clonarlo.
@app.route('/upload_voice_sample', methods=['POST'])
def upload_voice_sample():
    global cloned_voice_id # Indicar que modificaremos la variable global

    # Verificar si la API Key de Eleven Labs está configurada
    if not eleven_labs_api_key or eleven_labs_api_key == "TU_API_KEY_DE_ELEVEN_LABS":
        return jsonify({"success": False, "message": "API Key de Eleven Labs no configurada o es el valor por defecto."}), 400

    # Verificar si se recibió un archivo de voz
    if 'voice_file' not in request.files:
        return jsonify({"success": False, "message": "No se encontró el archivo de voz en la solicitud."}), 400
    
    voice_file = request.files['voice_file']
    if voice_file.filename == '':
        return jsonify({"success": False, "message": "No se seleccionó ningún archivo de voz."}), 400
    
    # URL de la API de Eleven Labs para añadir voces
    eleven_labs_add_voice_url = "https://api.elevenlabs.io/v1/voices/add"
    headers = {
        "xi-api-key": eleven_labs_api_key,
    }
    
    # Preparar los datos para la solicitud (el nombre de la voz y el archivo)
    data = {
        'name': 'Temporary Cloned Voice' # Nombre temporal para la voz clonada
    }
    files = {
        'files': (voice_file.filename, voice_file.read(), voice_file.content_type)
    }

    try:
        # Realizar la solicitud POST a la API de Eleven Labs
        response = requests.post(eleven_labs_add_voice_url, headers=headers, data=data, files=files)
        response.raise_for_status() # Lanza una excepción para errores HTTP (4xx o 5xx)
        
        eleven_labs_data = response.json()
        new_voice_id = eleven_labs_data.get('voice_id')

        if new_voice_id:
            cloned_voice_id = new_voice_id # ¡Guardar el ID de la voz clonada temporalmente!
            print(f"Voz clonada exitosamente. ID temporal: {cloned_voice_id}")
            return jsonify({
                "success": True,
                "message": f"Voz clonada temporalmente con éxito. ID: {new_voice_id}",
                "voice_id": new_voice_id
            })
        else:
            return jsonify({"success": False, "message": "No se pudo obtener el ID de la voz de Eleven Labs.", "details": eleven_labs_data}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error de conexión o API con Eleven Labs al clonar voz: {e}")
        return jsonify({"success": False, "message": f"Error de conexión o API con Eleven Labs: {e}"}), 500
    except Exception as e:
        print(f"Error inesperado al procesar la clonación de voz: {e}")
        return jsonify({"success": False, "message": f"Error interno del servidor: {e}"}), 500


@app.route('/chat', methods=['POST'])
def chat():
    # Obtener los datos del formulario (historial, mensaje, archivo adjunto, instrucción persistente)
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')
    persistent_instruction = request.form.get('persistent_instruction', '')
    
    response_message = "Lo siento, hubo un error desconocido."
    audio_base64 = None # Inicializar la variable para el audio codificado en Base64

    # Cargar el historial de conversación desde JSON
    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_gemini = conversation_history
    
    # Combinar la instrucción básica, la instrucción persistente y el mensaje del usuario
    base_instruction = "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"
    full_user_message_text = f"{base_instruction} {user_message}"
    if persistent_instruction:
        full_user_message_text = f"{persistent_instruction}\n\n{full_user_message_text}"

    # Preparar las partes del mensaje actual del usuario (texto y/o archivo)
    current_user_parts = []
    if full_user_message_text:
        current_user_parts.append({'text': full_user_message_text})

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
                if not user_message:
                    current_user_parts.append({'text': f"Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
                else:
                    current_user_parts.append({'text': f"Imagen adjunta: '{file_name}'."})

            elif file_type.startswith('text/'):
                text_content = uploaded_file.read().decode('utf-8')
                current_user_parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{text_content}"})
                if not user_message:
                     current_user_parts.append({'text': f"Adjuntaste el archivo de texto '{file_name}'. ¿Qué quieres que analice?"})
                else:
                    current_user_parts.append({'text': f"Archivo de texto adjunto: '{file_name}'."})
            else:
                current_user_parts.append({'text': f"Se adjuntó un archivo de tipo {file_type} ('{file_name}'). Actualmente, solo puedo procesar imágenes y texto simple directamente. ¿Hay algo más en lo que pueda ayudarte?"})

        except Exception as e:
            print(f"Error al procesar el archivo adjunto: {e}")
            return jsonify({"response": "Lo siento, hubo un error al procesar el archivo adjunto."}), 500
    
    if not current_user_parts:
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido para que pueda responderte."}), 400

    parts_for_gemini.append({'role': 'user', 'parts': current_user_parts})

    try:
        # Enviar la conversación al modelo de Gemini
        gemini_response = model.generate_content(parts_for_gemini)
        response_message = gemini_response.text

        # --- Lógica para usar voz clonada o predeterminada (¡CAMBIO CLAVE!) ---
        # Solo intenta generar voz si la API Key de Eleven Labs está configurada
        if eleven_labs_api_key and eleven_labs_api_key != "TU_API_KEY_DE_ELEVEN_LABS":
            # Si hay un cloned_voice_id activo, lo usa; de lo contrario, usa el ID de voz predeterminado
            current_voice_id = cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
            
            eleven_labs_url = f"https://api.elevenlabs.io/v1/text-to-speech/{current_voice_id}"
            headers = {
                "Accept": "audio/mpeg", # Especifica que esperamos un archivo de audio MPEG
                "xi-api-key": eleven_labs_api_key,
                "Content-Type": "application/json"
            }
            data = {
                "text": response_message,
                "model_id": "eleven_multilingual_v2", # Modelo para voz multilenguaje
                "voice_settings": {
                    "stability": 0.5, # Qué tan consistente es el estilo del habla (0-1)
                    "similarity_boost": 0.75 # Qué tan similar es la voz original (0-1)
                }
            }

            eleven_labs_response = requests.post(eleven_labs_url, headers=headers, json=data)

            if eleven_labs_response.status_code == 200:
                audio_content = eleven_labs_response.content
                audio_base64 = base64.b64encode(audio_content).decode('utf-8')
            else:
                print(f"Error al generar voz con Eleven Labs (Código: {eleven_labs_response.status_code}): {eleven_labs_response.text}")
        # --- FIN Lógica de voz ---

    except Exception as e:
        print(f"Error al conectar con la API de Gemini o al generar voz: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA o al generar la voz. Por favor, intenta de nuevo."

    # Devolver la respuesta de texto y el audio en Base64 (si se generó)
    return jsonify({"response": response_message, "audio": audio_base64})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
