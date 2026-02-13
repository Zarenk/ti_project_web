# Dashboard Contable Simplificado - Diseño Completo

**Fecha:** 13 de febrero de 2026
**Autor:** Claude Code + Usuario
**Estado:** ✅ Aprobado para implementación

---

## 📋 Resumen Ejecutivo

Dashboard contable diseñado para usuarios **sin conocimientos contables** (dueños de PYME, gerentes, vendedores). El sistema les permite:

- ✅ Ver estado financiero en métricas simples (dinero, inventario, impuestos, ganancia)
- ✅ Recibir alertas inteligentes antes de que haya problemas
- ✅ Aprender términos contables con tooltips educativos
- ✅ Exportar libros electrónicos para SUNAT sin ayuda técnica

**Decisiones clave aprobadas:**
- **Alcance:** Dashboard completo (métricas + alertas + tooltips + wizard)
- **Ubicación:** `/dashboard/accounting/page.tsx` (landing page de Contabilidad)
- **Nivel de detalle:** Desglose completo en cada métrica (valor + sparkline + componentes)
- **Alertas:** Card dedicado con semáforo (urgente/warning/positivo)
- **Wizard:** Modal overlay de 3 pasos
- **Tooltips:** Dos niveles (hover rápido + click en (?) para detalle)
- **Responsive:** Mobile-first adaptativo (4 cols → 2 cols → 1 col)

---

## 🏗️ Arquitectura

### Enfoque: Máxima Reutilización de Componentes

```
Frontend (Next.js 14 App Router)
├── /dashboard/accounting/page.tsx (Server Component)
│   ├── AccountingMetricsGrid (Client Component)
│   │   ├── DashboardMetricCard (existente) × 4
│   │   │   └── MetricWithBreakdown wrapper
│   │   └── useAccountingSummary() hook
│   ├── AlertsCard (Client Component)
│   │   ├── AlertItem × N
│   │   └── ExportWizardModal (trigger)
│   ├── ContextualHelpCard (Client Component)
│   └── ExportWizardModal (Client Component)
│       ├── WizardStep1PeriodSelector
│       ├── WizardStep2BookType
│       └── WizardStep3Download

Backend (NestJS)
├── accounting.controller.ts
│   ├── GET /accounting/summary
│   └── GET /accounting/export/ple?period=X&format=Y
├── services/
│   ├── accounting-summary.service.ts
│   └── ple-export.service.ts
```

### Estructura de Directorios

```
fronted/src/
├── app/dashboard/accounting/
│   ├── page.tsx
│   ├── components/
│   │   ├── AccountingMetricsGrid.tsx
│   │   ├── AlertsCard.tsx
│   │   ├── ContextualHelpCard.tsx
│   │   ├── ExportWizardModal.tsx
│   │   ├── WizardStep1PeriodSelector.tsx
│   │   ├── WizardStep2BookType.tsx
│   │   ├── WizardStep3Download.tsx
│   │   └── EducationalTooltip.tsx
│   ├── hooks/
│   │   └── useAccountingSummary.ts
│   └── accounting.api.ts
├── lib/accounting/
│   ├── types.ts
│   ├── account-labels.ts
│   ├── alert-rules.ts
│   └── glossary.ts
└── components/
    └── dashboard-metric-card.tsx (existente, reutilizado)

backend/src/accounting/
├── accounting.controller.ts
├── accounting.module.ts
└── services/
    ├── accounting-summary.service.ts
    ├── ple-export.service.ts
    └── entries.repository.ts (existente)
```

---

## 📊 Métricas del Dashboard

### 1. Dinero Disponible

**Cuentas contables:**
- 1011 - Caja (efectivo)
- 1041 - Bancos (transferencias, Yape, etc.)

**Cálculo:**
```typescript
cashAvailable = Sum(debit_1011 - credit_1011) + Sum(debit_1041 - credit_1041)
```

**Desglose mostrado:**
- Caja: S/ X
- Bancos: S/ Y
- **Total: S/ (X + Y)**
- Comparación: +8.5% vs mes anterior

