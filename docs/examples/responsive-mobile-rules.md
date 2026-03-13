# Reglas Responsive Mobile — Prevenir Overflow

## Problema
Componentes que se expanden más allá de los límites de la pantalla en mobile, causando scroll horizontal no deseado.

## Reglas Clave

### 1. Contenedores: siempre `w-full min-w-0 overflow-hidden`
```tsx
// Cards
<Card className="border shadow-md w-full min-w-0 overflow-hidden">
  <CardContent className="overflow-hidden">...</CardContent>
</Card>

// Flex containers
<div className="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
  <div className="flex items-start gap-2 w-full min-w-0">...</div>
</div>

// Grid layouts
<div className="grid gap-6 md:grid-cols-2 w-full min-w-0">...</div>
```

### 2. Texto largo: `break-words`, NO solo `truncate`
```tsx
<p className="font-semibold text-sm sm:text-base break-words">{productName}</p>
```

### 3. Iconos y elementos fijos: `flex-shrink-0`
```tsx
<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
<Badge className="text-xs flex-shrink-0">SKU</Badge>
```

### 4. Texto responsive: mobile-first
```tsx
<p className="text-xs sm:text-sm">Metadata</p>
<p className="text-sm sm:text-base">Content</p>
```

### 5. NUNCA usar `min-w-[Xrem]` sin validar en mobile
Preferir `w-8 sm:w-12 flex-shrink-0` sobre `min-w-[6rem]`.

## NUNCA
- `flex-col sm:flex-row` en items de lista sin overflow control estricto
- `min-w-[Xrem]` sin validación mobile
- Solo `truncate` para texto largo en flex containers
- Omitir `overflow-hidden` en Cards o contenedores principales
- Dejar elementos sin `w-full min-w-0` en flex containers

## Patrón de 3 Filas Apiladas (para listas)
```tsx
<div className="flex flex-col gap-2 p-2 sm:p-3 rounded-lg border w-full min-w-0 overflow-hidden">
  {/* Fila 1: Indicador + Título */}
  <div className="flex items-start gap-2 w-full min-w-0">
    <Icon className="w-4 h-4 flex-shrink-0" />
    <p className="font-semibold text-sm sm:text-base break-words">{title}</p>
  </div>
  {/* Fila 2: Metadata */}
  <div className="flex flex-wrap items-center gap-2 text-xs pl-6">
    <Badge>Tag</Badge>
    <span className="whitespace-nowrap">Info</span>
  </div>
  {/* Fila 3: Acción/Valor */}
  <div className="flex justify-between items-center pl-6 pt-1 border-t">
    <p className="text-xs text-muted-foreground">Label</p>
    <p className="text-base font-bold">Value</p>
  </div>
</div>
```

## Verificación
- Probar SIEMPRE en viewport 375px width
- Verificar que NO aparezca scroll horizontal
- Probar con nombres de productos/texto largo

## Referencias
- Componentes de ejemplo: `TopProfitableProducts.tsx`, `LowProfitProducts.tsx`
