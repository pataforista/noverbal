/**
 * HolAAC! 2026 - Core Application Logic
 * Autor: Cesar Celada (drceladapsiquiatria@gmail.com)
 * Proyecto Sin Fines de Lucro
 */

// Upgrade to HTTPS on any real hosting (GitHub Pages is already https-only, but
// third-party static hosts may be reachable over plain http). Skip localhost/
// file: so local development keeps working.
if (
    typeof location !== 'undefined' &&
    location.protocol === 'http:' &&
    !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
) {
    location.replace(`https:${location.href.slice(location.protocol.length)}`);
}

const LS_KEYS = {
    items: "aac_items_v2",
    settings: "aac_settings_v2",
    phrase: "aac_phrase_v2",
    hiddenTags: "aac_hidden_tags_v2",
    activeCategories: "aac_active_categories_v1",
    introSeen: "aac_intro_seen_v1",
    history: "aac_history_v1", // localStorage fallback when IndexedDB is unavailable
    pinHash: "aac_pin_hash_v1", // configurable tutor PIN (hashed)
    coreWords: "aac_core_words_v1", // ids pinned to the fixed core row (Fase 4)
};

const DEFAULT_ITEMS = [
    { id: "1", text: "Sí", category: "General", color: "#bfe3c1", image: "assets/pictos/si.png" },
    { id: "2", text: "No", category: "General", color: "#f5c5c1", image: "assets/pictos/no.png" },
    { id: "3", text: "Hola", category: "Social", color: "#bcd9f5", image: "assets/pictos/hola.png" },
    { id: "4", text: "Por favor", category: "Social", color: "#d8ccf2", image: "assets/pictos/por_favor.png" },
    { id: "5", text: "Agua", category: "Necesidad", color: "#b5dced", image: "assets/pictos/agua.png" },
    { id: "6", text: "Comida", category: "Necesidad", color: "#f7d4a8", image: "assets/pictos/comida.png" },
    { id: "7", text: "Baño", category: "Necesidad", color: "#d7dce2", image: "assets/pictos/bano.png" },
    { id: "8", text: "Dolor", category: "Salud", color: "#f5c5c1", image: "assets/pictos/dolor.png" },
];

// Enhanced Category Metadata with Icons and Colors.
//
// The colours are a single tint family held at roughly the same lightness
// (L*≈86) rather than the fully saturated Tailwind-500 ramp they replace.
// Every pictogram in the library is black line art: on a 500-tone the drawing
// is barely separable from its background, which is what forced the opaque
// label plate over the symbol. On these tints the line art keeps a >10:1
// ratio, dark ink is readable directly on the card, and fifteen categories
// side by side read as one board instead of fifteen competing signals — while
// each hue stays distinct enough to keep the colour coding useful.
//
// S.O.S is the deliberate exception: it stays a strong red, because being
// louder than everything around it is its entire job.
const CATEGORY_METADATA = {
    // Sociales y Emocionales
    "Social": { color: "#bcd9f5", order: 1 },
    "Emociones": { color: "#f6c6d7", order: 2 },
    "Personas": { color: "#f6e7a8", order: 3 },

    // Necesidades Básicas
    "Necesidad": { color: "#b5dced", order: 10 },
    "Comida": { color: "#f7d4a8", order: 11 },
    "Salud": { color: "#f5c5c1", order: 12 },
    "S.O.S": { color: "#d93b3b", order: 13 },

    // Acciones y Movimiento
    "Acciones": { color: "#c3e2c0", order: 20 },
    "Lugares": { color: "#d8ccf2", order: 21 },

    // Objetos y Conceptos
    "Objetos": { color: "#b6e0e2", order: 30 },
    "Sensorial": { color: "#dbe8ab", order: 31 },

    // Bienestar Mental
    "Mente+": { color: "#ccd1f2", order: 40 },
    "Vínculos": { color: "#f7cbda", order: 41 },

    // Otros
    "General": { color: "#c6e6c8", order: 50 },
    "C. Médica": { color: "#d9e8ae", order: 51 },
    "Varios": { color: "#d7dce2", order: 99 },
};

// Real grammatical category (parte de la oración) per semantic category, so the
// "grammar tag" shows an actual word-type — verb, noun, adjective, social,
// other — instead of the misleading first letter of the category (P1-9). An
// item may override this with its own `pos` field.
const CATEGORY_POS = {
    "Acciones": "V",        // verbo
    "Personas": "S",        // sustantivo
    "Objetos": "S",
    "Comida": "S",
    "Lugares": "S",
    "Necesidad": "S",
    "Salud": "S",
    "C. Médica": "S",
    "Vínculos": "S",
    "Emociones": "A",       // adjetivo / descriptor
    "Sensorial": "A",
    "Mente+": "A",
    "Social": "So",         // social / interjección
    "S.O.S": "So",
    "General": "O",         // otros
    "Varios": "O",
};

function getPosLabel(item) {
    if (item.pos) return String(item.pos).toUpperCase();
    return CATEGORY_POS[item.category] || "O";
}

// Board profiles map to REAL category names present in the library.
// Keep these in sync with CATEGORY_METADATA / library.json categories.
const PROFILE_CATEGORIES = {
    home: ['General', 'Necesidad', 'Comida', 'Emociones', 'Social', 'Acciones', 'Lugares', 'Objetos', 'Personas', 'Sensorial'],
    school: ['General', 'Personas', 'Acciones', 'Social', 'Emociones', 'Mente+', 'Sensorial', 'Objetos'],
    sos: ['S.O.S', 'Salud', 'C. Médica', 'Emociones', 'Necesidad', 'Personas'],
};

const DEFAULT_SETTINGS = {
    voiceURI: "",
    rate: 1.0,
    tileSize: 140,
    tapMode: "add", // add | speak
    lockEdit: false,
    scanningEnabled: false,
    scanSpeed: 2, // seconds per step in scanning mode
    activeCategories: [],
    hapticFeedback: true, // short vibration confirming each tap (where supported)
    pagedMode: false, // fixed-position pages instead of a long scroll (N-1)
    calmMode: false, // strips colour, shadow and secondary labels for sensory load
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
    currentPage: 0, // active page index in paged mode (N-1)
    searchQuery: "",
    voices: [],
    editorSearchQuery: "",
    pendingImage: null,
    coreWords: [], // ids pinned to the always-visible core row (N-2)
    routine: [],
    scanning: {
        active: false,
        index: -1,
        timer: null,
        // Two-level group scanning: region first, then its contents.
        phase: 'group', // 'group' | 'linear' | 'row' | 'cell'
        group: 0,       // index into the active scan regions
        passes: 0,      // completed sweeps of a region, to auto-escape it
        row: 0,
        col: 0,
        cols: 1,
        rows: 0
    },
    tutorMode: {
        active: false,
        hiddenTags: new Set(loadJSON(LS_KEYS.hiddenTags, []))
    }
};

// IndexedDB Helper
const dbName = "MiTableroAAC_DB";
// v3: history store migrated to autoIncrement so two entries in the same
// millisecond can no longer collide on the timestamp key (P1-4).
const dbVersion = 3;
let db = null;
// When IndexedDB is unavailable (Safari/Firefox private mode, storage full),
// we degrade gracefully to localStorage so the app still works (P0-1).
let storageMode = "idb"; // "idb" | "local"
// Set when library.json couldn't be fetched on first run (offline); we retry
// merging it once the network/app comes back to the foreground (P0-1).
let libraryPending = false;

// Normalize a word for comparison: lowercase, trimmed, accents stripped.
function normalizeWord(text) {
    return String(text || "")
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
}

function sameWord(a, b) {
    return normalizeWord(a) === normalizeWord(b);
}

// High-frequency "core" vocabulary that stays visible in every view (N-2), the
// way Proloquo2Go / TD Snap / LAMP keep a fixed core. Resolved to real item ids.
const DEFAULT_CORE_TEXTS = ['Sí', 'No', 'Ayuda', 'Querer', 'Más', 'Parar', 'Baño', 'Dolor'];
const MAX_CORE_WORDS = 12;

function saveCoreWords() {
    localStorage.setItem(LS_KEYS.coreWords, JSON.stringify(state.coreWords));
}

function initCoreWords() {
    const stored = loadJSON(LS_KEYS.coreWords, null);
    if (Array.isArray(stored)) {
        // Drop ids that no longer exist (deleted items).
        state.coreWords = stored.filter(id => state.items.some(i => i.id === id));
    } else {
        state.coreWords = [];
    }
    if (state.coreWords.length === 0) {
        // First run: derive the default core by matching words to real items.
        for (const text of DEFAULT_CORE_TEXTS) {
            const item = state.items.find(i => sameWord(i.text, text));
            if (item && !state.coreWords.includes(item.id)) state.coreWords.push(item.id);
        }
        saveCoreWords();
    }
}

function isCore(id) {
    return state.coreWords.includes(id);
}

/* ── Tutor PIN (configurable, hashed) ─────────────────────────────────────
   The PIN is stored only as a SHA-256 hash in localStorage — never in clear —
   and gates the Tutor Mode, unlocking edition, and clearing the clinical log
   (P1-11). Default PIN is "0000" until the user changes it. */

async function hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pin)));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getStoredPinHash() {
    let h = localStorage.getItem(LS_KEYS.pinHash);
    if (!h) {
        h = await hashPin('0000');
        localStorage.setItem(LS_KEYS.pinHash, h);
    }
    return h;
}

async function verifyPinValue(pin) {
    try {
        return (await hashPin(pin)) === (await getStoredPinHash());
    } catch (_) {
        // crypto.subtle needs a secure context (https/localhost). In the rare
        // insecure case, accept the default PIN so the user is never locked out.
        return String(pin) === '0000';
    }
}

// Throttle PIN guesses in memory (resets on reload): after 5 wrong attempts,
// back off with a growing delay so the 4-digit PIN can't be brute-forced by
// an automated loop of clicks/taps.
const pinAttempts = { count: 0, lockedUntil: 0 };
function pinLockRemainingMs() {
    return Math.max(0, pinAttempts.lockedUntil - Date.now());
}
function registerPinFailure() {
    pinAttempts.count += 1;
    if (pinAttempts.count >= 5) {
        pinAttempts.lockedUntil = Date.now() + Math.min(30000, 2000 * (pinAttempts.count - 4));
    }
}
function registerPinSuccess() {
    pinAttempts.count = 0;
    pinAttempts.lockedUntil = 0;
}

// Show the PIN dialog and resolve true/false when verified or cancelled. Used
// anywhere a protected action needs confirmation.
let pinResolver = null;
function promptPin() {
    return new Promise((resolve) => {
        pinResolver = resolve;
        if (dom.pinInput) dom.pinInput.value = '';
        dom.pinModal.showModal();
        if (dom.pinInput) dom.pinInput.focus();
    });
}

function resolvePin(result) {
    const r = pinResolver;
    pinResolver = null;
    if (r) r(result);
    return !!r;
}

function activateTutorMode() {
    state.tutorMode.active = true;
    dom.tutorMode.checked = true;
    document.body.classList.add('tutor-active');
    renderGrid();
    flashStatus('Modo Tutor activado');
}

