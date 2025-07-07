document.addEventListener('DOMContentLoaded', () => {
    const toggleTheme = document.getElementById('toggle-theme'); // Old theme toggle in sidebar
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

    // --- NUEVOS elementos para el nuevo control de tema y ajustes ---
    const settingsIcon = document.getElementById('settings-icon');
    const settingsDropdown = document.querySelector('.settings-dropdown');
    const newToggleTheme = document.getElementById('new-toggle-theme');

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
                    addMessage('bot', `¡Voz clonada exitosamente! Ahora hablaré con tu voz. ID: ${clonedVoiceId}`);
                } catch (error) {
                    console.error('Error al clonar la voz:', error);
                    addMessage('bot', `Lo siento, no pude clonar la voz. Error: ${error.message}.`);
                }
            }
        });
    }

    // --- NUEVO: Manejo de la subida de archivo de imagen para avatar ---
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                const imageFile = event.target.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarImage.src = e.target.result; // Muestra la imagen seleccionada como avatar
                };
                reader.readAsDataURL(imageFile);
            }
            imageFileInput.value = ''; // Limpiar el input después de la selección
        });
    }

    // --- NUEVO: Manejo de la subida de archivo de información (.txt) ---
    if (infoFileInput) {
        infoFileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                const infoFile = event.target.files[0];
                if (infoFile.type !== 'text/plain') {
                    addMessage('bot', 'Por favor, sube un archivo de texto (.txt) para la información.');
                    infoFileInput.value = '';
                    return;
                }

                addMessage('bot', `Cargando información desde "${infoFile.name}"...`);
                try {
                    const fileContent = await infoFile.text();
                    uploadedInfoFileContent = fileContent;
                    addMessage('bot', `¡Información cargada exitosamente desde "${infoFile.name}"! Ahora puedes iniciar la mente para aplicar esta información.`);
                    startMindButton.style.display = 'block'; // Muestra el botón "Iniciar mente"
                    startMindButton.classList.add('info-ready'); // Añade la clase para cambiar estilo
                } catch (error) {
                    console.error('Error al leer el archivo de información:', error);
                    addMessage('bot', `Lo siento, no pude leer el archivo de información. Error: ${error.message}.`);
                }
            } else {
                startMindButton.style.display = 'none'; // Oculta el botón si no hay archivo
                startMindButton.classList.remove('info-ready');
            }
            infoFileInput.value = ''; // Limpiar el input después de la selección
        });
    }

    // --- NUEVO: Lógica para el botón "Iniciar mente" ---
    if (startMindButton) {
        startMindButton.addEventListener('click', async () => {
            if (uploadedInfoFileContent) {
                activePersistentInstruction = uploadedInfoFileContent;
                addMessage('bot', '¡Mente iniciada! Ahora utilizaré la información cargada en todas nuestras conversaciones.');
                startMindButton.style.display = 'none'; // Oculta el botón después de iniciar la mente
                startMindButton.classList.remove('info-ready');
                uploadedInfoFileContent = ""; // Limpiar el contenido temporal
            } else {
                addMessage('bot', 'Por favor, primero sube un archivo de información.');
            }
        });
    }

    // --- Lógica del tema (ahora para el nuevo botón) ---
    function setTheme(theme) {
        document.body.classList.toggle('light-mode', theme === 'light');
        newToggleTheme.textContent = theme === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
    }

    // Toggle theme with the new button
    if (newToggleTheme) {
        newToggleTheme.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            setTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });
    }

    // Initial theme setup (for the new button)
    setTheme('dark'); // Default to dark mode on load

    // --- Lógica para mostrar/ocultar el menú de ajustes ---
    if (settingsIcon) {
        settingsIcon.addEventListener('click', (event) => {
            settingsDropdown.classList.toggle('show');
            event.stopPropagation(); // Evita que el clic se propague al documento
        });
    }

    // Ocultar el dropdown si se hace clic fuera de él
    document.addEventListener('click', (event) => {
        if (settingsDropdown && !settingsDropdown.contains(event.target) && event.target !== settingsIcon) {
            settingsDropdown.classList.remove('show');
        }
    });

    // --- Manejo del adjunto de archivos (general) ---
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                selectedFile = event.target.files[0];
                fileNameSpan.textContent = selectedFile.name;
                fileDisplay.style.display = 'flex';
                adjustTextareaHeight();
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

    // Ajustar altura del textarea
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }

    userInput.addEventListener('input', adjustTextareaHeight);

    // Función para mostrar el indicador de "escribiendo"
    function showTypingIndicator() {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
            typingIndicatorElement.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(typingIndicatorElement);
        }
        typingIndicatorElement.style.opacity = '1';
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
    }

    // Función para ocultar el indicador de "escribiendo"
    function hideTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.style.opacity = '0';
            // Opcional: remover el elemento después de la transición si ya no se usa
            // setTimeout(() => {
            //     if (typingIndicatorElement && typingIndicatorElement.parentNode) {
            //         typingIndicatorElement.parentNode.removeChild(typingIndicatorElement);
            //         typingIndicatorElement = null;
            //     }
            // }, 300);
        }
    }

    // Función para añadir mensajes al chat
    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        const avatarElement = document.createElement('div');
        avatarElement.classList.add('message-avatar');
        avatarElement.textContent = sender === 'user' ? 'Tú' : 'AI';

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');

        const senderNameElement = document.createElement('span');
        senderNameElement.classList.add('message-sender');
        senderNameElement.textContent = sender === 'user' ? 'Tú' : 'Raava AI';
        contentElement.appendChild(senderNameElement);

        const textNode = document.createElement('p');
        textNode.innerHTML = marked.parse(text); // Procesa Markdown
        contentElement.appendChild(textNode);

        if (audioBase64) {
            const audioElement = document.createElement('audio');
            audioElement.controls = true;
            audioElement.src = `data:audio/mpeg;base64,${audioBase64}`;
            contentElement.appendChild(audioElement);
            // Reproducir automáticamente solo si es un mensaje del bot y no el mensaje inicial
            if (sender === 'bot' && text !== '¡Hola! Soy Raava. ¿En qué puedo ayudarte hoy?') {
                 audioElement.play().catch(e => console.error("Error al intentar reproducir audio:", e));
            }
        }

        // Acciones del mensaje (copiar, regenerar)
        const messageActions = document.createElement('div');
        messageActions.classList.add('message-actions');

        const copyButton = document.createElement('button');
        copyButton.classList.add('message-action-btn', 'copy-btn');
        copyButton.innerHTML = '<i class="far fa-copy"></i>'; // Icono de copiar
        copyButton.title = 'Copiar';
        copyButton.onclick = () => copyToClipboard(text, copyButton);
        messageActions.appendChild(copyButton);

        // Solo añadir botón de regenerar si es un mensaje del bot
        if (sender === 'bot') {
            const regenerateButton = document.createElement('button');
            regenerateButton.classList.add('message-action-btn', 'regenerate-btn');
            regenerateButton.innerHTML = '<i class="fas fa-redo-alt"></i>'; // Icono de regenerar
            regenerateButton.title = 'Regenerar Respuesta';
            regenerateButton.onclick = () => regenerateResponse(conversationHistory[conversationHistory.length - 2]?.parts[0].text); // Pasa el último mensaje del usuario
            messageActions.appendChild(regenerateButton);
        }
        contentElement.appendChild(messageActions);


        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);
        messagesContainer.appendChild(messageElement);

        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Auto-scroll al final
    }

    // Función para copiar al portapapeles
    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            buttonElement.classList.add('copied');
            setTimeout(() => {
                buttonElement.classList.remove('copied');
            }, 2000); // 2 segundos
        }).catch(err => {
            console.error('Error al copiar: ', err);
        });
    }

    // Función para regenerar respuesta
    async function regenerateResponse(lastUserMessage) {
        if (!lastUserMessage) {
            addMessage('bot', 'No hay un mensaje anterior del usuario para regenerar la respuesta.');
            return;
        }
        addMessage('bot', 'Regenerando respuesta...');
        showTypingIndicator();
        try {
            // Eliminar la última respuesta del bot para que la nueva la reemplace
            // Encuentra el último mensaje del bot y lo elimina
            const lastBotMessageElement = messagesContainer.querySelector('.message.bot:last-of-type');
            if (lastBotMessageElement) {
                messagesContainer.removeChild(lastBotMessageElement);
            }

            // Encuentra el penúltimo mensaje en el historial (debería ser el del usuario)
            // y lo envía de nuevo al backend
            if (conversationHistory.length >= 2) {
                conversationHistory.pop(); // Elimina la respuesta anterior del bot del historial
                const userMessageForRegeneration = conversationHistory[conversationHistory.length - 1]; // Obtiene el último mensaje del usuario del historial
                await sendMessageToBackend(userMessageForRegeneration.parts[0].text, userMessageForRegeneration.file);
            }
        } catch (error) {
            console.error('Error al regenerar la respuesta:', error);
            hideTypingIndicator();
            addMessage('bot', 'Lo siento, no pude regenerar la respuesta.');
        }
    }


    // Función para enviar mensaje al backend
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Previene el salto de línea por defecto
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText && !selectedFile) {
            return;
        }

        // Deshabilitar input y botón para evitar envíos múltiples
        userInput.disabled = true;
        sendButton.disabled = true;
        fileInput.disabled = true;
        clearFileButton.disabled = true;

        let userMessageContent = { text: messageText };
        if (selectedFile) {
            userMessageContent.file = selectedFile;
        }

        await addMessage('user', messageText); // Muestra el mensaje del usuario

        userInput.value = '';
        adjustTextareaHeight();
        showTypingIndicator();

        await sendMessageToBackend(messageText, selectedFile);

        // Habilitar input y botón
        userInput.disabled = false;
        sendButton.disabled = false;
        fileInput.disabled = false;
        clearFileButton.disabled = false;
        userInput.focus();
    }

    async function sendMessageToBackend(messageText, file = null) {
        try {
            const formData = new FormData();
            formData.append('message', messageText);
            if (file) {
                formData.append('file', file);
            }
            if (clonedVoiceId) {
                formData.append('cloned_voice_id', clonedVoiceId);
            }
            if (activePersistentInstruction) {
                formData.append('persistent_instruction', activePersistentInstruction);
            }

            // Añadir historial de conversación
            formData.append('conversation_history', JSON.stringify(conversationHistory));


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
            // Pasa el audio (data.audio) a addMessage si existe
            await addMessage('bot', data.response, data.audio);

            // Actualizar historial de conversación
            conversationHistory.push({
                role: 'user',
                parts: [{ text: messageText }],
                file: file ? { name: file.name, type: file.type } : undefined // Guarda metadatos del archivo si existe
            });
            conversationHistory.push({
                role: 'model',
                parts: [{ text: data.response }]
            });

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
