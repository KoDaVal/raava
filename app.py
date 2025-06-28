from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno de Render.
# Si no la encuentra, usa la clave de respaldo para desarrollo local (¡Recuerda cambiarla!).
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)

# Inicializa el modelo de Gemini.
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/')
def index():
    """Ruta principal que sirve la página HTML."""
    return render_template('index.html')
# --- FIN RUTA DEL FRONTEND ---

@app.route('/chat', methods=['POST'])
def chat():
    """Ruta para manejar las solicitudes de chat con el modelo Gemini."""
    # Obtener el historial de la conversación, el mensaje actual y el prompt fijo
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')
    # --- Obtiene el prompt fijo del frontend ---
    fixed_prompt = request.form.get('fixed_prompt', '')

    # Convertir el historial JSON a un objeto Python
    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_gemini = conversation_history
    response_message = "Lo siento, hubo un error desconocido."
    
    # --- Combina la instrucción predeterminada y el prompt fijo si existe ---
    # Si hay un prompt fijo, se usa como la instrucción principal. Si no, se usa la predeterminada.
    effective_instruction = ""
    if fixed_prompt:
        effective_instruction = fixed_prompt + " "
    # Agregamos la instrucción de tono al final para que siempre esté presente.
    effective_instruction += "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"

    # Añadir el mensaje actual del usuario y el archivo (si existe) como la última "parte"
    current_user_parts = []
    if user_message:
        # Aplicamos la instrucción efectiva al mensaje actual
        current_user_parts.append({'text': f"{effective_instruction} {user_message}"})

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
                # Añadir contexto de imagen si no hay texto principal
                if not user_message:
                    current_user_parts.append({'text': f"Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
                else:
                    current_user_parts.append({'text': f"Imagen adjunta: '{file_name}'."})

            elif file_type.startswith('text/'):
                text_content = uploaded_file.read().decode('utf-8')
                current_user_parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{text_content}"})
                # Añadir contexto de archivo de texto si no hay texto principal
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
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
