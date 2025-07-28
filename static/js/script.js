
// === UNIFICADO Y CORREGIDO ===
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // === Elementos generales ===
    const authOverlay = document.getElementById('auth-overlay');
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
    const userPlanLabel = document.getElementById('user-plan-label');
    const headerProfilePic = document.getElementById('header-profile-pic');

    const messagesContainer = document.querySelector('.messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('new-chat-btn');
    const welcomeScreen = document.getElementById('welcome-screen');
    const inputBar = document.getElementById('input-bar');
    const fileInput = document.getElementById('file-upload');
    const fileDisplay = document.getElementById('file-display');
    const fileNameSpan = document.getElementById('file-name');
    const clearFileButton = document.getElementById('clear-file');

    const uploadVoiceBtn = document.getElementById('upload-voice-btn');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadInfoBtn = document.getElementById('upload-info-btn');
    const voiceFileInput = document.getElementById('voice-file-input');
    const imageFileInput = document.getElementById('image-file-input');
    const infoFileInput = document.getElementById('info-file-input');
    const avatarImage = document.getElementById('avatar-image');

    const startMindButtons = [document.getElementById('start-mind-button'), document.getElementById('start-mind-button-mobile')];
    const mobileVoiceLabel = document.querySelector('.mobile-only .voice-button');
    const mobileInfoLabel = document.querySelector('.mobile-only .file-button');

    // === Estado ===
    let isLoginMode = true;
    let typingIndicatorElement = null;
    let selectedFile = null;
    let conversationHistory = [];
    let uploadedInfoFileContent = "";
    let activePersistentInstruction = "";
    let clonedVoiceId = null;
    let uploadedVoiceFile = null;
    let voiceReady = false;
    let infoReady = false;

    function showOverlay() { authOverlay.style.display = 'flex'; }
    function hideOverlay() { authOverlay.style.display = 'none'; }

    // === Recuperación contraseña ===
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', e => { e.preventDefault(); authForm.style.display='none'; successContainer.style.display='none'; forgotPasswordContainer.style.display='block'; });
    if (forgotPasswordCancel) forgotPasswordCancel.addEventListener('click', () => { forgotPasswordContainer.style.display='none'; authForm.style.display='block'; });
    if (forgotPasswordSubmit) forgotPasswordSubmit.addEventListener('click', async () => {
        const email = forgotPasswordEmail.value.trim();
        if (!email) return alert("Ingresa tu correo.");
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' });
        if (error) alert("Error: " + error.message);
        else { alert("Te enviamos un enlace para restablecer tu contraseña."); forgotPasswordContainer.style.display='none'; authForm.style.display='block'; }
    });

    if (logoutOption) logoutOption.addEventListener('click', async () => { await supabaseClient.auth.signOut(); location.reload(); });

    // === Mostrar/ocultar contraseña ===
    if (eyeToggle) eyeToggle.addEventListener('click', () => { passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password'; });
    if (confirmEyeToggle) confirmEyeToggle.addEventListener('click', () => { confirmInput.type = confirmInput.type === 'password' ? 'text' : 'password'; });

    // === Fuerza de contraseña ===
    if (passwordInput) passwordInput.addEventListener('input', () => {
        const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(passwordInput.value);
        passwordStrength.textContent = strong ? 'Fuerza: ✅ Cumple requisitos' : 'Fuerza: mínimo 8 caracteres, 1 mayúscula, 1 especial';
        passwordStrength.style.color = strong ? 'lightgreen' : 'salmon';
    });

    // === Toggle login/registro ===
    if (toggleLink) toggleLink.addEventListener('click', e => {
        e.preventDefault(); isLoginMode = !isLoginMode;
        submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        toggleText.textContent = isLoginMode ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? ';
        toggleLink.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión';
        confirmWrapper.style.display = isLoginMode ? 'none' : 'flex';
        confirmInput.disabled = isLoginMode; confirmInput.required = !isLoginMode;
        passwordStrength.style.display = isLoginMode ? 'none' : 'inline-block';
        toggleText.appendChild(toggleLink);
    });

    // === Envío formulario ===
    if (authForm) authForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (typeof grecaptcha !== "undefined") {
            const recaptchaResponse = grecaptcha.getResponse();
            if (!recaptchaResponse) return alert('Por favor, confirma el reCAPTCHA.');
            const captchaCheck = await fetch('/verify_captcha', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: recaptchaResponse }) });
            const captchaResult = await captchaCheck.json();
            if (!captchaResult.success) return alert('Error al verificar el reCAPTCHA. Inténtalo de nuevo.');
        }
        const email = emailInput.value.trim(), password = passwordInput.value;
        if (!email || !password || (!isLoginMode && !confirmInput.value)) return alert('Por favor, ingresa tu correo y contraseña.');
        submitBtn.disabled = true; submitBtn.textContent = isLoginMode ? 'Iniciando sesión...' : 'Registrando...';
        try {
            if (isLoginMode) {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) { alert(`Error al iniciar sesión: ${error.message}`); return; }
                if (data?.session) loadUserProfile(data.user); else alert('Inicio de sesión fallido.');
            } else {
                if (password !== confirmInput.value) return alert('Las contraseñas no coinciden.');
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) { alert(`Error al registrarse: ${error.message}`); return; }
                authForm.style.display='none'; successContainer.style.display='block';
            }
        } finally { submitBtn.disabled = false; submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse'; }
    });

    if (googleBtn) googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
    if (githubBtn) githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));
    if (successBtn) successBtn.addEventListener('click', () => location.reload());

    // === Sesión ===
    supabaseClient.auth.onAuthStateChange((_, session) => { session?.user ? loadUserProfile(session.user) : showOverlay(); });
    (async () => { const { data: { session } } = await supabaseClient.auth.getSession(); session?.user ? loadUserProfile(session.user) : showOverlay(); })();

    function loadUserProfile(user) {
        hideOverlay();
        if (user.user_metadata?.avatar_url && headerProfilePic) headerProfilePic.src = user.user_metadata.avatar_url;
        if (userPlanLabel) {
            supabaseClient.auth.getSession().then(({ data }) => {
                const token = data.session?.access_token;
                fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } })
                .then(res => res.json()).then(data => { userPlanLabel.textContent = `Plan: ${data[0]?.plan || 'essence'}`; })
                .catch(err => console.error("Error al cargar el plan:", err));
            });
        }
    }

    // === Chat ===
    async function addMessage(sender, text) {
        const el = document.createElement('div'); el.classList.add('message', sender);
        const content = document.createElement('div'); content.classList.add('message-content'); content.textContent = text; el.appendChild(content);
        messagesContainer.appendChild(el); messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (sendButton) sendButton.addEventListener('click', sendMessage);
    async function sendMessage() {
        const message = userInput.value.trim(); if (!message && !selectedFile) return;
        await addMessage('user', message); userInput.value=''; inputBar?.classList.remove('initial');
        try {
            const formData = new FormData(); formData.append('message', message); formData.append('history', JSON.stringify(conversationHistory));
            if (activePersistentInstruction) formData.append('persistent_instruction', activePersistentInstruction);
            if (clonedVoiceId) formData.append('cloned_voice_id', clonedVoiceId);
            if (selectedFile) formData.append('file', selectedFile);
            const { data: { session } } = await supabaseClient.auth.getSession(); if (!session?.user?.id) return alert("No hay sesión activa.");
            const response = await fetch('/chat', { method: 'POST', headers: { 'X-User-Id': session.user.id }, body: formData });
            const data = await response.json(); await addMessage('bot', data.response); conversationHistory = data.updated_history;
        } catch { await addMessage('bot', 'Error al conectar con el chatbot.'); }
    }
});
