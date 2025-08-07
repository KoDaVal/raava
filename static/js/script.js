// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL     = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ═══════════════ Resto de la lógica de Raavax (sin cambios) ═══════════════
document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const newChatBtn = document.getElementById('new-chat-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
if (newChatBtn) {
    newChatBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // Limpia el historial de mensajes
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        currentChatId = null; // Reiniciar ID
      
        if (welcomeScreen) {
            // Asegura que esté visible
            welcomeScreen.classList.remove('hidden');
            welcomeScreen.style.display = 'flex';

            // Reinicia la animación (truco: quitarla y volverla a poner)
            welcomeScreen.style.animation = 'none';
            void welcomeScreen.offsetWidth; // fuerza reflow
            welcomeScreen.style.animation = ''; // vuelve a aplicar la animación original
        }
    });
}
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.querySelector('.messages');
    const fileInput = document.getElementById('file-upload'); // Botón de adjuntar general
    const fileDisplay = document.getElementById('file-display');
    const fileNameSpan = document.getElementById('file-name');
    const clearFileButton = document.getElementById('clear-file');
    let typingIndicatorElement = null;
    let selectedFile = null;
    let currentChatId = null; // ID del chat actual (nuevo o en curso)
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
    // --- ELEMENTOS NUEVOS PARA ACCOUNT ---
const accountNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'Account');
const generalPane = document.querySelector('.settings-pane'); 
const accountPane = document.getElementById('account-pane');
const generalPaneEl = document.getElementById('general-pane');
const navItems = document.querySelectorAll('.settings-nav-item');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');

const navItems = document.querySelectorAll('.settings-nav-item');
const panes = {
  "general": document.getElementById('general-pane'),
  "account": document.getElementById('account-pane'),
};

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const selected = item.id?.replace("nav-", ""); // nav-account → account
    if (!selected || !panes[selected]) return;

    // Quitar activo de todos
    navItems.forEach(i => i.classList.remove('active'));
    Object.values(panes).forEach(p => p.style.display = 'none');

    // Activar el seleccionado
    item.classList.add('active');
    panes[selected].style.display = 'block';
  });
});

const accountAvatarImg = document.getElementById('account-avatar-img');
const accountAvatarBtn = document.getElementById('account-avatar-btn');
const accountAvatarInput = document.getElementById('account-avatar-input');
const accountPlan = document.getElementById('account-plan');
const accountExpiry = document.getElementById('account-expiry');
const cancelPlanBtn = document.getElementById('cancel-plan-btn');


    // --- NUEVAS variables para la instrucción inamovible ---
    let uploadedInfoFileContent = ""; // Contenido del archivo de info subido (temporal)
    let activePersistentInstruction = ""; // La instrucción activa para Gemini

    // Botón de "Iniciar mente"
    const startMindButtons = [
  document.getElementById('start-mind-button'),
  document.getElementById('start-mind-button-mobile')
];

const mobileVoiceLabel = document.querySelector('.mobile-only .voice-button');
const mobileInfoLabel = document.querySelector('.mobile-only .file-button');


    // --- NUEVAS variables para Eleven Labs ---
    let clonedVoiceId = null; // Almacena el ID de la voz clonada por Eleven Labs
    let uploadedVoiceFile = null;

    // --- NUEVOS ELEMENTOS PARA LA BARRA LATERAL IZQUIERDA ---
    const sidebar = document.querySelector('.sidebar');
    const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
    const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
    const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
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
  settingsOption.addEventListener('click', async () => {
    settingsModal.classList.add('active');
    settingsMenu.classList.remove('active');

    // Tema visual
    if (document.body.classList.contains('light-mode')) {
      themeSelect.value = 'light';
    } else {
      themeSelect.value = 'dark';
    }

    // Obtener sesión Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // Mostrar avatar en Account
// Obtener avatar desde la tabla profiles, no desde metadata
const { data: profileData } = await supabaseClient
  .from("profiles")
  .select("plan, plan_expiry, avatar_url")
  .eq("id", user.id)
  .single();

if (profileData) {
  const fallbackAvatar = user.user_metadata?.avatar_url;
  const avatarFinal = profileData.avatar_url || fallbackAvatar;

  if (avatarFinal) {
    accountAvatarImg.src = avatarFinal;
    document.getElementById("header-profile-pic").src = avatarFinal;
  }

  accountPlan.value = profileData.plan;
  accountExpiry.textContent = "Expires: " + (profileData.plan_expiry || "N/A");
  document.getElementById("user-plan-label").textContent = "Plan: " + profileData.plan;
}

  accountPlan.value = profileData.plan;
  accountExpiry.textContent = "Expires: " + (profileData.plan_expiry || "N/A");
  document.getElementById("user-plan-label").textContent = "Plan: " + profileData.plan;
}

    // Mostrar email
    document.getElementById('account-email').value = user.email;

    // Mostrar plan desde Supabase
    try {
      const { data: profileData } = await supabaseClient
        .from("profiles")
        .select("plan, plan_expiry")
        .eq("id", user.id)
        .single();

      if (profileData) {
        accountPlan.value = profileData.plan;
        accountExpiry.textContent = "Expires: " + (profileData.plan_expiry || "N/A");
        document.getElementById("user-plan-label").textContent = "Plan: " + profileData.plan;
      }
    } catch (error) {
      console.error("Error cargando plan del usuario:", error);
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
        if (sidebar.classList.contains('mobile-overlay')) {
            sidebar.classList.toggle('active');
            document.getElementById('sidebar-backdrop').classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            mainContainer.classList.toggle('sidebar-collapsed');
        }
    });
}
    // FIN LÓGICA NUEVA

    // --- NUEVO: Manejo de la subida de archivo de voz para clonación ---
   let voiceReady = false;
