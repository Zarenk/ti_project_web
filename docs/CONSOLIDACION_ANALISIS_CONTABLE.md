# 🔍 CONSOLIDACIÓN CRÍTICA: Análisis Sistema Contable SUNAT 2026

**ESTADO:** ✅ BORRADOR CONSOLIDADO - Listo para revisión final
**Fecha:** 13 de febrero de 2026
**Revisión:** Análisis exhaustivo con descubrimientos críticos

---

## ⚠️ HALLAZGOS CRÍTICOS: Lo que SÍ existe (y no estaba documentado)

### 🎯 GRAN DESCUBRIMIENTO: Sistema de Asientos Automáticos COMPLETO

**El sistema YA TIENE implementado un sistema robusto de contabilización automática** que NO estaba visible en mi análisis inicial:

#### ✅ Hooks de Contabilización Automática (Backend)

**Ubicación:** `backend/src/accounting/hooks/`

1. **`sale-posted.controller.ts`** ✅
   - Crea asientos automáticos cuando se registra una venta
   - Detecta duplicados por serie/correlativo
   - Registra: Cobro (1011/1041), Venta (7011), IGV (4011), Costo de venta (6911), Salida de inventario (2011)

2. **`purchase-posted.controller.ts`** ✅
   - Crea asientos automáticos de compras
   - Maneja crédito vs contado (4211 vs 1011)
   - Registra: Mercaderías (2011), IGV crédito fiscal (4011), Caja/Cuentas por pagar

3. **`sale-fulfilled.controller.ts`** ✅
   - Asientos cuando se completa una venta pendiente

4. **`payment-posted.controller.ts`** ✅
   - Asientos de pagos independientes

5. **`inventory-adjusted.controller.ts`** ✅
   - Ajustes de inventario (mermas, faltantes, sobrantes)

6. **`credit-note-posted.controller.ts`** ✅
   - Notas de crédito (reversiones de ventas)

7. **`debit-note-posted.controller.ts`** ✅
   - Notas de débito (ajustes positivos)

#### ✅ Servicios de Mapeo Contable

**Ubicación:** `backend/src/accounting/services/`

1. **`sale-accounting.service.ts`** - Lógica de mapeo de ventas
   ```typescript
   buildEntryFromSale(sale: any): SaleEntryLine[] {
     const subtotal = +(sale.total / 1.18).toFixed(2);
     const igv = +(sale.total - subtotal).toFixed(2);
     const cost = /* cálculo de costo */;

     return [
       { account: '1011', debit: sale.total, credit: 0 },      // Caja
       { account: '7011', debit: 0, credit: subtotal },        // Venta
       { account: '4011', debit: 0, credit: igv },             // IGV
       { account: '6911', debit: cost, credit: 0 },            // Costo de venta
       { account: '2011', debit: 0, credit: cost }             // Reducción inventario
     ];
   }
   ```

2. **`purchase-account.service.ts`** - Lógica de compras
   ```typescript
   buildEntryFromPurchase(purchase: PurchaseData): PurchaseEntryLine[] {
     const total = purchase.total;
     const subtotal = total / 1.18;
     const igv = total - subtotal;
     const creditAccount = purchase.isCredit ? '4211' : '1011';

     return [
       { account: '2011', debit: subtotal, credit: 0 },        // Mercaderías
       { account: '4011', debit: igv, credit: 0 },             // IGV crédito
       { account: creditAccount, debit: 0, credit: total }     // Pago
     ];
   }
   ```

3. **`inventory-account.service.ts`** - Ajustes de inventario
4. **`payment-accounting.service.ts`** - Pagos
5. **`credit-note-accounting.service.ts`** - Notas de crédito
6. **`debit-note-accounting.service.ts`** - Notas de débito

#### ✅ Servicio de Gestión de Asientos

**`backend/src/accounting/entries.service.ts`**