**Sparkline:** Últimos 30 días de efectivo total

---

### 2. Inventario

**Cuenta contable:**
- 2011 - Mercaderías

**Cálculo:**
```typescript
inventoryValue = Sum(debit_2011 - credit_2011)
productsInStock = Count(Inventory WHERE totalStock > 0)
```

**Desglose mostrado:**
- Mercaderías: S/ X
- Productos en stock: N unidades
- **Total: S/ X**
- Comparación: +12% vs mes anterior

**Alerta:** Si crece >25% → "Inventario alto, considera reducir compras"

**Sparkline:** Últimos 30 días de valor de inventario

---

### 3. Impuestos por Pagar

**Cuenta contable:**
- 4011 - IGV por pagar

**Cálculo:**
```typescript
igvSales = Sum(credit_4011) // IGV cobrado en ventas
igvPurchases = Sum(debit_4011) // IGV pagado en compras
netIgv = igvSales - igvPurchases
taxDueDate = día 18 del mes siguiente
daysUntilDue = differenceInDays(taxDueDate, today)
```

**Desglose mostrado:**
- IGV cobrado (ventas): S/ X
- IGV pagado (compras): S/ Y
- **Diferencia a pagar: S/ (X - Y)**
- Vence: 18 Feb (3 días)

**Alertas:**
- 🔴 Urgente: <5 días para vencer
- 🟡 Warning: <10 días para vencer

**Sparkline:** Últimos 30 días de IGV acumulado

---

### 4. Ganancia del Mes

**Cuentas contables:**
- 7011 - Ventas
- 6911 - Costo de ventas

**Cálculo:**
```typescript
revenue = Sum(credit_7011)
costOfSales = Sum(debit_6911)
grossProfit = revenue - costOfSales
profitMargin = (grossProfit / revenue) × 100
```

**Desglose mostrado:**
- Ventas totales: S/ X
- Costo de ventas: S/ Y
- **Ganancia bruta: S/ (X - Y)**
- Margen: 35% de ganancia

**Alertas:**
- 🟢 Positivo: Si crece >10%
- 🔴 Urgente: Si hay pérdida (netProfit < 0)

**Sparkline:** Últimos 30 días de ganancia acumulada

---

## 🚨 Sistema de Alertas Inteligentes

### Reglas de Alertas

```typescript
// 1. IGV próximo a vencer
if (daysUntilDue <= 5 && taxesPending > 0) {
  alert = {
    type: 'urgent',
    message: 'IGV vence en 3 días (S/ 3,680)',
    actions: ['Exportar para SUNAT', 'Marcar como pagado'],
    dismissible: false,
  }
}

// 2. Inventario alto
if (inventoryGrowth > 25) {
  alert = {
    type: 'warning',
    message: 'Inventario alto (+28% vs mes anterior)',
    actions: ['Ver productos'],
    dismissible: true,
  }
}

// 3. Ganancia positiva (celebración)
if (profitGrowth > 10 && netProfit > 0) {
  alert = {
    type: 'positive',
    message: '¡Ganancia subió 15% este mes!',
    dismissible: true,
  }
}

// 4. Pérdidas
if (netProfit < 0) {
  alert = {
    type: 'urgent',
    message: 'Pérdida este mes: S/ 2,500',
    actions: ['Ver estado de resultados'],
    dismissible: false,
  }
}

// 5. Efectivo bajo
cashToInventoryRatio = (cashAvailable / inventoryValue) × 100
if (cashToInventoryRatio < 5) {
  alert = {
    type: 'warning',
    message: 'Efectivo bajo (3.2% del inventario)',
    dismissible: true,
  }
}
```

### UI de Alertas

**Semáforo visual:**
- 🔴 Urgente: Rojo, no dismissible, requiere acción inmediata
- 🟡 Warning: Amarillo, dismissible, requiere atención
- 🟢 Positivo: Verde, dismissible, feedback positivo

