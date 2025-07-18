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

    // --- Elementos y lógica para la barra lateral derecha gseguro (info-panel) ---
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
    const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
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
                document.body.classList.remove('dark-mode'); // Asegúrate de remover el dark-mode si existe
            } else {
                document.body.classList.add('dark-mode'); // Añade dark-mode si es tema oscuro
                document.body.classList.remove('light-mode'); // Asegúrate de remover el light-mode
            }
            // Llama a la función para actualizar los iconos después de cambiar el tema
            applyIconTheme();
        });
    }

    // --- NUEVA FUNCIÓN: Aplicar el tema a los iconos PNG ---
    function applyIconTheme() {
        // Selecciona todos los elementos de imagen con la clase 'theme-icon'
        const themeIcons = document.querySelectorAll('.theme-icon');
        // Determina si el tema actual del body es 'dark-mode'
        const isDarkMode = document.body.classList.contains('dark-mode');

        themeIcons.forEach(icon => {
            // Obtén la ruta de la imagen oscura del atributo data-dark-src
            const darkSrc = icon.getAttribute('data-dark-src');
            // Obtén la ruta de la imagen clara del atributo data-light-src
            const lightSrc = icon.getAttribute('data-light-src');

            if (isDarkMode) {
                // Si estamos en modo oscuro y existe una ruta oscura, úsala
                if (darkSrc) {
                    icon.src = darkSrc;
                }
            } else {
                // Si estamos en modo claro y existe una ruta clara, úsala
                if (lightSrc) {
                    icon.src = lightSrc;
                } else {
                    // Si no hay lightSrc específico, podrías revertir al src original si lo inicializaste como light
                    // O asegurarte de que el src original en el HTML sea siempre el 'light'
                    // Para ser explícito, es mejor siempre tener lightSrc definido
                }
            }
        });
    }

    // --- NUEVO: Función para determinar el tema inicial y aplicarlo ---
    function initializeTheme() {
        // Primero, intenta detectar la preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        // Si el usuario ya ha seleccionado un tema en `localStorage`, úsalo
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme) {
            // Si hay un tema guardado, úsalo
            document.body.classList.add(savedTheme + '-mode');
            themeSelect.value = savedTheme;
        } else if (prefersDark) {
            // Si no hay tema guardado, usa la preferencia del sistema
            document.body.classList.add('dark-mode');
            themeSelect.value = 'dark';
        } else {
            // Por defecto, usa el modo claro
            document.body.classList.add('light-mode');
            themeSelect.value = 'light';
        }
        // Aplica los iconos una vez que el tema inicial esté establecido
        applyIconTheme();
    }

    // --- Lógica NUEVA para esconder/mostrar la barra lateral ---
   if (hideSidebarBtn) {
    hideSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContainer.classList.toggle('sidebar-collapsed');
    });
}

if (sidebarLogoBtn) {
    sidebarLogoBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContainer.classList.toggle('sidebar-collapsed');
    });
}
    // FIN LÓGICA NUEVA

    // --- NUEVO: Manejo de la subida de archivo de voz para clonación ---
   let voiceReady = false;
let infoReady = false;

function updateMindButtonState() {
    if (voiceReady && infoReady) {
        startMindButton.classList.add('ready');
    } else {
        startMindButton.classList.remove('ready');
    }
}

