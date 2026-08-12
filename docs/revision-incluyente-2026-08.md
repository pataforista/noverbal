# Última revisión — estética y usabilidad desde la perspectiva incluyente

**Agosto 2026.** Pase de cierre sobre el rediseño visual
(`rediseno-visual-2026-08.md`). Aquel arregló **cómo se ve** la app; este
comprueba **si lo que se ve se puede usar**, y encuentra que en tres sitios no.

Todo lo de aquí está medido sobre la app corriendo, no revisado a ojo.

---

## Resumen

| | Antes | Ahora |
|---|---|---|
| Palabras del núcleo alcanzables sin desplazar (390 px) | 3 de 8 | **8 de 8** |
| Categoría activa visible (320 px) | 34 % | **100 %** |
| Alto consumido antes del tablero (320 px) | 78 % | **68 %** |
| Alto consumido antes del tablero (390 px) | 53 % | 61 % |
| Etiqueta de casilla en Modo Calma oscuro | 1,19:1 | **12,13:1** |
| «Hablar Frase» desactivado en Modo Calma | 2,95:1 | **5,55:1** |
| Modo Calma | ~90 líneas de CSS sin interruptor | función completa |
| Tests | 24 | 26 |

---

## Los cuatro problemas

### 1. El núcleo estaba fijo, pero no alcanzable

El comentario del propio CSS dice que el vocabulario nuclear «solo es nuclear si
se alcanza desde cualquier sitio — es la premisa entera de Proloquo2Go, TD Snap
Core First y LAMP». Se había cumplido la mitad: la fila quedó *sticky*, así que
no se iba al desplazar.

La otra mitad no. Era un contenedor de desplazamiento horizontal con la barra
oculta (`scrollbar-width: none`), y en un móvil de 390 px mostraba **3 de sus 8
palabras**. Las otras cinco no estaban lejos: no había nada en pantalla que
dijera que existían. Y el gesto que las recuperaba —un barrido horizontal
invisible— es justo el peor que se puede poner delante de los perfiles motores
para los que esta fila existe.

Ahora son **dos filas fijas de cuatro**. Las ocho están en pantalla, cada una en
una posición constante (el sentido de una fila de núcleo es la planificación
motora, así que las posiciones no pueden reflotar) y el barrido desaparece. Las
casillas se vuelven bajas —dibujo sobre palabra, sin alto desperdiciado— para
que la segunda fila cueste ~40 px en vez de duplicar el bloque.

> **Compensación, dicha en claro:** a 390 px el tablero empieza ahora al 61 % del
> alto en lugar del 53 %. Son 8 puntos a cambio de cinco palabras nucleares que
> antes no existían para quien no supiera barrer. El tablero se desplaza
> verticalmente sin problema —es un gesto esperado y fácil—; el barrido
> horizontal oculto no lo era.

**Por debajo de 360 px la rejilla de dos filas deja de compensar:** cuatro
columnas dejan una casilla de 67 px, y con la banda de la palabra el dibujo baja
a ~21 px, ilegible en un tablero cuyos usuarios leen la imagen. Ahí la fila
sigue desplazándose, pero el desplazamiento deja de ser invisible: **el borde
derecho se desvanece**, que es la señal estándar de «hay más por aquí» y es lo
único que la barra oculta nunca dijo.

### 2. A 320 px no se veía en qué categoría estabas

El botón «Categorías» estaba *dentro* de la tira de desplazamiento y se comía
105 de sus 132 px. La pastilla activa —lo único en pantalla que responde a
«¿dónde estoy?»— mostraba el **34 % de sí misma**, que venía a ser su punto de
color y nada más.

Además estaba dentro de un `role="tablist"`, que solo admite pestañas: los
lectores de pantalla lo contaban como una y anunciaban mal el total.

Sale de la lista de pestañas y pasa a ser hermano de la tira. Por debajo de
600 px se queda en su icono, y la categoría activa se lee entera.

También se corrigió algo relacionado: la tira se reconstruye con
`scrollLeft = 0`, así que al repintar con una categoría lejana en la lista, la
activa quedaba fuera de pantalla — el tablero cambiaba y nada visible decía a
qué. Ahora la activa se trae a la vista.

### 3. El compositor se partía en tres líneas a 320 px