**Persistencia:**
- Alertas descartadas se guardan en localStorage
- Auto-reset cada 7 días
- Alertas no dismissibles reaparecen siempre

---

## 💡 Sistema Educativo (Tooltips)

### Nivel 1: Hover Rápido

```tsx
<EducationalTooltip term="IGV">
  Impuestos por pagar
</EducationalTooltip>

// Hover muestra:
┌───────────────────────────┐
│ Impuesto del 18% en ventas│
└───────────────────────────┘
```

### Nivel 2: Click en (?) para Detalle

```
┌─────────────────────────────────────┐
│ × ¿Qué es IGV?                      │
├─────────────────────────────────────┤
│ Definición:                         │
│ Impuesto General a las Ventas. Es   │
│ el 18% que cobras y pagas a SUNAT.  │
│                                      │
│ 💡 Ejemplo práctico:                │
│ Vendes a S/ 118                     │
│ • Tu ganancia: S/ 100               │
│ • IGV (18%): S/ 18 → a SUNAT        │
│                                      │
│ Pagas: IGV ventas - IGV compras     │
│                                      │
│ Términos relacionados:              │
│ [Impuestos por pagar →]             │
└─────────────────────────────────────┘
```

### Glosario Completo

11 términos implementados:
1. Dinero disponible
2. Caja
3. Bancos
4. Inventario
5. IGV
6. Impuestos por pagar
7. Ganancia
8. Costo de ventas
9. Margen
10. Debe
11. Haber

Cada término incluye:
- ✅ Definición simple (1 línea)
- ✅ Explicación detallada (3-4 líneas)
- ✅ Ejemplo con números
- ✅ Términos relacionados (opcional)

---

## 🧙‍♂️ Wizard de Exportación SUNAT

### Flujo de 3 Pasos

```
┌────────────────────────────────────┐
│ Exportar para SUNAT      [1/3]    │
├────────────────────────────────────┤
│ ●━━━○━━━○  Paso 1: Período        │
│                                     │
│ ¿Qué mes quieres exportar?         │
│ [Dropdown: Febrero 2026 ▼]         │
│                                     │
│ 💡 Selecciona el mes que vas a     │
│    declarar en SUNAT                │
│                                     │
│         [Cancelar]  [Siguiente →]  │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Exportar para SUNAT      [2/3]    │
├────────────────────────────────────┤
│ ●━━━●━━━○  Paso 2: Tipo de libro  │
│                                     │
│ ○ Libro Diario (5.1)               │
│   Registro de movimientos del mes  │
│                                     │
│ ○ Libro Mayor (6.1)                │
│   Resumen por cuenta contable      │
│                                     │
│         [← Atrás]  [Siguiente →]   │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ Exportar para SUNAT      [3/3]    │
├────────────────────────────────────┤
│ ●━━━●━━━●  Paso 3: Descargar      │
│                                     │
│  ✓ ¡Archivo listo!                 │
│                                     │
│  [📥 Descargar archivo TXT]        │
│                                     │
│  ¿Qué hago ahora?                  │
│  1. Descarga el TXT                │
│  2. Ingresa a SUNAT SOL            │
│  3. Sube el archivo en PLE         │
│  4. Valida y envía                 │
│                                     │
│         [← Atrás]  [Finalizar]     │
└────────────────────────────────────┘
```

### Generación de Archivo PLE

**Nombre de archivo:**
```
LE{RUC}{AÑO}{MES}{DÍA}{FORMATO}{INDICADOR}{ESTADO}.txt

Ejemplo:
LE20519857538202602280501001.txt
  └─RUC──┘└─Fecha─┘└F┘└I┘└E┘
```

