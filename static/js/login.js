
const SUPABASE_URL = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const stepEmail = document.getElementById('step-email');
const stepPassword = document.getElementById('step-password');
const stepForgot = document.getElementById('step-forgot');
const emailInput = document.getElementById('email-input');
const emailDisplay = document.getElementById('email-display');
const passwordInput = document.getElementById('password-input');
const togglePassword = document.getElementById('toggle-password');
const passwordStrength = document.getElementById('password-strength');
const loginBtn = document.getElementById('login-btn');
const continueEmailBtn = document.getElementById('continue-email-btn');
const forgotLink = document.getElementById('forgot-link');
const backEmail = document.getElementById('back-email');
const backPassword = document.getElementById('back-password');
const resetBtn = document.getElementById('reset-btn');
const resetEmailDisplay = document.getElementById('reset-email-display');
const otpInput = document.getElementById('otp-input');
const newPassword = document.getElementById('new-password');
const confirmPassword = document.getElementById('confirm-password');
const messages = document.getElementById('auth-messages');
const googleBtn = document.getElementById('google-btn');
const githubBtn = document.getElementById('github-btn');

continueEmailBtn.addEventListener('click', () => {
    if (!emailInput.value) { messages.textContent = "Ingresa un correo válido"; return; }
    emailDisplay.textContent = emailInput.value;
    resetEmailDisplay.textContent = emailInput.value;
    stepEmail.classList.add('hidden');
    stepPassword.classList.remove('hidden');
});

backEmail.addEventListener('click', () => {
    stepPassword.classList.add('hidden');
    stepEmail.classList.remove('hidden');
});

forgotLink.addEventListener('click', () => {
    stepPassword.classList.add('hidden');
    stepForgot.classList.remove('hidden');
});

backPassword.addEventListener('click', () => {
    stepForgot.classList.add('hidden');
    stepPassword.classList.remove('hidden');
});

togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.classList.toggle('fa-eye-slash');
});

passwordInput.addEventListener('input', () => {
    const val = passwordInput.value;
    const strong = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+])(?=.{8,})/.test(val);
    passwordStrength.textContent = strong ? 'Contraseña segura' : 'Debe tener 8 caracteres, 1 mayúscula y 1 especial';
    passwordStrength.style.color = strong ? 'green' : 'red';
});

loginBtn.addEventListener('click', async () => {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value,
            password: passwordInput.value
        });
        if (error) { messages.textContent = error.message; return; }
        window.location.href = '/';
    } catch (err) {
        messages.textContent = "Error al iniciar sesión";
    }
});

googleBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'google' }));
githubBtn.addEventListener('click', () => supabaseClient.auth.signInWithOAuth({ provider: 'github' }));

resetBtn.addEventListener('click', async () => {
    if (newPassword.value !== confirmPassword.value) { messages.textContent = "Las contraseñas no coinciden"; return; }
    try {
        const res = await fetch('/reset_password_with_code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value, otp: otpInput.value, new_password: newPassword.value })
        });
        const data = await res.json();
        if (!res.ok) { messages.textContent = data.error || 'Error al cambiar la contraseña'; return; }
        alert('Contraseña actualizada. Inicia sesión.');
        stepForgot.classList.add('hidden');
        stepPassword.classList.remove('hidden');
    } catch (err) {
        messages.textContent = "Error al restablecer la contraseña";
    }
});
