/**
 * HolAAC! 2026 - Core Application Logic
 * Autor: Cesar Celada (drceladapsiquiatria@gmail.com)
 * Proyecto Sin Fines de Lucro
 */

const LS_KEYS = {
    items: "aac_items_v2",
    settings: "aac_settings_v2",
    phrase: "aac_phrase_v2",
    hiddenTags: "aac_hidden_tags_v2",
    activeCategories: "aac_active_categories_v1",
    introSeen: "aac_intro_seen_v1",
};

const DEFAULT_ITEMS = [
    { id: "1", text: "Sí", category: "General", color: "#22c55e", image: "assets/pictos/si.png" },
    { id: "2", text: "No", category: "General", color: "#ef4444", image: "assets/pictos/no.png" },
    { id: "3", text: "Hola", category: "Social", color: "#3b82f6", image: "assets/pictos/hola.png" },
    { id: "4", text: "Por favor", category: "Social", color: "#a855f7", image: "assets/pictos/por_favor.png" },
    { id: "5", text: "Agua", category: "Necesidad", color: "#0ea5e9", image: "assets/pictos/agua.png" },
    { id: "6", text: "Comida", category: "Necesidad", color: "#f59e0b", image: "assets/pictos/comida.png" },
    { id: "7", text: "Baño", category: "Necesidad", color: "#64748b", image: "assets/pictos/bano.png" },
    { id: "8", text: "Dolor", category: "Salud", color: "#f43f5e", image: "assets/pictos/dolor.png" },
];

const DEFAULT_SETTINGS = {
    voiceURI: "",
    rate: 1.0,
    tileSize: 140,
    tapMode: "add", // add | speak
    lockEdit: false,
    scanningEnabled: false,
    activeCategories: [],
};

// State Management
const state = {
    items: [],
    settings: loadJSON(LS_KEYS.settings, {
        ...DEFAULT_SETTINGS,
        showGrammarTags: false,
        speechMode: 'fluent', // fluent | word
        darkMode: false
    }),
    phrase: loadJSON(LS_KEYS.phrase, []),
    currentPath: [],
    currentCategory: "Todas",
    searchQuery: "",
    voices: [],
    editorSearchQuery: "",
    pendingImage: null,
    routine: [],
    scanning: {
        active: false,
        index: -1,
        timer: null
    },
    tutorMode: {
        active: false,
        hiddenTags: new Set(loadJSON(LS_KEYS.hiddenTags, []))
    }
};

// IndexedDB Helper
const dbName = "MiTableroAAC_DB";
const dbVersion = 2; // Incremented for history store
let db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("items")) {
                db.createObjectStore("items", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("history")) {
                db.createObjectStore("history", { keyPath: "timestamp" });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject(e);
    });
}

async function getAllItems() {
    return new Promise((resolve) => {
        const transaction = db.transaction(["items"], "readonly");
        const store = transaction.objectStore("items");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
    });
}

async function saveItemDB(item) {
    const transaction = db.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    store.put(item);
}

async function deleteItemDB(id) {
    const transaction = db.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    store.delete(id);
}

async function logActivity(content) {
    if (!db) return;
    const transaction = db.transaction(["history"], "readwrite");
    const store = transaction.objectStore("history");
    const entry = {
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        content: content
    };
    store.add(entry);
}

async function getAllHistory() {
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const transaction = db.transaction(["history"], "readonly");
        const store = transaction.objectStore("history");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.reverse().slice(0, 100)); // Last 100
    });
}

async function clearHistoryDB() {
    const transaction = db.transaction(["history"], "readwrite");
    const store = transaction.objectStore("history");
    store.clear();
}

// DOM Cache
const dom = {
    statusText: document.getElementById('statusText'),
    grid: document.getElementById('grid'),
    chips: document.getElementById('chips'),
    categoryBar: document.getElementById('categoryBar'),
    categoryPrev: document.getElementById('categoryPrev'),
    categoryNext: document.getElementById('categoryNext'),
    searchBox: document.getElementById('searchBox'),
    btnSpeak: document.getElementById('btnSpeak'),
    btnBackspace: document.getElementById('btnBackspace'),
    btnClear: document.getElementById('btnClear'),
    btnEdit: document.getElementById('btnEdit'),
    btnSettings: document.getElementById('btnSettings'),
    // Modals
    editModal: document.getElementById('editModal'),
    settingsModal: document.getElementById('settingsModal'),
    // Form elements
    itemText: document.getElementById('itemText'),
    itemCategory: document.getElementById('itemCategory'),
    itemImage: document.getElementById('itemImage'),
    itemColor: document.getElementById('itemColor'),
    preview: document.getElementById('preview'),
    btnAddItem: document.getElementById('btnAddItem'),
    itemList: document.getElementById('itemList'),
    editorSearchBox: document.getElementById('editorSearchBox'),
    // ARASAAC elements
    arasaacQuery: document.getElementById('arasaacQuery'),
    btnSearchArasaac: document.getElementById('btnSearchArasaac'),
    arasaacResults: document.getElementById('arasaacResults'),
    // Settings elements
    voiceSelect: document.getElementById('voiceSelect'),
    rate: document.getElementById('rate'),
    tileSize: document.getElementById('tileSize'),
    tapMode: document.getElementById('tapMode'),
    lockEdit: document.getElementById('lockEdit'),
    scanningEnabled: document.getElementById('scanningEnabled'),
    // Import/Export
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    importFile: document.getElementById('importFile'),
    btnLoadLibrary: document.getElementById('btnLoadLibrary'),
    // Professional features
    routineBar: document.getElementById('routineBar'),
    routineItems: document.getElementById('routineItems'),
    btnResetRoutine: document.getElementById('btnResetRoutine'),
    showRoutine: document.getElementById('showRoutine'),
    boardProfile: document.getElementById('boardProfile'),
    // Clinical & Bitácora
    btnOpenHistory: document.getElementById('btnOpenHistory'),
    historyModal: document.getElementById('historyModal'),
    historyList: document.getElementById('historyList'),
    btnClearHistory: document.getElementById('btnClearHistory'),
    // Tutor Mode & Security
    tutorMode: document.getElementById('tutorMode'),
    pinModal: document.getElementById('pinModal'),
    pinInput: document.getElementById('pinInput'),
    btnVerifyPin: document.getElementById('btnVerifyPin'),
    // Companion
    companion: document.getElementById('companion'),
    companionBubble: document.getElementById('companionBubble'),
    // Phase 7: Motor & Speech
    btnPause: document.getElementById('btnPause'),
    btnStop: document.getElementById('btnStop'),
    showGrammarTags: document.getElementById('showGrammarTags'),
    speechMode: document.getElementById('speechMode'),
    darkMode: document.getElementById('darkMode'),
    headerSpeakToggle: document.getElementById('headerSpeakToggle'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    introModal: document.getElementById('introModal'),
    introCategoryList: document.getElementById('introCategoryList'),
    activeCategoryList: document.getElementById('activeCategoryList'),
    btnIntroSelectAll: document.getElementById('btnIntroSelectAll'),
    btnSaveIntro: document.getElementById('btnSaveIntro'),
};

// Persistence Helpers
function loadJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        console.error(`Error loading ${key}`, e);
        return fallback;
    }
}



