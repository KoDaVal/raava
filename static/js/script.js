document.addEventListener('DOMContentLoaded', () => {
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

    // NEW FUNCTION: Adjusts the height of the textarea based on its content
    function adjustTextareaHeight() {
        if (userInput) { // Ensure userInput element exists
            userInput.style.height = 'auto'; // Reset height
            userInput.style.height = (userInput.scrollHeight) + 'px'; // Set height to scroll height
            // Optional: Limit max height to prevent it from growing too large
            const maxHeight = window.innerHeight * 0.2; // e.g., 20% of viewport height
            if (userInput.scrollHeight > maxHeight) {
                userInput.style.height = maxHeight + 'px';
                userInput.style.overflowY = 'auto'; // Enable scroll if content exceeds max height
            } else {
                userInput.style.overflowY = 'hidden'; // Hide scroll if not needed
            }
        }
    }

    // ADD THIS LINE: Listen for input events to adjust textarea height
    userInput.addEventListener('input', adjustTextareaHeight);
    // Call adjustTextareaHeight initially on load
    adjustTextareaHeight();

    // --- Elementos y lógica para la barra lateral derecha (info-panel) ---
    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image');

    // --- Elementos NUEVOS para el encabezado y el menú de ajustes ---
    const headerProfilePic = document.getElementById('header-profile-pic');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsOption = document.getElementById('settings-option');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const themeSelect = document.getElementById('theme-select'); // Nuevo selector de tema en ajustes

    // --- NUEVAS variables para la instrucción inamovible ---
    let uploadedInfoFileContent = ""; // Contenido del archivo de info subido (temporal)
    let activePersistentInstruction = ""; // La instrucción activa para Gemini

    // Botón de "Iniciar mente"
    const startMindButton = document.getElementById('start-mind-button');

    // --- NUEVAS variables para Eleven Labs ---
    let clonedVoiceId = null; // Almacena el ID de la voz clonada por Eleven Labs

    // --- NUEVOS ELEMENTOS PARA LA BARRA LATERAL IZQUIERDA ---
    const sidebar = document.querySelector('.sidebar');
    const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
    const mainContainer = document.querySelector('.main-container');
    // FIN NUEVOS ELEMENTOS

    // Asigna el evento de clic a los botones del panel de información para abrir el selector de archivos
    // Se añade una verificación para asegurar que los elementos existan antes de añadir listeners.
    if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
    if (uploadInfoBtn) uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });

    // --- NUEVO: Manejo del clic en la foto de perfil del encabezado para mostrar/ocultar menú ---
    if (headerProfilePic) {
        headerProfilePic.addEventListener('click', (event) => {
            settingsMenu.classList.toggle('active');
            event.stopPropagation(); // Evita que el clic se propague al documento y cierre el menú inmediatamente
        });

        // Cierra el menú si se hace clic fuera de él
        document.addEventListener('click', (event) => {
            if (settingsMenu && settingsMenu.classList.contains('active') && !settingsMenu.contains(event.target) && event.target !== headerProfilePic) {
                settingsMenu.classList.remove('active');
            }
        });
    }

    // --- NUEVO: Manejo del clic en "Ajustes" para abrir el modal de ajustes ---
    if (settingsOption) {
        settingsOption.addEventListener('click', () => {
            settingsModal.classList.add('active');
            settingsMenu.classList.remove('active'); // Cierra el menú de perfil
            // Sincroniza el selector de tema con el modo actual del body
            if (document.body.classList.contains('light-mode')) {
                themeSelect.value = 'light';
            } else {
                themeSelect.value = 'dark';
            }
        });
    }

    // --- NUEVO: Cerrar el modal de ajustes ---
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    // --- NUEVO: Cambiar tema desde el selector dentro del modal de ajustes ---
    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            if (event.target.value === 'light') {
                document.body.classList.add('light-mode');
            } else {
                document.body.classList.remove('light-mode');
            }
        });
    }

    // --- Lógica NUEVA para esconder/mostrar la barra lateral ---
    if (hideSidebarBtn) { // Asegúrate de que el botón exista antes de añadir el listener
        hideSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContainer.classList.toggle('sidebar-collapsed');

            // Cambiar el icono del botón
            const icon = hideSidebarBtn.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-chevron-right'); // Icono de flecha hacia la derecha
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-bars'); // Icono de barras
            }
        });
    }
    // FIN LÓGICA NUEVA

    // --- NUEVO: Manejo de la subida de archivo de voz para clonación ---
    if (voiceFileInput) {
        voiceFileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                const voiceFile = event.target.files[0];
                addMessage('bot', `Clonando voz de "${voiceFile.name}"... Esto puede tardar un momento.`);
                try {
                    const formData = new FormData();
                    formData.append('audio_file', voiceFile);
                    const response = await fetch('https://raava.onrender.com/clone_voice', { method: 'POST', body: formData });
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
    if (imageFileInput) {
        imageFileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                const imageFile = event.target.files[0];
                addMessage('user', 'Adjuntando imagen...'); // Mensaje de usuario al adjuntar
                try {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        avatarImage.src = e.target.result; // Actualiza la imagen del avatar
                    };
                    reader.readAsDataURL(imageFile);

                    // Prepara el archivo para el envío al backend
                    selectedFile = imageFile;
                    fileNameSpan.textContent = imageFile.name;
                    fileDisplay.style.display = 'flex';
                } catch (error) {
                    console.error('Error al cargar la imagen:', error);
                    addMessage('bot', 'No se pudo cargar la imagen.');
                }
            }
            event.target.value = ''; // Limpiar el input para permitir volver a subir el mismo archivo
        });
    }

    // Evento para subir un archivo de texto con "instrucciones inamovibles"
    if (infoFileInput) {
        infoFileInput.addEventListener('change', async (event) => {
            if (event.target.files.length > 0) {
                const infoFile = event.target.files[0];
                addMessage('user', 'Adjuntando archivo de información...'); // Mensaje de usuario

                try {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        uploadedInfoFileContent = e.target.result; // Guarda el contenido para uso futuro

                        // Activa el botón "Iniciar mente" y cambia su estilo
                        if (startMindButton) {
                            startMindButton.disabled = false;
                            startMindButton.classList.add('info-ready');
                        }
                        addMessage('bot', `Archivo "${infoFile.name}" cargado. Haz clic en "Iniciar mente" para que Raava lo procese como una instrucción inamovible.`);
                    };
                    reader.readAsText(infoFile);

                    selectedFile = infoFile; // También establecerlo para que se vea en el file-display
                    fileNameSpan.textContent = infoFile.name;
                    fileDisplay.style.display = 'flex';

                } catch (error) {
                    console.error('Error al leer el archivo de información:', error);
                    addMessage('bot', 'No se pudo cargar el archivo de información.');
                }
            }
            event.target.value = ''; // Limpiar el input para permitir volver a subir el mismo archivo
        });
    }


    // Lógica para el botón "Iniciar mente"
    if (startMindButton) {
        startMindButton.addEventListener('click', async () => {
            if (uploadedInfoFileContent) {
                activePersistentInstruction = uploadedInfoFileContent; // Establece la instrucción activa

                // Envía la instrucción inamovible al backend
                addMessage('bot', 'Procesando instrucción inamovible...');
                try {
                    showTypingIndicator();
                    const response = await fetch('https://raava.onrender.com/set_instruction', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ instruction: activePersistentInstruction })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorData.error || 'Error desconocido.'}`);
                    }

                    hideTypingIndicator();
                    addMessage('bot', '¡Instrucción inamovible procesada y activa! Raava ahora tendrá esto en cuenta en todas las conversaciones.');
                    uploadedInfoFileContent = ""; // Limpia el contenido temporal
                    startMindButton.disabled = true; // Deshabilita el botón después de usar
                    startMindButton.classList.remove('info-ready'); // Quita el estilo de "listo"
                    // Opcional: Limpiar el display del archivo si se considera "usado"
                    selectedFile = null;
                    fileInput.value = '';
                    fileDisplay.style.display = 'none';

                } catch (error) {
                    console.error('Error al establecer la instrucción inamovible:', error);
                    hideTypingIndicator();
                    addMessage('bot', `Lo siento, hubo un error al establecer la instrucción inamovible: ${error.message}`);
                }
            } else {
                addMessage('bot', 'Por favor, sube un archivo de información primero.');
            }
        });
    }


    // Lógica para limpiar el archivo seleccionado del display
    if (clearFileButton) {
        clearFileButton.addEventListener('click', () => {
            selectedFile = null;
            fileInput.value = ''; // Esto es para el input hidden 'file-upload' si lo estás usando
            // Asegúrate de limpiar también los inputs específicos si se usaron
            voiceFileInput.value = '';
            imageFileInput.value = '';
            infoFileInput.value = '';

            fileDisplay.style.display = 'none';
            fileNameSpan.textContent = '';
            // Si el archivo de info estaba listo, desactiva el botón de "Iniciar mente"
            if (startMindButton) {
                startMindButton.disabled = true;
                startMindButton.classList.remove('info-ready');
                uploadedInfoFileContent = ""; // También limpia el contenido temporal
            }
        });
    }

    // Manejo de la subida de archivo general (si tuvieras un solo botón de adjuntar)
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            if (event.target.files.length > 0) {
                selectedFile = event.target.files[0];
                fileNameSpan.textContent = selectedFile.name;
                fileDisplay.style.display = 'flex';
            } else {
                selectedFile = null;
                fileDisplay.style.display = 'none';
                fileNameSpan.textContent = '';
            }
        });
    }

    // Lógica para el indicador de escritura
    function showTypingIndicator() {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('typing-indicator');
            typingIndicatorElement.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(typingIndicatorElement);
            // Asegurarse de que el indicador sea visible
            setTimeout(() => typingIndicatorElement.style.opacity = 1, 10);
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Desplazar al final
    }

    function hideTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.style.opacity = 0;
            typingIndicatorElement.addEventListener('transitionend', () => {
                if (typingIndicatorElement.parentNode) {
                    typingIndicatorElement.parentNode.removeChild(typingIndicatorElement);
                }
                typingIndicatorElement = null;
            }, { once: true });
        }
    }

    // Función para añadir mensajes al chat
    async function addMessage(sender, text, audioUrl = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add(sender + '-message');

        const avatarElement = document.createElement('img');
        avatarElement.classList.add('message-avatar');
        avatarElement.src = sender === 'user' ? avatarImage.src : '/static/raava_logo.png'; // Avatar del usuario o logo de Raava
        avatarElement.alt = sender === 'user' ? 'Mi avatar' : 'Raava AI';

        const contentElement = document.createElement('div');
        contentElement.classList.add('message-content');
        contentElement.textContent = text;

        messageElement.appendChild(avatarElement);
        messageElement.appendChild(contentElement);

        // Si hay URL de audio, añadir botón de reproducción
        if (audioUrl) {
            const audioButton = document.createElement('button');
            audioButton.classList.add('message-audio-button');
            audioButton.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icono de altavoz
            audioButton.title = 'Reproducir audio';
            audioButton.addEventListener('click', () => {
                const audio = new Audio(audioUrl);
                audio.play().catch(e => console.error("Error al reproducir audio:", e));
            });
            contentElement.appendChild(audioButton);
        }

        messagesContainer.appendChild(messageElement);

        // ADD THIS LINE: Scroll to the bottom after adding a message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Limita el historial de conversación para no sobrecargar el token de contexto
        conversationHistory.push({ role: sender === 'user' ? 'user' : 'model', content: text });
        if (conversationHistory.length > 20) { // Mantén solo los últimos 20 mensajes
            conversationHistory.shift();
        }
    }

    // Función para enviar mensaje al backend
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Previene el salto de línea por defecto
            sendMessage();
        }
    });

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '' && !selectedFile) {
            return; // No envía si el mensaje está vacío y no hay archivo
        }

        // Añadir mensaje del usuario al chat
        await addMessage('user', messageText);
        userInput.value = ''; // Limpia el input inmediatamente
        adjustTextareaHeight(); // Ajusta la altura del textarea después de limpiar

        showTypingIndicator(); // Muestra el indicador de escritura

        const formData = new FormData();
        formData.append('message', messageText);
        formData.append('history', JSON.stringify(conversationHistory));

        if (activePersistentInstruction) {
            formData.append('instruction', activePersistentInstruction);
        }
        if (clonedVoiceId) {
            formData.append('voice_id', clonedVoiceId);
        }

        if (selectedFile) {
            formData.append('file', selectedFile);
            formData.append('file_type', selectedFile.type); // Envía el tipo MIME del archivo
        }

        try {
            const response = await fetch('https://raava.onrender.com/chat', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text(); // Intenta leer el texto del error
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
