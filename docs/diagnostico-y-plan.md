# Revisión diagnóstica y plan de mejora — HolAAC!

**Fecha:** 2026-07-18 · **Alcance:** `app.js`, `index.html`, `styles.css`, `service-worker.js`, `manifest.json`, `library.json`, assets y estructura del repositorio.

HolAAC! está en buen estado general: la biblioteca (324 ítems) es íntegra —sin ids duplicados y sin imágenes rotas—, todas las clases CSS referenciadas existen, y la arquitectura offline (IndexedDB + Service Worker) es razonable. Los hallazgos siguientes se ordenan por prioridad: **P0** = error que afecta al usuario hoy; **P1** = error o riesgo real en escenarios frecuentes; **P2** = mejora/deuda técnica.

Cada hallazgo lleva un estado: **⬜ pendiente**, **🟡 parcial** o **✅ hecho**. Al cerrar uno se anota entre paréntesis el commit/PR y la fecha, para poder continuar sin releer todo el código.

---

## Estado del trabajo (última actualización: 2026-07-23)

**Entregado**

- **Feedback táctil y pulido de interacción** (2026-07-23, rama `claude/navigation-accessibility-review-8leggm`, ver `docs/revision-navegacion-y-feedback.md`): ripple Material desde el punto de contacto, vibración háptica configurable (ajuste «Vibración al tocar»), pulsado instantáneo (transiciones específicas en vez de `all 0.3s` + `touch-action: manipulation`), scroll al inicio del board al cambiar de categoría, y el hueco «Inicio» deja de ser botón muerto. Cierra **N-7** y parte de **N-8**.
- **Accesibilidad — victorias rápidas** (mismo cambio): `aria-live` retirado del `#grid` (**P1-17 ✅**), `prefers-color-scheme` respetado en el primer arranque (**P2-19 ✅**), `theme-color` dinámico (**P2-12** parcial 🟡), foco restaurado al cerrar el selector de categorías (**P2-20 ✅**).

**Siguientes candidatos sugeridos** (orden de impacto/esfuerzo)

1. **Fase 1 · Correcciones críticas** — sigue siendo la prioridad: arranque con try/catch, filtro de foco en barrido, encadenado real palabra-por-palabra, `innerHTML` inseguro, bitácora con `autoIncrement`, `repairCoreImages`, favoritos huérfanos.
2. **Fase 4 · Navegación (victorias rápidas restantes)** — vocabulario nuclear fijo (N-2), Atrás del sistema con `history.pushState` (N-4), selector de perfil + SOS a 1 toque (N-5), breadcrumb de categoría (resto de N-8), estrella solo en modo tutor (N-9).

---

## 1. Errores funcionales

### P0-1 · Arranque sin manejo de fallos → pantalla muerta en "Cargando..."
`init()` (app.js:292) se llama sin `catch` (app.js:1771). Si `initDB()` falla (Safari/Firefox en modo privado, almacenamiento lleno) o `fetchLibraryItems()` falla en el primer arranque sin red, la app queda congelada en "Cargando..." sin ningún mensaje.
**Corrección:** envolver `init()` en try/catch; ante fallo de IndexedDB degradar a memoria + `localStorage`; ante fallo de `library.json` arrancar solo con `DEFAULT_ITEMS` y avisar.

### P0-2 · El barrido (scanning) captura Espacio/Enter globalmente
El listener de teclado (app.js:375-380) no comprueba dónde está el foco. Con barrido activo, escribir un espacio en el buscador o en Escritura libre **selecciona la casilla resaltada** en vez de escribir. Justo el público que usa barrido es el más vulnerable a este conflicto.
**Corrección:** ignorar el evento si `e.target` es `input`, `textarea` o está dentro de un `dialog` abierto.

### P0-3 · Modo "Palabra por palabra" corta las palabras
`speakPhrase()` (app.js:764-769) espera 800 ms fijos entre palabras, pero `speakWithTTS()` empieza con `speechSynthesis.cancel()` (app.js:721): cualquier palabra que tarde más de 800 ms en pronunciarse queda cortada por la siguiente. Con audio local pregrabado los clips además se solapan.
**Corrección:** encadenar con el evento `utterance.onend` (y `audio.onended` para mp3 locales) en lugar de un `setTimeout` fijo.