function updateThemeToggleIcon() {
    if (!dom.btnThemeToggle) return;
    const isDark = !!state.settings.darkMode;
    dom.btnThemeToggle.textContent = isDark ? '☀️' : '🌙';
    dom.btnThemeToggle.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    dom.btnThemeToggle.title = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function save() {
    // Items are now in IndexedDB
    localStorage.setItem(LS_KEYS.settings, JSON.stringify(state.settings));
    localStorage.setItem(LS_KEYS.phrase, JSON.stringify(state.phrase));
}

// Initialization
async function init() {
    await initDB();
    const storedItems = await getAllItems();

    if (storedItems.length === 0) {
        // First run: copy defaults + curated library to DB
        const initialItems = [...DEFAULT_ITEMS];
        const libraryItems = await fetchLibraryItems();

        for (const item of libraryItems) {
            if (!initialItems.some(existing => existing.id === item.id)) {
                initialItems.push(item);
            }
        }

        for (const item of initialItems) {
            await saveItemDB(item);
        }
        state.items = initialItems;
    } else {
        state.items = storedItems;
        await ensureLibraryItemsPresent();
    }

    ensureActiveCategories();
    applySettings();
    await repairCoreImages(); // Force update core items with images
    attachListeners();
    loadVoices();
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    render();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').then(reg => {
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // New update available
                            flashStatus("Nueva actualización disponible. Reiniciando...");
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        }
                    }
                };
            };
        }).catch(err => console.error('SW Error:', err));

        // Handle controller change (e.g. when a new SW takes over)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }

    dom.statusText.textContent = "Listo para usar";

    // Global Key Events for Scanning
    window.addEventListener('keydown', (e) => {
        if (state.scanning.active && (e.code === 'Space' || e.code === 'Enter')) {
            e.preventDefault();
            selectScanningElement();
        }
    });
}

