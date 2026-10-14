# Revisión de estética, navegación y conexiones — 2026-10-14

Recorrido automatizado de la app real en teléfono (390×844 y 360×640), tableta
(820×1180) y portátil (1366×800), en tema claro y oscuro: capturas de cada
menú y diálogo, contraste de todo el texto visible, tamaño de los objetivos
táctiles, desbordes, y un clic sobre cada uno de los 128 controles de la
pantalla principal y de los 11 diálogos buscando botones muertos o
excepciones.

Ningún control quedó desconectado y ningún recurso (pictos, audio, iconos)
falta. Lo que sí apareció, y se corrigió:

| Defecto | Quién lo sufría | Arreglo |
| --- | --- | --- |
| Al reabrir la app, «Sí», «No», «Hola», «Por favor», «Agua», «Comida», «Baño» y «Dolor» aparecían dos veces (357 → 365 palabras). | Todo usuario, desde la segunda apertura. | `ensureLibraryItemsPresent` deduplica por texto como el primer arranque, y borra las copias que ya había añadido mientras sigan intactas (sin tocar favoritas, núcleo ni ediciones). |
| 53 palabras de la biblioteca sin tilde ni eñe: «Mama», «Papa», «Mas», «Pequeno», «Sueno», «Adios»… La voz leía «papa» (tubérculo) por «papá». | Todos; peor para quien no puede leer y depende de la voz. | `library.json` corregido; los tableros guardados se reparan solo si el texto sigue siendo exactamente el valor de fábrica. El audio local no cambia (su nombre ignora tildes). |
| Etiquetas de los síntomas clínicos (Angustia, Pánico, Voces…) invisibles en tema oscuro: 1.1:1. | Consulta con tema oscuro. | `--tile-ink` por defecto sigue el tema. |
| Texto suelto de los diálogos (PIN, confirmaciones) negro sobre fondo oscuro: 1.3:1. | Tema oscuro. | `.modal` declara su color; `.dark-theme` declara `color-scheme: dark`. |
| En el teléfono la tira de categorías mostraba una píldora y media: las flechas ‹ › ocupaban 104 px de ~300. | Teléfonos. | En pantallas táctiles estrechas las flechas se ocultan (se desliza con el dedo) y un desvanecido indica que hay más. Ratón y teclado las conservan. |
| El barrido por conmutador, al subir, dejaba la ficha resaltada debajo de la cabecera fija. | Acceso por conmutador y teclado. | `scroll-padding-top` igual a la altura de la pila fija (cabecera + frase + núcleo). |
| Anillo de foco del buscador recortado en esquinas rojas cuadradas. | Teléfono y tableta. | Foco dibujado hacia dentro. |
| Botón de cerrar de las ayudas de 20×20 px; el del editor se encogía a 31 px. | Motricidad fina limitada. | Ambos a 44×44 px. |
| Enlace «Saltar al contenido» y enlaces de licencia a 3–3.4:1. | Tema claro. | Rojo fuerte del sistema (5.7:1). |
| «Tema Obscuro (Moomins Style) — paleta relajante y premium». | Todos. | «Tema oscuro — Colores oscuros y suaves: cansan menos la vista de noche». |

Cada defecto tiene su prueba en `tests/navegacion.spec.js`; las seis fallan
con el código anterior y pasan con el actual.

## Espacio para el tablero en teléfonos (decidido después)

En un teléfono de 360×640, al desplazar el tablero, la cabecera, la frase y la
fila de palabras básicas fijas ocupaban 419 de 640 px: quedaba poco más de una
fila de tablero. Se aplicaron las dos opciones propuestas:

1. **Frase en una sola línea, de altura fija.** En el teléfono, la tira de la
   frase, Borrar/Limpiar (apilados) y «Hablar Frase» comparten una línea de
   112 px. Antes eran dos líneas: 140 px vacía y 172 px con la primera
   palabra, de modo que el primer toque empujaba el tablero 32 px bajo el
   dedo. Mientras suena la voz, Pausa y Detener ocupan una segunda columna.
   La tira se desliza y siempre muestra la palabra más reciente.
2. **Ajuste «Palabras básicas al desplazar»** (Ajustes › Interfaz y estilo):
   - *Automático (recomendado)*: fijas arriba, salvo en teléfonos verticales
     de menos de 700 px de alto y en pantallas de menos de 560 px de alto
     (teléfono en horizontal, tableta en soporte). No afecta a portátiles.
   - *Siempre fijas*: el comportamiento anterior, para quien las necesita a
     mano en todo momento.
   - *Se desplazan con el tablero*: en cualquier pantalla.

Tablero visible tras desplazar, en px:

| Pantalla | Antes | Automático | Siempre fijas |
| --- | --- | --- | --- |
| 360×640 | 221 | 419 | 249 |
| 390×844 | 413 | 441 | 441 |
| 844×390 (horizontal) | — | 271 | 193 |