function toggleCore(id) {
    const idx = state.coreWords.indexOf(id);
    if (idx >= 0) {
        state.coreWords.splice(idx, 1);
    } else {
        if (state.coreWords.length >= MAX_CORE_WORDS) state.coreWords.shift();
        state.coreWords.push(id);
    }
    saveCoreWords();
    renderCoreRow();
    renderGrid();
}

async function initDB() {
    return new Promise((resolve, reject) => {
        let request;
        try {
            request = indexedDB.open(dbName, dbVersion);
        } catch (err) {
            return reject(err);
        }
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            const tx = e.target.transaction;
            if (!database.objectStoreNames.contains("items")) {
                database.createObjectStore("items", { keyPath: "id" });
            }
            // Migrate history to an autoIncrement key, rescuing existing records.
            if (!database.objectStoreNames.contains("history")) {
                database.createObjectStore("history", { keyPath: "id", autoIncrement: true });
            } else {
                const oldStore = tx.objectStore("history");
                if (!oldStore.autoIncrement) {
                    const rescued = [];
                    oldStore.openCursor().onsuccess = (ev) => {
                        const cursor = ev.target.result;
                        if (cursor) {
                            rescued.push(cursor.value);
                            cursor.continue();
                        } else {
                            database.deleteObjectStore("history");
                            const newStore = database.createObjectStore("history", { keyPath: "id", autoIncrement: true });
                            rescued.forEach((r) => newStore.add(r));
                        }
                    };
                }
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject(request.error || e);
        request.onblocked = () => reject(new Error("IndexedDB bloqueada por otra pestaña"));
    });
}

async function getAllItems() {
    if (storageMode === "local" || !db) return loadJSON(LS_KEYS.items, []);
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(["items"], "readonly");
            const store = transaction.objectStore("items");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (err) {
            reject(err);
        }
    });
}

async function saveItemDB(item) {
    if (storageMode === "local" || !db) {
        const items = loadJSON(LS_KEYS.items, []);
        const idx = items.findIndex((i) => i.id === item.id);
        if (idx >= 0) items[idx] = item;
        else items.push(item);
        localStorage.setItem(LS_KEYS.items, JSON.stringify(items));
        return;
    }
    const transaction = db.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    store.put(item);
}

async function deleteItemDB(id) {
    if (storageMode === "local" || !db) {
        const items = loadJSON(LS_KEYS.items, []).filter((i) => i.id !== id);
        localStorage.setItem(LS_KEYS.items, JSON.stringify(items));
        return;
    }
    const transaction = db.transaction(["items"], "readwrite");
    const store = transaction.objectStore("items");
    store.delete(id);
}

async function logActivity(content) {
    const entry = {
        timestamp: Date.now(),
        date: new Date().toLocaleString(),
        content: content
    };
    if (storageMode === "local") {
        const history = loadJSON(LS_KEYS.history, []);
        history.push(entry);
        // Keep the log bounded so localStorage never overflows.
        if (history.length > 500) history.splice(0, history.length - 500);
        localStorage.setItem(LS_KEYS.history, JSON.stringify(history));
        return;
    }
    if (!db) return;
    try {
        const transaction = db.transaction(["history"], "readwrite");
        const store = transaction.objectStore("history");
        store.add(entry);
    } catch (err) {
        console.error("No se pudo registrar la actividad", err);
    }
}

async function getAllHistory() {
    if (storageMode === "local") {
        return loadJSON(LS_KEYS.history, []).slice().reverse().slice(0, 100);
    }
    return new Promise((resolve) => {
        if (!db) return resolve([]);
        const transaction = db.transaction(["history"], "readonly");
        const store = transaction.objectStore("history");
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result.reverse().slice(0, 100)); // Last 100
        request.onerror = () => resolve([]);
    });
}

async function clearHistoryDB() {
    if (storageMode === "local" || !db) {
        localStorage.removeItem(LS_KEYS.history);
        return;
    }
    const transaction = db.transaction(["history"], "readwrite");
    const store = transaction.objectStore("history");
    store.clear();
}

// DOM Cache
const dom = {
    statusText: document.getElementById('statusText'),
    grid: document.getElementById('grid'),
    pageControls: document.getElementById('pageControls'),
    pagedMode: document.getElementById('pagedMode'),
    coreRow: document.getElementById('coreRow'),
    boardBreadcrumb: document.getElementById('boardBreadcrumb'),
    headerProfile: document.getElementById('headerProfile'),
    btnSOS: document.getElementById('btnSOS'),
    chips: document.getElementById('chips'),
    categoryBar: document.getElementById('categoryBar'),
    categoryPrev: document.getElementById('categoryPrev'),
    categoryNext: document.getElementById('categoryNext'),
    categoryPicker: document.getElementById('categoryPicker'),
    searchBox: document.getElementById('searchBox'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    btnSpeak: document.getElementById('btnSpeak'),
    btnBackspace: document.getElementById('btnBackspace'),
    btnClear: document.getElementById('btnClear'),
    btnEdit: document.getElementById('btnEdit'),
    btnAdd: document.getElementById('btnAdd'),
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
    scanSpeed: document.getElementById('scanSpeed'),
    scanSpeedValue: document.getElementById('scanSpeedValue'),
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
    btnExportHistory: document.getElementById('btnExportHistory'),
    // Tutor Mode & Security
    tutorMode: document.getElementById('tutorMode'),
    pinModal: document.getElementById('pinModal'),
    pinInput: document.getElementById('pinInput'),
    btnVerifyPin: document.getElementById('btnVerifyPin'),
    newPin: document.getElementById('newPin'),
    btnChangePin: document.getElementById('btnChangePin'),
    // Phase 7: Motor & Speech
    btnPause: document.getElementById('btnPause'),
    btnStop: document.getElementById('btnStop'),
    showGrammarTags: document.getElementById('showGrammarTags'),
    speechMode: document.getElementById('speechMode'),
    darkMode: document.getElementById('darkMode'),
    hapticFeedback: document.getElementById('hapticFeedback'),
    calmMode: document.getElementById('calmMode'),
    // Offline precache
    btnDownloadAll: document.getElementById('btnDownloadAll'),
    downloadProgress: document.getElementById('downloadProgress'),
    downloadBarFill: document.getElementById('downloadBarFill'),
    downloadProgressText: document.getElementById('downloadProgressText'),
    updateToast: document.getElementById('updateToast'),
    btnUpdateNow: document.getElementById('btnUpdateNow'),
    btnDismissUpdate: document.getElementById('btnDismissUpdate'),
    headerSpeakToggle: document.getElementById('headerSpeakToggle'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    btnMore: document.getElementById('btnMore'),
    headerOverflow: document.getElementById('headerOverflow'),
    // Writing Module
    btnWriting: document.getElementById('btnWriting'),
    writingPanel: document.getElementById('writingPanel'),
    writingInput: document.getElementById('writingInput'),
    btnSpeakWriting: document.getElementById('btnSpeakWriting'),
    btnClearWriting: document.getElementById('btnClearWriting'),
    btnCloseWriting: document.getElementById('btnCloseWriting'),
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



// Build an <svg><use href="#i-…"> node, so JS-created controls carry the same
// icon set as the ones written in the markup.
function makeIcon(id, cls = 'ui-icon') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#i-${id}`);
    svg.appendChild(use);
    return svg;
}

// Swap the glyph a `<use>` points at. Assigning textContent to an <svg> would
// wipe the <use> child and leave a button with no icon at all — which is what
// happened to «Tema» the moment its emoji became an SVG.
function setIcon(el, id) {
    if (!el) return;
    const use = el.querySelector('use');
    if (use) use.setAttribute('href', `#i-${id}`);
}

// The add/save button swaps both its icon and its wording between «add a new
// word» and «save the one being edited». Assigning textContent would drop the
// <svg> the markup ships with, so icon and label are set separately.
function setAddItemMode(mode) {
    if (!dom.btnAddItem) return;
    const editing = mode === 'edit';
    setIcon(dom.btnAddItem.querySelector('.btn-icon'), editing ? 'save' : 'plus');
    const label = dom.btnAddItem.querySelector('.btn-label');
    const text = editing ? 'Guardar Cambios' : 'Añadir al tablero';
    if (label) label.textContent = text;
}

function updateThemeToggleIcon() {
    if (!dom.btnThemeToggle) return;
    const isDark = !!state.settings.darkMode;
    setIcon(dom.btnThemeToggle.querySelector('.btn-icon'), isDark ? 'sun' : 'moon');
    dom.btnThemeToggle.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    dom.btnThemeToggle.title = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

// Keep the system UI (status bar / address bar) in sync with the app theme.
function updateThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    // Calm mode repaints the whole surface, so the browser chrome has to follow
    // it too — otherwise the one strip the app does not draw stays the colour
    // the mode was turned on to get rid of.
    const calm = state.settings.calmMode;
    const dark = state.settings.darkMode;
    let color = dark ? '#141317' : '#fbfaf9';
    if (calm) color = dark ? '#17171a' : '#f2f1ef';
    meta.setAttribute('content', color);
}

function save() {
    // Items are now in IndexedDB
    localStorage.setItem(LS_KEYS.settings, JSON.stringify(state.settings));
    localStorage.setItem(LS_KEYS.phrase, JSON.stringify(state.phrase));
}

/* ── Tactile feedback ─────────────────────────────────────────────────
   Immediate multi-sensory confirmation on every tap. Both channels are
   opt-outable (haptics via a setting; the ripple via prefers-reduced-motion)
   because the target audience includes sensory-sensitive users. */

const CAN_VIBRATE = 'vibrate' in navigator;
const PREFERS_REDUCED_MOTION = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

function haptic(pattern = 12) {
    if (!CAN_VIBRATE || !state.settings.hapticFeedback) return;
    try {
        navigator.vibrate(pattern);
    } catch (_) {
        /* vibrate can throw if the gesture context is lost — ignore */
    }
}

// Tappable controls that should emit a Material ripple from the touch point.
const RIPPLE_SELECTOR = '.tile, .btn, .pill, .pill-nav, .btn-close, .category-card, .routine-item, .arasaac-thumb';

function spawnRipple(host, clientX, clientY) {
    if (PREFERS_REDUCED_MOTION.matches) return;
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    // Center on the pointer (fallback to element center for keyboard activation).
    const x = (Number.isFinite(clientX) ? clientX : rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (Number.isFinite(clientY) ? clientY : rect.top + rect.height / 2) - rect.top - size / 2;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    host.appendChild(ripple);
}

// Bring the top of the communication board back into view after navigation.
function scrollBoardToTop() {
    const behavior = PREFERS_REDUCED_MOTION.matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
}

/* The pinned stack (topbar → composer → core row) is sticky, and each layer has
   to sit exactly below the previous one. Their heights depend on the viewport,
   the tile size setting and how many words are in the sentence, so they are
   measured rather than hard-coded. */
function updateStickyOffsets() {
    const topbar = document.querySelector('.topbar');
    const composer = document.querySelector('.composer');
    const root = document.documentElement.style;
    if (topbar) root.setProperty('--topbar-h', `${Math.round(topbar.getBoundingClientRect().height)}px`);
    if (composer && !composer.classList.contains('hidden')) {
        root.setProperty('--composer-h', `${Math.round(composer.getBoundingClientRect().height)}px`);
    }
}

function initStickyOffsets() {
    updateStickyOffsets();
    if (typeof ResizeObserver === 'function') {
        const ro = new ResizeObserver(() => updateStickyOffsets());
        document.querySelectorAll('.topbar, .composer').forEach(el => ro.observe(el));
    }
    window.addEventListener('resize', updateStickyOffsets, { passive: true });
    window.addEventListener('orientationchange', updateStickyOffsets);
}

// One delegated listener covers every tappable, present or dynamically added.
function initTactileFeedback() {
    document.body.addEventListener('pointerdown', (e) => {
        if (e.button && e.button !== 0) return; // primary button / touch only
        const host = e.target.closest(RIPPLE_SELECTOR);
        if (host && !host.disabled) {
            spawnRipple(host, e.clientX, e.clientY);
        }
        // Haptic covers a slightly wider set of controls (e.g. the favorite star).
        if (e.target.closest(`${RIPPLE_SELECTOR}, .tile-fav, .chip .remove`)) {
            haptic();
        }
    }, { passive: true });
}

// Initialization
async function init() {
    // On the very first run (no saved preferences yet) honour the OS colour
    // scheme, matching the behaviour users expect from every modern app.
    if (localStorage.getItem(LS_KEYS.settings) === null &&
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        state.settings.darkMode = true;
    }

    try {
        await initDB();
    } catch (err) {
        // IndexedDB unavailable (private mode, storage full…): keep working with
        // localStorage instead of freezing on "Cargando..." (P0-1).
        console.error('IndexedDB no disponible, usando almacenamiento local:', err);
        storageMode = 'local';
        db = null;
    }

    let storedItems = [];
    try {
        storedItems = await getAllItems();
    } catch (err) {
        console.error('No se pudieron leer los elementos guardados:', err);
        storedItems = [];
    }

    if (storedItems.length === 0) {
        // First run: copy defaults + curated library to storage.
        const initialItems = [...DEFAULT_ITEMS];
        let libraryItems = [];
        try {
            libraryItems = await fetchLibraryItems();
        } catch (err) {
            // No network on first launch: start with the built-in basics only,
            // instead of hanging forever waiting for library.json (P0-1).
            console.error('No se pudo cargar library.json:', err);
            libraryPending = true;
        }

        // De-duplicate by normalized text so a default and its library twin don't
        // both land on the board (P1-8).
        for (const item of libraryItems) {
            const dupById = initialItems.some(existing => existing.id === item.id);
            const dupByText = initialItems.some(existing => sameWord(existing.text, item.text));
            if (!dupById && !dupByText) {
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
    initCoreWords();
    applySettings();
    await repairCoreImages(); // Force update core items with images
    attachListeners();
    initTactileFeedback();
    initStickyOffsets();

    // Setup voice loading BEFORE initial load
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Try loading voices immediately, then again with delays if needed
    loadVoices();
    if (state.voices.length === 0 && window.speechSynthesis) {
        // If voices aren't loaded yet, wait a bit and try again (with backoff)
        setTimeout(loadVoices, 100);
        setTimeout(loadVoices, 500);
        setTimeout(loadVoices, 1000);
    }

    render();

    if ('serviceWorker' in navigator) {
        // Whether a SW was already controlling this page when it loaded. We only
        // offer to reload on a *replacement* worker, never on the very first install.
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController) return;
            // The new worker is already in control; only the reload is deferred so
            // whatever the user is writing isn't lost mid-keystroke (P2-17).
            showUpdateToast();
        });

        if (dom.btnUpdateNow) {
            dom.btnUpdateNow.addEventListener('click', () => window.location.reload());
        }
        if (dom.btnDismissUpdate) {
            dom.btnDismissUpdate.addEventListener('click', hideUpdateToast);
        }

        // Progress + completion messages from the "Descargar todo" precache.
        navigator.serviceWorker.addEventListener('message', (event) => {
            const data = event.data || {};
            if (data.type === 'PRECACHE_PROGRESS') {
                updateDownloadProgress(data.done, data.total);
            } else if (data.type === 'PRECACHE_DONE') {
                updateDownloadProgress(data.total, data.total);
                if (dom.btnDownloadAll) dom.btnDownloadAll.disabled = false;
                flashStatus('Listo: la app funciona sin conexión');
            }
        });

        navigator.serviceWorker.register('./service-worker.js').then(reg => {
            // Force a check for a newer worker whenever the app is reopened or
            // brought back to the foreground, plus periodically for long sessions.
            const checkForUpdate = () => reg.update().catch(() => {});
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') checkForUpdate();
            });
            setInterval(checkForUpdate, 60 * 60 * 1000);
        }).catch(err => console.error('SW Error:', err));
    }

    dom.statusText.textContent = "Listo para usar";

    // If library.json couldn't be fetched on first run (offline), retry merging
    // it the next time the app becomes visible / regains focus (P0-1).
    if (libraryPending) {
        const retryLibrary = async () => {
            if (!libraryPending) return;
            try {
                await ensureLibraryItemsPresent();
                libraryPending = false;
                render();
            } catch (_) { /* still offline: try again next time */ }
        };
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') retryLibrary();
        });
        window.addEventListener('online', retryLibrary);
    }

    // Global Key Events for Scanning. Space/Enter only act as the switch when the
    // user is NOT typing: otherwise a space in the search box or Escritura libre
    // would trigger the highlighted tile instead of writing a space (P0-2).
    window.addEventListener('keydown', (e) => {
        if (!state.scanning.active) return;
        if (e.code !== 'Space' && e.code !== 'Enter') return;
        const t = e.target;
        const tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (t && typeof t.closest === 'function' && t.closest('dialog[open]')) return;
        e.preventDefault();
        selectScanningElement();
    });
}