### P1-4 · La bitácora clínica puede abortar silenciosamente
El store `history` usa `keyPath: "timestamp"` con `Date.now()` (app.js:119, 155). Dos registros en el mismo milisegundo (frase + toque rápido, o el doble log de rutina) provocan `ConstraintError` y la transacción aborta sin aviso: se pierden registros clínicos.
**Corrección:** usar `autoIncrement: true` como clave y dejar `timestamp` como campo normal (requiere subir `dbVersion`).

### P1-5 · Condición cruzada en `repairCoreImages`
En app.js:676, para los ids "1" (Sí) y "2" (No) se considera "sana" cualquier imagen que contenga `/si.png` **o** `/no.png`: un "Sí" con la imagen de "no.png" nunca se repara (y viceversa).
**Corrección:** comparar cada ítem contra **su** imagen esperada, no contra la lista conjunta.

### P1-6 · Orden de casillas no natural (afecta motor planning)
`filtered.sort((a, b) => a.id.localeCompare(b.id))` (app.js:1193) ordena `lib-10` antes que `lib-2`. El propio comentario del código dice que la meta es posición estable y predecible para planificación motora, pero el orden resultante es arbitrario a ojos del usuario.
**Corrección:** `localeCompare(b.id, undefined, { numeric: true })`, o mejor, un campo `order` explícito en `library.json`.

### P1-7 · Pestaña Favoritos huérfana
Si el usuario está en "⭐ Favoritos" y quita el último favorito, la pestaña desaparece (app.js:1393-1395) pero `state.currentCategory` sigue siendo "⭐ Favoritos": el tablero queda vacío sin explicación.
**Corrección:** al quitar el último favorito, volver a "Todas".

### P1-8 · Palabras duplicadas en el tablero
- `library.json` contiene "Baño" dos veces (`lib-37` y `lib-39`).
- 7 de los 8 ítems por defecto (No, Hola, Por favor, Agua, Comida, Baño, Dolor) existen también en la biblioteca, por lo que aparecen **dos veces** en el tablero de todo usuario.
**Corrección:** deduplicar `library.json` y hacer que los `DEFAULT_ITEMS` se omitan (o se fusionen) cuando la biblioteca ya aporta la misma palabra.

### P1-9 · "Etiquetas gramaticales" que no son gramaticales
La UI promete etiquetas "(V, S, A, N, O)" (index.html:387), pero el código muestra la **inicial de la categoría** (app.js:1240): "Comida" → "C", "Social" → "S". Para un terapeuta es información engañosa.
**Corrección:** añadir un campo `pos` (categoría gramatical) a `library.json` y mostrarlo; mientras no exista, renombrar el ajuste a "Inicial de categoría".

---

## 2. Seguridad y robustez

### P0-10 · Inyección de HTML (`innerHTML`) con datos no confiables
`item.text`, `item.category`, las entradas de la bitácora y los keywords de ARASAAC se interpolan directamente en `innerHTML` en `createTile` (app.js:1262), `renderPhrase` (1363), `renderItemList` (1613), `renderRoutine` (1347), `renderHistory` (1138) y `renderArasaacResults` (1062). Un **JSON importado** de un tercero o un keyword de la API puede inyectar HTML/JS que se ejecuta y persiste en el dispositivo. Además, los handlers inline (`onclick="removeItem('${id}')"`) interpolan ids arbitrarios dentro de strings de código.
**Corrección:** sustituir por `textContent` / `createElement` + `addEventListener` (el patrón ya existe en `createTile` para imagen y favoritos); sanear `text`, `category`, `color` e `image` en `replaceAllItems` con una lista blanca (p. ej. rechazar `image` que no sea `assets/…`, `data:image/…` o https de ARASAAC).

### P1-11 · Protección parental aparente
El PIN del Modo Tutor está hardcodeado como `"0000"` (app.js:633) y el candado "Bloquear edición" se desactiva desde Ajustes sin PIN alguno. La barrera no protege de nada más que de toques accidentales.
**Corrección:** PIN configurable (guardado con hash en `localStorage`) y exigirlo también para desbloquear edición y para borrar la bitácora.

