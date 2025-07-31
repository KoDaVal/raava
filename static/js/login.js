const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'tu_clave_anonima_aqui';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isLogin = true;

const title = document.getElementById('auth-title');
const email = document.getElementById('auth-email');
const password = document.getElementById('auth-password');
const confirm = document.getElementById('auth-confirm');
const confirmWrapper = document.getElementById('confirm-wrapper');
const submitBtn = document.getElementById('auth-submit');
const switchText = document.getElementById('auth-switch-text');
const messages = document.getElementById('auth-messages');
const resetWrapper = document.getElementById('reset-wrapper');

// Mostrar/Ocultar contraseñas
document.querySelectorAll('.toggle-password').forEach((icon) => {
  icon.addEventListener('click', () => {
    const input = document.getElementById(icon.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerHTML = isHidden ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
  });
});

// Alternar entre login y registro
document.addEventListener('click', (e) => {
  if (e.target.id === 'toggle-auth-mode') {
    e.preventDefault();
    isLogin = !isLogin;
    title.textContent = isLogin ? 'Welcome back' : 'Create your account';
    confirmWrapper.classList.toggle('hidden', isLogin);
    resetWrapper.classList.add('hidden');
    switchText.innerHTML = isLogin
      ? `Don't have an account? <a href="#" id="toggle-auth-mode">Sign up</a>`
      : `Already have an account? <a href="#" id="toggle-auth-mode">Log in</a>`;
  }
});

// Forgot password
document.getElementById('forgot-password-link').addEventListener('click', async () => {
  isLogin = true;
  confirmWrapper.classList.add('hidden');
  resetWrapper.classList.remove('hidden');

  const res = await fetch('/request_password_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value })
  });

  const data = await res.json();
  if (!res.ok) return show(data.error || "Error sending code");
  startOtpTimer(600);
});

function startOtpTimer(seconds) {
  const timer = document.getElementById('otp-timer');
  clearInterval(window.otpInterval);
  window.otpInterval = setInterval(() => {
    if (seconds <= 0) {
      clearInterval(window.otpInterval);
      timer.textContent = "Expired";
      return;
    }
    const m = Math.floor(seconds / 60), s = seconds % 60;
    timer.textContent = `Expires in ${m}:${s.toString().padStart(2, '0')}`;
    seconds--;
  }, 1000);
}

document.getElementById('resend-otp-btn').addEventListener('click', () => {
  document.getElementById('forgot-password-link').click();
});

document.getElementById('reset-password-btn').addEventListener('click', async () => {
  const otp = document.getElementById('otp-input').value;
  const newPass = document.getElementById('new-password').value;
  const confirmNew = document.getElementById('confirm-new-password').value;
  if (newPass !== confirmNew) return show("Passwords do not match.");

  const res = await fetch('/reset_password_with_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, otp, new_password: newPass })
  });

  const data = await res.json();
  if (!res.ok) return show(data.error || "Reset failed");
  alert("Password updated. Log in again.");
  window.location.reload();
});

// Submit login/signup
submitBtn.addEventListener('click', async () => {
  if (!email.value || !password.value) return show("Please fill all fields.");
  if (!isLogin && password.value !== confirm.value) return show("Passwords don't match.");

  const { data, error } = isLogin
    ? await supabaseClient.auth.signInWithPassword({ email: email.value, password: password.value })
    : await supabaseClient.auth.signUp({ email: email.value, password: password.value });

  if (error) return show(error.message);
  window.location.href = "/";
});

// Social login
document.getElementById('google-signin').addEventListener('click', () => {
  supabaseClient.auth.signInWithOAuth({ provider: 'google' });
});
document.getElementById('github-signin').addEventListener('click', () => {
  supabaseClient.auth.signInWithOAuth({ provider: 'github' });
});

function show(msg) {
  messages.textContent = msg;
}