- **Estados:** DRAFT (borrador) → POSTED (contabilizado)
- **Periodos:** OPEN (abierto) → LOCKED (cerrado)
- **Multi-tenancy:** Filtros por organizationId y companyId
- **Validación:** Balance debe = haber
- **Detección de duplicados:** Por serie/correlativo de factura
- **Rastreo de origen:** source (sale, inventory_entry, etc.) + sourceId

```typescript
interface Entry {
  id: number;
  period: string;              // "2026-02"
  date: Date;
  serie?: string;              // "F001"
  correlativo?: string;        // "00001234"
  status: EntryStatus;         // DRAFT | POSTED
  totalDebit: number;
  totalCredit: number;
  source?: string;             // "sale" | "inventory_entry"
  sourceId?: number;           // ID del documento origen
  lines: EntryLine[];
}
```

### 🔌 Integración SUNAT (Facturación Electrónica)

**`backend/src/sunat/utils/xml-generator.ts`** ✅

- Generación de XML UBL 2.1 compliant con SUNAT
- Soporta: Factura (01), Boleta (03), Nota de Crédito (07)
- Calcula IGV automáticamente (18%)
- Formato correcto para envío a OSE/SUNAT
- Firmado digital (placeholder - requiere certificado)

```typescript
export function generateInvoiceXML(data: any): string {
  // Genera XML completo con:
  // - UBLVersionID: 2.1
  // - Emisor (RUC, Razón Social)
  // - Cliente (DNI/RUC, Tipo de documento)
  // - Items con IGV desglosado
  // - TaxTotal con subtotal e IGV
  // - LegalMonetaryTotal con total a pagar
}
```

### 📊 Componentes UX Existentes (Reutilizables)

**`fronted/src/components/dashboard-metric-card.tsx`** ✅

- Card con **sparklines** (gráficos de tendencia)
- Hover con tooltip animado
- Temas de color (blue, emerald, amber, violet)
- Responsive y mobile-friendly
- **Perfecto para dashboard contable simplificado**

```typescript
<DashboardMetricCard
  title="Ventas del mes"
  icon={<DollarSign />}
  value="S/. 12,450.00"
  subtitle="+12.5% desde el mes anterior"
  data={sparklines.sales}  // Últimos 30 días
  color="emerald"
/>
```

**`fronted/src/app/dashboard/page.tsx`** ✅

- Dashboard principal YA usa métricas visuales
- Cards clicables que llevan a secciones detalladas
- Actividad reciente con iconos
- Selector de organización para SUPER_ADMIN_GLOBAL

---

## 📋 ANÁLISIS ACTUALIZADO: Gaps Reales

### ❌ Lo que NO existe (Gaps verdaderos)

#### 1. **Exportación PLE** (Crítico para cumplimiento SUNAT)

**No existe ningún método de exportación PLE.** Búsqueda exhaustiva en codebase:
```bash
grep -ri "PLE|ple.*export" backend/src  # 0 resultados
```

**Impacto:**
- 🚨 Incumplimiento legal (multas desde 0.3% UIT)
- 📊 No se pueden presentar libros electrónicos a SUNAT
- ⚖️ Riesgo en auditorías tributarias

**Formatos PLE requeridos:**
- **5.1** - Libro Diario (formato simplificado)
- **5.2** - Libro Diario (formato completo con plan de cuentas)
- **6.1** - Libro Mayor
- **8.1** - Registro de Compras
- **14.1** - Registro de Ventas

#### 2. **Integración SIRE** (Obligatorio desde junio 2026)

**No existe integración con SIRE** (Sistema Integrado de Registros Electrónicos).

**Impacto:**
- 🚨 Obligatorio para contribuyentes PRICOS >2,300 UIT desde **01/06/2026**
- 📝 Reemplaza PLE gradualmente
- 🔗 Requiere sincronización directa con SUNAT (no archivos TXT)

