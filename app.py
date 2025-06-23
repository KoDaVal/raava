from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import base64 # Necesario para decodificar la imagen si se envía como base64

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde tu frontend

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno de Render.
# Si no la encuentra (ej. al correr localmente sin la variable), usa la clave de respaldo.
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)

# Inicializa el modelo de Gemini. 'gemini-1.5-flash' es una buena opción gratuita y rápida para chat.
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- RUTA PARA SERVIR EL FRONTEND ---
@app.route('/') # Ruta para la raíz del sitio
def index():
    return render_template('index.html') # Renderiza tu archivo index.html
# --- FIN RUTA DEL FRONTEND ---

@app.route('/chat', methods=['POST'])
def chat():
    # Obtener datos del formulario multipart/form-data
    user_message = request.form.get('message', '')
    uploaded_file = request.files.get('file') # Obtener el archivo directamente de request.files

    parts = [] # Lista de "partes" para enviar a Gemini (texto, imágenes, etc.)
    response_message = "Lo siento, hubo un error desconocido."

    # <--- INSTRUCCIÓN ACTUALIZADA PARA CONTROLAR LA LONGITUD Y EL TONO --->
    # Esta instrucción le pide al modelo que sea conciso pero no simplista,
    # y que mantenga un tono más humano y amable.
    instruction = "Responde de forma concisa y clara, ofreciendo la información esencial con un tono amable y humano, evitando la simplicidad excesiva:"
    # <--- FIN INSTRUCCIÓN ACTUALIZADA DE LONGITUD Y TONO --->

    # Si hay un mensaje de texto del usuario, lo añade como una parte con la instrucción
    if user_message:
        parts.append({'text': f"{instruction} {user_message}"})

    # Si se adjuntó un archivo, lo procesa y añade como una parte
    if uploaded_file:
        file_name = uploaded_file.filename
        file_type = uploaded_file.content_type

        try:
            if file_type.startswith('image/'):
                # Leer la imagen y codificarla a base64
                image_bytes = uploaded_file.read()
                base64_image = base64.b64encode(image_bytes).decode('utf-8')
                
                parts.append({
                    "inlineData": {
                        "mimeType": file_type,
                        "data": base64_image
                    }
                })
                # Añade un texto descriptivo para que el modelo sepa que hay una imagen
                if not user_message: # Si no hay mensaje de texto, da una pista con la instrucción
                    parts.append({'text': f"{instruction} Adjuntaste la imagen '{file_name}'. ¿Qué quieres saber sobre ella?"})
                else: # Si hay mensaje, añade el contexto de la imagen
                    parts.append({'text': f"Imagen adjunta: '{file_name}'."})
            elif file_type.startswith('text/'):
                # Para archivos de texto simple, añadir su contenido como texto
                text_content = uploaded_file.read().decode('utf-8')
                parts.append({'text': f"Contenido del archivo de texto '{file_name}':\n{text_content}"})
                # También un mensaje inicial si no hay texto del usuario
                if not user_message:
                     parts.append({'text': f"{instruction} Adjuntaste el archivo de texto '{file_name}'. ¿Qué quieres que analice?"})
                else: # Si hay mensaje, añade el contexto del texto
                    parts.append({'text': f"Archivo de texto adjunto: '{file_name}'."})
            else:
                # Para otros tipos de archivo no soportados directamente por este ejemplo
                parts.append({'text': f"{instruction} Se adjuntó un archivo de tipo {file_type} ('{file_name}'). Actualmente, solo puedo procesar imágenes y texto simple directamente. ¿Hay algo más en lo que pueda ayudarte?"})

        except Exception as e:
            print(f"Error al procesar el archivo adjunto: {e}")
            return jsonify({"response": "Lo siento, hubo un error al procesar el archivo adjunto."}), 500

    # Si no hay mensaje ni archivo, retorna un error
    if not parts:
        return jsonify({"response": "Por favor, envía un mensaje o un archivo válido para que pueda responderte."}), 400

    try:
        # Envía todas las "partes" (texto, imagen, etc.) al modelo de Gemini
        gemini_response = model.generate_content(parts)
        response_message = gemini_response.text

    except Exception as e:
        print(f"Error al conectar con la API de Gemini: {e}")
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    return jsonify({"response": response_message})

if __name__ == '__main__':
    # Obtiene el puerto del entorno (para Render) o usa 5000 por defecto (para local)
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)




