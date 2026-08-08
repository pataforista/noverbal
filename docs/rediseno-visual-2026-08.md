# Rediseño visual — HolAAC! · agosto 2026

**Motivo:** la app funcionaba, pero seguía pareciendo un prototipo. Este pase se
ocupa de eso: **cómo se ve y cuánto cuesta entenderla a simple vista**, no de
qué hace.

**Referencias:** el lenguaje visual dominante en 2026 según los premios de
diseño y las guías de plataforma — superficies neutras y cálidas, un solo color
de acento, sombras amplias y suaves, tipografía que prioriza la legibilidad, y
color reservado para lo que significa algo. Para la parte específica de CAA, la
convención de Proloquo / TD Snap / LAMP: fondo claro por casilla, pictograma sin
tapar, palabra en una banda fija.

> Este documento no repite el trabajo de `revision-2026-07-25.md` (espacio en
> pantalla, permanencia, barrido). Aquello sigue en pie; esto es la capa visual
> que faltaba encima.

---

## Resumen

| | Antes | Ahora |
|---|---|---|
| Glifos emoji en `index.html` | 47 | 1 (la marca de Buy Me a Coffee) |
| Contraste del pictograma sobre su casilla (mediana) | 7,53:1 | 14,47:1 |
| Casillas con el pictograma por debajo de 7:1 | 10 de 22 | 1 de 22 (SOS) |
| Contraste de la etiqueta (peor caso) | 13,1:1 | 6,3:1 — sigue sobre AA |
| Alto del compositor (escritorio 1280×900) | 164 px | 106 px |
| Alto consumido antes del tablero (escritorio) | 76 % | 54 % |
| Alto consumido antes del tablero (móvil 390×844) | 62 % | 54 % |
| Alto consumido antes del tablero (320×640) | 81 % | 70 % |
| Cabecera a 320 px de ancho | **SOS fuera de pantalla** (x = −43) | entra completa |
| Colores saturados en el cromado | 9 controles | 1 (SOS) |

---

## Los seis problemas de fondo

### 1. Emoji haciendo de iconos

⚙️ ✏️ 🌙 🔍 ⌫ 🗑️ 📂 🏠 ⭐ 🗣 … los dibuja el sistema operativo, así que el mismo
botón salía plano en un dispositivo y como pegatina 3D en otro, con un tamaño y
un grosor que el CSS no podía tocar. No heredan `currentColor`, así que seguían
a todo color en tema oscuro y sobre un botón relleno. Y una fila de emoji nunca
comparte línea base.

Ahora hay **un juego de iconos de trazo** (24×24, grosor 1,75, uniones
redondeadas, `currentColor`) definido como sprite SVG en `index.html`. Es el
cambio que más separa «prototipo» de «producto terminado» — y además se ve igual
en un dispositivo sin fuente de emoji a color.

`index.html` pasa de **47 glifos emoji a 1**: ☕, que es la marca de Buy Me a
Coffee y no un icono de interfaz. El campo `icon` de `CATEGORY_METADATA`
desaparece: las categorías se identifican ahora por color (ver más abajo).

Quedan emoji en zonas secundarias generadas por JavaScript — la estrella y la
chincheta del modo Tutor, y el texto de algunos avisos — donde el glifo es un
indicador de estado con convención propia (⭐/☆) o simplemente texto.

Dos trampas que costó ver, ambas del mismo tipo: `updateThemeToggleIcon` y el
botón «Añadir al Catálogo» escribían su icono con `textContent`. En cuanto ese
icono pasó a ser un `<svg>`, la asignación borraba el `<use>` y el botón se
quedaba **sin icono ninguno** — «Tema» estuvo así hasta que se detectó. Ahora
hay un helper que cambia el `href` del `<use>` en lugar de reescribir el nodo.

### 2. El color no significaba nada

El cromado era morado (la base de Material 3), el acento coral, las categorías
en tonos Tailwind‑500 a plena saturación y los botones destructivos en rojo
sólido. Con todo gritando, nada destacaba — y menos que nada el botón de
emergencia.

- Superficies: rampa **neutra cálida**, sin tinte morado, en claro y en oscuro.
- Rojo sólido: **solo para SOS**. «Limpiar» y «Detener» pasan a rojo tonal.
- Pestaña de categoría activa: **tinta**, no acento. El coral significa «esto
  hace algo»; usarlo también para «estás aquí» hacía indistinguibles las dos
  cosas.
- Interruptores encendidos: **verde**, no coral. Un interruptor en el color de
  alerta dice que algo va mal cuando lo que dice es que está activado.

### 3. Los pictogramas no se leían

Las casillas iban pintadas a plena saturación y los pictogramas de ARASAAC son
dibujos de línea negra: sobre un tono 500 el dibujo se separaba muy poco del
fondo. Por eso hacía falta una placa opaca encima para que la palabra se leyera
— y esa placa tapaba justo el centro del dibujo, que es donde está el
significado.

La paleta pasa a **tintes claros a una misma luminosidad** (L\*≈86), respetando
el matiz de cada categoría. Medido sobre las 22 tintas que el tablero puede
pintar, el contraste de la línea negra contra su casilla pasa de una **mediana
de 7,53:1 con 10 casillas por debajo de 7:1**, a una **mediana de 14,47:1 con
una sola** (SOS, que sigue en rojo a propósito). El peor caso apenas se mueve
—4,35:1 → 4,64:1, ambos por encima de AA—; lo que cambia es que deja de haber
casillas mediocres: el dibujo se lee igual de bien en todas.

