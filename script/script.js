// ==================== IMPORTAZIONI ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
    getDatabase, ref, set, onValue, remove, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// ==================== CONFIGURAZIONE FIREBASE ====================
const firebaseConfig = {
    apiKey: "AIzaSyDrL2ZGihizMGyjwep-ZX3rKH_C-IZt6Cg",
    authDomain: "checklisttransfer.firebaseapp.com",
    databaseURL: "https://checklisttransfer-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "checklisttransfer",
    storageBucket: "checklisttransfer.firebasestorage.app",
    messagingSenderId: "921756310365",
    appId: "1:921756310365:web:99065ccdeffb723b42e6b4",
    measurementId: "G-BPVNZCCHLQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

// ==================== VARIABILI GLOBALI ====================
let categories = {};
let currentUser = null;
let isLoginMode = true;

// ==================== ELEMENTI DOM ====================
const authContainer = document.getElementById('authContainer');
const appContainer = document.getElementById('appContainer');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmit = document.getElementById('authSubmit');
const authToggle = document.getElementById('authToggle');
const authError = document.getElementById('authError');
const userEmailSpan = document.getElementById('userEmail');

// ==================== AUTENTICAZIONE ====================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showApp();
        loadUserData();
    } else {
        currentUser = null;
        showAuth();
    }
});

function showAuth() {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    userEmailSpan.textContent = currentUser.email;
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (!email || !password) return showAuthError('Inserisci email e password');
    if (password.length < 6) return showAuthError('La password deve essere di almeno 6 caratteri');

    try {
        authSubmit.classList.add('loading');
        authError.classList.add('hidden');
        
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }

        authEmail.value = '';
        authPassword.value = '';

    } catch (error) {
        let errorMessage = error.message;
        switch (error.code) {
            case 'auth/user-not-found': errorMessage = 'Utente non trovato'; break;
            case 'auth/wrong-password': errorMessage = 'Password errata'; break;
            case 'auth/email-already-in-use': errorMessage = 'Email già registrata'; break;
            case 'auth/weak-password': errorMessage = 'Password troppo debole'; break;
            case 'auth/invalid-email': errorMessage = 'Email non valida'; break;
        }
        showAuthError(errorMessage);
    } finally {
        authSubmit.classList.remove('loading');
    }
});

authToggle.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = '🔐 Accedi';
        authSubtitle.textContent = 'Accedi per gestire le tue checklist';
        authSubmit.textContent = 'Accedi';
        authToggle.textContent = 'Non hai un account? Registrati';
    } else {
        authTitle.textContent = '📝 Registrati';
        authSubtitle.textContent = 'Crea un account per iniziare';
        authSubmit.textContent = 'Registrati';
        authToggle.textContent = 'Hai già un account? Accedi';
    }
    authError.classList.add('hidden');
});

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function logout() {
    if (!currentUser) return;
    if (confirm('Sei sicuro di voler uscire?')) {
        signOut(auth);
        categories = {};
    }
}

// ==================== DATABASE ====================
function loadUserData() {
    if (!currentUser) return;
    const userRef = ref(database, `users/${currentUser.uid}/categories`);
    onValue(userRef, snapshot => {
        categories = snapshot.val() || {};
        renderCategories();
    });
}

function saveCategoryToFirebase(categoryName) {
    if (!currentUser) return;
    const categoryRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}`);
    set(categoryRef, {
        name: categoryName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        items: categories[categoryName]?.items || {}
    });
}

function deleteCategoryFromFirebase(categoryName) {
    if (!currentUser) return;
    const categoryRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}`);
    remove(categoryRef);
}

function saveItemToFirebase(categoryName, item) {
    if (!currentUser) return;
    const itemRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}/items/${item.id}`);
    set(itemRef, item);

    // Aggiorna timestamp categoria
    const categoryRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}/updatedAt`);
    set(categoryRef, serverTimestamp());
}

