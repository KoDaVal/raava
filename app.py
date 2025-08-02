from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
import google.generativeai as genai
import base64
import json
import requests
import random
from datetime import date, datetime, timedelta
from supabase import create_client
MAX_AUDIO_SIZE = 2 * 1024 * 1024  # 2 MB
MAILERSEND_API_KEY = os.getenv("MAILERSEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "no-reply@humancores.com")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "RaavaX")

def send_mailersend_email(to_email, subject, html_content):
    url = "https://api.mailersend.com/v1/email"
    headers = {
        "Authorization": f"Bearer {MAILERSEND_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": {
            "email": EMAIL_FROM,
            "name": EMAIL_FROM_NAME
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "html": html_content
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()



# ========== CONFIGURACIÓN SUPABASE ==========
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)
def verify_token(token):
    try:
        url = f"{supabase_url}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": supabase_key
        }
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print("Error verificando token:", e)
        return None


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
    supabase.rpc("increment_usage", {
        "uid": user_id,
        "token_inc": tokens,
        "voice_inc": voice_tokens
    }).execute()

def get_user_by_email_admin(email):
    """Obtiene un usuario por email usando el endpoint Admin de Supabase (case-insensitive)."""
    url = f"{supabase_url}/auth/v1/admin/users?email={email.lower()}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    try:
        r = requests.get(url, headers=headers)
        print(f"[DEBUG] Respuesta Admin Supabase ({email}): {r.status_code} - {r.text}")  # Log para depurar
        if r.status_code != 200:
            return None
        data = r.json()
        users = data.get("users", [])
        if users and isinstance(users, list):
            return users[0]  # Primer usuario encontrado
        return None
    except Exception as e:
        print(f"Error en get_user_by_email_admin: {e}")
        return None

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

# ========== RUTAS DE RECUPERACIÓN DE CONTRASEÑA ==========
@app.route('/request_password_code', methods=['POST'])
def request_password_code():
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        if not email:
            return api_error('Correo requerido')

        # Buscar usuario por email
        user_data = get_user_by_email_admin(email)
        if not user_data:
            return api_error("Correo no registrado.", 404)
        user_id = user_data["id"]

        # Generar OTP
        otp = random.randint(100000, 999999)
        expires_at = (datetime.utcnow() + timedelta(minutes=8)).isoformat()

        # Guardar OTP
        supabase.table("password_otps").upsert({
            "user_id": user_id,
            "otp_code": str(otp),
            "otp_expires_at": expires_at
        }).execute()

        # Enviar correo
        try:
            if not MAILERSEND_API_KEY:
                print("⚠️ MAILERSEND_API_KEY no configurada. No se envió correo.")
            else:
                send_mailersend_email(
                    email,
                    "Código de recuperación de contraseña - RaavaX",
                    f"""
                    <p>Hola,</p>
                    <p>Tu código para recuperar la contraseña es:</p>
                    <h2 style="color:#4CAF50; font-size:24px;">{otp}</h2>
                    <p>Este código expira en 8 minutos.</p>
                    <p>Si no solicitaste este código, ignora este mensaje.</p>
                    """
                )
        except Exception as e:
            print("Error enviando correo:", e)
            return jsonify({'message': 'Código generado, pero no se pudo enviar el correo.'}), 200

        return jsonify({'message': 'Código enviado'}), 200

    except Exception as e:
        import traceback
        print("Error inesperado en /request_password_code:", traceback.format_exc())
        return api_error("Error interno al generar el código.", 500)

@app.route('/reset_password_with_code', methods=['POST'])
def reset_password_with_code():
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        if not all([email, otp, new_password]):
            return api_error('Datos incompletos')

        # Buscar usuario por email
        user_data = get_user_by_email_admin(email)
        if not user_data:
            return api_error("Correo no registrado.", 404)
        user_id = user_data["id"]

        # Validar OTP
        otp_res = supabase.table("password_otps").select("*").eq("user_id", user_id).eq("otp_code", otp).execute()
        if not otp_res.data:
            return api_error("Código inválido.", 400)
        otp_data = otp_res.data[0]
        if datetime.fromisoformat(otp_data['otp_expires_at']) < datetime.utcnow():
            return api_error("Código expirado.", 400)

        # Cambiar contraseña
        url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json"
        }
        r = requests.put(url, headers=headers, json={"password": new_password})
        if r.status_code != 200:
            print(f"Error al actualizar contraseña: {r.status_code} - {r.text}")
            return api_error("Error al cambiar la contraseña.", 500)

        # Borrar OTP
        supabase.table("password_otps").delete().eq("user_id", user_id).execute()

        return jsonify({'message': 'Contraseña actualizada correctamente'}), 200

    except Exception as e:
        import traceback
        print("Error inesperado en /reset_password_with_code:", traceback.format_exc())
        return api_error("Error interno al cambiar la contraseña.", 500)

