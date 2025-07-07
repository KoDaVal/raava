document.addEventListener('DOMContentLoaded', () => {
    // Cambiar la referencia a 'toggle-theme-chat'
    const settingsButton = document.getElementById('settings-button'); // Nuevo botón de ajustes
    const settingsDropdown = document.getElementById('settings-dropdown'); // Nuevo menú desplegable
    const toggleLightModeOption = document.getElementById('toggle-light-mode'); // Nueva opción de modo claro/oscuro
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

    // --- CORRECCIÓN: Manejo del archivo de información (ya no adjunta al chat principal) ---
    if (infoFileInput && startMindButton) {
        infoFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedInfoFileContent = e.target.result;
                    startMindButton.classList.add('info-ready');
                    addMessage('bot', `Archivo de instrucción "${file.name}" cargado. Presiona "Iniciar mente" para activar esta instrucción.`);
                    
                    // COMENTADO: Estas líneas ya no son necesarias aquí, ya que el archivo de información
                    // no debe aparecer como un archivo adjunto en la barra de chat principal.
                    // selectedFile = file;
                    // fileNameSpan.textContent = file.name;
                    // fileDisplay.style.display = 'flex';
                };
                reader.onerror = () => {
                    addMessage('bot', 'Error al leer el archivo de instrucción. Inténtalo de nuevo.');
                    uploadedInfoFileContent = "";
                    startMindButton.classList.remove('info-ready');
                    // COMENTADO: Limpiar también si hay error, pero solo la lógica de información.
                    // selectedFile = null;
                    // fileNameSpan.textContent = '';
                    // fileDisplay.style.display = 'none';
                };
                reader.readAsText(file);
            } else {
                addMessage('bot', 'Por favor, sube un archivo de texto (.txt) para la instrucción.');
                uploadedInfoFileContent = "";
                startMindButton.classList.remove('info-ready');
                // COMENTADO: Limpiar si no es un archivo de texto válido.
                // selectedFile = null;
                // fileNameSpan.textContent = '';
                // fileDisplay.style.display = 'none';
            }
            event.target.value = ''; // Limpia el input del archivo
        });
    }
    
    // --- Lógica del botón "Iniciar mente" ---
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
    // --- FIN LÓGICA ---

    // --- Funcionalidad del botón de Ajustes y menú desplegable ---
    if (settingsButton && settingsDropdown && toggleLightModeOption) {
        settingsButton.addEventListener('click', (event) => {
            settingsDropdown.classList.toggle('active');
            event.stopPropagation(); // Evita que el clic se propague al documento y cierre el menú
        });

        toggleLightModeOption.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            // Cambiar el texto de la opción según el modo actual
            toggleLightModeOption.textContent = document.body.classList.contains('light-mode')
                ? 'Modo Oscuro' : 'Modo Claro';
            settingsDropdown.classList.remove('active'); // Cierra el menú después de seleccionar
        });

        // Cierra el menú si se hace clic fuera de él
        document.addEventListener('click', (event) => {
            if (!settingsDropdown.contains(event.target) && !settingsButton.contains(event.target)) {
                settingsDropdown.classList.remove('active');
            }
        });
    }


    // El botón "Iniciar Sesión" (el antiguo toggle-theme)
    const loginButton = document.getElementById('toggle-theme'); 
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault(); // Previene cualquier acción por defecto
            console.log('Botón de Iniciar Sesión clickeado (no hace nada).');
            // Puedes añadir aquí un mensaje en la interfaz si lo deseas, por ejemplo:
            // addMessage('bot', 'La función de inicio de sesión no está implementada.');
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

    // Función para añadir mensajes al contenedor (AHORA CON SOPORTE DE AUDIO Y COPIAR)
    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender);

        // Crear el contenedor de contenido del mensaje (el "globo" para usuario, o solo texto para bot)
        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content');

        const textContentElement = document.createElement('span');
        textContentElement.textContent = text;
        
        // Siempre añadir el texto al messageContentElement
        messageContentElement.appendChild(textContentElement);
        
        // Añadir el messageContentElement (el globo o el texto puro) al messageElement
        messageElement.appendChild(messageContentElement);
        
        // **AQUÍ ESTÁ LA MODIFICACIÓN CLAVE EN SCRIPT.JS PARA QUE LOS BOTONES ESTÉN FUERA DEL GLOBO**
        if (sender === 'bot') {
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('message-actions');

            // Botón Copiar Mensaje
            const copyButton = document.createElement('button');
            copyButton.classList.add('message-action-btn', 'copy-btn');
            copyButton.innerHTML = '<i class="far fa-copy"></i>'; // Icono de copiar de FontAwesome
            copyButton.title = 'Copiar mensaje';
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    copyButton.classList.add('copied'); // Añade clase para animación de "Copiado!"
                    setTimeout(() => copyButton.classList.remove('copied'), 2000); // Quita la clase después de 2 segundos
                } catch (err) {
                    console.error('Error al copiar el texto: ', err);
                }
            });
            actionsContainer.appendChild(copyButton);

            // Botón Reproducir Audio
            if (audioBase64) { // Solo añadir el botón si hay audio disponible
                const playAudioButton = document.createElement('button');
                playAudioButton.classList.add('message-action-btn', 'play-audio-btn');
                playAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icono de volumen de FontAwesome
                playAudioButton.title = 'Reproducir audio';
                
                let currentAudioInstance = null; // Variable para almacenar la instancia de Audio y controlar su estado

                playAudioButton.addEventListener('click', async () => {
                    if (!audioBase64) {
                        console.warn('No hay audio disponible para este mensaje.');
                        return;
                    }

                    // Si ya hay un audio reproduciéndose, páusalo y reinícialo
                    if (currentAudioInstance && !currentAudioInstance.paused) {
                        currentAudioInstance.pause();
                        currentAudioInstance.currentTime = 0; // Reinicia el audio
                        playAudioButton.classList.remove('playing');
                    }

                    try {
                        playAudioButton.classList.add('loading'); // Muestra indicador de carga (spinner)
                        playAudioButton.classList.remove('playing'); // Asegura que no tenga la clase 'playing'

                        currentAudioInstance = new Audio();
                        currentAudioInstance.src = `data:audio/mpeg;base64,${audioBase64}`;
                            
                        // Evento para cuando el audio empieza a reproducirse
                        currentAudioInstance.onplay = () => {
                            playAudioButton.classList.remove('loading');
                            playAudioButton.classList.add('playing');
                        };

                        // Evento para cuando el audio termina
                        currentAudioInstance.onended = () => {
                            playAudioButton.classList.remove('playing');
                        };

                        // Evento para errores de carga o reproducción
                        currentAudioInstance.onerror = (e) => {
                            console.error('Error al cargar o reproducir el audio:', e);
                            playAudioButton.classList.remove('loading', 'playing');
                            // Puedes mostrar un error visual al usuario aquí
                        };

                        await currentAudioInstance.play();
                        console.log('Audio iniciado.');

                    } catch (error) {
                        console.error('Error al reproducir el audio:', error);
                        playAudioButton.classList.remove('loading', 'playing');
                    }
                });
                actionsContainer.appendChild(playAudioButton);
            }
            
            // Añadir el contenedor de acciones al messageElement (FUERA DEL GLOBO)
            messageElement.appendChild(actionsContainer);
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
            console.warn("Intento de envío vacío: no hay mensaje ni archivo adjunto.");
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

            // --- AÑADIDO: Si hay un voiceId clonado, envíalo también ---
            if (clonedVoiceId) {
                formData.append('cloned_voice_id', clonedVoiceId);
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
