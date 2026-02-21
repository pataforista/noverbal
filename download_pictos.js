const fs = require('fs');
const path = require('path');
const https = require('https');

// Folder where the local library will be stored
const DIRECTORY_LOCAL = path.join(__dirname, 'assets', 'pictos');

// Create folder if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'assets'))) {
    fs.mkdirSync(path.join(__dirname, 'assets'));
}
if (!fs.existsSync(DIRECTORY_LOCAL)) {
    fs.mkdirSync(DIRECTORY_LOCAL);
}

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

const descargarPictograma = async (palabra) => {
    try {
        const cleanName = palabra.toLowerCase().trim()
            .replace(/\s+/g, '_')
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const fileName = `${cleanName}.png`;
        const filePath = path.join(DIRECTORY_LOCAL, fileName);

        // Skip if already exists
        if (fs.existsSync(filePath)) {
            console.log(`⏩ Skipping: ${palabra} (already exists)`);
            return `assets/pictos/${fileName}`;
        }

        console.log(`🔍 Searching: ${palabra}...`);
        const searchUrl = `https://api.arasaac.org/api/pictograms/es/search/${encodeURIComponent(palabra)}`;

        const response = await new Promise((resolve, reject) => {
            https.get(searchUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve([]); }
                });
            }).on('error', reject);
        });

        if (response && response.length > 0) {
            const idPicto = response[0]._id;
            const urlImagen = `https://static.arasaac.org/pictograms/${idPicto}/${idPicto}_300.png`;

            await downloadFile(urlImagen, filePath);
            console.log(`✅ Success! Saved to: ${filePath}`);
            return `assets/pictos/${fileName}`;
        } else {
            console.log(`⚠️ No pictogram found for: "${palabra}"`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error processing "${palabra}":`, error.message);
        return null;
    }
};

const vocabulario = [
    // SOCIALES Y CONTROL
    "sí", "no", "hola", "adiós", "por favor", "gracias", "bien", "mal", "más", "acabado",
    "ayuda", "esperar", "parar", "ahora", "después", "igual", "diferente", "conmigo", "solo",

    // PRONOMBRES Y PERSONAS
    "yo", "tú", "él", "ella", "nosotros", "ellos", "mío", "tuyo",
    "mamá", "papá", "hermano", "hermana", "abuelo", "abuela", "familia",
    "amigo", "profesor", "doctor", "enfermera", "policía",

    // VERBOS NÚCLEO
    "querer", "tener", "hacer", "ir", "venir", "comer", "beber", "dormir",
    "jugar", "mirar", "escuchar", "hablar", "dar", "tomar", "poner", "quitar",
    "abrir", "cerrar", "necesitar", "gustar", "pensar", "saber", "sentir",
    "caminar", "correr", "caer", "llorar", "reír", "buscar", "encontrar",

    // ESTADOS FÍSICOS Y EMOCIONALES
    "feliz", "triste", "enojado", "asustado", "sorprendido", "aburrido", "tranquilo",
    "cansado", "enfermo", "dolor", "hambre", "sed", "frío", "calor", "mareo",
    "cómodo", "incómodo", "picor", "sueño",

    // DESCRIPTIVOS
    "grande", "pequeño", "bueno", "malo", "bonito", "feo", "limpio", "sucio",
    "rápido", "lento", "fuerte", "débil", "nuevo", "viejo", "lleno", "vacío",
    "mucho", "poco", "todo", "nada",

    // LUGARES
    "casa", "escuela", "baño", "habitación", "cama", "cocina", "sala",
    "calle", "parque", "hospital", "clínica", "tienda", "coche", "autobús",
    "arriba", "abajo", "dentro", "fuera", "aquí", "allí", "cerca", "lejos",

    // OBJETOS COTIDIANOS
    "agua", "comida", "ropa", "zapato", "abrigo", "pantalón", "camisa",
    "juguete", "pelota", "libro", "teléfono", "televisión", "computadora",
    "tablet", "silla", "mesa", "puerta", "ventana", "luz", "basura",

    // SALUD Y CUERPO HUMANO
    "cabeza", "ojo", "oreja", "boca", "nariz", "mano", "pie", "estómago",
    "brazo", "pierna", "espalda", "diente", "sangre", "medicina", "pastilla",
    "inyección", "venda", "curita",

    // COMIDA BÁSICA
    "pan", "leche", "carne", "pollo", "pescado", "fruta", "manzana",
    "plátano", "verdura", "sopa", "dulce", "galleta", "jugo", "queso",

    // TIEMPO Y RUTINA
    "hoy", "mañana", "ayer", "día", "noche", "tarde",
    "desayuno", "almuerzo", "cena", "siesta", "ducha", "vestirse",

    // CONSULTA MÉDICA
    "síntoma", "temperatura", "peso", "presión", "receta", "estudio", "análisis",
    "revisión", "curar", "mejorar", "empeorar", "diagnóstico", "laboratorio",

    // SALUD MENTAL
    "ansiedad", "depresión", "angustia", "alucinación", "terapia", "psiquiatra",
    "psicólogo", "crisis", "calma", "respirar", "pensamiento", "emoción",
    "insomnio", "ánimo", "dosis", "efecto", "nervioso", "estrés", "confundido",

    // PASATIEMPOS Y ARTE
    "cocinar", "hornear", "pintar", "dibujar", "música", "meditar", "paz",
    "naturaleza", "aprender", "historia", "escribir",

    // JUEGOS Y DEPORTES
    "videojuego", "consola", "control", "pantalla", "ganar", "perder", "divertido",
    "raqueta", "cancha", "entrenar", "competir", "equipo", "animación", "película",

    // MASCOTAS
    "perro", "mascota", "pasear", "ladrar", "correa", "premio", "acariciar", "morder", "veterinario",

    // ANSIEDAD PROFUNDA
    "pánico", "abrumado", "taquicardia", "sudor", "temblor", "bloqueo", "irreal",
    "voces", "obsesión", "tic", "multitud", "encerrado", "sofocado",
    "frustración", "culpa", "desesperación",

    // SENSORIAL
    "ruido", "silencio", "oscuro", "brillante", "suave", "áspero", "apretado",
    "olor", "asco", "textura", "rascar", "tela", "cosquillas", "pesado",

    // SABORES
    "salado", "amargo", "ácido", "picante", "caliente", "sabroso",
    "quemado", "seco", "jugoso", "café", "té", "papas", "tamal", "mole", "concentrado",

    // PERSONAS SEGURAS
    "persona segura", "acompañante", "cuidador", "tutor", "guía", "aliado", "vecino", "residente", "estudiante",

    // SEGURIDAD
    "peligro", "emergencia", "fuego", "ambulancia", "accidente", "robar", "escapar", "esconder",

    // HIGIENE
    "papel", "toalla", "cepillo", "menstruación", "privado", "desodorante", "íntimo", "limpiar",

    // EXTRA
    "squash", "acción", "animado", "magia", "aventura",

    // VÍNCULOS Y AFECTO
    "amor", "enamorar", "cariño", "abrazo", "beso", "pertenencia", "empatía",
    "gratitud", "esperanza", "confianza", "orgullo", "admiración", "ternura",

    // RECHAZO Y CONFLICTO
    "odio", "desprecio", "envidia", "celos", "resentimiento",
    "traición", "venganza", "rechazo", "enemigo", "injusto", "ofendido",

    // EMOCIONES COMPLEJAS
    "vergüenza", "decepción", "alivio", "apatía", "euforia", "melancolía",
    "soledad", "incomprendido", "vacío", "serenidad", "nostalgia", "arrepentimiento",
    "duda", "intriga", "vulnerable", "inspirado"
];

const armarBiblioteca = async () => {
    // Unique items only
    const uniqueVocab = [...new Set(vocabulario)];
    console.log(`🚀 Starting expansive library download (~${uniqueVocab.length} items)...`);
    for (const palabra of uniqueVocab) {
        await descargarPictograma(palabra);
        // Be polite to the network
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("✨ Expansive local library expansion completed!");
};

armarBiblioteca();