function deleteItemFromFirebase(categoryName, itemId) {
    if (!currentUser) return;
    const itemRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}/items/${itemId}`);
    remove(itemRef);

    // Aggiorna timestamp categoria
    const categoryRef = ref(database, `users/${currentUser.uid}/categories/${categoryName}/updatedAt`);
    set(categoryRef, serverTimestamp());
}

// ==================== FUNZIONI UTENTE ====================
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}

function addCategory() {
    if (!currentUser) return showNotification('Devi essere loggato per aggiungere categorie!');
    const categoryNameInput = document.getElementById('categoryNameInput');
    const categoryName = categoryNameInput.value.trim();
    if (!categoryName) return alert('Inserisci il nome della categoria!');
    if (categories[categoryName]) return alert('Questa categoria esiste già!');
    
    categories[categoryName] = { name: categoryName, items: {} };
    categoryNameInput.value = '';
    saveCategoryToFirebase(categoryName);
    showNotification(`Categoria "${categoryName}" creata con successo!`);
}

function deleteCategory(categoryName) {
    if (!currentUser) return;
    if (confirm(`Sei sicuro di voler eliminare la categoria "${categoryName}" e tutti i suoi elementi?`)) {
        delete categories[categoryName];
        deleteCategoryFromFirebase(categoryName);
        showNotification(`Categoria "${categoryName}" eliminata!`);
    }
}

function editCategory(oldCategoryName) {
    if (!currentUser) return;

    const newCategoryName = prompt(
        `Inserisci il nuovo nome per la categoria "${oldCategoryName}":`,
        oldCategoryName
    );

    if (!newCategoryName || newCategoryName.trim() === "" || newCategoryName === oldCategoryName) {
        return;
    }

    if (categories[newCategoryName]) {
        showNotification(`La categoria "${newCategoryName}" esiste già!`);
        return;
    }

    // Aggiorna localmente
    categories[newCategoryName] = categories[oldCategoryName];
    delete categories[oldCategoryName];

    // Aggiorna su Firebase
    updateCategoryInFirebase(oldCategoryName, newCategoryName);

    showNotification(`Nome categoria modificato`);

    // 🔄 Rirenderizza la UI (se hai una funzione del genere)
    renderCategories();
}

function updateCategoryInFirebase(oldName, newName) {
    if (!currentUser) return;

    const userId = currentUser.uid;

    const oldRef = ref(database, `users/${userId}/categories/${oldName}`);
    const newRef = ref(database, `users/${userId}/categories/${newName}`);

    // Otteniamo i dati dalla vecchia categoria
    onValue(oldRef, snapshot => {
        if (snapshot.exists()) {
            const data = snapshot.val();

            // Scriviamo i dati nella nuova categoria
            set(newRef, data).then(() => {
                // Eliminiamo la vecchia categoria
                remove(oldRef);
            });
        }
    }, { onlyOnce: true }); // <-- così viene letto solo una volta
}

function addItem(categoryName, inputId) {
    if (!currentUser) return showNotification('Devi essere loggato per aggiungere elementi!');
    const input = document.getElementById(inputId);
    const itemText = input.value.trim();
    if (!itemText) return;

    const newItem = {
        id: Date.now().toString(),
        text: itemText,
        completed: false,
        createdAt: Date.now(),
        completedAt: null
    };

    if (!categories[categoryName].items) categories[categoryName].items = {};
    categories[categoryName].items[newItem.id] = newItem;
    input.value = '';
    saveItemToFirebase(categoryName, newItem);
    showNotification('Elemento aggiunto alla checklist!');
}

function updateItemInFirebase(categoryName, itemId, updates) {
    if (!currentUser) return;
    const userId = currentUser.uid;

    const itemRef = ref(database, `users/${userId}/categories/${categoryName}/items/${itemId}`);
    set(itemRef, {
        ...categories[categoryName].items[itemId],
        ...updates
    });
}

function editItem(categoryName, itemId) {
    if (!currentUser) return;

    const currentText = categories[categoryName].items[itemId].text;
    const newText = prompt("Modifica il testo dell'elemento:", currentText);

    if (!newText || newText.trim() === "" || newText === currentText) return;

    categories[categoryName].items[itemId].text = newText;

    updateItemInFirebase(categoryName, itemId, { text: newText });

    showNotification("Elemento modificato!");
    renderCategories(); // 🔄 se hai questa funzione per aggiornare la UI
}

function deleteItem(categoryName, itemId) {
    if (!currentUser) return;
    delete categories[categoryName].items[itemId];
    deleteItemFromFirebase(categoryName, itemId);
}

function toggleItem(categoryName, itemId) {
    if (!currentUser) return;
    const item = categories[categoryName].items[itemId];
    if (item) {
        item.completed = !item.completed;
        item.completedAt = item.completed ? Date.now() : null;
        saveItemToFirebase(categoryName, item);
    }
}

// ==================== STATISTICHE E RENDER ====================
function getCategoryStats(categoryName) {
    const categoryData = categories[categoryName];
    if (!categoryData || !categoryData.items) return { total: 0, completed: 0, percentage: 0 };
    const items = Object.values(categoryData.items);
    const total = items.length;
    const completed = items.filter(i => i.completed).length;
    const percentage = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const emptyState = document.getElementById('emptyState');
    if (Object.keys(categories).length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    container.innerHTML = '';
    Object.keys(categories).forEach(cat => {
        const stats = getCategoryStats(cat);
        container.appendChild(createCategoryCard(cat, stats));
    });
}

function createCategoryCard(categoryName, stats) {
    const card = document.createElement('div');
    card.className = 'category-card fade-in';
    const inputId = `input-${categoryName.replace(/\s+/g,'-')}-${Date.now()}`;
    card.innerHTML = `
        <div class="category-header">
            <button class="delete-category" onclick="deleteCategory('${categoryName}')" title="Elimina categoria">×</button>
            <button class="delete-category" style = "margin-right: 40px" onclick="editCategory('${categoryName}')" title="Modifica categoria"><svg width = "10px" height = "10px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8.29289 3.70711L1 11V15H5L12.2929 7.70711L8.29289 3.70711Z" fill="#fff"></path> <path d="M9.70711 2.29289L13.7071 6.29289L15.1716 4.82843C15.702 4.29799 16 3.57857 16 2.82843C16 1.26633 14.7337 0 13.1716 0C12.4214 0 11.702 0.297995 11.1716 0.828428L9.70711 2.29289Z" fill="#fff"></path> </g></svg></button>
            <div class="category-title">${categoryName}</div>
            <div class="category-stats">${stats.completed}/${stats.total} completati (${stats.percentage}%)</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.percentage}%"></div>
            </div>
        </div>
        <div class="category-content">
            <div class="add-item-form">
                <input type="text" id="${inputId}" class="add-item-input" placeholder="Aggiungi elemento alla checklist..." 
                        onkeypress="if(event.key==='Enter') addItem('${categoryName}', '${inputId}')">
                <button class="btn btn-secondary" onclick="addItem('${categoryName}', '${inputId}')">+</button>
            </div>
            <div class="checklist-items">
                ${createItemsList(categoryName)}
            </div>
        </div>
    `;
    return card;
}

function createItemsList(categoryName) {
    const categoryData = categories[categoryName];
    if (!categoryData || !categoryData.items || Object.keys(categoryData.items).length === 0) {
        return '<div class="empty-state" style="padding:20px;"><p>Nessun elemento nella checklist</p></div>';
    }
    return Object.values(categoryData.items).map(item => `
        <div class="checklist-item">
            <input type="checkbox" class="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleItem('${categoryName}', '${item.id}')">
            <span class="item-text ${item.completed ? 'completed' : ''}">${item.text}</span>
            <button class="delete-item" onclick="deleteItem('${categoryName}','${item.id}')" title="Elimina elemento">×</button>
            <button style = "margin-left: 10px" class="edit-item" onclick="editItem('${categoryName}','${item.id}')" title="Modifica elemento"><svg width = "10px" height = "10px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M8.29289 3.70711L1 11V15H5L12.2929 7.70711L8.29289 3.70711Z" fill="#10b981"></path> <path d="M9.70711 2.29289L13.7071 6.29289L15.1716 4.82843C15.702 4.29799 16 3.57857 16 2.82843C16 1.26633 14.7337 0 13.1716 0C12.4214 0 11.702 0.297995 11.1716 0.828428L9.70711 2.29289Z" fill="#10b981"></path> </g></svg></button>
        </div>
    `).join('');
}

// ==================== EVENT LISTENER ====================
document.addEventListener('DOMContentLoaded', () => {
    const categoryInput = document.getElementById('categoryNameInput');
    if (categoryInput) {
        categoryInput.addEventListener('keypress', e => { if (e.key==='Enter') addCategory(); });
    }
});

// ==================== MICROFONO E COMANDI VOCALI ====================
// ==================== VOCE: PULSANTE + LISTENER ====================
document.addEventListener('DOMContentLoaded', () => {
  if (!SpeechRecognition) {
    showNotification('Il tuo browser non supporta i comandi vocali');
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;

  recognition.addEventListener('result', async (e) => {
    const text = e.results[0][0].transcript.trim();
    showNotification(`Hai detto: "${text}"`);
    try {
      await handleVoiceCommand(text);
      renderCategories();
    } catch (err) {
      console.error(err);
      showNotification('Errore nell\'eseguire il comando vocale');
    }
  });

  // Pulsante flottante microfono
  const voiceBtn = document.createElement('button');
  voiceBtn.id = 'voiceBtn';
  voiceBtn.textContent = '🎤 Comandi Vocali';
  voiceBtn.style = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    padding: 10px 14px;
    background-color: #10b981;
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 16px;
    box-shadow: 0 6px 18px rgba(0,0,0,.15);
  `;
  voiceBtn.onclick = () => {
    recognition.start();
    showNotification('Parla ora!');
  };

  document.body.appendChild(voiceBtn);
});