Con eso, además: la palabra se lee en tinta oscura sin necesidad de placa, y 300
símbolos juntos dejan de competir entre sí.

Es además cómo se dibuja la clave Fitzgerald sobre papel, así que el cambio se
acerca a la convención, no se aleja.

SOS es la excepción deliberada: sigue en rojo fuerte, porque ser más ruidoso que
todo lo demás es exactamente su función.

### 4. La palabra flotaba sobre el dibujo

La etiqueta era un rectángulo redondeado semitransparente **encima** del
pictograma. Ahora es una **banda a ras del borde inferior**, como en Proloquo,
TD Snap y LAMP: no tapa nunca el dibujo, y el ojo aprende un único sitio donde
buscar la palabra.

La banda se oscurece respecto al color de su propia casilla, así que la tarjeta
se sigue leyendo como un objeto y no como dos.

> **Compensación, dicha en claro:** la placa opaca anterior daba muchísimo
> contraste a la palabra (13,1:1 en el peor caso). La banda translúcida baja ese
> peor caso a **6,3:1** — sigue holgadamente por encima del 4,5:1 que pide AA
> para texto, y a cambio el pictograma no queda tapado nunca. El contraste que
> se cede es margen sobrante; la oclusión que se elimina afectaba al centro del
> dibujo, que es donde está el significado.
>
> Durante el pase la banda de las casillas oscuras se *aclaraba* en vez de
> oscurecerse, lo que dejó el texto blanco de SOS en 3,65:1 — por debajo de AA,
> y justo en la casilla que tiene que leerse cuando alguien está en apuros. Se
> corrigió: ahora ambas variantes oscurecen.

### 5. Cuatro paneles grises apilados

Compositor, barra de categorías, buscador, fila de núcleo y tablero tenían cada
uno su propio panel relleno. Cinco franjas seguidas se leen como rayas, no como
estructura.

Ahora solo el compositor está elevado — es lo que la persona está construyendo.
El resto se separa con filetes de 1 px y espacio. Además:

- El compositor pasa a **una sola línea**: frase, controles de edición y
  «Hablar Frase». Eran dos filas, 164 px casi vacíos en escritorio, justo encima
  del tablero al que empujaban fuera de pantalla. En móvil sí sigue en dos
  líneas, porque a ese ancho la tira de frase se quedaba en ~140 px y «Hablar
  Frase» en un cuadrado de 96 px con texto de 0,72 rem.
- El buscador **comparte línea** con las categorías en todos los anchos. En
  móvil se pliega a su propio icono y se despliega al recibir el foco (sin
  JavaScript: el control plegado *es* el campo, así que tocarlo o llegar con Tab
  lo enfoca y lo abre en un solo paso).

### 6. Estados que engañaban

- «Hablar Frase» desactivado era un coral pálido y plano, sin ninguna pista de
  que faltaban palabras: el control principal de la app parecía averiado en un
  tablero recién abierto. Ahora tiene un estado desactivado propio, que se lee
  como *esperando* y no como *roto*.
- Las aspas para quitar una palabra de la frase eran círculos rojos rellenos
  flotando sobre la frase recién construida — marcadores de error para una
  corrección corriente. Ahora son neutras, y siguen a tamaño completo porque son
  un objetivo táctil primario.
- El panel «Cómo se usa» de la bienvenida iba pintado en el color de
  emergencia. Lo primero que ve alguien nuevo son instrucciones; no deberían
  parecer una advertencia. Además la lista numera de verdad los tres pasos que
  su título promete.

---

## Otros arreglos que salieron por el camino

- **La cabecera no cabía a 320 px:** SOS quedaba en x = −60, completamente fuera
  de pantalla. Se retira ahí el selector de perfil, que es el único control de
  la cabecera duplicado en otro sitio (`#boardProfile` en Ajustes, sincronizado
  con él). Todo lo demás es una emergencia, una función de comunicación, o la
  vía para llegar al resto.
- **Etiquetas en MAYÚSCULAS** en todo el diálogo de ajustes, a 0,75 rem y con
  tracking: la peor configuración posible para leer, aplicada al texto que
  explica qué hace cada control, en una app cuyo público incluye a personas con
  dificultades de lectura. Pasan a caja normal a un tamaño legible.
- **Los deslizadores nunca se habían estilado:** salían en el azul del sistema,
  un color que no aparece en ninguna otra parte de la app.
- **La categoría bajo cada palabra** («NAVEGACI…») se repetía en las 323
  casillas y se cortaba. Ahora aparece solo donde el tablero mezcla categorías
  (resultados de búsqueda) y en modo Tutor. Sigue en el `aria-label` de cada
  casilla, así que nadie la pierde con lector de pantalla.
- **El selector de categorías** ahora pinta cada tarjeta con el color de su
  categoría, así que el diálogo funciona como leyenda del tablero.

## Verificación

- `npm test` — 24 de 24 en verde (los mismos que ya cubrían espacio en pantalla,
  permanencia, barrido, objetivos táctiles y contraste de «Hablar Frase»).
- `npm run lint` — sin errores.
- Contraste de las 22 tintas de la paleta calculado sobre la fórmula de
  luminancia relativa de WCAG, para etiqueta y para pictograma, en ambos temas.
- Comprobado desbordamiento horizontal a 320, 390 y 1280 px de ancho.
