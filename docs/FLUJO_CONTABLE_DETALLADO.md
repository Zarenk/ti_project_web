# Flujo Contable Detallado del Sistema 📊

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
3. [Ejemplos Reales](#ejemplos-reales)
4. [Estructura de Datos](#estructura-de-datos)
5. [Reportes y Consultas](#reportes-y-consultas)
6. [Plan Contable](#plan-contable)

---

## Arquitectura General

### Modelo Event-Driven (Basado en Eventos)

```
┌─────────────────────────────────────────────────────────────┐
│                    EVENTOS DE NEGOCIO                       │
│  (Venta, Compra, Pago, Ajuste, Nota Crédito, etc)          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    HOOK CONTROLLERS                          │
│  (Escuchan eventos y activan proceso contable)              │
│                                                              │
│  • sale-posted.controller.ts                                │
│  • purchase-posted.controller.ts                            │
│  • payment-posted.controller.ts                             │
│  • inventory-adjusted.controller.ts                         │
│  • credit-note-posted.controller.ts                         │
│  • debit-note-posted.controller.ts                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 ACCOUNTING SERVICES                          │
│  (Generan asientos contables según reglas de negocio)       │
│                                                              │
│  • SaleAccountingService                                    │
│  • PurchaseAccountingService                                │
│  • PaymentAccountingService                                 │
│  • InventoryAccountingService                               │
│  • CreditNoteAccountingService                              │
│  • DebitNoteAccountingService                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ENTRIES SERVICE                           │
│  (Maneja la creación y publicación de asientos)             │
│                                                              │
│  • createDraft() - Crea asiento en estado DRAFT             │
│  • post() - Publica asiento (DRAFT → POSTED)                │
│  • findAll() - Consulta asientos                            │
│  • update() - Modifica asientos DRAFT                       │
│  • delete() - Elimina asientos DRAFT                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BASE DE DATOS (Prisma)                     │
│                                                              │
│  • AccPeriod - Períodos contables (ej: 2026-02)             │
│  • AccEntry - Asientos contables                            │
│  • AccEntryLine - Líneas de cada asiento (Debe/Haber)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 REPORTES Y ANÁLISIS                          │
│                                                              │
│  • Trial Balance (Balance de Comprobación)                  │
│  • General Ledger (Libro Mayor)                             │
│  • Cash Flow Analysis (Análisis de Flujo de Efectivo)       │
│  • Health Score (Salud del Negocio)                         │
│  • PLE Export (Exportación SUNAT)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Flujo Completo Paso a Paso

### Ejemplo: Venta de S/ 118.00

#### PASO 1: Evento de Negocio

El usuario registra una venta en el sistema:

```typescript
// Datos de la venta
{
  saleId: 123,
  total: 118.00,
  salesDetails: [
    {
      product: "Laptop HP",
      quantity: 1,
      price: 100.00,  // Precio de venta sin IGV
      cost: 70.00     // Costo de compra
    }
  ],
  payments: [
    { method: "Efectivo", amount: 118.00 }
  ],
  invoice: {
    serie: "F001",
    nroCorrelativo: "00012345"
  }
}
```

Al finalizar la venta, el sistema emite un **evento interno**:
```typescript
POST /accounting/hooks/sale-posted
{
  saleId: 123,
  timestamp: "2026-02-14T20:30:00Z"
}
```

---

#### PASO 2: Hook Controller (sale-posted.controller.ts)

El controller recibe el evento y lo procesa:

```typescript
@Post()
async handle(@Body() data: SalePostedDto) {
  // 1. Busca la venta completa en la base de datos
  const sale = await this.prisma.sales.findUnique({
    where: { id: data.saleId },
    include: {
      salesDetails: { include: { entryDetail: { include: { product: true } } } },
      payments: { include: { paymentMethod: true } },
      invoices: true,
    },
  })

  // 2. Verifica que no exista duplicado
  const existing = await this.entries.findByInvoice(invoice.serie, invoice.nroCorrelativo)
  if (existing) return { status: 'duplicate' }

  // 3. Genera las líneas del asiento contable
  const lines = this.mapper.buildEntryFromSale(sale)

  // 4. Crea el asiento en estado DRAFT
  const draft = await this.entries.createDraft({
    period: '2026-02',
    date: new Date(),
    serie: 'F001',
    correlativo: '00012345',
    lines: lines
  })

  // 5. Publica el asiento (DRAFT → POSTED)
  await this.entries.post(draft.id)

  return { status: 'posted', entryId: draft.id }
}
```

---

#### PASO 3: Accounting Service (SaleAccountingService)

Este servicio aplica las **reglas contables** para generar el asiento:

```typescript
buildEntryFromSale(sale) {
  // CÁLCULOS
  const total = 118.00
  const subtotal = 100.00  // total / 1.18
  const igv = 18.00        // total - subtotal
  const cost = 70.00       // Costo del producto vendido

  // REGLAS DE NEGOCIO
  const accountCode =
    paymentMethod === 'Yape' ? '1041' : // Banco
    paymentMethod === 'Transferencia' ? '1041' :
    '1011' // Caja

  // GENERA 5 LÍNEAS DEL ASIENTO CONTABLE
  return [
    // 1. ENTRADA DE DINERO (Debe)
    {
      account: '1011',  // Caja (o 1041 si es banco)
      description: 'Cobro F001-00012345 – Efectivo',
      debit: 118.00,
      credit: 0
    },

    // 2. INGRESO POR VENTA (Haber)
    {
      account: '7011',  // Ventas
      description: 'Venta F001-00012345 – Laptop HP',
      debit: 0,
      credit: 100.00
    },

    // 3. IGV POR PAGAR (Haber)
    {
      account: '4011',  // IGV por pagar
      description: 'IGV 18% Venta F001-00012345',
      debit: 0,
      credit: 18.00
    },

    // 4. COSTO DE VENTA (Debe)
    {
      account: '6911',  // Costo de ventas
      description: 'Costo de ventas Laptop HP – F001-00012345',
      debit: 70.00,
      credit: 0,
      quantity: 1
    },

    // 5. SALIDA DE INVENTARIO (Haber)
    {
      account: '2011',  // Mercaderías
      description: 'Salida mercaderías por F001-00012345',
      debit: 0,
      credit: 70.00,
      quantity: 1
    }
  ]
}
```

**Validación del Balance:**
```
DEBE:   118.00 + 70.00 = 188.00
HABER:  100.00 + 18.00 + 70.00 = 188.00
✅ Balance correcto (Debe = Haber)
```

---

#### PASO 4: Entries Service - Crear Draft

```typescript
async createDraft(data) {
  // 1. Obtener o crear período contable
  const period = await this.repo.getOrCreatePeriod('2026-02')

  // 2. Validar que el período esté abierto
  if (period.status !== 'OPEN') {
    throw new BadRequestException('Período cerrado')
  }

  // 3. Calcular totales
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0)   // 188.00
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0) // 188.00

  // 4. Validar balance
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new BadRequestException('Asiento desbalanceado')
  }

  // 5. Crear asiento en estado DRAFT
  const entry = await this.prisma.accEntry.create({
    data: {
      periodId: period.id,
      date: new Date(),
      status: 'DRAFT',
      totalDebit: 188.00,
      totalCredit: 188.00,
      serie: 'F001',
      correlativo: '00012345',
      source: 'sale',
      sourceId: 123,
      organizationId: tenant.organizationId,
      companyId: tenant.companyId
    }
  })

  // 6. Crear líneas del asiento
  for (const line of lines) {
    await this.prisma.accEntryLine.create({
      data: {
        entryId: entry.id,
        account: line.account,
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        quantity: line.quantity
      }
    })
  }

  return entry
}
```

---

#### PASO 5: Publicar Asiento (DRAFT → POSTED)

```typescript
async post(entryId: number) {
  const entry = await this.prisma.accEntry.findUnique({
    where: { id: entryId },
    include: { period: true }
  })

  // Validaciones
  if (entry.status === 'POSTED') {
    throw new BadRequestException('Ya está publicado')
  }

  if (entry.period.status !== 'OPEN') {
    throw new BadRequestException('Período cerrado')
  }

  // Cambiar estado a POSTED
  await this.prisma.accEntry.update({
    where: { id: entryId },
    data: { status: 'POSTED' }
  })

  return entry
}
```

---

#### PASO 6: Almacenamiento en Base de Datos

**Tabla AccPeriod:**
```sql
┌────┬──────────┬────────┐
│ id │   name   │ status │
├────┼──────────┼────────┤
│ 5  │ 2026-02  │ OPEN   │
└────┴──────────┴────────┘
```

**Tabla AccEntry:**
```sql
┌────┬──────────┬────────────┬────────┬────────────┬─────────────┬─────────┬─────────────┬────────┬──────────┬────────────────┬───────────┐
│ id │ periodId │    date    │ status │ totalDebit │ totalCredit │  serie  │ correlativo │ source │ sourceId │ organizationId │ companyId │
├────┼──────────┼────────────┼────────┼────────────┼─────────────┼─────────┼─────────────┼────────┼──────────┼────────────────┼───────────┤
│ 45 │    5     │ 2026-02-14 │ POSTED │   188.00   │   188.00    │  F001   │  00012345   │  sale  │   123    │       1        │     2     │
└────┴──────────┴────────────┴────────┴────────────┴─────────────┴─────────┴─────────────┴────────┴──────────┴────────────────┴───────────┘
```

**Tabla AccEntryLine:**
```sql
┌────┬─────────┬─────────┬───────────────────────────────────────┬────────┬────────┬──────────┐
│ id │ entryId │ account │             description                │  debit │ credit │ quantity │
├────┼─────────┼─────────┼───────────────────────────────────────┼────────┼────────┼──────────┤
│ 1  │   45    │  1011   │ Cobro F001-00012345 – Efectivo         │ 118.00 │   0    │   null   │
│ 2  │   45    │  7011   │ Venta F001-00012345 – Laptop HP        │   0    │ 100.00 │   null   │
│ 3  │   45    │  4011   │ IGV 18% Venta F001-00012345            │   0    │  18.00 │   null   │
│ 4  │   45    │  6911   │ Costo de ventas Laptop HP – F001-00... │  70.00 │   0    │    1     │
│ 5  │   45    │  2011   │ Salida mercaderías por F001-00012345   │   0    │  70.00 │    1     │
└────┴─────────┴─────────┴───────────────────────────────────────┴────────┴────────┴──────────┘
```

---

## Ejemplos Reales

### Ejemplo 2: Compra de Mercadería S/ 590.00

**Evento:**
```typescript
POST /accounting/hooks/purchase-posted
{
  entryId: 456,  // ID del ingreso de mercadería
  timestamp: "2026-02-14T15:00:00Z"
}
```

**Asiento generado:**
```
1. [DEBE] 2011 - Mercaderías ............... S/ 500.00
2. [DEBE] 4011 - IGV por acreditar ......... S/  90.00
3. [HABER] 4211 - Proveedores por pagar .... S/ 590.00
```

---

### Ejemplo 3: Pago a Proveedor S/ 590.00

**Evento:**
```typescript
POST /accounting/hooks/payment-posted
{
  paymentId: 789,
  timestamp: "2026-02-15T10:00:00Z"
}
```

**Asiento generado:**
```
1. [DEBE] 4211 - Proveedores por pagar ..... S/ 590.00
2. [HABER] 1041 - Banco .................... S/ 590.00
```

---

### Ejemplo 4: Ajuste de Inventario (Merma)

**Evento:**
```typescript
POST /accounting/hooks/inventory-adjusted
{
  adjustmentId: 101,
  type: "decrease",
  amount: 50.00,
  timestamp: "2026-02-14T18:00:00Z"
}
```

**Asiento generado:**
```
1. [DEBE] 6561 - Pérdida por merma ......... S/ 50.00
2. [HABER] 2011 - Mercaderías .............. S/ 50.00
```

---

### Ejemplo 5: Nota de Crédito S/ 59.00

**Evento:**
```typescript
POST /accounting/hooks/credit-note-posted
{
  creditNoteId: 202,
  originalSaleId: 123,
  amount: 59.00,
  timestamp: "2026-02-16T12:00:00Z"
}
```

**Asiento generado (revierte parcialmente la venta):**
```
1. [DEBE] 7011 - Ventas (devolución) ....... S/ 50.00
2. [DEBE] 4011 - IGV por pagar ............. S/  9.00
3. [HABER] 1011 - Caja ..................... S/ 59.00
4. [DEBE] 2011 - Mercaderías (regreso) ..... S/ 35.00
5. [HABER] 6911 - Costo de ventas .......... S/ 35.00
```

---

## Reportes y Consultas

### 1. Balance de Comprobación (Trial Balance)

Muestra saldos de todas las cuentas en un período:

```typescript
// GET /accounting/reports/trial-balance?period=2026-02

Query SQL simplificada:
SELECT
  account,
  SUM(debit) as total_debit,
  SUM(credit) as total_credit,
  SUM(debit) - SUM(credit) as balance
FROM AccEntryLine l
JOIN AccEntry e ON l.entryId = e.id
WHERE e.periodId = 5
  AND e.status = 'POSTED'
  AND e.organizationId = 1
GROUP BY account
ORDER BY account
```

**Resultado:**
```
┌─────────┬──────────────┬──────────────┬──────────┐
│ account │  total_debit │ total_credit │ balance  │
├─────────┼──────────────┼──────────────┼──────────┤
│  1011   │   118.00     │     59.00    │   59.00  │ Caja
│  1041   │      0       │    590.00    │ -590.00  │ Banco
│  2011   │   535.00     │    105.00    │  430.00  │ Mercaderías
│  4011   │    90.00     │     27.00    │   63.00  │ IGV
│  4211   │   590.00     │    590.00    │    0     │ Proveedores
│  6911   │    70.00     │     35.00    │   35.00  │ Costo ventas
│  7011   │    50.00     │    100.00    │  -50.00  │ Ventas
└─────────┴──────────────┴──────────────┴──────────┘
```

---

### 2. Libro Mayor (General Ledger)

Detalle de movimientos por cuenta:

```typescript
// GET /accounting/reports/ledger?account=1011&period=2026-02

Query SQL:
SELECT
  e.date,
  e.serie,
  e.correlativo,
  l.description,
  l.debit,
  l.credit
FROM AccEntryLine l
JOIN AccEntry e ON l.entryId = e.id
WHERE l.account = '1011'
  AND e.periodId = 5
  AND e.status = 'POSTED'
ORDER BY e.date, e.id
```

**Resultado:**
```
┌────────────┬─────────┬─────────────┬──────────────────────────┬────────┬────────┬──────────┐
│    date    │  serie  │ correlativo │      description          │  debit │ credit │ balance  │
├────────────┼─────────┼─────────────┼──────────────────────────┼────────┼────────┼──────────┤
│ 2026-02-01 │         │             │ Saldo inicial             │   0    │   0    │    0     │
│ 2026-02-14 │  F001   │  00012345   │ Cobro F001-00012345...    │ 118.00 │   0    │  118.00  │
│ 2026-02-16 │  NC001  │  00000001   │ Devolución NC001-0000...  │   0    │  59.00 │   59.00  │
└────────────┴─────────┴─────────────┴──────────────────────────┴────────┴────────┴──────────┘
```

---

### 3. Análisis de Flujo de Efectivo (Cash Flow)

**Servicio:** `AccountingAnalyticsService.getCashFlow()`

```typescript
async getCashFlow(tenant: TenantContext) {
  // 1. Efectivo disponible (suma de caja + bancos)
  const cashAccounts = ['1011', '1041']
  const disponible = await this.calculateAccountBalance(cashAccounts, tenant)

  // 2. Entradas de hoy (ventas cobradas)
  const entradasHoy = await this.prisma.sales.aggregate({
    where: {
      createdAt: { gte: startOfDay(new Date()) },
      organizationId: tenant.organizationId,
      companyId: tenant.companyId
    },
    _sum: { total: true }
  })

  // 3. Salidas de hoy (compras pagadas)
  const salidasHoy = await this.prisma.entry.aggregate({
    where: {
      createdAt: { gte: startOfDay(new Date()) },
      organizationId: tenant.organizationId,
      companyId: tenant.companyId
    },
    _sum: { total: true }
  })

  // 4. Proyección de la semana
  const proyeccionSemana = disponible +
    (entradasHoy * 7) -
    (salidasHoy * 7)

  // 5. Movimientos recientes
  const movimientosRecientes = await this.getRecentMovements(tenant)

  return {
    disponible,
    entradasHoy,
    salidasHoy,
    proyeccionSemana,
    gastosRecurrentes: salidasHoy * 30, // Estimado mensual
    movimientosRecientes
  }
}
```

---

### 4. Salud del Negocio (Health Score)

**Servicio:** `AccountingAnalyticsService.getHealthScore()`

```typescript
async getHealthScore(tenant: TenantContext) {
  // ACTIVOS (Lo que Tienes)
  const assetAccounts = ['1011', '1041', '2011', '3311']
  const assets = await this.calculateAccountBalance(assetAccounts, tenant)

  // PASIVOS (Lo que Debes)
  const liabilityAccounts = ['4211', '4611', '4711']
  const liabilities = await this.calculateAccountBalance(liabilityAccounts, tenant)

  // PATRIMONIO (Tu Patrimonio)
  const equity = assets - liabilities

  // INGRESOS DEL MES
  const revenueAccounts = ['7011', '7021']
  const revenue = await this.calculateAccountBalance(revenueAccounts, tenant)

  // COSTOS DEL MES
  const expenseAccounts = ['6911', '6311', '6361']
  const expenses = await this.calculateAccountBalance(expenseAccounts, tenant)

  // GANANCIA
  const profit = revenue - expenses
  const margin = (profit / revenue) * 100

  // PUNTUACIÓN DE SALUD (0-100)
  let score = 50

  if (equity > 0) score += 20
  if (profit > 0) score += 20
  if (margin > 20) score += 10

  // ESTADO
  const status =
    score >= 90 ? 'EXCELENTE' :
    score >= 70 ? 'BUENO' :
    score >= 50 ? 'ATENCIÓN' :
    'CRÍTICO'

  return {
    status,
    score,
    loQueTienes: assets,
    loQueDebes: liabilities,
    tuPatrimonio: equity,
    ingresos: revenue,
    costos: expenses,
    ganancia: profit,
    margenGanancia: margin,
    indicators: this.buildHealthIndicators(...)
  }
}
```

---

## Plan Contable Peruano (Simplificado)

### Cuentas Principales del Sistema

#### CLASE 1: ACTIVO DISPONIBLE Y EXIGIBLE
```
1011 - Caja
1041 - Cuentas corrientes operativas (Banco)
1211 - Facturas por cobrar
```

#### CLASE 2: ACTIVO REALIZABLE
```
2011 - Mercaderías manufacturadas
2091 - Mercaderías desvalorizadas
```

#### CLASE 3: ACTIVO INMOVILIZADO
```
3311 - Equipos de procesamiento de información
3361 - Equipos diversos
```

#### CLASE 4: PASIVO
```
4011 - IGV por pagar
4211 - Facturas por pagar
4611 - Remuneraciones por pagar
4711 - Préstamos bancarios
```

#### CLASE 5: PATRIMONIO
```
5011 - Capital social
5911 - Utilidades acumuladas
```

#### CLASE 6: GASTOS POR NATURALEZA
```
6011 - Compras de mercaderías
6311 - Gastos de servicios
6361 - Servicios básicos
6911 - Costo de ventas
```

#### CLASE 7: INGRESOS
```
7011 - Ventas de mercaderías
7021 - Ingresos por servicios
```

---

## Características Especiales

### Multi-Tenancy

Todos los asientos se filtran automáticamente por:
- `organizationId`: Organización del usuario
- `companyId`: Empresa vertical (si existe)

```typescript
// Decorador @CurrentTenant() extrae del JWT
async getCashFlow(@CurrentTenant() tenant: TenantContext) {
  // Todas las queries incluyen filtro automático
  where: {
    organizationId: tenant.organizationId,
    companyId: tenant.companyId
  }
}
```

### Períodos Contables

Los asientos se agrupan por período (ej: `2026-02`):

**Estados de período:**
- `OPEN`: Permite crear/modificar asientos
- `CLOSED`: Solo lectura, no permite cambios
- `LOCKED`: Bloqueado para auditoría

### Estados de Asiento

**DRAFT:**
- Recién creado
- Puede editarse
- No aparece en reportes

**POSTED:**
- Publicado y confirmado
- Solo lectura
- Aparece en todos los reportes

**VOID:**
- Anulado
- Mantiene registro histórico
- No afecta balances

---

## Conclusión

El sistema contable funciona con un flujo automático y robusto:

✅ **Event-Driven:** Cada acción de negocio genera automáticamente su asiento
✅ **Doble Partida:** Todos los asientos están balanceados (Debe = Haber)
✅ **Multi-Tenant:** Aislamiento completo por organización
✅ **Auditable:** Rastreo completo de origen (source/sourceId)
✅ **Flexible:** Permite asientos manuales además de automáticos
✅ **Reportes:** Genera automáticamente Balance, Libro Mayor, PLE
✅ **Análisis:** Cálculo inteligente de flujo de efectivo y salud financiera

---

**Documento generado:** 14/02/2026
**Versión:** 1.0.0
