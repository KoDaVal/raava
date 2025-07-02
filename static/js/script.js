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
    
    // --- NUEVO: Variables para la clonación de voz y mensajes de estado ---
    let currentClonedVoiceId = null; // Almacena el ID de la voz clonada temporalmente
    const statusMessageElement = document.getElementById('status-message'); // Elemento para mostrar mensajes de estado
    // --- FIN NUEVO ---

    // --- NUEVO: Elementos y lógica para la barra lateral derecha (info-panel) ---
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

    // --- NUEVO: Evento para cuando se selecciona un archivo de voz ---
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
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
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
            statusMessageElement.textContent = 'Error al conectar con el servidor para clonar la voz.';
            statusMessageElement.style.color = 'red'; // Mensaje de error de conexión
        } finally {
            voiceFileInput.value = ''; // Limpiar el input para permitir futuras subidas
        }
    });
    // --- FIN NUEVO: Evento para cuando se selecciona un archivo de voz ---

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
        userInput.style.height = 'auto'; // Resetear para calcular la altura real
        userInput.style.height = (userInput.scrollHeight) + 'px';
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Mantener scroll abajo
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
            e.preventDefault(); // Previene el salto de línea por defecto
            sendMessage();
        }
    });

    // Función para añadir mensajes al chat y reproducir audio si está disponible
    // ¡MODIFICADO!: Ahora acepta un parámetro audioBase64
    async function addMessage(sender, text, audioBase64 = null) {
        const msg = document.createElement('div');
        msg.classList.add('message', sender);

        const textContentElement = document.createElement('span'); // Para el texto
        textContentElement.textContent = text;
        msg.appendChild(textContentElement);

        messagesContainer.appendChild(msg);

        requestAnimationFrame(() => {
            msg.classList.add('appeared');
            messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll al final
        });

        // --- NUEVO: Lógica para reproducir el audio del bot ---
        if (sender === 'bot' && audioBase64) {
            try {
                const audio = new Audio();
                audio.src = `data:audio/mpeg;base64,${audioBase64}`;
                await audio.play();
                console.log('Audio reproducido con éxito.');
            } catch (error) {
                console.error('Error al reproducir el audio:', error);
                // Opcional: Mostrar un mensaje de error al usuario si el audio no se reproduce
            }
        }
    }
    // --- FIN MODIFICACIÓN addMessage ---


    // Función principal para enviar el mensaje al backend
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (!userMessage && !selectedFile) {
            return; // No hacer nada si no hay mensaje ni archivo
        }

        // Añadir el mensaje del usuario al historial y mostrarlo en el chat
        if (userMessage) {
            await addMessage('user', userMessage);
            conversationHistory.push({ 'role': 'user', 'parts': [{ 'text': userMessage }] });
        } else if (selectedFile) {
            await addMessage('user', `Archivo adjunto: ${selectedFile.name}`);
             // La parte del archivo se añadirá en el backend
        }
        
        userInput.value = ''; // Limpiar el input después de enviar
        adjustTextareaHeight(); // Ajustar altura del textarea

        showTypingIndicator(); // Mostrar el indicador de "escribiendo"

        try {
            const formData = new FormData();
            formData.append('message', userMessage);
            formData.append('history', JSON.stringify(conversationHistory.slice(0, -1))); // Envía todo el historial menos el último mensaje del usuario

            // Si hay un archivo adjunto, lo añade al FormData
            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            const response = await fetch('/chat', { // Asegúrate de que esta URL sea correcta (puede ser '/chat' si es local)
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
            }
            const data = await response.json();
            hideTypingIndicator();
            // ¡MODIFICADO!: Pasa el audio al addMessage si existe
            await addMessage('bot', data.response, data.audio);
            
            // Añadir la respuesta del bot al historial para futuras interacciones
            conversationHistory.push({ 'role': 'model', 'parts': [{ 'text': data.response }] });

            selectedFile = null;
            fileInput.value = '';
            fileDisplay.style.display = 'none';
            adjustTextareaHeight();

        } catch (error) {
            console.error('Error al comunicarse con el backend:', error);
            hideTypingIndicator();
            await addMessage('bot', 'Lo siento, hubo un error al conectar con el chatbot. Por favor, revisa la consola del navegador y asegúrate de que el backend esté corriendo.');
            
            // Si hay un error, el último mensaje del usuario no tendrá respuesta del bot,
            // así que lo quitamos del historial para que no se envíe en la siguiente petición.
            conversationHistory.pop(); // Elimina el último mensaje del usuario del historial
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
