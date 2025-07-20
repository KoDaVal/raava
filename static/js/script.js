document.addEventListener('DOMContentLoaded', async () => {
    // 1. VARIABLES AUTENTICACIÓN
    let isLoginMode = true;
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    const confirmInput = document.getElementById('auth-confirm-password');
    const confirmWrapper = document.getElementById('confirm-password-wrapper');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const fakeCaptcha = document.getElementById('fake-captcha');

    const authOverlay = document.getElementById('auth-overlay');
    const mainContainer = document.querySelector('.main-container');
    const headerProfilePic = document.getElementById('header-profile-pic'); // Declarado aquí también

    // 2. SUPABASE
    const supabase = window.supabase.createClient(
        'https://awzyyjifxlklzbnvvlfv.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8'
    );

    // 3. MODO INICIAL: OCULTAR O MOSTRAR APP
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        authOverlay.style.display = 'none';
        mainContainer.style.display = 'flex';

        const avatarUrl = session.user.user_metadata?.avatar_url;
        if (avatarUrl && headerProfilePic) {
            headerProfilePic.src = avatarUrl;
        }
    } else {
        authOverlay.style.display = 'flex';
        mainContainer.style.display = 'none';
    }

    // 4. TOGGLE MODO LOGIN/REGISTRO
    toggleText.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        confirmWrapper.style.display = isLoginMode ? 'none' : 'block';
        submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        toggleText.innerHTML = isLoginMode
            ? '¿No tienes cuenta? <a href="#" id="toggle-auth-mode">Regístrate</a>'
            : '¿Ya tienes cuenta? <a href="#" id="toggle-auth-mode">Inicia sesión</a>';
    });

    // 5. MOSTRAR / OCULTAR CONTRASEÑAS
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const inputId = toggle.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const icon = toggle.querySelector('i');
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });

    // 6. SUBMIT LOGIN / REGISTRO
    submitBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passInput.value.trim();
        const confirm = confirmInput.value.trim();

        if (!fakeCaptcha.checked) {
            alert("Marca la casilla de 'No soy un robot'");
            return;
        }

        if (!email || !password || (!isLoginMode && password !== confirm)) {
            alert('Revisa los campos.');
            return;
        }

        try {
            let result;
            if (isLoginMode) {
                result = await supabase.auth.signInWithPassword({ email, password });
                if (result.error) throw result.error;
                location.reload();
            } else {
                result = await supabase.auth.signUp({ email, password });
                if (result.error) throw result.error;

                isLoginMode = true;
                confirmWrapper.style.display = 'none';
                submitBtn.textContent = 'Iniciar sesión';
                toggleText.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-auth-mode">Regístrate</a>';
                alert('Registro exitoso. Verifica tu correo y luego inicia sesión.');
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

    // 7. LOGIN SOCIAL
    document.getElementById('google-login')?.addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
    });

    document.getElementById('github-login')?.addEventListener('click', async () => {
        await supabase.auth.signInWithOAuth({ provider: 'github' });
    });

    // 8. LOGOUT
    document.getElementById('logout-button')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
    });

    // --------------------
    // 2. TODA TU LÓGICA DE RAAVAX
    // --------------------

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

    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image');

    const settingsMenu = document.getElementById('settings-menu');
    const settingsOption = document.getElementById('settings-option');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const themeSelect = document.getElementById('theme-select');

    let uploadedInfoFileContent = "";
    let activePersistentInstruction = "";

    const startMindButton = document.getElementById('start-mind-button');

    let clonedVoiceId = null;

    const sidebar = document.querySelector('.sidebar');
    const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
    const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
    const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
    // mainContainer ya está declarado arriba

    if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
    if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
    if (uploadInfoBtn) uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });

    if (headerProfilePic) {
        headerProfilePic.addEventListener('click', (event) => {
            settingsMenu.classList.toggle('active');
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (settingsMenu && settingsMenu.classList.contains('active') && !settingsMenu.contains(event.target) && event.target !== headerProfilePic) {
                settingsMenu.classList.remove('active');
            }
        });
    }

    if (settingsOption) {
        settingsOption.addEventListener('click', () => {
            settingsModal.classList.add('active');
            settingsMenu.classList.remove('active');
            if (document.body.classList.contains('light-mode')) {
                themeSelect.value = 'light';
            } else {
                themeSelect.value = 'dark';
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
                if (darkSrc) {
                    icon.src = darkSrc;
                }
            } else {
                if (lightSrc) {
                    icon.src = lightSrc;
                }
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
        messageElement.classList.add('message');
        messageElement.classList.add(sender);

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
                if (!messageText) {
                    console.warn('No hay texto disponible para generar audio.');
                    return;
                }

                if (currentAudioInstance && !currentAudioInstance.paused) {
                    currentAudioInstance.pause();
                    currentAudioInstance.currentTime = 0;
                    playAudioButton.classList.remove('playing');
                }

                try {
                    playAudioButton.classList.add('loading');
                    playAudioButton.classList.remove('playing');

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
            messageElement.appendChild(actionsContainer);
        }

        messagesContainer.appendChild(messageElement);

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
            formData.append('history', JSON.stringify(conversationHistory.slice(0, -1)));

            if (activePersistentInstruction) {
                formData.append('persistent_instruction', activePersistentInstruction);
            }

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
            await addMessage('bot', data.response, data.audio);

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

}); // <--- ESTE ES EL ÚNICO CIERRE DEL DOMContentLoaded