// ==================== PARSING DEL COMANDO VOCALE ====================
function parseTextCommand(text) {
  const t = text.toLowerCase().trim();

  // --- Comandi categoria ---
  // crea/aggiungi categoria <nome>
  let m = t.match(/(?:crea|aggiungi)\s+categoria\s+(.+)/);
  if (m) {
    return { azione: 'addCategory', elementi: [], categoria: m[1].trim(), nuovoElemento: '' };
  }

  // elimina/cancella/rimuovi categoria <nome>
  m = t.match(/(?:elimina|cancella|rimuovi)\s+categoria\s+(.+)/);
  if (m) {
    return { azione: 'deleteCategory', elementi: [], categoria: m[1].trim(), nuovoElemento: '' };
  }

  // rinomina/cambia nome categoria <old> in <new>
  m = t.match(/(?:rinomina|cambia\s+nome\s+(?:alla|della)?\s*categoria)\s+(.+?)\s+(?:in|con)\s+(.+)/);
  if (m) {
    return { azione: 'renameCategory', elementi: [], categoria: m[1].trim(), nuovoElemento: m[2].trim() };
  }

  // --- Edit item: "modifica pere in mele nella/alla categoria frutta"
  m = t.match(/(?:modifica|cambia)\s+(.+?)\s+(?:in|con)\s+(.+?)\s+(?:alla\s+categoria|nella\s+categoria|in|alla|nella)\s+(.+)/);
  if (m) {
    return {
      azione: 'edit',
      elementi: [m[1].trim()],
      categoria: m[3].trim(),
      nuovoElemento: m[2].trim()
    };
  }

  // --- Add/Delete/Check item: "<verbo> <elenco> (alla/nella/in) (categoria) <nome>"
  m = t.match(/(?:aggiungi|inserisci|metti|elimina|rimuovi|cancella|segna|spunta|completa)\s+(.+?)\s+(?:alla\s+categoria|nella\s+categoria|in|alla|nella)\s+(.+)/);
  if (m) {
    const elenco = m[1].trim();
    const categoria = m[2].trim();

    // Determina l'azione dal verbo
    let azione = 'none';
    if (/(?:aggiungi|inserisci|metti)\b/.test(t)) azione = 'add';
    else if (/(?:elimina|rimuovi|cancella)\b/.test(t)) azione = 'delete';
    else if (/(?:segna|spunta|completa|deseleziona)\b/.test(t)) azione = 'check';

    // Split elementi:
    const elementi = splitItems(elenco);

    return { azione, elementi, categoria, nuovoElemento: '' };
  }

  return { azione: 'none', elementi: [], categoria: '', nuovoElemento: '' };
}

