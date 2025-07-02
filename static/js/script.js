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
    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image');

    // --- NUEVAS variables para la instrucción inamovible ---
    let uploadedInfoFileContent = ""; // Contenido del archivo de info subido (temporal)
    let activePersistentInstruction = ""; // La instrucción activa para Gemini

    // Botón de "Iniciar mente"
    const startMindButton = document.getElementById('start-mind-button');

    // --- NUEVAS variables para Eleven Labs ---
    let clonedVoiceId = null; // Almacena el ID de la voz clonada por Eleven Labs

    // Asigna el evento de clic a los botones del panel de información para abrir el selector de archivos
    // Se añade una verificación para asegurar que los elementos existan antes de añadir listeners.
    if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
    if (uploadInfoBtn) uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });

    // --- NUEVO: Manejo de la subida de archivo de voz para clonación ---
    if (voiceFileInput) {
        voiceFileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                const voiceFile = event.target.files[0];
                addMessage('bot', `Clonando voz de "${voiceFile.name}"... Esto puede tardar un momento.`);
                try {
                    const formData = new FormData();
                    formData.append('audio_file', voiceFile);

                    const response = await fetch('https://raava.onrender.com/clone_voice', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorData.error || 'Error desconocido.'}`);
                    }
                    const data = await response.json();
                    clonedVoiceId = data.voice_id; // Almacena el ID de la voz clonada
                    addMessage('bot', `¡Voz clonada exitosamente! Ahora hablaré con tu voz.`);
                } catch (error) {
                    console.error('Error al clonar la voz:', error);
                    addMessage('bot', `Lo siento, hubo un error al clonar la voz. ${error.message}`);
                }
            }
            event.target.value = ''; // Limpiar el input para permitir volver a subir el mismo archivo
        });
    }

    // Evento para reemplazar la imagen del avatar Y ADJUNTARLA AL CHAT
    if (imageFileInput && avatarImage) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                // 1. Cambia el avatar
                const fileURL = URL.createObjectURL(file);
                avatarImage.src = fileURL;
                addMessage('bot', `Se ha actualizado tu avatar con la imagen: ${file.name}.`);

                // 2. También prepara la imagen para ser adjuntada al siguiente mensaje de chat
                selectedFile = file;
                fileNameSpan.textContent = selectedFile.name;
                fileDisplay.style.display = 'flex';
            } else {
                addMessage('bot', 'Por favor, sube un archivo de imagen válido para el avatar.');
                selectedFile = null; // Limpia si el archivo no es válido
                fileNameSpan.textContent = '';
                fileDisplay.style.display = 'none';
            }
            event.target.value = ''; // Limpia el input para permitir volver a subir el mismo archivo
        });
    }

    // --- NUEVO: Manejo del archivo de información Y ADJUNTARLO AL CHAT ---
    if (infoFileInput && startMindButton) {
        infoFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedInfoFileContent = e.target.result;
                    startMindButton.classList.add('info-ready');
                    addMessage('bot', `Archivo de instrucción "${file.name}" cargado. Presiona "Iniciar mente" para activar esta instrucción.`);

                    // También prepara el archivo de texto para ser adjuntado al siguiente mensaje de chat
                    selectedFile = file;
                    fileNameSpan.textContent = selectedFile.name;
                    fileDisplay.style.display = 'flex';
                };
                reader.onerror = () => {
                    addMessage('bot', 'Error al leer el archivo de instrucción. Inténtalo de nuevo.');
                    uploadedInfoFileContent = "";
                    startMindButton.classList.remove('info-ready');
                    selectedFile = null; // Limpia si hay error
                    fileNameSpan.textContent = '';
                    fileDisplay.style.display = 'none';
                };
                reader.readAsText(file);
            } else {
                addMessage('bot', 'Por favor, sube un archivo de texto (.txt) para la instrucción.');
                uploadedInfoFileContent = "";
                startMindButton.classList.remove('info-ready');
                selectedFile = null; // Limpia si no es un archivo de texto
                fileNameSpan.textContent = '';
                fileDisplay.style.display = 'none';
            }
            event.target.value = ''; // Limpia el input del archivo
        });
    }
    
    // --- NUEVO: Lógica del botón "Iniciar mente" ---
    if (startMindButton && infoFileInput) {
        startMindButton.addEventListener('click', () => {
            if (uploadedInfoFileContent) {
                activePersistentInstruction = uploadedInfoFileContent;
                uploadedInfoFileContent = ""; // Limpia el contenido temporal
                startMindButton.classList.remove('info-ready'); // Desactiva la animación
                addMessage('bot', '¡Mente iniciada! La IA ahora actuará bajo tu instrucción.');
                infoFileInput.value = ''; // Limpia el input del archivo
            } else {
                addMessage('bot', 'Por favor, carga un archivo de información antes de iniciar la mente de la IA.');
            }
        });
    }
    // --- FIN NUEVA LÓGICA ---

    // --- Funcionalidad existente del chat ---
    // Lógica del modo oscuro y claro
    if (toggleTheme) {
        toggleTheme.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            toggleTheme.textContent = document.body.classList.contains('light-mode')
                ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
        });
    }

    // Función para ajustar la altura del textarea dinámicamente
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }
    if (userInput) {
        userInput.addEventListener('input', adjustTextareaHeight);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Función para añadir mensajes al contenedor (AHORA CON SOPORTE DE AUDIO)
    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender);

        const textContentElement = document.createElement('span');
        textContentElement.textContent = text;
        messageElement.appendChild(textContentElement);

        if (audioBase64 && sender === 'bot') { // Solo para mensajes del bot que tengan audio
            const audioButton = document.createElement('button');
            audioButton.classList.add('audio-play-button');
            audioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            audioButton.title = 'Reproducir audio';
            audioButton.addEventListener('click', () => {
                playAudio(audioBase64);
            });
            messageElement.appendChild(audioButton);
        }

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

    // Función para reproducir el audio Base64
    function playAudio(base64String) {
        const audio = new Audio(`data:audio/mpeg;base64,${base64String}`);
        audio.play().catch(e => console.error("Error al reproducir audio:", e));
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

    if (sendButton) sendButton.addEventListener('click', sendMessage);

    // Manejo de adjuntos de archivos (Input general)
    if (fileInput) {
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
    }

    if (clearFileButton) {
        clearFileButton.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = '';
            fileDisplay.style.display = 'none';
            adjustTextareaHeight();
        });
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        // El selectedFile ahora puede venir del input principal o de los inputs de la barra lateral
        // Ya no necesitas 'actualFile' de fileInput.files, ya que `selectedFile` se maneja centralmente.

        if (!message && !selectedFile) { // Revisa si el mensaje es vacío Y no hay archivo seleccionado
            return;
        }

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
            // Ahora addMessage acepta el audio Base64
            await addMessage('bot', data.response, data.audio);
            
            // Limpiar selectedFile y fileInput después de enviar el mensaje
            selectedFile = null;
            fileInput.value = ''; // Asegura que el input principal también se limpie
            // No limpiar imageFileInput.value o infoFileInput.value aquí,
            // ya que se limpian en sus propios change listeners.
            fileDisplay.style.display = 'none';
            adjustTextareaHeight();

        } catch (error) {
            console.error('Error al comunicarse con el backend:', error);
            hideTypingIndicator();
            await addMessage('bot', 'Lo siento, hubo un error al conectar con el chatbot. Por favor, revisa la consola del navegador y asegúrate de que el backend esté corriendo.');
            
            conversationHistory.pop(); // Elimina el último mensaje del usuario si falló
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
