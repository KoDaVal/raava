// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════ Estado ═══════════════
let isLoginMode = true;

// ═══════════════ Lógica Auth ═══════════════
document.addEventListener('DOMContentLoaded', () => {
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
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    const forgotPasswordEmail = document.getElementById('forgot-password-email');
    const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
    const forgotPasswordCancel = document.getElementById('forgot-password-cancel');
    const passwordStrength = document.getElementById('password-strength');
    const eyeToggle = document.getElementById('toggle-password');
    const confirmEyeToggle = document.getElementById('toggle-confirm-password');

    // --- Mostrar/ocultar contraseña ---
    function togglePassword(input, toggleElement) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        toggleElement.querySelector('i').classList.toggle('fa-eye');
        toggleElement.querySelector('i').classList.toggle('fa-eye-slash');
    }

    eyeToggle.addEventListener('click', () => togglePassword(passwordInput, eyeToggle));
    confirmEyeToggle.addEventListener('click', () => togglePassword(confirmInput, confirmEyeToggle));

    // --- Fuerza de contraseña ---
    passwordInput.addEventListener('input', () => {
        const val = passwordInput.value;
        const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(val);
        passwordStrength.textContent = strong
            ? 'Fuerza: ✅ Cumple requisitos'
            : 'Fuerza: mínimo 8 caracteres, 1 mayúscula, 1 especial';
        passwordStrength.style.color = strong ? 'green' : 'red';
        passwordStrength.style.display = 'block';
    });

    // --- Toggle entre login y registro ---
    toggleLink.addEventListener('click', e => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            submitBtn.textContent = 'Iniciar sesión';
            toggleText.textContent = '¿No tienes cuenta? ';
            toggleLink.textContent = 'Regístrate';
            confirmWrapper.style.display = 'none';
            confirmInput.disabled = true;
            passwordStrength.style.display = 'none';
        } else {
            submitBtn.textContent = 'Registrarse';
            toggleText.textContent = '¿Ya tienes cuenta? ';
            toggleLink.textContent = 'Inicia sesión';
            confirmWrapper.style.display = 'block';
            confirmInput.disabled = false;
            passwordStrength.style.display = 'block';
        }
        toggleText.appendChild(toggleLink);
    });

    // --- Olvidé mi contraseña ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', e => {
            e.preventDefault();
            authForm.style.display = 'none';
            forgotPasswordContainer.style.display = 'block';
        });
    }
    if (forgotPasswordCancel) {
        forgotPasswordCancel.addEventListener('click', () => {
            forgotPasswordContainer.style.display = 'none';
            authForm.style.display = 'block';
        });
    }

    // --- Envío del formulario ---
    authForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        if (!email || !password || (!isLoginMode && !confirmInput.value)) {
            alert('Completa todos los campos');
            return;
        }
        if (!isLoginMode && password !== confirmInput.value) {
            alert('Las contraseñas no coinciden');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = isLoginMode ? 'Iniciando...' : 'Registrando...';

        try {
            if (isLoginMode) {
                const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                location.href = "/";
            } else {
                const { error } = await supabaseClient.auth.signUp({ email, password });
                if (error) throw error;
                alert('Revisa tu correo para confirmar tu cuenta.');
                location.reload();
            }
        } catch (err) {
            alert(err.message || 'Error en la autenticación');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
        }
    });

    // --- Login social ---
    googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
    githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));

    // ═══════════════ Recuperación con OTP ═══════════════
    let otpTimer, resendTimer;

    async function sendOtpCode() {
        const email = forgotPasswordEmail.value.trim();
        if (!email) return alert("Ingresa tu correo");
        forgotPasswordSubmit.disabled = true;
        forgotPasswordSubmit.textContent = "Enviando...";
        const res = await fetch('/request_password_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Código enviado a tu correo");
            document.getElementById('otp-step').style.display = 'block';
            startOtpCountdown(8 * 60);
            startResendCountdown(60);
        } else alert(data.error || 'Error al enviar código');
        forgotPasswordSubmit.disabled = false;
        forgotPasswordSubmit.textContent = "Reenviar código";
    }

    function startOtpCountdown(seconds) {
        const timerEl = document.getElementById('otp-timer');
        clearInterval(otpTimer);
        otpTimer = setInterval(() => {
            if (seconds <= 0) {
                clearInterval(otpTimer);
                timerEl.textContent = "Expirado";
                return;
            }
            let min = Math.floor(seconds / 60),
                sec = seconds % 60;
            timerEl.textContent = `Expira en ${min}:${sec.toString().padStart(2, '0')}`;
            seconds--;
        }, 1000);
    }

    function startResendCountdown(seconds) {
        clearInterval(resendTimer);
        resendTimer = setInterval(() => {
            if (seconds <= 0) {
                forgotPasswordSubmit.disabled = false;
                forgotPasswordSubmit.textContent = "Reenviar código";
                clearInterval(resendTimer);
                return;
            }
            forgotPasswordSubmit.textContent = `Reenviar (${seconds}s)`;
            forgotPasswordSubmit.disabled = true;
            seconds--;
        }, 1000);
    }

    if (forgotPasswordSubmit) forgotPasswordSubmit.addEventListener('click', sendOtpCode);

    window.resetPasswordWithCode = async function () {
        const email = forgotPasswordEmail.value.trim();
        const otp = document.getElementById('otp-input').value.trim();
        const pass = document.getElementById('new-password').value.trim();
        const pass2 = document.getElementById('confirm-new-password').value.trim();
        if (pass !== pass2) return alert("Las contraseñas no coinciden");

        try {
            const res = await fetch('/reset_password_with_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, new_password: pass })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Contraseña actualizada correctamente");
                location.reload();
            } else alert(data.error || "Error al cambiar la contraseña");
        } catch (err) {
            console.error(err);
            alert("Error al cambiar contraseña");
        }
    };
});