if (voiceFileInput) {
    voiceFileInput.addEventListener('change', (event) => {
        const voiceFile = event.target.files[0];
        if (voiceFile) {
            voiceReady = true;
            uploadVoiceBtn.classList.add('ready');
            addMessage('bot', `Archivo de voz "${voiceFile.name}" cargado. Presiona "Iniciar mente" para procesarlo.`);
        } else {
            voiceReady = false;
            uploadVoiceBtn.classList.remove('ready');
        }
        updateMindButtonState();
        event.target.value = '';
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
  if (infoFileInput) {
    infoFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedInfoFileContent = e.target.result;
                infoReady = true;
                uploadInfoBtn.classList.add('ready');
                addMessage('bot', `Instrucción "${file.name}" cargada. Esperando voz para iniciar mente.`);
                updateMindButtonState();
            };
            reader.onerror = () => {
                addMessage('bot', 'Error al leer el archivo de instrucción.');
                uploadedInfoFileContent = "";
                infoReady = false;
                uploadInfoBtn.classList.remove('ready');
                updateMindButtonState();
            };
            reader.readAsText(file);
        } else {
            uploadedInfoFileContent = "";
            infoReady = false;
            uploadInfoBtn.classList.remove('ready');
            addMessage('bot', 'Sube un archivo .txt válido para la instrucción.');
            updateMindButtonState();
        }
        event.target.value = '';
    });
}
    // --- Lógica del botón "Iniciar mente" ---
    if (startMindButton) {
    startMindButton.addEventListener('click', async () => {
        if (!voiceReady || !infoReady) {
            addMessage('bot', 'Carga primero los dos archivos antes de iniciar la mente.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('instruction', uploadedInfoFileContent);

            const voiceFile = voiceFileInput.files[0];
            formData.append('audio_file', voiceFile);

            const response = await fetch('https://raava.onrender.com/start_mind', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error HTTP ${response.status}`);
            }

            const data = await response.json();
            clonedVoiceId = data.voice_id || null;
            activePersistentInstruction = uploadedInfoFileContent;

            // Reset visual y lógicas
            uploadVoiceBtn.classList.remove('ready');
            uploadInfoBtn.classList.remove('ready');
            startMindButton.classList.remove('ready');
            voiceReady = false;
            infoReady = false;
            uploadedInfoFileContent = "";

            addMessage('bot', '🧠 ¡Mente iniciada con tu voz e instrucción!');

        } catch (err) {
            console.error(err);
            addMessage('bot', '❌ Hubo un error al iniciar la mente.');
        }
    });
}
    // --- FIN LÓGICA ---

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

        // Crear el contenedor de contenido del mensaje (el "globo")
        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content');

        const textContentElement = document.createElement('span');
        textContentElement.textContent = text;

        // Siempre añadir el texto al messageContentElement
        messageContentElement.appendChild(textContentElement);

        // Añadir el messageContentElement (el globo) al messageElement
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
            // Botón Reproducir Audio
const playAudioButton = document.createElement('button');
playAudioButton.classList.add('message-action-btn', 'play-audio-btn');
playAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
playAudioButton.title = 'Reproducir audio';

let currentAudioInstance = null;

playAudioButton.addEventListener('click', async () => {
    // Obtén el texto del mensaje que quieres convertir en audio
    const messageText = messageElement.innerText || messageElement.textContent;
    if (!messageText) {
        console.warn('No hay texto disponible para generar audio.');
        return;
    }

    // Si ya hay audio reproduciéndose, deténlo
    if (currentAudioInstance && !currentAudioInstance.paused) {
        currentAudioInstance.pause();
        currentAudioInstance.currentTime = 0;
        playAudioButton.classList.remove('playing');
    }

    try {
        playAudioButton.classList.add('loading');
        playAudioButton.classList.remove('playing');

        // Solicita el audio al backend
        const response = await fetch('/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ text: messageText })
        });

        const data = await response.json();
        if (!data.audio) {
            console.warn('No se recibió audio desde el backend.');
            playAudioButton.classList.remove('loading');
            return;
        }

        currentAudioInstance = new Audio(`data:audio/mpeg;base64,${data.audio}`);

        currentAudioInstance.onplay = () => {
            playAudioButton.classList.remove('loading');
            playAudioButton.classList.add('playing');
        };

        currentAudioInstance.onended = () => {
            playAudioButton.classList.remove('playing');
        };

        currentAudioInstance.onerror = (e) => {
            console.error('Error al cargar o reproducir el audio:', e);
            playAudioButton.classList.remove('loading', 'playing');
        };

        await currentAudioInstance.play();
        console.log('Audio iniciado.');

    } catch (error) {
        console.error('Error al generar o reproducir el audio:', error);
        playAudioButton.classList.remove('loading', 'playing');
    }
});

actionsContainer.appendChild(playAudioButton);

            // Añadir el contenedor de acciones al messageElement (FUERA DEL GLOBO)
            messageElement.appendChild(actionsContainer);
        }

        messagesContainer.appendChild(messageElement);

// Oculta la pantalla de bienvenida con animación
const welcomeScreen = document.getElementById('welcome-screen');
if (welcomeScreen) {
    welcomeScreen.classList.add('hidden');
}

messagesContainer.scrollTop = messagesContainer.scrollHeight;

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
        await addMessage('bot', '¡Hola! Soy Raavax. ¿En qué puedo ayudarte hoy?');
    })();

    // Llama a initializeTheme para establecer el tema y los iconos al cargar la página
    initializeTheme();
});