function attachListeners() {
    // Writing Module
    dom.btnWriting.onclick = () => {
        dom.writingPanel.classList.toggle('hidden');
        if (!dom.writingPanel.classList.contains('hidden')) {
            dom.writingInput.focus();
        }
    };
    dom.btnCloseWriting.onclick = () => dom.writingPanel.classList.add('hidden');
    dom.btnClearWriting.onclick = () => {
        dom.writingInput.value = '';
        dom.writingInput.focus();
    };
    dom.btnSpeakWriting.onclick = () => {
        const text = dom.writingInput.value.trim();
        if (!text) { flashStatus("Escribe algo primero"); return; }
        if (!window.speechSynthesis) {
            flashStatus("⚠️ Síntesis de voz no disponible en este navegador");
            return;
        }
        speakWithTTS(text);
        logActivity(`Escritura: ${text}`);
    };
    // Also allow Ctrl+Enter to speak from textarea
    dom.writingInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            dom.btnSpeakWriting.click();
        }
    });

    // Caregiver-tools overflow menu (phones and short landscape only; on wider
    // screens the wrapper is `display: contents` and the button is hidden).
    if (dom.btnMore && dom.headerOverflow) {
        const setMenu = (open) => {
            dom.headerOverflow.classList.toggle('open', open);
            dom.btnMore.setAttribute('aria-expanded', String(open));
        };
        dom.btnMore.onclick = (e) => {
            e.stopPropagation();
            setMenu(dom.btnMore.getAttribute('aria-expanded') !== 'true');
        };
        // Any choice inside the menu closes it, as does a tap outside or Escape.
        dom.headerOverflow.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) setMenu(false);
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#headerOverflow, #btnMore')) setMenu(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dom.btnMore.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                dom.btnMore.focus();
            }
        });
    }

    // Top bar
    dom.btnSettings.onclick = () => {
        const card = dom.settingsModal?.querySelector('.modal-card');
        if (card) card.scrollTop = 0;
        dom.settingsModal.showModal();
    };
    dom.btnThemeToggle.onclick = () => {
        state.settings.darkMode = !state.settings.darkMode;
        document.body.classList.toggle('dark-theme', state.settings.darkMode);
        dom.darkMode.checked = state.settings.darkMode;
        updateThemeToggleIcon();
        updateThemeColorMeta();
        haptic();
        save();
    };
    dom.btnEdit.onclick = () => {
        if (state.settings.lockEdit) {
            flashStatus("🔒 Edición bloqueada");
            return;
        }
        openEditModal();
    };
    // «Agregar» abre el mismo editor pero preparado para crear: limpia el
    // formulario y pone el foco en el campo de la palabra, para que el flujo
    // «foto + palabra» sea inmediato.
    if (dom.btnAdd) {
        dom.btnAdd.onclick = () => {
            if (state.settings.lockEdit) {
                flashStatus("🔒 Edición bloqueada");
                return;
            }
            setAddItemMode('add');
            dom.btnAddItem.removeAttribute('data-edit-id');
            dom.itemText.value = '';
            dom.itemCategory.value = '';
            dom.itemImage.value = '';
            dom.preview.textContent = 'Esperando datos...';
            state.pendingImage = null;
            openEditModal();
            dom.itemText.focus();
        };
    }

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
        state.currentPage = 0; // new search resets to the first page (N-1)
        renderGrid();
        renderBreadcrumb();
    };

    dom.btnClearSearch.onclick = () => {
        state.searchQuery = '';
        dom.searchBox.value = '';
        renderGrid();
        updateSearchClearButton();
        dom.searchBox.focus();
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

    if (dom.categoryPicker) {
        dom.categoryPicker.onclick = () => showCategoryPicker();
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
    dom.lockEdit.onchange = async (e) => {
        // Locking is free; UNLOCKING requires the PIN so the barrier means
        // something (P1-11).
        if (!e.target.checked) {
            if (!(await promptPin())) {
                e.target.checked = true; // stay locked
                return;
            }
        }
        state.settings.lockEdit = e.target.checked;
        save();
    };
    dom.scanningEnabled.onchange = (e) => {
        state.settings.scanningEnabled = e.target.checked;
        save();
        renderGrid();
    };
    if (dom.pagedMode) {
        dom.pagedMode.onchange = (e) => {
            state.settings.pagedMode = e.target.checked;
            state.currentPage = 0;
            save();
            render();
        };
    }
    if (dom.scanSpeed) {
        dom.scanSpeed.oninput = (e) => {
            state.settings.scanSpeed = parseFloat(e.target.value);
            if (dom.scanSpeedValue) dom.scanSpeedValue.textContent = state.settings.scanSpeed.toFixed(1);
            save();
            if (state.scanning.active) startScanning();
        };
    }
    dom.voiceSelect.onchange = (e) => {
        state.settings.voiceURI = e.target.value;
        save();
    };
    dom.darkMode.onchange = (e) => {
        state.settings.darkMode = e.target.checked;
        document.body.classList.toggle('dark-theme', state.settings.darkMode);
        updateThemeToggleIcon();
        updateThemeColorMeta();
        save();
    };
    if (dom.hapticFeedback) {
        dom.hapticFeedback.onchange = (e) => {
            state.settings.hapticFeedback = e.target.checked;
            save();
            if (e.target.checked) haptic(); // confirm the new setting with a buzz
        };
    }

    if (dom.calmMode) {
        dom.calmMode.onchange = (e) => {
            state.settings.calmMode = e.target.checked;
            document.body.classList.toggle('calm-mode', state.settings.calmMode);
            updateThemeColorMeta(); // the browser chrome follows the new surface
            save();
        };
    }

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
        setBoardProfile(e.target.value);
        render();
    };
    if (dom.headerProfile) {
        dom.headerProfile.onchange = (e) => {
            setBoardProfile(e.target.value);
            render();
        };
    }
    if (dom.btnSOS) {
        dom.btnSOS.onclick = (e) => {
            e.preventDefault();
            goToSOS();
        };
    }
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
    if (dom.btnExportHistory) {
        dom.btnExportHistory.onclick = () => exportHistoryCSV();
    }
    dom.btnClearHistory.onclick = async () => {
        if (!confirm("¿Borrar historial clínico?")) return;
        if (!(await promptPin())) return; // clinical log is PIN-protected (P1-11)
        await clearHistoryDB();
        renderHistory();
    };

    // Tutor Mode with 3s Hold Security
    let tutorHoldTimer = null;
    dom.tutorMode.onpointerdown = () => {
        if (state.tutorMode.active) return; // Only for activation
        tutorHoldTimer = setTimeout(async () => {
            flashStatus("Liberando Modo Tutor...");
            if (await promptPin()) activateTutorMode();
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
            e.target.checked = false; // Stay off until verified via hold + PIN
        }
    };

    // Single PIN dialog serves every protected action; verify against the stored
    // hash and hand the result back to whoever opened it (promptPin).
    dom.btnVerifyPin.onclick = async (e) => {
        e.preventDefault();
        const waitMs = pinLockRemainingMs();
        if (waitMs > 0) {
            flashStatus(`Demasiados intentos. Espera ${Math.ceil(waitMs / 1000)}s`);
            dom.pinInput.value = "";
            return;
        }
        const ok = await verifyPinValue(dom.pinInput.value);
        if (ok) {
            registerPinSuccess();
            dom.pinInput.value = "";
            dom.pinModal.close();
            // If nobody is awaiting (legacy direct open), default to activating tutor.
            if (!resolvePin(true)) activateTutorMode();
        } else {
            registerPinFailure();
            flashStatus("PIN Incorrecto");
            dom.pinInput.value = "";
        }
    };

    // Cancelling / dismissing the dialog resolves the pending action as false.
    dom.pinModal.addEventListener('close', () => {
        if (pinResolver) resolvePin(false);
    });

    // Change the Tutor PIN (asks for the current one first).
    if (dom.btnChangePin) {
        dom.btnChangePin.onclick = async (e) => {
            e.preventDefault();
            const next = (dom.newPin.value || '').trim();
            if (!/^\d{4}$/.test(next)) {
                flashStatus('El PIN debe tener 4 dígitos');
                return;
            }
            if (!(await promptPin())) return; // confirm with current PIN
            localStorage.setItem(LS_KEYS.pinHash, await hashPin(next));
            dom.newPin.value = '';
            flashStatus('PIN actualizado');
        };
    }

    // Offline precache button
    if (dom.btnDownloadAll) {
        dom.btnDownloadAll.onclick = (e) => {
            e.preventDefault();
            downloadAllForOffline();
        };
    }

    // Speech Controls
    dom.btnPause.onclick = () => {
        togglePauseSpeaking();
    };
    dom.btnStop.onclick = () => stopSpeaking();
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

    // Filenames that belong to a core item. Used to detect a "crossed" image
    // (e.g. a "Sí" tile pointing at no.png) without clobbering a user's own
    // custom picture for that tile.
    const coreFiles = new Set(coreUpdates.map(u => u.image.split('/').pop()));

    let changed = false;
    for (const update of coreUpdates) {
        const item = state.items.find(i => i.id === update.id);
        if (!item) continue;

        const expectedFile = update.image.split('/').pop();
        const currentFile = String(item.image || '').split('/').pop();

        // Repair only when the image is clearly broken, or when it's another
        // core picto assigned to the wrong item — compare each item against ITS
        // OWN expected file, never against the whole core set (P1-5).
        const needsRepair = !item.image
            || String(item.image).includes('null')
            || (currentFile !== expectedFile && coreFiles.has(currentFile));

        if (needsRepair) {
            item.image = update.image;
            await saveItemDB(item);
            changed = true;
        }
    }
    if (changed) render();
}

function updateCompanion() {
    // Guía virtual eliminada por decisión de producto.
}

/* ── Playback control ─────────────────────────────────────────────────────
   Speech reaches the user through two channels: pre-recorded mp3 clips (46 of
   the highest-frequency words) and the TTS engine. «Pausa» and «Detener» used
   to call only `speechSynthesis`, so on exactly those high-frequency words —
   Sí, No, Ayuda, Dolor… — the stop button did nothing. Both channels are now
   tracked together and driven by the same controls. */

let currentAudio = null;      // the <audio> element playing a local clip, if any
let speakingDepth = 0;        // >0 while any channel is producing sound

function setSpeakingState(active) {
    speakingDepth = Math.max(0, speakingDepth + (active ? 1 : -1));
    document.body.classList.toggle('is-speaking', speakingDepth > 0);
}

function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    speakingDepth = 0;
    document.body.classList.remove('is-speaking');
}