**Formato 5.1 (Libro Diario):**
```
RUC|Año|Mes|CodAsiento|NroCorr|Fecha|Libro|Serie|Numero|FechaDoc|CodCta|Descripción|Debe|Haber|Moneda|Estado|
20519857538|2026|02|M000001|000001|01/02/2026|10|F001|00001234||1011|Caja|1250.00|0.00|PEN|1|
20519857538|2026|02|M000001|000002|01/02/2026|10|F001|00001234||7011|Ventas|0.00|1059.32|PEN|1|
20519857538|2026|02|M000001|000003|01/02/2026|10|F001|00001234||4011|IGV|0.00|190.68|PEN|1|
```

**Formato 6.1 (Libro Mayor):**
```
RUC|Año|Mes|CodCta|NombreCta|CodAsiento|NroCorr|Fecha|Descripción|Debe|Haber|Moneda|Estado|
20519857538|2026|02|1011|Caja|M000001|000001|01/02/2026|Venta F001-00001234|1250.00|0.00|PEN|1|
20519857538|2026|02|7011|Ventas|M000001|000002|01/02/2026|Venta F001-00001234|0.00|1059.32|PEN|1|
```

---

## 📱 Responsive Design

### Desktop (>1024px)
```
┌─────────────────────────────────────────────────┐
│ [Dinero] [Inventario] [Impuestos] [Ganancia]   │ ← 4 columnas
│                                                  │
│ [━━━━━━━━━━━ Alertas ━━━━━━━━━━━━━━━━━━━━━━━] │ ← Full width
│                                                  │
│ [━━━━━━━━ Explicación contextual ━━━━━━━━━━━━] │
└─────────────────────────────────────────────────┘
```

### Tablet (768px-1024px)
```
┌─────────────────────────┐
│ [Dinero] [Inventario]   │ ← 2 columnas
│ [Impuestos] [Ganancia]  │
│                          │
│ [━━━━ Alertas ━━━━━━━] │
│                          │
│ [━━ Explicación ━━━━━] │
└─────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────┐
│ [Dinero]      │ ← 1 columna
│ [Inventario]  │   scroll vertical
│ [Impuestos]   │
│ [Ganancia]    │
│               │
│ [Alertas]     │
│               │
│ [Explicación] │
└───────────────┘
```

**Adaptaciones móviles:**
- Desglose colapsable (tap para expandir)
- Wizard fullscreen (modal ocupa toda la pantalla)
- Sparklines se mantienen (importantes para tendencias)
- Botones de acción apilados verticalmente

---

## 🔄 Flujo de Datos

### Carga Inicial del Dashboard

```
1. Usuario navega a /dashboard/accounting
   ↓
2. page.tsx (Server Component) renderiza estructura
   ↓
3. AccountingMetricsGrid (Client Component) monta
   ↓
4. useAccountingSummary() hook ejecuta
   ↓
5. fetch('/api/accounting/summary') → Backend
   ↓
6. AccountingSummaryService.calculateSummary()
   ├─ calculateCash() → Consulta cuentas 1011, 1041
   ├─ calculateInventory() → Consulta cuenta 2011 + count inventory
   ├─ calculateTaxes() → Consulta cuenta 4011 + groupBy
   ├─ calculateProfit() → Consulta cuentas 7011, 6911
   └─ calculateSparklines() → Loop 30 días
   ↓
7. Retorna AccountingSummary JSON
   ↓
8. Frontend actualiza estado
   ↓
9. DashboardMetricCard × 4 renderizan con data
   ↓
10. AlertsCard genera alertas (alert-rules.ts)
```

### Exportación PLE

```
1. Usuario click "Exportar para SUNAT" (desde alerta o botón)
   ↓
2. ExportWizardModal abre (step 1)
   ↓
3. Usuario selecciona período (2026-02)
   ↓
4. Usuario selecciona formato (5.1 o 6.1)
   ↓
5. Usuario click "Descargar"
   ↓
6. fetch('/api/accounting/export/ple?period=2026-02&format=5.1')
   ↓
7. PleExportService ejecuta
   ├─ Si 5.1: exportLibroDiario()
   │   ├─ Consulta AccEntry con lines del período
   │   ├─ Genera líneas formato PLE
   │   └─ Retorna TXT string
   └─ Si 6.1: exportLibroMayor()
       ├─ Consulta AccEntryLine agrupado por cuenta
       ├─ Genera líneas formato PLE
       └─ Retorna TXT string
   ↓
8. Backend responde con Blob (text/plain)
   ↓
9. Frontend crea <a> tag con download
   ↓
10. Archivo descargado: LE20519857538202602280501001.txt
```