@app.route("/create_checkout_session", methods=["POST"])
def create_checkout_session():
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_data = verify_token(token)
        if not user_data:
            return api_error("No autorizado", 401)

        data = request.get_json()
        plan = data.get("plan")
        price_id = {
            "plus_monthly": os.getenv("STRIPE_PRICE_PLUS_MONTHLY"),
            "plus_yearly": os.getenv("STRIPE_PRICE_PLUS_YEARLY"),
            "legacy_monthly": os.getenv("STRIPE_PRICE_LEGACY_MONTHLY"),
            "legacy_yearly": os.getenv("STRIPE_PRICE_LEGACY_YEARLY")
        }.get(plan)
        if not price_id:
            return api_error("Plan inválido")

        session = stripe.checkout.Session.create(
            customer_email=user_data["email"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url="https://raavax.humancores.com/success",
            cancel_url="https://raavax.humancores.com/cancel",
            metadata={"user_id": user_data["id"], "plan": plan}
        )
        return jsonify({"url": session.url})
    except Exception as e:
        print("Error creando sesión:", e)
        return api_error("Error interno", 500)

# ========== RUTAS ==========
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/login')
def login():
    return render_template('login.html')
@app.route('/chat', methods=['POST'])
def chat():
    try:
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_data = verify_token(token)
        if not user_data:
            return jsonify({"error": "No autorizado"}), 401
        user_id = user_data["id"]

        profile = get_user_profile(user_id)
        profile = reset_monthly_usage(profile, user_id)
        limits = check_plan_limits(profile)
        plan_model = limits["model"]

        history_json = request.form.get('history', '[]')
        user_message = request.form.get('message', '')
        uploaded_file = request.files.get('file')
        persistent_instruction = request.form.get('persistent_instruction', '')
        chat_id = request.form.get('chat_id') or None  # ID del chat si continuamos uno existente

        try:
            conversation_history = json.loads(history_json)
        except json.JSONDecodeError:
            return api_error("Historial en formato inválido.", 400)

        # Prompt inicial (mejorado)
        base_instruction = (
            "Eres Raavax, un asistente conversacional diseñado para interactuar de forma humana, cercana y útil. "
            "Tu función principal es poder encarnar diferentes estilos de comunicación o personalidades basadas en instrucciones o archivos cargados por el usuario, siempre con fines apropiados y políticamente correctos. "
            "Mantén las respuestas breves, claras y sensatas, con un tono humano y natural, evitando tecnicismos innecesarios. "
            "No menciones tu identidad o función a menos que el usuario lo pregunte explícitamente."
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
        conversation_history = truncate_history(conversation_history, max_messages=8)

        # FIX: Convertir cualquier 'system' a 'user' (Gemini no soporta system)
        for msg in conversation_history:
            if msg.get("role") == "system":
                msg["role"] = "user"

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
            gemini_response = gemini_model.generate_content(
                conversation_history,
                request_options={"timeout": 10}  # Máximo 10s de espera para evitar bloqueos
            )
            response_message = gemini_response.text
            # Estimación: tokens entrada + salida
            tokens_in = sum(
                len(m['parts'][0].get('text', '')) // 4
                for m in conversation_history if 'parts' in m
            )
            tokens_out = len(response_message) // 4
        else:
            # ==== Aquí iría GPT‑4o Mini real ====
            response_message = "Respuesta de GPT‑4o Mini (simulada, agrega tu API key)."
            tokens_in = tokens_out = 0  # Cuando actives OpenAI, usa tiktoken

        conversation_history.append({'role': 'model', 'parts': [{'text': response_message}]})

        total_tokens = tokens_in + tokens_out
        if limits["tokens"] is not None and not use_fallback:
            update_usage(user_id, tokens=total_tokens)
        # === Generar título automático (sin instrucciones) ===
        def generate_chat_title(text, max_len=40):
            clean = text.strip().replace("\n", " ")
            return clean[:max_len] + ("..." if len(clean) > max_len else "")

        # Filtramos historial para NO guardar instrucciones ni inlineData (voz)
        history_to_save = []
        for msg in conversation_history:
            if msg.get("role") not in ["user", "model"]:
                continue
            if "inlineData" in msg["parts"][0]:  # Ignorar blobs (voz)
                continue
            if "Instrucciones adicionales del usuario" in msg["parts"][0].get("text", ""):
                continue
            history_to_save.append(msg)

        chat_title = generate_chat_title(user_message or "Chat sin título")

        # Guardar chat (update si existe, insert si no)
        if chat_id:
            supabase.table("chats").update({
                "history": history_to_save
            }).eq("id", chat_id).eq("user_id", user_id).execute()
        else:
            new_chat = supabase.table("chats").insert({
                "user_id": user_id,
                "title": chat_title,
                "history": history_to_save
            }).execute()
            chat_id = new_chat.data[0]['id'] if new_chat.data else None

        return jsonify({
            "response": response_message,
            "updated_history": conversation_history,
            "chat_id": chat_id
        })


    except Exception as e:
        print(f"Error inesperado en /chat: {e}")
        return jsonify({"error": str(e)}), 500

# ========== CHATS: LISTAR Y ELIMINAR ==========

@app.route('/get_chats', methods=['GET'])
def get_chats():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_data = verify_token(token)
    if not user_data:
        return api_error("No autorizado", 401)
    user_id = user_data["id"]

    res = supabase.table("chats").select("id,title,created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    chats = res.data or []

    # Agrupar por fecha (hoy, ayer, otros días)
    grouped = {}
    today = date.today()
    for chat in chats:
        created = datetime.fromisoformat(chat['created_at']).date()
        if created == today:
            key = "Hoy"
        elif created == today - timedelta(days=1):
            key = "Ayer"
        else:
            key = created.strftime("%d/%m/%Y")
        grouped.setdefault(key, []).append(chat)
    return jsonify(grouped)

@app.route('/delete_chat/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_data = verify_token(token)
    if not user_data:
        return api_error("No autorizado", 401)
    user_id = user_data["id"]

    # Solo borrar si pertenece al usuario
    supabase.table("chats").delete().eq("id", chat_id).eq("user_id", user_id).execute()
    return jsonify({"message": "Chat eliminado"})

@app.route("/start_mind", methods=["POST"])
def start_mind():
    global cloned_voice_id
    try:
        # --- Autenticación ---
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        user_data = verify_token(token)
        if not user_data:
            return jsonify({"error": "No autorizado"}), 401
        user_id = user_data["id"]
        # --- Lectura de datos ---
        instruction = request.form.get('instruction', '')
        audio_file = request.files.get('audio_file')

        if not instruction or not audio_file:
            return jsonify({'error': 'Se requieren instrucción y archivo de voz.'}), 400

        # --- Validar tamaño de archivo ---
        if audio_file.content_length > MAX_AUDIO_SIZE:
            return jsonify({"error": "Archivo de audio demasiado grande (máx 2MB)."}), 400      

        if not eleven_labs_api_key or eleven_labs_api_key == "sk_try_only":
            return jsonify({'error': 'Clave API de Eleven Labs no configurada o inválida.'}), 500

        # --- Subir archivo a ElevenLabs para clonar voz ---
        url = "https://api.elevenlabs.io/v1/voices/add"
        headers = {"xi-api-key": eleven_labs_api_key}
        data = {
            "name": f"UserVoice_{user_id}",
            "description": "Clonada desde muestra de usuario"
        }
        files = {
            'files': (audio_file.filename, audio_file.read(), audio_file.content_type)
        }

        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()
        voice_data = response.json()
        cloned_voice_id = voice_data.get('voice_id')

        # --- Respuesta ---
        return jsonify({
            'message': 'Mente iniciada correctamente.',
            'voice_id': cloned_voice_id
        }), 200

    except requests.exceptions.RequestException as e:
        print(f"Error al conectar con Eleven Labs: {e}")
        return jsonify({'error': 'Error al procesar la voz.'}), 500
    except Exception as e:
        print(f"Error inesperado en /start_mind: {e}")
        return jsonify({'error': 'Error interno al iniciar la mente.'}), 500


@app.route('/generate_audio', methods=['POST'])
def generate_audio():
    text = request.form.get('text', '')
    voice_id = request.form.get('voice_id')  # Puede venir del frontend
    
    # --- Autenticación ---
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_data = verify_token(token)
    if not user_data:
        return jsonify({"error": "No autorizado"}), 401
    user_id = user_data["id"]

    if not text:
        return jsonify({"error": "Texto vacío para generar audio."}), 400

    try:
        # Si viene un voice_id explícito, úsalo; si no, usa el clon global; si no, usa el default
        current_voice_id = voice_id if voice_id else cloned_voice_id if cloned_voice_id else default_eleven_labs_voice_id
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

        # Streaming para evitar problemas con audios largos
        tts_response = requests.post(tts_url, headers=tts_headers, json=tts_data, stream=True)
        tts_response.raise_for_status()
        audio_content = b''
        for chunk in tts_response.iter_content(chunk_size=4096):
            audio_content += chunk

        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        return jsonify({"audio": audio_base64})
    except requests.exceptions.HTTPError as e:
        print(f"Error de conexión o API con Eleven Labs al generar audio: {e.response.status_code} - {e.response.text}")
        return jsonify({"error": f"Error al generar el audio: {e.response.text}"}), e.response.status_code
    except Exception as e:
        import traceback
        print("Error inesperado en /generate_audio:", traceback.format_exc())
        return jsonify({"error": f"Error inesperado: {str(e)}"}), 500

@app.route('/verify_captcha', methods=['POST'])
def verify_captcha():
    token = request.form.get('token')
    secret = os.getenv("RECAPTCHA_SECRET_KEY")
    if not token or not secret:
        return jsonify({"success": False, "error": "Missing token or secret"}), 400
    response = requests.post("https://www.google.com/recaptcha/api/siteverify", data={"secret": secret, "response": token})
    return jsonify(response.json())

@app.route("/stripe_webhook", methods=["POST"])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.getenv("STRIPE_WEBHOOK_SECRET")
        )
    except stripe.error.SignatureVerificationError:
        return api_error("Webhook inválido", 400)

    if event["type"] in ["checkout.session.completed", "customer.subscription.updated"]:
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        if user_id and plan:
            supabase.table("profiles").update({"plan": plan}).eq("id", user_id).execute()

    return jsonify({"status": "ok"})
@app.route('/load_chat/<chat_id>', methods=['GET'])
def load_chat(chat_id):
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user_data = verify_token(token)
    if not user_data:
        return api_error("No autorizado", 401)
    user_id = user_data["id"]

    # Buscar el chat
    res = supabase.table("chats").select("history").eq("id", chat_id).eq("user_id", user_id).execute()
    if not res.data:
        return api_error("Chat no encontrado", 404)

    return jsonify({
        "history": res.data[0].get("history", [])
    })

