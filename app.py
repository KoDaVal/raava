from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests  # Para Eleven Labs
import stripe
from supabase import create_client
from uuid import UUID

# --- CONFIGURACIÓN STRIPE + SUPABASE ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    raise EnvironmentError("Falta la variable de entorno GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)
gemini_model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- CONFIGURACIÓN DE ELEVEN LABS ---
eleven_labs_api_key = os.getenv("ELEVEN_LABS_API_KEY", "sk_try_only")
default_eleven_labs_voice_id = "21m00Tcm4TlvDq8ikWAM"  # Voz por defecto
cloned_voice_id = None
# --- FIN CONFIGURACIÓN DE ELEVEN LABS ---


# --- FUNCIONES AUXILIARES ---
def is_valid_uuid(value):
    try:
        UUID(str(value))
        return True
    except Exception:
        return False


# --- FUNCIÓN PARA OBTENER PLAN Y TOKENS ---
def get_user_plan(user_id):
    if not user_id or not is_valid_uuid(user_id):
        print("Error: user_id inválido")
        return {"plan": "essence", "tts_limit": 500, "tts_used": 0, "model": "gemini"}
    try:
        profile = supabase.table("profiles").select("plan, tts_used").eq("id", user_id).execute()
        if not profile.data or len(profile.data) == 0:
            return {"plan": "essence", "tts_limit": 500, "tts_used": 0, "model": "gemini"}
        plan = profile.data[0].get("plan", "essence")
        used = profile.data[0].get("tts_used", 0)
    except Exception as e:
        print(f"Error al obtener plan: {e}")
        plan, used = "essence", 0

    if plan == "essence":
        return {"plan": plan, "tts_limit": 500, "tts_used": used, "model": "gemini"}
    elif plan == "plus":
        return {"plan": plan, "tts_limit": 6000, "tts_used": used, "model": "gpt"}
    elif plan == "legacy":
        return {"plan": plan, "tts_limit": 999999, "tts_used": used, "model": "gpt"}
    return {"plan": "essence", "tts_limit": 500, "tts_used": used, "model": "gemini"}


# --- FUNCIÓN PARA DESCONTAR TOKENS ---
def add_tts_usage(user_id, tokens):
    if not user_id or not is_valid_uuid(user_id):
        print("Error: user_id inválido en add_tts_usage")
        return
    try:
        profile = supabase.table("profiles").select("tts_used").eq("id", user_id).execute()
        if not profile.data or len(profile.data) == 0:
            # Si no existe el perfil, créalo
            supabase.table("profiles").insert({"id": user_id, "tts_used": tokens}).execute()
        else:
            current = profile.data[0].get("tts_used", 0)
            supabase.table("profiles").update({"tts_used": current + tokens}).eq("id", user_id).execute()
    except Exception as e:
        print(f"Error al actualizar tokens: {e}")


# --- RUTA PARA SERVIR FRONTEND ---
@app.route('/')
def index():
    return render_template('index.html')


# --- RUTA PARA CLONAR VOZ ---
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


# --- RUTA: INICIAR MENTE ---
@app.route('/start_mind', methods=['POST'])
def start_mind():
    global cloned_voice_id
    instruction = request.form.get('instruction', '')
    audio_file = request.files.get('audio_file')
    if not instruction or not audio_file:
        return jsonify({'error': 'Se requieren instrucción y archivo de voz.'}), 400
    try:
        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {"xi-api-key": eleven_labs_api_key}
        data = {"name": "User Cloned Voice", "description": "Clonada desde muestra de usuario"}
        files = {'files': (audio_file.filename, audio_file.read(), audio_file.content_type)}
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        cloned_voice_id = response.json().get('voice_id')
        return jsonify({'message': 'Mente iniciada correctamente.', 'voice_id': cloned_voice_id}), 200
    except Exception as e:
        return jsonify({'error': f"Error: {str(e)}"}), 500