// Heuristica robusta per splittare più item
function splitItems(s) {
  // Se contiene virgole o " e " → split sicuro
  if (/,/.test(s) || /\se\s/.test(s)) {
    return s.split(/\s*,\s*|\s+e\s+/)
            .map(x => x.trim())
            .filter(Boolean);
  }
  // Altrimenti se ci sono >1 parole, splitta per spazi (attenzione: "acqua frizzante" diventa 2 item)
  const words = s.split(/\s+/).map(w => w.trim()).filter(Boolean);
  if (words.length > 1) return words;

  return [s.trim()];
}

// ==================== FUNZIONE PRINCIPALE VOICE COMMAND ====================
async function handleVoiceCommand(recognizedText) {
  const { azione, elementi, categoria, nuovoElemento } = parseTextCommand(recognizedText);

  if (azione === 'none') {
    showNotification('Comando non riconosciuto!');
    return;
  }

  switch (azione) {
    case 'add':
      for (const el of elementi) await addItemVoice(el, categoria);
      break;

    case 'delete':
      for (const el of elementi) await deleteItemVoice(el, categoria);
      break;

    case 'check':
      for (const el of elementi) await checkItemVoice(el, categoria);
      break;

    case 'edit':
      if (!nuovoElemento) return showNotification('Devi dire "modifica <vecchio> in <nuovo>"');
      await editItemVoice(elementi[0], nuovoElemento, categoria);
      break;

    // ---- Categorie ----
    case 'addCategory':
      await addCategoryVoice(categoria);
      break;

    case 'deleteCategory':
      await deleteCategoryVoice(categoria);
      break;

    case 'renameCategory':
      await editCategoryVoice(categoria, nuovoElemento); // (oldName, newName)
      break;
  }

  renderCategories();
}