function togglePauseSpeaking() {
    if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        return;
    }
    if (currentAudio && currentAudio.paused) {
        currentAudio.play().catch(() => {});
        return;
    }
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    else window.speechSynthesis.pause();
}

// Returns a promise that resolves when the local mp3 finishes playing, and
// rejects (so the caller can fall back to TTS) if there's no clip or it fails.
function playLocalAudio(text) {
    return new Promise((resolve, reject) => {
        const cleanName = text.toLowerCase().trim()
            .replace(/\s+/g, '_')
            .normalize("NFD").replace(/[̀-ͯ]/g, "");

        // Pre-recorded clips only exist for single terms.
        if (cleanName.includes('_') || !cleanName) return reject();

        const audio = new Audio(`assets/audio/${cleanName}.mp3`);
        const done = (fn) => () => {
            if (currentAudio === audio) currentAudio = null;
            setSpeakingState(false);
            fn();
        };
        audio.onended = done(resolve);
        audio.onerror = done(reject);
        audio.play().then(() => {
            currentAudio = audio;
            setSpeakingState(true);
        }).catch(reject);
    });
}

// Speak one term. Resolves only when playback actually ends, so callers can
// chain words without cutting each other off (P0-3).
function speakText(text) {
    if (!text) return Promise.resolve();
    return playLocalAudio(text).catch(() => speakWithTTS(text));
}

function speakWithTTS(text) {
    if (!window.speechSynthesis) {
        console.error('SpeechSynthesis no soportado');
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        try {
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es';
            // Honour the configured rate directly so the control is truthful (P2-12).
            utterance.rate = Math.min(2, Math.max(0.5, state.settings.rate || 1));
            utterance.pitch = 1.0;
            // Resolve when speech ends (or errors) so word-by-word mode advances
            // exactly when the previous word is done, never on a fixed timer.
            const finish = () => { setSpeakingState(false); resolve(); };
            utterance.onstart = () => setSpeakingState(true);
            utterance.onend = finish;
            utterance.onerror = finish;

            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                window.speechSynthesis.speak(utterance);
                return;
            }

            // Selected voice, then es-MX/Premium Spanish, then any Spanish voice.
            const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
            const voice = voices.find(v => v.voiceURI === state.settings.voiceURI && v.lang.startsWith('es'))
                || spanishVoices.find(v => v.lang.includes('es-MX') || v.name.includes('Premium'))
                || spanishVoices[0];

            if (voice) utterance.voice = voice;

            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error('TTS Error:', e);
            resolve();
        }
    });
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
        // Word-by-word mode (pedagogical): wait for each word to finish, then a
        // short, deliberate gap - no fixed timeout that could clip long words.
        for (const item of items) {
            await speakText(item.text);
            await new Promise(r => setTimeout(r, 150));
        }
    } else {
        // Fluent mode
        const text = items.map(i => i.text).join(" ");
        speakText(text);
    }

    logActivity(`Frase completa: ${items.map(i => i.text).join(" ")}`);
}

// Render an image preview safely via the DOM API (never string HTML) so an
// image value can't smuggle markup into the editor (P0-10).
function setPreviewImage(src) {
    dom.preview.textContent = '';
    const img = document.createElement('img');
    img.src = src;
    img.style.maxHeight = '100px';
    img.style.borderRadius = '10px';
    dom.preview.appendChild(img);
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // keep local uploads well under IndexedDB/localStorage quotas

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        flashStatus('Formato de imagen no admitido');
        e.target.value = '';
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        flashStatus('La imagen supera el límite de 3 MB');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = sanitizeImage(ev.target.result);
        if (!dataUrl) {
            flashStatus('Imagen no válida');
            e.target.value = '';
            return;
        }
        state.pendingImage = dataUrl;
        setPreviewImage(state.pendingImage);
    };
    reader.readAsDataURL(file);
}

function addItem() {
    const isEdit = dom.btnAddItem.hasAttribute('data-edit-id');
    if (isEdit) return updateItem();

    const text = dom.itemText.value.trim();
    if (!text) return;

    const item = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
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
    setAddItemMode('add');
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
        setPreviewImage(item.image);
    } else {
        dom.preview.textContent = "Sin imagen";
    }

    setAddItemMode('edit');
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
                color: existing.color || fallback?.color || '#c6e6c8',
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

// Gather every cacheable asset URL (pictos + pre-recorded audio) so the Service
// Worker can store them all for fully-offline use (P1-13).
function collectOfflineAssetUrls() {
    const urls = new Set();
    for (const item of state.items) {
        // Only same-origin bundled images are worth precaching (data: URIs are
        // already stored in the DB; remote ARASAAC images stay on-demand).
        if (typeof item.image === 'string' && item.image.startsWith('assets/')) {
            urls.add(item.image);
        }
        // Matching pre-recorded clip for single-word terms, if any.
        const clean = item.text.toLowerCase().trim()
            .replace(/\s+/g, '_')
            .normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (clean && !clean.includes('_')) {
            urls.add(`assets/audio/${clean}.mp3`);
        }
    }
    return [...urls];
}

function downloadAllForOffline() {
    const controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) {
        flashStatus('El modo sin conexión aún no está listo. Recarga e intenta de nuevo.');
        return;
    }
    const urls = collectOfflineAssetUrls();
    if (urls.length === 0) {
        flashStatus('No hay recursos para descargar');
        return;
    }
    if (dom.downloadProgress) dom.downloadProgress.classList.remove('hidden');
    if (dom.btnDownloadAll) dom.btnDownloadAll.disabled = true;
    updateDownloadProgress(0, urls.length);
    controller.postMessage({ type: 'PRECACHE_ALL', urls });
}

function updateDownloadProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (dom.downloadBarFill) dom.downloadBarFill.style.width = `${pct}%`;
    if (dom.downloadProgressText) dom.downloadProgressText.textContent = `${pct}%`;
}