function attachListeners() {
    // Top bar
    dom.btnSettings.onclick = () => dom.settingsModal.showModal();
    dom.btnThemeToggle.onclick = () => {
        state.settings.darkMode = !state.settings.darkMode;
        document.body.classList.toggle('dark-theme', state.settings.darkMode);
        dom.darkMode.checked = state.settings.darkMode;
        updateThemeToggleIcon();
        save();
    };
    dom.btnEdit.onclick = () => {
        if (state.settings.lockEdit) {
            flashStatus("🔒 Edición bloqueada");
            return;
        }
        openEditModal();
    };

    // Composer
    dom.btnSpeak.onclick = speakPhrase;
    dom.btnBackspace.onclick = () => {
        state.phrase.pop();
        renderPhrase();
        save();
    };
    dom.btnClear.onclick = () => {
        state.phrase = [];
        renderPhrase();
        save();
    };

    // Filters
    dom.searchBox.oninput = (e) => {
        state.searchQuery = e.target.value.toLowerCase();
        renderGrid();
    };

    dom.editorSearchBox.oninput = (e) => {
        state.editorSearchQuery = e.target.value.toLowerCase();
        renderItemList();
    };

    if (dom.categoryPrev && dom.categoryNext && dom.categoryBar) {
        dom.categoryPrev.onclick = () => scrollCategories(-1);
        dom.categoryNext.onclick = () => scrollCategories(1);
        dom.categoryBar.addEventListener('scroll', updateCategoryNavState, { passive: true });
        window.addEventListener('resize', updateCategoryNavState);
    }

    // Editor
    dom.itemImage.onchange = handleImageSelect;
    dom.btnSearchArasaac.onclick = searchArasaac;
    dom.arasaacQuery.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchArasaac();
        }
    };

    dom.btnAddItem.onclick = (e) => {
        e.preventDefault();
        addItem();
    };
    dom.btnLoadLibrary.onclick = async (e) => {
        e.preventDefault();
        await loadInternalLibrary();
    };
    dom.btnExport.onclick = (e) => {
        e.preventDefault();
        exportData();
    };
    dom.btnImport.onclick = (e) => {
        e.preventDefault();
        dom.importFile.click();
    };
    dom.importFile.onchange = importData;

    document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const dialogId = btn.getAttribute('data-close-dialog');
            const dialog = document.getElementById(dialogId);
            if (dialog?.open) dialog.close();
        });
    });

    // Settings
    dom.rate.onchange = (e) => {
        state.settings.rate = parseFloat(e.target.value);
        save();
    };
    dom.tileSize.oninput = (e) => {
        state.settings.tileSize = parseInt(e.target.value);
        document.documentElement.style.setProperty('--tile-size', `${state.settings.tileSize}px`);
        save();
        renderGrid();
    };
    dom.headerSpeakToggle.onchange = (e) => {
        state.settings.tapMode = e.target.checked ? 'speak' : 'add';
        dom.tapMode.value = state.settings.tapMode;
        save();
    };
    dom.tapMode.onchange = (e) => {
        state.settings.tapMode = e.target.value;
        dom.headerSpeakToggle.checked = (state.settings.tapMode === 'speak');
        save();
    };
    dom.lockEdit.onchange = (e) => {
        state.settings.lockEdit = e.target.checked;
        save();
    };
    dom.scanningEnabled.onchange = (e) => {
        state.settings.scanningEnabled = e.target.checked;
        save();
        renderGrid();
    };
    dom.voiceSelect.onchange = (e) => {
        state.settings.voiceURI = e.target.value;
        save();
    };
    dom.darkMode.onchange = (e) => {
        state.settings.darkMode = e.target.checked;
        document.body.classList.toggle('dark-theme', state.settings.darkMode);
        updateThemeToggleIcon();
        save();
    };

    dom.btnIntroSelectAll.onclick = () => {
        const categories = getAllCategories();
        state.settings.activeCategories = [...categories];
        renderCategoryToggles();
    };

    dom.btnSaveIntro.onclick = (e) => {
        e.preventDefault();
        localStorage.setItem(LS_KEYS.introSeen, '1');
        save();
        if (dom.introModal.open) dom.introModal.close();
        render();
    };

    // Professional Features Listeners
    dom.showRoutine.onchange = (e) => {
        state.settings.showRoutine = e.target.checked;
        dom.routineBar.classList.toggle('hidden', !state.settings.showRoutine);
        save();
    };
    dom.boardProfile.onchange = (e) => {
        state.settings.boardProfile = e.target.value;
        save();
        render();
    };
    dom.showGrammarTags.onchange = (e) => {
        state.settings.showGrammarTags = e.target.checked;
        document.body.classList.toggle('show-grammar', state.settings.showGrammarTags);
        save();
    };
    dom.speechMode.onchange = (e) => {
        state.settings.speechMode = e.target.value;
        save();
    };
    dom.btnResetRoutine.onclick = () => {
        state.routine = [];
        renderRoutine();
    };

    // Clinical Bitácora
    dom.btnOpenHistory.onclick = () => {
        renderHistory();
        dom.historyModal.showModal();
    };
    dom.btnClearHistory.onclick = async () => {
        if (!confirm("¿Borrar historial clínico?")) return;
        await clearHistoryDB();
        renderHistory();
    };

    // Tutor Mode with 3s Hold Security
    let tutorHoldTimer = null;
    dom.tutorMode.onpointerdown = (e) => {
        if (state.tutorMode.active) return; // Only for activation
        tutorHoldTimer = setTimeout(() => {
            dom.pinModal.showModal();
            flashStatus("Liberando Modo Tutor...");
        }, 3000);
    };
    dom.tutorMode.onpointerup = () => clearTimeout(tutorHoldTimer);
    dom.tutorMode.onpointerleave = () => clearTimeout(tutorHoldTimer);

    dom.tutorMode.onchange = (e) => {
        if (!e.target.checked) {
            state.tutorMode.active = false;
            document.body.classList.remove('tutor-active');
            renderGrid();
        } else {
            e.target.checked = false; // Stay off until verified
        }
    };

    dom.btnVerifyPin.onclick = (e) => {
        e.preventDefault();
        if (dom.pinInput.value === "0000") { // PIN por defecto
            state.tutorMode.active = true;
            dom.tutorMode.checked = true;
            document.body.classList.add('tutor-active');
            dom.pinModal.close();
            dom.pinInput.value = "";
            renderGrid();
            flashStatus("Modo Tutor activado");
        } else {
            flashStatus("PIN Incorrecto");
            dom.pinInput.value = "";
        }
    };

    // Speech Controls
    dom.btnPause.onclick = () => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        else window.speechSynthesis.pause();
    };
    dom.btnStop.onclick = () => window.speechSynthesis.cancel();

    // Companion interaction
    dom.companion.onclick = () => {
        const phrases = [
            "¡Lo estás haciendo muy bien!",
            "Estoy aquí para escucharte.",
            "Tómate tu tiempo, no hay prisa.",
            "Cada palabra cuenta.",
            "¿Cómo te sientes hoy?",
            "¡Me encanta ayudarte!",
            "Tus ideas son importantes."
        ];
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        updateCompanion('custom', randomPhrase);
        speakText(randomPhrase);
    };
}

