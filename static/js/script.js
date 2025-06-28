document.addEventListener('DOMContentLoaded', () => {
    const toggleTheme = document.getElementById('toggle-theme');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.querySelector('.messages');
    const fileInput = document.getElementById('file-upload');
    const fileDisplay = document.getElementById('file-display');
    const fileNameSpan = document.getElementById('file-name');
    const clearFileButton = document.getElementById('clear-file');
    let typingIndicatorElement = null;
    let selectedFile = null;
    let conversationHistory = [];

    // Función para ajustar la altura del textarea dinámicamente
    function adjustTextareaHeight() {
        userInput.style.height = 'auto'; // Reset height to recalculate
        userInput.style.height = userInput.scrollHeight + 'px'; // Set to scroll height
    }
    userInput.addEventListener('input', adjustTextareaHeight);
    userInput.addEventListener('focus', adjustTextareaHeight);
    userInput.addEventListener('blur', adjustTextareaHeight);

    // Lógica del modo oscuro y claro
    toggleTheme.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      toggleTheme.textContent = document.body.classList.contains('light-mode')
        ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
    });

    async function addMessage(sender, text) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender);
        messageElement.textContent = text;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        conversationHistory.push({
            role: sender === 'user' ? 'user' : 'model',
            parts: [{ text: text }]
        });

        setTimeout(() => {
            messageElement.classList.add('appeared');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 50);
        return Promise.resolve();
    }

    function showTypingIndicator() {
        if (typingIndicatorElement) return;

        typingIndicatorElement = document.createElement('div');
        typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingIndicatorElement.appendChild(dot);
        }
        messagesContainer.appendChild(typingIndicatorElement);
        void typingIndicatorElement.offsetWidth;
        typingIndicatorElement.style.opacity = '1';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        if (typingIndicatorElement && messagesContainer.contains(typingIndicatorElement)) {
            typingIndicatorElement.style.opacity = '0';
            setTimeout(() => {
                if (typingIndicatorElement && messagesContainer.contains(typingIndicatorElement)) {
                    messagesContainer.removeChild(typingIndicatorElement);
                    typingIndicatorElement = null;
                }
            }, 300);
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectedFile = fileInput.files[0];
            fileNameSpan.textContent = selectedFile.name;
            fileDisplay.style.display = 'flex';
        } else {
            selectedFile = null;
            fileDisplay.style.display = 'none';
        }
    });

    clearFileButton.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        fileDisplay.style.display = 'none';
        adjustTextareaHeight();
    });

    async function sendMessage() {
        const message = userInput.value.trim();
        const actualFile = fileInput.files.length > 0 ? fileInput.files[0] : null;

        if (!message && !actualFile) {
            console.warn("Intento de envío vacío: no hay mensaje ni archivo adjunto.");
            return;
        }
        
        selectedFile = actualFile;

        let displayMessage = message;
        if (selectedFile) {
            displayMessage += (message ? ' ' : '') + `📎 Archivo adjunto: ${selectedFile.name}`;
        }
        await addMessage('user', displayMessage);
        
        userInput.value = '';
        adjustTextareaHeight();

        showTypingIndicator();

        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('history', JSON.stringify(conversationHistory.slice(0, -1)));

            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            const response = await fetch('https://raava.onrender.com/chat', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
            }
            const data = await response.json();
            hideTypingIndicator();
            await addMessage('bot', data.response);
            
            selectedFile = null;
            fileInput.value = '';
            fileDisplay.style.display = 'none';
            adjustTextareaHeight();

        } catch (error) {
            console.error('Error al comunicarse con el backend:', error);
            hideTypingIndicator();
            await addMessage('bot', 'Lo siento, hubo un error al conectar con el chatbot. Por favor, revisa la consola del navegador y asegúrate de que el backend esté corriendo.');
            
            conversationHistory.pop();
            selectedFile = null;
            fileInput.value = '';
            fileDisplay.style.display = 'none';
            adjustTextareaHeight();
        }
    }

    // Mensaje de bienvenida inicial
    (async () => {
         await addMessage('bot', '¡Hola! Soy Raava. ¿En qué puedo ayudarte hoy?');
    })();
});