**Componentes faltantes:**
- OAuth SUNAT (autenticación SOL)
- API REST cliente para endpoints SIRE
- Sincronización RCE (Registro de Compras Electrónico)
- Sincronización RVIE (Registro de Ventas e Ingresos Electrónico)

#### 3. **Plan Contable Completo (PCGE 2024)**

**Existe estructura de cuentas, pero incompleta.**

**Estado actual:**
- ✅ Cuentas básicas: 1011 (Caja), 1041 (Banco), 2011 (Mercaderías), 4011 (IGV), 7011 (Ventas), 6911 (Costo de ventas)
- ❌ Faltan cuentas PCGE completas: Activos fijos (33-39), Pasivos (40-49), Patrimonio (50-59), Gastos (60-69), Ingresos (70-79), Cuentas de orden (00-09)

**Impacto:**
- ⚠️ No se pueden registrar: depreciación, sueldos, gastos administrativos, provisiones, préstamos bancarios
- 📊 Estados financieros incompletos

#### 4. **Cálculo PDT 621** (Declaración mensual IGV)

**No existe cálculo automático de IGV a pagar.**

**Impacto:**
- 💰 Usuario debe calcular manualmente IGV ventas - IGV compras
- 📅 Riesgo de errores en declaración mensual
- ⏰ Tiempo desperdiciado

#### 5. **Estados Financieros Formales**

**No existen reportes de:**
- Balance General (Estado de Situación Financiera)
- Estado de Resultados (P&L)
- Estado de Flujos de Efectivo
- Estado de Cambios en el Patrimonio

**Estado actual:**
- ✅ Existe Balance de Comprobación (suma debe/haber por cuenta)
- ❌ No hay agrupación por naturaleza de cuenta
- ❌ No hay formato SUNAT/NIIF

#### 6. **Conciliación Bancaria**

**No existe módulo de conciliación.**

**Impacto:**
- ⚠️ No se detectan diferencias entre libro bancos y estado de cuenta
- 💸 Posibles pérdidas no detectadas

#### 7. **Cierre de Periodos Contables**

**Existe concepto de periodo LOCKED, pero no proceso de cierre.**

**Falta:**
- Asientos de regularización
- Asientos de cierre (clase 8 - cuentas de balance)
- Asientos de apertura del siguiente ejercicio
- Cálculo automático de resultado del ejercicio (cuenta 59)

#### 8. **Interfaz Simplificada para No-Contadores**

**Interfaz actual es técnica:**
- Muestra códigos de cuenta sin explicación ("2011" en lugar de "Mercaderías")
- Usa términos "Debe/Haber" sin tooltips educativos
- No hay wizard para configuración inicial
- Falta dashboard de métricas financieras simples

---

## 🔄 ROADMAP ACTUALIZADO (Basado en hallazgos reales)

### Fase 1: Cumplimiento SUNAT (CRÍTICO - 2 meses, 128 horas)

#### 1.1 Exportación PLE (64 horas)
- [ ] Implementar `AccountingService.exportPLE(period, format)`
- [ ] Formato 5.1 - Libro Diario Simplificado (TXT pipe-delimited)
- [ ] Formato 6.1 - Libro Mayor (TXT pipe-delimited)
- [ ] Validación estructura según PLE v5.2.0.7
- [ ] Generación nombre archivo: `LERRRRRRRRRRRAAAAMMDD050100OOIICC1.txt`
- [ ] Endpoint API: `GET /api/accounting/export/ple?period=2026-02&format=5.1`

**Ejemplo formato 5.1:**
```
20519857538|2026|02|M1|00001|01/02/2026|10|F001|00001234|1||1011|Caja|1250.00|0.00|PEN|1||
20519857538|2026|02|M1|00001|01/02/2026|10|F001|00001234|2||7011|Ventas|0.00|1059.32|PEN|1||
20519857538|2026|02|M1|00001|01/02/2026|10|F001|00001234|3||4011|IGV|0.00|190.68|PEN|1||
```

