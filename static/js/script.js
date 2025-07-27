// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════ Estado y Helpers ═══════════════
let isLoginMode = true;
function showOverlay() { document.getElementById('auth-overlay').style.display = 'flex'; }
function hideOverlay() { document.getElementById('auth-overlay').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════ Elementos Auth ═══════════════
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    const confirmWrapper = document.getElementById('confirm-password-wrapper');
    const confirmInput = document.getElementById('auth-confirm-password');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');
    const googleBtn = document.getElementById('google-signin');
    const githubBtn = document.getElementById('github-signin');
    const successContainer = document.getElementById('auth-success');
    const successBtn = document.getElementById('auth-success-btn');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const forgotPasswordEmail = document.getElementById('forgot-password-email');
    const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
    const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
    const logoutOption = document.getElementById('logout-option');
    const passwordStrength = document.getElementById('password-strength');
    const eyeToggle = document.getElementById('toggle-password');
    const confirmEyeToggle = document.getElementById('toggle-confirm-password');

    // ═══════════════ Elementos Chat & UI ═══════════════
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const messagesContainer = document.querySelector('.messages');
    const newChatBtn = document.getElementById('new-chat-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const fileInput = document.getElementById('file-upload');
    const fileDisplay = document.getElementById('file-display');
    const fileNameSpan = document.getElementById('file-name');
    const clearFileButton = document.getElementById('clear-file');

    // Panel derecho
    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image');

    // Header y ajustes
    const headerProfilePic = document.getElementById('header-profile-pic');
    const settingsMenu = document.getElementById('settings-menu');
    const settingsOption = document.getElementById('settings-option');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const themeSelect = document.getElementById('theme-select');

    // Barra lateral
    const sidebar = document.querySelector('.sidebar');
    const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
    const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
    const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
    const mainContainer = document.querySelector('.main-container');

    // Botones de "Iniciar mente"
    const startMindButtons = [
        document.getElementById('start-mind-button'),
        document.getElementById('start-mind-button-mobile')
    ];
    const mobileVoiceLabel = document.querySelector('.mobile-only .voice-button');
    const mobileInfoLabel = document.querySelector('.mobile-only .file-button');

    // ═══════════════ Variables de estado ═══════════════
    let typingIndicatorElement = null;
    let selectedFile = null;
    let conversationHistory = [];
    let uploadedInfoFileContent = "";
    let activePersistentInstruction = "";
    let clonedVoiceId = null;
    let uploadedVoiceFile = null;
    let voiceReady = false;
    let infoReady = false;

    // ═══════════════ Eventos de recuperación de contraseña ═══════════════
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            authForm.style.display = 'none';
            successContainer.style.display = 'none';
            forgotPasswordContainer.style.display = 'block';
        });
    }
    if (forgotPasswordCancel) {
        forgotPasswordCancel.addEventListener('click', () => {
            forgotPasswordContainer.style.display = 'none';
            authForm.style.display = 'block';
        });
    }
    if (forgotPasswordSubmit) {
        forgotPasswordSubmit.addEventListener('click', async () => {
            const email = forgotPasswordEmail.value.trim();
            if (!email) { alert("Ingresa tu correo."); return; }
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });
            if (error) alert("Error: " + error.message);
            else {
                alert("Te enviamos un enlace para restablecer tu contraseña.");
                forgotPasswordContainer.style.display = 'none';
                authForm.style.display = 'block';
            }
        });
    }

    // ═══════════════ Logout ═══════════════
    if (logoutOption) {
        logoutOption.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            location.reload();
        });
    }

    // ═══════════════ Inicializar estado ═══════════════
    confirmWrapper.style.display = 'none';
    confirmInput.disabled = true;
    confirmInput.required = false;
    passwordStrength.style.display = 'none';

    // ═══════════════ Mostrar/ocultar contraseña ═══════════════
    eyeToggle.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        eyeToggle.querySelector('i').classList.toggle('fa-eye-slash');
        eyeToggle.querySelector('i').classList.toggle('fa-eye');
    });
    confirmEyeToggle.addEventListener('click', () => {
        const type = confirmInput.type === 'password' ? 'text' : 'password';
        confirmInput.type = type;
        confirmEyeToggle.querySelector('i').classList.toggle('fa-eye-slash');
        confirmEyeToggle.querySelector('i').classList.toggle('fa-eye');
    });

    // ═══════════════ Fuerza de contraseña ═══════════════
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(val);
        passwordStrength.textContent = strong
            ? 'Fuerza: ✅ Cumple requisitos'
            : 'Fuerza: mínimo 8 caracteres, 1 mayúscula, 1 especial';
        passwordStrength.style.color = strong ? 'lightgreen' : 'salmon';
    });

    // ═══════════════ Cambiar entre login y registro ═══════════════
    toggleLink.addEventListener('click', e => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            submitBtn.textContent = 'Iniciar sesión';
            toggleText.textContent = '¿No tienes cuenta? ';
            toggleLink.textContent = 'Regístrate';
            confirmWrapper.style.display = 'none';
            confirmInput.disabled = true;
            confirmInput.required = false;
            passwordStrength.style.display = 'none';
        } else {
            submitBtn.textContent = 'Registrarse';
            toggleText.textContent = '¿Ya tienes cuenta? ';
            toggleLink.textContent = 'Inicia sesión';
            confirmWrapper.style.display = 'flex';
            confirmInput.disabled = false;
            confirmInput.required = true;
            passwordStrength.style.display = 'inline-block';
        }
        toggleText.appendChild(toggleLink);
    });

    // ═══════════════ Envío del formulario ═══════════════
    authForm.addEventListener('submit', async e => {
        e.preventDefault();
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) { alert('Por favor, confirma el reCAPTCHA.'); return; }
        const captchaCheck = await fetch('/verify_captcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: recaptchaResponse })
        });
        const captchaResult = await captchaCheck.json();
        if (!captchaResult.success) { alert('Error al verificar el reCAPTCHA. Inténtalo de nuevo.'); return; }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password || (!isLoginMode && !confirmInput.value)) {
            alert('Por favor, ingresa tu correo y contraseña.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = isLoginMode ? 'Iniciando sesión...' : 'Registrando...';

        try {
            if (isLoginMode) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) {
                    const msg = error.message;
                    if (msg.includes('Invalid login credentials')) alert('Correo o contraseña incorrectos.');
                    else if (msg.includes('Email not confirmed')) alert('Tu correo aún no ha sido confirmado.');
                    else alert(`Error al iniciar sesión: ${msg}`);
                    console.error(error);
                    return;
                }
                if (data?.session) loadUserProfile(data.user);
                else alert('Inicio de sesión fallido. Verifica tus credenciales.');
            } else {
                if (password !== confirmInput.value) { alert('Las contraseñas no coinciden.'); return; }
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) { alert(`Error al registrarse: ${error.message}`); console.error(error); return; }
                authForm.style.display = 'none';
                successContainer.style.display = 'block';
            }
        } catch (err) {
            console.error(err);
            alert('Ocurrió un error inesperado. Inténtalo de nuevo.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        }
    });

    // ═══════════════ Botones sociales ═══════════════
    successBtn.addEventListener('click', () => location.reload());
    googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
    githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));

    // ═══════════════ Manejo de sesión ═══════════════
    supabaseClient.auth.onAuthStateChange((_, session) => {
        if (session?.user) loadUserProfile(session.user);
        else showOverlay();
    });
    (async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) loadUserProfile(session.user);
        else showOverlay();
    })();

    // ═══════════════ Cargar perfil ═══════════════
    function loadUserProfile(user) {
        hideOverlay();
        const avatar = document.getElementById('header-profile-pic');
        if (user.user_metadata?.avatar_url && avatar) avatar.src = user.user_metadata.avatar_url;

        const userPlanLabel = document.getElementById('user-plan-label');
        if (userPlanLabel) {
            supabaseClient.auth.getSession().then(({ data }) => {
                const token = data.session?.access_token;
                fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
                    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
                })
                    .then(res => res.json())
                    .then(data => { userPlanLabel.textContent = `Plan: ${data[0]?.plan || 'essence'}`; })
                    .catch(err => console.error("Error al cargar el plan:", err));
            });
            supabaseClient
                .channel('public:profiles')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => {
                    if (payload.new?.plan) userPlanLabel.textContent = `Plan: ${payload.new.plan}`;
                })
                .subscribe();
        }
    }

    // ═══════════════ NUEVO CHAT ═══════════════
    if (newChatBtn) {
        newChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            messagesContainer.innerHTML = '';
            conversationHistory = [];
            if (welcomeScreen) {
                welcomeScreen.classList.remove('hidden');
                welcomeScreen.style.display = 'flex';
                welcomeScreen.style.animation = 'none';
                void welcomeScreen.offsetWidth;
                welcomeScreen.style.animation = '';
            }
        });
    }

    // ═══════════════ Ajustes de tema ═══════════════
    function applyIconTheme() {
        const themeIcons = document.querySelectorAll('.theme-icon');
        const isDarkMode = document.body.classList.contains('dark-mode');
        themeIcons.forEach(icon => {
            const darkSrc = icon.getAttribute('data-dark-src');
            const lightSrc = icon.getAttribute('data-light-src');
            if (isDarkMode && darkSrc) icon.src = darkSrc;
            else if (!isDarkMode && lightSrc) icon.src = lightSrc;
        });
    }

    function initializeTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) document.body.classList.add(savedTheme + '-mode');
        else if (prefersDark) document.body.classList.add('dark-mode');
        else document.body.classList.add('light-mode');
        themeSelect.value = savedTheme || (prefersDark ? 'dark' : 'light');
        applyIconTheme();
    }

    if (settingsOption) {
        settingsOption.addEventListener('click', () => {
            settingsModal.classList.add('active');
            settingsMenu.classList.remove('active');
            themeSelect.value = document.body.classList.contains('light-mode') ? 'light' : 'dark';
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => { settingsModal.classList.remove('active'); });
    }
    if (themeSelect) {
        themeSelect.addEventListener('change', (event) => {
            if (event.target.value === 'light') {
                document.body.classList.add('light-mode'); document.body.classList.remove('dark-mode');
            } else {
                document.body.classList.add('dark-mode'); document.body.classList.remove('light-mode');
            }
            localStorage.setItem('theme', event.target.value);
            applyIconTheme();
        });
    }

    // ═══════════════ Sidebar ═══════════════
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
    function isMobile() { return window.innerWidth <= 768; }
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

    // ═══════════════ Subida de archivos ═══════════════
    function updateMindButtonState() {
        const ready = voiceReady && infoReady;
        startMindButtons.forEach(btn => btn?.classList.toggle('ready', ready));
    }

    if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => voiceFileInput.click());
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => imageFileInput.click());
    if (uploadInfoBtn) uploadInfoBtn.addEventListener('click', () => infoFileInput.click());

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
                if (!voiceReady || !infoReady) {
                    addMessage('bot', 'Carga primero los dos archivos antes de iniciar la mente.');
                    return;
                }
                try {
                    const formData = new FormData();
                    formData.append('instruction', uploadedInfoFileContent);
                    formData.append('audio_file', uploadedVoiceFile);

                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const userId = session?.user?.id;
                    if (!userId) { addMessage('bot', 'Debes iniciar sesión antes de usar esta función.'); return; }

                    const response = await fetch('/start_mind', {
                        method: 'POST',
                        headers: { 'X-User-Id': userId },
                        body: formData
                    });

                    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
                    const data = await response.json();
                    clonedVoiceId = data.voice_id || null;
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

    // ═══════════════ Funciones Chat ═══════════════
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

    async function addMessage(sender, text, audioBase64 = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        const messageContentElement = document.createElement('div');
        messageContentElement.classList.add('message-content');

        const textContentElement = document.createElement('span');
        textContentElement.textContent = text;
        messageContentElement.appendChild(textContentElement);
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
            playAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            playAudioButton.title = 'Reproducir audio';
            let currentAudioInstance = null;

            playAudioButton.addEventListener('click', async () => {
                const messageText = messageElement.innerText || messageElement.textContent;
                if (!messageText) { console.warn('No hay texto disponible para generar audio.'); return; }
                if (currentAudioInstance && !currentAudioInstance.paused) {
                    currentAudioInstance.pause();
                    currentAudioInstance.currentTime = 0;
                    playAudioButton.classList.remove('playing');
                }
                try {
                    playAudioButton.classList.add('loading');
                    playAudioButton.classList.remove('playing');
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    const userId = session?.user?.id;
                    if (!userId) { console.error('No autenticado al generar audio.'); playAudioButton.classList.remove('loading'); return; }
                    const response = await fetch('/generate_audio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-User-Id': userId },
                        body: new URLSearchParams({ text: messageText })
                    });
                    const data = await response.json();
                    if (!data.audio) { console.warn('No se recibió audio desde el backend.'); playAudioButton.classList.remove('loading'); return; }
                    currentAudioInstance = new Audio(`data:audio/mpeg;base64,${data.audio}`);
                    currentAudioInstance.onplay = () => { playAudioButton.classList.remove('loading'); playAudioButton.classList.add('playing'); };
                    currentAudioInstance.onended = () => { playAudioButton.classList.remove('playing'); };
                    currentAudioInstance.onerror = (e) => { console.error('Error al cargar o reproducir el audio:', e); playAudioButton.classList.remove('loading', 'playing'); };
                    await currentAudioInstance.play();
                } catch (error) {
                    console.error('Error al generar o reproducir el audio:', error);
                    playAudioButton.classList.remove('loading', 'playing');
                }
            });
            actionsContainer.appendChild(playAudioButton);
            messageElement.appendChild(actionsContainer);
        }

        messagesContainer.appendChild(messageElement);
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        setTimeout(() => { messageElement.classList.add('appeared'); messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 50);
        return Promise.resolve();
    }

    function showTypingIndicator() {
        if (typingIndicatorElement) return;
        typingIndicatorElement = document.createElement('div');
        typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
        for (let i = 0; i < 3; i++) typingIndicatorElement.appendChild(document.createElement('span'));
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

    // ═══════════════ Adjuntos chat ═══════════════
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

    // ═══════════════ Enviar mensaje ═══════════════
    if (sendButton) sendButton.addEventListener('click', sendMessage);

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message && !selectedFile) return;
        let displayMessage = message;
        if (selectedFile) displayMessage += (message ? ' ' : '') + `📎 Archivo adjunto: ${selectedFile.name}`;
        await addMessage('user', displayMessage);
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        const inputBar = document.getElementById('input-bar');
        if (inputBar && inputBar.classList.contains('initial')) inputBar.classList.remove('initial');
        userInput.value = '';
        adjustTextareaHeight();
        showTypingIndicator();
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) throw new Error("No estás autenticado. Inicia sesión.");
            const formData = new FormData();
            formData.append('message', message);
            formData.append('history', JSON.stringify(conversationHistory));
            if (activePersistentInstruction) formData.append('persistent_instruction', activePersistentInstruction);
            if (clonedVoiceId) formData.append('cloned_voice_id', clonedVoiceId);
            if (selectedFile) formData.append('file', selectedFile);

            const response = await fetch('/chat', { method: 'POST', headers: { 'X-User-Id': userId }, body: formData });
            if (!response.ok) throw new Error(`Error HTTP: ${response.status} - ${await response.text()}`);
            const data = await response.json();
            hideTypingIndicator();
            await addMessage('bot', data.response, data.audio);
            conversationHistory = data.updated_history;
        } catch (err) {
            console.error(err);
            hideTypingIndicator();
            await addMessage('bot', '❌ Error al enviar mensaje. Intenta de nuevo.');
        }
    }

    // ═══════════════ Inicializar tema ═══════════════
    initializeTheme();
});

