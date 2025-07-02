
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- CONFIGURACIÓN DE ELEVEN LABS ---
eleven_labs_api_key = "sk_14db6d8f72f6b97fd8d6bd0b03c3fb8ba2325db35d317513"
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"
cloned_voice_id = None
# --- FIN CONFIGURACIÓN DE ELEVEN LABS ---

@app.route('/')
def index():
    return "API funcionando"

# --- RUTA PARA CLONAR VOZ ---
@app.route('/clone_voice', methods=['POST'])
def clone_voice():
    global cloned_voice_id

    if 'audio_file' not in request.files:
        return jsonify({'error': 'No se proporcionó archivo de audio.'}), 400

    audio_file = request.files['audio_file']
    if audio_file.filename == '':
        return jsonify({'error': 'No se seleccionó archivo de audio.'}), 400

    if not eleven_labs_api_key:
        return jsonify({'error': 'Clave API de Eleven Labs no configurada.'}), 500

    url = "https://api.elevenlabs.io/v1/voices/clone"
    headers = {
        "xi-api-key": eleven_labs_api_key
    }

    data = {
        "name": "Cloned Voice",
        "description": "Voice cloned from user sample",
        "labels": json.dumps({"use_case": "test"})
    }

    files = {
        'files': (audio_file.filename, audio_file.read(), audio_file.content_type)
    }

    try:
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        voice_data = response.json()
        cloned_voice_id = voice_data['voice_id']
        print(f"✅ Voz clonada ID: {cloned_voice_id}")
        return jsonify({'message': 'Voz clonada exitosamente.', 'voice_id': cloned_voice_id}), 200

    except requests.exceptions.HTTPError as e:
        print("❌ Error HTTP:", e.response.status_code)
        print("📨 Detalles:", e.response.text)
        return jsonify({'error': f"Error al clonar la voz con Eleven Labs: {e.response.text}"}), e.response.status_code

    except Exception as e:
        print("❌ Error inesperado:", str(e))
        return jsonify({'error': f"Error inesperado al clonar la voz: {str(e)}"}), 500

# --- RUTA PARA CHAT ---
@app.route('/chat', methods=['POST'])
def chat():
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    persistent_instruction = request.form.get('persistent_instruction', '')
    uploaded_file = request.files.get('file')

    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_gemini = conversation_history
    response_message = "Lo siento, hubo un error desconocido."
    audio_base64 = None

    base_instruction = "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"
    full_user_message_text = f"{base_instruction} {user_message}"
    if persistent_instruction:
        full_user_message_text = f"{persistent_instruction}\n\n{full_user_message_text}"

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
                current_user_parts.append({'text': f"Imagen adjunta: '{file_name}'."})
            elif file_type.startswith('text/'):
                text_content = uploaded_file.read().decode('utf-8')
                current_user_parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{text_content}"})
            else:
                current_user_parts.append({'text': f"Se adjuntó un archivo de tipo {file_type} ('{file_name}')."})
        except Exception as e:
            print(f"Error al procesar el archivo adjunto: {e}")
            return jsonify({"response": "Error al procesar el archivo adjunto."}), 500

    if not current_user_parts:
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido."}), 400

    parts_for_gemini.append({'role': 'user', 'parts': current_user_parts})

    try:
        gemini_response = model.generate_content(parts_for_gemini)
        response_message = gemini_response.text

        if eleven_labs_api_key:
            current_voice_id = cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
            tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{current_voice_id}/stream"
            tts_headers = {
                "xi-api-key": eleven_labs_api_key,
                "Content-Type": "application/json",
                "accept": "audio/mpeg"
            }
            tts_data = {
                "text": response_message,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            }

            tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
            tts_response.raise_for_status()
            audio_content = b''.join(tts_response.iter_content(chunk_size=4096))
            audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        return jsonify({"response": response_message, "audio": audio_base64})

    except requests.exceptions.HTTPError as e:
        print(f"Error HTTP con Eleven Labs: {e.response.status_code} - {e.response.text}")
        return jsonify({"response": f"Error al generar audio: {e.response.text}", "audio": None})
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"response": "Error al procesar la solicitud.", "audio": None})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
