from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests
import stripe
from supabase import create_client
from uuid import UUID

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN STRIPE + SUPABASE ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("WARNING: SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados. Las operaciones de BD fallarán.")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY) if SUPABASE_URL and SUPABASE_SERVICE_KEY else None

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY", "")
if not gemini_api_key:
    print("WARNING: GEMINI_API_KEY no configurado. El modelo no funcionará.")
gemini_model = None
if gemini_api_key:
    try:
        genai.configure(api_key=gemini_api_key)
        gemini_model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"ERROR al inicializar Gemini: {e}")

# --- CONFIGURACIÓN DE ELEVEN LABS ---
eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY", "sk_try_only")
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"
cloned_voice_id = None

# --- FUNCIONES AUXILIARES ---
def is_valid_uuid(value):
    try:
        UUID(str(value))
        return True
    except Exception:
        return False

def get_user_plan(user_id):
    if not supabase or not user_id or not is_valid_uuid(user_id):
        print("Error: user_id inválido o Supabase no inicializado")
        return {"plan": "essence", "tts_limit": 500, "tts_used": 0, "model": "gemini"}
    try:
        profile = supabase.table("profiles").select("plan, tts_used").eq("id", user_id).execute()
        if not profile.data or len(profile.data) == 0:
            supabase.table("profiles").upsert({"id": user_id, "plan": "essence", "tts_used": 0}).execute()
            return {"plan": "essence", "tts_limit": 500, "tts_used": 0, "model": "gemini"}
        plan = profile.data[0].get("plan", "essence")
        used = profile.data[0].get("tts_used", 0)
    except Exception as e:
        print(f"Error al obtener plan: {e}")
        plan, used = "essence", 0

    limits = {"essence": 500, "plus": 6000, "legacy": 999999}
    model = "gpt" if plan in ["plus", "legacy"] else "gemini"
    return {"plan": plan, "tts_limit": limits.get(plan, 500), "tts_used": used, "model": model}

def add_tts_usage(user_id, tokens):
    if not supabase or not user_id or not is_valid_uuid(user_id):
        print("Error: user_id inválido en add_tts_usage")
        return
    try:
        profile = supabase.table("profiles").select("tts_used").eq("id", user_id).execute()
        if not profile.data or len(profile.data) == 0:
            supabase.table("profiles").upsert({"id": user_id, "tts_used": tokens}).execute()
        else:
            current = profile.data[0].get("tts_used", 0)
            supabase.table("profiles").update({"tts_used": current + tokens}).eq("id", user_id).execute()
    except Exception as e:
        print(f"Error al actualizar tokens: {e}")

# --- RUTAS ---
@app.route('/')
def index():
    return render_template('index.html')

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
    headers = {"xi-api-key": eleven_labs_api_key}
    data = {"name": "Cloned Voice", "description": "Voice cloned from user sample"}
    files = {'files': (audio_file.filename, audio_file.read(), audio_file.content_type)}
    try:
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        cloned_voice_id = response.json()['voice_id']
        return jsonify({'message': 'Voz clonada exitosamente.', 'voice_id': cloned_voice_id}), 200
    except Exception as e:
        return jsonify({'error': f"Error al clonar voz: {str(e)}"}), 500

@app.route('/chat', methods=['POST'])
def chat():
    if not gemini_model:
        return jsonify({"response": "Error: GEMINI_API_KEY no configurado."}), 500
    user_id = request.form.get('user_id')
    if not user_id or not is_valid_uuid(user_id):
        return jsonify({"error": "Usuario no autenticado"}), 401
    plan_info = get_user_plan(user_id)
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    persistent_instruction = request.form.get('persistent_instruction', '')
    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400
    full_user_message_text = f"{persistent_instruction}\n\n{user_message}".strip()
    if full_user_message_text:
        conversation_history.append({'role': 'user', 'parts': [{'text': full_user_message_text}]})
    try:
        gemini_response = gemini_model.generate_content(conversation_history)
        response_message = gemini_response.text
        return jsonify({"response": response_message, "audio": None})
    except Exception as e:
        return jsonify({"response": f"Error: {str(e)}", "audio": None})

@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    user_id = request.form.get('user_id')
    if not text or not user_id or not is_valid_uuid(user_id):
        return jsonify({"error": "Texto o usuario no válidos."}), 400
    plan_info = get_user_plan(user_id)
    if plan_info["tts_used"] >= plan_info["tts_limit"]:
        return jsonify({"error": "Se agotaron tus tokens de voz para este plan"}), 403
    current_voice_id = cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{current_voice_id}/stream"
    tts_headers = {"xi-api-key": eleven_labs_api_key, "Content-Type": "application/json", "accept": "audio/mpeg"}
    tts_data = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
    try:
        tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
        tts_response.raise_for_status()
        audio_content = b''.join(chunk for chunk in tts_response.iter_content(chunk_size=4096))
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        add_tts_usage(user_id, 1)
        return jsonify({"audio": audio_base64})
    except Exception as e:
        return jsonify({"error": f"Error al generar el audio: {str(e)}"}), 500

@app.route('/save_chat', methods=['POST'])
def save_chat():
    if not supabase:
        return jsonify({"error": "Supabase no inicializado"}), 500
    user_id = request.form.get('user_id')
    chat_data = request.form.get('chat_data')
    if not user_id or not is_valid_uuid(user_id):
        return jsonify({"error": "Usuario no autenticado"}), 401
    if not chat_data:
        return jsonify({"error": "Faltan parámetros"}), 400
    plan_info = get_user_plan(user_id)
    max_chats = 1 if plan_info["plan"] == "essence" else 5 if plan_info["plan"] == "plus" else 12
    try:
        current = supabase.table("saved_chats").select("id").eq("user_id", user_id).execute()
        if current.data and len(current.data) >= max_chats:
            return jsonify({"error": f"Límite alcanzado ({max_chats} chats). Borra uno para guardar otro."}), 403
        supabase.table("saved_chats").insert({"user_id": user_id, "chat_data": chat_data}).execute()
        return jsonify({"message": "Chat guardado"}), 200
    except Exception as e:
        print("Error guardando chat:", e)
        return jsonify({"error": "No se pudo guardar el chat"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))


# === LISTAR CHATS ===
@app.route('/get_chats', methods=['GET'])
def get_chats():
    user_id = request.args.get('user_id')
    if not user_id or not is_valid_uuid(user_id):
        return jsonify([]), 400
    try:
        chats = supabase.table("saved_chats")\
            .select("id, created_at, chat_data")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return jsonify(chats.data), 200
    except Exception as e:
        print("Error obteniendo chats:", e)
        return jsonify([]), 500

# === BORRAR CHAT ===
@app.route('/delete_chat', methods=['POST'])
def delete_chat():
    chat_id = request.form.get('chat_id')
    if not chat_id:
        return jsonify({"error": "Falta el chat_id"}), 400
    try:
        supabase.table("saved_chats").delete().eq("id", chat_id).execute()
        return jsonify({"message": "Chat eliminado"}), 200
    except Exception as e:
        print("Error borrando chat:", e)
        return jsonify({"error": "No se pudo borrar el chat"}), 500
