const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const emailStep = document.getElementById('step-email');
const passwordStep = document.getElementById('step-password');
const resetStep = document.getElementById('step-reset');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordStrength = document.getElementById('password-strength');
const messages = document.getElementById('auth-messages');

// --- Mostrar fuerza de la contraseña ---
passwordInput.addEventListener('input', () => {
  const val = passwordInput.value;
  const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/.test(val);
  passwordStrength.textContent = strong ? "Contraseña segura" : "Mínimo 8 caracteres, 1 mayúscula y 1 especial";
  passwordStrength.style.color = strong ? "green" : "red";
});

// --- Mostrar/Ocultar contraseña ---
togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa fa-eye"></i>' : '<i class="fa fa-eye-slash"></i>';
});

// --- Paso 1: Continuar con email ---
document.getElementById('next-to-password').addEventListener('click', () => {
  if (!emailInput.value.trim()) return showMessage("Ingresa tu correo.");
  emailStep.classList.add('hidden');
  passwordStep.classList.remove('hidden');
});

// --- Iniciar sesión ---
document.getElementById('login-submit').addEventListener('click', async () => {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: emailInput.value,
      password: passwordInput.value
    });
    if (error) return showMessage("Error: " + error.message);
    window.location.href = "/";
  } catch (e) {
    showMessage("Error inesperado.");
  }
});

// --- Social login ---
document.getElementById('google-signin').addEventListener('click', () => {
  supabaseClient.auth.signInWithOAuth({ provider: 'google' });
});
document.getElementById('github-signin').addEventListener('click', () => {
  supabaseClient.auth.signInWithOAuth({ provider: 'github' });
});

// --- Olvidaste tu contraseña ---
document.getElementById('forgot-password-link').addEventListener('click', async () => {
  passwordStep.classList.add('hidden');
  resetStep.classList.remove('hidden');
  await requestOtp();
});

// --- Solicitar OTP ---
async function requestOtp() {
  const res = await fetch('/request_password_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailInput.value })
  });
  const data = await res.json();
  if (!res.ok) return showMessage(data.error || "Error al enviar el código");
  startOtpTimer(8 * 60);
}

// --- Reenviar OTP ---
document.getElementById('resend-otp-btn').addEventListener('click', requestOtp);

let otpInterval;
function startOtpTimer(seconds) {
  const timer = document.getElementById('otp-timer');
  clearInterval(otpInterval);
  otpInterval = setInterval(() => {
    if (seconds <= 0) { clearInterval(otpInterval); timer.textContent = "Expirado"; return; }
    const m = Math.floor(seconds / 60), s = seconds % 60;
    timer.textContent = `Expira en ${m}:${s.toString().padStart(2,'0')}`;
    seconds--;
  }, 1000);
}

// --- Resetear contraseña ---
document.getElementById('reset-password-btn').addEventListener('click', async () => {
  const otp = document.getElementById('otp-input').value;
  const newPass = document.getElementById('new-password').value;
  const confirmPass = document.getElementById('confirm-new-password').value;
  if (newPass !== confirmPass) return showMessage("Las contraseñas no coinciden.");
  const res = await fetch('/reset_password_with_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailInput.value, otp, new_password: newPass })
  });
  const data = await res.json();
  if (!res.ok) return showMessage(data.error || "Error al cambiar la contraseña");
  alert("Contraseña actualizada. Inicia sesión.");
  window.location.reload();
});

// --- Mostrar mensajes ---
function showMessage(msg) {
  messages.textContent = msg;
}