let infoReady = false;

function updateMindButtonState() {
    const ready = voiceReady && infoReady;
    startMindButtons.forEach(btn => btn?.classList.toggle('ready', ready));
}

if (voiceFileInput) {
    voiceFileInput.addEventListener('change', (event) => {
      mobileVoiceLabel?.classList.add('ready');
        const voiceFile = event.target.files[0];
        if (voiceFile) {
            uploadedVoiceFile = voiceFile; // Guardamos el archivo globalmente
            voiceReady = true;
            uploadVoiceBtn.classList.add('ready');
            addMessage('bot', `Archivo de voz "${voiceFile.name}" cargado. Presiona "Iniciar mente" para procesarlo.`);
        } 
        else {
            uploadedVoiceFile = null;
            voiceReady = false;
            uploadVoiceBtn.classList.remove('ready');
          mobileVoiceLabel?.classList.remove('ready');
        }
        updateMindButtonState();
        event.target.value = ''; // Limpiamos el input
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
                mobileInfoLabel?.classList.add('ready');
                addMessage('bot', `Instrucción "${file.name}" cargada. Esperando voz para iniciar mente.`);
                updateMindButtonState();
            };
            reader.onerror = () => {
                addMessage('bot', 'Error al leer el archivo de instrucción.');
                uploadedInfoFileContent = "";
                infoReady = false;
                uploadInfoBtn.classList.remove('ready');
                mobileInfoLabel?.classList.remove('ready');
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
startMindButtons.forEach(btn => {
  if (btn) {
    btn.addEventListener('click', async () => {
      // 0. Verificar sesión antes de todo
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      if (!voiceReady || !infoReady) {
        addMessage('bot', 'Carga primero los dos archivos antes de iniciar la mente.');
        return;
      }
      try {
        // 1. Obtener token del usuario autenticado
        const token = session?.access_token;
        if (!token) {
          alert("Debes iniciar sesión para usar esta función.");
          return;
        }

        // 2. Construir FormData
        const formData = new FormData();
        formData.append('instruction', uploadedInfoFileContent);
        formData.append('audio_file', uploadedVoiceFile);

        // 3. Llamar al backend con el token
        const response = await fetch('/start_mind', { 
          method: 'POST', 
          headers: { Authorization: `Bearer ${token}` },
          body: formData 
        });

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        const dataRes = await response.json();
        clonedVoiceId = dataRes.voice_id || null;
        activePersistentInstruction = uploadedInfoFileContent;

        // Resetear estado visual de botones
        [uploadVoiceBtn, mobileVoiceLabel, uploadInfoBtn, mobileInfoLabel, ...startMindButtons].forEach(b => b?.classList.remove('ready'));
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
});

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
    const messageText = messageElement.innerText || messageElement.textContent;
    if (!messageText) {
        console.warn('No hay texto disponible para generar audio.');
        return;
    }

    // Recuperar token del usuario autenticado
    const { data } = await supabaseClient.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
        alert("Debes iniciar sesión para usar TTS.");
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

        // Enviar el texto + token al backend
        const response = await fetch('/generate_audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${token}` // <-- IMPORTANTE
            },
           body: new URLSearchParams({ 
    text: messageText,
    voice_id: clonedVoiceId || ''  // <-- Envia la voz clonada si existe
})
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

    if (sendButton) sendButton.addEventListener('click', async () => {
    // Verificar sesión antes de enviar
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = "/login";
        return;
    }

    // Si hay sesión, ejecuta el envío original
    sendMessage();
});

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
        // Oculta bienvenida y baja la barra de entrada
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        const inputBar = document.getElementById('input-bar');
        if (inputBar && inputBar.classList.contains('initial')) {
        inputBar.classList.remove('initial');
        }
        userInput.value = '';
        adjustTextareaHeight();

        showTypingIndicator();

        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('history', JSON.stringify(conversationHistory));
            if (currentChatId) {
    formData.append('chat_id', currentChatId);
}


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

           const { data: { session } } = await supabaseClient.auth.getSession();
const token = session?.access_token;
if (!token) {
    alert("No hay sesión activa.");
    return;
}

const response = await fetch('/chat', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}` // 🔹 Enviar el token correcto
    },
    body: formData
});

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
            }
            const data = await response.json();
            if (data.chat_id) {
    currentChatId = data.chat_id; // Guardamos el ID del chat
}
            hideTypingIndicator();
            // Pasa el audio (data.audio) a addMessage si existe
            await addMessage('bot', data.response, data.audio);
          conversationHistory = data.updated_history;

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
    // Llama a initializeTheme para establecer el tema y los iconos al cargar la página
    initializeTheme();
    // Solo aplica en móviles
function isMobile() {
    return window.innerWidth <= 768;
}

function handleMobileSidebar() {
    if (isMobile()) {
        sidebar.classList.add('mobile-overlay');
        sidebar.classList.remove('collapsed'); // sidebar oculta con transform
        mainContainer.classList.add('sidebar-collapsed'); // previene scroll detrás
    } else {
        sidebar.classList.remove('mobile-overlay', 'active');
        document.getElementById('sidebar-backdrop').classList.remove('active');
        mainContainer.classList.remove('sidebar-collapsed');
    }
}

handleMobileSidebar();
window.addEventListener('resize', handleMobileSidebar);

document.getElementById('sidebar-backdrop').addEventListener('click', () => {
    sidebar.classList.remove('active');
    document.getElementById('sidebar-backdrop').classList.remove('active');
});
    if (mobileHamburgerBtn) {
    mobileHamburgerBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
        document.getElementById('sidebar-backdrop').classList.add('active');
    });
}
    // --- Cargar perfil al iniciar sesión ---
async function loadUserProfile(user) {
  const avatar = document.getElementById('header-profile-pic');
  if (user.user_metadata?.avatar_url && avatar) {
    avatar.src = user.user_metadata.avatar_url;
  }

  const userPlanLabel = document.getElementById('user-plan-label');
  if (userPlanLabel) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => { 
      userPlanLabel.textContent = `Plan: ${data[0]?.plan || 'essence'}`;
    })
    .catch(err => console.error("Error al cargar el plan:", err));

    supabaseClient
      .channel('public:profiles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => {
        if (payload.new?.plan) userPlanLabel.textContent = `Plan: ${payload.new.plan}`;
      })
      .subscribe();
  }

  // --- Botón logout ---
  const logoutOption = document.getElementById('logout-option');
  if (logoutOption) {
    logoutOption.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }
}

// --- Verificar sesión al cargar ---
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) loadUserProfile(session.user);
})();

// ===== LÓGICA MODAL BÚSQUEDA DE CHATS =====
const chatSearchBtn = document.getElementById('search-chat-btn');
const chatSearchModal = document.getElementById('chat-search-modal');
const chatSearchClose = document.getElementById('chat-search-close');
const chatSearchInput = document.getElementById('chat-search-input');
const chatListContainer = document.getElementById('chat-list');

// Cargar lista de chats desde el backend
// ====== Cargar lista de chats agrupados ======
async function loadChats() {
  chatListContainer.innerHTML = "<p>Cargando...</p>";
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    chatListContainer.innerHTML = "<p>Inicia sesión para ver tus chats.</p>";
    return;
  }

  const res = await fetch('/get_chats', {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  });
  if (!res.ok) {
    chatListContainer.innerHTML = "<p>Error cargando chats.</p>";
    return;
  }

  const groupedChats = await res.json();
  if (!groupedChats || Object.keys(groupedChats).length === 0) {
    chatListContainer.innerHTML = "<p>No tienes chats guardados.</p>";
    return;
  }

  chatListContainer.innerHTML = '';

  // Recorrer grupos (Hoy, Ayer, fechas pasadas)
  for (const group in groupedChats) {
    // Título del grupo
    const groupTitle = document.createElement('div');
    groupTitle.classList.add('chat-group-title');
    groupTitle.textContent = group;
    chatListContainer.appendChild(groupTitle);

    // Chats del grupo
    groupedChats[group].forEach(chat => {
      const item = document.createElement('div');
      item.classList.add('chat-item');
      item.innerHTML = `
        <span class="chat-title">${chat.title || 'Chat sin título'}</span>
        <button class="delete-chat-btn" data-id="${chat.id}"><i class="fas fa-trash"></i></button>
      `;

      // Abrir chat al hacer clic en el título
      item.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id));

      // Eliminar chat
      item.querySelector('.delete-chat-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm("¿Eliminar este chat?")) return;
        await fetch(`/delete_chat/${chat.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        await loadChats(); // Recargar lista
      });

      chatListContainer.appendChild(item);
    });
  }
}

// ====== Abrir un chat (cargar historial) ======
async function openChat(chatId) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    alert("Debes iniciar sesión.");
    return;
  }
  const res = await fetch(`/load_chat/${chatId}`, {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  });
  if (!res.ok) {
    alert("Error cargando el chat.");
    return;
  }
  const chatData = await res.json();
  conversationHistory = chatData.history || [];
    currentChatId = chatId; // Guardar ID


  // Limpiar mensajes visibles
  messagesContainer.innerHTML = '';
  conversationHistory.forEach(msg => {
    const role = msg.role === 'model' ? 'bot' : 'user';
    const text = msg.parts[0].text || '';
    addMessage(role, text);
  });

  // Cerrar el modal
  chatSearchModal.style.display = 'none';
}

