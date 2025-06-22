from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os

app = Flask(__name__)

CORS(app)


genai.configure(api_key="AIzaSyAqa7wkPNR17Cmyom8EZZ1GiclxaqbEVVI")


model = genai.GenerativeModel('gemini-1.5-flash')


@app.route('/chat', methods=['POST'])
def chat():
   
    user_message = request.json.get('message')
    response_message = "Lo siento, hubo un error desconocido."

   
    if not user_message:
        return jsonify({"response": "Por favor, envía un mensaje válido."}), 400

    try:
       
        gemini_response = model.generate_content(user_message)

      
        response_message = gemini_response.text

    except Exception as e:
       
        print(f"Error al conectar con la API de Gemini: {e}")
      
        response_message = "Lo siento, hubo un problema al procesar tu solicitud con la IA. Por favor, intenta de nuevo."

    
    return jsonify({"response": response_message})

if __name__ == '__main__':
   
    app.run(debug=True, port=5000)