function exportData() {
    const payload = {
        items: state.items,
        settings: state.settings,
        phrase: state.phrase,
        // Include the therapist's configuration so a backup fully restores it (P2-12).
        hiddenTags: [...state.tutorMode.hiddenTags],
        coreWords: state.coreWords,
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

    if (file.size > 5 * 1024 * 1024) {
        flashStatus('El archivo supera el límite de 5 MB');
        dom.importFile.value = '';
        return;
    }

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!parsed || !Array.isArray(parsed.items)) {
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

        // Restore the therapist's configuration too, if the backup carries it (P2-12).
        if (Array.isArray(parsed.hiddenTags)) {
            state.tutorMode.hiddenTags = new Set(parsed.hiddenTags.map(String));
            localStorage.setItem(LS_KEYS.hiddenTags, JSON.stringify([...state.tutorMode.hiddenTags]));
        }
        if (Array.isArray(parsed.coreWords)) {
            state.coreWords = parsed.coreWords.filter(id => state.items.some(i => i.id === id));
            saveCoreWords();
        } else {
            // Items changed; drop any core ids that no longer exist.
            initCoreWords();
        }

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

// Only allow images from trusted sources: bundled assets, inline data URIs or
// ARASAAC. Anything else (javascript:, external http, etc.) is dropped (P0-10).
function sanitizeImage(image) {
    if (typeof image !== 'string') return null;
    const value = image.trim();
    if (/^assets\//.test(value)) return value;
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(value)) return value;
    if (/^https:\/\/(static|api)\.arasaac\.org\//i.test(value)) return value;
    return null;
}

// Accept only a safe CSS colour token so it can't break out of an inline style.
function sanitizeColor(color) {
    if (typeof color !== 'string') return '#c6e6c8';
    const value = color.trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
    if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i.test(value)) return value;
    return '#c6e6c8';
}

// Relative luminance (0 dark … 1 light) of a hex colour, for contrast decisions.
function colorLuminance(hex) {
    let c = String(hex || '').trim().replace('#', '');
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    if (c.length < 6) return 1; // unknown → assume light
    const r = parseInt(c.slice(0, 2), 16) / 255;
    const g = parseInt(c.slice(2, 4), 16) / 255;
    const b = parseInt(c.slice(4, 6), 16) / 255;
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Pick readable ink for a tile painted on an arbitrary user colour, and expose it
// as --tile-ink so the elements sitting directly on that colour (grammar tag,
// placeholder letter) stay legible on both light and dark tiles (P1-18).
function applyReadableText(el, bgColor) {
    el.style.borderColor = bgColor;
    const ink = colorLuminance(bgColor) < 0.5 ? '#ffffff' : '#141218';
    el.style.setProperty('--tile-ink', ink);
    el.classList.toggle('tile-dark-bg', colorLuminance(bgColor) < 0.5);
}

function sanitizeItem(item) {
    return {
        id: String(item.id),
        text: String(item.text).slice(0, 80),
        category: String(item.category || 'Varios').slice(0, 40),
        color: sanitizeColor(item.color),
        image: sanitizeImage(item.image),
        pos: item.pos ? String(item.pos).slice(0, 8) : undefined,
        isFavorite: !!item.isFavorite
    };
}

async function replaceAllItems(items) {
    const sanitized = items
        .filter(item => item && item.id != null && item.text)
        .map(sanitizeItem);

    if (storageMode === 'local' || !db) {
        localStorage.setItem(LS_KEYS.items, JSON.stringify(sanitized));
        state.items = sanitized;
        return;
    }

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(`https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(query)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("No se encontraron resultados");

        const pictos = await response.json();
        renderArasaacResults(pictos);
    } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError';
        const msg = isTimeout ? 'Tiempo de espera agotado (8s)' : err.message;
        dom.arasaacResults.innerHTML = `<div class="loading-spinner">❌ ${msg}</div>`;
    }
}

function renderArasaacResults(pictos) {
    dom.arasaacResults.innerHTML = "";

    if (pictos.length === 0) {
        dom.arasaacResults.innerHTML = '<div class="loading-spinner">No se encontraron pictogramas.</div>';
        return;
    }

    pictos.slice(0, 30).forEach(picto => {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = 'arasaac-thumb';
        const imgUrl = `https://static.arasaac.org/pictograms/${picto._id}/${picto._id}_300.png`;
        const keyword = picto.keywords[0]?.keyword || 'Icono';

        // Build the thumbnail with the DOM API so an ARASAAC keyword can never be
        // interpreted as HTML (P0-10).
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = keyword;
        img.loading = 'lazy';
        thumb.appendChild(img);
        thumb.setAttribute('aria-label', `Seleccionar pictograma ${keyword}`);
        thumb.onclick = () => selectArasaacPictogram(picto._id, keyword);

        dom.arasaacResults.appendChild(thumb);
    });
}

async function selectArasaacPictogram(id, label) {
    const imgUrl = `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
    dom.preview.innerHTML = '<div class="loading-spinner">Preparando imagen...</div>';

    try {
        const dataUrl = await imageUrlToDataURL(imgUrl);
        state.pendingImage = dataUrl;
        setPreviewImage(dataUrl);
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

function showUpdateToast() {
    if (dom.updateToast) dom.updateToast.classList.remove('hidden');
}

function hideUpdateToast() {
    if (dom.updateToast) dom.updateToast.classList.add('hidden');
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


function updateSearchClearButton() {
    if (!dom.btnClearSearch || !dom.searchBox) return;
    const hasText = dom.searchBox.value.trim().length > 0;
    dom.btnClearSearch.classList.toggle('visible', hasText);
}

// Rendering
function render() {
    renderCoreRow();
    renderGrid();
    renderBreadcrumb(); // after the grid so it can report the visible word count
    renderPhrase();
    renderCategories();
    renderRoutine();
    renderCategoryToggles();
}

// Always-visible high-frequency vocabulary (N-2). Independent of the current
// category/search so the most common words are one tap away from anywhere.
function renderCoreRow() {
    if (!dom.coreRow) return;
    // Keep the region's heading; only the tiles are rebuilt.
    dom.coreRow.querySelectorAll('.tile').forEach(t => t.remove());
    const coreItems = state.coreWords
        .map(id => state.items.find(i => i.id === id))
        .filter(Boolean);

    if (coreItems.length === 0) {
        dom.coreRow.classList.add('hidden');
        return;
    }
    dom.coreRow.classList.remove('hidden');

    coreItems.forEach(item => {
        const tile = createTile(item, () => onTileClick(item), { core: true });
        dom.coreRow.appendChild(tile);
    });
}

// Breadcrumb / location title above the board so the user always knows where
// they are after navigating (N-8).
function renderBreadcrumb() {
    if (!dom.boardBreadcrumb) return;
    dom.boardBreadcrumb.textContent = '';
    const cat = state.currentCategory;
    // Same swatch as the category's pill and its cards, rather than an emoji.
    const icon = document.createElement('span');
    icon.className = 'breadcrumb-icon';
    icon.style.background = getCategoryColor(cat);
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'breadcrumb-label';
    if (cat === 'Todas') label.textContent = 'Todas las palabras';
    else if (cat === '⭐ Favoritos') label.textContent = 'Favoritos';
    else label.textContent = cat;
    dom.boardBreadcrumb.appendChild(icon);
    dom.boardBreadcrumb.appendChild(label);

    // Count of words currently shown, for orientation.
    const count = dom.grid ? dom.grid.querySelectorAll('.tile:not([data-id="nav-anchor"])').length : 0;
    if (count > 0) {
        const badge = document.createElement('span');
        badge.className = 'breadcrumb-count';
        badge.textContent = `${count}`;
        dom.boardBreadcrumb.appendChild(badge);
    }
    if (!state.tutorMode.active && state.tutorMode.hiddenTags.size > 0) {
        // `title` alone is a tooltip: no touch device shows it, and it is the
        // kind of thing that must not be the only copy of the message — this
        // badge is what tells a carer the board is filtered rather than empty.
        // The visible text carries it, and the count reads as words.
        const count = state.tutorMode.hiddenTags.size;
        const hiddenBadge = document.createElement('span');
        hiddenBadge.className = 'breadcrumb-count hidden-count';
        hiddenBadge.textContent = `${count} ${count === 1 ? 'oculta' : 'ocultas'}`;
        hiddenBadge.setAttribute('aria-label',
            `${count} ${count === 1 ? 'palabra filtrada' : 'palabras filtradas'} en Modo Tutor`);
        dom.boardBreadcrumb.appendChild(hiddenBadge);
    }
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
        const time = document.createElement('span');
        time.className = 'history-time';
        time.textContent = entry.date;
        const content = document.createElement('span');
        content.className = 'history-content';
        content.textContent = entry.content; // textContent: never interpret as HTML (P0-10)
        div.appendChild(time);
        div.appendChild(content);
        dom.historyList.appendChild(div);
    });
}

async function exportHistoryCSV() {
    const history = await getAllHistory();
    if (!history || history.length === 0) {
        flashStatus("No hay registros para exportar");
        return;
    }
    const headers = ["Fecha y Hora", "Timestamp", "Frase / Actividad"];
    const rows = history.map(entry => [
        `"${String(entry.date || '').replace(/"/g, '""')}"`,
        entry.timestamp || '',
        `"${String(entry.content || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `holaac-bitacora-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    flashStatus("Bitácora exportada (CSV local)");
}

// Navigate between the top-level board ("Todas") and a category, integrating with
// the browser history so the system Back button/gesture returns to "Todas"
// instead of closing the PWA (N-4).
let categoryHistoryPushed = false;

function goToCategory(cat) {
    state.currentPage = 0; // fresh category starts on page 1 (N-1)
    if (cat === 'Todas') {
        if (categoryHistoryPushed) {
            history.back(); // popstate resets the view — keeps the stack balanced
            return;
        }
        state.currentCategory = 'Todas';
    } else {
        if (!categoryHistoryPushed) {
            history.pushState({ holaac: 'category' }, '');
            categoryHistoryPushed = true;
        }
        state.currentCategory = cat;
    }
    render();
    scrollBoardToTop();
}

window.addEventListener('popstate', () => {
    categoryHistoryPushed = false;
    if (state.currentCategory !== 'Todas') {
        state.currentCategory = 'Todas';
        render();
        scrollBoardToTop();
    }
});

// Jump straight to the emergency board from anywhere, one tap (N-5). Switches to
// the SOS profile and the S.O.S category if present, else stays on the profile.
function goToSOS() {
    setBoardProfile('sos');
    const sosCat = getAllCategories().find(c => sameWord(c, 'S.O.S') || c === 'S.O.S');
    goToCategory(sosCat || 'Todas');
    haptic(20);
}

// Single source of truth for changing the board profile, keeping the header
// selector and the Settings selector in sync (N-5).
function setBoardProfile(profile) {
    state.settings.boardProfile = profile;
    state.currentPage = 0;
    if (dom.boardProfile) dom.boardProfile.value = profile;
    if (dom.headerProfile) dom.headerProfile.value = profile;
    save();
}

