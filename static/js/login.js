const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Guardar redirect si viene en la URL
const urlRedirect = new URLSearchParams(window.location.search).get('redirect');
if (urlRedirect) {
  localStorage.setItem('oauth_redirect', urlRedirect);
}

// Si volvemos de Google/GitHub y ya hay sesión, redirigir automáticamente
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    let redirectTo = localStorage.getItem('oauth_redirect') || '/';
    if (redirectTo && redirectTo !== 'undefined' && redirectTo !== 'null') {
      try { redirectTo = decodeURIComponent(redirectTo); } catch (e) { redirectTo = '/'; }
    }
    localStorage.removeItem('oauth_redirect');
    window.location.href = redirectTo;
  }
})();

let isLogin = true;

// Elements
const loginSection = document.getElementById('login-section');
const recoverySection = document.getElementById('recovery-section');
const socialButtons = document.getElementById('social-buttons');
const submitBtn = document.getElementById('auth-submit');
const switchText = document.getElementById('auth-switch-text');
const confirmWrapper = document.getElementById('confirm-wrapper');

// Toggle password
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = document.getElementById(icon.dataset.target);
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.innerHTML = isHidden ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
  });
});

// Switch login/register
document.addEventListener('click', (e) => {
  if (e.target.id === 'toggle-auth-mode') {
    e.preventDefault();
    isLogin = !isLogin;
    document.getElementById('auth-title').textContent = isLogin ? 'Welcome back' : 'Create your account';
    confirmWrapper.classList.toggle('hidden', isLogin);
    switchText.innerHTML = isLogin
      ? `Don't have an account? <a href="#" id="toggle-auth-mode">Sign up</a>`
      : `Already have an account? <a href="#" id="toggle-auth-mode">Log in</a>`;
  }
});

// Forgot password
document.getElementById('forgot-password-link').addEventListener('click', () => {
  loginSection.classList.add('hidden');
  recoverySection.classList.remove('hidden');
  socialButtons.classList.add('hidden');
});

// Steps
function showStep(step) {
  document.querySelectorAll('.recovery-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(`step-${step}`).classList.remove('hidden');
}

// Step 1: Send code
document.getElementById('start-reset-btn').addEventListener('click', async () => {
  const email = document.getElementById('recover-email').value;
  const err = document.getElementById('recover-email-error');
  err.textContent = '';
  if (!email) return err.textContent = "Email required.";
  const btn = document.getElementById('start-reset-btn');
  btn.textContent = "Sending..."; btn.classList.add('loading');
  const res = await fetch('/request_password_code', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  btn.textContent = "Send code"; btn.classList.remove('loading');
  const data = await res.json();
  if (!res.ok) return err.textContent = data.error || "Error sending code.";
  startOtpTimer(480);
  showStep('otp');
});

// Step 2: Verify code
document.getElementById('verify-otp-btn').addEventListener('click', async () => {
  const otp = document.getElementById('otp-input').value;
  const email = document.getElementById('recover-email').value;
  const err = document.getElementById('otp-error');
  err.textContent = '';
  if (!otp) return err.textContent = "Code required.";

  const btn = document.getElementById('verify-otp-btn');
  btn.textContent = "Verifying..."; 
  btn.classList.add('loading');

  const res = await fetch('/verify_password_code', {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });

  btn.textContent = "Verify code"; 
  btn.classList.remove('loading');

  const data = await res.json();
  if (!res.ok) return err.textContent = data.error || "Invalid or expired code.";

  showStep('newpass');
});

// Validate password
function validatePassword(p) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(p);
}
function attachPasswordFeedback(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);

  if (!input || !error) return;

  input.addEventListener('input', () => {
    const value = input.value;
    if (!value) {
      error.textContent = "";
      return;
    }
    if (!validatePassword(value)) {
      error.textContent = "Password must be at least 8 chars, include upper/lowercase, number and symbol.";
    } else {
      error.textContent = "";
    }
  });
}

// Step 3: Change password
document.getElementById('reset-password-btn').addEventListener('click', async () => {
  const email = document.getElementById('recover-email').value;
  const otp = document.getElementById('otp-input').value;
  const newPass = document.getElementById('new-password').value;
  const confirm = document.getElementById('confirm-new-password').value;
  const err1 = document.getElementById('newpass-error');
  const err2 = document.getElementById('confirmpass-error');
  err1.textContent = err2.textContent = '';
  if (!validatePassword(newPass)) return err1.textContent = "Weak password: Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol.";
  if (newPass !== confirm) return err2.textContent = "Passwords do not match.";
  const btn = document.getElementById('reset-password-btn');
  btn.textContent = "Changing..."; btn.classList.add('loading');
  const res = await fetch('/reset_password_with_code', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPass })
  });
  btn.textContent = "Change password"; btn.classList.remove('loading');
  const data = await res.json();
  if (!res.ok) return err1.textContent = data.error || "Reset failed.";
  showStep('success');
});