### P2-12 · Detalles de coherencia (🟡 parcial)
- La velocidad de voz real es `ajuste × 0.9` (app.js:725): el control miente ligeramente. ⬜
- ✅ ~~`<meta name="theme-color">` es estático: la barra del sistema queda clara en tema oscuro.~~ Ahora es dinámico según el tema (2026-07-23).
- Al importar/exportar JSON no se incluye `hiddenTags` del Modo Tutor, así que un respaldo no restaura la configuración del terapeuta. ⬜
- En `loadVoices`, el fallback de voz (app.js:1692-1695) no llama a `save()`. ⬜

---

## 3. PWA y funcionamiento offline

### P1-13 · La promesa "offline-first" solo cubre 11 pictogramas
El precache instala 11 de 324 pictogramas y 0 de 46 audios (service-worker.js:7-26); el resto solo se cachea si el usuario lo visitó con red. Todo el paquete de assets pesa ~4,3 MB (3,8 MB pictos + 0,4 MB audio), perfectamente precacheable.
**Corrección:** generar la lista de precache desde `library.json` (script de build simple) o añadir en Ajustes un botón "Descargar todo para uso sin conexión" con indicador de progreso.

### P1-14 · Dependencia de Google Fonts en la instalación del SW
La URL de Google Fonts está dentro de `cache.addAll` (service-worker.js:25): si esa petición falla, **falla la instalación completa** del Service Worker. Además, cargar la fuente desde Google expone la IP del usuario a un tercero, algo sensible dado el aviso de privacidad de la app.
**Corrección:** autoalojar Plus Jakarta Sans (woff2 en `assets/fonts/`) y quitar los `preconnect`/`link` externos. Beneficio doble: instalación del SW sin dependencias externas y privacidad real.

### P2-15 · Manifest incompleto
`icons/icon-512-maskable.png` existe pero no está declarado; `icon-192` usa `"purpose": "any maskable"` (desaconsejado: distorsiona el icono "any"); faltan `lang`, `scope` e `id`; `favicon-16.png` no se referencia en el HTML.
**Corrección:** declarar el maskable dedicado, separar purposes, añadir `lang: "es"`, `scope: "./"`, `id`.

### P2-16 · Versión del SW manual y recarga automática
`VERSION = "v4"` exige disciplina manual en cada deploy (si se olvida, los usuarios no reciben la actualización). La recarga automática en `controllerchange` puede interrumpir al usuario mientras compone (la frase se persiste, pero es disruptivo).
**Corrección:** inyectar la versión desde el hash del commit en el deploy (Acción de GitHub); opcionalmente, posponer la recarga hasta que la app esté inactiva o mostrar un botón "Actualizar ahora".

---

## 4. Accesibilidad

- **P1-17 ✅ · `aria-live` sobre el tablero completo:** `#grid` tenía `aria-live="polite"` y se reconstruye entero en cada interacción; los lectores de pantalla anunciaban ruido masivo. Retirado del grid, conservando `role="region"`/`aria-label`; los anuncios útiles siguen en `#chips` y `#statusText`. (2026-07-23)
- **P1-18 ⬜ · Contraste no garantizado:** el texto de cada casilla se pinta sobre `item.color` arbitrario (incluido el elegido por el usuario). Calcular luminancia y elegir texto claro/oscuro automáticamente.
- **P2-19 ✅ · `prefers-color-scheme` ignorado:** ahora se respeta la preferencia del sistema en el primer arranque (sin ajuste guardado). (`prefers-reduced-motion` ya estaba contemplado ✓, y ahora también desactiva el ripple). (2026-07-23)
- **P2-20 ✅ · Foco tras cerrar modales dinámicos:** el selector de categorías devuelve el foco al control que lo abrió al cerrarse. (2026-07-23)

---

## 5. Estructura del proyecto y deuda técnica

