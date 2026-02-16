# Interface Design System

Direction
- Intent: cotización rápida y comparación de specs con lectura clara en modo claro/oscuro.
- Depth: bordes suaves + sombras sutiles para overlays (tooltip).
- Spacing: base 4px; chips y tooltips usan padding compacto.

Patterns
- Tooltip ficha técnica:
  - Light: bg `amber-50/95`, border `slate-200`, text `slate-800`, shadow `xl`.
  - Dark: bg `slate-950`, border `slate-800/80`, text `slate-300/100`.
  - Descripción en cápsula: light `bg-white/80`, border `slate-200`, text `slate-700`; dark `bg-slate-900/70`, border `slate-800`, text `slate-200`.
  - Specs: resaltar CPU/RAM/SSD con `font-semibold` y texto más oscuro.
