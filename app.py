from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64
import json

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN DE GEMINI ---
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/')
def index():
    return render_template('index.html')
# --- FIN RUTA DEL FRONTEND ---

@app.route('/chat', methods=['POST'])
def chat():
    # Obtener el historial de la conversación, el mensaje actual, el archivo y la instrucción persistente
    history_json = request.form.get('history', '[]')
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file')
    persistent_instruction = request.form.get('persistent_instruction', '') # <--- NUEVO: Obtiene la instrucción persistente

    try:
        conversation_history = json.loads(history_json)
    except json.JSONDecodeError:
        return jsonify({"response": "Error: Formato de historial inválido."}), 400

    parts_for_gemini = conversation_history
    
    response_message = "Lo siento, hubo un error desconocido."

    # <--- INSTRUCCIÓN PARA CONTROLAR LA LONGITUD Y EL TONO --->
    # Esta instrucción se aplicará después de la instrucción persistente.
    base_instruction = "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"
    
    # <--- NUEVO: Combinar la instrucción persistente con el mensaje del usuario ---
    # La instrucción persistente se añade al inicio del mensaje del usuario.
    # Esto asegura que Gemini la tenga en cuenta para cada turno.
    full_user_message_text = user_message
    if persistent_instruction:
        full_user_message_text = f"{persistent_instruction}\n\n{user_message}" # Añade un salto de línea para claridad
    
    full_user_message_text = f"{base_instruction} {full_user_message_text}"


    # Añadir el mensaje actual del usuario (y el archivo) como la última "parte"
    current_user_parts = []
    if full_user_message_text: # Asegura que siempre haya un texto para enviar, incluso si solo es la instrucción persistente
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
                # Añadir contexto de imagen si no hay texto principal
                if not user_message:
                    current_user_parts.append({'text': f"Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
                else:
                    current_user_parts.append({'text': f"Imagen adjunta: '{file_name}'."})

            elif file_type.startswith('text/'):
                text_content = uploaded_file.read().decode('utf-8')
                # Si el archivo de texto es la instrucción, ya se manejó.
                # Si es un archivo de texto para análisis, se añade su contenido.
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

    # Añadir el mensaje actual del usuario (y el archivo) al final del historial
    parts_for_gemini.append({'role': 'user', 'parts': current_user_parts})

    try:
        gemini_response = model.generate_content(parts_for_gemini)
        response_message = gemini_response.text

    except Exception as e:
        print(f"Error al conectar con la API de Gemini: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