# --- WEBHOOK STRIPE ---
@app.route("/stripe-webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig = request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        return "Invalid signature", 400

    def enforce_chat_limit(user_id, max_chats):
        try:
            chats = supabase.table("saved_chats").select("id").eq("user_id", user_id).order("created_at", desc=True).execute()
            if chats.data and len(chats.data) > max_chats:
                for chat in chats.data[max_chats:]:
                    supabase.table("saved_chats").delete().eq("id", chat["id"]).execute()
        except Exception as e:
            print("Error limpiando chats:", e)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        customer_id = session["customer"]
        subscription = stripe.Subscription.retrieve(session["subscription"])
        price_id = subscription["items"]["data"][0]["price"]["id"]

        if price_id == os.getenv("STRIPE_PRICE_PLUS"):
            new_plan = "plus"
            max_chats = 5
        elif price_id == os.getenv("STRIPE_PRICE_LEGACY"):
            new_plan = "legacy"
            max_chats = 12
        else:
            new_plan = "essence"
            max_chats = 1

        supabase.table("profiles").update(
            {"plan": new_plan, "tts_used": 0}
        ).eq("stripe_customer_id", customer_id).execute()
        enforce_chat_limit(customer_id, max_chats)

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]
        price_id = subscription["items"]["data"][0]["price"]["id"]

        if price_id == os.getenv("STRIPE_PRICE_PLUS"):
            new_plan = "plus"
            max_chats = 5
        elif price_id == os.getenv("STRIPE_PRICE_LEGACY"):
            new_plan = "legacy"
            max_chats = 12
        else:
            new_plan = "essence"
            max_chats = 1

        supabase.table("profiles").update(
            {"plan": new_plan}
        ).eq("stripe_customer_id", customer_id).execute()
        enforce_chat_limit(customer_id, max_chats)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        customer_id = subscription["customer"]

        supabase.table("profiles").update(
            {"plan": "essence"}
        ).eq("stripe_customer_id", customer_id).execute()
        enforce_chat_limit(customer_id, 1)

    return "", 200


# --- CHAT ---
@app.route('/chat', methods=['POST'])
def chat():
    user_id = request.form.get('user_id')
    plan_info = get_user_plan(user_id)

    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')
    persistent_instruction = request.form.get('persistent_instruction', '')

    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_model = conversation_history
    full_user_message_text = f"{user_message}"
    if persistent_instruction:
        full_user_message_text = f"{persistent_instruction}\n\n{full_user_message_text}"
    if full_user_message_text:
        parts_for_model.append({'role': 'user', 'parts': [{'text': full_user_message_text}]})

    try:
        gemini_response = gemini_model.generate_content(parts_for_model)
        response_message = gemini_response.text
        return jsonify({"response": response_message, "audio": None})
    except Exception as e:
        return jsonify({"response": f"Error: {str(e)}", "audio": None})


# --- GENERAR AUDIO ---
@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    user_id = request.form.get('user_id')
    if not text or not user_id:
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


# === GUARDAR CHAT ===
@app.route('/save_chat', methods=['POST'])
def save_chat():
    user_id = request.form.get('user_id')
    chat_data = request.form.get('chat_data')

    if not user_id or not is_valid_uuid(user_id) or not chat_data:
        return jsonify({"error": "Usuario no autenticado o faltan parámetros"}), 400

    plan_info = get_user_plan(user_id)
    max_chats = (
        1 if plan_info["plan"] == "essence" else
        5 if plan_info["plan"] == "plus" else
        12 if plan_info["plan"] == "legacy" else
        1
    )

    try:
        current = supabase.table("saved_chats").select("id").eq("user_id", user_id).execute()
        if current.data and len(current.data) >= max_chats:
            return jsonify({"error": f"Límite alcanzado ({max_chats} chats). Borra uno para guardar otro."}), 403
    except Exception as e:
        print("Error verificando chats:", e)

    try:
        supabase.table("saved_chats").insert({
            "user_id": user_id,
            "chat_data": chat_data
        }).execute()
        return jsonify({"message": "Chat guardado"}), 200
    except Exception as e:
        print("Error guardando chat:", e)
        return jsonify({"error": "No se pudo guardar el chat"}), 500


# === LISTAR CHATS ===
@app.route('/get_chats', methods=['GET'])
def get_chats():
    user_id = request.args.get('user_id')
    if not user_id or not is_valid_uuid(user_id):
        return jsonify([])

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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 5000)))

        
