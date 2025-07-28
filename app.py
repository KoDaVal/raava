from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests
from datetime import date, datetime
from supabase import create_client

# ========== CONFIGURACIÓN SUPABASE ==========
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

# ========== PLANES Y LÍMITES ==========
PLAN_LIMITS = {
    "essence": {  # Gratis
        "tokens": 100_000,  # Entrada + salida
        "voice_tokens": 500,  # ~3–4 minutos
        "saved_raavax": 1,
        "model": "gemini",
        "fallback_model": None
    },
    "plus": {  # $18.99/mes
        "tokens": 2_000_000,
        "voice_tokens": 10500,  # ~70 minutos
        "saved_raavax": 5,
        "model": "gpt-4o-mini",
        "fallback_model": "gemini"
    },
    "legacy": {  # $39.99/mes
        "tokens": 10_000_000,
        "voice_tokens": 45000,  # ~300 minutos
        "saved_raavax": 12,
        "model": "gpt-4o-mini",
        "fallback_model": "gemini"
    }
}

# Helpers Supabase
def get_user_profile(user_id):
    res = supabase.table("profiles").select("*").eq("id", user_id).execute()
    today_str = date.today().isoformat()
    if not res.data:
        supabase.table("profiles").insert({
            "id": user_id,
            "plan": "essence",
            "tokens_used": 0,
            "voice_tokens_used": 0,
            "tokens_reset_date": today_str
        }).execute()
        return {
            "id": user_id,
            "plan": "essence",
            "tokens_used": 0,
            "voice_tokens_used": 0,
            "tokens_reset_date": today_str
        }
    profile = res.data[0]
    # Convertir fecha a string si viene como date
    if isinstance(profile.get("tokens_reset_date"), (date, datetime)):
        profile["tokens_reset_date"] = profile["tokens_reset_date"].isoformat()
    if not profile.get("plan"):
        supabase.table("profiles").update({"plan": "essence"}).eq("id", user_id).execute()
        profile["plan"] = "essence"
    return profile

