const toggleTheme = document.getElementById('toggle-theme');
toggleTheme.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  toggleTheme.textContent = document.body.classList.contains('light-mode')
    ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
});

const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.querySelector('.messages');

/**
 * Agrega un mensaje al contenedor del chat.
 * @param {string} sender - El remitente del mensaje ('user' o 'bot').
 * @param {string} text - El texto del mensaje.
 */
async function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  messagesContainer.appendChild(msg);
  // Anima la aparición del mensaje y lo desplaza a la vista.
  requestAnimationFrame(() => {
    msg.classList.add('appeared');
    msg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });
}

/**
 * Obtiene el historial de la conversación del DOM.
 * @returns {Array<object>} - Un array de objetos con el historial de la conversación.
 */
function getConversationHistory() {
  const messages = messagesContainer.querySelectorAll('.message');
  return Array.from(messages).map(msg => ({
    // 'user' para el usuario, 'model' para el bot (el rol que usa la API de Gemini).
    role: msg.classList.contains('user') ? 'user' : 'model',
    parts: [{ text: msg.textContent }]
  }));
}

/**
 * Maneja el envío del mensaje al backend de Flask.
 */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return; // No envía el mensaje si el campo está vacío.

  // 1. Muestra el mensaje del usuario en la interfaz.
  addMessage('user', text);
  userInput.value = ''; // Limpia el área de texto.

  // 2. Obtiene el historial de la conversación y lo convierte a JSON.
  const historyJSON = JSON.stringify(getConversationHistory());

  // 3. Prepara los datos para enviar al servidor.
  const formData = new FormData();
  formData.append('message', text);
  formData.append('history', historyJSON);
  
  // 4. Muestra un indicador de que el bot está respondiendo.
  const typingIndicator = document.createElement('div');
  typingIndicator.classList.add('message', 'bot', 'typing-indicator');
  typingIndicator.innerHTML = `<span></span><span></span><span></span>`;
  messagesContainer.appendChild(typingIndicator);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    // 5. Envía la solicitud al endpoint '/chat' de tu servidor Flask.
    const response = await fetch('/chat', {
      method: 'POST',
      body: formData // Envía los datos como FormData.
    });

    if (!response.ok) {
      throw new Error(`Error en el servidor: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 6. Elimina el indicador de escritura y muestra la respuesta del bot.
    messagesContainer.removeChild(typingIndicator);
    addMessage('bot', data.response);
    
  } catch (error) {
    console.error('Error al comunicarse con el backend:', error);
    // Elimina el indicador y muestra un mensaje de error si algo sale mal.
    messagesContainer.removeChild(typingIndicator);
    addMessage('bot', 'Lo siento, hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.');
  }
}

// Escucha eventos para enviar el mensaje.
sendButton.addEventListener('click', sendMessage);

// Envía el mensaje al presionar Enter (sin Shift+Enter para una nueva línea).
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Mensaje de bienvenida inicial.
addMessage('bot', '¡Hola! Soy Raava. ¿En qué puedo ayudarte hoy?');