// Actions
async function repairCoreImages() {
    // List of core items that should ALWAYS have images from assets
    const coreUpdates = [
        { id: "1", text: "Sí", image: "assets/pictos/si.png" },
        { id: "2", text: "No", image: "assets/pictos/no.png" },
        { id: "3", text: "Hola", image: "assets/pictos/hola.png" },
        { id: "4", text: "Por favor", image: "assets/pictos/por_favor.png" },
        { id: "5", text: "Agua", image: "assets/pictos/agua.png" },
        { id: "6", text: "Comida", image: "assets/pictos/comida.png" },
        { id: "7", text: "Baño", image: "assets/pictos/bano.png" },
        { id: "8", text: "Dolor", image: "assets/pictos/dolor.png" }
    ];

    let changed = false;
    for (const update of coreUpdates) {
        const item = state.items.find(i => i.id === update.id);
        if (!item) continue;

        const needsRepair = !item.image
            || item.image.includes('null')
            || (['1', '2'].includes(update.id) && !String(item.image).includes('/si.png') && !String(item.image).includes('/no.png'));

        if (needsRepair) {
            item.image = update.image;
            await saveItemDB(item);
            changed = true;
        }
    }
    if (changed) render();
}

function updateCompanion(reactionType, customMsg) {
    const avatar = dom.companion.querySelector('.companion-avatar');
    const bubble = dom.companionBubble;

    let emoji = "🌱";
    let message = customMsg || "";

    if (!customMsg) {
        switch (reactionType) {
            case 'social': emoji = "✨"; message = "¡Qué bueno verte saludar!"; break;
            case 'tristeza': emoji = "🫂"; message = "Estoy aquí contigo. Respira hondo."; break;
            case 'enojo': emoji = "🌬️"; message = "Está bien estar enojado. Vamos a calmarnos."; break;
            case 'necesidad': emoji = "💪"; message = "Te escucho. Vamos a resolverlo."; break;
            case 'frase': emoji = "🌟"; message = "¡Increíble! Formaste una frase completa."; break;
            default: emoji = "🌱"; message = "¡Sigue así!"; break;
        }
    } else {
        emoji = "🌟";
    }

    avatar.textContent = emoji;
    bubble.textContent = message;
    bubble.classList.remove('hidden');

    setTimeout(() => {
        bubble.classList.add('hidden');
    }, 4000);
}

function speakText(text) {
    if (!text) return;

    // Try playing local audio file first (Privacy & Offline optimization)
    const cleanName = text.toLowerCase().trim()
        .replace(/\s+/g, '_')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Only use pre-recorded clips for single terms.
    if (!cleanName.includes('_')) {
        const audioPath = `assets/audio/${cleanName}.mp3`;
        const audio = new Audio(audioPath);
        audio.play().then(() => {
            console.log(`🔊 Playing local audio: ${text}`);
        }).catch(() => {
            speakWithTTS(text);
        });
        return;
    }

    speakWithTTS(text);
}

function speakWithTTS(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.settings.rate * 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.voiceURI === state.settings.voiceURI)
        || voices.find(v => v.lang.includes('es-MX') || v.name.includes('Premium'))
        || voices.find(v => v.lang.startsWith('es'));

    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
}

async function speakPhrase() {
    const items = state.phrase
        .map(id => state.items.find(i => i.id === id))
        .filter(Boolean);

    if (items.length === 0) {
        flashStatus("Selecciona palabras primero");
        return;
    }

    if (state.settings.speechMode === 'word') {
        // Word-by-word mode (Pedagogical)
        for (const item of items) {
            speakText(item.text);
            await new Promise(r => setTimeout(r, 800)); // Pause between words
        }
    } else {
        // Fluent mode
        const text = items.map(i => i.text).join(" ");
        speakText(text);
    }

    logActivity(`Frase completa: ${items.map(i => i.text).join(" ")}`);
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
        state.pendingImage = ev.target.result;
        dom.preview.innerHTML = `<img src="${state.pendingImage}" style="max-height:100px; border-radius:10px;">`;
    };
    reader.readAsDataURL(file);
}

function addItem() {
    const isEdit = dom.btnAddItem.hasAttribute('data-edit-id');
    if (isEdit) return updateItem();

    const text = dom.itemText.value.trim();
    if (!text) return;

    const item = {
        id: crypto.randomUUID(),
        text,
        category: dom.itemCategory.value.trim() || "Varios",
        color: dom.itemColor.value,
        image: state.pendingImage
    };

    state.items.unshift(item);
    saveItemDB(item);
    save();

    // Reset form
    dom.itemText.value = "";
    dom.itemCategory.value = "";
    dom.itemImage.value = "";
    dom.preview.textContent = "¡Añadido!";
    state.pendingImage = null;

    render();
    renderItemList();
}

function updateItem() {
    const id = dom.btnAddItem.getAttribute('data-edit-id');
    const item = state.items.find(i => i.id === id);
    if (!item) return;

    item.text = dom.itemText.value.trim();
    item.category = dom.itemCategory.value.trim() || "Varios";
    item.color = dom.itemColor.value;
    if (state.pendingImage) item.image = state.pendingImage;

    saveItemDB(item);
    save();

    // Reset form
    dom.itemText.value = "";
    dom.itemCategory.value = "";
    dom.itemImage.value = "";
    dom.btnAddItem.textContent = "➕ Añadir al Catálogo";
    dom.btnAddItem.removeAttribute('data-edit-id');
    dom.preview.textContent = "¡Actualizado!";
    state.pendingImage = null;

    render();
    renderItemList();
}

window.editItem = (id) => {
    const item = state.items.find(i => i.id === id);
    if (!item) return;

    dom.itemText.value = item.text;
    dom.itemCategory.value = item.category;
    dom.itemColor.value = item.color;
    if (item.image) {
        dom.preview.innerHTML = `<img src="${item.image}" style="max-height:100px; border-radius:10px;">`;
    } else {
        dom.preview.textContent = "Sin imagen";
    }

    dom.btnAddItem.textContent = "💾 Guardar Cambios";
    dom.btnAddItem.setAttribute('data-edit-id', id);

    // Scroll to top of editor
    dom.editModal.querySelector('.modal-body').scrollTop = 0;
};

