from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests # Necesario para Eleven Labs
from datetime import date
from supabase import create_client

# Conexión Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Límites por plan
PLAN_LIMITS = {
    "essence": {"tokens": 30000, "voice_tokens": 500},
    "plus": {"tokens": None, "voice_tokens": None},      # Ilimitado
    "legacy": {"tokens": None, "voice_tokens": None}     # Ilimitado
}

# Helpers
def get_user_profile(user_id):
    res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    if not res.data:
        raise Exception("Usuario no encontrado.")
    profile = res.data
    if not profile.get("plan"):  # Si el plan está vacío, asignamos essence
        supabase.table("profiles").update({"plan": "essence"}).eq("id", user_id).execute()
        profile["plan"] = "essence"
    return profile

def reset_monthly_usage(profile, user_id):
    if profile["tokens_reset_date"] < date.today().replace(day=1):
        supabase.table("profiles").update({
            "tokens_used": 0,
            "voice_tokens_used": 0,
            "tokens_reset_date": date.today()
        }).eq("id", user_id).execute()
        profile["tokens_used"] = 0
        profile["voice_tokens_used"] = 0
    return profile

def check_plan_limits(profile):
    plan = profile["plan"]
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["essence"])
    if limits["tokens"] is not None and profile["tokens_used"] >= limits["tokens"]:
        raise Exception("Has alcanzado el límite de tokens de tu plan.")
    if limits["voice_tokens"] is not None and profile["voice_tokens_used"] >= limits["voice_tokens"]:
        raise Exception("Has alcanzado el límite de voz de tu plan.")
    return limits

def update_usage(user_id, tokens=0, voice_tokens=0):
    supabase.table("profiles").update({
        "tokens_used": supabase.sql("tokens_used + {}".format(tokens)),
        "voice_tokens_used": supabase.sql("voice_tokens_used + {}".format(voice_tokens))
    }).eq("id", user_id).execute()