#### 1.2 Completar PCGE (32 horas)
- [ ] Seed con plan contable completo (ver Anexo A del documento principal)
- [ ] Cuentas de Activo (10-39)
- [ ] Cuentas de Pasivo (40-49)
- [ ] Cuentas de Patrimonio (50-59)
- [ ] Cuentas de Gastos (60-69)
- [ ] Cuentas de Ingresos (70-79)
- [ ] Cuentas de Cierre (80-89)
- [ ] Cuentas de Orden (00-09)

#### 1.3 Validación y Cierre de Periodos (32 horas)
- [ ] Validar balance descuadrado antes de cerrar
- [ ] Generar asientos de regularización (clase 8)
- [ ] Calcular resultado del ejercicio (cuenta 59)
- [ ] Bloquear modificaciones en periodos LOCKED
- [ ] Endpoint: `POST /api/accounting/periods/:id/close`

---

### Fase 2: UX Simplificada (ALTO IMPACTO - 1.5 meses, 96 horas)

**Objetivo:** Hacer la contabilidad **comprensible y amigable** para usuarios sin conocimientos contables.

#### 2.1 Dashboard Contable Simplificado (40 horas)

**Reutilizar:** `DashboardMetricCard` existente

**Nueva página:** `fronted/src/app/dashboard/accounting/page.tsx`

