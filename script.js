document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.querySelector('.messages');

    // Función para añadir mensajes al contenedor
    function addMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.style.padding = '8px 12px';
        messageElement.style.borderRadius = '10px';
        messageElement.style.marginBottom = '8px';
        messageElement.style.maxWidth = '80%';

        if (sender === 'user') {
            messageElement.style.backgroundColor = '#6d28d9';
            messageElement.style.alignSelf = 'flex-end';
            messageElement.style.marginLeft = 'auto';
        } else {
            messageElement.style.backgroundColor = '#2a2a2a';
            messageElement.style.alignSelf = 'flex-start';
            messageElement.style.marginRight = 'auto';
        }
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage('user', message);
        userInput.value = ''; // Limpiar el input

        try {
            const response = await fetch('http://127.0.0.1:5000/chat', { // Asegúrate de que la URL coincida con tu backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message }),
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            addMessage('bot', data.response);
        } catch (error) {
            console.error('Error al comunicarse con el backend:', error);
            addMessage('bot', 'Hubo un error al conectar con el chatbot. Inténtalo de nuevo más tarde.');
        }
    }

    // Mensaje de bienvenida inicial
    addMessage('bot', '¡Hola! Soy Raava. ¿En qué puedo ayudarte hoy?');
});