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

## Pendiente de decisión (no se cambió)

En un teléfono de 360×640, al desplazar el tablero, la cabecera, la frase y
la fila de núcleo fijas ocupan 419 de 640 px: queda poco más de una fila de
tablero visible. Mantener el núcleo siempre a la vista fue una decisión
deliberada (como Proloquo2Go o TD Snap), así que no se tocó. Opciones si se
quiere ganar espacio en pantallas bajas: dejar de fijar el núcleo por debajo
de ~700 px de alto, o compactar el compositor vacío a una sola línea.
