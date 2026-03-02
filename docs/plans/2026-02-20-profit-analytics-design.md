# Sistema de Análisis de Utilidades - Diseño

**Fecha:** 2026-02-20
**Autor:** Claude Code
**Módulo:** Sales Dashboard - Profit Analytics

## Resumen

Sistema integral de análisis de utilidades para el dashboard de ventas que incluye:
- Top 10 productos más/menos rentables
- Proyecciones de utilidades mensuales con algoritmos predictivos locales
- Recomendaciones de inversión basadas en margen y rotación
- Interfaz táctil con swipe horizontal en móvil

## Contexto del Producto

### Dominio
1. **Flujo de caja** - Capital entrante vs. invertido en inventario
2. **Rotación de inventario** - Velocidad de venta y reabastecimiento
3. **Margen operativo** - Diferencia real entre costo y precio
4. **Capital inmovilizado** - Stock sin generar retorno
5. **Proyección financiera** - Estimación basada en histórico
6. **Punto de reorden** - Momento óptimo de reinversión

### Paleta de Colores (Dominio)
- Verde esmeralda: Utilidades positivas, productos rentables
- Rojo carmesí: Pérdidas, bajo margen, stock estancado
- Ámbar/Naranja: Alertas, precaución, stock medio
- Azul acero: Proyecciones, datos analíticos
- Gris grafito: Stock inmovilizado
- Dorado: Top performers, alta prioridad

### Elemento Signature
**Investment Score Card** - Componente que combina:
- Margen de utilidad (altura de barra)
- Velocidad de rotación (pulso animado)
- Stock disponible (indicador)
- Score de inversión 0-100 (gradiente de color)

## Decisiones Técnicas

### Enfoque de IA
- **Algoritmos predictivos locales** (no API externa)
- Regresión lineal simple para proyecciones
- Cálculos en backend (NestJS)

### Datos Históricos
- **Últimos 90 días** (3 meses)
- Balance entre tendencias recientes y patrones establecidos
- Suficiente para capturar estacionalidad mensual

### Criterios de Recomendación
- **Margen de utilidad × Velocidad de rotación**
- Maximiza retorno de inversión
- Balance entre rentabilidad y liquidez

### Actualización
- **Tiempo real al cargar la pestaña**
- Loading state durante cálculo (1-3 segundos)
- Datos siempre actualizados

## Arquitectura

### Backend (NestJS)

#### Nuevos Servicios

**1. PredictiveAlgorithmService**
```typescript
projectMonthlyProfit(organizationId, currentMonth)
  → Obtiene ventas últimos 90 días
  → Calcula utilidad diaria
  → Aplica regresión lineal (y = mx + b)
  → Proyecta días restantes del mes
  → Retorna: { current, projected, confidence, trend }
```

**2. InvestmentRecommendationService**
```typescript
calculateInvestmentScore(product)
  → profitMargin = (salePrice - purchasePrice) / purchasePrice
  → rotationSpeed = unitsSold / 90
  → baseScore = profitMargin × rotationSpeed × 100
  → stockFactor = ajuste por nivel de stock
  → Retorna score 0-100
```

**3. ProfitAnalysisService** (Orquestador)
```typescript
getProfitAnalysis(organizationId, dateRange)
  → Obtiene datos de ventas/productos
  → Calcula top 10 rentables (ORDER BY profit DESC)
  → Calcula top 10 no rentables (ORDER BY profit ASC, stock DESC)
  → Genera proyecciones mensuales
  → Calcula scores de inversión
  → Retorna objeto completo
```

#### Nuevo Endpoint
```
GET /api/sales/analytics/profit-analysis
Query params: from, to, organizationId, companyId
Response: {
  top10Profitable: Product[],
  top10Unprofitable: Product[],
  monthProjection: { current, projected, confidence, trend },
  recommendations: { productId, score, priority }[]
}
```

### Frontend (Next.js)

#### Estructura de Componentes

**Nueva pestaña en Tabs:**
```tsx
<TabsTrigger value="analytics">Análisis de Utilidades</TabsTrigger>
```

**Componentes nuevos:**

1. **ProfitAnalyticsTab.tsx** - Container principal
   - Gestiona estado de loading
   - Coordina sub-componentes
   - Maneja dateRange filter

2. **MonthProjectionCard.tsx** - Proyección mensual
   - Utilidad proyectada
   - Sparkline de tendencia 90 días
   - Badge de confianza (Alta/Media/Baja)
   - Días restantes

3. **TopProfitableProducts.tsx** - Top 10 rentables
   - Ranking visual (🥇🥈🥉)
   - Investment Score Card
   - Datos: margen, unidades, rotación, score

4. **LowProfitProducts.tsx** - Top 10 menos rentables
   - Alertas rojas
   - Stock inmovilizado destacado
   - Sugerencias de acción

5. **InvestmentRecommendations.tsx** - Recomendaciones
   - Cards por score
   - Prioridad (Alta/Media/Baja)
   - Breakdown del score

#### API Frontend
```typescript
// sales.api.tsx
export async function getProfitAnalysis(from: string, to: string) {
  const res = await fetch(`/api/sales/analytics/profit-analysis?from=${from}&to=${to}`)
  return res.json()
}
```

## Experiencia Móvil

### Swipe Horizontal para Metric Cards

**Implementación:**
```tsx
<div className="overflow-x-auto snap-x snap-mandatory flex gap-4 pb-4 -mx-4 px-4 md:grid md:grid-cols-4">
  <MetricCard className="min-w-[280px] snap-center" />
  <MetricCard className="min-w-[280px] snap-center" />
  <MetricCard className="min-w-[280px] snap-center" />
  <MetricCard className="min-w-[280px] snap-center" />
</div>
```