- **P0-21 · Falta `LICENSE`:** la app declara "licencia MIT" en su aviso legal (index.html:480) pero el repo no tiene archivo de licencia — legalmente el código no es open source todavía. Añadir `LICENSE` (MIT) y un apartado de atribución ARASAAC (CC BY-NC-SA 4.0).
- **P1-22 · Falta `README.md`:** sin instrucciones de uso, despliegue ni contribución; es la portada del proyecto en GitHub.
- **P2-23 · `app.js` monolítico (1.770 líneas):** separar en módulos ES (`db.js`, `speech.js`, `render.js`, `settings.js`) — el `<script type="module">` ya lo permite sin build.
- **P2-24 · Sin tooling:** no hay `package.json`, linter, tests ni CI. Mínimo viable: ESLint + un smoke test de Playwright (la app arranca, una casilla añade a la frase, el SW instala) corriendo en GitHub Actions.
- **P2-25 · Scripts de desarrollo en la raíz:** `download_audio.js` y `download_pictos.js` son herramientas de mantenimiento; moverlas a `tools/` para que no se sirvan/cacheen con la app.

---

## 6. Navegación: análisis y comparación con apps CAA de referencia

### Cómo se navega hoy en HolAAC!

Un solo nivel: pestañas horizontales de categoría (+ modal selector), buscador, y un tablero que muestra la categoría elegida en un scroll vertical. La primera casilla del tablero es siempre "🏠 Inicio / ← Volver". Superpuesto a eso: "categorías activas" (Ajustes), perfiles de tablero (Casa/Escuela/SOS, en Ajustes) y favoritos.

### Hallazgos

- **N-1 (P1) · Scroll infinito en vez de páginas con posiciones fijas.** "Todas" son 324 casillas en un scroll; "Acciones" son 55. Las apps CAA de referencia evitan el scroll: usan rejillas paginadas con posiciones fijas, porque el gesto de scroll es difícil con motricidad reducida y porque la posición estable de cada palabra es la base del aprendizaje motor (motor planning). En HolAAC! la posición de una palabra cambia según la pestaña, la búsqueda y las categorías activas.
- **N-2 (P1) · No hay vocabulario nuclear persistente.** Proloquo2Go, TD Snap Core First y LAMP mantienen las palabras de alta frecuencia (yo, tú, querer, más, ayuda, sí, no) **siempre visibles en el mismo lugar**, en cualquier vista. En HolAAC! "Sí/No" viven en la categoría General y desaparecen al entrar a cualquier otra. Es la brecha práctica más importante frente a los referentes: obliga a navegar para decir lo más frecuente.
- **N-3 (P1) · Cuatro mecanismos superpuestos de filtrado.** Pestañas, modal de categorías, "categorías activas" y perfiles se combinan de formas difíciles de predecir (un perfil puede excluir una categoría activa; las pestañas desaparecen según el filtro). Para el cuidador es difícil razonar "por qué no veo esta palabra". Los referentes tienen **un** mecanismo principal (carpetas) más, opcionalmente, niveles de vocabulario progresivo.
- **N-4 (P1) · El botón Atrás del sistema cierra la app.** No hay integración con `history.pushState/popstate`: en una PWA instalada en Android, el gesto/botón Atrás — el reflejo natural para salir de una categoría — cierra HolAAC! en vez de volver a "Todas".
- **N-5 (P1) · Cambiar de contexto exige 3+ toques dentro de Ajustes.** Los perfiles (Casa/Escuela/SOS) son una buena idea (tableros por escenario, como en TouchChat), pero están enterrados en Ajustes. En una conversación real nadie abre un modal de configuración; y el perfil **SOS**, por definición, debería estar a un toque de distancia siempre.
- **N-6 (P1) · Barrido lineal inviable en listas grandes.** El barrido recorre casilla por casilla toda la lista filtrada: en "Todas", a 2 s por paso, un ciclo completo tarda más de 10 minutos. Las apps orientadas a conmutador (AsTeRICS Grid, TD Snap) usan barrido **fila-columna**: primero se resalta la fila, luego la casilla. Además el `scrollIntoView` continuo hace que la pantalla no pare de moverse.
- **N-7 ✅ (P2) · Casilla de navegación desaprovechada.** El primer slot mostraba "🏠 Inicio" siendo un botón muerto estando ya en Inicio. Ahora, estando en Inicio, ese hueco sirve para volver arriba en tableros largos; en otra categoría sigue siendo "← Volver" a Todas. (2026-07-23) Pendiente aún: replantear el slot como parte del rediseño de navegación (ver Fase 4).
- **N-8 🟡 (P2) · Sin indicador de ubicación.** Al cambiar de categoría el board ahora vuelve al inicio con scroll suave, reduciendo la desorientación. Sigue faltando un título/breadcrumb explícito sobre el tablero. (parcial 2026-07-23)
- **N-9 (P2) · Estrella de favorito en la vista de comunicación.** Cada casilla lleva un botón de 32 px (bajo el mínimo táctil de 44–48 px) que a la vez invita al toque accidental en usuarios con motricidad gruesa. Los referentes reservan ese tipo de acciones al modo edición.
- **N-10 (P2) · Gesto oculto.** Mantener pulsada una casilla la pronuncia (`contextmenu`), pero nada lo anuncia y el gesto es poco fiable en iOS Safari.