// ==================== HELPERS + FUNZIONI VOCE (drop-in) ====================
function _normalize(s) {
  return (s || '').toString().trim().toLowerCase();
}

function _findItemByText(categoryName, text) {
  if (!categories[categoryName] || !categories[categoryName].items) return null;
  return Object.values(categories[categoryName].items).find(i => _normalize(i.text) === _normalize(text));
}

// Aggiunge una categoria (voce)
async function addCategoryVoice(categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per creare categorie!');
  categoria = categoria?.trim();
  if (!categoria) return showNotification('Nome categoria mancante');
  if (categories[categoria]) {
    showNotification(`La categoria "${categoria}" esiste già`);
    return;
  }
  categories[categoria] = { name: categoria, items: {} };
  await saveCategoryToFirebase(categoria);
  renderCategories();
  showNotification(`Categoria "${categoria}" creata!`);
}

// Elimina una categoria (voce)
async function deleteCategoryVoice(categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per eliminare categorie!');
  categoria = categoria?.trim();
  if (!categoria) return showNotification('Nome categoria mancante');
  if (!categories[categoria]) return showNotification(`Categoria "${categoria}" non trovata`);
  // Conferma per sicurezza (puoi rimuoverla se vuoi cancellare senza conferma)
  if (!confirm(`Eliminare la categoria "${categoria}" e tutti i suoi elementi?`)) return;
  // Rimuovi tutti gli item su Firebase
  const items = Object.keys(categories[categoria].items || {});
  for (const itemId of items) {
    await deleteItemFromFirebase(categoria, itemId);
  }
  // Rimuovi la categoria
  delete categories[categoria];
  await deleteCategoryFromFirebase(categoria);
  renderCategories();
  showNotification(`Categoria "${categoria}" eliminata`);
}

// Rinomina categoria (voce)
async function editCategoryVoice(oldName, newName) {
  if (!currentUser) return showNotification('Devi essere loggato per modificare categorie!');
  oldName = (oldName || '').trim();
  newName = (newName || '').trim();
  if (!oldName || !newName) return showNotification('Nome vecchio o nuovo mancante');
  if (!categories[oldName]) return showNotification(`Categoria "${oldName}" non trovata`);
  if (categories[newName]) return showNotification(`Categoria "${newName}" esiste già`);
  // Aggiorna localmente e su Firebase
  categories[newName] = categories[oldName];
  delete categories[oldName];
  await updateCategoryInFirebase(oldName, newName);
  renderCategories();
  showNotification(`Categoria "${oldName}" rinominata in "${newName}"`);
}

