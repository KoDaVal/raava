// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL     = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════ Estado y Helpers ═══════════════
let isLoginMode = true;

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
    forgotPasswordSubmit.addEventListener('click', sendOtpCode);
  }

  // === NUEVO: Lógica OTP para recuperación de contraseña ===
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
      alert("Código enviado a tu correo.");
      document.getElementById('otp-step').style.display = 'block';
      startOtpCountdown(8 * 60);
      startResendCountdown(60);
    } else alert(data.error);

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
        alert("El código ha expirado. Solicita uno nuevo.");
        document.getElementById('otp-input').value = ''; 
        return; 
      }
      let min = Math.floor(seconds / 60), sec = seconds % 60;
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

  // --- Resetear contraseña desde OTP (global para el onclick)
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
        alert("Contraseña actualizada correctamente.");
        location.reload();
      } else {
        alert(data.error || "Error al cambiar la contraseña.");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Ocurrió un error al cambiar la contraseña.");
    }
  };

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

  // --- Barra de fuerza de contraseña ---
  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(val);
    passwordStrength.textContent = strong
      ? 'Fuerza: ✅ Cumple requisitos'
      : 'Fuerza: mínimo 8 caracteres, 1 mayúscula, 1 especial';
    passwordStrength.style.color = strong ? 'green' : 'red';
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
      passwordStrength.style.display = 'block';
    }
    toggleText.appendChild(toggleLink);
  });

  // --- Envío del formulario ---
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
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
          alert('Error al iniciar sesión: ' + error.message);
          return;
        }
        if (data?.session) location.href = "/";
      } else {
        if (password !== confirmInput.value) {
          alert('Las contraseñas no coinciden.');
          return;
        }
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          alert('Error al registrarse: ' + error.message);
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
});