### Comparación práctica

| Capacidad | HolAAC! hoy | Cboard (libre) | AsTeRICS Grid (libre) | Proloquo2Go / TD Snap (comercial) |
|---|---|---|---|---|
| Organización | 1 nivel (categorías) | Carpetas anidadas | Rejillas enlazadas, páginas fijas | Carpetas + core fijo |
| Posiciones estables | No (scroll + filtros) | Sí | Sí | Sí (principio central) |
| Vocabulario nuclear siempre visible | No | Parcial | Configurable | Sí |
| Botón Atrás del sistema | Cierra la app | Navega | Navega | Navega (nativo) |
| Barrido | Lineal, toda la lista | Lineal | **Fila-columna, altamente configurable** | Fila-columna |
| Cambio de contexto/tablero | 3+ toques (Ajustes) | 1–2 toques | 1–2 toques | 1–2 toques |
| Búsqueda instantánea | **Sí** | Limitada | Limitada | Sí |
| Arranque sin cuenta/instalación | **Sí** | Requiere cuenta para guardar | Sí | Compra + configuración |
| Audio pregrabado + TTS | **Sí** | TTS | TTS/grabación | TTS premium |
| Bitácora clínica local | **Sí** | No | Parcial | Sí |

**Dónde HolAAC! ya es competitivo:** fricción cero (abrir y usar, sin cuenta), búsqueda inmediata, "hablar al tocar", panel de escritura libre, perfiles clínicos y bitácora — frente a LetMeTalk o a tableros PDF imprimibles, ya es una mejora clara. **Dónde pierde frente a los referentes:** todo lo que depende de constancia espacial y acceso motor —scroll en vez de páginas, sin core fijo, barrido lineal, Atrás que cierra la app. Son exactamente las necesidades del usuario final (no del cuidador), así que conviene priorizarlas.

### Recomendaciones de navegación (en orden de impacto/esfuerzo)

1. **Fila de núcleo fija** visible en toda vista: Sí, No, Ayuda, Querer, Más, Parar, Baño, Dolor (configurable desde el modo tutor). Impacto muy alto, esfuerzo bajo.
2. **Integrar `history.pushState`**: Atrás del sistema = volver a "Todas"; segunda pulsación = comportamiento normal. Esfuerzo bajo.
3. **Selector de perfil a 1 toque** en la barra superior + botón SOS siempre visible. Esfuerzo bajo.
4. **Título de categoría sobre el tablero** (breadcrumb) 🟡 —el board ya vuelve arriba al navegar, falta el breadcrumb explícito— y ~~eliminar la casilla "Inicio" cuando ya se está en Inicio~~ ✅ (ahora reutilizada como «volver arriba»). Esfuerzo bajo.
5. **Estrella de favorito solo en modo tutor/edición.** Esfuerzo bajo.
6. **Paginación con posiciones fijas** (rejilla N×M según `--tile-size`, flechas/gesto para pasar página) en lugar de scroll. Impacto alto en motor planning, esfuerzo medio.
7. **Barrido fila-columna** limitado a la página visible. Esfuerzo medio; convierte el barrido de decorativo a usable.
8. **Unificar filtros**: perfiles como mecanismo único de contexto (absorbiendo "categorías activas"), carpetas/categorías como mecanismo único de organización. Esfuerzo medio-alto; simplifica el modelo mental.
9. A futuro: soporte **Open Board Format (OBF)** para importar/exportar tableros compatibles con Cboard y otros. Esfuerzo alto.