// A board profile is the single context mechanism: when one is chosen it owns
// which categories are visible, so the old "profile AND active-categories"
// double filter (a frequent source of "why can't I see this word?") no longer
// applies. "General" falls back to the user's active-categories (N-3).
function itemPassesContext(category) {
    const profileCats = PROFILE_CATEGORIES[state.settings.boardProfile];
    if (profileCats) return profileCats.includes(category);
    return isCategoryActive(category);
}

function getVisibleItems() {
    const isFav = state.currentCategory === "⭐ Favoritos";
    return state.items.filter(item => {
        const matchesCat = isFav
            ? item.isFavorite
            : (state.currentCategory === "Todas" || item.category === state.currentCategory);
        const matchesSearch = item.text.toLowerCase().includes(state.searchQuery) ||
            item.category.toLowerCase().includes(state.searchQuery);
        const matchesContext = itemPassesContext(item.category);
        const isHidden = state.tutorMode.hiddenTags.has(item.id);
        const hiddenOk = state.tutorMode.active || !isHidden;
        return matchesCat && matchesSearch && matchesContext && hiddenOk;
    }).sort(compareItems);
}

function makeNavAnchor() {
    const atHome = state.currentCategory === "Todas";
    return createTile({
        // No emoji in the label: the card draws the matching stroke icon (see
        // createTile), so the word does not have to carry a picture in it.
        text: atHome ? "Inicio" : "Volver",
        category: "Navegación",
        color: "#d7dce2",
        id: "nav-anchor"
    }, () => {
        if (!atHome) {
            goToCategory("Todas"); // routes through history so Back stays in sync (N-4)
        } else {
            scrollBoardToTop();
        }
    });
}

function renderEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'grid-empty glass-card';
    const p = document.createElement('p');
    // textContent so a crafted search string can't inject markup (P0-10).
    p.textContent = `No encontramos resultados para "${state.searchQuery || state.currentCategory}".`;
    const small = document.createElement('small');
    small.textContent = 'Prueba otra búsqueda o activa más categorías desde Ajustes.';
    empty.appendChild(p);
    empty.appendChild(small);
    return empty;
}

function appendItemTile(item) {
    const isHidden = state.tutorMode.hiddenTags.has(item.id);
    const tile = createTile(item, () => onTileClick(item));
    if (isHidden) tile.classList.add('hidden-by-tutor');
    dom.grid.appendChild(tile);
}

function renderGrid() {
    dom.grid.innerHTML = "";
    updateSearchClearButton();
    document.body.classList.toggle('paged-mode', !!state.settings.pagedMode);
    // Search results mix categories, so the per-tile category caption is worth
    // its clutter there; on a single-category board it is not (see .tile-cat).
    document.body.classList.toggle('is-searching', !!state.searchQuery);

    const items = getVisibleItems();

    if (state.settings.pagedMode) {
        renderPagedGrid(items);
    } else {
        // Classic scrolling board.
        dom.grid.appendChild(makeNavAnchor());
        if (items.length === 0) dom.grid.appendChild(renderEmptyState());
        items.forEach(appendItemTile);
        if (dom.pageControls) dom.pageControls.classList.add('hidden');
    }

    if (state.settings.scanningEnabled) startScanning();
    else stopScanning();
}

// How many columns currently fit, from the tile size and the grid's real width.
function computeGridColumns() {
    const width = dom.grid.clientWidth || window.innerWidth;
    const tile = state.settings.tileSize || 140;
    const gap = 14; // matches --grid-gap roughly
    return Math.max(1, Math.floor((width + gap) / (tile + gap)));
}

// Fixed-position pages with no vertical scroll (N-1). Each word keeps the same
// slot on its page, which is the basis of motor learning in AAC apps.
function renderPagedGrid(items) {
    const cols = computeGridColumns();
    // Rows that fit the viewport below the grid's top, so a page needs no scroll.
    const gridTop = dom.grid.getBoundingClientRect().top;
    const tile = state.settings.tileSize || 140;
    const gap = 14;
    const reserve = 96; // space for the page controls below
    const avail = Math.max(window.innerHeight - gridTop - reserve, tile + gap);
    const rows = Math.max(2, Math.floor((avail + gap) / (tile + gap)));

    // Reserve the first slot on every page for the nav anchor (stable position).
    const perPage = Math.max(1, cols * rows - 1);
    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    if (state.currentPage >= totalPages) state.currentPage = totalPages - 1;
    if (state.currentPage < 0) state.currentPage = 0;

    dom.grid.style.setProperty('--paged-cols', String(cols));
    dom.grid.appendChild(makeNavAnchor());

    if (items.length === 0) {
        dom.grid.appendChild(renderEmptyState());
    } else {
        const start = state.currentPage * perPage;
        items.slice(start, start + perPage).forEach(appendItemTile);
    }

    renderPageControls(totalPages);
}

