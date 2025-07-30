// === Supabase ===
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Elementos ===
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const confirmPasswordInput = document.getElementById('auth-confirm-password');
const confirmWrapper = document.getElementById('confirm-password-wrapper');
const submitBtn = document.getElementById('auth-submit-btn');
const toggleLink = document.getElementById('auth-toggle-link');
const passwordStrength = document.getElementById('password-strength');
const statusMsg = document.getElementById('status-msg');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotContainer = document.getElementById('forgot-password-container');
const forgotEmail = document.getElementById('forgot-password-email');
const forgotSubmit = document.getElementById('forgot-password-submit');
const forgotCancel = document.getElementById('forgot-password-cancel');
const otpStep = document.getElementById('otp-step');
const otpInput = document.getElementById('otp-input');
const otpTimerEl = document.getElementById('otp-timer');
const newPassword = document.getElementById('new-password');
const confirmNewPassword = document.getElementById('confirm-new-password');
const changePasswordBtn = document.getElementById('change-password-btn');
let isLoginMode = true;

// === Cambiar entre login y registro ===
toggleLink.addEventListener('click', e => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  document.getElementById('login-title').textContent = isLoginMode ? "Iniciar sesión" : "Crear cuenta";
  submitBtn.textContent = isLoginMode ? "Iniciar sesión" : "Registrarse";
  confirmWrapper.style.display = isLoginMode ? 'none' : 'block';
});

// === Validar fuerza contraseña ===
passwordInput.addEventListener('input', () => {
  const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(passwordInput.value);
  passwordStrength.textContent = strong ? "Contraseña segura" : "Mínimo 8 caracteres, 1 mayúscula, 1 especial";
  passwordStrength.style.color = strong ? "lightgreen" : "salmon";
});

// === Envío formulario ===
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const recaptcha = grecaptcha.getResponse();
  if (!recaptcha) return alert("Completa el reCAPTCHA");
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!isLoginMode && password !== confirmPasswordInput.value.trim()) return alert("Las contraseñas no coinciden");
  submitBtn.disabled = true;
  submitBtn.textContent = isLoginMode ? "Ingresando..." : "Registrando...";
  try {
    if (isLoginMode) {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/";
    } else {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      statusMsg.textContent = "Revisa tu correo para confirmar la cuenta.";
    }
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? "Iniciar sesión" : "Registrarse";
  }
});

// === Recuperar contraseña ===
forgotPasswordLink.addEventListener('click', e => {
  e.preventDefault();
  authForm.style.display = "none";
  forgotContainer.style.display = "block";
});
forgotCancel.addEventListener('click', () => {
  forgotContainer.style.display = "none";
  authForm.style.display = "block";
});
forgotSubmit.addEventListener('click', async () => {
  const email = forgotEmail.value.trim();
  if (!email) return alert("Ingresa tu correo");
  const res = await fetch('/request_password_code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  if (res.ok) {
    alert("Código enviado a tu correo.");
    otpStep.style.display = 'block';
    startOtpCountdown(8 * 60);
  } else {
    const data = await res.json();
    alert(data.error);
  }
});
changePasswordBtn.addEventListener('click', async () => {
  const email = forgotEmail.value.trim();
  const otp = otpInput.value.trim();
  const pass = newPassword.value.trim();
  const pass2 = confirmNewPassword.value.trim();
  if (pass !== pass2) return alert("Las contraseñas no coinciden");
  const res = await fetch('/reset_password_with_code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, new_password: pass }) });
  const data = await res.json();
  if (res.ok) {
    alert("Contraseña actualizada");
    location.reload();
  } else alert(data.error);
});
function startOtpCountdown(seconds) {
  const timer = setInterval(() => {
    if (seconds <= 0) { clearInterval(timer); otpTimerEl.textContent = "Expirado"; return; }
    let m = Math.floor(seconds / 60), s = seconds % 60;
    otpTimerEl.textContent = `Expira en ${m}:${s.toString().padStart(2, '0')}`;
    seconds--;
  }, 1000);
}

// === Social login ===
document.getElementById('google-signin').addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
document.getElementById('github-signin').addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));
