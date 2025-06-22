# app.py
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
import io
import base64 # Necesario para codificar imágenes
import mimetypes # Para determinar el tipo de archivo

app = Flask(__name__)
CORS(app) # Habilita CORS para permitir solicitudes desde tu frontend

# --- CONFIGURACIÓN DE GEMINI ---
# Obtiene la API Key de las variables de entorno de Render.
# Si no la encuentra (ej. al correr localmente sin la variable), usa la clave de respaldo.
# ¡Asegúrate de que esta API Key esté configurada en las variables de entorno de Render!
gemini_api_key = os.getenv("GEMINI_API_KEY", "AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")
genai.configure(api_key=gemini_api_key)

# Inicializa el modelo de Gemini. 'gemini-1.5-flash' es una buena opción rápida y económica.
# Soporta entradas multimodales (texto e imágenes).
model = genai.GenerativeModel('gemini-1.5-flash')
# --- FIN CONFIGURACIÓN DE GEMINI ---

# --- RUTA PARA SERVIR EL FRONTEND ---
# Esta ruta se encarga de servir el archivo index.html cuando alguien accede a la URL raíz de tu servicio en Render.
@app.route('/')
def index():
    # Flask buscará 'index.html' dentro de la carpeta 'templates'.
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    # Obtiene el mensaje de texto del formulario (FormData). Si no hay, es una cadena vacía.
    user_message_text = request.form.get('message', '') 
    response_message = "Lo siento, hubo un error desconocido."
    
    # Esta lista contendrá las partes (texto, imágenes) que se enviarán a Gemini.
    parts = [] 

    # Si hay texto del usuario, lo añadimos a las partes.
    if user_message_text:
        parts.append(user_message_text)

    # Verifica si se envió un archivo en la solicitud.
    if 'file' in request.files:
        file = request.files['file']
        # Asegúrate de que el archivo no está vacío
        if file.filename != '':
            # Determina el tipo MIME del archivo (ej. 'image/png', 'text/plain').
            mime_type = file.content_type
            if not mime_type: # Si Flask no lo detecta, intenta adivinarlo por la extensión.
                mime_type = mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'

            file_content = file.read() # Lee el contenido binario completo del archivo.

            # Procesa el archivo según su tipo MIME
            if mime_type.startswith('text/'):
                # Si es un archivo de texto, intenta decodificarlo como UTF-8.
                try:
                    text_content = file_content.decode('utf-8')
                    # Añade el contenido del archivo como parte de texto para Gemini.
                    parts.append(f"Contenido del archivo '{file.filename}':\n```\n{text_content}\n```")
                except UnicodeDecodeError:
                    # Maneja el caso en que el archivo no sea UTF-8 válido.
                    parts.append(f"Contenido del archivo '{file.filename}': (No se pudo decodificar como texto UTF-8)")
            elif mime_type.startswith('image/'):
                # Si es una imagen, codifícala en Base64 para enviarla a Gemini.
                base64_image = base64.b64encode(file_content).decode('utf-8')
                # Añade la imagen codificada como una parte de imagen.
                parts.append({
                    "mime_type": mime_type,
                    "data": base64_image
                })
            else:
                # Para otros tipos de archivo no directamente soportados por Gemini para análisis,
                # simplemente informa que no se puede analizar.
                parts.append(f"Archivo adjunto: '{file.filename}' ({mime_type}). No puedo analizar este tipo de archivo directamente.")
    
    # Si no hay mensaje de texto ni partes de archivo válidas, devuelve un error.
    if not parts:
        return jsonify({"response": "Por favor, envía un mensaje válido o un archivo que pueda analizar."}), 400

    try:
        # Envía todas las partes (texto y/o archivo) a la API de Gemini.
        gemini_response = model.generate_content(parts)
        response_message = gemini_response.text

    except Exception as e:
        # Imprime el error en los logs del servidor (Render) para depuración.
        print(f"Error al conectar con la API de Gemini: {e}")
        # Envía un mensaje de error amigable al frontend.
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    # Devuelve la respuesta de Gemini (o el mensaje de error) como JSON al frontend.
    return jsonify({"response": response_message})

# Este bloque es solo para ejecutar la aplicación localmente (ej. `python app.py`).
# Render utiliza Gunicorn para iniciar la aplicación, por lo que este bloque no se ejecuta en el despliegue.
if __name__ == '__main__':
    # Obtiene el puerto de la variable de entorno 'PORT' (usada por Render) o usa 5000 por defecto.
    port = int(os.getenv("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)