function renderPageControls(totalPages) {
    if (!dom.pageControls) return;
    dom.pageControls.textContent = '';
    if (totalPages <= 1) {
        dom.pageControls.classList.add('hidden');
        return;
    }
    dom.pageControls.classList.remove('hidden');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'btn pill-nav page-prev';
    prev.appendChild(makeIcon('chevron-left'));
    prev.setAttribute('aria-label', 'Página anterior');
    prev.disabled = state.currentPage <= 0;
    prev.onclick = () => { state.currentPage -= 1; renderGrid(); renderBreadcrumb(); scrollBoardToTop(); };

    const label = document.createElement('span');
    label.className = 'page-indicator';
    label.textContent = `Página ${state.currentPage + 1} de ${totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'btn pill-nav page-next';
    next.appendChild(makeIcon('chevron-right'));
    next.setAttribute('aria-label', 'Página siguiente');
    next.disabled = state.currentPage >= totalPages - 1;
    next.onclick = () => { state.currentPage += 1; renderGrid(); renderBreadcrumb(); scrollBoardToTop(); };

    dom.pageControls.appendChild(prev);
    dom.pageControls.appendChild(label);
    dom.pageControls.appendChild(next);
}

// Stable, human-natural ordering: an explicit `order` field wins when present,
// otherwise ids are compared numerically so "lib-2" sorts before "lib-10"
// instead of after it (P1-6).
function compareItems(a, b) {
    const oa = Number.isFinite(a.order) ? a.order : Infinity;
    const ob = Number.isFinite(b.order) ? b.order : Infinity;
    if (oa !== ob) return oa - ob;
    return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
}

function createTile(item, onClick, opts = {}) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile glass-card' + (opts.core ? ' tile-core' : '');
    tile.setAttribute('data-id', item.id);
    tile.setAttribute('data-cat', item.category);
    tile.setAttribute('aria-label', `${item.text}. Categoría ${item.category}`);

    if (item.color) {
        tile.style.backgroundColor = item.color;
        applyReadableText(tile, item.color); // auto contrast (P1-18)
    }

    const isNav = item.id === "nav-anchor";

    // Favorite star lives only in Tutor/edit mode now: it was a 32px accidental
    // touch target in the communication view and the referents reserve favoriting
    // to edit mode (N-9). Everyday users manage favorites via the editor.
    if (!isNav && !opts.core && state.tutorMode.active) {
        const fav = document.createElement('button');
        fav.type = 'button';
        fav.className = `tile-fav ${item.isFavorite ? 'active' : 'inactive'}`;
        fav.textContent = item.isFavorite ? '⭐' : '☆';
        fav.setAttribute('aria-pressed', item.isFavorite ? 'true' : 'false');
        fav.setAttribute('aria-label', item.isFavorite ? `Quitar ${item.text} de favoritos` : `Añadir ${item.text} a favoritos`);
        fav.onclick = (e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
        };
        tile.appendChild(fav);
    }

    // Tutor mode: a pin control to add/remove a word from the fixed core row (N-2
    // "configurable desde el modo tutor").
    if (!isNav && state.tutorMode.active) {
        const pin = document.createElement('button');
        pin.type = 'button';
        const pinned = isCore(item.id);
        pin.className = `tile-core-pin ${pinned ? 'active' : ''}`;
        pin.textContent = pinned ? '📌' : '📍';
        pin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
        pin.setAttribute('aria-label', pinned ? `Quitar ${item.text} del núcleo` : `Fijar ${item.text} en el núcleo`);
        pin.onclick = (e) => {
            e.stopPropagation();
            toggleCore(item.id);
        };
        tile.appendChild(pin);
    }

    // Grammatical tag: a real part-of-speech code (V/S/A/So/O), not the category
    // initial, so the label is meaningful to a therapist (P1-9).
    if (!isNav) {
        const tag = document.createElement('div');
        tag.className = 'grammar-tag';
        tag.textContent = getPosLabel(item);
        tag.setAttribute('aria-hidden', 'true');
        tile.appendChild(tag);
    }

    const imgContainer = document.createElement('div');
    imgContainer.className = 'tile-img';

    if (isNav) {
        // The navigation card is chrome, not vocabulary: it gets the interface
        // icon set rather than a pictogram or the first-letter placeholder.
        imgContainer.appendChild(
            makeIcon(item.text === 'Inicio' ? 'home' : 'chevron-left', 'tile-nav-icon'));
    } else if (item.image) {
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
    const textSpan = document.createElement('span');
    textSpan.className = 'tile-text';
    textSpan.textContent = item.text; // textContent: user words are never HTML (P0-10)
    const catSpan = document.createElement('span');
    catSpan.className = 'tile-cat';
    catSpan.textContent = item.category;
    label.appendChild(textSpan);
    label.appendChild(catSpan);

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
    setAddItemMode('add');
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
        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.text;
            div.appendChild(img);
        } else {
            const q = document.createElement('span');
            q.textContent = '?';
            div.appendChild(q);
        }
        const label = document.createElement('span');
        label.textContent = item.text;
        div.appendChild(label);
        dom.routineItems.appendChild(div);
    });
}

function renderPhrase() {
    dom.chips.innerHTML = "";
    state.phrase.forEach((id, position) => {
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const chip = document.createElement('div');
        chip.className = 'chip';

        // The sentence bar carries the pictogram, not just the word. Someone who
        // cannot read has no way to check a text-only sentence before speaking
        // it, which is why every reference AAC app (Proloquo2Go, LetMeTalk,
        // Hablalo) shows the symbols in the sentence strip.
        if (item.image) {
            const img = document.createElement('img');
            img.className = 'chip-img';
            img.src = item.image;
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            chip.appendChild(img);
        }

        const word = document.createElement('span');
        word.className = 'chip-text';
        word.textContent = item.text;
        chip.appendChild(word);

        // A real <button>, so the word can be removed with a keyboard, a screen
        // reader or the scanning switch — a <span> was reachable by mouse only.
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove';
        remove.appendChild(makeIcon('close'));
        remove.setAttribute('aria-label', `Quitar «${item.text}» de la frase (palabra ${position + 1})`);
        // addEventListener instead of an inline handler so an item id can't be
        // interpolated into an executable string (P0-10).
        remove.addEventListener('click', (e) => {
            e.stopPropagation();
            removeChip(id);
        });
        chip.appendChild(remove);
        dom.chips.appendChild(chip);
    });

    updateComposerState();

    // Auto-scroll composer
    dom.chips.scrollLeft = dom.chips.scrollWidth;
}

// Controls that only make sense with words in the composer stay disabled until
// there are any, instead of offering dead buttons (and, for «Hablar Frase», a
// silent no-op that reads as "the app is broken").
function updateComposerState() {
    const empty = state.phrase.length === 0;
    [dom.btnSpeak, dom.btnBackspace, dom.btnClear].forEach(btn => {
        if (btn) btn.disabled = empty;
    });
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
    const cats = getAllCategories()
        .filter(cat => isCategoryActive(cat))
        .sort((a, b) => {
            const orderA = CATEGORY_METADATA[a]?.order ?? 999;
            const orderB = CATEGORY_METADATA[b]?.order ?? 999;
            return orderA - orderB;
        });
    dom.categoryBar.innerHTML = "";

    const hasFavs = state.items.some(i => i.isFavorite);
    const tabs = ["Todas"];
    if (hasFavs) tabs.push("⭐ Favoritos");
    tabs.push(...cats);

    tabs.forEach(cat => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `pill ${state.currentCategory === cat ? 'active' : ''}`;
        // A colour dot instead of the category emoji. The emoji were drawn by
        // the OS at a size and style nothing here controlled, and several of
        // them (🎯 for Acciones, 🤝 for Necesidad, 📦 for Objetos) named the
        // category no better than the word beside them already did. The dot
        // carries information the word cannot: it is the exact colour of that
        // category's cards, so the filter bar becomes a legend for the board
        // and reinforces the colour coding instead of competing with it.
        const dot = document.createElement('span');
        dot.className = 'pill-dot';
        dot.style.background = getCategoryColor(cat);
        dot.setAttribute('aria-hidden', 'true');
        pill.appendChild(dot);
        // textContent, never innerHTML: category names may be user data (P0-10)
        const pillLabel = document.createElement('span');
        pillLabel.textContent = (cat === "⭐ Favoritos" ? "Favoritos" : cat);
        pill.appendChild(pillLabel);
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', String(state.currentCategory === cat));
        pill.setAttribute('tabindex', state.currentCategory === cat ? '0' : '-1');
        pill.onclick = () => {
            // Routed through history so the system Back button returns here (N-4).
            goToCategory(cat);
        };
        pill.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pill.click();
                return;
            }
            handleTablistKeys(event);
        };
        dom.categoryBar.appendChild(pill);
    });

    // The strip is rebuilt at scrollLeft 0, so on a phone — where it shows about
    // one pill — every category past the first few repainted with the active one
    // off screen: the board changed and nothing visible said to what.
    const activePill = dom.categoryBar.querySelector('.pill.active');
    if (activePill) {
        activePill.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    updateCategoryNavState();
}

/* A roving-tabindex tablist puts `tabindex="-1"` on every tab but the selected
   one, which is correct only if the arrow keys then move between them. Without
   that half, every category except the active one was unreachable by keyboard
   or switch — 16 of 17 tabs, for the very users who depend on them most
   (WCAG 2.1.1 Keyboard, and the ARIA tabs pattern). */
function handleTablistKeys(event) {
    const KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!KEYS.includes(event.key)) return;

    const tabs = Array.from(dom.categoryBar.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;

    const current = tabs.indexOf(event.target);
    if (current < 0) return;

    let next;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else next = (current - 1 + tabs.length) % tabs.length;

    event.preventDefault();
    // Move focus only. Activation stays explicit (Enter/Space) so a switch user
    // sweeping the categories doesn't rebuild the board on every step.
    tabs[current].setAttribute('tabindex', '-1');
    tabs[next].setAttribute('tabindex', '0');
    tabs[next].focus();
    tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// The swatch shown on a category pill: the same colour its cards are painted
// with, so the filter bar doubles as the board's legend. "Todas" and
// "Favoritos" are not categories and get neutral ink instead of a hue.
function getCategoryColor(category) {
    if (category === "Todas" || category === "⭐ Favoritos") return 'var(--md-on-surface-variant)';
    const meta = CATEGORY_METADATA[category];
    return meta ? meta.color : '#d7dce2';
}

function showCategoryPicker() {
    const cats = getAllCategories()
        .sort((a, b) => {
            const orderA = CATEGORY_METADATA[a]?.order || 999;
            const orderB = CATEGORY_METADATA[b]?.order || 999;
            return orderA - orderB;
        });

    // Create modal dynamically
    const modal = document.createElement('dialog');
    modal.className = 'modal';
    modal.id = 'categoryPickerModal';

    const form = document.createElement('form');
    form.method = 'dialog';
    form.className = 'modal-card category-modal';

    const header = document.createElement('div');
    header.className = 'modal-head';
    header.innerHTML = `
        <div>
            <h1 class="modal-title">Selecciona una categoría</h1>
            <p class="modal-sub">Elige el tema para ver elementos relacionados</p>
        </div>
        <button type="button" class="btn-close" aria-label="Cerrar selector de categorías"><svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#i-close"/></svg></button>
    `;

    const body = document.createElement('div');
    body.className = 'modal-body';

    const grid = document.createElement('div');
    grid.className = 'category-picker-grid';

    cats.forEach(cat => {
        const meta = CATEGORY_METADATA[cat] || { color: "#d7dce2" };
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `category-card ${state.currentCategory === cat ? 'active' : ''}`;
        // The card is painted in the category's own colour rather than showing
        // an emoji on grey, so the picker is a legend for the board: what you
        // pick here is exactly what the cards will look like.
        card.style.backgroundColor = meta.color;
        applyReadableText(card, meta.color);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'category-name';
        nameSpan.textContent = cat; // category name may be user data (P0-10)
        card.appendChild(nameSpan);
        card.onclick = (e) => {
            e.preventDefault();
            modal.close();
            goToCategory(cat);
        };
        grid.appendChild(card);
    });

    body.appendChild(grid);
    form.appendChild(header);
    form.appendChild(body);
    modal.appendChild(form);
    document.body.appendChild(modal);

    // Restore focus to whatever opened the picker once it is dismissed (a11y).
    const opener = document.activeElement;
    modal.querySelector('.btn-close').onclick = () => modal.close();
    modal.addEventListener('close', () => {
        modal.remove();
        if (opener && typeof opener.focus === 'function') opener.focus();
    });
    modal.showModal();
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

    const categories = getAllCategories()
        .sort((a, b) => {
            const orderA = CATEGORY_METADATA[a]?.order || 999;
            const orderB = CATEGORY_METADATA[b]?.order || 999;
            return orderA - orderB;
        });

    containers.forEach(container => {
        container.innerHTML = '';
        categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'field-row category-toggle-item';

            const checked = isCategoryActive(category);
            if (checked) label.classList.add('is-active');

            const meta = CATEGORY_METADATA[category] || { color: "#d7dce2" };
            // Build via DOM so a user-defined category name can't inject markup
            // through the data-category attribute or the label text (P0-10).
            const wrapper = document.createElement('div');
            wrapper.className = 'toggle-wrapper';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.setAttribute('data-category', category);
            checkbox.setAttribute('aria-label', `Activar categoría ${category}`);
            checkbox.checked = checked;
            const slider = document.createElement('span');
            slider.className = 'toggle-slider';
            wrapper.appendChild(checkbox);
            wrapper.appendChild(slider);

            const textContent = document.createElement('div');
            textContent.className = 'text-content';
            const mainSpan = document.createElement('span');
            mainSpan.className = 'main';
            const dot = document.createElement('span');
            dot.className = 'pill-dot';
            dot.style.background = meta.color || '#d7dce2';
            dot.setAttribute('aria-hidden', 'true');
            mainSpan.appendChild(dot);
            mainSpan.appendChild(document.createTextNode(category));
            const stateText = document.createElement('span');
            stateText.className = 'sub state-text';
            stateText.textContent = checked ? 'Activa' : 'Inactiva';
            textContent.appendChild(mainSpan);
            textContent.appendChild(stateText);

            label.appendChild(wrapper);
            label.appendChild(textContent);

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
        // Whole row built via the DOM API: item text/category/id are user data and
        // must never reach innerHTML or an inline handler string (P0-10).
        const row = document.createElement('div');
        row.className = 'item-row';

        const info = document.createElement('div');
        info.className = 'item-info';
        const thumb = document.createElement('div');
        thumb.className = 'item-thumb';
        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.text;
            thumb.appendChild(img);
        } else {
            const ph = document.createElement('div');
            ph.style.cssText = 'width:100%; height:100%; background:var(--glass);';
            thumb.appendChild(ph);
        }

        const meta = document.createElement('div');
        meta.className = 'item-meta';
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex; align-items:center; gap:8px;';
        const h4 = document.createElement('h4');
        h4.textContent = item.text;
        const favToggle = document.createElement('span');
        favToggle.style.cssText = 'cursor:pointer; font-size:1.1rem';
        favToggle.textContent = item.isFavorite ? '⭐' : '☆';
        favToggle.setAttribute('role', 'button');
        favToggle.setAttribute('aria-label', item.isFavorite ? `Quitar ${item.text} de favoritos` : `Añadir ${item.text} a favoritos`);
        favToggle.addEventListener('click', () => toggleFavorite(item.id));
        titleRow.appendChild(h4);
        titleRow.appendChild(favToggle);
        const catP = document.createElement('p');
        catP.textContent = item.category;
        meta.appendChild(titleRow);
        meta.appendChild(catP);

        info.appendChild(thumb);
        info.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'item-actions';
        const editBtn = document.createElement('button');
        editBtn.className = 'btn glass secondary';
        editBtn.type = 'button';
        editBtn.textContent = 'Modificar';
        editBtn.addEventListener('click', () => editItem(item.id));
        const delBtn = document.createElement('button');
        delBtn.className = 'btn glass danger';
        delBtn.type = 'button';
        delBtn.textContent = 'Eliminar';
        delBtn.addEventListener('click', () => removeItem(item.id));
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);

        row.appendChild(info);
        row.appendChild(actions);
        dom.itemList.appendChild(row);
    });
}

window.toggleFavorite = async (id) => {
    const item = state.items.find(i => i.id === id);
    if (!item) return;
    item.isFavorite = !item.isFavorite;
    await saveItemDB(item);

    // If we just removed the last favorite while viewing the Favoritos tab, that
    // tab is about to vanish — fall back to "Todas" so the board isn't left
    // empty with no explanation (P1-7).
    if (state.currentCategory === "⭐ Favoritos" && !state.items.some(i => i.isFavorite)) {
        state.currentCategory = "Todas";
    }

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
    if (!window.speechSynthesis) {
        dom.voiceSelect.innerHTML = '<option value="">Síntesis de voz no disponible</option>';
        dom.voiceSelect.disabled = true;
        console.warn('⚠️ SpeechSynthesis not supported in this browser');
        return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
        console.warn('⚠️ No voices available yet, will retry...');
        return;
    }

    state.voices = voices;
    dom.voiceSelect.innerHTML = "";

    // Only show Spanish voices, sorted alphabetically
    const spanishVoices = voices
        .filter(v => v.lang.startsWith('es'))
        .sort((a, b) => a.name.localeCompare(b.name));

    if (spanishVoices.length === 0) {
        console.warn('⚠️ No Spanish voices found on this device');
        dom.voiceSelect.innerHTML = '<option value="">Sin voces en español disponibles</option>';
    }

    spanishVoices.forEach(voice => {
        const opt = document.createElement('option');
        opt.value = voice.voiceURI;
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.voiceURI === state.settings.voiceURI) opt.selected = true;
        dom.voiceSelect.appendChild(opt);
    });

    // Ensure at least one Spanish voice is selected, and persist the fallback so
    // it survives a reload (P2-12).
    if (dom.voiceSelect.selectedIndex === -1 && dom.voiceSelect.options.length > 0) {
        dom.voiceSelect.selectedIndex = 0;
        state.settings.voiceURI = dom.voiceSelect.options[0].value;
        save();
    }

    console.log(`✅ Loaded ${spanishVoices.length} Spanish voices (${voices.length} total)`);
}

// ── Scanning ──────────────────────────────────────────────────────────────
// Two strategies: classic linear scanning for the scrolling board, and
// row-column scanning over the visible page in paged mode (N-6). Row-column
// first highlights a whole row; the switch press descends into that row and
// then scans its cells — so a full sweep is O(rows+cols), not O(all tiles).

/* Scanning used to sweep `#grid` and nothing else, which made it a dead end:
   a switch user could pile words into the composer but could never reach
   «Hablar Frase» to say them, nor the fixed core row that holds the
   highest-frequency vocabulary. Scanning is now a two-level group sweep, the
   model AsTeRICS Grid and TD Snap use — first the region, then its contents:

     Nivel 1  Frase → Núcleo → Tablero        (the highlighted region pulses)
     Nivel 2  the chosen region's own sweep   (linear, or row-column on the
                                               paged board)

   A region that completes a full pass without a switch press returns to level
   1 on its own, so entering the wrong region is never a trap. */

