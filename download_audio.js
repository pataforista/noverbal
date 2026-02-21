const fs = require('fs');
const path = require('path');
const https = require('https');

// We use a clean approach to download TTS audio files for the local library
// This provides studio-quality, offline audio.
const DIRECTORY_AUDIO = path.join(__dirname, 'assets', 'audio');

if (!fs.existsSync(DIRECTORY_AUDIO)) {
    fs.mkdirSync(DIRECTORY_AUDIO, { recursive: true });
}

// Using a free Google TTS endpoint for this script (common practice for dev assets)
const downloadAudio = (text, lang = 'es') => {
    const cleanName = text.toLowerCase().trim()
        .replace(/\s+/g, '_')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const filePath = path.join(DIRECTORY_AUDIO, `${cleanName}.mp3`);

    if (fs.existsSync(filePath)) {
        console.log(`⏩ Audio exists: ${text}`);
        return;
    }

    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

    return new Promise((resolve) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log(`🎵 Saved audio: ${text}`);
                    resolve();
                });
            });
        }).on('error', (err) => {
            console.error(`❌ Error audio ${text}:`, err.message);
            fs.unlink(filePath, () => resolve());
        });
    });
};

const vocabulario = [
    "sí", "no", "hola", "adiós", "por favor", "gracias", "ayuda", "esperar", "parar", "ahora",
    "yo", "tú", "mamá", "papá", "familia", "persona segura",
    "querer", "comer", "beber", "dormir", "jugar", "respirar",
    "feliz", "triste", "enojado", "dolor", "ansiedad",
    "síntoma", "receta", "diagnóstico",
    "pánico", "abrumado", "crisis",
    "amor", "abrazo", "cariño", "confianza",
    "odio", "rechazo", "injusto",
    "ruido", "suave", "olor",
    "emergencia", "peligro", "ambulancia"
];

const main = async () => {
    console.log("🚀 Starting Offline TTS Asset Download...");
    for (const palabra of vocabulario) {
        await downloadAudio(palabra);
        await new Promise(r => setTimeout(r, 300)); // Polite delay
    }
    console.log("✨ All audio assets downloaded to assets/audio/");
};

main();
