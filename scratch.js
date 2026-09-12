// --- Explorador de Síntomas Psiquiátricos ---
const PSYCH_SYMPTOMS_CATEGORIES = {
    cog: [
        { id: 'psych-cog-1', text: 'Voces', category: 'Mente+', img: 'assets/pictos/voces.png' },
        { id: 'psych-cog-2', text: 'Pensamiento rápido', category: 'Mente+', img: 'assets/pictos/pensamiento.png' },
        { id: 'psych-cog-3', text: 'Obsesión', category: 'Mente+', img: 'assets/pictos/obsesion.png' },
        { id: 'psych-cog-4', text: 'Confusión', category: 'Mente+', img: 'assets/pictos/duda.png' },
        { id: 'psych-cog-5', text: 'Miedo / Sospecha', category: 'Mente+', img: 'assets/pictos/asustado.png' },
        { id: 'psych-cog-6', text: 'Ganas de hacerme daño', category: 'Mente+', img: 'assets/pictos/dolor.png' },
        { id: 'psych-cog-7', text: 'Olvidos', category: 'Mente+', img: 'assets/pictos/cabeza.png' },
        { id: 'psych-cog-8', text: 'Pesadillas', category: 'Mente+', img: 'assets/pictos/insomnio.png' }
    ],
    aff: [
        { id: 'psych-aff-1', text: 'Angustia', category: 'Emociones', img: 'assets/pictos/abrumado.png' },
        { id: 'psych-aff-2', text: 'Tristeza', category: 'Emociones', img: 'assets/pictos/triste.png' },
        { id: 'psych-aff-3', text: 'Ganas de llorar', category: 'Emociones', img: 'assets/pictos/triste.png' },
        { id: 'psych-aff-4', text: 'Sin energía', category: 'Emociones', img: 'assets/pictos/depresion.png' },
        { id: 'psych-aff-5', text: 'Ansiedad', category: 'Emociones', img: 'assets/pictos/nervioso.png' },
        { id: 'psych-aff-6', text: 'Pánico', category: 'Emociones', img: 'assets/pictos/asustado.png' },
        { id: 'psych-aff-7', text: 'Irritabilidad', category: 'Emociones', img: 'assets/pictos/odio.png' },
        { id: 'psych-aff-8', text: 'Soledad', category: 'Emociones', img: 'assets/pictos/culpa.png' }
    ],
    som: [
        { id: 'psych-som-1', text: 'Opresión en pecho', category: 'Salud', img: 'assets/pictos/dolor.png' },
        { id: 'psych-som-2', text: 'Taquicardia', category: 'Salud', img: 'assets/pictos/taquicardia.png' },
        { id: 'psych-som-3', text: 'Temblor', category: 'Salud', img: 'assets/pictos/temblor.png' },
        { id: 'psych-som-4', text: 'Insomnio', category: 'Salud', img: 'assets/pictos/insomnio.png' },
        { id: 'psych-som-5', text: 'Mucho sueño', category: 'Salud', img: 'assets/pictos/enfermo.png' },
        { id: 'psych-som-6', text: 'Mareo', category: 'Salud', img: 'assets/pictos/mareo.png' },
        { id: 'psych-som-7', text: 'Dolor de cabeza', category: 'Salud', img: 'assets/pictos/cabeza.png' },
        { id: 'psych-som-8', text: 'Inquietud', category: 'Salud', img: 'assets/pictos/nervioso.png' }
    ]
};

async function ensurePsychItemsPresent() {
    for (const dim in PSYCH_SYMPTOMS_CATEGORIES) {
        for (const item of PSYCH_SYMPTOMS_CATEGORIES[dim]) {
            if (state.items.some(existing => existing.id === item.id)) continue;
            const newItem = { id: item.id, text: item.text, category: item.category, image: item.img };
            await saveItemDB(newItem);
            state.items.push(newItem);
        }
    }
}

let activePsychSymptom = null;

function renderPsychSymptoms(dim = 'cog') {
    const grid = document.getElementById('psychSymptomsGrid');
    if (!grid) return;
    
    document.querySelectorAll('.psych-tab').forEach(t => {
        const isActive = t.dataset.dim === dim;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive);
    });

    grid.innerHTML = '';
    const items = PSYCH_SYMPTOMS_CATEGORIES[dim] || [];
    
    items.forEach(item => {
        const stored = state.items.find(x => x.id === item.id) || item;
        const btn = document.createElement('div');
        btn.className = 'psych-symptom-card';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        
        const img = document.createElement('img');
        img.src = stored.image || item.img;
        img.alt = '';
        
        const span = document.createElement('span');
        span.textContent = stored.text;
        
        btn.appendChild(img);
        btn.appendChild(span);
        
        btn.addEventListener('click', () => {
            activePsychSymptom = stored;
            showPsychFrequency(stored);
        });
        
        grid.appendChild(btn);
    });
}

function showPsychFrequency(symptom) {
    const panel = document.getElementById('psychFreqPanel');
    const prompt = document.getElementById('psychFreqPrompt');
    if (!panel || !prompt) return;
    
    document.getElementById('psychSymptomsGrid').classList.add('hidden');
    prompt.textContent = "¿Qué tanto sientes: " + symptom.text + "?";
    panel.classList.remove('hidden');
}

function hidePsychFrequency() {
    const panel = document.getElementById('psychFreqPanel');
    if (panel) panel.classList.add('hidden');
    const grid = document.getElementById('psychSymptomsGrid');
    if (grid) grid.classList.remove('hidden');
    activePsychSymptom = null;
}

function initPsychModal() {
    const btnOpen = document.getElementById('btnConsultaPsychSymptoms');
    const modal = document.getElementById('psychSymptomsModal');
    if (btnOpen && modal) {
        btnOpen.addEventListener('click', () => {
            renderPsychSymptoms('cog');
            hidePsychFrequency();
            modal.showModal();
        });
    }
    
    document.querySelectorAll('.psych-tab').forEach(t => {
        t.addEventListener('click', () => {
            if (activePsychSymptom) hidePsychFrequency();
            renderPsychSymptoms(t.dataset.dim);
        });
    });
    
    const btnCancel = document.getElementById('btnPsychFreqCancel');
    if (btnCancel) btnCancel.addEventListener('click', hidePsychFrequency);
    
    document.querySelectorAll('.psych-freq-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!activePsychSymptom) return;
            const freqText = btn.textContent;
            
            const sentence = "Siento: " + activePsychSymptom.text + " (" + freqText + ")";
            if (consultaSession) {
                const arr = sentence.split(/\s+/);
                consultaSession.words += arr.length;
                arr.forEach(w => {
                    const clean = w.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
                    if (clean) consultaSession.wordCounts.set(clean, (consultaSession.wordCounts.get(clean) || 0) + 1);
                });
                renderConsulta();
            }
            logActivity("Síntoma reportado: " + activePsychSymptom.text + " - " + freqText);
            
            hidePsychFrequency();
            if (modal) modal.close();
            flashStatus("Guardado: " + activePsychSymptom.text, 'i-check');
            
            performSpeak(sentence, { log: false }); 
        });
    });
}
// Init immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPsychModal);
} else {
    initPsychModal();
}
