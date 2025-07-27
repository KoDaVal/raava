// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL     = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════ Estado y Helpers ═══════════════
let isLoginMode = true;
function showOverlay() { document.getElementById('auth-overlay').style.display = 'flex'; }
function hideOverlay() { document.getElementById('auth-overlay').style.display = 'none'; }

// ═══════════════ Auth & UI Logic ═══════════════
document.addEventListener('DOMContentLoaded', () => {
  const authForm           = document.getElementById('auth-form');
  const emailInput         = document.getElementById('auth-email');
  const passwordInput      = document.getElementById('auth-password');
  const confirmWrapper     = document.getElementById('confirm-password-wrapper');
  const confirmInput       = document.getElementById('auth-confirm-password');
  const submitBtn          = document.getElementById('auth-submit-btn');
  const toggleText         = document.getElementById('auth-toggle-text');
  const toggleLink         = document.getElementById('auth-toggle-link');
  const googleBtn          = document.getElementById('google-signin');
  const githubBtn          = document.getElementById('github-signin');
  const successContainer   = document.getElementById('auth-success');
  const successBtn         = document.getElementById('auth-success-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordContainer = document.getElementById('forgot-password-container');
  const forgotPasswordEmail = document.getElementById('forgot-password-email');
  const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
  const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
  const logoutOption = document.getElementById('logout-option');
  const passwordStrength   = document.getElementById('password-strength');
  const eyeToggle          = document.getElementById('toggle-password');
  const confirmEyeToggle   = document.getElementById('toggle-confirm-password');

  // --- Eventos de recuperación de contraseña ---
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
    if (!email) {
      alert("Ingresa tu correo.");
      return;
    }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) {
      alert("Error: " + error.message);
    } else {
      // Ocultar inputs y botones
      document.querySelector('#forgot-password-container input').style.display = 'none';
      forgotPasswordSubmit.style.display = 'none';
      forgotPasswordCancel.style.display = 'none';

      // Mostrar mensaje de éxito
      const successMsg = document.createElement('p');
      successMsg.textContent = "Si el correo existe, te enviamos un enlace para restablecer tu contraseña.";
      successMsg.style.margin = "20px 0";
      successMsg.style.color = "#fff";
      successMsg.style.textAlign = "center";

      const backBtn = document.createElement('button');
      backBtn.textContent = "Volver";
      backBtn.className = "auth-btn";
      backBtn.style.marginTop = "15px";
      backBtn.addEventListener('click', () => {
        forgotPasswordContainer.style.display = 'none';
        authForm.style.display = 'block';
        // Restaurar el formulario
        document.querySelector('#forgot-password-container input').style.display = 'block';
        forgotPasswordSubmit.style.display = 'inline-block';
        forgotPasswordCancel.style.display = 'inline-block';
        successMsg.remove();
        backBtn.remove();
      });

      forgotPasswordContainer.appendChild(successMsg);
      forgotPasswordContainer.appendChild(backBtn);
    }
  });
}
  // --- Logout ---
  if (logoutOption) {
    logoutOption.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      location.reload();
    });
  }

  // --- Inicializar estado ---
  confirmWrapper.style.display = 'none';
  confirmInput.disabled = true;
  confirmInput.required = false;
  passwordStrength.style.display = 'none';

  // --- Mostrar/ocultar contraseña ---
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

  // --- Fuerza de contraseña ---
  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(val);
    passwordStrength.textContent = strong
      ? 'Fuerza: ✅ Cumple requisitos'
      : 'Fuerza: mínimo 8 caracteres, 1 mayúscula, 1 especial';
    passwordStrength.style.color = strong ? 'lightgreen' : 'salmon';
  });

  // --- Cambiar entre login y registro ---
  toggleLink.addEventListener('click', e => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
      submitBtn.textContent = 'Iniciar sesión';
      toggleText.textContent = '¿No tienes cuenta? ';
      toggleLink.textContent = 'Regístrate';
      confirmWrapper.style.display= 'none';
      confirmInput.disabled = true;
      confirmInput.required = false;
      passwordStrength.style.display = 'none';
    } else {
      submitBtn.textContent = 'Registrarse';
      toggleText.textContent = '¿Ya tienes cuenta? ';
      toggleLink.textContent = 'Inicia sesión';
      confirmWrapper.style.display= 'flex';
      confirmInput.disabled = false;
      confirmInput.required = true;
      passwordStrength.style.display = 'inline-block';
    }
    toggleText.appendChild(toggleLink);
  });

  // --- Envío del formulario ---
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const recaptchaResponse = grecaptcha.getResponse();
if (!recaptchaResponse) {
    alert('Por favor, confirma el reCAPTCHA.');
    return;
}
    // Verificar reCAPTCHA en el backend
const captchaCheck = await fetch('/verify_captcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: recaptchaResponse })
});
const captchaResult = await captchaCheck.json();
if (!captchaResult.success) {
    alert('Error al verificar el reCAPTCHA. Inténtalo de nuevo.');
    return;
}
    const email    = emailInput.value.trim();
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
        if (password !== confirmInput.value) {
          alert('Las contraseñas no coinciden.');
          return;
        }
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          alert(`Error al registrarse: ${error.message}`);
          console.error(error);
          return;
        }
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

  // --- Botones sociales ---
  successBtn.addEventListener('click', () => location.reload());
  googleBtn.addEventListener('click',  () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
  githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));

  // --- Manejo de sesión ---
  supabaseClient.auth.onAuthStateChange((_, session) => {
    if (session?.user) loadUserProfile(session.user);
    else showOverlay();
  });
  (async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) loadUserProfile(session.user);
    else showOverlay();
  })();

  // --- Cargar perfil ---
  function loadUserProfile(user) {
    hideOverlay();
    const avatar = document.getElementById('header-profile-pic');
    if (user.user_metadata?.avatar_url && avatar) avatar.src = user.user_metadata.avatar_url;

    const userPlanLabel = document.getElementById('user-plan-label');
    if (userPlanLabel) {
      supabaseClient.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
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
      });

      supabaseClient
        .channel('public:profiles')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, payload => {
          if (payload.new?.plan) userPlanLabel.textContent = `Plan: ${payload.new.plan}`;
        })
        .subscribe();
    }
  }
}); 
// ═══════════════ Resto de la lógica de Raavax (sin cambios) ═══════════════
document.addEventListener('DOMContentLoaded', () => {
  // ... tu código original de chat, sidebar, etc.
});
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
      if (!voiceReady || !infoReady) {
        addMessage('bot', 'Carga primero los dos archivos antes de iniciar la mente.');
        return;
      }
      try {
        const formData = new FormData();
        formData.append('instruction', uploadedInfoFileContent);
        formData.append('audio_file', uploadedVoiceFile);

        const response = await fetch('/start_mind', { method: 'POST', body: formData });
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

            const response = await fetch('/chat', {
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


});