// ====== Eventos del modal ======
if (chatSearchBtn) {
  chatSearchBtn.addEventListener('click', async () => {
    chatSearchModal.style.display = 'flex';
    chatSearchInput.value = '';
    await loadChats();
    chatSearchInput.focus();
  });
}

if (chatSearchClose) {
  chatSearchClose.addEventListener('click', () => {
    chatSearchModal.style.display = 'none';
  });
}

chatSearchModal.addEventListener('click', (e) => {
  if (e.target === chatSearchModal) {
    chatSearchModal.style.display = 'none';
  }
});

// ====== Filtro local ======
chatSearchInput.addEventListener('input', () => {
  const term = chatSearchInput.value.toLowerCase();
  document.querySelectorAll('.chat-item').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
  });
});

// --- CAMBIO DE PANE ---
if (accountNavItem) {
  accountNavItem.addEventListener('click', async () => {
    // Quitar "active" de todos los tabs
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    accountNavItem.classList.add('active');

    // Ocultar todos los paneles
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');

    // Mostrar SOLO el de Account
    accountPane.style.display = 'block';
    await loadAccountData();
  });
}

// --- CAMBIO A GENERAL ---
const generalNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'General');
if (generalNavItem) {
  generalNavItem.addEventListener('click', () => {
    document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
    generalNavItem.classList.add('active');

    // Ocultar todos los paneles
    document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');

    // Mostrar SOLO el de General
    generalPane.style.display = 'block';
  });
}

