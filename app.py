from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json
import requests  # Necesario para Eleven Labs
import stripe
from datetime import datetime, timedelta
from supabase import create_client

# === STRIPE CONFIG ===
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
STRIPE_PRICE_PLUS_MONTHLY = os.getenv("STRIPE_PRICE_PLUS_MONTHLY")
STRIPE_PRICE_PLUS_YEARLY = os.getenv("STRIPE_PRICE_PLUS_YEARLY")
STRIPE_PRICE_LEGACY_MONTHLY = os.getenv("STRIPE_PRICE_LEGACY_MONTHLY")
STRIPE_PRICE_LEGACY_YEARLY = os.getenv("STRIPE_PRICE_LEGACY_YEARLY")

# === SUPABASE CONFIG ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# === PLANES Y LÍMITES (tokens/mes) ===
PLAN_LIMITS = {
    "essence": {
        "gemini_tokens": float("inf"),  # ilimitado siempre
        "gpt_tokens": 0,               # reservado para futuro
        "tts_tokens": 500
    },
    "plus": {
        "gemini_tokens": float("inf"),
        "gpt_tokens": 0,
        "tts_tokens": 10000
    },
    "legacy": {
        "gemini_tokens": float("inf"),
        "gpt_tokens": 0,
        "tts_tokens": 90000
    }
}

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


# --- WEBHOOK STRIPE: ACTUALIZA PLANES EN SUPABASE ---
@app.route("/stripe_webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        return jsonify({"error": "Invalid signature"}), 400

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_email = session.get("customer_email")
        if not user_email:
            return jsonify({"error": "No email found"}), 400

        # Detectar plan comprado
        subscription = stripe.Subscription.retrieve(session["subscription"])
        price_id = subscription["items"]["data"][0]["price"]["id"]
        if price_id in [STRIPE_PRICE_PLUS_MONTHLY, STRIPE_PRICE_PLUS_YEARLY]:
            plan = "plus"
        elif price_id in [STRIPE_PRICE_LEGACY_MONTHLY, STRIPE_PRICE_LEGACY_YEARLY]:
            plan = "legacy"
        else:
            plan = "essence"

        expiry = datetime.utcnow() + (timedelta(days=365) if "YEARLY" in price_id.upper() else timedelta(days=30))

        # Validar que el correo existe en Supabase Auth
        user_exists = supabase.table("auth.users").select("id").eq("email", user_email).execute()
        if not user_exists.data:
            print(f"Webhook: correo {user_email} no encontrado en Supabase Auth.")
            return jsonify({"error": "El correo no está registrado en Raavax."}), 400

        # Actualizar o crear perfil en Supabase
        existing = supabase.table("profiles").select("id").eq("email", user_email).execute()
        if existing.data:
            # Actualizar plan
            supabase.table("profiles").update({
                "plan": plan,
                "plan_expiry": expiry.isoformat(),
                "gemini_tokens_used": 0,
                "gpt_tokens_used": 0,
                "tts_tokens_used": 0
            }).eq("email", user_email).execute()
        else:
            # Crear perfil nuevo
            supabase.table("profiles").insert({
                "email": user_email,
                "plan": plan,
                "plan_expiry": expiry.isoformat(),
                "gemini_tokens_used": 0,
                "gpt_tokens_used": 0,
                "tts_tokens_used": 0
            }).execute()

    return jsonify({"status": "success"}), 200
# --- FIN WEBHOOK STRIPE ---


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
    headers = {"xi-api-key": eleven_labs_api_key}
    data = {"name": "Cloned Voice", "description": "Voice cloned from user sample"}
    files = {'files': (audio_file.filename, audio_file.read(), audio_file.content_type)}

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


# --- RUTA PARA INICIAR MENTE ---
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
        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {"xi-api-key": eleven_labs_api_key}
        data = {"name": "User Cloned Voice", "description": "Clonada desde muestra de usuario"}
        files = {'files': (audio_file.filename, audio_file.read(), audio_file.content_type)}

        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        voice_data = response.json()
        cloned_voice_id = voice_data.get('voice_id')

        return jsonify({'message': 'Mente iniciada correctamente.', 'voice_id': cloned_voice_id}), 200
    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con Eleven Labs: {e}")
        return jsonify({'error': 'Error al procesar la voz.'}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({'error': 'Error interno al iniciar la mente.'}), 500
# --- FIN RUTA INICIAR MENTE ---


# --- CHAT CON GEMINI ---
@app.route('/chat', methods=['POST'])
def chat():
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')
    persistent_instruction = request.form.get('persistent_instruction', '')

    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_gemini = conversation_history
    response_message = "Lo siento, hubo un error desconocido."
    audio_base64 = None

    base_instruction = (
        "Responde como Raavax, un asistente conversacional inteligente, claro y cercano. "
        "Por defecto, mantén respuestas breves, útiles y al grano..."
    )

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
                current_user_parts.append({"inlineData": {"mimeType": file_type, "data": base64_image}})
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
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido para que pueda responderte."}), 400

    parts_for_gemini.append({'role': 'user', 'parts': current_user_parts})

    try:
        gemini_response = model.generate_content(parts_for_gemini)
        response_message = gemini_response.text
        parts_for_gemini.append({'role': 'model', 'parts': [{'text': response_message}]})
        audio_base64 = None
        return jsonify({"response": response_message, "audio": audio_base64})
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"response": "Hubo un problema al procesar tu solicitud."}), 500
# --- FIN CHAT ---


