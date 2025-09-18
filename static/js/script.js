// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL     = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ═══════════════ Resto de la lógica de Raavax (sin cambios) ═══════════════// ===== Reproductor global: asegura que solo 1 mensaje suene a la vez =====
window._rxAudioState = {
  audio: null,   // HTMLAudioElement sonando
  button: null   // <button> asociado al audio en reproducción
};

function rxStopGlobalPlayer() {
  try { window._rxAudioState.audio?.pause(); } catch {}
  if (window._rxAudioState.button) {
    window._rxAudioState.button.classList.remove('loading', 'playing');
    window._rxAudioState.button.innerHTML = '<i class="fas fa-play"></i>';
    window._rxAudioState.button.title = 'Reproducir audio';
  }
  window._rxAudioState = { audio: null, button: null };
}

function rxBtnPlay(btn) {
  btn.classList.remove('loading', 'playing');
  btn.innerHTML = '<i class="fas fa-play"></i>';
  btn.title = 'Reproducir audio';
}
function rxBtnPause(btn) {
  btn.classList.remove('loading');
  btn.classList.add('playing');
  btn.innerHTML = '<i class="fas fa-pause"></i>';
  btn.title = 'Pausar audio';
}
function rxBtnLoading(btn) {
  btn.classList.add('loading');
  btn.classList.remove('playing');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.title = 'Generando audio...';
}

document.addEventListener('DOMContentLoaded', () => {
  // ┌───────────────────────────────────────────┐
  // │ 1. SELECCIÓN DE TODOS LOS ELEMENTOS DEL DOM │
  // └───────────────────────────────────────────┘
  const userInput = document.getElementById('user-input');
  const newChatBtn = document.getElementById('new-chat-btn');
  const welcomeScreen = document.getElementById('welcome-screen');
  const sendButton = document.getElementById('send-button');
  const messagesContainer = document.querySelector('.messages');
  const fileInput = document.getElementById('file-upload');
  const fileDisplay = document.getElementById('file-display');
  const fileNameSpan = document.getElementById('file-name');
  const clearFileButton = document.getElementById('clear-file');

  // Menú de adjuntos (+)
  const attachmentMenuBtn = document.getElementById('attachment-menu-btn');
  const attachmentMenu = document.getElementById('attachment-menu');
  const uploadViaMenuLabel = document.getElementById('upload-via-menu');
  
  // Overlay "Crear tu Raava"
  const createRaavaMenuBtn = document.getElementById('create-raava-menu-btn');
  const createRaavaOverlay = document.getElementById('create-raava-overlay');
  const closeRaavaCreationBtn = document.getElementById('close-raava-creation');
  
  // Barra lateral derecha (info-panel)
  const uploadVoiceBtn = document.getElementById('upload-voice-btn');
  const uploadImageBtn = document.getElementById('upload-image-btn');
  const uploadInfoBtn = document.getElementById('upload-info-btn');
  const voiceFileInput = document.getElementById('voice-file-input');
  const imageFileInput = document.getElementById('image-file-input');
  const infoFileInput = document.getElementById('info-file-input');
  const avatarImage = document.getElementById('avatar-image');

  // Encabezado y menú de ajustes
  const headerProfilePic = document.getElementById('header-profile-pic');
  const settingsMenu = document.getElementById('settings-menu');
  const settingsOption = document.getElementById('settings-option');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const themeSelect = document.getElementById('theme-select');
  
  // Panel de Cuenta (Account)
  const accountNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'Account');
  const generalNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'General');
  const accountPane = document.getElementById('account-pane');
  const generalPaneEl = document.getElementById('general-pane');
  const accountAvatarImg = document.getElementById('account-avatar-img');
  const accountAvatarBtn = document.getElementById('account-avatar-btn');
  const accountAvatarInput = document.getElementById('account-avatar-input');
  const accountPlan = document.getElementById('account-plan');
  const accountExpiry = document.getElementById('account-expiry');
  const cancelPlanBtn = document.getElementById('cancel-plan-btn');

  // Botones "Iniciar Mente"
  const startMindButtons = [
    document.getElementById('start-mind-button'),
    document.getElementById('start-mind-button-mobile')
  ];
  const mobileVoiceLabel = document.querySelector('.mobile-only .voice-button');
  const mobileInfoLabel = document.querySelector('.mobile-only .file-button');

  // Barra lateral izquierda
  const sidebar = document.querySelector('.sidebar');
  const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
  const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
  const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
  const mainContainer = document.querySelector('.main-container');

  // Búsqueda de chats
  const chatSearchBtn = document.getElementById('search-chat-btn');
  const chatSearchModal = document.getElementById('chat-search-modal');
  const chatSearchClose = document.getElementById('chat-search-close');
  const chatSearchInput = document.getElementById('chat-search-input');
  const chatListContainer = document.getElementById('chat-list');


  // ┌──────────────────────────────────┐
  // │ 2. LÓGICA Y EVENTOS DE LA APLICACIÓN │
  // └──────────────────────────────────┘
  let typingIndicatorElement = null;
  let selectedFile = null;
  let currentChatId = null;
  let conversationHistory = [];
  let uploadedInfoFileContent = "";
  let activePersistentInstruction = "";
  let clonedVoiceId = null;
  let uploadedVoiceFile = null;
  let voiceReady = false;
  let infoReady = false;

  // --- LÓGICA PARA MENÚS Y OVERLAYS ---
  // Asigna el evento de clic a los botones de acción de escritorio
