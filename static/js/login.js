// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Tu anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isLoginMode = true;

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
  const successContainer = document.getElementById('auth-success');
  const successBtn = document.getElementById('auth-success-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordContainer = document.getElementById('forgot-password-container');
  const forgotPasswordEmail = document.getElementById('forgot-password-email');
  const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
  const forgotPasswordCancel = document.getElementById('forgot-password-cancel');

  // Barra de fuerza
  const strengthBar = document.querySelector('.password-strength-bar-fill');
  const strengthText = document.querySelector('.password-strength-text');
  const strengthContainer = document.getElementById('password-strength-container');

  // Toggle de ojos
  const eyeToggle = document.getElementById('toggle-password');
  const confirmEyeToggle = document.getElementById('toggle-confirm-password');

  // Mostrar/ocultar contraseña
  function togglePasswordVisibility(input, icon) {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  }

  eyeToggle.addEventListener('click', () => togglePasswordVisibility(passwordInput, eyeToggle));
  confirmEyeToggle.addEventListener('click', () => togglePasswordVisibility(confirmInput, confirmEyeToggle));

  // Fuerza de contraseña
  function updatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const percentage = (score / 4) * 100;
    strengthBar.style.width = `${percentage}%`;

    if (score <= 1) {
      strengthBar.style.background = 'red';
      strengthText.textContent = 'Fuerza: Débil';
    } else if (score === 2) {
      strengthBar.style.background = 'orange';
      strengthText.textContent = 'Fuerza: Media';
    } else if (score === 3) {
      strengthBar.style.background = 'blue';
      strengthText.textContent = 'Fuerza: Buena';
    } else {
      strengthBar.style.background = 'green';
      strengthText.textContent = 'Fuerza: Excelente';
    }
  }

  passwordInput.addEventListener('input', () => {
    if (!isLoginMode) updatePasswordStrength(passwordInput.value);
  });

  // --- Cambiar entre login y registro ---
  toggleLink.addEventListener('click', e => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
      submitBtn.textContent = 'Iniciar sesión';
      toggleText.innerHTML = '¿No tienes cuenta? <a href="#" id="auth-toggle-link">Regístrate</a>';
      confirmWrapper.style.display = 'none';
      strengthContainer.style.display = 'none';
    } else {
      submitBtn.textContent = 'Registrarse';
      toggleText.innerHTML = '¿Ya tienes cuenta? <a href="#" id="auth-toggle-link">Inicia sesión</a>';
      confirmWrapper.style.display = 'block';
      strengthContainer.style.display = 'block';
    }
  });

  // --- Recuperación de contraseña ---
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

  // --- Login/Register submit ---
  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) return alert('Por favor, confirma el reCAPTCHA.');

    const captchaCheck = await fetch('/verify_captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: recaptchaResponse })
    });
    const captchaResult = await captchaCheck.json();
    if (!captchaResult.success) return alert('Error al verificar el reCAPTCHA.');

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password || (!isLoginMode && !confirmInput.value)) {
      alert('Por favor, completa todos los campos.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isLoginMode ? 'Iniciando sesión...' : 'Registrando...';

    try {
      if (isLoginMode) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) return alert('Error al iniciar sesión: ' + error.message);
        if (data?.session) location.href = '/';
      } else {
        if (password !== confirmInput.value) return alert('Las contraseñas no coinciden.');
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) return alert('Error al registrarse: ' + error.message);
        authForm.style.display = 'none';
        successContainer.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error inesperado.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
    }
  });

  // Social login
  googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
  githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));
  successBtn.addEventListener('click', () => location.reload());
});