---

## Plan de trabajo propuesto

| Fase | Estado | Contenido | Hallazgos | Esfuerzo |
|------|--------|-----------|-----------|----------|
| **0 · Feel y accesibilidad rápida** | ✅ hecho (2026-07-23) | Feedback táctil (ripple + háptico), pulsado instantáneo, `touch-action`, scroll al inicio al navegar, `aria-live` del grid, `prefers-color-scheme`, `theme-color` dinámico, foco tras cerrar el selector | N-7, N-8 (parcial), P1-17, P2-19, P2-20, P2-12 (parcial) | — |
| **1 · Correcciones críticas** | ⬜ pendiente | try/catch de arranque con degradación, filtro de foco en barrido, encadenado real palabra-por-palabra, eliminación de `innerHTML` inseguro + saneado de import, bitácora con `autoIncrement`, fix `repairCoreImages`, favoritos huérfanos | P0-1, P0-2, P0-3, P0-10, P1-4, P1-5, P1-7 | 1–2 días |
| **2 · Fundamentos del repo** | ⬜ pendiente | `LICENSE` MIT + atribución ARASAAC, `README.md`, mover scripts a `tools/`, `.gitignore` | P0-21, P1-22, P2-25 | ~½ día |
| **3 · Offline y PWA de verdad** | ⬜ pendiente | Precache generado desde `library.json` (o descarga bajo demanda), fuente autoalojada, manifest completo, ~~theme-color dinámico~~ (✅ hecho en Fase 0), versión de SW automatizada | P1-13, P1-14, P2-15, P2-16 | 1 día |
| **4 · Navegación: victorias rápidas** | ⬜ pendiente (N-7 ✅) | Fila de núcleo fija, Atrás del sistema con `pushState`, selector de perfil + SOS a 1 toque, breadcrumb de categoría, ~~quitar botón "Inicio" muerto~~ (✅ Fase 0), estrella solo en modo tutor | N-2, N-4, N-5, N-8, N-9 | 1–2 días |
| **5 · Contenido y UX** | ⬜ pendiente (P1-17 ✅) | Deduplicar "Baño" y defaults, orden numérico/estable, etiquetas gramaticales reales (`pos` en library.json), PIN configurable + candado coherente, contraste automático, ~~`aria-live` ajustado~~ (✅ Fase 0) | P1-6, P1-8, P1-9, P1-11, P1-18 | 1–2 días |
| **6 · Navegación: rediseño de acceso motor** | ⬜ pendiente | Paginación con posiciones fijas (sin scroll), barrido fila-columna sobre la página visible, unificación de perfiles/categorías activas | N-1, N-3, N-6 | 3–4 días |
| **7 · Calidad sostenible** | ⬜ pendiente (P2-19, P2-20 ✅) | Modularizar `app.js`, ESLint, smoke tests Playwright, CI en GitHub Actions con deploy; explorar compatibilidad Open Board Format | P2-23, P2-24, P2-12 (resto) | 2–3 días |

**Criterio de orden:** la **Fase 0** ya cerró la fricción sensorial inmediata (lo que se sentía «clunky»). La **Fase 1** sigue siendo la prioridad: elimina los fallos que hoy pueden dejar la app inservible o cortar la voz al usuario final (población especialmente sensible a fallos impredecibles); la Fase 2 es barata y desbloquea la legalidad open source; la Fase 3 consolida la promesa offline; la Fase 4 cierra con poco esfuerzo el resto de la brecha de practicidad frente a otras apps CAA; las Fases 5–7 consolidan contenido clínico, acceso motor y mantenibilidad.

Cada fase cabe en un PR independiente y revisable; ninguna requiere migración destructiva de datos de usuarios existentes (la Fase 1 sube `dbVersion` a 3 con migración aditiva del store `history`).
