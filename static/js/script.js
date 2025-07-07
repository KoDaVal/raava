document.addEventListener('DOMContentLoaded', () => {
    // const toggleTheme = document.getElementById('toggle-theme'); // OLD: Esta línea ya no se usa para el toggle de tema principal
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

    // --- Nuevos elementos para el toggle de tema en el menú de ajustes ---
    const settingsIcon = document.getElementById('settings-icon');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const newToggleTheme = document.getElementById('new-toggle-theme'); // NUEVO!

    // Función para establecer el tema (modo claro/oscuro)
    const setTheme = (isLight) => {
        document.body.classList.toggle('light-mode', isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        // Actualiza el texto del botón de modo claro/oscuro en el nuevo menú
        if (newToggleTheme) { // Asegurarse de que el elemento exista
             newToggleTheme.textContent = isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
        }
    };

    // Cargar el tema guardado al cargar la página
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        setTheme(true);
    } else {
        setTheme(false); // Por defecto, modo oscuro
    }

    // Event listener para el nuevo botón de cambio de tema en el menú de ajustes
    if (newToggleTheme) { // Asegurarse de que el elemento exista antes de añadir el listener
        newToggleTheme.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-mode');
            setTheme(!isLight);
        });
    }

    // Event listener para el icono de ajustes para mostrar/ocultar el menú desplegable
    if (settingsIcon && settingsDropdown) {
        settingsIcon.addEventListener('click', (event) => {
            settingsDropdown.classList.toggle('show');
            event.stopPropagation(); // Evitar que el clic en el icono cierre el menú inmediatamente
        });

        // Cerrar el menú desplegable si se hace clic fuera de él
        document.addEventListener('click', (event) => {
            if (!settingsDropdown.contains(event.target) && event.target !== settingsIcon) {
                settingsDropdown.classList.remove('show');
            }
        });
    }

    // --- Lógica del chatbot existente (sin cambios significativos aquí) ---

    // Función para añadir mensajes al chat
    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.innerHTML = text; // Usar innerHTML para permitir HTML básico como enlaces

        messageElement.appendChild(messageContent);

        // Añadir botones de acción solo para mensajes del bot
        if (sender === 'bot') {
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('message-actions');

            // Botón de Copiar
            const copyButton = document.createElement('button');
            copyButton.classList.add('message-action-btn');
            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
            copyButton.title = 'Copiar mensaje';
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(text).then(() => {
                    copyButton.classList.add('copied');
                    setTimeout(() => copyButton.classList.remove('copied'), 2000);
                }).catch(err => {
                    console.error('Error al copiar el texto: ', err);
                });
            });
            actionsContainer.appendChild(copyButton);

            // Botón de Reproducir Audio (solo si hay audio)
            if (audioBase64) {
                const playButton = document.createElement('button');
                playButton.classList.add('message-action-btn');
                playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                playButton.title = 'Reproducir audio';

                const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
                audio.preload = 'none'; // No precargar hasta que se necesite

                let isLoading = false;

                playButton.addEventListener('click', async () => {
                    if (audio.paused) {
                        if (!isLoading) {
                            isLoading = true;
                            playButton.classList.add('loading'); // Añadir animación de carga
                            try {
                                await audio.load(); // Intenta cargar el audio si no está cargado
                                await audio.play();
                                playButton.classList.remove('loading');
                                playButton.classList.add('playing');
                            } catch (e) {
                                console.error("Error al cargar o reproducir el audio:", e);
                                playButton.classList.remove('loading');
                                alert("No se pudo reproducir el audio. Intenta de nuevo más tarde.");
                            } finally {
                                isLoading = false;
                            }
                        }
                    } else {
                        audio.pause();
                        playButton.classList.remove('playing');
                    }
                });

                audio.addEventListener('ended', () => {
                    playButton.classList.remove('playing');
                });
                audio.addEventListener('pause', () => {
                    playButton.classList.remove('playing');
                });
                // Si el audio falla al cargarse por primera vez (ej. red lenta)
                audio.addEventListener('error', () => {
                    console.error("Error al cargar el audio.");
                    playButton.classList.remove('loading');
                    // Opcional: mostrar un mensaje al usuario
                });

                actionsContainer.appendChild(playButton);
            }
            messageElement.appendChild(actionsContainer);
        }

        messagesContainer.appendChild(messageElement);
        // Forzar reflow para que la animación CSS funcione
        messageElement.offsetWidth; 
        messageElement.classList.add('appeared');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Funciones para el indicador de "typing..."
    function showTypingIndicator() {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
            for (let i = 0; i < 3; i++) {
                typingIndicatorElement.appendChild(document.createElement('span'));
            }
            messagesContainer.appendChild(typingIndicatorElement);
            // Forzar reflow para que la animación CSS funcione
            typingIndicatorElement.offsetWidth; 
            typingIndicatorElement.classList.add('appeared');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function hideTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.classList.remove('appeared');
            typingIndicatorElement.addEventListener('transitionend', () => {
                if (typingIndicatorElement && !typingIndicatorElement.classList.contains('appeared')) {
                    typingIndicatorElement.remove();
                    typingIndicatorElement = null;
                }
            }, { once: true });
        }
    }

    // Auto-ajustar la altura del textarea
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    }

    userInput.addEventListener('input', adjustTextareaHeight);

    // Manejo de carga de archivo principal (para input general)
    fileInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileNameSpan.textContent = selectedFile.name;
            fileDisplay.style.display = 'flex';
        } else {
            fileNameSpan.textContent = '';
            fileDisplay.style.display = 'none';
        }
        adjustTextareaHeight(); // Ajustar altura si el área de archivo cambia
    });

    clearFileButton.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = ''; // Limpiar el input para que pueda detectar el mismo archivo si se selecciona de nuevo
        fileNameSpan.textContent = '';
        fileDisplay.style.display = 'none';
        adjustTextareaHeight();
    });

    // --- Lógica de carga de archivos en el info-panel ---
    uploadVoiceBtn.addEventListener('click', () => voiceFileInput.click());
    uploadImageBtn.addEventListener('click', () => imageFileInput.click());
    uploadInfoBtn.addEventListener('click', () => infoFileInput.click());

    voiceFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('audio_file', file);
            showStatusMessage(`Clonando voz de "${file.name}"...`, 'loading');
            try {
                const response = await fetch('/clone_voice', {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                if (response.ok) {
                    showStatusMessage(`Voz clonada: ${data.voice_name}. ID: ${data.voice_id}`, 'success');
                    // Aquí se manejaría el voice_id clonado si fuera necesario en el frontend
                } else {
                    showStatusMessage(`Error al clonar voz: ${data.error}`, 'error');
                }
            } catch (error) {
                console.error('Error al subir archivo de voz:', error);
                showStatusMessage('Error de red al clonar voz.', 'error');
            } finally {
                voiceFileInput.value = ''; // Limpiar el input
            }
        }
    });

    imageFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarImage.src = e.target.result; // Cambiar la imagen del avatar
                showStatusMessage('Imagen de avatar actualizada.', 'success');
            };
            reader.readAsDataURL(file);
        }
        imageFileInput.value = ''; // Limpiar el input
    });

    const fixedPromptInput = document.getElementById('fixed-prompt-input');
    const startMindBtn = document.getElementById('start-mind-btn');

    infoFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedInfoFileContent = e.target.result;
                fixedPromptInput.value = `Información cargada: ${file.name} (${file.size} bytes)`;
                startMindBtn.classList.add('info-ready'); // Activa el estilo visual
                showStatusMessage(`Archivo de información "${file.name}" cargado.`, 'success');
            };
            reader.readAsText(file);
        } else {
            fixedPromptInput.value = '';
            uploadedInfoFileContent = '';
            startMindBtn.classList.remove('info-ready');
            showStatusMessage('Por favor, selecciona un archivo de texto (.txt).', 'error');
        }
        infoFileInput.value = ''; // Limpiar el input
    });

    startMindBtn.addEventListener('click', () => {
        if (uploadedInfoFileContent) {
            activePersistentInstruction = uploadedInfoFileContent;
            fixedPromptInput.value = "Mente Iniciada con la información cargada.";
            startMindBtn.classList.remove('info-ready'); // Desactiva el estilo al iniciar
            showStatusMessage('Mente iniciada con la información proporcionada.', 'success');
        } else {
            showStatusMessage('Por favor, carga un archivo de información primero.', 'error');
        }
    });

    function showStatusMessage(message, type = 'info') {
        const statusMessageDiv = document.getElementById('status-message');
        statusMessageDiv.textContent = message;
        statusMessageDiv.className = ''; // Limpiar clases anteriores
        statusMessageDiv.classList.add(type); // Añadir clase para estilo (info, success, error, loading)
        statusMessageDiv.style.display = 'block'; // Asegurarse de que esté visible

        // Ocultar automáticamente después de unos segundos, a menos que sea 'loading'
        if (type !== 'loading') {
            setTimeout(() => {
                statusMessageDiv.style.display = 'none';
            }, 5000); // Mensaje visible por 5 segundos
        }
    }
    
    // Función para ocultar el mensaje de estado (usado por el indicador de typing)
    function hideStatusMessage() {
        const statusMessageDiv = document.getElementById('status-message');
        if (statusMessageDiv.classList.contains('loading')) {
            statusMessageDiv.style.display = 'none';
        }
    }


    // Lógica para enviar mensajes al backend
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevenir salto de línea
            sendMessage();
        }
    });

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === '' && !selectedFile) {
            return;
        }

        let currentMessageContent = userMessage;

        showTypingIndicator();
        await addMessage('user', userMessage);
        userInput.value = ''; // Limpiar el input
        adjustTextareaHeight(); // Ajustar la altura después de limpiar

        let requestBody = {
            message: userMessage,
            history: conversationHistory,
            persistent_instruction: activePersistentInstruction
        };

        if (selectedFile) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                requestBody.image_data = reader.result.split(',')[1]; // Base64 sin el prefijo
                requestBody.image_mime_type = selectedFile.type;
                await sendRequestToBackend(requestBody);
            };
            reader.readAsDataURL(selectedFile);
        } else {
            await sendRequestToBackend(requestBody);
        }
    }

    async function sendRequestToBackend(requestBody) {
        try {
            const response = await fetch('http://127.0.0.1:5000/chat', { // Asegúrate de que esta URL sea la correcta para tu backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text(); // Leer el cuerpo del error
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
            }
            const data = await response.json();
            hideTypingIndicator();
            // Pasa el audio (data.audio) a addMessage si existe
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
