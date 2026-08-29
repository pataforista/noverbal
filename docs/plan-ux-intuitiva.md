# Plan de mejora UX: app realmente intuitiva, limpia y neuro-amigable

**Fecha:** 2026-08-28 · **Estado:** propuesta priorizada
**Principio rector:** cada mejora debe pasar dos filtros a la vez —
(1) ¿la interfaz se ve más limpia y moderna? y (2) ¿reduce la carga cognitiva
de una persona con autismo, afasia o discapacidad motora? Si solo cumple uno,
se replantea.

---

## Diagnóstico (estado actual, verificado en código)

| Área | Problema observado | Impacto |
|---|---|---|
| Descubribilidad | «Agregar fotos/palabras» estaba en Más → Editar (ya corregido con el botón «Agregar») | Alto — resuelto parcialmente |
| Header | 9+ controles compiten: SOS, perfil, habla-al-tocar, Escribir, Agregar, Tema, Ajustes, Editar, Más | Saturación visual; difícil saber qué es importante |
| Editor | Un solo modal mezcla crear, editar, importar/exportar, biblioteca y lista de elementos | Abrumador; el formulario compite con la gestión de datos |
| Textos | «Añadir al Catálogo», «Configurar Tablero», «Bitácora», «Perfil de tablero» | Jerga técnica, no lenguaje de familia |
| Feedback | flashStatus es un texto pequeño en el header | Fácil de no ver |
| Onboarding | Un modal de bienvenida, solo la primera vez | Nadie lo vuelve a ver; no hay ayuda contextual |
| Consistencia | Modales con estilos «glass» distintos del resto; breakpoints dispersos (720/768/899/900 px) | Sensación de app «en capas», no coherente |

---

## Fases

### Fase 1 — Jerarquía clara: «una cosa importante por pantalla» (P0)

1. **Reorganizar el header en dos niveles:**
   - Nivel usuario: SOS, categorías, frase, Hablar. (Lo que usa la persona comunicadora.)
   - Nivel cuidador: Agregar, Ajustes, Tutor. Agrupados visualmente (separador o tonalidad distinta).
2. **Composer:** el botón «Hablar Frase» debe ser el único elemento «filled»
   fuerte; Borrar/Limpiar pasan a iconos silenciosos. (Ya casi está; falta
   rebajar el color de Limpiar, que hoy compite con SOS.)
3. **Unificar breakpoints** a dos: ≤720 px (móvil) y >720 px (escritorio).
   Eliminar 768/899/900 salvo necesidad demostrada.
4. **Sistema de mensajes tipo toast** (abajo-centro, con icono ✓/⚠️, 3 s),
   en vez del flashStatus en el header.

### Fase 2 — Editor reimaginado: del «formulario» al «asistente» (P0)

Hoy el editor es un modal técnico. Convertirlo en un flujo guiado:

1. **Pantalla de entrada del editor con 2 tarjetas grandes:**
   - «➕ Crear palabra nueva» (flujo principal)
   - «🗂 Gestionar mis palabras» (lista, editar, borrar)
   - «📦 Biblioteca y respaldo» queda plegado abajo (import/export/cargar biblioteca).
2. **Crear palabra en 3 pasos con barra de progreso:**
   1) Escribe la palabra → 2) Elige imagen (dos botones grandes: «Tomar/Subir foto» y «Buscar pictograma») → 3) Vista previa grande + botón «Añadir al tablero».
3. **Sugerencia de categoría automática:** al escribir «taza» proponer «Casa»
   según palabras existentes; el campo queda pre-rellenado y editable.
4. **Textos en lenguaje llano** en toda la app: «Catálogo»→«tablero»,
   «Bitácora»→«Historial», «Perfil»→«Lugar» (Casa/Escuela/…).

### Fase 3 — Limpieza visual moderna (P1)

1. **Menos bordes y sombras superpuestas:** las tarjetas ya usan tintes de
   categoría; eliminar bordes dobles y `glass` en modales (fondo sólido +
   radio 16–28, una sola sombra MD3 nivel 3).
2. **Espaciado con ritmo 8 px** auditado en composer, toolbar y modales.
3. **Tipografía:** jerarquía real (títulos 20/16, cuerpo 15, etiquetas 13),
   revisar que ningún texto funcional baje de 12 px.
4. **Iconos:** un solo grosor (1.75) ya existe; eliminar los pocos emoji
   restantes en textos visibles (⚠️, 🔒, 📌/📍) sustituyéndolos por SVG del set.

### Fase 4 — Neuro-accesibilidad reforzada (P1)

1. **Modo «Simple»** (nuevo, en Ajustes): oculta búsqueda avanzada, rutinas,
   etiquetas gramaticales y paginación; deja solo tablero + composer + Agregar.
   Un interruptor, sin PIN, para familias que se abruman.
2. **Confirmaciones sin sobresalto:** sustituir `confirm()` nativos
   (biblioteca, borrar historial) por diálogos MD3 con texto de consecuencia
   claro («Esto añadirá ~300 palabras a tu tablero»).
3. **Estados vacíos útiles:** si una categoría no tiene palabras, mostrar
   tarjeta «Aún no hay palabras aquí — pulsa Agregar para crear la primera»
   con botón directo (no una pantalla vacía).
4. **Tutor Mode visible:** indicador persistente y silencioso («Modo guía
   activo») cuando esté encendido, para que el cuidador no olvide salir.
5. **Auditoría de foco:** orden de tabulación header → composer → categorías →
   tablero; focus-visible ya existe, falta verificar modales (trapping) y el
   menú «Más».

### Fase 5 — Ayuda siempre disponible (P2)

1. **Botón «?» en el header** (nivel cuidador) que reabre la guía de 3 pasos —
   el onboarding actual nunca se puede volver a ver.
2. **Micro-ayudas contextuales** la primera vez que se abre cada modal
   (coachmark de una línea, descartable, recordado en localStorage).
3. **Página de ayuda** dentro de Ajustes con los 5 flujos principales en
   lenguaje llano y capturas.

---

## Métricas de éxito (cómo saber que funcionó)

- **Tarea «añadir una palabra con foto propia»** completada por un familiar
  sin instrucciones en < 60 s y ≤ 3 toques desde la pantalla principal.
- 0 controles «filled» compitiendo por pantalla (solo Hablar / SOS / Agregar).
- Lighthouse accesibilidad ≥ 95 y los 26 tests actuales en verde tras cada fase.
- Ningún texto de interfaz con jerga técnica (catálogo, JSON, bitácora…)
  visible para el usuario final.

## Orden sugerido de ejecución

1. Fase 1 (1–2 días) — mayor impacto visual inmediato.
2. Fase 2 (2–3 días) — resuelve la queja original en profundidad.
3. Fases 3–4 (continuo) — pulido.
4. Fase 5 — cuando las anteriores estén estables.

Cada fase termina con `npm run lint` + `npm test` + capturas móvil/escritorio,
como se hizo en la corrección del botón «Agregar» (2026-08-28).
