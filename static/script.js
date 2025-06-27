const toggleTheme = document.getElementById('toggle-theme');
toggleTheme.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  toggleTheme.textContent = document.body.classList.contains('light-mode')
    ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro';
});

const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.querySelector('.messages');

async function addMessage(sender, text) {
  const msg = document.createElement('div');
  msg.classList.add('message', sender);
  msg.textContent = text;
  messagesContainer.appendChild(msg);
  requestAnimationFrame(() => {
    msg.classList.add('appeared');
    msg.scrollIntoView({ behavior: 'smooth', block: 'end' });
  });
}

sendButton.addEventListener('click', () => {
  const text = userInput.value.trim();
  if (text) {
    addMessage('user', text);
    userInput.value = '';
  }
});

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendButton.click();
  }
});

// Demo: mensaje de bienvenida
addMessage('bot', '¡Hola! Soy Raava. ¿En qué puedo ayudarte hoy?');
