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
    
    // Variables para la clonación de voz y mensajes de estado
    let currentClonedVoiceId = null; // Almacena el ID de la voz clonada temporalmente
    const statusMessageElement = document.getElementById('status-message'); // Elemento para mostrar mensajes de estado

    // Elementos y lógica para la barra lateral derecha (info-panel)
    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image'); // Referencia a la imagen del avatar

    // Asigna el evento de clic a los botones del panel de información para abrir el selector de archivos
    uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
    uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
    uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });

    // Evento para cuando se selecciona un archivo de voz y se sube para clonar
    voiceFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        // Validación básica para asegurar que es un archivo de audio
        if (file.type && !file.type.startsWith('audio/')) {
            alert('Por favor, selecciona un archivo de audio válido.');
            voiceFileInput.value = ''; // Limpia el input
            return;
        }

        // Mostrar un mensaje de estado al usuario
        statusMessageElement.textContent = 'Subiendo archivo y clonando voz... Esto puede tomar unos segundos.';
        statusMessageElement.style.display = 'block'; // Asegura que el mensaje sea visible
        statusMessageElement.style.color = '#888'; // Color por defecto

        const formData = new FormData();
        formData.append('voice_file', file); // 'voice_file' debe coincidir con el nombre esperado en app.py

        try {
            const response = await fetch('/upload_voice_sample', { // Llama al nuevo endpoint del backend
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Intenta parsear como JSON para ver si hay un mensaje de error específico del backend
                let errorMessage = `Error HTTP: ${response.status} - ${response.statusText}`;
                try {
                    const errorData = JSON.parse(errorText);
                    if (errorData.message) errorMessage += `. ${errorData.message}`;
                } catch (e) {
                    errorMessage += `. ${errorText}`; // Si no es JSON, usa el texto crudo
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (data.success) {
                currentClonedVoiceId = data.voice_id; // Almacena el ID de la voz clonada
                statusMessageElement.textContent = `Voz clonada con éxito. ID: ${currentClonedVoiceId.substring(0, 8)}... Ahora el bot usará esta voz.`;
                statusMessageElement.style.color = 'lightgreen'; // Mensaje de éxito en verde
            } else {
                statusMessageElement.textContent = `Error al clonar voz: ${data.message}`;
                statusMessageElement.style.color = 'red'; // Mensaje de error en rojo
            }
        } catch (error) {
            console.error('Error al subir archivo de voz:', error);
            statusMessageElement.textContent = 'Error al conectar con el servidor para clonar la voz. Revisa la consola y tu clave API.';
            statusMessageElement.style.color = 'red'; // Mensaje de error de conexión
        } finally {
            voiceFileInput.value = ''; // Limpiar el input para permitir futuras subidas
        }
    });

    // Lógica para el toggle theme
    toggleTheme.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        toggleTheme.textContent = document.body.classList.contains('light-mode')
            ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
    });

    // Lógica para mostrar/ocultar el indicador de "escribiendo"
    function showTypingIndicator() {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
            typingIndicatorElement.innerHTML = `
                <span></span>
                <span></span>
                <span></span>
            `;
            messagesContainer.appendChild(typingIndicatorElement);
        }
        typingIndicatorElement.style.display = 'flex';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.style.display = 'none';
        }
    }

    // Función para ajustar la altura del textarea
    function adjustTextareaHeight() {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    userInput.addEventListener('input', adjustTextareaHeight);

    clearFileButton.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        fileDisplay.style.display = 'none';
        adjustTextareaHeight();
    });

    fileInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileNameSpan.textContent = selectedFile.name;
            fileDisplay.style.display = 'flex';
            adjustTextareaHeight();
        } else {
            fileDisplay.style.display = 'none';
        }
    });

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // --- MODIFICACIÓN CLAVE: addMessage para incluir botones y lógica de audio ---
    async function addMessage(sender, text, audioBase64 = null) {
        const msg = document.createElement('div');
        msg.classList.add('message', sender);

        const textContentElement = document.createElement('span');
        textContentElement.textContent = text;
        msg.appendChild(textContentElement);

        // Si es un mensaje del bot, añade los botones de acción
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
            const playAudioButton = document.createElement('button');
            playAudioButton.classList.add('message-action-btn', 'play-audio-btn');
            playAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>'; // Icono de volumen de FontAwesome
            playAudioButton.title = 'Reproducir audio';
            
            // Variable para almacenar la instancia de Audio y controlar su estado
            let currentAudioInstance = null;

            playAudioButton.addEventListener('click', async () => {
                if (!audioBase64) {
                    console.warn('No hay audio disponible para este mensaje.');
                    // Opcional: Podrías deshabilitar el botón o mostrar un mensaje al usuario
                    return;
                }

                // Si ya hay un audio reproduciéndose, páusalo y reinícialo
                if (currentAudioInstance && !currentAudioInstance.paused) {
                    currentAudioInstance.pause();
                    currentAudioInstance.currentTime = 0; // Reinicia el audio
                    playAudioButton.classList.remove('playing');
                    // No salimos aquí, permitimos que se reproduzca de nuevo si se hizo clic para detener y luego reproducir
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

            msg.appendChild(actionsContainer);
        }

        messagesContainer.appendChild(msg);

        requestAnimationFrame(() => {
            msg.classList.add('appeared');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    }
    // --- FIN MODIFICACIÓN addMessage ---


    // Función principal para enviar el mensaje al backend
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage && !selectedFile) {
            return;
        }

        if (userMessage) {
            await addMessage('user', userMessage);
            conversationHistory.push({ 'role': 'user', 'parts': [{ 'text': userMessage }] });
        } else if (selectedFile) {
            await addMessage('user', `Archivo adjunto: ${selectedFile.name}`);
        }
        
        userInput.value = '';
        adjustTextareaHeight();

        showTypingIndicator();

        try {
            const formData = new FormData();
            formData.append('message', userMessage);
            formData.append('history', JSON.stringify(conversationHistory.slice(0, -1)));

            if (selectedFile) {
                formData.append('file', selectedFile);
            }
            
            // --- ¡IMPORTANTE! MODIFICA ESTA URL CON LA DE TU DEPLOYMENT EN RENDER ---
            const response = await fetch('https://raava.onrender.com/chat', { // <-- VERIFICA Y CAMBIA ESTA URL
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
            
            conversationHistory.push({ 'role': 'model', 'parts': [{ 'text': data.response }] });

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