if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
if (uploadInfoBtn)  uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });
  
  // Función para cerrar el overlay de creación
  function closeCreationOverlay() {
    if (createRaavaOverlay) {
        createRaavaOverlay.classList.remove('active');
    }
  }

  // Muestra/oculta el menú de adjuntos (+)
  if (attachmentMenuBtn) {
    attachmentMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        attachmentMenu.classList.toggle('active');
    });
  }

  // Muestra el overlay al hacer clic en "Crear tu Raava"
  if (createRaavaMenuBtn) {
      createRaavaMenuBtn.addEventListener('click', () => {
          attachmentMenu.classList.remove('active'); // Cierra el menú pequeño
          createRaavaOverlay.classList.add('active');  // Muestra el overlay grande
      });
  }
  
  // Cierra el overlay con su botón 'x'
  if (closeRaavaCreationBtn) {
      closeRaavaCreationBtn.addEventListener('click', closeCreationOverlay);
  }

  // Cierra el menú de adjuntos al seleccionar una opción
  if (uploadViaMenuLabel) {
      uploadViaMenuLabel.addEventListener('click', () => {
          attachmentMenu.classList.remove('active');
      });
  }
  
  // Listener global para cerrar menús al hacer clic fuera
  document.addEventListener('click', (event) => {
      // Cierra el menú de adjuntos
      if (attachmentMenu.classList.contains('active') && !attachmentMenu.contains(event.target) && event.target !== attachmentMenuBtn) {
          attachmentMenu.classList.remove('active');
      }
      // Cierra el overlay de creación
      if (event.target === createRaavaOverlay) {
          closeCreationOverlay();
      }
      // Cierra el menú de perfil
      if (settingsMenu && settingsMenu.classList.contains('active') && !settingsMenu.contains(event.target) && event.target !== headerProfilePic) {
        settingsMenu.classList.remove('active');
      }
  });
  
  // --- FIN DE LÓGICA PARA MENÚS Y OVERLAYS ---


  // --- LÓGICA DEL CHAT ---
  if (newChatBtn) {
    newChatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        currentChatId = null; 
        if (welcomeScreen) {
            welcomeScreen.classList.remove('hidden');
            welcomeScreen.style.display = 'flex';
            welcomeScreen.style.animation = 'none';
            void welcomeScreen.offsetWidth;
            welcomeScreen.style.animation = '';
        }
    });
  }

  // --- (AQUÍ CONTINÚA TODO EL RESTO DE TU CÓDIGO JS, SIN CAMBIOS) ---
  // ... if (sendButton) ...
  // ... if (headerProfilePic) ...
  // ... etc ...
  
    if (sendButton) sendButton.addEventListener('click', async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = "/login";
            return;
        }
        sendMessage();
    });

    if (headerProfilePic) {
        headerProfilePic.addEventListener('click', (event) => {
            settingsMenu.classList.toggle('active');
            event.stopPropagation();
        });
    }

    if (settingsOption) {
        settingsOption.addEventListener('click', async () => {
            settingsModal.classList.add('active');
            settingsMenu.classList.remove('active');
            if (document.body.classList.contains('light-mode')) {
                themeSelect.value = 'light';
            } else {
                themeSelect.value = 'dark';
            }
            const { data: { session } } = await supabaseClient.auth.getSession();
            const user = session?.user;
            if (!user) return;
            let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', user.id)
                .single();
            if (profile?.avatar_url) {
                avatarUrl = profile.avatar_url;
            }
            accountAvatarImg.src = avatarUrl;
            document.getElementById('header-profile-pic').src = avatarUrl;
            document.getElementById('account-email').value = user.email;
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

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            if (event.target.value === 'light') {
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
            } else {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
            }
            applyIconTheme();
        });
    }

    function applyIconTheme() {
        const themeIcons = document.querySelectorAll('.theme-icon');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeIcons.forEach(icon => {
            const darkSrc = icon.getAttribute('data-dark-src');
            const lightSrc = icon.getAttribute('data-light-src');
            if (isDarkMode) {
                if (darkSrc) icon.src = darkSrc;
            } else {
                if (lightSrc) icon.src = lightSrc;
            }
        });
    }

    function initializeTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.body.classList.add(savedTheme + '-mode');
            themeSelect.value = savedTheme;
        } else if (prefersDark) {
            document.body.classList.add('dark-mode');
            themeSelect.value = 'dark';
        } else {
            document.body.classList.add('light-mode');
            themeSelect.value = 'light';
        }
        applyIconTheme();
    }

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

    function updateMindButtonState() {
        const ready = voiceReady && infoReady;
        startMindButtons.forEach(btn => btn?.classList.toggle('ready', ready));
    }

    if (voiceFileInput) {
        voiceFileInput.addEventListener('change', (event) => {
            mobileVoiceLabel?.classList.add('ready');
            const voiceFile = event.target.files[0];
            if (voiceFile) {
                uploadedVoiceFile = voiceFile;
                voiceReady = true;
                uploadVoiceBtn.classList.add('ready');
                addMessage('bot', `Archivo de voz "${voiceFile.name}" cargado. Presiona "Iniciar mente" para procesarlo.`);
            } else {
                uploadedVoiceFile = null;
                voiceReady = false;
                uploadVoiceBtn.classList.remove('ready');
                mobileVoiceLabel?.classList.remove('ready');
            }
            updateMindButtonState();
            event.target.value = '';
        });
    }

    if (imageFileInput && avatarImage) {
        imageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const fileURL = URL.createObjectURL(file);
                avatarImage.src = fileURL;
                addMessage('bot', `Se ha actualizado tu avatar con la imagen: ${file.name}.`);
            } else {
                addMessage('bot', 'Por favor, sube un archivo de imagen válido para el avatar.');
                selectedFile = null;
                fileNameSpan.textContent = '';
                fileDisplay.style.display = 'none';
            }
            event.target.value = '';
        });
    }

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

    startMindButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', async () => {
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
                    const token = session?.access_token;
                    if (!token) {
                        alert("Debes iniciar sesión para usar esta función.");
                        return;
                    }
                    const formData = new FormData();
                    formData.append('instruction', uploadedInfoFileContent);
                    formData.append('audio_file', uploadedVoiceFile);
                    const response = await fetch('/start_mind', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData
                    });
                    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
                    const dataRes = await response.json();
                    clonedVoiceId = dataRes.voice_id || null;
                    activePersistentInstruction = uploadedInfoFileContent;
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

    function renderBotMarkdown(markdown) {
        try {
            const html = marked.parse(markdown ?? "", {
                headerIds: false,
                mangle: false,
                breaks: true,
            });
            return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
        } catch (e) {
            console.warn("Markdown render failed:", e);
            return (markdown ?? "").replace(/\n/g, "<br>");
        }
    }

    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content', sender === 'bot' ? 'bot-content' : 'user-content');
        if (sender === 'bot') {
            messageContentElement.innerHTML = renderBotMarkdown(text);
        } else {
            const safe = (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            messageContentElement.innerHTML = safe;
        }
        messageElement.appendChild(messageContentElement);
        if (sender === 'bot') {
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('message-actions');
            const copyButton = document.createElement('button');
            copyButton.classList.add('message-action-btn', 'copy-btn');
            copyButton.innerHTML = '<i class="far fa-copy"></i>';
            copyButton.title = 'Copiar mensaje';
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    copyButton.classList.add('copied');
                    setTimeout(() => copyButton.classList.remove('copied'), 2000);
                } catch (err) {
                    console.error('Error al copiar el texto: ', err);
                }
            });
            actionsContainer.appendChild(copyButton);
            const playAudioButton = document.createElement('button');
            playAudioButton.classList.add('message-action-btn', 'play-audio-btn');
            playAudioButton.innerHTML = '<i class="fas fa-play"></i>';
            playAudioButton.title = 'Reproducir audio';
            let currentAudioInstance = null;
            playAudioButton.addEventListener('click', async () => {
                const messageText = text;
                if (!messageText.trim()) return;
                if (window._rxAudioState.button && window._rxAudioState.button !== playAudioButton) {
                    rxStopGlobalPlayer();
                }
                if (currentAudioInstance) {
                    if (currentAudioInstance.paused) {
                        await currentAudioInstance.play();
                        rxBtnPause(playAudioButton);
                        window._rxAudioState = { audio: currentAudioInstance, button: playAudioButton };
                    } else {
                        currentAudioInstance.pause();
                        rxBtnPlay(playAudioButton);
                        if (window._rxAudioState.button === playAudioButton) {
                            window._rxAudioState = { audio: null, button: null };
                        }
                    }
                    return;
                }
                try {
                    rxBtnLoading(playAudioButton);
                    const { data } = await supabaseClient.auth.getSession();
                    const token = data.session?.access_token;
                    if (!token) {
                        alert("Debes iniciar sesión para usar TTS.");
                        rxBtnPlay(playAudioButton);
                        return;
                    }
                    const response = await fetch('/generate_audio', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Authorization': `Bearer ${token}`
                        },
                        body: new URLSearchParams({
                            text: messageText,
                            voice_id: clonedVoiceId || ''
                        })
                    });
                    const dataRes = await response.json();
                    if (!response.ok || !dataRes.audio) {
                        console.error('Fallo generate_audio:', response.status, dataRes);
                        rxBtnPlay(playAudioButton);
                        return;
                    }
                    currentAudioInstance = new Audio(`data:audio/mpeg;base64,${dataRes.audio}`);
                    currentAudioInstance.onplay = () => {
                        rxBtnPause(playAudioButton);
                        window._rxAudioState = { audio: currentAudioInstance, button: playAudioButton };
                    };
                    currentAudioInstance.onpause = () => {
                        rxBtnPlay(playAudioButton);
                        if (window._rxAudioState.button === playAudioButton) {
                            window._rxAudioState = { audio: null, button: null };
                        }
                    };
                    currentAudioInstance.onended = () => {
                        rxBtnPlay(playAudioButton);
                        if (window._rxAudioState.button === playAudioButton) {
                            window._rxAudioState = { audio: null, button: null };
                        }
                    };
                    currentAudioInstance.onerror = (e) => {
                        console.error('Error en el audio:', e);
                        rxBtnPlay(playAudioButton);
                        if (window._rxAudioState.button === playAudioButton) {
                            window._rxAudioState = { audio: null, button: null };
                        }
                    };
                    await currentAudioInstance.play();
                } catch (err) {
                    console.error('Error generando/reproduciendo:', err);
                    rxBtnPlay(playAudioButton);
                }
            });
            actionsContainer.appendChild(playAudioButton);
            messageElement.appendChild(actionsContainer);
        }
        messagesContainer.appendChild(messageElement);
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
        if (!message && !selectedFile) {
            console.warn("Intento de envío vacío: no hay mensaje ni archivo adjunto.");
            return;
        }
        let displayMessage = message;
        if (selectedFile) {
            displayMessage += (message ? ' ' : '') + `📎 Archivo adjunto: ${selectedFile.name}`;
        }
        await addMessage('user', displayMessage);
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
            if (activePersistentInstruction) {
                formData.append('persistent_instruction', activePersistentInstruction);
            }
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
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
            }
            const data = await response.json();
            if (data.chat_id) {
                currentChatId = data.chat_id;
            }
            hideTypingIndicator();
            await addMessage('bot', data.response, data.audio);
            conversationHistory = data.updated_history;
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

    initializeTheme();

    function isMobile() {
        return window.innerWidth <= 768;
    }

    function handleMobileSidebar() {
        if (isMobile()) {
            sidebar.classList.add('mobile-overlay');
            sidebar.classList.remove('collapsed');
            mainContainer.classList.add('sidebar-collapsed');
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

    async function loadUserProfile(user) {
        const avatar = document.getElementById('header-profile-pic');
        let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('avatar_url, plan')
            .eq('id', user.id)
            .single();
        if (profile?.avatar_url) {
            avatarUrl = profile.avatar_url;
        }
        if (avatar) {
            avatar.src = avatarUrl;
        }
        const userPlanLabel = document.getElementById('user-plan-label');
        if (userPlanLabel) {
            userPlanLabel.textContent = `Plan: ${profile?.plan || 'Essence'}`;
        }
        const logoutOption = document.getElementById('logout-option');
        if (logoutOption) {
            logoutOption.addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                location.reload();
            });
        }
    }

    (async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) loadUserProfile(session.user);
    })();

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
        for (const group in groupedChats) {
            const groupTitle = document.createElement('div');
            groupTitle.classList.add('chat-group-title');
            groupTitle.textContent = group;
            chatListContainer.appendChild(groupTitle);
            groupedChats[group].forEach(chat => {
                const item = document.createElement('div');
                item.classList.add('chat-item');
                item.innerHTML = `
                    <span class="chat-title">${chat.title || 'Chat sin título'}</span>
                    <button class="delete-chat-btn" data-id="${chat.id}"><i class="fas fa-trash"></i></button>
                `;
                item.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id));
                item.querySelector('.delete-chat-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm("¿Eliminar este chat?")) return;
                    await fetch(`/delete_chat/${chat.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    await loadChats();
                });
                chatListContainer.appendChild(item);
            });
        }
    }

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
        currentChatId = chatId;
        messagesContainer.innerHTML = '';
        conversationHistory.forEach(msg => {
            const role = msg.role === 'model' ? 'bot' : 'user';
            const text = msg.parts[0].text || '';
            addMessage(role, text);
        });
        chatSearchModal.style.display = 'none';
    }

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

    chatSearchInput.addEventListener('input', () => {
        const term = chatSearchInput.value.toLowerCase();
        document.querySelectorAll('.chat-item').forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
        });
    });

    if (accountNavItem) {
        accountNavItem.addEventListener('click', async () => {
            document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
            accountNavItem.classList.add('active');
            document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
            accountPane.style.display = 'block';
            await loadAccountData();
        });
    }

    if (generalNavItem) {
        generalNavItem.addEventListener('click', () => {
            document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
            generalNavItem.classList.add('active');
            document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
            generalPaneEl.style.display = 'block';
        });
    }

    async function loadAccountData() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;
        const user = session.user;
        let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('avatar_url, plan, subscription_renewal')
            .eq('id', user.id)
            .single();
        if (profile?.avatar_url) avatarUrl = profile.avatar_url;
        accountAvatarImg.src = avatarUrl;
        document.getElementById('header-profile-pic').src = avatarUrl;
        accountPlan.textContent = profile?.plan || 'Essence';
        document.getElementById('user-plan-label').textContent = `Plan: ${profile?.plan || 'Essence'}`;
        accountExpiry.textContent = profile?.subscription_renewal ?
            new Date(profile.subscription_renewal).toLocaleDateString() :
            'Sin fecha';
        const accountEmail = document.getElementById('account-email');
        if (accountEmail) accountEmail.value = user.email || 'Sin correo';
        cancelPlanBtn.disabled = (profile?.plan || 'essence') === 'essence';
    }

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
        document.getElementById('header-profile-pic').src = publicUrl;
    });

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
