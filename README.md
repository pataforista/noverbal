# HolAAC!

**Tablero de Comunicación Aumentativa y Alternativa (SAAC/AAC)** — gratuito,
*offline-first* y sin cuentas. Diseñado para personas con autismo, afasia,
parálisis cerebral y otras necesidades de comunicación, y para los profesionales
(fonoaudiología, terapia ocupacional, psiquiatría) y familias que los acompañan.

> ⚕️ **Herramienta de apoyo, no dispositivo médico.** HolAAC! no reemplaza la
> evaluación ni el tratamiento por profesionales de salud. Consulte siempre a un
> especialista.

## Características

- **Comunicación por pictogramas.** Toca palabras para componer una frase y
  escúchala con voz en español (audio pregrabado local + síntesis de voz TTS).
- **Hablar al tocar.** Cada palabra suena apenas se toca, o se acumula en el
  compositor de frase — configurable.
- **Escritura libre.** Teclado para escribir y leer cualquier texto.
- **Fila de vocabulario nuclear fija.** Las palabras de alta frecuencia (Sí, No,
  Ayuda, Querer, Más, Parar, Baño, Dolor) están siempre visibles.
- **Categorías, perfiles y favoritos.** Perfiles de contexto (Casa, Escuela,
  Emergencias/SOS) accesibles a un toque, con botón SOS siempre a mano.
- **Accesibilidad.** Modo de barrido (*scanning*) fila-columna para acceso por
  conmutador, feedback háptico y visual, contraste automático de texto, tema
  claro/oscuro que respeta el sistema, y respeto por `prefers-reduced-motion`.
- **Localizador visual de dolor.** Botón «Dolor» en la barra superior: señalar
  la zona del cuerpo y la intensidad (escala de caras) en dos toques, sin leer
  ni buscar la palabra en el tablero — pensado para personas sordas y
  analfabetas que no usan lengua de señas y se comunican señalando.
- **Confirmación visual antes de hablar.** Ajuste opcional que repite la frase
  armada en pictos grandes y espera un Sí/No antes de reproducirla, para que
  alguien que no puede escuchar lo que compuso tenga una forma de detectar un
  toque equivocado antes de que llegue a un médico o cuidador.
- **Modo Sordo.** Un botón («Sordo» en la barra superior, o el mismo ajuste
  en Ajustes) que quita el texto del tablero y de la frase para quien se
  comunica — quedan solo los pictogramas y el color de su categoría — y
  activa junto con eso la confirmación visual, una pulsación sostenida de
  1.5s (en vez de un toque) para responder el Sí/No, y un aviso de vibración
  + destello de pantalla al enviar la frase. El resto de la app (Ajustes,
  editor) no cambia, así que sigue sirviendo igual para TEA, afasia u otras
  necesidades sin este modo activado.
- **Modo Tutor (terapeuta).** Oculta/muestra elementos por sesión, protegido por
  un PIN configurable.
- **Bitácora clínica local.** Registro privado de actividad, almacenado solo en
  el dispositivo.
- **PWA offline-first.** Instalable, funciona sin conexión y sin enviar datos a
  ningún servidor.
- **Privacidad.** Todos los datos (tableros, configuración, historial) viven
  únicamente en el dispositivo (IndexedDB / localStorage).

## Uso

Es una aplicación web estática: no requiere compilación ni backend.

1. Abre `index.html` servido desde cualquier servidor web estático.
2. En la primera visita elige qué categorías estarán activas.
3. Toca palabras para formar frases y pulsa **«Hablar Frase»**.
4. Para añadir tus propias palabras y fotos (objetos de la casa, personas,
   juguetes…), pulsa el botón **«Agregar»** de la barra superior: escribe la
   palabra, sube la foto desde el dispositivo o búscala en ARASAAC, y pulsa
   **«Añadir al tablero»**.

### Ejecutar en local

Al usar módulos ES, un Service Worker y `fetch('library.json')`, hay que servir
los archivos por HTTP (abrir `file://` directamente no funciona):

```bash
# Con Python
python3 -m http.server 8000
# o con Node
npx serve .
```

Luego visita <http://localhost:8000>. En Windows también existe `start.bat`.

## Despliegue

Cualquier hosting de estáticos sirve (GitHub Pages, Netlify, Cloudflare Pages…).
Publica el contenido del repositorio tal cual. El Service Worker
(`service-worker.js`) cachea el *app shell* para uso sin conexión; su versión se
sella automáticamente con el hash del commit en el despliegue de GitHub Actions
(ver `.github/workflows/`), así los usuarios reciben cada actualización sin
intervención manual.

## Estructura del proyecto

```
index.html          Estructura de la app (una sola página)
styles.css          Estilos (Material Design 3, temas claro/oscuro)
app.js              Lógica de la aplicación
library.json        Biblioteca curada de pictogramas (~320 términos)
manifest.json       Manifiesto PWA
service-worker.js   Cacheo offline (precache del shell + assets bajo demanda)
assets/
  pictos/           Imágenes de pictogramas (ARASAAC)
  audio/            Clips de audio pregrabados
  fonts/            Fuente autoalojada (Plus Jakarta Sans)
icons/              Iconos de la app / favicons
tools/              Scripts de mantenimiento (descarga de pictos y audio)
docs/               Diagnóstico y plan de mejora
tests/              Smoke tests (Playwright)
```

## Desarrollo y calidad

```bash
npm install          # instala devDependencies (ESLint, Playwright)
npm run lint         # ESLint
npm test             # smoke tests (Playwright + Chromium)
```

Los scripts de `tools/` (`download_pictos.js`, `download_audio.js`) son
utilidades de mantenimiento para regenerar los assets locales; no forman parte
de la app que se sirve.

## Contribuir

Las incidencias y *pull requests* son bienvenidas. Antes de enviar cambios,
ejecuta `npm run lint` y `npm test`. El diagnóstico técnico y el plan de mejora
por fases están en [`docs/diagnostico-y-plan.md`](docs/diagnostico-y-plan.md).

## Licencia y atribución

- **Código:** licencia [MIT](LICENSE).
- **Pictogramas y audio (`assets/`):** propiedad del Gobierno de Aragón, autor
  Sergio Palao para [ARASAAC](https://arasaac.org), bajo licencia
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Uso no
  comercial.

## Autor

**César Celada** — Psiquiatra · Desarrollador. Proyecto sin fines de lucro.