// Aggiunge un item (voce)
async function addItemVoice(elemento, categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per aggiungere elementi!');
  elemento = (elemento || '').trim();
  categoria = (categoria || '').trim();
  if (!elemento || !categoria) return showNotification('Elemento o categoria mancante');

  // se la categoria non esiste la creo
  if (!categories[categoria]) {
    categories[categoria] = { name: categoria, items: {} };
    await saveCategoryToFirebase(categoria);
  }

  // evita duplicati (match case-insensitive)
  const existing = _findItemByText(categoria, elemento);
  if (existing) {
    showNotification(`"${elemento}" già presente in "${categoria}", salto.`);
    return;
  }

  const newItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    text: elemento,
    completed: false,
    createdAt: Date.now(),
    completedAt: null
  };

  categories[categoria].items = categories[categoria].items || {};
  categories[categoria].items[newItem.id] = newItem;
  await saveItemToFirebase(categoria, newItem);
  renderCategories();
  showNotification(`"${elemento}" aggiunto a "${categoria}"`);
}

// Modifica item (voce)
async function editItemVoice(elemento, nuovoElemento, categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per modificare elementi!');
  elemento = (elemento || '').trim();
  nuovoElemento = (nuovoElemento || '').trim();
  categoria = (categoria || '').trim();
  if (!elemento || !nuovoElemento || !categoria) return showNotification('Dati mancanti per la modifica');

  if (!categories[categoria]) return showNotification(`Categoria "${categoria}" non esiste`);
  const item = _findItemByText(categoria, elemento);
  if (!item) return showNotification(`Elemento "${elemento}" non trovato in "${categoria}"`);

  item.text = nuovoElemento;
  await updateItemInFirebase(categoria, item.id, { text: nuovoElemento });
  renderCategories();
  showNotification(`"${elemento}" modificato in "${nuovoElemento}"`);
}

// Elimina item (voce)
async function deleteItemVoice(elemento, categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per eliminare elementi!');
  elemento = (elemento || '').trim();
  categoria = (categoria || '').trim();
  if (!elemento || !categoria) return showNotification('Elemento o categoria mancante');

  if (!categories[categoria]) return showNotification(`Categoria "${categoria}" non esiste`);
  const item = _findItemByText(categoria, elemento);
  if (!item) return showNotification(`Elemento "${elemento}" non trovato in "${categoria}"`);

  delete categories[categoria].items[item.id];
  await deleteItemFromFirebase(categoria, item.id);
  renderCategories();
  showNotification(`"${elemento}" eliminato da "${categoria}"`);
}

// Toggle/check item (voce)
async function checkItemVoice(elemento, categoria) {
  if (!currentUser) return showNotification('Devi essere loggato per modificare elementi!');
  elemento = (elemento || '').trim();
  categoria = (categoria || '').trim();
  if (!elemento || !categoria) return showNotification('Elemento o categoria mancante');

  if (!categories[categoria]) return showNotification(`Categoria "${categoria}" non esiste`);
  const item = _findItemByText(categoria, elemento);
  if (!item) return showNotification(`Elemento "${elemento}" non trovato in "${categoria}"`);

  // usa la tua funzione toggleItem per mantenere behaviour/timestamps coerenti
  toggleItem(categoria, item.id);
  renderCategories();
  showNotification(`"${elemento}" aggiornato in "${categoria}"`);
}

// export su window (opzionale ma comodo per debug)
window.addCategoryVoice = addCategoryVoice;
window.deleteCategoryVoice = deleteCategoryVoice;
window.editCategoryVoice = editCategoryVoice;
window.addItemVoice = addItemVoice;
window.editItemVoice = editItemVoice;
window.deleteItemVoice = deleteItemVoice;
window.checkItemVoice = checkItemVoice;

// ==================== ESPOSIZIONE FUNZIONI GLOBALI ====================
window.addCategory = addCategory;
window.deleteCategory = deleteCategory;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.toggleItem = toggleItem;
window.logout = logout;
window.editCategory = editCategory;
window.updateItemInFirebase = updateItemInFirebase;
window.editItem = editItem;
// Supporto Web Speech API (Chrome / Edge / Safari)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;