def reset_monthly_usage(profile, user_id):
    if profile["tokens_reset_date"] < date.today().replace(day=1).isoformat():
        supabase.table("profiles").update({
            "tokens_used": 0,
            "voice_tokens_used": 0,
            "tokens_reset_date": date.today().isoformat()
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

# ========== FLASK ==========
app = Flask(__name__)
CORS(app)

# ========== MODELOS ==========
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise EnvironmentError("Falta la variable de entorno GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')

# (A futuro) GPT‑4o Mini
# import openai
# import tiktoken
# openai.api_key = os.getenv("OPENAI_API_KEY")
# encoder = tiktoken.encoding_for_model("gpt-4o-mini")
# def gpt4o_mini_generate(history):
#     # Implementar generación real con OpenAI
#     # return {"text": "respuesta...", "tokens_in": X, "tokens_out": Y}
#     pass

# ========== ELEVEN LABS ==========
eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY", "sk_try_only")
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"
cloned_voice_id = None

# ========== HELPERS ==========
def api_error(message, status=400):
    return jsonify({"error": message}), status

def truncate_history(history, max_messages=20):
    if len(history) <= max_messages:
        return history
    old_msgs = [msg['parts'][0].get('text', '') for msg in history[:-max_messages]]
    summary_text = f"Resumen de la conversación anterior:\n{ ' '.join(old_msgs)[:1000] }..."
    summarized_entry = {"role": "system", "parts": [{"text": summary_text}]}
    return [summarized_entry] + history[-max_messages:]

# ========== RUTAS ==========
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return api_error("Falta el ID del usuario.", 401)

        profile = get_user_profile(user_id)
        profile = reset_monthly_usage(profile, user_id)
        limits = check_plan_limits(profile)
        plan_model = limits["model"]

        history_json = request.form.get('history', '[]')
        user_message = request.form.get('message', '')
        uploaded_file = request.files.get('file')
        persistent_instruction = request.form.get('persistent_instruction', '')

        try:
            conversation_history = json.loads(history_json)
        except json.JSONDecodeError:
            return api_error("Historial en formato inválido.", 400)

        # Prompt inicial
        base_instruction = (
            "Eres Raavax, un asistente conversacional inteligente, claro y cercano. "
            "Mantén respuestas breves, útiles y al grano, como si platicaras con alguien de confianza. "
            "Adapta tu tono al contexto y evita tecnicismos innecesarios. Sé humano, adaptable y auténtico."
        )
        if persistent_instruction:
            base_instruction += f"\n\nInstrucciones adicionales del usuario:\n{persistent_instruction}"

        if not conversation_history:
            conversation_history = [{"role": "user", "parts": [{"text": base_instruction}]}]
        else:
            if conversation_history[0].get("role") == "user" and conversation_history[0].get("parts"):
                conversation_history[0]["parts"][0]["text"] = base_instruction + "\n\n" + conversation_history[0]["parts"][0]["text"]
            else:
                conversation_history.insert(0, {"role": "user", "parts": [{"text": base_instruction}]})

        # Adjuntos
        current_user_parts = []
        if user_message:
            current_user_parts.append({'text': user_message})
        if uploaded_file:
            file_name, file_type = uploaded_file.filename, uploaded_file.content_type
            try:
                if file_type.startswith('image/'):
                    image_bytes = uploaded_file.read()
                    base64_image = base64.b64encode(image_bytes).decode('utf-8')
                    current_user_parts.append({"inlineData": {"mimeType": file_type, "data": base64_image}})
                elif file_type.startswith('text/'):
                    text_content = uploaded_file.read().decode('utf-8')
                    current_user_parts.append({'text': f"Contenido del archivo '{file_name}':\n{text_content}"})
                else:
                    current_user_parts.append({'text': f"Archivo adjunto '{file_name}' de tipo {file_type}."})
            except Exception:
                return api_error("Error al procesar el archivo adjunto.", 500)

        if current_user_parts:
            conversation_history.append({'role': 'user', 'parts': current_user_parts})
        else:
            return api_error("Debes enviar un mensaje o archivo.", 400)

        # Truncar historial
        conversation_history = truncate_history(conversation_history)

        # ==== Selección de modelo ====
        use_fallback = False
        if plan_model == "gpt-4o-mini":
            # Si excede el límite, fallback a Gemini
            if profile["tokens_used"] >= limits["tokens"]:
                plan_model = limits["fallback_model"]
                use_fallback = True

        # ==== Generar respuesta ====
        tokens_in = tokens_out = 0
        if plan_model == "gemini":
            gemini_response = gemini_model.generate_content(conversation_history)
            response_message = gemini_response.text
            # Estimación: tokens entrada + salida
            tokens_in = sum(len(m['parts'][0].get('text', '')) // 4 for m in conversation_history if 'parts' in m)
            tokens_out = len(response_message) // 4
        else:
            # ==== Aquí iría GPT‑4o Mini real ====
            response_message = "Respuesta de GPT‑4o Mini (simulada, agrega tu API key)."
            tokens_in = tokens_out = 0  # Cuando actives OpenAI, usa tiktoken

        conversation_history.append({'role': 'model', 'parts': [{'text': response_message}]})

        total_tokens = tokens_in + tokens_out
        if limits["tokens"] is not None and not use_fallback:
            update_usage(user_id, tokens=total_tokens)

        return jsonify({"response": response_message, "updated_history": conversation_history})

    except Exception as e:
        print(f"Error inesperado en /chat: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return jsonify({"error": "Falta el ID del usuario."}), 401
    if not text:
        return jsonify({"error": "Texto vacío para generar audio."}), 400

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
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }

    try:
        tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
        tts_response.raise_for_status()
        audio_content = b''.join(tts_response.iter_content(chunk_size=4096))
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        voice_tokens = len(text) // 4  # Estimación (puedes ajustar si quieres precisión)
        if limits["voice_tokens"] is not None:
            update_usage(user_id, voice_tokens=voice_tokens)

        return jsonify({"audio": audio_base64})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"Error al generar el audio: {e.response.text}"}), e.response.status
    except Exception as e:
        print(f"Error inesperado en /generate_audio: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/verify_captcha', methods=['POST'])
def verify_captcha():
    token = request.form.get('token')
    secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not token or not secret:
        return jsonify({"success": False, "error": "Missing token or secret"}), 400
    response = requests.post("https://www.google.com/recaptcha/api/siteverify", data={"secret": secret, "response": token})
    return jsonify(response.json())