Estaba diseñado para dos. Los controles de edición ocupan 116 px, lo que dejaba
a «Hablar Frase» 150 px contra un mínimo de 154 — así que bajaba a una línea
propia y gastaba ~54 px, en la pantalla más estrecha y justo encima del tablero.

Recortar unos píxeles del relleno y del cuerpo del propio botón basta para que
quepa al lado de los controles, y sigue holgadamente por encima del objetivo
táctil de 44 px. Eso solo devuelve más alto del que costó la segunda fila del
núcleo: **a 320 px el tablero empieza ahora al 68 %, antes al 78 %.**

### 4. El Modo Calma estaba a medias — y lo escrito tenía fallos

Había ~90 líneas de CSS para un modo de baja carga sensorial y **ningún
interruptor que lo activara**: código muerto. Se termina, porque la función es
buena y es justo lo que pide la perspectiva incluyente. Ya está en Ajustes →
Accesibilidad, y se conserva entre sesiones.

Al conectarlo salieron cuatro defectos en el CSS que ya existía:

- **Ocultaba `.chip .remove`**, la × de cada palabra de la frase: la única forma
  de quitar *una* palabra equivocada sin borrar la frase entera. Un modo pensado
  para momentos de crisis no puede quitar lo que la persona sabe hacer, y menos
  en el momento para el que se creó. Ahora se queda, en neutro.
- **Ocultaba la miga de pan**, lo único que dice en qué tablero estás. Se queda,
  atenuada. Al atenuarla con `--md-on-surface-variant` daba 3,31:1, por debajo
  de AA; lleva la tinta completa, que ya es discreta sobre esta superficie.
- **Imponía una paleta crema pase lo que pase**, así que activarlo con el tema
  oscuro puesto lanzaba una pantalla clara a quien había elegido oscuro — lo
  contrario de lo que promete, para un usuario fotosensible que busca calma.
  Hay variante oscura: el oscuro sigue oscuro y el modo hace su trabajo, que es
  quitar el color y las sombras.
- En esa variante, la etiqueta conservaba la tinta oscura del tema claro sobre
  una banda oscura: **1,19:1**, invisible, en el elemento que lleva la palabra.
  Ahora **12,13:1**.

Y dos incoherencias del propio modo: el botón «Limpiar» seguía teñido de rojo
—la clase de alarma de la que se huye al activarlo— y los puntos de las
pastillas seguían a color señalando tintes de categoría que el modo acababa de
retirar. Ambos en neutro.

**SOS es la excepción deliberada, aquí como en todo lo demás:** sigue en rojo
fuerte. Ser más ruidoso que el resto es su función, y una crisis es cuando más
importa.

---

## Otros arreglos

- **El distintivo de «palabras ocultas»** del Modo Tutor iba con estilos en
  línea, al 70 % de opacidad y junto al contador de ítems —donde el ojo ya dejó
  de mirar—, y su explicación vivía solo en un `title`: un tooltip que ningún
  dispositivo táctil muestra. Que el tablero esté filtrado es un **estado**, no
  una estadística: un tablero al que le falta media lista se ve igual que uno
  que nunca la tuvo. Ahora es una cápsula legible, con `aria-label` propio y
  plural correcto.

## Verificación

- `npm test` — **26 de 26 en verde**, tres pasadas seguidas. Dos tests nuevos
  fijan las regresiones de arriba: las 8 palabras del núcleo alcanzables a
  390 px, y la categoría activa legible a 320 px.
- `npm run lint` — 0 errores (6 avisos de `err` sin usar, previos).
- Contrastes calculados con la fórmula de luminancia relativa de WCAG,
  componiendo las bandas translúcidas sobre el color real de su casilla.
- Comprobado a 320, 390 y 1280 px, en tema claro, oscuro, Calma claro y Calma
  oscuro.

> **Nota sobre los tests:** en una de las pasadas falló
> «`Hablar Frase` cumple el contraste AA» y volvió a pasar aislado y en las tres
> pasadas siguientes. Es intermitencia del propio test —hace clic y mide acto
> seguido, con `fullyParallel`—, no del código. Queda anotado por si reaparece.

> **Nota de entorno:** `npx playwright test` falla aquí al buscar un
> `chrome-headless-shell` que este contenedor no trae. Se ejecuta con
> `PW_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, que la
> configuración ya contemplaba. No es un fallo de la app.