**Características:**
- Snap points en cada card
- Scroll suave táctil
- Indicadores de posición (dots)
- Desktop: grid estático 4 columnas

**Breakpoints:**
- Móvil (<640px): 1 card visible, carrusel
- Tablet (640-1024px): 2 cards, scroll horizontal
- Desktop (>1024px): grid estático

## Estados y Manejo de Errores

### Loading States
- Skeleton components durante cálculo
- Loading spinner en botones de acción
- Tiempo estimado: 1-3 segundos

### Estados de Error
- Sin datos suficientes (<30 días): Mensaje informativo
- Error de cálculo: Fallback a datos simples
- Timeout (>5s): Botón "Reintentar"

### Estados Vacíos
- Sin ventas: Ilustración + mensaje
- Sin stock: "Todos agotados"

### Indicadores de Confianza
- Alta (R² > 0.7): Badge verde "Proyección confiable"
- Media (R² 0.4-0.7): Badge amarillo "Proyección moderada"
- Baja (R² < 0.4): Badge rojo "Datos insuficientes"

## Algoritmos Detallados

### Regresión Lineal (Proyección)

```typescript
// Entrada: array de { date, profit }
// Salida: { slope, intercept, r2 }

linearRegression(data: {x: number, y: number}[]) {
  const n = data.length
  const sumX = data.reduce((sum, p) => sum + p.x, 0)
  const sumY = data.reduce((sum, p) => sum + p.y, 0)
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0)
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calcular R² (coeficiente de determinación)
  const yMean = sumY / n
  const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0)
  const ssResidual = data.reduce((sum, p) => {
    const predicted = slope * p.x + intercept
    return sum + Math.pow(p.y - predicted, 2)
  }, 0)
  const r2 = 1 - (ssResidual / ssTotal)

  return { slope, intercept, r2 }
}
```

### Investment Score

```typescript
calculateInvestmentScore(product) {
  // Datos últimos 90 días
  const profitMargin = (product.avgSalePrice - product.avgPurchasePrice) / product.avgPurchasePrice
  const rotationSpeed = product.unitsSold / 90 // unidades/día
  const stockLevel = product.currentStock

  // Score base
  const baseScore = profitMargin * rotationSpeed * 100

  // Ajuste por stock
  let stockFactor = 1.0
  if (stockLevel < 10) stockFactor = 1.2      // Stock bajo → prioridad alta
  else if (stockLevel > 100) stockFactor = 0.8 // Stock alto → menor prioridad

  // Score final (0-100)
  return Math.min(100, Math.max(0, baseScore * stockFactor))
}

// Clasificación de prioridad
getPriority(score) {
  if (score >= 70) return 'ALTA'
  if (score >= 40) return 'MEDIA'
  return 'BAJA'
}
```

## Flujo de Datos Completo

```
1. Usuario carga pestaña "Análisis de Utilidades"
   ↓
2. Frontend muestra skeleton loading
   ↓
3. Llama a getProfitAnalysis(from, to)
   ↓
4. Backend (ProfitAnalysisService):
   a. Consulta Sales + SalesDetail + Products (últimos 90 días)
   b. Calcula en paralelo:
      - Top 10 rentables (margen × cantidad)
      - Top 10 no rentables (bajo margen + alto stock)
      - Proyección mensual (regresión lineal)
      - Scores de inversión (margen × rotación)
   c. Retorna JSON
   ↓
5. Frontend renderiza:
   - MonthProjectionCard con sparkline
   - TopProfitableProducts con ranking visual
   - LowProfitProducts con alertas
   - InvestmentRecommendations ordenadas por score
```

## Patrones Evitados (Defaults)

1. ❌ Tablas aburridas → ✅ Cards visuales con progreso/sparklines
2. ❌ Lista infinita sin jerarquía → ✅ Top 10 con ranking visual
3. ❌ Scroll vertical en móvil → ✅ Carrusel horizontal táctil

## Próximos Pasos de Implementación

1. Backend:
   - [ ] Crear PredictiveAlgorithmService
   - [ ] Crear InvestmentRecommendationService
   - [ ] Crear ProfitAnalysisService
   - [ ] Agregar endpoint en sales.controller
   - [ ] Registrar servicios en sales.module

2. Frontend:
   - [ ] Crear ProfitAnalyticsTab
   - [ ] Crear MonthProjectionCard
   - [ ] Crear TopProfitableProducts
   - [ ] Crear LowProfitProducts
   - [ ] Crear InvestmentRecommendations
   - [ ] Agregar getProfitAnalysis a sales.api
   - [ ] Integrar nueva pestaña en dashboard
   - [ ] Implementar swipe horizontal

3. Testing:
   - [ ] Probar algoritmos con datos reales
   - [ ] Validar proyecciones contra resultados reales
   - [ ] Ajustar pesos y factores si es necesario
   - [ ] Verificar UX móvil (swipe, responsive)

## Notas Técnicas

- Los algoritmos son intencionalmente simples (regresión lineal) para ser predecibles y debuggeables
- El R² nos da confianza en la proyección (>0.7 es confiable)
- El investment score combina rentabilidad (margen) con liquidez (rotación)
- El swipe horizontal usa CSS snap points (no requiere librería externa)
- El cálculo en tiempo real evita stale data pero requiere buen loading UX

## Métricas de Éxito

- Proyecciones con R² > 0.7 en al menos 60% de los casos
- Tiempo de carga < 3 segundos con 1000+ ventas
- Recomendaciones que correlacionen con productos realmente exitosos
- UX móvil fluida (60 FPS en swipe)

---

**Versión:** 1.0
**Estado:** Diseño completo - Listo para implementación