const SCAN_GROUPS = [
    { id: 'composer', label: 'Frase', container: () => document.querySelector('.composer'),
      // Includes «Hablar Frase» — reaching it is the whole point of the group
      // level; only visible controls take part (Pausa/Detener appear while
      // speech is playing).
      items: () => Array.from(document.querySelectorAll('.composer .btn'))
          .filter(b => b.offsetParent !== null) },
    { id: 'core', label: 'Núcleo', container: () => dom.coreRow,
      items: () => Array.from(dom.coreRow ? dom.coreRow.querySelectorAll('.tile') : []) },
    { id: 'grid', label: 'Tablero', container: () => dom.grid,
      items: () => Array.from(dom.grid.querySelectorAll('.tile')) },
];

// Only regions that currently offer something to activate take part.
function activeScanGroups() {
    return SCAN_GROUPS.filter(g => {
        const c = g.container();
        if (!c || c.classList.contains('hidden') || c.offsetParent === null) return false;
        return g.items().some(el => !el.disabled);
    });
}

function currentGroup() {
    const groups = activeScanGroups();
    if (groups.length === 0) return null;
    return groups[Math.min(state.scanning.group || 0, groups.length - 1)];
}

function scanTiles() {
    const g = currentGroup();
    return g ? g.items().filter(el => !el.disabled) : [];
}

function getRowTiles(row) {
    const tiles = scanTiles();
    const c = Math.max(1, state.scanning.cols);
    return tiles.slice(row * c, (row + 1) * c);
}

function clearScanHighlights() {
    document.querySelectorAll('.scanning-focus, .scanning-row').forEach(
        t => t.classList.remove('scanning-focus', 'scanning-row'));
    document.querySelectorAll('.scanning-group').forEach(
        c => c.classList.remove('scanning-group'));
}

function highlightGroup() {
    clearScanHighlights();
    const groups = activeScanGroups();
    if (groups.length === 0) return;
    const g = groups[state.scanning.group % groups.length];
    const c = g.container();
    if (c) c.classList.add('scanning-group');
    announceScan(`${g.label}. Pulsa para entrar.`);
}

function highlightRow(row) {
    clearScanHighlights();
    getRowTiles(row).forEach(t => t.classList.add('scanning-row'));
}

function highlightCell() {
    clearScanHighlights();
    const cell = getRowTiles(state.scanning.row)[state.scanning.col];
    if (cell) cell.classList.add('scanning-focus');
}

function highlightTile(tile) {
    if (!tile) return;
    tile.classList.add('scanning-focus');
    // `nearest` keeps the sticky composer and core row in place instead of
    // yanking the whole page on every step.
    tile.scrollIntoView({ behavior: PREFERS_REDUCED_MOTION.matches ? 'auto' : 'smooth', block: 'nearest' });
}

function announceScan(text) {
    if (dom.statusText) dom.statusText.textContent = text;
}

function scanStepMs() {
    return Math.round((state.settings.scanSpeed || 2) * 1000);
}

// Level 1: sweep the regions.
function startGroupScanning() {
    clearInterval(state.scanning.timer);
    const groups = activeScanGroups();
    if (groups.length === 0) return;
    state.scanning.active = true;
    state.scanning.phase = 'group';
    state.scanning.group = state.scanning.group % groups.length;
    highlightGroup();
    state.scanning.timer = setInterval(() => {
        const g = activeScanGroups();
        if (g.length === 0) return;
        state.scanning.group = (state.scanning.group + 1) % g.length;
        highlightGroup();
    }, scanStepMs());
}

// Level 2: sweep inside the chosen region.
function startItemScanning() {
    clearInterval(state.scanning.timer);
    const tiles = scanTiles();
    if (tiles.length === 0) return startGroupScanning();

    const group = currentGroup();
    const stepMs = scanStepMs();
    // Row-column only pays off on the paged board; the composer and the core
    // row are single rows where it would just add a pointless extra press.
    const useRowColumn = group.id === 'grid' && state.settings.pagedMode;

    if (useRowColumn) {
        const cols = computeGridColumns();
        state.scanning.cols = cols;
        state.scanning.rows = Math.ceil(tiles.length / cols);
        state.scanning.phase = 'row';
        state.scanning.row = 0;
        state.scanning.col = 0;
        state.scanning.passes = 0;
        highlightRow(0);
        state.scanning.timer = setInterval(() => {
            if (state.scanning.phase === 'row') {
                state.scanning.row = (state.scanning.row + 1) % state.scanning.rows;
                if (state.scanning.row === 0 && ++state.scanning.passes >= 2) return startGroupScanning();
                highlightRow(state.scanning.row);
            } else {
                const rowTiles = getRowTiles(state.scanning.row);
                if (rowTiles.length === 0) return;
                state.scanning.col = (state.scanning.col + 1) % rowTiles.length;
                if (state.scanning.col === 0) { state.scanning.phase = 'row'; return highlightRow(state.scanning.row); }
                highlightCell();
            }
        }, stepMs);
        return;
    }

    state.scanning.phase = 'linear';
    state.scanning.index = 0;
    state.scanning.passes = 0;
    clearScanHighlights();
    highlightTile(tiles[0]);
    state.scanning.timer = setInterval(() => {
        const list = scanTiles();
        if (list.length === 0) return startGroupScanning();
        state.scanning.index = (state.scanning.index + 1) % list.length;
        // Back at the start after a full pass: hand control back to level 1 so
        // the user is never stuck cycling a region they entered by mistake.
        if (state.scanning.index === 0 && ++state.scanning.passes >= 1) return startGroupScanning();
        clearScanHighlights();
        highlightTile(list[state.scanning.index]);
    }, stepMs);
}

function startScanning() {
    stopScanning();
    state.scanning.group = 0;
    startGroupScanning();
}

function stopScanning() {
    clearInterval(state.scanning.timer);
    state.scanning.active = false;
    state.scanning.index = -1;
    state.scanning.phase = 'group';
    state.scanning.group = 0;
    state.scanning.passes = 0;
    clearScanHighlights();
}

function selectScanningElement() {
    if (!state.scanning.active) return;

    // Level 1 → descend into the highlighted region.
    if (state.scanning.phase === 'group') {
        startItemScanning();
        return;
    }

    if (state.scanning.phase === 'linear') {
        const cell = scanTiles()[state.scanning.index];
        if (cell) cell.click();
        // Back to region level: after speaking or picking a word the next choice
        // is usually in a different region.
        if (state.scanning.active) startGroupScanning();
        return;
    }

    if (state.scanning.phase === 'row') {
        // Descend into the highlighted row and start scanning its cells.
        state.scanning.phase = 'cell';
        state.scanning.col = 0;
        highlightCell();
        return;
    }

    // phase === 'cell': activate the highlighted cell.
    const cell = getRowTiles(state.scanning.row)[state.scanning.col];
    if (cell) cell.click();
    if (state.scanning.active) startGroupScanning();
}

function applySettings() {
    document.documentElement.style.setProperty('--tile-size', `${state.settings.tileSize}px`);
    dom.rate.value = state.settings.rate;
    dom.tileSize.value = state.settings.tileSize;
    dom.tapMode.value = state.settings.tapMode;
    dom.lockEdit.checked = state.settings.lockEdit;
    dom.scanningEnabled.checked = state.settings.scanningEnabled || false;
    if (dom.pagedMode) dom.pagedMode.checked = state.settings.pagedMode || false;
    if (dom.scanSpeed) {
        const sp = state.settings.scanSpeed || 2;
        dom.scanSpeed.value = sp;
        if (dom.scanSpeedValue) dom.scanSpeedValue.textContent = Number(sp).toFixed(1);
    }

    // Professional Features
    dom.showRoutine.checked = state.settings.showRoutine || false;
    dom.boardProfile.value = state.settings.boardProfile || "default";
    if (dom.headerProfile) dom.headerProfile.value = state.settings.boardProfile || "default";
    dom.routineBar.classList.toggle('hidden', !state.settings.showRoutine);
    updateCategoryNavState();

    // Phase 7: Accessibility & Speech
    dom.showGrammarTags.checked = state.settings.showGrammarTags || false;
    dom.speechMode.value = state.settings.speechMode || 'fluent';
    dom.darkMode.checked = state.settings.darkMode || false;
    if (dom.hapticFeedback) dom.hapticFeedback.checked = state.settings.hapticFeedback !== false;
    if (dom.calmMode) dom.calmMode.checked = state.settings.calmMode || false;
    dom.headerSpeakToggle.checked = (state.settings.tapMode === 'speak');
    ensureActiveCategories();
    document.body.classList.toggle('show-grammar', state.settings.showGrammarTags);
    document.body.classList.toggle('dark-theme', state.settings.darkMode);
    document.body.classList.toggle('calm-mode', state.settings.calmMode);
    updateThemeToggleIcon();
    updateThemeColorMeta();

    if (!localStorage.getItem(LS_KEYS.introSeen)) {
        dom.introModal.showModal();
    }
}

// Last-ditch guard: if anything in init() throws before we render, surface a
// clear message instead of leaving the user stuck on "Cargando..." (P0-1).
init().catch((err) => {
    console.error('Fallo crítico al iniciar la app:', err);
    const status = document.getElementById('statusText');
    if (status) status.textContent = 'Ocurrió un error al iniciar. Recarga la página.';
});
