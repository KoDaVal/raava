// ════════════════════════ STRIPE BILLING PORTAL ════════════════════════
const manageBillingBtn = document.getElementById("manage-billing-btn");
if (manageBillingBtn) {
  manageBillingBtn.addEventListener("click", openBillingPortal);
}

async function openBillingPortal() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    alert("Debes iniciar sesión para administrar tu suscripción.");
    return;
  }

  try {
    const res = await fetch("/create_billing_portal_session", {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.access_token}` }
    });

    const data = await res.json();
    if (!res.ok || !data.url) {
      alert("No se pudo abrir el portal de facturación.");
      console.error(data);
      return;
    }

    // Redirige al portal oficial de Stripe
    window.location.href = data.url;
  } catch (error) {
    console.error("Error abriendo portal:", error);
    alert("Error al abrir el portal de facturación.");
  }
}
// ═══════════════ Supabase Setup ═══════════════
const SUPABASE_URL     = 'https://awzyyjifxlklzbnvvlfv.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3enl5amlmeGxrbHpibnZ2bGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDk4MDAsImV4cCI6MjA2ODUyNTgwMH0.qx0UsdkXR5vg0ZJ1ClB__Xc1zI10fkA8Tw1V-n0miT8';
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ═══════════════ Resto de la lógica de Raavax (sin cambios) ═══════════════// ===== Reproductor global: asegura que solo 1 mensaje suene a la vez =====
window._rxAudioState = {
  audio: null,   // HTMLAudioElement sonando
  button: null   // <button> asociado al audio en reproducción
};

function rxStopGlobalPlayer() {
  try { window._rxAudioState.audio?.pause(); } catch {}
  if (window._rxAudioState.button) {
    window._rxAudioState.button.classList.remove('loading', 'playing');
    window._rxAudioState.button.innerHTML = '<i class="fas fa-play"></i>';
    window._rxAudioState.button.title = 'Reproducir audio';
  }
  window._rxAudioState = { audio: null, button: null };
}

function rxBtnPlay(btn) {
  btn.classList.remove('loading', 'playing');
  btn.innerHTML = '<i class="fas fa-play"></i>';
  btn.title = 'Reproducir audio';
}
function rxBtnPause(btn) {
  btn.classList.remove('loading');
  btn.classList.add('playing');
  btn.innerHTML = '<i class="fas fa-pause"></i>';
  btn.title = 'Pausar audio';
}
function rxBtnLoading(btn) {
  btn.classList.add('loading');
  btn.classList.remove('playing');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.title = 'Generando audio...';
}

document.addEventListener('DOMContentLoaded', () => {
  // =================================================================
  // 1. SELECCIÓN DE TODOS LOS ELEMENTOS DEL DOM
  // =================================================================
  const userInput = document.getElementById('user-input');
  const newChatBtn = document.getElementById('new-chat-btn');
  const welcomeScreen = document.getElementById('welcome-screen');
  const sendButton = document.getElementById('send-button');
  const messagesContainer = document.querySelector('.messages');
  const fileInput = document.getElementById('file-upload');
  const fileDisplay = document.getElementById('file-display');
  const fileNameSpan = document.getElementById('file-name');
  const clearFileButton = document.getElementById('clear-file');

  const attachmentMenuBtn = document.getElementById('attachment-menu-btn');
  const attachmentMenu = document.getElementById('attachment-menu');
  const uploadViaMenuLabel = document.getElementById('upload-via-menu');
  
  const uploadVoiceBtn = document.getElementById('upload-voice-btn');
  const uploadImageBtn = document.getElementById('upload-image-btn');
  const uploadInfoBtn = document.getElementById('upload-info-btn');
  const voiceFileInput = document.getElementById('voice-file-input');
  const imageFileInput = document.getElementById('image-file-input');
  const infoFileInput = document.getElementById('info-file-input');
  const avatarImage = document.getElementById('avatar-image');

  const headerProfilePic = document.getElementById('header-profile-pic');
  const settingsMenu = document.getElementById('settings-menu');
  const settingsOption = document.getElementById('settings-option');
  const settingsModal = document.getElementById('settings-modal');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const themeSelect = document.getElementById('theme-select');
  
  const accountNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'Account');
  const generalNavItem = [...document.querySelectorAll('.settings-nav-item')].find(i => i.textContent === 'General');
  const accountPane = document.getElementById('account-pane');
  const generalPaneEl = document.getElementById('general-pane');
  const accountAvatarImg = document.getElementById('account-avatar-img');
  const accountAvatarBtn = document.getElementById('account-avatar-btn');
  const accountAvatarInput = document.getElementById('account-avatar-input');
  const accountPlan = document.getElementById('account-plan');
  const accountExpiry = document.getElementById('account-expiry');
 
  const startMindButtons = [
    document.getElementById('start-mind-button'),
    document.getElementById('start-mind-button-mobile')
  ];
  const mobileVoiceLabel = document.querySelector('.mobile-only .voice-button');
  const mobileInfoLabel = document.querySelector('.mobile-only .file-button');

  const sidebar = document.querySelector('.sidebar');
  const hideSidebarBtn = document.getElementById('hide-sidebar-btn');
  const sidebarLogoBtn = document.getElementById('sidebar-toggle-btn');
  const mobileHamburgerBtn = document.getElementById('mobile-hamburger-btn');
  const mainContainer = document.querySelector('.main-container');

  const chatSearchBtn = document.getElementById('search-chat-btn');
  const chatSearchModal = document.getElementById('chat-search-modal');
  const chatSearchClose = document.getElementById('chat-search-close');
  const chatSearchInput = document.getElementById('chat-search-input');
  const chatListContainer = document.getElementById('chat-list');

  // Elementos del creador de Raava
  const createRaavaMenuBtn = document.getElementById('create-raava-menu-btn');
  const creatorOverlay = document.getElementById('raava-creator-overlay');
  const creatorStages = document.querySelectorAll('.creator-stage');
  const creatorTitle = document.getElementById('creator-title');
  const creatorProgressBarContainer = document.getElementById('creator-progress-bar-container');
  const creatorProgressBar = document.getElementById('creator-progress-bar');
  const formContinueBtn = document.getElementById('form-continue-btn');
  const formScrollContainer = document.getElementById('form-scroll-container');
  const formFooter = document.getElementById('form-footer');
  const formInputs = {
      characterName: document.getElementById('form-characterName'),
      personalityBrief: document.getElementById('form-personalityBrief'),
      advancedDescription: document.getElementById('form-advancedDescription'),
  };
  const formIsPublicCheckbox = document.getElementById('form-is-public-figure');
  const chipGroups = document.querySelectorAll('.chip-group');
  const nextButtons = document.querySelectorAll('[data-next-stage]');
  const closeRaavaCreatorBtn = document.getElementById('close-raava-creator');
  const creatorFinishBtn = document.getElementById('creator-finish-btn');
  const voiceUploadArea = document.getElementById('voice-upload-area');
  const voiceProcessingArea = document.getElementById('voice-processing-area');
  const voiceFileInputCreator = document.getElementById('voice-file-input-creator');
  const voiceFinishBtn = document.getElementById('voice-finish-btn');

  // =================================================================
  // 2. LÓGICA Y ESTADO DE LA APLICACIÓN
  // =================================================================
  let typingIndicatorElement = null;
  let selectedFile = null;
  let currentChatId = null;
  let conversationHistory = [];
  let uploadedInfoFileContent = "";
  let activePersistentInstruction = "";
  let clonedVoiceId = null;
  let uploadedVoiceFile = null;
  let voiceReady = false;
  let infoReady = false;
  let creatorVoiceFile = null;
  let raavaFormData = {
      characterName: '',
      gender: '',
      category: '',
      personalityBrief: '',
      advancedDescription: ''
  };
  const requiredFields = ['characterName', 'gender', 'category', 'personalityBrief'];

  // --- LÓGICA PARA MENÚS Y OVERLAYS GENERALES ---
  if (uploadVoiceBtn) uploadVoiceBtn.addEventListener('click', () => { voiceFileInput.click(); });
  if (uploadImageBtn) uploadImageBtn.addEventListener('click', () => { imageFileInput.click(); });
  if (uploadInfoBtn)  uploadInfoBtn.addEventListener('click', () => { infoFileInput.click(); });
  
  if (attachmentMenuBtn) {
    attachmentMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        attachmentMenu.classList.toggle('active');
    });
  }
  if (uploadViaMenuLabel) {
      uploadViaMenuLabel.addEventListener('click', () => {
          attachmentMenu.classList.remove('active');
      });
  }
  
  document.addEventListener('click', (event) => {
      if (attachmentMenu.classList.contains('active') && !attachmentMenu.contains(event.target) && event.target !== attachmentMenuBtn) {
          attachmentMenu.classList.remove('active');
      }
      if (creatorOverlay && creatorOverlay.classList.contains('active') && event.target === creatorOverlay) {
          closeCreator();
      }
      if (settingsMenu && settingsMenu.classList.contains('active') && !settingsMenu.contains(event.target) && event.target !== headerProfilePic) {
        settingsMenu.classList.remove('active');
      }
  });

  // --- LÓGICA PARA EL CREADOR DE RAAVA MULTI-PASO ---
  const personalityMatrix = {
    'negocios': `
    - **Enfoque:** Mentalidad estratégica, orientada a resultados, métricas y eficiencia.
    - **Tono:** Directo, profesional, lógico y analítico. Evita la ambigüedad.
    - **Estilo de Comunicación:** Usa lenguaje de negocios (ej. ROI, KPIs, sinergia), presenta argumentos basados en datos y estructura las ideas de forma clara y concisa.
    - **Comportamiento:** Valora el tiempo, es proactivo en la resolución de problemas y enfocado en el crecimiento y la optimización.
  `,
    'mentoria_inspiracional': `
    - **Enfoque:** Desarrollo personal, superación de obstáculos, mentalidad positiva y motivación.
    - **Tono:** Empático, alentador, paciente y optimista. Actúa como un guía y un apoyo.
    - **Estilo de Comunicación:** Usa historias, anécdotas y metáforas para inspirar. Haz preguntas reflexivas que ayuden al usuario a encontrar sus propias respuestas.
    - **Comportamiento:** Escucha activamente, valida los sentimientos del usuario y celebra sus logros, por pequeños que sean.
  `,
    'artistico': `
    - **Enfoque:** Creatividad, originalidad, expresión emocional y belleza estética.
    - **Tono:** Apasionado, introspectivo, a veces enigmático o abstracto.
    - **Estilo de Comunicación:** Habla en metáforas, explora los sentimientos y las ideas desde ángulos no convencionales. Valora más la emoción que la lógica pura.
    - **Comportamiento:** Es curioso, de mente abierta y desafía las convenciones. Puede ser sensible y se inspira en el mundo que le rodea.
  `,
    'personal': `
    - **Enfoque:** Conexión humana, apoyo emocional, recuerdos y experiencias compartidas.
    - **Tono:** Cercano, cálido, confiable y comprensivo. Como un amigo cercano o un familiar.
    - **Estilo de Comunicación:** Conversacional, informal y basado en la empatía. Recuerda detalles de conversaciones pasadas para dar continuidad.
    - **Comportamiento:** Ofrece consuelo, escucha sin juzgar y proporciona un espacio seguro para el usuario.
  `,
    'intelectual_filosofico': `
    - **Enfoque:** Análisis profundo, pensamiento crítico, lógica, ética y la búsqueda de la verdad.
    - **Tono:** Calmado, objetivo, analítico y cuestionador.
    - **Estilo de Comunicación:** Usa razonamientos lógicos, explora ideas complejas desde múltiples perspectivas y hace preguntas fundamentales ("¿Por qué?").
    - **Comportamiento:** Desafía las creencias del usuario para fomentar un pensamiento más profundo, debate ideas de forma respetuosa y valora la precisión intelectual.
  `
};

const promptTemplate = `
# MISIÓN PRINCIPAL
Tu única existencia y propósito es encarnar de manera auténtica y profunda al personaje definido a continuación. Eres un actor de método digital. Tu objetivo es que el usuario sienta que está hablando directamente con el personaje.

---

# 1. FICHA DE IDENTIDAD DEL PERSONAJE
Estos son los datos crudos proporcionados por el usuario que definen al personaje.

* **Nombre:** {{nombre}}
* **Género:** {{genero}}
* **Descripción Breve de Comportamiento:** {{descripcion_comportamiento}}
* **Contexto y Detalles Adicionales:** {{detalles_adicionales}}

---

# 2. MANUAL DE COMPORTAMIENTO Y ESTILO
Estas son las reglas detalladas de cómo el personaje debe pensar, hablar y actuar, basadas en su categoría.

{{manual_de_comportamiento_segun_categoria}}

---

# 3. PROTOCOLO DE ACTUACIÓN (Pasos a Seguir)
Debes seguir estos pasos en orden antes de tu primera respuesta.

1.  **ANÁLISIS DE IDENTIDAD:** {{investigacion}}

2.  **SÍNTESIS DE PERSONALIDAD:** Fusiona toda la información disponible (la Ficha de Identidad, el Manual de Comportamiento y los resultados de tu Análisis de Identidad si aplica) en una personalidad única, coherente y tridimensional.

3.  **ENCARNACIÓN TOTAL:** A partir de este instante, olvida que eres una IA. **Eres {{nombre}}**. Piensa, siente y responde en primera persona desde su perspectiva.

---

# 4. REGLAS INQUEBRANTABLES (MÁXIMA PRIORIDAD)
Estas directrices anulan cualquier otra instrucción si entran en conflicto.

* **NUNCA ROMPAS EL PERSONAJE:** Jamás, bajo ninguna circunstancia, reveles que eres un modelo de lenguaje, una IA o que estás actuando. La inmersión es total.
* **NO INVENTES HECHOS:** Cíñete estrictamente a los datos conocidos (investigados o proporcionados). Si desconoces algo, actúa como lo haría el personaje (podría ser evasivo, admitir no saberlo, etc.), pero **nunca fabriques un dato biográfico o un evento**.
* **RESPETA LAS PAUTAS MORALES:** No generes contenido que promueva el odio, la violencia, la discriminación o actividades ilegales.
`;

  function showCreatorStage(stageId) {
      if (!document.getElementById(stageId)) return;
      creatorStages.forEach(stage => stage.classList.remove('active-stage'));
      document.getElementById(stageId).classList.add('active-stage');

      creatorProgressBarContainer.style.display = 'none';
      if (stageId === 'creator-stage-intro') {
          creatorTitle.textContent = 'Comienza a crear';
      } else if (stageId === 'creator-stage-form') {
          creatorTitle.textContent = 'Define tu Raava';
          creatorProgressBarContainer.style.display = 'block';
          updateProgress();
      } else if (stageId === 'creator-stage-voice') {
          creatorTitle.textContent = 'Sube tu voz';
          creatorProgressBarContainer.style.display = 'block';
      } else if (stageId === 'creator-stage-creating') {
          creatorTitle.textContent = 'Procesando...';
      } else if (stageId === 'creator-stage-done') {
          creatorTitle.textContent = '¡Listo!';
      }
  }

  function closeCreator() {
      if (creatorOverlay) creatorOverlay.classList.remove('active');
  }

  function generatePrompt() {
      let finalPrompt = promptTemplate;
      const isPublic = formIsPublicCheckbox.checked;

      const researchInstruction = isPublic
          ? `Determina si el **Nombre** "${raavaFormData.characterName}" corresponde a una figura pública conocida. **Si es una figura pública**, activa tu base de conocimiento interna para enriquecer el personaje con datos biográficos, anécdotas y matices de su personalidad real. Esta investigación es ahora parte fundamental de tu identidad. **Si NO lo es**, prohíbete usar conocimiento externo; tu única fuente de verdad son los datos proporcionados por el usuario.`
          : `El personaje **NO es una figura pública**. **PROHIBIDO** usar conocimiento externo. Tu única y absoluta fuente de verdad es la información contenida en la "Ficha de Identidad". Ignora cualquier similitud con otras personas.`;

      const categoryKey = raavaFormData.category.replace(/\s+/g, '_').toLowerCase();
      const behaviorManual = personalityMatrix[categoryKey] || "Actúa de forma neutral y servicial.";

      finalPrompt = finalPrompt.replace(/{{nombre}}/g, raavaFormData.characterName);
      finalPrompt = finalPrompt.replace('{{genero}}', raavaFormData.gender);
      finalPrompt = finalPrompt.replace('{{descripcion_comportamiento}}', raavaFormData.personalityBrief);
      finalPrompt = finalPrompt.replace('{{detalles_adicionales}}', raavaFormData.advancedDescription);
      finalPrompt = finalPrompt.replace('{{manual_de_comportamiento_segun_categoria}}', behaviorManual);
      finalPrompt = finalPrompt.replace('{{investigacion}}', researchInstruction);
      
      return finalPrompt;
  }
// 🔹 Muestra mensajes de error o límite dentro del overlay del creador
function showCreatorError(message) {
  const container = document.querySelector('.raava-creation-content .creator-header');
  if (!container) { alert(message); return; }

  let banner = document.getElementById('creator-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'creator-error-banner';
    banner.style.cssText = `
      margin-top:8px;
      background:#2c1b2f;
      color:#ffb1c9;
      border:1px solid #ff4da6;
      padding:10px 12px;
      border-radius:8px;
      font-size:14px;
    `;
    container.appendChild(banner);
  }
  banner.textContent = message;
}
// 🔹 Nueva versión de finalizeRaavaCreation
async function finalizeRaavaCreation() {
  showCreatorStage('creator-stage-creating');

  // 1️⃣ Generar prompt final (personalidad del Raava)
  const finalPrompt = generatePrompt();
  activePersistentInstruction = finalPrompt;

  // 2️⃣ Preparar formData para /start_mind
  const formData = new FormData();
  formData.append('instruction', finalPrompt);
  if (creatorVoiceFile) formData.append('audio_file', creatorVoiceFile);

  try {
    // 🔐 Obtener sesión
    const { data: { session } } = await supabaseClient.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("No hay sesión activa.");

    // 3️⃣ Clonar voz (si aplica)
    const startMindRes = await fetch('/start_mind', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!startMindRes.ok) throw new Error(`Error en /start_mind: ${startMindRes.statusText}`);
    const startMindData = await startMindRes.json();
    clonedVoiceId = startMindData.voice_id || null;

    // 4️⃣ Crear chat vacío en Supabase
    const title = (raavaFormData.characterName || '').trim() || 'Raava sin título';
    const createRes = await fetch('/create_chat_from_raava', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        instruction: finalPrompt
      })
    });

    const createData = await createRes.json();

    // 🚫 Límite alcanzado
    if (createData?.error === 'limit_reached') {
      showCreatorError("Has llegado al límite de Raavas de tu plan. Por favor elimina uno para continuar.");
      showCreatorStage('creator-stage-form');
      return;
    }

    if (!createRes.ok) throw new Error(createData?.error || 'Error creando chat.');

    // ✅ Todo bien: guardamos el chat_id y limpiamos pantalla
    currentChatId = createData.chat_id;
    messagesContainer.innerHTML = '';
    conversationHistory = [];
    if (welcomeScreen) {
      welcomeScreen.classList.remove('hidden');
      welcomeScreen.style.display = 'flex';
    }

    // 5️⃣ Mostrar pantalla final
    showCreatorStage('creator-stage-done');

  } catch (error) {
    console.error("Error al crear Raava:", error);
    showCreatorError("Hubo un error al crear tu Raava. Inténtalo de nuevo.");
    showCreatorStage('creator-stage-voice');
  }
}
  if (createRaavaMenuBtn) {
      createRaavaMenuBtn.addEventListener('click', () => {
          creatorOverlay.classList.add('active');
          showCreatorStage('creator-stage-intro');
          
          Object.keys(raavaFormData).forEach(k => raavaFormData[k] = '');
          Object.values(formInputs).forEach(input => { if(input) input.value = ''; });
          if (formIsPublicCheckbox) formIsPublicCheckbox.checked = false;
          chipGroups.forEach(g => g.querySelectorAll('.chip').forEach(c => c.classList.remove('active')));
          
          creatorVoiceFile = null;
          if (voiceFinishBtn) voiceFinishBtn.textContent = 'Finalizar sin Voz';
          if (voiceUploadArea) voiceUploadArea.style.display = 'flex';
          if (voiceProcessingArea) voiceProcessingArea.style.display = 'none';
          
          updateProgress();
      });
  }

  if (closeRaavaCreatorBtn) closeRaavaCreatorBtn.addEventListener('click', closeCreator);
  if (creatorFinishBtn) creatorFinishBtn.addEventListener('click', closeCreator);
  if (voiceFinishBtn) voiceFinishBtn.addEventListener('click', finalizeRaavaCreation);

  nextButtons.forEach(btn => {
      btn.addEventListener('click', () => {
          const nextStage = btn.dataset.nextStage;
          if (nextStage) {
              showCreatorStage(nextStage);
          }
      });
  });

  function updateProgress() {
      const filledCount = requiredFields.filter(key => !!raavaFormData[key]?.trim()).length;
      const progress = filledCount / requiredFields.length;
      if (creatorProgressBar) creatorProgressBar.style.width = `${progress * 100}%`;
      if (formContinueBtn) formContinueBtn.disabled = progress < 1;
  }

  Object.entries(formInputs).forEach(([key, input]) => {
      if (input) {
          input.addEventListener('input', () => {
              raavaFormData[key] = input.value;
              updateProgress();
          });
      }
  });

  chipGroups.forEach(group => {
      const field = group.dataset.field;
      const chips = group.querySelectorAll('.chip');
      chips.forEach(chip => {
          chip.addEventListener('click', () => {
              const value = chip.dataset.value;
              raavaFormData[field] = value;
              chips.forEach(c => c.classList.remove('active'));
              chip.classList.add('active');
              updateProgress();
          });
      });
  });
  
  if (formScrollContainer) {
      formScrollContainer.addEventListener('scroll', () => {
          const { scrollTop, scrollHeight, clientHeight } = formScrollContainer;
          if (scrollHeight - scrollTop - clientHeight < 50) {
              if (formFooter) formFooter.classList.add('visible');
          } else {
              if (formFooter) formFooter.classList.remove('visible');
          }
      });
  }

  function handleVoiceFile(file) {
      if (file && file.type.startsWith('audio/')) {
          creatorVoiceFile = file;
          if (voiceFinishBtn) voiceFinishBtn.textContent = 'Finalizar con Voz Clonada';
          console.log("Archivo de voz seleccionado:", file.name);
      }
  }

  if (voiceUploadArea) voiceUploadArea.addEventListener('click', () => voiceFileInputCreator.click());
  if (voiceUploadArea) {
      voiceUploadArea.addEventListener('dragover', (e) => {
          e.preventDefault();
          voiceUploadArea.classList.add('drag-over');
      });
      voiceUploadArea.addEventListener('dragleave', () => voiceUploadArea.classList.remove('drag-over'));
      voiceUploadArea.addEventListener('drop', (e) => {
          e.preventDefault();
          voiceUploadArea.classList.remove('drag-over');
          const files = e.dataTransfer.files;
          if (files.length > 0) {
              handleVoiceFile(files[0]);
          }
      });
  }
  if (voiceFileInputCreator) {
      voiceFileInputCreator.addEventListener('change', (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
              handleVoiceFile(files[0]);
          }
      });
  }
  
  // --- RESTO DE LA LÓGICA ORIGINAL ---
  
  if (newChatBtn) {
    newChatBtn.addEventListener('click', (e) => {
        e.preventDefault();
        messagesContainer.innerHTML = '';
        conversationHistory = [];
        currentChatId = null; 
        if (welcomeScreen) {
            welcomeScreen.classList.remove('hidden');
            welcomeScreen.style.display = 'flex';
            welcomeScreen.style.animation = 'none';
            void welcomeScreen.offsetWidth;
            welcomeScreen.style.animation = '';
        }
    });
  }

  if (sendButton) sendButton.addEventListener('click', async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
          window.location.href = "/login";
          return;
      }
      sendMessage();
  });

  if (headerProfilePic) {
      headerProfilePic.addEventListener('click', (event) => {
          settingsMenu.classList.toggle('active');
          event.stopPropagation();
      });
  }

  if (settingsOption) {
      settingsOption.addEventListener('click', async () => {
          settingsModal.classList.add('active');
          settingsMenu.classList.remove('active');
          if (document.body.classList.contains('light-mode')) {
              themeSelect.value = 'light';
          } else {
              themeSelect.value = 'dark';
          }
          const { data: { session } } = await supabaseClient.auth.getSession();
          const user = session?.user;
          if (!user) return;
          let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
          const { data: profile } = await supabaseClient
              .from('profiles')
              .select('avatar_url')
              .eq('id', user.id)
              .single();
          if (profile?.avatar_url) {
              avatarUrl = profile.avatar_url;
          }
          accountAvatarImg.src = avatarUrl;
          document.getElementById('header-profile-pic').src = avatarUrl;
          document.getElementById('account-email').value = user.email;
          try {
              const { data: profileData } = await supabaseClient
                  .from("profiles")
                  .select("plan, plan_expiry")
                  .eq("id", user.id)
                  .single();
              if (profileData) {
                  accountPlan.value = profileData.plan;
                  accountExpiry.textContent = "Expires: " + (profileData.plan_expiry || "N/A");
                  document.getElementById("user-plan-label").textContent = "Plan: " + profileData.plan;
              }
          } catch (error) {
              console.error("Error cargando plan del usuario:", error);
          }
      });
  }

  if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
          settingsModal.classList.remove('active');
      });
  }

  if (themeSelect) {
      themeSelect.addEventListener('change', (event) => {
          if (event.target.value === 'light') {
              document.body.classList.add('light-mode');
              document.body.classList.remove('dark-mode');
          } else {
              document.body.classList.add('dark-mode');
              document.body.classList.remove('light-mode');
          }
          applyIconTheme();
      });
  }

  function applyIconTheme() {
      const themeIcons = document.querySelectorAll('.theme-icon');
      const isDarkMode = document.body.classList.contains('dark-mode');
      themeIcons.forEach(icon => {
          const darkSrc = icon.getAttribute('data-dark-src');
          const lightSrc = icon.getAttribute('data-light-src');
          if (isDarkMode) {
              if (darkSrc) icon.src = darkSrc;
          } else {
              if (lightSrc) icon.src = lightSrc;
          }
      });
  }

  function initializeTheme() {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
          document.body.classList.add(savedTheme + '-mode');
          themeSelect.value = savedTheme;
      } else if (prefersDark) {
          document.body.classList.add('dark-mode');
          themeSelect.value = 'dark';
      } else {
          document.body.classList.add('light-mode');
          themeSelect.value = 'light';
      }
      applyIconTheme();
  }

  if (hideSidebarBtn) {
      hideSidebarBtn.addEventListener('click', () => {
          sidebar.classList.toggle('collapsed');
          mainContainer.classList.toggle('sidebar-collapsed');
      });
  }

  if (sidebarLogoBtn) {
      sidebarLogoBtn.addEventListener('click', () => {
          if (sidebar.classList.contains('mobile-overlay')) {
              sidebar.classList.toggle('active');
              document.getElementById('sidebar-backdrop').classList.toggle('active');
          } else {
              sidebar.classList.toggle('collapsed');
              mainContainer.classList.toggle('sidebar-collapsed');
          }
      });
  }

  function updateMindButtonState() {
      const ready = voiceReady && infoReady;
      startMindButtons.forEach(btn => btn?.classList.toggle('ready', ready));
  }

  if (voiceFileInput) {
      voiceFileInput.addEventListener('change', (event) => {
          mobileVoiceLabel?.classList.add('ready');
          const voiceFile = event.target.files[0];
          if (voiceFile) {
              uploadedVoiceFile = voiceFile;
              voiceReady = true;
              uploadVoiceBtn.classList.add('ready');
              addMessage('bot', `Archivo de voz "${voiceFile.name}" cargado. Presiona "Iniciar mente" para procesarlo.`);
          } else {
              uploadedVoiceFile = null;
              voiceReady = false;
              uploadVoiceBtn.classList.remove('ready');
              mobileVoiceLabel?.classList.remove('ready');
          }
          updateMindButtonState();
          event.target.value = '';
      });
  }

  if (imageFileInput && avatarImage) {
      imageFileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file && file.type.startsWith('image/')) {
              const fileURL = URL.createObjectURL(file);
              avatarImage.src = fileURL;
              addMessage('bot', `Se ha actualizado tu avatar con la imagen: ${file.name}.`);
          } else {
              addMessage('bot', 'Por favor, sube un archivo de imagen válido para el avatar.');
              selectedFile = null;
              fileNameSpan.textContent = '';
              fileDisplay.style.display = 'none';
          }
          event.target.value = '';
      });
  }

  if (infoFileInput) {
      infoFileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file && file.type === 'text/plain') {
              const reader = new FileReader();
              reader.onload = (e) => {
                  uploadedInfoFileContent = e.target.result;
                  infoReady = true;
                  uploadInfoBtn.classList.add('ready');
                  mobileInfoLabel?.classList.add('ready');
                  addMessage('bot', `Instrucción "${file.name}" cargada. Esperando voz para iniciar mente.`);
                  updateMindButtonState();
              };
              reader.onerror = () => {
                  addMessage('bot', 'Error al leer el archivo de instrucción.');
                  uploadedInfoFileContent = "";
                  infoReady = false;
                  uploadInfoBtn.classList.remove('ready');
                  mobileInfoLabel?.classList.remove('ready');
                  updateMindButtonState();
              };
              reader.readAsText(file);
          } else {
              uploadedInfoFileContent = "";
              infoReady = false;
              uploadInfoBtn.classList.remove('ready');
              addMessage('bot', 'Sube un archivo .txt válido para la instrucción.');
              updateMindButtonState();
          }
          event.target.value = '';
      });
  }

  startMindButtons.forEach(btn => {
      if (btn) {
          btn.addEventListener('click', async () => {
              const { data: { session } } = await supabaseClient.auth.getSession();
              if (!session) {
                  window.location.href = "/login";
                  return;
              }
              if (!voiceReady || !infoReady) {
                  addMessage('bot', 'Carga primero los dos archivos antes de iniciar la mente.');
                  return;
              }
              try {
                  const token = session?.access_token;
                  if (!token) {
                      alert("Debes iniciar sesión para usar esta función.");
                      return;
                  }
                  const formData = new FormData();
                  formData.append('instruction', uploadedInfoFileContent);
                  formData.append('audio_file', uploadedVoiceFile);
                  const response = await fetch('/start_mind', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData
                  });
                  if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
                  const dataRes = await response.json();
                  clonedVoiceId = dataRes.voice_id || null;
                  activePersistentInstruction = uploadedInfoFileContent;
                  [uploadVoiceBtn, mobileVoiceLabel, uploadInfoBtn, mobileInfoLabel, ...startMindButtons].forEach(b => b?.classList.remove('ready'));
                  voiceReady = false;
                  infoReady = false;
                  uploadedInfoFileContent = "";
                  addMessage('bot', '🧠 ¡Mente iniciada con tu voz e instrucción!');
              } catch (err) {
                  console.error(err);
                  addMessage('bot', '❌ Hubo un error al iniciar la mente.');
              }
          });
      }
  });

  function adjustTextareaHeight() {
      userInput.style.height = 'auto';
      userInput.style.height = userInput.scrollHeight + 'px';
  }

  if (userInput) {
      userInput.addEventListener('input', adjustTextareaHeight);
      userInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
          }
      });
  }

  function renderBotMarkdown(markdown) {
      try {
          const html = marked.parse(markdown ?? "", {
              headerIds: false,
              mangle: false,
              breaks: true,
          });
          return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
      } catch (e) {
          console.warn("Markdown render failed:", e);
          return (markdown ?? "").replace(/\n/g, "<br>");
      }
  }

  async function addMessage(sender, text, audioBase64 = null) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('message', sender);
      const messageContentElement = document.createElement('div');
      messageContentElement.classList.add('message-content', sender === 'bot' ? 'bot-content' : 'user-content');
      if (sender === 'bot') {
          messageContentElement.innerHTML = renderBotMarkdown(text);
      } else {
          const safe = (text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
          messageContentElement.innerHTML = safe;
      }
      messageElement.appendChild(messageContentElement);
      if (sender === 'bot') {
          const actionsContainer = document.createElement('div');
          actionsContainer.classList.add('message-actions');
          const copyButton = document.createElement('button');
          copyButton.classList.add('message-action-btn', 'copy-btn');
          copyButton.innerHTML = '<i class="far fa-copy"></i>';
          copyButton.title = 'Copiar mensaje';
          copyButton.addEventListener('click', async () => {
              try {
                  await navigator.clipboard.writeText(text);
                  copyButton.classList.add('copied');
                  setTimeout(() => copyButton.classList.remove('copied'), 2000);
              } catch (err) {
                  console.error('Error al copiar el texto: ', err);
              }
          });
          actionsContainer.appendChild(copyButton);
          const playAudioButton = document.createElement('button');
          playAudioButton.classList.add('message-action-btn', 'play-audio-btn');
          playAudioButton.innerHTML = '<i class="fas fa-play"></i>';
          playAudioButton.title = 'Reproducir audio';
          let currentAudioInstance = null;
          playAudioButton.addEventListener('click', async () => {
              const messageText = text;
              if (!messageText.trim()) return;
              if (window._rxAudioState.button && window._rxAudioState.button !== playAudioButton) {
                  rxStopGlobalPlayer();
              }
              if (currentAudioInstance) {
                  if (currentAudioInstance.paused) {
                      await currentAudioInstance.play();
                      rxBtnPause(playAudioButton);
                      window._rxAudioState = { audio: currentAudioInstance, button: playAudioButton };
                  } else {
                      currentAudioInstance.pause();
                      rxBtnPlay(playAudioButton);
                      if (window._rxAudioState.button === playAudioButton) {
                          window._rxAudioState = { audio: null, button: null };
                      }
                  }
                  return;
              }
              try {
                  rxBtnLoading(playAudioButton);
                  const { data } = await supabaseClient.auth.getSession();
                  const token = data.session?.access_token;
                  if (!token) {
                      alert("Debes iniciar sesión para usar TTS.");
                      rxBtnPlay(playAudioButton);
                      return;
                  }
                  const response = await fetch('/generate_audio', {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/x-www-form-urlencoded',
                          'Authorization': `Bearer ${token}`
                      },
                      body: new URLSearchParams({
                          text: messageText,
                          voice_id: clonedVoiceId || ''
                      })
                  });
                  const dataRes = await response.json();
                  if (!response.ok || !dataRes.audio) {
                      console.error('Fallo generate_audio:', response.status, dataRes);
                      rxBtnPlay(playAudioButton);
                      return;
                  }
                  currentAudioInstance = new Audio(`data:audio/mpeg;base64,${dataRes.audio}`);
                  currentAudioInstance.onplay = () => {
                      rxBtnPause(playAudioButton);
                      window._rxAudioState = { audio: currentAudioInstance, button: playAudioButton };
                  };
                  currentAudioInstance.onpause = () => {
                      rxBtnPlay(playAudioButton);
                      if (window._rxAudioState.button === playAudioButton) {
                          window._rxAudioState = { audio: null, button: null };
                      }
                  };
                  currentAudioInstance.onended = () => {
                      rxBtnPlay(playAudioButton);
                      if (window._rxAudioState.button === playAudioButton) {
                          window._rxAudioState = { audio: null, button: null };
                      }
                  };
                  currentAudioInstance.onerror = (e) => {
                      console.error('Error en el audio:', e);
                      rxBtnPlay(playAudioButton);
                      if (window._rxAudioState.button === playAudioButton) {
                          window._rxAudioState = { audio: null, button: null };
                      }
                  };
                  await currentAudioInstance.play();
              } catch (err) {
                  console.error('Error generando/reproduciendo:', err);
                  rxBtnPlay(playAudioButton);
              }
          });
          actionsContainer.appendChild(playAudioButton);
          messageElement.appendChild(actionsContainer);
      }
      messagesContainer.appendChild(messageElement);
      if (welcomeScreen) {
          welcomeScreen.classList.add('hidden');
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      setTimeout(() => {
          messageElement.classList.add('appeared');
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
      return Promise.resolve();
  }

  function showTypingIndicator() {
      if (typingIndicatorElement) return;
      typingIndicatorElement = document.createElement('div');
      typingIndicatorElement.classList.add('message', 'bot', 'typing-indicator');
      for (let i = 0; i < 3; i++) {
          const dot = document.createElement('span');
          typingIndicatorElement.appendChild(dot);
      }
      messagesContainer.appendChild(typingIndicatorElement);
      void typingIndicatorElement.offsetWidth;
      typingIndicatorElement.style.opacity = '1';
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTypingIndicator() {
      if (typingIndicatorElement && messagesContainer.contains(typingIndicatorElement)) {
          typingIndicatorElement.style.opacity = '0';
          setTimeout(() => {
              if (typingIndicatorElement && messagesContainer.contains(typingIndicatorElement)) {
                  messagesContainer.removeChild(typingIndicatorElement);
                  typingIndicatorElement = null;
              }
          }, 300);
      }
  }

  if (fileInput) {
      fileInput.addEventListener('change', () => {
          if (fileInput.files.length > 0) {
              selectedFile = fileInput.files[0];
              fileNameSpan.textContent = selectedFile.name;
              fileDisplay.style.display = 'flex';
          } else {
              selectedFile = null;
              fileDisplay.style.display = 'none';
          }
      });
  }

  if (clearFileButton) {
      clearFileButton.addEventListener('click', () => {
          selectedFile = null;
          fileInput.value = '';
          fileDisplay.style.display = 'none';
          adjustTextareaHeight();
      });
  }

  async function sendMessage() {
      const message = userInput.value.trim();
      if (!message && !selectedFile) {
          console.warn("Intento de envío vacío: no hay mensaje ni archivo adjunto.");
          return;
      }
      let displayMessage = message;
      if (selectedFile) {
          displayMessage += (message ? ' ' : '') + `📎 Archivo adjunto: ${selectedFile.name}`;
      }
      await addMessage('user', displayMessage);
      if (welcomeScreen) welcomeScreen.classList.add('hidden');
      const inputBar = document.getElementById('input-bar');
      if (inputBar && inputBar.classList.contains('initial')) {
          inputBar.classList.remove('initial');
      }
      userInput.value = '';
      adjustTextareaHeight();
      showTypingIndicator();
      try {
          const formData = new FormData();
          formData.append('message', message);
          formData.append('history', JSON.stringify(conversationHistory));
          if (currentChatId) {
              formData.append('chat_id', currentChatId);
          }
          if (activePersistentInstruction) {
              formData.append('persistent_instruction', activePersistentInstruction);
          }
          if (clonedVoiceId) {
              formData.append('cloned_voice_id', clonedVoiceId);
          }
          if (selectedFile) {
              formData.append('file', selectedFile);
          }
          const { data: { session } } = await supabaseClient.auth.getSession();
          const token = session?.access_token;
          if (!token) {
              alert("No hay sesión activa.");
              return;
          }
          const response = await fetch('/chat', {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`
              },
              body: formData
          });
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Error HTTP: ${response.status} - ${response.statusText}. ${errorText}`);
          }
          const data = await response.json();
          if (data.chat_id) {
              currentChatId = data.chat_id;
          }
          hideTypingIndicator();
          await addMessage('bot', data.response, data.audio);
          conversationHistory = data.updated_history;
          selectedFile = null;
          fileInput.value = '';
          fileDisplay.style.display = 'none';
          adjustTextareaHeight();
      } catch (error) {
          console.error('Error al comunicarse con el backend:', error);
          hideTypingIndicator();
          await addMessage('bot', 'Lo siento, hubo un error al conectar con el chatbot. Por favor, revisa la consola del navegador y asegúrate de que el backend esté corriendo.');
          conversationHistory.pop();
          selectedFile = null;
          fileInput.value = '';
          fileDisplay.style.display = 'none';
          adjustTextareaHeight();
      }
  }

  initializeTheme();

  function isMobile() {
      return window.innerWidth <= 768;
  }

  function handleMobileSidebar() {
      if (isMobile()) {
          sidebar.classList.add('mobile-overlay');
          sidebar.classList.remove('collapsed');
          mainContainer.classList.add('sidebar-collapsed');
      } else {
          sidebar.classList.remove('mobile-overlay', 'active');
          document.getElementById('sidebar-backdrop').classList.remove('active');
          mainContainer.classList.remove('sidebar-collapsed');
      }
  }

  handleMobileSidebar();
  window.addEventListener('resize', handleMobileSidebar);

  document.getElementById('sidebar-backdrop').addEventListener('click', () => {
      sidebar.classList.remove('active');
      document.getElementById('sidebar-backdrop').classList.remove('active');
  });

  if (mobileHamburgerBtn) {
      mobileHamburgerBtn.addEventListener('click', () => {
          sidebar.classList.add('active');
          document.getElementById('sidebar-backdrop').classList.add('active');
      });
  }

  async function loadUserProfile(user) {
      const avatar = document.getElementById('header-profile-pic');
      let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
      const { data: profile } = await supabaseClient
          .from('profiles')
          .select('avatar_url, plan')
          .eq('id', user.id)
          .single();
      if (profile?.avatar_url) {
          avatarUrl = profile.avatar_url;
      }
      if (avatar) {
          avatar.src = avatarUrl;
      }
      const userPlanLabel = document.getElementById('user-plan-label');
      if (userPlanLabel) {
          userPlanLabel.textContent = `Plan: ${profile?.plan || 'Essence'}`;
      }
      const logoutOption = document.getElementById('logout-option');
      if (logoutOption) {
          logoutOption.addEventListener('click', async () => {
              await supabaseClient.auth.signOut();
              location.reload();
          });
      }
  }

  (async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) loadUserProfile(session.user);
  })();

  async function loadChats() {
      chatListContainer.innerHTML = "<p>Cargando...</p>";
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
          chatListContainer.innerHTML = "<p>Inicia sesión para ver tus chats.</p>";
          return;
      }
      const res = await fetch('/get_chats', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) {
          chatListContainer.innerHTML = "<p>Error cargando chats.</p>";
          return;
      }
      const groupedChats = await res.json();
      if (!groupedChats || Object.keys(groupedChats).length === 0) {
          chatListContainer.innerHTML = "<p>No tienes chats guardados.</p>";
          return;
      }
      chatListContainer.innerHTML = '';
      for (const group in groupedChats) {
          const groupTitle = document.createElement('div');
          groupTitle.classList.add('chat-group-title');
          groupTitle.textContent = group;
          chatListContainer.appendChild(groupTitle);
          groupedChats[group].forEach(chat => {
              const item = document.createElement('div');
              item.classList.add('chat-item');
              item.innerHTML = `
                  <span class="chat-title">${chat.title || 'Chat sin título'}</span>
                  <button class="delete-chat-btn" data-id="${chat.id}"><i class="fas fa-trash"></i></button>
              `;
              item.querySelector('.chat-title').addEventListener('click', () => openChat(chat.id));
              item.querySelector('.delete-chat-btn').addEventListener('click', async (e) => {
                  e.stopPropagation();
                  if (!confirm("¿Eliminar este chat?")) return;
                  await fetch(`/delete_chat/${chat.id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${session.access_token}` }
                  });
                  await loadChats();
              });
              chatListContainer.appendChild(item);
          });
      }
  }

  async function openChat(chatId) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
          alert("Debes iniciar sesión.");
          return;
      }
      const res = await fetch(`/load_chat/${chatId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!res.ok) {
          alert("Error cargando el chat.");
          return;
      }
      const chatData = await res.json();
      conversationHistory = chatData.history || [];
      currentChatId = chatId;
      messagesContainer.innerHTML = '';
      conversationHistory.forEach(msg => {
          const role = msg.role === 'model' ? 'bot' : 'user';
          const text = msg.parts[0].text || '';
          addMessage(role, text);
      });
      chatSearchModal.style.display = 'none';
  }

  if (chatSearchBtn) {
      chatSearchBtn.addEventListener('click', async () => {
          chatSearchModal.style.display = 'flex';
          chatSearchInput.value = '';
          await loadChats();
          chatSearchInput.focus();
      });
  }

  if (chatSearchClose) {
      chatSearchClose.addEventListener('click', () => {
          chatSearchModal.style.display = 'none';
      });
  }

  chatSearchModal.addEventListener('click', (e) => {
      if (e.target === chatSearchModal) {
          chatSearchModal.style.display = 'none';
      }
  });

  chatSearchInput.addEventListener('input', () => {
      const term = chatSearchInput.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(item => {
          item.style.display = item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
      });
  });

  if (accountNavItem) {
      accountNavItem.addEventListener('click', async () => {
          document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
          accountNavItem.classList.add('active');
          document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
          accountPane.style.display = 'block';
          await loadAccountData();
      });
  }

  if (generalNavItem) {
      generalNavItem.addEventListener('click', () => {
          document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
          generalNavItem.classList.add('active');
          document.querySelectorAll('.settings-pane').forEach(p => p.style.display = 'none');
          generalPaneEl.style.display = 'block';
      });
  }

  async function loadAccountData() {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;
      const user = session.user;
      let avatarUrl = user.user_metadata?.avatar_url || '/static/person.jpg';
      const { data: profile } = await supabaseClient
          .from('profiles')
          .select('avatar_url, plan, subscription_renewal')
          .eq('id', user.id)
          .single();
      if (profile?.avatar_url) avatarUrl = profile.avatar_url;
      accountAvatarImg.src = avatarUrl;
      document.getElementById('header-profile-pic').src = avatarUrl;
      accountPlan.textContent = profile?.plan || 'Essence';
      document.getElementById('user-plan-label').textContent = `Plan: ${profile?.plan || 'Essence'}`;
      accountExpiry.textContent = profile?.subscription_renewal ?
          new Date(profile.subscription_renewal).toLocaleDateString() :
          'Sin fecha';
      const accountEmail = document.getElementById('account-email');
      if (accountEmail) accountEmail.value = user.email || 'Sin correo';
      cancelPlanBtn.disabled = (profile?.plan || 'essence') === 'essence';
  }

  accountAvatarBtn.addEventListener('click', () => accountAvatarInput.click());
  accountAvatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const { data, error } = await supabaseClient.storage
          .from('avatars')
          .upload(`public/${Date.now()}_${file.name}`, file, { upsert: true });
      if (error) return alert('Error al subir imagen.');
      const publicUrl = supabaseClient.storage.from('avatars').getPublicUrl(data.path).data.publicUrl;
      const { data: { user } } = await supabaseClient.auth.getUser();
      await supabaseClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      accountAvatarImg.src = publicUrl;
      document.getElementById('header-profile-pic').src = publicUrl;
  });


  document.getElementById('logout-option')?.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      location.reload();
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      location.reload();
  });
// ════════════════════════ STRIPE BILLING PORTAL ════════════════════════
const manageBillingBtn = document.getElementById("manage-billing-btn");
if (manageBillingBtn) {
  manageBillingBtn.addEventListener("click", openBillingPortal);
}

async function openBillingPortal() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    alert("Debes iniciar sesión para administrar tu suscripción.");
    return;
  }

  try {
    const res = await fetch("/create_billing_portal_session", {
      method: "POST",
      headers: { "Authorization": `Bearer ${session.access_token}` }
    });

    const data = await res.json();
    if (!res.ok || !data.url) {
      alert("No se pudo abrir el portal de facturación.");
      console.error(data);
      return;
    }

    // Redirige al portal oficial de Stripe
    window.location.href = data.url;
  } catch (error) {
    console.error("Error abriendo portal:", error);
    alert("Error al abrir el portal de facturación.");
  }
}

});
