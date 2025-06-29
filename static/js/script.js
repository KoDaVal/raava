document.addEventListener('DOMContentLoaded', () => {
    const toggleTheme = document.getElementById('toggle-theme');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.querySelector('.messages');
    const fileInput = document.getElementById('file-upload'); // Botón de adjuntar general
    const fileDisplay = document.getElementById('file-display');
    const fileNameSpan = document.getElementById('file-name');
    const clearFileButton = document.getElementById('clear-file');
    let typingIndicatorElement = null;
    let selectedFile = null;
    let conversationHistory = [];

    // --- Elementos y lógica para la barra lateral derecha (info-panel) ---
    // (Asegúrate de que estos IDs existan en tu HTML)
    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input'); // Input para archivos de información
    const avatarImage = document.getElementById('avatar-image'); // Referencia a la imagen del avatar

    // --- NUEVAS variables para la instrucción inamovible ---
    let uploadedInfoFileContent = ""; // Contenido del archivo de info subido (temporal)
    let activePersistentInstruction = ""; // La instrucción activa para Gemini

    // Botón de "Iniciar mente"
    const startMindButton = document.getElementById('start-mind-button');

    // Asigna el evento de clic a los botones del panel de información para abrir el selector de archivos
    if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
    if (uploadInfoBtn) uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });

    // Evento para reemplazar la imagen del avatar cuando se sube una nueva
    if (imageFileInput && avatarImage) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const fileURL = URL.createObjectURL(file);
                avatarImage.src = fileURL; // Cambia la fuente de la imagen
                addMessage('bot', `Se ha actualizado tu avatar con la imagen: ${file.name}.`);
            }
        });
    }

    // --- NUEVO: Manejo del archivo de información (botón "Información") ---
    if (infoFileInput && startMindButton) {
        infoFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'text/plain') { // Asegurarse de que sea un archivo de texto
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedInfoFileContent = e.target.result; // Guarda el contenido del archivo
                    startMindButton.classList.add('info-ready'); // Activa la animación del botón
                    addMessage('bot', `Archivo de instrucción "${file.name}" cargado. Presiona "Iniciar mente" para activar esta instrucción.`);
                };
                reader.onerror = () => {
                    addMessage('bot', 'Error al leer el archivo de instrucción. Inténtalo de nuevo.');
                    uploadedInfoFileContent = "";
                    startMindButton.classList.remove('info-ready');
                };
                reader.readAsText(file); // Lee el archivo como texto
            } else {
                addMessage('bot', 'Por favor, sube un archivo de texto (.txt) para la instrucción.');
                uploadedInfoFileContent = "";
                startMindButton.classList.remove('info-ready');
            }
        });
    }
    
    // --- NUEVO: Lógica del botón "Iniciar mente" ---
    if (startMindButton) {
        startMindButton.addEventListener('click', () => {
            if (uploadedInfoFileContent) {
                activePersistentInstruction = uploadedInfoFileContent; // Activa la instrucción
                uploadedInfoFileContent = ""; // Limpia el contenido temporal
                startMindButton.classList.remove('info-ready'); // Desactiva la animación
                addMessage('bot', '¡Mente iniciada! La IA ahora actuará bajo tu instrucción.');
                // Opcional: podrías limpiar el input del archivo si lo deseas
                infoFileInput.value = ''; 
            } else {
                // Si no hay un archivo cargado, informa al usuario
                addMessage('bot', 'Por favor, carga un archivo de información antes de iniciar la mente de la IA.');
            }
        });
    }
    // --- FIN NUEVA LÓGICA ---

    // --- Funcionalidad existente del chat ---

    // Función para ajustar la altura del textarea dinámicamente
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }
    userInput.addEventListener('input', adjustTextareaHeight);

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

    // Manejo de adjuntos de archivos (Input general)
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
            
            // --- AÑADIDO: Añade la instrucción persistente si está activa ---
            if (activePersistentInstruction) {
                formData.append('persistent_instruction', activePersistentInstruction);
            }

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
