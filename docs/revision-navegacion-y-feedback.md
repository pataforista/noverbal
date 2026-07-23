# Revisión de navegación, feedback táctil y accesibilidad — HolAAC!

**Fecha:** 2026-07-23 · **Motivo:** la navegación se sentía «clunky», el toque no daba
respuesta perceptible y la app transmitía una sensación anticuada.

Esta revisión se centra en el **«feel»** de la interacción (lo que se siente al tocar),
no en la arquitectura de navegación de fondo —esa ya está diagnosticada y planificada en
`docs/diagnostico-y-plan.md` (hallazgos N-1 a N-10 y fases 4 y 6)—. Aquí se abordan las
causas concretas de la sensación de lentitud y de «app de los 90», y se implementan las
correcciones de bajo riesgo y alto impacto.

---

## Diagnóstico del «feel»

La app ya usaba Material Design 3 (color, sombras, tipografía), así que el problema no era
estético sino de **respuesta a la interacción**:

1. **Sin confirmación inmediata del toque.** No había ninguna señal (visual, háptica) en el
   instante del contacto. En modo «hablar al tocar», la única respuesta era la voz, que
   llega con latencia (`speechSynthesis.cancel()` + arranque del motor TTS): el usuario
   tocaba y «no pasaba nada» durante un momento perceptible.
2. **Animación de pulsado lenta y pesada.** Las casillas usaban `transition: all 0.3s`. El
   `all` obliga al navegador a animar muchas propiedades y 300 ms es demasiado para un
   press: el hundido de la casilla llegaba tarde y difuso, justo lo que se percibe como
   «lento».
3. **Retardo de toque de 300 ms en móvil.** Sin `touch-action: manipulation`, los
   navegadores móviles esperan a descartar un doble-toque antes de disparar el `click`.
   Ese retardo heredado es una de las causas clásicas de sensación «no responde».
4. **Sin vibración.** Ninguna app moderna de este tipo prescinde del háptico; su ausencia
   resta mucha «solidez» percibida a cada acción.
5. **Navegación con scroll perdido.** Al cambiar de categoría el board se reconstruía pero
   la página conservaba el scroll anterior: podías quedar mirando espacio vacío de una
   categoría más corta. El botón «🏠 Inicio» del primer hueco, además, no hacía nada cuando
   ya estabas en Inicio (botón muerto, hallazgo N-7).

En accesibilidad:

6. **`aria-live="polite"` sobre todo el `#grid`.** Como el tablero se reconstruye entero en
   cada interacción, los lectores de pantalla anunciaban las 300+ casillas como ruido en
   cada toque (hallazgo P1-17).
7. **Tema del sistema ignorado.** El modo oscuro era solo manual; no se respetaba
   `prefers-color-scheme` en el primer arranque (P2-19).
8. **`theme-color` estático.** La barra de estado del sistema quedaba clara en tema oscuro
   (P2-12).
9. **Foco perdido al cerrar el selector de categorías** dinámico (P2-20).

---

## Cambios implementados

### Feedback multisensorial en cada toque
- **Ripple Material** que nace en el punto exacto del contacto, generado por un único
  listener delegado de `pointerdown` (cubre casillas, botones, píldoras, tarjetas de
  categoría y de rutina, incluidas las creadas dinámicamente). Da confirmación visual
  instantánea, **independiente de la latencia de la voz**.
- **Vibración háptica breve** (`navigator.vibrate`, ~12 ms) en cada toque, en dispositivos
  compatibles.
- Ambos canales son **desactivables** pensando en usuarios con sensibilidad sensorial: la
  vibración con un nuevo ajuste **«Vibración al tocar»** (Ajustes › Accesibilidad, activado
  por defecto) y el ripple respetando `prefers-reduced-motion`.

### Pulsado instantáneo
- La casilla ahora usa **transiciones específicas y rápidas** en vez de `all 0.3s`: el
  hundido (`transform`) responde en ~50–90 ms con curva enfatizada; la sombra y el color
  siguen a su propio ritmo. El press se siente inmediato y «sólido».
- **`touch-action: manipulation`** en todos los controles interactivos: elimina el retardo
  de ~300 ms y el zoom por doble-toque accidental en móvil.

### Navegación
- Al cambiar de categoría (píldoras y selector modal) el board **vuelve al inicio de la
  página** con scroll suave, así la nueva categoría siempre empieza desde arriba.
- El primer hueco «🏠 Inicio» deja de ser un botón muerto: cuando ya estás en Inicio, ahora
  **sirve para volver arriba** en tableros largos.

### Accesibilidad (normas actuales)
- **`aria-live` retirado del `#grid`** (se conservan `role="region"` y `aria-label`): fin
  del ruido masivo en lectores de pantalla. Los anuncios útiles siguen en `#chips` y
  `#statusText`.
- **`prefers-color-scheme`** respetado en el primer arranque (sin preferencia guardada).
- **`theme-color` dinámico**: la barra del sistema acompaña al tema claro/oscuro.
- **Restauración de foco** al cerrar el selector de categorías, devolviéndolo al control
  que lo abrió.

---

## Qué queda fuera de este cambio (ya planificado)

Las mejoras estructurales de navegación —vocabulario nuclear fijo, `history.pushState` para
el botón Atrás del sistema, paginación con posiciones fijas y barrido fila-columna— son de
mayor esfuerzo y viven en las **fases 4 y 6** de `docs/diagnostico-y-plan.md`. Esta revisión
no las toca; se limita a eliminar la fricción sensorial inmediata, que era la causa directa
de la sensación «clunky» y anticuada.