function openEditModal() {
    renderItemList();
    dom.editModal.showModal();
}

async function loadInternalLibrary() {
    if (!confirm("¿Cargar biblioteca ilustrada? Esto añadirá elementos base a tu tablero.")) return;

    dom.statusText.textContent = "Cargando biblioteca...";
    try {
        const libraryItems = await fetchLibraryItems();
        for (const item of libraryItems) {
            const exists = state.items.some(i => i.id === item.id);
            if (!exists) {
                await saveItemDB(item);
                state.items.push(item);
            }
        }

        render();
        renderItemList();
        dom.statusText.textContent = "¡Biblioteca cargada!";
        setTimeout(() => { dom.statusText.textContent = "Listo para usar"; }, 3000);
    } catch (err) {
        console.error("Error loading library:", err);
        flashStatus("Error al cargar la biblioteca");
    }
}

async function fetchLibraryItems() {
    const response = await fetch('library.json');
    if (!response.ok) throw new Error('No se pudo cargar library.json');
    return response.json();
}

async function ensureLibraryItemsPresent() {
    try {
        const libraryItems = await fetchLibraryItems();
        let addedCount = 0;
        let repairedCount = 0;
        const byId = new Map(libraryItems.map(item => [item.id, item]));

        for (const item of libraryItems) {
            const existing = state.items.find(saved => saved.id === item.id);
            if (!existing) {
                await saveItemDB(item);
                state.items.push(item);
                addedCount += 1;
                continue;
            }

            const fallback = byId.get(existing.id);
            const repaired = {
                ...existing,
                color: existing.color || fallback?.color || '#22c55e',
                image: existing.image || fallback?.image || null
            };

            if (repaired.color !== existing.color || repaired.image !== existing.image) {
                await saveItemDB(repaired);
                Object.assign(existing, repaired);
                repairedCount += 1;
            }
        }

        if (addedCount > 0) {
            flashStatus(`Se añadieron ${addedCount} términos de la biblioteca`);
        }
        if (repairedCount > 0) {
            flashStatus(`Se repararon ${repairedCount} términos sin color/imagen`);
        }
    } catch (err) {
        console.error('Error ensuring library items:', err);
    }
}

function exportData() {
    const payload = {
        items: state.items,
        settings: state.settings,
        phrase: state.phrase,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mitablero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    flashStatus('Respaldo exportado');
}

async function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!Array.isArray(parsed.items)) {
            throw new Error('Formato inválido: items no encontrados');
        }

        if (!confirm('Importar reemplazará los elementos actuales del tablero. ¿Continuar?')) {
            dom.importFile.value = '';
            return;
        }

        await replaceAllItems(parsed.items);

        state.settings = {
            ...state.settings,
            ...(parsed.settings || {})
        };
        state.phrase = Array.isArray(parsed.phrase) ? parsed.phrase : [];

        save();
        applySettings();
        render();
        renderItemList();

        flashStatus('Importación completada');
    } catch (error) {
        console.error('Import error', error);
        flashStatus('Error al importar JSON');
    } finally {
        dom.importFile.value = '';
    }
}

async function replaceAllItems(items) {
    const sanitized = items
        .filter(item => item && item.id && item.text)
        .map(item => ({
            id: String(item.id),
            text: String(item.text),
            category: String(item.category || 'Varios'),
            color: item.color || '#22c55e',
            image: item.image || null
        }));

    const tx = db.transaction(['items'], 'readwrite');
    const store = tx.objectStore('items');
    store.clear();
    sanitized.forEach(item => store.put(item));

    await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });

    state.items = sanitized;
}

// ARASAAC Integration
async function searchArasaac() {
    const query = dom.arasaacQuery.value.trim();
    if (!query) return;

    dom.arasaacResults.innerHTML = '<div class="loading-spinner">Buscando pictogramas...</div>';
    dom.arasaacResults.classList.remove('hidden');

    try {
        const response = await fetch(`https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("No se encontraron resultados");

        const pictos = await response.json();
        renderArasaacResults(pictos);
    } catch (err) {
        dom.arasaacResults.innerHTML = `<div class="loading-spinner">❌ ${err.message}</div>`;
    }
}

function renderArasaacResults(pictos) {
    dom.arasaacResults.innerHTML = "";

    if (pictos.length === 0) {
        dom.arasaacResults.innerHTML = '<div class="loading-spinner">No se encontraron pictogramas.</div>';
        return;
    }

    pictos.slice(0, 30).forEach(picto => {
        const thumb = document.createElement('div');
        thumb.className = 'arasaac-thumb';
        const imgUrl = `https://static.arasaac.org/pictograms/${picto._id}/${picto._id}_300.png`;

        thumb.innerHTML = `<img src="${imgUrl}" alt="${picto.keywords[0]?.keyword || 'Icono'}" loading="lazy">`;
        thumb.onclick = () => selectArasaacPictogram(picto._id, picto.keywords[0]?.keyword);

        dom.arasaacResults.appendChild(thumb);
    });
}