// Step 4: Success
document.getElementById('return-login-btn').addEventListener('click', () => window.location.reload());

// Timer
function startOtpTimer(seconds) {
  const timer = document.getElementById('otp-timer');
  clearInterval(window.otpInterval);
  window.otpInterval = setInterval(() => {
    if (seconds <= 0) { clearInterval(window.otpInterval); timer.textContent = "Expired"; return; }
    const m = Math.floor(seconds / 60), s = seconds % 60;
    timer.textContent = `Expires in ${m}:${s.toString().padStart(2, '0')}`;
    seconds--;
  }, 1000);
}

// Login/signup
submitBtn.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value;
  const pass = document.getElementById('auth-password').value;
  const confirm = document.getElementById('auth-confirm').value;
  const errEmail = document.getElementById('login-email-error');
  const errPass = document.getElementById('login-password-error');
  const errConfirm = document.getElementById('login-confirm-error');
  errEmail.textContent = errPass.textContent = errConfirm.textContent = '';
  if (!email) return errEmail.textContent = "Email required.";
  if (!pass) return errPass.textContent = "Password required.";
  if (!isLogin && !validatePassword(pass)) {
    errPass.textContent = "Weak password: Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol.";
    return;
  }
  if (!isLogin && pass !== confirm) return errConfirm.textContent = "Passwords do not match.";
  submitBtn.textContent = "Loading…"; submitBtn.classList.add('loading');
  // === Verificar si el correo ya existe antes de registrar ===
  if (!isLogin) {
    const checkRes = await fetch('/check_email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const checkData = await checkRes.json();
    if (checkData.exists) {
      errEmail.textContent = "Este correo ya está registrado. Por favor, inicia sesión.";
      submitBtn.textContent = "Continue";
      submitBtn.classList.remove('loading');
      return;
    }
  }
const { error } = isLogin
  ? await supabaseClient.auth.signInWithPassword({ email, password: pass })
  : await supabaseClient.auth.signUp({ email, password: pass });

// restablece UI
submitBtn.textContent = "Continue";
submitBtn.classList.remove('loading');

if (error) {
  console.log("Supabase error:", { status: error.status, message: error.message });
  const msg = (error.message || '').toLowerCase();

  // SOLO detecta colisión por mensaje, NO por status 400 genérico
  if (!isLogin && (msg.includes("already") || msg.includes("exists") || msg.includes("registered"))) {
    errEmail.textContent = "Este correo ya está registrado. Por favor, inicia sesión.";
    return;
  }

  // Otros errores (password débil, rate limit, etc.)
  errPass.textContent = "Error: " + (error.message || "Intenta de nuevo.");
  return;
}

  if (!error && !isLogin) {
    loginSection.classList.add('hidden');
    recoverySection.classList.add('hidden');
    socialButtons.classList.add('hidden');
    document.getElementById('verify-email-step').classList.remove('hidden');
    return;
  }

  let redirectTo = localStorage.getItem('oauth_redirect');
  if (!redirectTo || redirectTo === 'undefined' || redirectTo === 'null') {
    const urlParams = new URLSearchParams(window.location.search);
    redirectTo = urlParams.get('redirect');
  }
  if (redirectTo) {
    try { redirectTo = decodeURIComponent(redirectTo); } catch (e) { redirectTo = null; }
    localStorage.removeItem('oauth_redirect');
  }

  if (
    redirectTo &&
    (
      redirectTo.startsWith('/') ||
      redirectTo.startsWith('https://raavax.humancores.com') ||
      redirectTo.startsWith('https://raavax.framer.website')
    )
  ) {
    window.location.href = redirectTo;
  } else {
    window.location.href = "/";
  }
});

// Volver al login desde la pantalla de verificación
document.getElementById('back-to-login').addEventListener('click', () => {
  document.getElementById('verify-email-step').classList.add('hidden');
  loginSection.classList.remove('hidden');
  socialButtons.classList.remove('hidden');
});

// Feedback dinámico
attachPasswordFeedback('auth-password', 'login-password-error');
attachPasswordFeedback('new-password', 'newpass-error');

// Social login con fix de redirect
document.getElementById('google-signin').addEventListener('click', () => {
  const redirectParam = new URLSearchParams(window.location.search).get('redirect') || '/';
  localStorage.setItem('oauth_redirect', redirectParam);
  supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/login` }
  });
});
document.getElementById('github-signin').addEventListener('click', () => {
  const redirectParam = new URLSearchParams(window.location.search).get('redirect') || '/';
  localStorage.setItem('oauth_redirect', redirectParam);
  supabaseClient.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${window.location.origin}/login` }
  });
});

// Volver desde recuperación
document.getElementById('return-login-from-email').addEventListener('click', () => {
  recoverySection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  socialButtons.classList.remove('hidden');
});
document.getElementById('return-login-from-newpass').addEventListener('click', () => {
  recoverySection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  socialButtons.classList.remove('hidden');
});