def estimate_text_tokens(text):
    return max(1, len(text) // 4)  # Aproximación: 4 caracteres ≈ 1 token


app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise EnvironmentError("Falta la variable de entorno GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- CONFIGURACIÓN DE ELEVEN LABS ---
eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY", "sk_try_only")
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"
cloned_voice_id = None
# --- FIN CONFIGURACIÓN DE ELEVEN LABS ---

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/')
def index():
    return render_template('index.html')
# --- FIN RUTA DEL FRONTEND ---

# --- RUTA PARA CLONAR VOZ (Eleven Labs) ---
@app.route('/clone_voice', methods=['POST'])
def clone_voice():
    global cloned_voice_id

    if 'audio_file' not in request.files:
        return jsonify({'error': 'No se proporcionó archivo de audio.'}), 400

    audio_file = request.files['audio_file']
    if audio_file.filename == '':
        return jsonify({'error': 'No se seleccionó archivo de audio.'}), 400

    if not eleven_labs_api_key or eleven_labs_api_key == "sk_try_only":
        return jsonify({'error': 'Clave API de Eleven Labs no configurada o inválida.'}), 500

    url = "https://api.elevenlabs.io/v1/voices/add"
    headers = {
        "xi-api-key": eleven_labs_api_key
    }
    data = {
        "name": "Cloned Voice",
        "description": "Voice cloned from user sample"
    }
    files = {
        'files': (audio_file.filename, audio_file.read(), audio_file.content_type)
    }

    try:
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        voice_data = response.json()
        cloned_voice_id = voice_data['voice_id']
        print(f"Voz clonada ID: {cloned_voice_id}")
        return jsonify({'message': 'Voz clonada exitosamente.', 'voice_id': cloned_voice_id}), 200
    except requests.exceptions.HTTPError as e:
        print(f"Error de conexión o API con Eleven Labs al clonar voz: {e.response.status_code} - {e.response.text}")
        return jsonify({'error': f"Error al clonar la voz con Eleven Labs: {e.response.text}"}), e.response.status_code
    except Exception as e:
        print(f"Error inesperado al clonar voz: {e}")
        return jsonify({'error': f"Error inesperado al clonar la voz: {str(e)}"}), 500
# --- FIN RUTA PARA CLONAR VOZ ---
# --- NUEVA RUTA: INICIAR MENTE ---
@app.route('/start_mind', methods=['POST'])
def start_mind():
    global cloned_voice_id

    instruction = request.form.get('instruction', '')
    audio_file = request.files.get('audio_file')

    if not instruction or not audio_file:
        return jsonify({'error': 'Se requieren instrucción y archivo de voz.'}), 400

    if not eleven_labs_api_key or eleven_labs_api_key == "sk_try_only":
        return jsonify({'error': 'Clave API de Eleven Labs no configurada o inválida.'}), 500

    try:
        # Subir el archivo a ElevenLabs para clonar voz
        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {"xi-api-key": eleven_labs_api_key}
        data = {
            "name": "User Cloned Voice",
            "description": "Clonada desde muestra de usuario"
        }
        files = {
            'files': (audio_file.filename, audio_file.read(), audio_file.content_type)
        }

        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        voice_data = response.json()
        cloned_voice_id = voice_data.get('voice_id')

        return jsonify({
            'message': 'Mente iniciada correctamente.',
            'voice_id': cloned_voice_id
        }), 200
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con Eleven Labs: {e}")
        return jsonify({'error': 'Error al procesar la voz.'}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({'error': 'Error interno al iniciar la mente.'}), 500

# --- HELPER PARA ERRORES ---
def api_error(message, status=400):
    return jsonify({"error": message}), status

# --- FUNCIÓN PARA TRUNCAR HISTORIAL ---
def truncate_history(history, max_messages=20):
    """
    Mantiene solo los últimos 'max_messages' del historial.
    Si excede, resume los anteriores.
    """
    if len(history) <= max_messages:
        return history

    # Resumen rápido: concatenar los mensajes viejos en uno solo
    old_msgs = [msg['parts'][0].get('text', '') for msg in history[:-max_messages]]
    summary_text = f"Resumen de la conversación anterior:\n{ ' '.join(old_msgs)[:1000] }..."
    summarized_entry = {"role": "system", "parts": [{"text": summary_text}]}

    # Mantener el resumen + los últimos mensajes
    return [summarized_entry] + history[-max_messages:]

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # 1. Identificar usuario
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return api_error("Falta el ID del usuario.", 401)

        # 2. Validar plan y consumo
        profile = get_user_profile(user_id)
        profile = reset_monthly_usage(profile, user_id)
        limits = check_plan_limits(profile)

        # 3. Datos del request
        history_json = request.form.get('history', '[]')
        user_message = request.form.get('message', '')
        uploaded_file = request.files.get('file')
        persistent_instruction = request.form.get('persistent_instruction', '')
        try:
            conversation_history = json.loads(history_json)
        except json.JSONDecodeError:
            return api_error("Historial en formato inválido.", 400)

        # 4. Agregar el mensaje del usuario
        current_user_parts = []
        if user_message:
            current_user_parts.append({'text': user_message})
        if uploaded_file:
            file_name = uploaded_file.filename
            file_type = uploaded_file.content_type
            try:
                if file_type.startswith('image/'):
                    image_bytes = uploaded_file.read()
                    base64_image = base64.b64encode(image_bytes).decode('utf-8')
                    current_user_parts.append({
                        "inlineData": {"mimeType": file_type, "data": base64_image}
                    })
                elif file_type.startswith('text/'):
                    text_content = uploaded_file.read().decode('utf-8')
                    current_user_parts.append({'text': f"Contenido del archivo '{file_name}':\n{text_content}"})
                else:
                    current_user_parts.append({'text': f"Archivo adjunto '{file_name}' de tipo {file_type}. No se puede procesar directamente."})
            except Exception as e:
                print(f"Error al procesar archivo: {e}")
                return api_error("Error al procesar el archivo adjunto.", 500)

        if current_user_parts:
            conversation_history.append({'role': 'user', 'parts': current_user_parts})
        else:
            return api_error("Debes enviar un mensaje o archivo.", 400)

        # 5. Generar respuesta con Gemini
        gemini_response = model.generate_content(conversation_history)
        response_message = gemini_response.text
        conversation_history.append({'role': 'model', 'parts': [{'text': response_message}]})

        # 6. Calcular tokens usados
        input_tokens = sum(estimate_text_tokens(p['parts'][0].get('text', '')) for p in conversation_history if p['role'] == 'user')
        output_tokens = estimate_text_tokens(response_message)
        total_tokens = input_tokens + output_tokens

        # 7. Actualizar consumo si tiene límite
        if limits["tokens"] is not None:
            update_usage(user_id, tokens=total_tokens)

        return jsonify({"response": response_message, "updated_history": conversation_history})

    except Exception as e:
        print(f"Error inesperado en /chat: {e}")
        return api_error(str(e), 500)

# --- NUEVO ENDPOINT PARA GENERAR AUDIO BAJO DEMANDA ---
@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify({"error": "Falta el ID del usuario."}), 401
    if not text:
        return jsonify({"error": "Texto vacío para generar audio."}), 400

    # Validar plan y límites
    profile = get_user_profile(user_id)
    profile = reset_monthly_usage(profile, user_id)
    limits = check_plan_limits(profile)

    current_voice_id = cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{current_voice_id}/stream"
    tts_headers = {
        "xi-api-key": eleven_labs_api_key,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    tts_data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    try:
        tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
        tts_response.raise_for_status()
        audio_content = b''
        for chunk in tts_response.iter_content(chunk_size=4096):
            audio_content += chunk
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        # Contar tokens de voz y actualizar consumo si aplica
        voice_tokens = estimate_text_tokens(text)
        if limits["voice_tokens"] is not None:
            update_usage(user_id, voice_tokens=voice_tokens)

        return jsonify({"audio": audio_base64})
    except requests.exceptions.HTTPError as e:
        print(f"Error de conexión o API con Eleven Labs al generar audio: {e.response.status_code} - {e.response.text}")
        return jsonify({"error": f"Error al generar el audio: {e.response.text}"}), e.response.status
import requests
import os

@app.route('/verify_captcha', methods=['POST'])
def verify_captcha():
    token = request.form.get('token')
    secret = os.getenv("RECAPTCHA_SECRET_KEY")  # Guarda tu clave secreta en Render
    if not token or not secret:
        return jsonify({"success": False, "error": "Missing token or secret"}), 400

    response = requests.post(
        "https://www.google.com/recaptcha/api/siteverify",
        data={"secret": secret, "response": token}
    )
    result = response.json()
    return jsonify(result)