async function selectArasaacPictogram(id, label) {
    const imgUrl = `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
    dom.preview.innerHTML = '<div class="loading-spinner">Preparando imagen...</div>';

    try {
        const dataUrl = await imageUrlToDataURL(imgUrl);
        state.pendingImage = dataUrl;
        dom.preview.innerHTML = `<img src="${dataUrl}" style="max-height:100px; border-radius:10px;">`;
        if (label && !dom.itemText.value) dom.itemText.value = label;

        // Hide results after selection
        dom.arasaacResults.classList.add('hidden');
    } catch (err) {
        flashStatus("Error al cargar imagen de ARASAAC");
        dom.preview.textContent = "Error";
    }
}

async function imageUrlToDataURL(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function flashStatus(msg) {
    const prev = dom.statusText.textContent;
    dom.statusText.textContent = msg;
    dom.statusText.style.color = "var(--accent)";
    setTimeout(() => {
        dom.statusText.textContent = prev;
        dom.statusText.style.color = "";
    }, 2000);
}

// Rendering
function render() {
    renderGrid();
    renderPhrase();
    renderCategories();
    renderRoutine();
    renderCategoryToggles();
}


async function renderHistory() {
    const history = await getAllHistory();
    dom.historyList.innerHTML = "";

    if (history.length === 0) {
        dom.historyList.innerHTML = '<p class="empty-state">No hay registros de actividad aún.</p>';
        return;
    }

    history.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'history-entry';
        div.innerHTML = `
            <span class="history-time">${entry.date}</span>
            <span class="history-content">${entry.content}</span>
        `;
        dom.historyList.appendChild(div);
    });
}

function renderGrid() {
    dom.grid.innerHTML = "";

    // Filter items based on current category (folder) AND Profile
    let filtered = state.items.filter(item => {
        const isFav = state.currentCategory === "⭐ Favoritos";
        const matchesCat = isFav ? item.isFavorite : (state.currentCategory === "Todas" || item.category === state.currentCategory);
        const matchesSearch = item.text.toLowerCase().includes(state.searchQuery) ||
            item.category.toLowerCase().includes(state.searchQuery);

        const matchesActiveCategory = isCategoryActive(item.category);

        // Profile logic: Filter by category groups
        let matchesProfile = true;
        if (state.settings.boardProfile === 'home') {
            matchesProfile = ['General', 'Lugares', 'Cosas', 'Necesidad'].includes(item.category);
        } else if (state.settings.boardProfile === 'school') {
            matchesProfile = ['Personas', 'Acciones', 'Mente+', 'Social'].includes(item.category);
        } else if (state.settings.boardProfile === 'sos') {
            matchesProfile = ['S.O.S', 'Salud', 'Salud+', 'Emociones'].includes(item.category);
        }

        return matchesCat && matchesSearch && matchesProfile && matchesActiveCategory;
    });

    // 1. Navigation Anchor (Slot 1: Always Home/Back)
    const navBtn = createTile({
        text: state.currentCategory === "Todas" ? "🏠 Inicio" : "← Volver",
        category: "Navegación",
        color: "#64748b",
        id: "nav-anchor"
    }, () => {
        state.currentCategory = "Todas";
        render();
    });
    dom.grid.appendChild(navBtn);

    // 2. Render stable items
    // Sort items: Favoritos first, then by ID
    filtered.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.id.localeCompare(b.id);
    }).forEach((item) => {
        const isHidden = state.tutorMode.hiddenTags.has(item.id);

        // In User View: Skip hidden items
        if (!state.tutorMode.active && isHidden) return;

        const tile = createTile(item, () => onTileClick(item));
        if (isHidden) tile.classList.add('hidden-by-tutor');

        dom.grid.appendChild(tile);
    });

    if (state.settings.scanningEnabled) startScanning();
    else stopScanning();
}

function createTile(item, onClick) {
    const tile = document.createElement('div');
    tile.className = 'tile glass-card';
    tile.setAttribute('data-id', item.id);
    tile.setAttribute('data-cat', item.category);

    if (item.color) {
        tile.style.backgroundColor = item.color;
        tile.style.borderColor = item.color;
    }

    // Favorite Star (Only if not navigation)
    if (item.id !== "nav-anchor") {
        const fav = document.createElement('div');
        fav.className = `tile-fav ${item.isFavorite ? 'active' : 'inactive'}`;
        fav.innerHTML = item.isFavorite ? '⭐' : '☆';
        fav.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
        };
        tile.appendChild(fav);
    }

    // Grammar Tag (V, S, A, etc.)
    const tag = document.createElement('div');
    tag.className = 'grammar-tag';
    const firstLetter = item.category.charAt(0).toUpperCase();
    tag.textContent = firstLetter;
    tile.appendChild(tag);

    const imgContainer = document.createElement('div');
    imgContainer.className = 'tile-img';

    if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.text;
        img.loading = 'lazy';
        imgContainer.appendChild(img);
    } else {
        const span = document.createElement('span');
        span.className = 'tile-placeholder';
        span.textContent = item.text.charAt(0).toUpperCase();
        imgContainer.appendChild(span);
    }

    const label = document.createElement('div');
    label.className = 'tile-label';
    label.innerHTML = `
        <span class="tile-text">${item.text}</span>
        <span class="tile-cat">${item.category}</span>
    `;

    tile.appendChild(imgContainer);
    tile.appendChild(label);
    tile.onclick = onClick;

    tile.oncontextmenu = (e) => {
        e.preventDefault();
        speakText(item.text);
    };

    return tile;
}

// Reset Editor State when modal closes
dom.editModal.addEventListener('close', () => {
    dom.itemText.value = "";
    dom.itemCategory.value = "";
    dom.itemImage.value = "";
    dom.btnAddItem.textContent = "➕ Añadir al Catálogo";
    dom.btnAddItem.removeAttribute('data-edit-id');
    dom.preview.textContent = "Esperando datos...";
    state.pendingImage = null;
});

function onTileClick(item) {
    // Tutor Mode Action: Toggle hidden status
    if (state.tutorMode.active) {
        if (state.tutorMode.hiddenTags.has(item.id)) {
            state.tutorMode.hiddenTags.delete(item.id);
        } else {
            state.tutorMode.hiddenTags.add(item.id);
        }
        localStorage.setItem(LS_KEYS.hiddenTags, JSON.stringify([...state.tutorMode.hiddenTags]));
        renderGrid();
        return;
    }

    // Check if this item acts as a folder (category name)
    const isFolder = state.items.some(i => i.category === item.text);

    if (isFolder && state.currentCategory === "Todas") {
        state.currentCategory = item.text;
        speakText(item.text); // Audio feedback for category
        render();
        return;
    }

    if (state.settings.showRoutine) {
        addToRoutine(item);
        logActivity(`Añadido a Rutina: ${item.text}`);
        return;
    }

    if (state.settings.tapMode === 'speak') {
        speakText(item.text);
        logActivity(`Emitido: ${item.text}`);

        // Companion Reactions
        if (item.category === 'Social') updateCompanion('social');
        if (item.category === 'Emociones') {
            if (['Triste', 'Dolor', 'Miedo'].includes(item.text)) updateCompanion('tristeza');
            else if (['Enojado', 'Frustrado'].includes(item.text)) updateCompanion('enojo');
        }
        if (item.category === 'Necesidad' || item.category === 'S.O.S') updateCompanion('necesidad');

    } else {
        state.phrase.push(item.id);
        renderPhrase();
        save();
        logActivity(`Añadido a frase: ${item.text}`);

        // Check for complete phrase reaction
        if (state.phrase.length === 3) updateCompanion('frase');
    }
}

function addToRoutine(item) {
    if (state.routine.length >= 10) state.routine.shift();
    state.routine.push(item);
    renderRoutine();
    renderCategoryToggles();
}


function renderRoutine() {
    dom.routineItems.innerHTML = "";
    dom.routineBar.classList.toggle('hidden', !state.settings.showRoutine);

    state.routine.forEach(item => {
        const div = document.createElement('div');
        div.className = 'routine-item';
        div.innerHTML = `
            ${item.image ? `<img src="${item.image}">` : '<span>?</span>'}
            <span>${item.text}</span>
        `;
        dom.routineItems.appendChild(div);
    });
}

function renderPhrase() {
    dom.chips.innerHTML = "";
    state.phrase.forEach(id => {
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.innerHTML = `
            <span>${item.text}</span>
            <span class="remove" onclick="event.stopPropagation(); removeChip('${id}')">✕</span>
        `;
        dom.chips.appendChild(chip);
    });

    // Auto-scroll composer
    dom.chips.scrollLeft = dom.chips.scrollWidth;
}

window.removeChip = (id) => {
    const index = state.phrase.indexOf(id);
    if (index > -1) {
        state.phrase.splice(index, 1);
        renderPhrase();
        save();
    }
};

function renderCategories() {
    const cats = getAllCategories().filter(cat => isCategoryActive(cat));
    dom.categoryBar.innerHTML = "";

    const hasFavs = state.items.some(i => i.isFavorite);
    const tabs = ["Todas"];
    if (hasFavs) tabs.push("⭐ Favoritos");
    tabs.push(...cats);

    tabs.forEach(cat => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `pill ${state.currentCategory === cat ? 'active' : ''}`;
        pill.textContent = cat;
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', String(state.currentCategory === cat));
        pill.setAttribute('tabindex', state.currentCategory === cat ? '0' : '-1');
        pill.onclick = () => {
            state.currentCategory = cat;
            render();
        };
        pill.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pill.click();
            }
        };
        dom.categoryBar.appendChild(pill);
    });

    updateCategoryNavState();
}

function getAllCategories() {
    return [...new Set(state.items.map(i => i.category))].sort();
}

function ensureActiveCategories() {
    const allCategories = getAllCategories();
    const stored = Array.isArray(state.settings.activeCategories) ? state.settings.activeCategories : [];

    if (stored.length === 0) {
        state.settings.activeCategories = [...allCategories];
        save();
        return;
    }

    const sanitized = stored.filter(cat => allCategories.includes(cat));
    if (sanitized.length !== stored.length) {
        state.settings.activeCategories = sanitized.length ? sanitized : [...allCategories];
        save();
    }
}

function isCategoryActive(category) {
    const active = state.settings.activeCategories || [];
    return active.length === 0 || active.includes(category);
}

function renderCategoryToggles() {
    const containers = [dom.introCategoryList, dom.activeCategoryList].filter(Boolean);
    if (containers.length === 0) return;

    const categories = getAllCategories();

    containers.forEach(container => {
        container.innerHTML = '';
        categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'field-row category-toggle-item';

            const checked = isCategoryActive(category);
            if (checked) label.classList.add('is-active');

            label.innerHTML = `
                <div class="toggle-wrapper">
                    <input type="checkbox" data-category="${category}" aria-label="Activar categoría ${category}" ${checked ? 'checked' : ''} />
                    <span class="toggle-slider"></span>
                </div>
                <div class="text-content">
                    <span class="main">${category}</span>
                    <span class="sub state-text">${checked ? 'Activa' : 'Inactiva'}</span>
                </div>
            `;

            const checkbox = label.querySelector('input');
            const stateText = label.querySelector('.state-text');
            checkbox.onchange = (e) => {
                const current = new Set(state.settings.activeCategories || []);
                if (e.target.checked) current.add(category);
                else current.delete(category);

                label.classList.toggle('is-active', e.target.checked);
                stateText.textContent = e.target.checked ? 'Activa' : 'Inactiva';

                state.settings.activeCategories = [...current];
                save();

                if (!isCategoryActive(state.currentCategory)) {
                    state.currentCategory = 'Todas';
                }

                render();
            };

            container.appendChild(label);
        });
    });
}

function updateCategoryNavState() {
    if (!dom.categoryBar || !dom.categoryPrev || !dom.categoryNext) return;
    const maxScroll = dom.categoryBar.scrollWidth - dom.categoryBar.clientWidth;
    dom.categoryPrev.disabled = dom.categoryBar.scrollLeft <= 0;
    dom.categoryNext.disabled = dom.categoryBar.scrollLeft >= maxScroll - 1;
}

function scrollCategories(direction = 1) {
    if (!dom.categoryBar) return;
    const step = Math.max(dom.categoryBar.clientWidth * 0.75, 140);
    dom.categoryBar.scrollBy({
        left: direction * step,
        behavior: 'smooth'
    });
    setTimeout(updateCategoryNavState, 220);
}

function renderItemList() {
    dom.itemList.innerHTML = "";

    const filtered = state.items.filter(item => {
        return item.text.toLowerCase().includes(state.editorSearchQuery) ||
            item.category.toLowerCase().includes(state.editorSearchQuery);
    });

    filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';
        row.innerHTML = `
            <div class="item-info">
                <div class="item-thumb">
                    ${item.image ? `<img src="${item.image}">` : '<div style="width:100%; height:100%; background:var(--glass);"></div>'}
                </div>
                <div class="item-meta">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h4>${item.text}</h4>
                        <span style="cursor:pointer; font-size:1.1rem" onclick="toggleFavorite('${item.id}')">
                            ${item.isFavorite ? '⭐' : '☆'}
                        </span>
                    </div>
                    <p>${item.category}</p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn glass secondary" onclick="editItem('${item.id}')">Modificar</button>
                <button class="btn glass danger" onclick="removeItem('${item.id}')">Eliminar</button>
            </div>
        `;
        dom.itemList.appendChild(row);
    });
}

window.toggleFavorite = async (id) => {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.isFavorite = !item.isFavorite;
    await saveItemDB(item);
    render();
    renderItemList();
};

window.removeItem = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar este elemento?")) return;
    state.items = state.items.filter(i => i.id !== id);
    state.phrase = state.phrase.filter(pid => pid !== id);
    await deleteItemDB(id); // Eliminar de IndexedDB
    save();
    render();
    renderItemList();
};

function loadVoices() {
    state.voices = window.speechSynthesis.getVoices();
    dom.voiceSelect.innerHTML = "";

    // Sort Spanish voices first
    const sorted = state.voices.sort((a, b) => {
        if (a.lang.startsWith('es') && !b.lang.startsWith('es')) return -1;
        if (!a.lang.startsWith('es') && b.lang.startsWith('es')) return 1;
        return a.name.localeCompare(b.name);
    });

    sorted.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.voiceURI;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.voiceURI === state.settings.voiceURI) opt.selected = true;
        dom.voiceSelect.appendChild(opt);
    });
}

// Scanning Logic
function startScanning() {
    stopScanning();
    const tiles = Array.from(dom.grid.querySelectorAll('.tile'));
    if (tiles.length === 0) return;

    state.scanning.index = 0;
    state.scanning.active = true;
    highlightTile(tiles[0]);

    state.scanning.timer = setInterval(() => {
        state.scanning.index = (state.scanning.index + 1) % tiles.length;
        tiles.forEach(t => t.classList.remove('scanning-focus'));
        highlightTile(tiles[state.scanning.index]);
    }, 2000); // 2 second cycle
}

function stopScanning() {
    clearInterval(state.scanning.timer);
    state.scanning.active = false;
    state.scanning.index = -1;
    dom.grid.querySelectorAll('.tile').forEach(t => t.classList.remove('scanning-focus'));
}

function highlightTile(tile) {
    if (!tile) return;
    tile.classList.add('scanning-focus');
    tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function selectScanningElement() {
    const tiles = Array.from(dom.grid.querySelectorAll('.tile'));
    const current = tiles[state.scanning.index];
    if (current) current.click();
}

function applySettings() {
    document.documentElement.style.setProperty('--tile-size', `${state.settings.tileSize}px`);
    dom.rate.value = state.settings.rate;
    dom.tileSize.value = state.settings.tileSize;
    dom.tapMode.value = state.settings.tapMode;
    dom.lockEdit.checked = state.settings.lockEdit;
    dom.scanningEnabled.checked = state.settings.scanningEnabled || false;

    // Professional Features
    dom.showRoutine.checked = state.settings.showRoutine || false;
    dom.boardProfile.value = state.settings.boardProfile || "default";
    dom.routineBar.classList.toggle('hidden', !state.settings.showRoutine);
    updateCategoryNavState();

    // Phase 7: Accessibility & Speech
    dom.showGrammarTags.checked = state.settings.showGrammarTags || false;
    dom.speechMode.value = state.settings.speechMode || 'fluent';
    dom.darkMode.checked = state.settings.darkMode || false;
    dom.headerSpeakToggle.checked = (state.settings.tapMode === 'speak');
    ensureActiveCategories();
    document.body.classList.toggle('show-grammar', state.settings.showGrammarTags);
    document.body.classList.toggle('dark-theme', state.settings.darkMode);
    updateThemeToggleIcon();

    if (!localStorage.getItem(LS_KEYS.introSeen)) {
        dom.introModal.showModal();
    }
}

init();
