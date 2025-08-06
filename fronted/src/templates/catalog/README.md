# Catálogo de plantillas

Este directorio contiene componentes de React reutilizables para renderizar catálogos de productos.

## Guías de estilo

- Utiliza **componentes de función** con `props` tipadas.
- Evita dependencias específicas de Next.js u objetos del navegador; las plantillas deben renderizarse en el frontend o en servicios de exportación (por ejemplo, usando `react-dom/server`).
- Compose plantillas a partir de componentes pequeños como `CatalogItem` para facilitar su reutilización.
- Usa clases de TailwindCSS para el estilo; evita estilos en línea salvo que sea imprescindible para exportación.
- Los archivos siguen convención *kebab-case* y exportan componentes nombrados.

## Tipos de imagen admitidos

Los logos deben proporcionarse en formato **JPEG**, **PNG** o **GIF**. Los archivos **SVG** u otros formatos no compatibles se omiten durante la exportación.

## Ejemplo de uso

```tsx
import { CatalogItem } from "@/templates/catalog/catalog-item"

function Example() {
  return <CatalogItem title="Producto" />
}
```