---

## 🧪 Estrategia de Testing

### Tests Unitarios

**Backend:**
- `accounting-summary.service.spec.ts`
  - ✅ calculateCash() retorna suma correcta de 1011 + 1041
  - ✅ calculateTaxes() calcula IGV sales - purchases
  - ✅ calculateProfit() calcula revenue - cost
  - ✅ calculateSparklines() retorna 30 puntos

- `ple-export.service.spec.ts`
  - ✅ exportLibroDiario() genera formato correcto
  - ✅ exportLibroMayor() agrupa por cuenta
  - ✅ Filename cumple estándar SUNAT

**Frontend:**
- `AccountingMetricsGrid.test.tsx`
  - ✅ Muestra loading state (4 skeletons)
  - ✅ Renderiza summary data correctamente
  - ✅ Muestra error state si falla fetch

- `AlertsCard.test.tsx`
  - ✅ Genera alertas según reglas
  - ✅ Dismiss funciona para alertas dismissible
  - ✅ No muestra alertas si lista vacía

- `ExportWizardModal.test.tsx`
  - ✅ Navega entre pasos correctamente
  - ✅ Valida que período esté seleccionado
  - ✅ Llama API con params correctos

### Tests de Integración

```typescript
// backend/test/accounting.e2e-spec.ts
describe('Accounting Integration', () => {
  it('GET /accounting/summary should return valid summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/accounting/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('cashAvailable');
    expect(response.body.cashAvailable).toBeGreaterThanOrEqual(0);
  });

  it('GET /accounting/export/ple should download TXT', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/accounting/export/ple?period=2026-02&format=5.1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(response.text).toContain('20519857538|2026|02');
  });
});
```

### Tests E2E

```typescript
// fronted/cypress/e2e/accounting-dashboard.cy.ts
describe('Accounting Dashboard E2E', () => {
  it('should display all 4 metrics', () => {
    cy.visit('/dashboard/accounting');
    cy.contains('Dinero disponible').should('be.visible');
    cy.contains('Tu inventario vale').should('be.visible');
    cy.contains('Impuestos por pagar').should('be.visible');
    cy.contains('Ganancia del mes').should('be.visible');
  });

  it('should show sparklines on hover', () => {
    cy.visit('/dashboard/accounting');
    cy.get('[data-metric="cash"]').trigger('mouseenter');
    cy.get('svg').should('be.visible'); // Sparkline chart
  });

  it('should complete export wizard flow', () => {
    cy.visit('/dashboard/accounting');
    cy.contains('Exportar para SUNAT').click();
    cy.get('select#period').select('Febrero 2026');
    cy.contains('Siguiente').click();
    cy.get('input[value="5.1"]').click();
    cy.contains('Siguiente').click();
    cy.contains('Descargar archivo TXT').click();
    cy.readFile('cypress/downloads/LE*.txt').should('exist');
  });
});
```

---

## 📦 Plan de Implementación

### Fase 1: Backend (2-3 días)

**Día 1:**
- ✅ Crear `AccountingSummaryService`
- ✅ Implementar cálculo de 4 métricas
- ✅ Implementar cálculo de sparklines
- ✅ Agregar endpoint `GET /accounting/summary`
- ✅ Tests unitarios del servicio

**Día 2:**
- ✅ Crear `PleExportService`
- ✅ Implementar `exportLibroDiario()` formato 5.1
- ✅ Implementar `exportLibroMayor()` formato 6.1
- ✅ Agregar endpoint `GET /accounting/export/ple`
- ✅ Tests de exportación PLE

