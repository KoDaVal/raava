import os
import json
from flask import Flask, request, jsonify, render_template
from google.generativeai import GenerativeModel, configure

# Configura tu clave de API
# Asegúrate de que GEMINI_API_KEY esté configurada como una variable de entorno en Render.com
configure(api_key=os.environ.get("GEMINI_API_KEY"))

app = Flask(__name__, template_folder='templates', static_folder='static')

# Inicializa el modelo Gemini con el historial de chat persistente
model = GenerativeModel('gemini-1.5-flash')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.form.get('message')
    history_json = request.form.get('history')
    uploaded_file = request.files.get('file')

    # Convertir el historial de JSON a un objeto Python
    conversation_history = []
    if history_json:
        try:
            conversation_history = json.loads(history_json)
        except json.JSONDecodeError:
            print("Error decodificando historial JSON")
            return jsonify({"error": "Formato de historial inválido"}), 400

    # Asegurarse de que el historial tenga el formato correcto para Gemini (role, parts)
    # y manejar los roles para que siempre comience con 'user' y alterne
    processed_history = []
    for entry in conversation_history:
        if 'parts' in entry and isinstance(entry['parts'], list):
            processed_parts = [{'text': part['text']} for part in entry['parts'] if 'text' in part]
            processed_history.append({'role': entry.get('role'), 'parts': processed_parts})

    # Configura o reinicia la sesión de chat con el historial proporcionado
    chat_session = model.start_chat(history=processed_history)

    # Prepara el contenido para el modelo
    content_parts = [{'text': user_message}]

    if uploaded_file:
        try:
            # Lee el contenido del archivo subido
            file_bytes = uploaded_file.read()
            mime_type = uploaded_file.mimetype

            # Crea un Generative Content Part para el archivo
            file_part = {
                'mime_type': mime_type,
                'data': file_bytes
            }
            content_parts.append(file_part)
        except Exception as e:
            print(f"Error al procesar archivo subido: {e}")
            return jsonify({"error": "Error al procesar el archivo adjunto"}), 500

    try:
        # Enviar el mensaje y el archivo al modelo
        response = chat_session.send_message(content_parts)
        return jsonify({"response": response.text})
    except Exception as e:
        print(f"Error al comunicarse con el modelo Gemini: {e}")
        return jsonify({"error": str(e)}), 500


# NUEVA RUTA PARA SUBIR Y PROCESAR ARCHIVOS PARA "INICIAR MENTE"
@app.route('/upload_and_process', methods=['POST'])
def upload_and_process():
    uploaded_image = request.files.get('image_file')
    uploaded_info = request.files.get('info_file')

    messages = []

    if uploaded_image:
        # **Lógica para procesar la imagen aquí**
        # Puedes guardar el archivo, enviarlo a la API de Gemini para análisis, etc.
        image_bytes = uploaded_image.read() # Lee el contenido binario de la imagen
        image_mime_type = uploaded_image.mimetype
        messages.append(f"Imagen '{uploaded_image.filename}' ({image_mime_type}) recibida. Su tamaño es {len(image_bytes)} bytes.")

        # Ejemplo de cómo podrías enviar la imagen a Gemini para una descripción
        # try:
        #     image_part_for_gemini = {
        #         'mime_type': image_mime_type,
        #         'data': image_bytes
        #     }
        #     # Inicia una nueva sesión de chat o usa un modelo específico para procesamiento de imágenes
        #     image_model_response = model.generate_content([
        #         "Por favor, describe esta imagen en detalle:",
        #         image_part_for_gemini
        #     ])
        #     messages.append(f"Análisis de imagen de Gemini: {image_model_response.text[:100]}...") # Primeros 100 caracteres
        # except Exception as e:
        #     messages.append(f"Error al analizar la imagen con Gemini: {e}")

    if uploaded_info:
        # **Lógica para procesar el archivo de información aquí**
        # Puedes leer el contenido, guardarlo, o usarlo para alimentar un modelo de lenguaje.
        info_content = uploaded_info.read().decode('utf-8', errors='ignore') # Decodifica el contenido como texto
        messages.append(f"Archivo de información '{uploaded_info.filename}' recibido. Contenido (primeros 100 caracteres): {info_content[:100]}...")

        # Ejemplo de cómo podrías enviar el texto a Gemini para resumen o análisis
        # try:
        #     info_model_response = model.generate_content([
        #         "Por favor, lee este documento y extrae los puntos clave:",
        #         {'text': info_content}
        #     ])
        #     messages.append(f"Análisis de documento de Gemini: {info_model_response.text[:100]}...")
        # except Exception as e:
        #     messages.append(f"Error al analizar el documento con Gemini: {e}")

    if not uploaded_image and not uploaded_info:
        return jsonify({"message": "No se subió ningún archivo."}), 200

    return jsonify({"message": " y ".join(messages) + ". Listos para ser procesados por la mente de Raava."}), 200


if __name__ == '__main__':
    app.run(debug=True)
