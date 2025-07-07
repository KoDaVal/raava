
// Toggle menú perfil
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');

profileBtn.addEventListener('click', () => {
  profileMenu.style.display = profileMenu.style.display === 'block' ? 'none' : 'block';
});

// Abrir ajustes
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');

settingsBtn.addEventListener('click', () => {
  settingsModal.style.display = 'block';
  profileMenu.style.display = 'none';
});

closeSettings.addEventListener('click', () => {
  settingsModal.style.display = 'none';
});

// Cerrar menú al click fuera
window.addEventListener('click', (e) => {
  if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
    profileMenu.style.display = 'none';
  }
});
