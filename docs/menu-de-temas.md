# Mejora del menú de temas (categorías)

Se mejoró el menú horizontal de categorías para que sea más usable y accesible cuando hay muchas opciones.

## Cambios aplicados

- Se envolvió la lista de categorías en un contenedor con navegación lateral (`◀` y `▶`) para facilitar el desplazamiento.
- Las categorías ahora se renderizan como botones reales (en lugar de `div`), con:
  - `role="tab"`
  - `aria-selected`
  - manejo de teclado con `Enter` y `Espacio`
- Se añadió `role="tablist"` al contenedor de categorías.
- Los botones laterales se desactivan automáticamente cuando ya no hay más contenido que desplazar.
- Se agregaron estilos de foco visible para mejorar navegación por teclado.

## Beneficio

Cuando el menú no carga "completo" por ancho limitado (móvil/tablet), ahora el usuario puede navegar todas las categorías de manera consistente sin perder accesibilidad.