// --- CARGAR DATOS DE PERFIL ---
async function loadAccountData() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('avatar_url, plan, subscription_renewal')
    .eq('id', session.user.id)
    .single();

  // --- Foto ---
  const avatarUrl = profile?.avatar_url || '/static/person.jpg';
  accountAvatarImg.src = avatarUrl;
  document.getElementById('header-profile-pic').src = avatarUrl;

  // --- Plan ---
  accountPlan.textContent = profile?.plan || 'Essence';
  document.getElementById('user-plan-label').textContent = `Plan: ${profile?.plan || 'Essence'}`;

  // --- Fecha de renovación ---
  accountExpiry.textContent = profile?.subscription_renewal
    ? new Date(profile.subscription_renewal).toLocaleDateString()
    : 'Sin fecha';

  // --- Email ---
  const accountEmail = document.getElementById('account-email');
  if (accountEmail) accountEmail.value = session.user.email || 'Sin correo';

  // --- Botón cancelar ---
  cancelPlanBtn.disabled = (profile?.plan || 'essence') === 'essence';
}


// --- CAMBIO DE AVATAR ---
accountAvatarBtn.addEventListener('click', () => accountAvatarInput.click());
accountAvatarInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const { data, error } = await supabaseClient.storage
    .from('avatars')
    .upload(`public/${Date.now()}_${file.name}`, file, { upsert: true });
  if (error) return alert('Error al subir imagen.');

  const publicUrl = supabaseClient.storage.from('avatars').getPublicUrl(data.path).data.publicUrl;
  const { data: { user } } = await supabaseClient.auth.getUser();
  await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
  accountAvatarImg.src = publicUrl;
  document.getElementById('header-profile-pic').src = publicUrl; // <-- Refresca header
});

// --- CANCELAR PLAN ---
cancelPlanBtn.addEventListener('click', async () => {
  if (!confirm('¿Seguro que deseas cancelar tu plan?')) return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  await fetch('/cancel_subscription', { 
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${session.access_token}` } 
  });
  alert('Tu plan ha sido cancelado.');
  loadAccountData();
});
document.getElementById('logout-option')?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

});
