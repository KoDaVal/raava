// ======= Supabase Setup =======
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'TU_ANON_KEY';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======= Elements =======
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordWrapper = document.getElementById('confirm-password-wrapper');
const confirmPasswordInput = document.getElementById('confirm-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authMessages = document.getElementById('auth-messages');
const toggleAuthModeLink = document.getElementById('toggle-auth-mode');
const formTitle = document.getElementById('form-title');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordContainer = document.getElementById('forgot-password-container');
const forgotPasswordEmail = document.getElementById('forgot-password-email');
const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
const otpStep = document.getElementById('otp-step');
const otpInput = document.getElementById('otp-input');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const resetPasswordBtn = document.getElementById('reset-password-btn');
const cancelForgotPasswordBtn = document.getElementById('cancel-forgot-password');
const googleLoginBtn = document.getElementById('google-login');
const githubLoginBtn = document.getElementById('github-login');

let isLoginMode = true;

// ======= Init =======
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) window.location.href = "/";
})();

// ======= Toggle Password Visibility =======
document.getElementById('toggle-password').addEventListener('click', () => {
  passwordInput.type = passwordInput.type === 'password' ? 'text' : 'password';
});

// ======= Toggle Auth Mode =======
toggleAuthModeLink.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  formTitle.textContent = isLoginMode ? 'Iniciar sesión' : 'Registrarse';
  authSubmitBtn.textContent = isLoginMode ? 'Entrar' : 'Crear cuenta';
  confirmPasswordWrapper.style.display = isLoginMode ? 'none' : 'block';
  toggleAuthModeLink.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión';
  authMessages.textContent = '';
});

// ======= Auth Form =======
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authMessages.textContent = '';
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    authMessages.textContent = "Completa todos los campos.";
    return;
  }

  if (!isLoginMode && password !== confirmPasswordInput.value.trim()) {
    authMessages.textContent = "Las contraseñas no coinciden.";
    return;
  }

  if (isLoginMode) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      authMessages.textContent = error.message;
    } else {
      window.location.href = "/";
    }
  } else {
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) {
      authMessages.textContent = error.message;
    } else {
      authMessages.textContent = "Registro exitoso. Revisa tu correo.";
    }
  }
});

// ======= Forgot Password =======
forgotPasswordLink.addEventListener('click', () => {
  forgotPasswordContainer.style.display = 'block';
});

forgotPasswordSubmit.addEventListener('click', async () => {
  const email = forgotPasswordEmail.value.trim();
  if (!email) {
    authMessages.textContent = "Ingresa tu correo.";
    return;
  }
  const res = await fetch('/request_password_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (res.ok) {
    otpStep.style.display = 'block';
    authMessages.textContent = "Código enviado. Revisa tu correo.";
  } else {
    const data = await res.json();
    authMessages.textContent = data.error || "Error al enviar código.";
  }
});

resetPasswordBtn.addEventListener('click', async () => {
  const email = forgotPasswordEmail.value.trim();
  const otp = otpInput.value.trim();
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmNewPasswordInput.value.trim();
  if (!otp || !newPassword || newPassword !== confirmPassword) {
    authMessages.textContent = "Datos inválidos o contraseñas no coinciden.";
    return;
  }
  const res = await fetch('/reset_password_with_code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp, new_password: newPassword })
  });
  if (res.ok) {
    authMessages.textContent = "Contraseña actualizada. Inicia sesión.";
    forgotPasswordContainer.style.display = 'none';
  } else {
    const data = await res.json();
    authMessages.textContent = data.error || "Error al cambiar contraseña.";
  }
});

cancelForgotPasswordBtn.addEventListener('click', () => {
  forgotPasswordContainer.style.display = 'none';
});

// ======= Social Login =======
googleLoginBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
});
githubLoginBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signInWithOAuth({ provider: 'github' });
});

