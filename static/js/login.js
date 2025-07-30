// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
  let isLoginMode = true;

  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const confirmPasswordWrapper = document.getElementById('confirm-password-wrapper');
  const passwordStrength = document.getElementById('password-strength');
  const submitBtn = document.getElementById('auth-submit-btn');
  const toggleAuthMode = document.getElementById('toggle-auth-mode');

  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotPasswordContainer = document.getElementById('forgot-password-container');
  const forgotPasswordEmail = document.getElementById('forgot-password-email');
  const forgotPasswordSubmit = document.getElementById('forgot-password-submit');
  const cancelForgotPassword = document.getElementById('cancel-forgot-password');
  const otpStep = document.getElementById('otp-step');
  const otpInput = document.getElementById('otp-input');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const resetPasswordBtn = document.getElementById('reset-password-btn');

  const googleBtn = document.getElementById('google-login');
  const githubBtn = document.getElementById('github-login');

  // Toggle login/register
  toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    submitBtn.textContent = isLoginMode ? 'Continue' : 'Sign up';
    confirmPasswordWrapper.style.display = isLoginMode ? 'none' : 'block';
    passwordStrength.style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('form-title').textContent = isLoginMode ? 'Login' : 'Sign up';
    toggleAuthMode.textContent = isLoginMode ? 'Sign up' : 'Login';
  });

  // Mostrar/ocultar contraseñas
  function setupTogglePassword(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const toggle = document.getElementById(toggleId);
    if (toggle && input) {
      toggle.addEventListener('click', () => {
        const icon = toggle.querySelector('i');
        input.type = input.type === 'password' ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      });
    }
  }
  setupTogglePassword('password', 'toggle-password');
  setupTogglePassword('confirm-password', 'toggle-confirm-password');
  setupTogglePassword('new-password', 'toggle-new-password');
  setupTogglePassword('confirm-new-password', 'toggle-confirm-new-password');

  // Medidor fuerza
  passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_\-+=])(?=.{8,})/.test(val);
    passwordStrength.textContent = strong
      ? '✅ Strong password'
      : '❌ Min 8 chars, 1 uppercase, 1 symbol';
    passwordStrength.style.color = strong ? 'green' : 'crimson';
  });

  // Olvidaste tu contraseña
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    form.style.display = 'none';
    forgotPasswordContainer.style.display = 'block';
  });
  cancelForgotPassword.addEventListener('click', () => {
    forgotPasswordContainer.style.display = 'none';
    form.style.display = 'block';
    otpStep.style.display = 'none';
  });

  // Enviar OTP
  forgotPasswordSubmit.addEventListener('click', async () => {
    const email = forgotPasswordEmail.value.trim();
    if (!email) return alert('Enter your email');
    const res = await fetch('/request_password_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      alert('Code sent to your email.');
      otpStep.style.display = 'block';
    } else {
      const data = await res.json();
      alert(data.error || 'Error sending code.');
    }
  });

  // Reset password
  resetPasswordBtn.addEventListener('click', async () => {
    const email = forgotPasswordEmail.value.trim();
    const otp = otpInput.value.trim();
    const newPass = newPasswordInput.value.trim();
    const confirmPass = confirmNewPasswordInput.value.trim();
    if (newPass !== confirmPass) return alert('Passwords do not match');
    const res = await fetch('/reset_password_with_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: newPass })
    });
    if (res.ok) {
      alert('Password updated successfully.');
      location.reload();
    } else {
      const data = await res.json();
      alert(data.error || 'Error resetting password.');
    }
  });

  // Social login
  googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
  githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));

  // Enviar login/register
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (isLoginMode) {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return alert(error.message);
      location.href = '/';
    } else {
      const confirmPassword = confirmPasswordInput.value;
      if (password !== confirmPassword) return alert('Passwords do not match.');
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) return alert(error.message);
      alert('Check your email to confirm your account.');
    }
  });
});