```tsx
import { DashboardMetricCard } from "@/components/dashboard-metric-card"
import { Wallet, Package, AlertTriangle, TrendingUp } from "lucide-react"

export default function AccountingDashboard() {
  const summary = await fetchAccountingSummary()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tu Contabilidad Simplificada</h1>
          <p className="text-muted-foreground">
            Todo lo importante en un solo lugar, sin tecnicismos
          </p>
        </div>
        <Button asChild>
          <Link href="/api/accounting/export/ple?period=2026-02&format=5.1">
            📥 Exportar para SUNAT
          </Link>
        </Button>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Dinero disponible"
          icon={<Wallet className="h-4 w-4 text-green-600" />}
          value={`S/ ${summary.cashAvailable.toLocaleString('es-PE')}`}
          subtitle="Efectivo y bancos que puedes usar ahora"
          data={summary.sparklines.cash}
          color="emerald"
        />

        <DashboardMetricCard
          title="Tu inventario vale"
          icon={<Package className="h-4 w-4 text-blue-600" />}
          value={`S/ ${summary.inventoryValue.toLocaleString('es-PE')}`}
          subtitle={`${summary.productsInStock} productos en almacén`}
          data={summary.sparklines.inventory}
          color="blue"
        />

        <DashboardMetricCard
          title="Impuestos por pagar"
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          value={`S/ ${summary.taxesPending.toLocaleString('es-PE')}`}
          subtitle={`Vence: ${summary.taxDueDate}`}
          data={summary.sparklines.taxes}
          color="amber"
        />

        <DashboardMetricCard
          title="Ganancia del mes"
          icon={<TrendingUp className="h-4 w-4 text-violet-600" />}
          value={`S/ ${summary.netProfit.toLocaleString('es-PE')}`}
          subtitle={`${summary.profitMargin.toFixed(1)}% margen`}
          data={summary.sparklines.profit}
          color="violet"
        />
      </div>

      {/* EXPLICACIÓN CONTEXTUAL */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            ¿Qué significa todo esto?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Wallet className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-medium">Dinero disponible</p>
              <p className="text-sm text-muted-foreground">
                Efectivo en caja (cuenta 1011) + saldo en bancos (cuenta 1041).
                Es el dinero que puedes usar ahora para compras o gastos.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-blue-600 shrink-0" />
            <div>
              <p className="font-medium">Inventario</p>
              <p className="text-sm text-muted-foreground">
                Valor total de productos en almacén (cuenta 2011).
                Es el dinero "guardado" en forma de mercadería.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-medium">Impuestos</p>
              <p className="text-sm text-muted-foreground">
                IGV que debes pagar a SUNAT este mes (cuenta 4011).
                Es el 18% de tus ventas menos el IGV de tus compras.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <TrendingUp className="h-5 w-5 text-violet-600 shrink-0" />
            <div>
              <p className="font-medium">Ganancia</p>
              <p className="text-sm text-muted-foreground">
                Cuánto ganaste este mes (ventas - costos - gastos).
                Es el resultado de tu negocio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ALERTAS Y RECORDATORIOS */}
      {summary.alerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Recordatorios importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{alert.message}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

#### 2.2 Wizard de Exportación SUNAT (24 horas)

**3 pasos guiados:**

```tsx
// fronted/src/app/dashboard/accounting/export/export-wizard.tsx
export function SunatExportWizard() {
  const [step, setStep] = useState(1)
  const [period, setPeriod] = useState('')
  const [format, setFormat] = useState('5.1')

  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar libros para SUNAT</DialogTitle>
          <DialogDescription>
            Te guiaremos paso a paso para generar el archivo que necesita SUNAT
          </DialogDescription>
        </DialogHeader>

        {/* Indicador de progreso */}
        <div className="flex items-center justify-between mb-6">
          <Step num={1} active={step === 1} completed={step > 1} label="Periodo" />
          <div className="h-px flex-1 bg-border mx-2" />
          <Step num={2} active={step === 2} completed={step > 2} label="Tipo de libro" />
          <div className="h-px flex-1 bg-border mx-2" />
          <Step num={3} active={step === 3} completed={step > 3} label="Descargar" />
        </div>

        {/* Paso 1: Selección de periodo */}
        {step === 1 && (
          <div className="space-y-4">
            <Label>¿Qué mes quieres exportar?</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-02">Febrero 2026</SelectItem>
                <SelectItem value="2026-01">Enero 2026</SelectItem>
                <SelectItem value="2025-12">Diciembre 2025</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              💡 Selecciona el periodo contable que quieres reportar a SUNAT
            </p>
          </div>
        )}

        {/* Paso 2: Tipo de libro */}
        {step === 2 && (
          <div className="space-y-4">
            <Label>¿Qué libro electrónico necesitas?</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <RadioGroupItem value="5.1" id="format-5-1" />
                <Label htmlFor="format-5-1" className="flex-1 cursor-pointer">
                  <div className="font-medium">Libro Diario (5.1)</div>
                  <div className="text-sm text-muted-foreground">
                    Registro de todos tus movimientos contables del mes
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4">
                <RadioGroupItem value="6.1" id="format-6-1" />
                <Label htmlFor="format-6-1" className="flex-1 cursor-pointer">
                  <div className="font-medium">Libro Mayor (6.1)</div>
                  <div className="text-sm text-muted-foreground">
                    Resumen por cada cuenta contable (Caja, Bancos, etc.)
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Paso 3: Descarga */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">¡Archivo listo!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Hemos generado tu archivo PLE para SUNAT
              </p>
              <Button asChild size="lg" className="w-full">
                <a href={`/api/accounting/export/ple?period=${period}&format=${format}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar archivo TXT
                </a>
              </Button>
            </div>

            <Card className="bg-blue-50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  ¿Qué hago ahora con este archivo?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>1. Descarga el archivo TXT a tu computadora</p>
                <p>2. Ingresa a <strong>SUNAT Operaciones en Línea</strong> (SOL)</p>
                <p>3. Ve a <strong>PLE - Programa de Libros Electrónicos</strong></p>
                <p>4. Sube el archivo descargado</p>
                <p>5. Valida y envía</p>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Atrás
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!period || !format}>
              Siguiente
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(1)}>
              Exportar otro libro
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.3 Tooltips Educativos y Glosario (16 horas)

**Componente:** `AccountingTooltip`

```tsx
// fronted/src/components/accounting/AccountingTooltip.tsx
export function AccountingTooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const glossary = {
    "Debe": {
      simple: "Lo que ENTRA o AUMENTA",
      example: "Cuando vendes, entra efectivo → va al Debe de Caja"
    },
    "Haber": {
      simple: "Lo que SALE o DISMINUYE",
      example: "Cuando compras, sale efectivo → va al Haber de Caja"
    },
    "IGV": {
      simple: "Impuesto General a las Ventas (18%)",
      example: "Si vendes a S/ 118, el IGV es S/ 18"
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="font-semibold">{glossary[term]?.simple}</p>
          <p className="text-xs text-muted-foreground mt-1">
            💡 {glossary[term]?.example}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Uso en tabla de asientos:
<TableHead>
  <AccountingTooltip term="Debe">
    Debe
  </AccountingTooltip>
</TableHead>
```

#### 2.4 Mapeo Visual de Cuentas (16 horas)

**Función helper:**

```typescript
// fronted/src/lib/accounting/account-labels.ts
export const ACCOUNT_LABELS: Record<string, { name: string; icon: string; color: string }> = {
  "1011": { name: "💵 Caja (Efectivo)", icon: "Wallet", color: "green" },
  "1041": { name: "🏦 Bancos", icon: "Building", color: "blue" },
  "2011": { name: "📦 Mercaderías en almacén", icon: "Package", color: "amber" },
  "4011": { name: "💸 IGV (Impuesto)", icon: "Receipt", color: "red" },
  "7011": { name: "💰 Ventas", icon: "ShoppingCart", color: "emerald" },
  "6911": { name: "📉 Costo de lo que vendiste", icon: "TrendingDown", color: "orange" },
  "4211": { name: "📋 Deudas a proveedores", icon: "FileText", color: "violet" }
}

export function getAccountLabel(code: string): string {
  return ACCOUNT_LABELS[code]?.name ?? `Cuenta ${code}`
}
```

---

### Fase 3: SIRE y Reportes Avanzados (FUTURO - 2 meses, 128 horas)

#### 3.1 Integración SIRE (80 horas)
- [ ] OAuth SUNAT (SOL)
- [ ] Cliente API REST SIRE
- [ ] Sincronización RCE (Registro de Compras)
- [ ] Sincronización RVIE (Registro de Ventas)
- [ ] Dashboard de estado de sincronización

#### 3.2 Estados Financieros (32 horas)
- [ ] Balance General (agrupado por naturaleza)
- [ ] Estado de Resultados (Ventas - Costo - Gastos)
- [ ] Flujo de Efectivo (método directo)
- [ ] PDF exportable con formato NIIF

#### 3.3 Conciliación Bancaria (16 horas)
- [ ] Importar extracto bancario (Excel/CSV)
- [ ] Match automático con movimientos contables
- [ ] Identificar diferencias
- [ ] Generar asientos de ajuste

---

## 🎯 RECOMENDACIONES FINALES

### 1. **Priorizar Fase 1 (Cumplimiento SUNAT)** ⚠️

**Razón:**
- Exportación PLE es **legalmente obligatoria**
- Sin PLE no se pueden presentar libros electrónicos
- Multas SUNAT por incumplimiento
- Cierre de periodos evita modificaciones retroactivas

**Timeline crítico:**
- Implementar antes de cierre fiscal 2026 (marzo/abril)

### 2. **Implementar Fase 2 (UX Simplificada) en paralelo** ✅

**Razón:**
- **Alto impacto en adopción** (usuarios pueden usar el sistema sin ser contadores)
- **Bajo esfuerzo** (reutiliza componentes existentes)
- **Feedback rápido** (validar con usuarios reales)

**Enfoque:**
- Empezar con dashboard simplificado (2 semanas)
- Luego wizard de exportación (1 semana)
- Tooltips y mapeo visual (1 semana)

### 3. **Aprovechar infraestructura existente** 🚀

**Lo que YA funciona bien:**
- ✅ Asientos automáticos (ventas, compras, ajustes)
- ✅ Validación de balance (debe = haber)
- ✅ Multi-tenancy
- ✅ Facturación electrónica (XML SUNAT)
- ✅ Componente DashboardMetricCard (reutilizable)

**NO reinventar la rueda:**
- Usar `DashboardMetricCard` para métricas contables
- Extender servicios de mapeo existentes (`SaleAccountingService`, `PurchaseAccountingService`)
- Reutilizar patrón de hooks (`sale-posted.controller.ts`) para nuevos eventos

### 4. **Configurar IGV dinámico (futuro)** ⚠️

**Problema actual:**
- IGV hardcodeado al 18% en 7 archivos diferentes
- No soporta tasas reducidas (8% restaurantes/hoteles temporalmente)

**Solución propuesta:**
```typescript
// backend/src/accounting/services/tax-rate.service.ts
@Injectable()
export class TaxRateService {
  async getIgvRate(date: Date, businessType?: string): Promise<number> {
    // Consultar configuración de tasas por fecha y tipo de negocio
    if (businessType === 'RESTAURANT' && date < new Date('2026-12-31')) {
      return 0.08; // Tasa reducida temporal
    }
    return 0.18; // Tasa general
  }
}
```

### 5. **Testing con usuarios reales** 👥

**Antes de lanzar Fase 2 (UX):**
- [ ] Probar dashboard simplificado con 5 usuarios sin conocimientos contables
- [ ] Medir: ¿Entienden qué significa cada métrica?
- [ ] Medir: ¿Pueden exportar PLE sin ayuda?
- [ ] Iterar basándose en feedback

**Preguntas clave:**
- "¿Qué significa 'Dinero disponible' para ti?"
- "Si necesitas el archivo para SUNAT, ¿dónde buscarías?"
- "¿Entiendes qué es el IGV y por qué lo pagas?"

---

## 📊 RESUMEN EJECUTIVO

### ✅ Lo que YA existe (Fortalezas)

| Componente | Estado | Calidad |
|------------|--------|---------|
| Asientos automáticos de ventas | ✅ Implementado | Excelente |
| Asientos automáticos de compras | ✅ Implementado | Excelente |
| Hooks de contabilización | ✅ 7 hooks activos | Robusto |
| Servicios de mapeo contable | ✅ 6 servicios | Bien estructurado |
| Gestión de periodos (OPEN/LOCKED) | ✅ Implementado | Funcional |
| Facturación electrónica XML | ✅ UBL 2.1 compliant | Compliant SUNAT |
| Multi-tenancy | ✅ Full support | Excelente |
| Dashboard metrics (reutilizable) | ✅ DashboardMetricCard | UI moderna |

### ❌ Gaps críticos

| Gap | Prioridad | Esfuerzo | Impacto Legal |
|-----|-----------|----------|---------------|
| Exportación PLE | 🔴 CRÍTICO | 64h | Alto (multas) |
| Integración SIRE | 🟡 MEDIO (jun 2026) | 80h | Medio (futuro obligatorio) |
| PCGE completo | 🟡 MEDIO | 32h | Bajo |
| UX simplificada | 🟢 ALTO IMPACTO | 96h | N/A (adopción) |
| Estados financieros | 🟡 MEDIO | 32h | Bajo |
| Cierre de periodos | 🟡 MEDIO | 32h | Medio |
| PDT 621 automático | 🟡 MEDIO | 24h | Bajo (usuario puede calcular) |

### 🎯 Plan de acción inmediato

**Mes 1-2 (Cumplimiento):**
1. Exportación PLE (formatos 5.1 y 6.1)
2. Completar PCGE
3. Proceso de cierre de periodos

**Mes 2-3 (UX):**
4. Dashboard simplificado
5. Wizard de exportación SUNAT
6. Tooltips educativos
7. Testing con usuarios

**Mes 4-6 (Avanzado - opcional):**
8. Integración SIRE
9. Estados financieros
10. Conciliación bancaria

---

## 📎 Anexos

### Anexo A: Archivos Críticos del Sistema Actual

```
backend/src/accounting/
├── hooks/                                    # ✅ Sistema de hooks automáticos
│   ├── sale-posted.controller.ts            # Asientos de ventas
│   ├── purchase-posted.controller.ts        # Asientos de compras
│   ├── credit-note-posted.controller.ts     # Notas de crédito
│   ├── debit-note-posted.controller.ts      # Notas de débito
│   ├── payment-posted.controller.ts         # Pagos
│   ├── inventory-adjusted.controller.ts     # Ajustes de inventario
│   └── sale-fulfilled.controller.ts         # Ventas completadas
├── services/                                 # ✅ Servicios de mapeo contable
│   ├── sale-accounting.service.ts           # Lógica ventas → asientos
│   ├── purchase-account.service.ts          # Lógica compras → asientos
│   ├── credit-note-accounting.service.ts    # Reversión ventas
│   ├── debit-note-accounting.service.ts     # Ajustes positivos
│   ├── inventory-account.service.ts         # Ajustes inventario
│   └── payment-accounting.service.ts        # Pagos
├── accounting.service.ts                     # ✅ Servicio principal (690 líneas)
├── accounting.controller.ts                  # ✅ Endpoints API
└── entries.service.ts                        # ✅ Gestión de asientos contables

backend/src/sunat/
└── utils/
    └── xml-generator.ts                      # ✅ Generación XML UBL 2.1

fronted/src/components/
├── dashboard-metric-card.tsx                 # ✅ Card con sparklines (reutilizable!)
└── accounting/                               # ❌ A CREAR
    ├── AccountingTooltip.tsx                # Tooltips educativos
    ├── SunatExportWizard.tsx                # Wizard 3 pasos
    └── FinancialMetricCard.tsx              # Métricas simplificadas

fronted/src/app/dashboard/accounting/
├── journals/page.tsx                         # ✅ Libro diario (existente)
├── page.tsx                                  # ❌ A CREAR - Dashboard simplificado
└── export/
    └── export-wizard.tsx                     # ❌ A CREAR - Wizard SUNAT
```

### Anexo B: Constantes IGV en el código (a refactorizar)

**Archivos con IGV hardcodeado (18%):**

1. `backend/src/accounting/hooks/purchase-posted.controller.ts:10`
   ```typescript
   const IGV_RATE = 0.18;
   ```

2. `backend/src/accounting/services/sale-accounting.service.ts:30`
   ```typescript
   const subtotal = +(sale.total / 1.18).toFixed(2);
   ```

3. `backend/src/accounting/services/purchase-account.service.ts:18`
   ```typescript
   const subtotal = round2(total / 1.18);
   ```

4. `backend/src/sunat/utils/xml-generator.ts:35`
   ```typescript
   const DEFAULT_IGV_RATE = 0.18;
   ```

5. `fronted/src/app/dashboard/sales/new/sales-form.tsx` (cálculos de IGV en ventas)

6. `fronted/src/app/dashboard/quotes/QuotePdfDocument.tsx` (cálculos en cotizaciones)

**Refactorización recomendada:**
Centralizar en `TaxRateService` y consultar dinámicamente según fecha y tipo de negocio.

---

**FIN DEL DOCUMENTO CONSOLIDADO**

---

Este documento consolida:
- ✅ Hallazgos críticos de infraestructura existente (hooks, servicios, SUNAT XML)
- ✅ Gaps reales (PLE, SIRE, UX simplificada)
- ✅ Roadmap actualizado con esfuerzos realistas
- ✅ Componentes reutilizables identificados (DashboardMetricCard)
- ✅ Priorización: Cumplimiento SUNAT + UX amigable

**Siguiente paso:** Revisión por el usuario y decisión de prioridades de implementación.