# --- MIDDLEWARE PARA VERIFICAR TOKENS ---
def check_and_update_tokens(user_email, token_type, tokens_to_add):
    profile = supabase.table("profiles").select("*").eq("email", user_email).single().execute()
    if not profile.data:
        return False, "Usuario no encontrado."
    plan = profile.data.get("plan", "essence")
    expiry = profile.data.get("plan_expiry")
    used = profile.data.get(f"{token_type}_tokens_used", 0)
    limit = PLAN_LIMITS[plan][f"{token_type}_tokens"]
    if expiry and datetime.fromisoformat(expiry) < datetime.utcnow():
        return False, "Tu plan ha expirado."
    if used + tokens_to_add > limit:
        return False, "Has alcanzado tu límite. Actualiza tu plan."
    supabase.table("profiles").update({f"{token_type}_tokens_used": used + tokens_to_add}).eq("email", user_email).execute()
    return True, ""
# --- FIN MIDDLEWARE ---


# --- GENERAR AUDIO ---
@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    user_email = request.form.get('user_email')  # el frontend debe mandarlo
    if not user_email:
        return jsonify({"error": "Falta email de usuario."}), 400
    ok, msg = check_and_update_tokens(user_email, "tts", len(text)//4)  # 1 token ≈ 4 caracteres
    if not ok:
        return jsonify({"error": msg}), 403
    if not text:
        return jsonify({"error": "Texto vacío para generar audio."}), 400

    current_voice_id = cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{current_voice_id}/stream"
    tts_headers = {"xi-api-key": eleven_labs_api_key, "Content-Type": "application/json", "accept": "audio/mpeg"}
    tts_data = {"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}

    try:
        tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
        tts_response.raise_for_status()
        audio_content = b''.join(tts_response.iter_content(chunk_size=4096))
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        return jsonify({"audio": audio_base64})
    except requests.exceptions.HTTPError as e:
        print(f"Error al generar audio: {e.response.status_code} - {e.response.text}")
        return jsonify({"error": f"Error al generar el audio: {e.response.text}"}), e.response.status
# --- FIN GENERAR AUDIO ---


# --- CONSULTAR USO DE TOKENS ---
@app.route("/get_usage", methods=["GET"])
def get_usage():
    user_email = request.args.get("email")
    if not user_email:
        return jsonify({"error": "Falta email"}), 400

    # Intentar cargar perfil
    profile = supabase.table("profiles").select("*").eq("email", user_email).single().execute()

    if not profile.data:
        # Si no existe, lo creamos por defecto
        supabase.table("profiles").insert({
            "email": user_email,
            "plan": "essence",
            "plan_expiry": None,
            "gemini_tokens_used": 0,
            "gpt_tokens_used": 0,
            "tts_tokens_used": 0
        }).execute()
        # Volvemos a cargarlo
        profile = supabase.table("profiles").select("*").eq("email", user_email).single().execute()

    # Proteger por si sigue vacío
    if not profile.data:
        return jsonify({"error": "No se pudo crear el perfil"}), 500

    plan = profile.data.get("plan", "essence")
    usage = {
        "plan": plan,
        "plan_expiry": profile.data.get("plan_expiry"),
        "tts_tokens_used": profile.data.get("tts_tokens_used", 0),
        "tts_tokens_limit": PLAN_LIMITS.get(plan, PLAN_LIMITS["essence"])["tts_tokens"]
    }
    return jsonify(usage)


# --- FIN CONSULTAR USO ---
