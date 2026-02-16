# Solución: Error de Componente Progress Faltante

**Fecha:** 14 de Febrero, 2026
**Error:** Module not found: Can't resolve '@/components/ui/progress'
**Estado:** ✅ Resuelto

---

## Problema

Al acceder a las páginas del módulo de contabilidad, específicamente `/dashboard/accounting/salud`, se presentaba el siguiente error:

```
Module not found: Can't resolve '@/components/ui/progress'
```

### Error Completo

```
GET http://localhost:3000/dashboard/accounting 500 (Internal Server Error)

Uncaught Error: Module not found: Can't resolve '@/components/ui/progress'
  4 | import { Button } from "@/components/ui/button"
  5 | import { AccountingModeToggle } from "@/components/accounting-mode-toggle"
> 6 | import { Progress } from "@/components/ui/progress"
    | ^
  7 | import { Skeleton } from "@/components/ui/skeleton"
  8 | import { useHealthScore } from "../hooks/useHealthScore"
```

---

## Causa Raíz

El componente `Progress` de **shadcn/ui** nunca fue instalado en el proyecto.

Durante el desarrollo de las páginas del Modo Simple de contabilidad, se utilizó el componente `Progress` para mostrar barras de progreso visuales, pero el componente no estaba presente en `fronted/src/components/ui/`.

### Componentes Afectados

- `fronted/src/app/dashboard/accounting/salud/page.tsx` (líneas con Progress bars)

---

## Solución Aplicada

### 1. Instalación del Componente

Ejecutar el CLI de shadcn/ui para instalar el componente Progress:

```bash
cd fronted
npx shadcn@latest add progress
```

Esto creó el archivo:
- `fronted/src/components/ui/progress.tsx`

### 2. Corrección del Import Incorrecto

El CLI de shadcn instaló el componente con un import incorrecto:

**Antes (incorrecto):**
```typescript
import { Progress as ProgressPrimitive } from "radix-ui"
```

**Después (correcto):**
```typescript
import * as ProgressPrimitive from "@radix-ui/react-progress"
```

### 3. Verificación de Dependencias

Confirmamos que la dependencia de Radix UI ya estaba instalada:

```json
"@radix-ui/react-progress": "^1.1.7"
```

---

## Componente Progress Final

```typescript
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

---

## Uso del Componente

### Ejemplo en Salud del Negocio

```typescript
import { Progress } from "@/components/ui/progress"

// Mostrar progreso de salud empresarial
<Progress value={healthData.score} className="mt-4 h-2" />

// Mostrar relación ingresos vs costos
<Progress
  value={(healthData.costos / healthData.ingresos) * 100}
  className="h-2 bg-red-100"
/>
```

---

## Componentes UI Verificados

Después de la corrección, se verificó que todos los componentes UI necesarios estén presentes:

✅ **Componentes Existentes:**
- badge.tsx
- button.tsx
- card.tsx
- **progress.tsx** ← Recién instalado
- skeleton.tsx
- switch.tsx
- label.tsx
- tooltip.tsx

---

## Prevención Futura

### Checklist Antes de Usar Componentes shadcn/ui

1. **Verificar si el componente existe:**
   ```bash
   ls fronted/src/components/ui/[component].tsx
   ```

2. **Instalar componente si falta:**
   ```bash
   cd fronted
   npx shadcn@latest add [component]
   ```

3. **Verificar imports de Radix UI:**
   - Los imports deben usar el formato: `@radix-ui/react-[component]`
   - Nunca usar solo `"radix-ui"` (ese paquete no existe)

4. **Componentes comúnmente usados que pueden faltar:**
   - progress
   - slider
   - separator
   - tabs
   - toast
   - sonner (para notificaciones)

---

## Comandos Útiles

### Listar componentes UI instalados
```bash
ls fronted/src/components/ui/
```

### Instalar múltiples componentes
```bash
npx shadcn@latest add progress slider separator tabs
```

### Verificar dependencias de Radix UI
```bash
grep "@radix-ui" fronted/package.json
```

---

## Resultado

✅ El componente Progress fue instalado correctamente
✅ El import de Radix UI fue corregido
✅ Las páginas de contabilidad se cargan sin errores
✅ Las barras de progreso se muestran correctamente

---

## Commits Relacionados

```bash
git log --oneline --grep="Progress"
```

```
954eed0 fix: add missing Progress component from shadcn/ui
```

---

**Documento creado:** 14/02/2026
**Última actualización:** 14/02/2026