**Día 3:**
- ✅ Tests de integración E2E backend
- ✅ Validar formato PLE con archivos de muestra
- ✅ Optimización de queries (índices, agregaciones)

### Fase 2: Frontend (3-4 días)

**Día 4:**
- ✅ Crear estructura de archivos y directorios
- ✅ Implementar `useAccountingSummary` hook
- ✅ Implementar `AccountingMetricsGrid`
- ✅ Reutilizar `DashboardMetricCard` con desglose
- ✅ Configurar tipos TypeScript

**Día 5:**
- ✅ Implementar `AlertsCard` con reglas de alertas
- ✅ Crear `alert-rules.ts` con 5 reglas
- ✅ Implementar persistencia de dismissed alerts
- ✅ Crear `ContextualHelpCard`

**Día 6:**
- ✅ Crear `EducationalTooltip` componente
- ✅ Implementar `glossary.ts` con 11 términos
- ✅ Implementar tooltips nivel 1 (hover)
- ✅ Implementar tooltips nivel 2 (modal detalle)

**Día 7:**
- ✅ Implementar `ExportWizardModal` estructura
- ✅ Crear 3 steps del wizard
- ✅ Integrar con API de exportación
- ✅ Implementar descarga de archivo

### Fase 3: Testing y Documentación (1-2 días)

**Día 8:**
- ✅ Tests unitarios frontend (componentes)
- ✅ Tests E2E (Cypress)
- ✅ Ajustes de diseño responsive
- ✅ Optimización de performance

**Día 9:**
- ✅ Documentación técnica (README)
- ✅ Documentación de usuario (tooltips, wizard)
- ✅ Code review y refactoring
- ✅ Deploy a staging para testing

---

## 🚀 Métricas de Éxito

### KPIs Técnicos
- ✅ Tiempo de carga del dashboard: <2 segundos
- ✅ Tamaño del bundle JS: <150KB gzipped
- ✅ Cobertura de tests: >80%
- ✅ Performance Lighthouse: >90

### KPIs de Usuario
- ✅ 90% de usuarios completan exportación PLE sin ayuda
- ✅ 70% de usuarios entienden métricas sin consultar soporte
- ✅ <5% de errores en archivos PLE subidos a SUNAT
- ✅ Reducción 50% en tiempo de exportación vs proceso manual

### KPIs de Negocio
- ✅ Incremento 30% en precio de suscripción justificado
- ✅ Reducción 70% en consultas a soporte sobre contabilidad
- ✅ Aumento 25% en adopción del módulo contable
- ✅ NPS >8 en usuarios del dashboard

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Formato PLE incorrecto
**Probabilidad:** Media
**Impacto:** Alto (rechazo de SUNAT)
**Mitigación:**
- Validar con archivos PLE de muestra oficiales
- Testing con ambiente sandbox SUNAT
- Documentación clara de estructura

### Riesgo 2: Performance con muchos asientos
**Probabilidad:** Media
**Impacto:** Medio (dashboard lento)
**Mitigación:**
- Usar índices en fechas y cuentas
- Implementar paginación en queries
- Cache de resumen (Redis futuro)

### Riesgo 3: Usuarios no entienden tooltips
**Probabilidad:** Baja
**Impacto:** Medio (confusión)
**Mitigación:**
- Testing con 5 usuarios reales
- Iterar glosario basándose en feedback
- Videos explicativos en help panel

---

## 📚 Referencias

- [SUNAT PLE v5.2.0.7](https://www.sunat.gob.pe/legislacion/oficios/2024/informe-oficios/i220-2024.pdf)
- [Plan Contable General Empresarial](https://www.mef.gob.pe/es/normatividad-sp-9867/por-instrumento/resoluciones/9878-resolucion-n-013-2007-ef-93/file)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React PDF Renderer](https://react-pdf.org/)
- [Shadcn/ui Components](https://ui.shadcn.com/)

---

**FIN DEL DOCUMENTO DE DISEÑO**

_Este diseño ha sido validado sección por sección y está aprobado para implementación._
