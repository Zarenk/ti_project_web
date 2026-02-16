# ADDENDUM: UX/UI SIMPLIFICADA PARA USUARIOS SIN CONOCIMIENTOS CONTABLES

> **⚠️ ACTUALIZACIÓN IMPORTANTE:** Este documento ha sido **consolidado** en un análisis único.
> **Revisar versión consolidada:** [`CONSOLIDACION_ANALISIS_CONTABLE.md`](./CONSOLIDACION_ANALISIS_CONTABLE.md)
> La versión consolidada incluye TODO el contenido UX de este addendum MÁS hallazgos técnicos críticos.

**Complemento al:** ANALISIS_SISTEMA_CONTABLE_SUNAT_2026.md
**Fecha:** 13 de febrero de 2026
**Enfoque:** Diseño de interfaces prácticas y educativas para usuarios no contables
**Estado:** 📄 DOCUMENTO ORIGINAL - Ver consolidación para versión completa

---

## 📌 PREMISA FUNDAMENTAL

> **"El usuario no necesita saber de contabilidad para usar el sistema"**

El sistema debe:
- ✅ **Educar** mientras el usuario trabaja
- ✅ **Simplificar** conceptos contables complejos
- ✅ **Guiar** paso a paso sin abrumar
- ✅ **Validar** y explicar errores en lenguaje simple
- ✅ **Automatizar** todo lo posible (el usuario no debe crear asientos manualmente)

---

## 1. PATRONES UX ACTUALES DEL SISTEMA

### ✅ **Patrones Exitosos Detectados**

#### 1.1 Mapeo de Códigos a Nombres Amigables

**Actualmente en `journals/page.tsx`:**
```typescript
const accountNames: Record<string, string> = {
  "1011": "Caja",
  "1041": "Banco – Yape/Transferencia",
  "1212": "Cuentas por cobrar",
  "2011": "Mercaderías",
  "4011": "IGV por pagar",
  "6911": "Costo de ventas",
  "7011": "Ventas",
};
```

**✅ Aplicar a TODO el módulo contable:**
- Nunca mostrar solo "2011"
- Siempre mostrar: **"Mercaderías (2011)"** o **"2011 • Mercaderías"**
- Para usuarios avanzados: permitir toggle "Mostrar códigos técnicos"

#### 1.2 Onboarding Wizard con Pasos Claros

**`onboarding-wizard-banner.tsx`:**
```typescript
function mapStepKeyToLabel(key: string): string {
  switch (key) {
    case "companyProfile": return "Datos de la empresa"
    case "storeSetup": return "Tiendas y almacenes"
    case "sunatSetup": return "Conectar SUNAT"
    case "dataImport": return "Importación / demo"
  }
}
```

**✅ Aplicar al módulo contable:**
- **Wizard de Configuración Inicial:**
  1. "Configura tu plan de cuentas" (selección de plantilla pre-configurada)
  2. "Conecta tus bancos" (opcional, para conciliación)
  3. "Define tu periodo fiscal" (año fiscal, moneda base)
  4. "¡Listo! Tu contabilidad está configurada"

#### 1.3 Help Panel Interactivo con Imágenes

**`HelpChatPanel.tsx`:**
- ✅ Guías paso a paso expandibles
- ✅ Screenshots integrados
- ✅ Badges de fuente (IA, verificado, estático)
- ✅ Feedback de utilidad (👍 👎)

**✅ Aplicar al módulo contable:**
- Botón flotante "?" en cada pantalla contable
- Ayuda contextual según la pantalla:
  - En Libro Diario: "¿Qué es el libro diario?" → Explicación + video/imágenes
  - En Balance: "¿Cómo leo un balance general?" → Tutorial interactivo

#### 1.4 Indicadores Visuales con Íconos

**En `sales-form.tsx` con métodos de pago:**
```typescript
const getPaymentMethodIcon = (name: string) => {
  if (upper.includes("EFECTIVO")) return <Banknote className="h-4 w-4" />;
  if (upper.includes("YAPE")) return <BrandLogo src="/icons/yape.png" />;
  if (upper.includes("VISA")) return <BrandLogo src="/icons/visa.png" />;
  return <CreditCard className="h-4 w-4" />;
};
```

**✅ Aplicar a cuentas contables:**
```typescript
const getAccountIcon = (code: string) => {
  if (code.startsWith("10")) return <Wallet className="h-4 w-4 text-green-600" />; // Efectivo
  if (code.startsWith("12")) return <FileText className="h-4 w-4 text-blue-600" />; // Cuentas por cobrar
  if (code.startsWith("20")) return <Package className="h-4 w-4 text-orange-600" />; // Inventario
  if (code.startsWith("40")) return <Building className="h-4 w-4 text-red-600" />; // Tributos
  if (code.startsWith("70")) return <TrendingUp className="h-4 w-4 text-emerald-600" />; // Ingresos
  if (code.startsWith("60")) return <TrendingDown className="h-4 w-4 text-rose-600" />; // Gastos
  return <Circle className="h-4 w-4 text-slate-400" />;
};
```

#### 1.5 Vistas Mobile-First con Cards

**En `journals/page.tsx` - Vista móvil:**
```tsx
<div className="space-y-3 md:hidden">
  {dailyLines.map((line) => (
    <div className="rounded-md border p-4 shadow-sm">
      <div className="text-sm font-medium">{line.account}</div>
      <p className="text-xs text-muted-foreground">{accountNames[line.account]}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground">Debe</p>
          <p className="font-medium">{line.debit}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Haber</p>
          <p className="font-medium">{line.credit}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => openDetail(line)}>
        Ver detalle
      </Button>
    </div>
  ))}
</div>
```

**✅ Aplicar a TODAS las pantallas contables:**
- Desktop: Tablas completas con todos los detalles
- Mobile: Cards con información resumida + botón "Ver más"

---

## 2. PROPUESTAS DE UX/UI SIMPLIFICADA

### 2.1 Dashboard Contable "Para Humanos"

**❌ MAL (Interfaz técnica):**
```
┌─────────────────────────────────────────┐
│ Balance de Comprobación - Periodo 2026-01
│ Cuenta   │ Debe        │ Haber      │ Saldo
│ 1011     │ 15,000.00   │ 8,000.00   │ 7,000.00
│ 2011     │ 25,000.00   │ 15,000.00  │ 10,000.00
│ 4011     │ 3,600.00    │ 4,200.00   │ -600.00
└─────────────────────────────────────────┘
```

**✅ BIEN (Interfaz amigable):**
```
┌──────────────────────────────────────────────────────────┐
│  💰 Resumen Financiero - Enero 2026                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  💵 Dinero disponible                      S/ 7,000.00   │
│  ├─ En caja                      S/ 5,000.00            │
│  └─ En bancos                    S/ 2,000.00            │
│                                                           │
│  📦 Valor de tu inventario                S/ 10,000.00   │
│  25 productos en stock                                   │
│                                                           │
│  💸 Impuestos pendientes de pago            S/ 600.00    │
│  Próximo vencimiento: 14 de febrero                     │
│                                                           │
│  ℹ️ ¿Qué significa esto?                                 │
│  Tu negocio tiene S/ 7,000 disponibles para gastar.     │
│  Debes pagar S/ 600 de IGV antes del 14 de febrero.    │
│                                                           │
│  [📊 Ver reportes completos]  [📥 Exportar SUNAT]       │
└──────────────────────────────────────────────────────────┘
```

**Implementación:**

```tsx
// /fronted/src/app/dashboard/accounting/page.tsx

export default function AccountingDashboardPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Tu Contabilidad Simplificada</h1>
      <p className="text-muted-foreground">
        Todo lo importante en un solo lugar, sin tecnicismos
      </p>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Efectivo disponible */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Dinero disponible
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              S/ {summary?.cashAvailable.toLocaleString('es-PE')}
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes usar este dinero ahora
            </p>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>En caja:</span>
                <span>S/ {summary?.cash.toLocaleString('es-PE')}</span>
              </div>
              <div className="flex justify-between">
                <span>En bancos:</span>
                <span>S/ {summary?.bank.toLocaleString('es-PE')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventario */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tu inventario vale
            </CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              S/ {summary?.inventoryValue.toLocaleString('es-PE')}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.productsInStock} productos en stock
            </p>
            <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs">
              Ver detalle de inventario →
            </Button>
          </CardContent>
        </Card>

        {/* Impuestos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Impuestos por pagar
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              S/ {summary?.taxesPending.toLocaleString('es-PE')}
            </div>
            <p className="text-xs text-muted-foreground">
              Vence: {summary?.taxDueDate}
            </p>
            {summary?.daysUntilDue <= 5 && (
              <Alert className="mt-3 py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  ¡Faltan {summary.daysUntilDue} días para vencer!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Explicación contextual */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            ¿Qué significa todo esto?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <ul className="space-y-2">
            <li>
              ✅ <strong>Dinero disponible:</strong> Es el efectivo que puedes usar
              para compras, pagar sueldos o gastos.
            </li>
            <li>
              📦 <strong>Inventario:</strong> El valor de todos los productos que
              tienes en tu almacén.
            </li>
            <li>
              💸 <strong>Impuestos:</strong> Lo que debes pagar a SUNAT este mes
              (principalmente IGV).
            </li>
          </ul>
          <Button variant="link" size="sm" className="mt-3 h-auto p-0">
            Ver tutorial de contabilidad básica →
          </Button>
        </CardContent>
      </Card>

      {/* Acceso a reportes avanzados */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/accounting/journals">
            <BookOpen className="mr-2 h-4 w-4" />
            Libro Diario (para contadores)
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/accounting/balance">
            <TrendingUp className="mr-2 h-4 w-4" />
            Balance General
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/accounting/export">
            <Download className="mr-2 h-4 w-4" />
            Exportar para SUNAT
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

### 2.2 Exportación SUNAT con Wizard Guiado

**Problema:** Usuario no sabe qué es PLE ni cómo exportarlo.

**Solución: Wizard de 3 pasos**

```tsx
// /fronted/src/app/dashboard/accounting/export/page.tsx

const ExportWizard = () => {
  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState('2026-01');
  const [exportType, setExportType] = useState<'diario' | 'mayor' | 'completo'>('completo');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar Libros para SUNAT
        </CardTitle>
        <CardDescription>
          Te guiaremos paso a paso para generar los archivos que SUNAT necesita
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress indicator */}
        <div className="mb-6 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    "h-1 w-12 md:w-24",
                    step > s ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Seleccionar periodo */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Paso 1: ¿Qué mes quieres exportar?</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona el periodo (mes y año) que deseas enviar a SUNAT
            </p>
            <div className="space-y-2">
              <Label>Periodo (mes y año)</Label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                max={format(new Date(), 'yyyy-MM')}
              />
            </div>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>¿Qué periodo debo exportar?</AlertTitle>
              <AlertDescription>
                Normalmente exportas el mes anterior. Si estamos en febrero 2026,
                exporta enero 2026. SUNAT permite presentar hasta 3 meses de atraso.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setStep(2)} className="w-full">
              Continuar →
            </Button>
          </div>
        )}

        {/* Step 2: Seleccionar tipo de libro */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Paso 2: ¿Qué libros necesitas?</h3>
            <p className="text-sm text-muted-foreground">
              Elige la opción según lo que te pida SUNAT o tu contador
            </p>
            <RadioGroup value={exportType} onValueChange={(v: any) => setExportType(v)}>
              <div className="space-y-3">
                <Label
                  htmlFor="completo"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent"
                >
                  <RadioGroupItem value="completo" id="completo" />
                  <div className="flex-1">
                    <div className="font-medium">Exportación completa (Recomendado)</div>
                    <div className="text-xs text-muted-foreground">
                      Incluye Libro Diario y Libro Mayor. Es lo que SUNAT pide normalmente.
                    </div>
                  </div>
                  <Badge>Recomendado</Badge>
                </Label>

                <Label
                  htmlFor="diario"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent"
                >
                  <RadioGroupItem value="diario" id="diario" />
                  <div className="flex-1">
                    <div className="font-medium">Solo Libro Diario</div>
                    <div className="text-xs text-muted-foreground">
                      Todas tus operaciones del día a día (compras, ventas, pagos)
                    </div>
                  </div>
                </Label>

                <Label
                  htmlFor="mayor"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-accent"
                >
                  <RadioGroupItem value="mayor" id="mayor" />
                  <div className="flex-1">
                    <div className="font-medium">Solo Libro Mayor</div>
                    <div className="text-xs text-muted-foreground">
                      Resumen de movimientos por cada cuenta contable
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                ← Atrás
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Generar y descargar */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Paso 3: Genera y descarga tus archivos</h3>
            <p className="text-sm text-muted-foreground">
              Estamos listos para generar los archivos en formato SUNAT
            </p>

            <div className="rounded-lg border bg-slate-50 p-4">
              <h4 className="mb-2 text-sm font-medium">Resumen de tu exportación:</h4>
              <ul className="space-y-1 text-sm">
                <li>📅 <strong>Periodo:</strong> {format(new Date(period + '-01'), 'MMMM yyyy', { locale: es })}</li>
                <li>📄 <strong>Libros:</strong> {exportType === 'completo' ? 'Diario + Mayor' : exportType === 'diario' ? 'Libro Diario' : 'Libro Mayor'}</li>
                <li>📊 <strong>Formato:</strong> TXT (compatible con portal SUNAT)</li>
              </ul>
            </div>

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Antes de descargar</AlertTitle>
              <AlertDescription className="text-amber-800">
                <ul className="mt-2 space-y-1 text-xs">
                  <li>✓ Verifica que todas tus ventas y compras del mes estén registradas</li>
                  <li>✓ Asegúrate de tener los comprobantes (facturas) guardados</li>
                  <li>✓ Si tienes dudas, consulta con tu contador antes de enviar a SUNAT</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => handleExport(exportType, period)}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Descargar archivos para SUNAT
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                ← Atrás
              </Button>
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
                Reiniciar
              </Button>
            </div>

            {/* Ayuda post-descarga */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">¿Qué hago después de descargar?</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-blue-900">
                <ol className="space-y-2">
                  <li>1. Abre el portal SUNAT SOL: <a href="https://www.sunat.gob.pe" className="underline">www.sunat.gob.pe</a></li>
                  <li>2. Ve a "Libros Electrónicos" → "Programa de Libros Electrónicos (PLE)"</li>
                  <li>3. Sube el archivo TXT que acabas de descargar</li>
                  <li>4. Valida que no haya errores</li>
                  <li>5. Envía a SUNAT</li>
                </ol>
                <Button variant="link" size="sm" className="mt-3 h-auto p-0 text-blue-600">
                  Ver tutorial completo con capturas →
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 2.3 Asientos Contables "Invisibles" con Explicaciones

**Concepto:** El usuario NO crea asientos manualmente. El sistema los genera automáticamente, pero puede verlos explicados en lenguaje simple.

```tsx
// /fronted/src/app/dashboard/accounting/entries/[id]/page.tsx

export default function EntryDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [entry, setEntry] = useState<AccEntry | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  if (!entry) return <LoadingSpinner />;

  return (
    <div className="space-y-6 p-6">
      {/* Explicación en lenguaje simple */}
      <Card>
        <CardHeader>
          <CardTitle>
            {entry.source === 'sale' && '🛒 Registro de Venta'}
            {entry.source === 'inventory_entry' && '📦 Registro de Compra'}
            {entry.source === 'manual' && '✏️ Registro Manual'}
          </CardTitle>
          <CardDescription>
            {new Date(entry.date).toLocaleDateString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Explicación amigable */}
          {entry.source === 'sale' && (
            <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
              <h3 className="mb-2 font-semibold text-green-900">
                ¿Qué pasó en esta venta?
              </h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li>
                  ✅ <strong>Recibiste:</strong> S/ {entry.totalDebit.toLocaleString('es-PE')} {' '}
                  (el dinero entró a tu caja o banco)
                </li>
                <li>
                  📦 <strong>Entregaste:</strong> Productos por un costo de S/ {getCostFromLines(entry.lines)} {' '}
                  (salieron de tu inventario)
                </li>
                <li>
                  💰 <strong>Ganaste:</strong> S/ {getProfit(entry.lines).toLocaleString('es-PE')} {' '}
                  (diferencia entre lo que cobraste y lo que te costó)
                </li>
                <li>
                  💸 <strong>IGV cobrado:</strong> S/ {getIGV(entry.lines).toLocaleString('es-PE')} {' '}
                  (que luego pagarás a SUNAT)
                </li>
              </ul>
            </div>
          )}

          {entry.source === 'inventory_entry' && (
            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
              <h3 className="mb-2 font-semibold text-blue-900">
                ¿Qué pasó en esta compra?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  📦 <strong>Compraste:</strong> Mercadería por S/ {getBase(entry.lines).toLocaleString('es-PE')}
                </li>
                <li>
                  💸 <strong>IGV pagado:</strong> S/ {getIGV(entry.lines).toLocaleString('es-PE')} {' '}
                  (puedes deducir este monto de lo que pagas a SUNAT)
                </li>
                <li>
                  💵 <strong>Pagaste en total:</strong> S/ {entry.totalCredit.toLocaleString('es-PE')} {' '}
                  {entry.paymentMethod && `(vía ${entry.paymentMethod})`}
                </li>
                {entry.serie && entry.correlativo && (
                  <li>
                    📄 <strong>Comprobante:</strong> {entry.serie}-{entry.correlativo} {' '}
                    {entry.invoiceUrl && (
                      <a href={entry.invoiceUrl} target="_blank" className="underline">
                        Ver PDF
                      </a>
                    )}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Toggle para ver detalles técnicos */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTechnical(!showTechnical)}
            className="mt-4"
          >
            {showTechnical ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Ocultar detalles técnicos
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles técnicos (para contadores)
              </>
            )}
          </Button>

          {/* Vista técnica colapsable */}
          {showTechnical && (
            <div className="mt-4 rounded-lg border bg-slate-50 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-700">
                Asiento Contable (Debe y Haber)
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Debe</TableHead>
                    <TableHead className="text-right">Haber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {line.account}
                        <div className="text-xs text-muted-foreground">
                          {getAccountName(line.account)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{line.description}</TableCell>
                      <TableCell className="text-right">
                        {line.debit > 0 ? line.debit.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.credit > 0 ? line.credit.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-2 text-xs text-muted-foreground">
                ℹ️ Los asientos contables registran cada movimiento en dos cuentas:
                una al Debe y otra al Haber, manteniendo el balance.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones relacionadas */}
      <div className="flex gap-3">
        {entry.source === 'sale' && entry.sourceId && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sales/${entry.sourceId}`}>
              Ver venta original
            </Link>
          </Button>
        )}
        {entry.source === 'inventory_entry' && entry.sourceId && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/entries/${entry.sourceId}`}>
              Ver compra original
            </Link>
          </Button>
        )}
        {entry.invoiceUrl && (
          <Button variant="outline" asChild>
            <a href={entry.invoiceUrl} target="_blank">
              <FileText className="mr-2 h-4 w-4" />
              Abrir comprobante
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 2.4 Validaciones y Mensajes de Error Educativos

**❌ MAL:**
```
Error: Asiento desbalanceado. La suma del debe (2360.00) no coincide con la suma del haber (2000.00)
```

**✅ BIEN:**
```tsx
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>El registro contable no cuadra</AlertTitle>
  <AlertDescription>
    <p className="mb-2">
      Los números no están balanceados:
    </p>
    <ul className="ml-4 list-disc space-y-1 text-xs">
      <li>Lo que entra (Debe): S/ 2,360.00</li>
      <li>Lo que sale (Haber): S/ 2,000.00</li>
      <li><strong>Diferencia: S/ 360.00</strong></li>
    </ul>
    <p className="mt-3 text-xs">
      💡 <strong>¿Qué hacer?</strong> Revisa que hayas incluido el IGV correctamente.
      Si el total de la compra es S/ 2,360, entonces:
    </p>
    <ul className="ml-4 list-disc text-xs">
      <li>Base: S/ 2,000 (cuenta 2011)</li>
      <li>IGV 18%: S/ 360 (cuenta 4011)</li>
      <li>Total a pagar: S/ 2,360 (cuenta 1011 o 4211)</li>
    </ul>
  </AlertDescription>
</Alert>
```

### 2.5 Tooltips Contextuales en TODO el Módulo

```tsx
// Componente reutilizable de ayuda contextual

const AccountHelp = ({ accountCode }: { accountCode: string }) => {
  const help = getAccountHelp(accountCode);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5">
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold">{help.name}</div>
          <div className="text-xs text-muted-foreground">{help.description}</div>
          {help.example && (
            <div className="mt-2 rounded bg-slate-100 p-2 text-xs">
              <strong>Ejemplo:</strong> {help.example}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Base de datos de ayudas contextuales
const accountHelpDatabase: Record<string, AccountHelpInfo> = {
  '1011': {
    name: 'Caja',
    description: 'Efectivo que tienes en tu caja registradora o en mano',
    example: 'Cuando un cliente te paga en efectivo, ese dinero entra aquí'
  },
  '1041': {
    name: 'Cuentas Corrientes en Bancos',
    description: 'Dinero que tienes en tus cuentas bancarias',
    example: 'Cuando recibes una transferencia o pago con Yape/Plin, va aquí'
  },
  '2011': {
    name: 'Mercaderías',
    description: 'Productos que tienes para vender (tu inventario)',
    example: 'Cuando compras 10 laptops a S/ 1,000 c/u, registras S/ 10,000 aquí'
  },
  '4011': {
    name: 'IGV - Impuesto General a las Ventas',
    description: 'Es el 18% que cobras en ventas o pagas en compras. Lo liquidas mensualmente con SUNAT',
    example: 'Si vendes S/ 118, cobras S/ 100 + S/ 18 de IGV que luego pagas a SUNAT'
  },
  '7011': {
    name: 'Ventas de Mercaderías',
    description: 'Ingresos por la venta de tus productos',
    example: 'Si vendes un producto en S/ 100 (sin IGV), ese monto va aquí'
  },
  '6911': {
    name: 'Costo de Ventas',
    description: 'Cuánto te costó el producto que vendiste',
    example: 'Si vendiste una laptop que te costó S/ 800, ese costo va aquí'
  },
};
```

---

## 3. COMPONENTES UI REUTILIZABLES

### 3.1 FinancialMetricCard - Tarjeta de Métrica con Explicación

```tsx
// /fronted/src/components/accounting/financial-metric-card.tsx

interface FinancialMetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  helpText?: string;
  trend?: { value: number; label: string };
  variant?: 'success' | 'warning' | 'danger' | 'info';
}

export const FinancialMetricCard = ({
  title,
  value,
  icon,
  description,
  helpText,
  trend,
  variant = 'info'
}: FinancialMetricCardProps) => {
  const colors = {
    success: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    danger: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  };

  const color = colors[variant];

  return (
    <Card className={cn('border-2', color.border)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={cn('rounded-full p-2', color.bg)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', color.text)}>
          S/ {value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### 3.2 AccountingHelp - Panel de ayuda contextual

```tsx
// /fronted/src/components/accounting/accounting-help-panel.tsx

interface AccountingHelpPanelProps {
  section: 'dashboard' | 'diario' | 'balance' | 'export';
}

export const AccountingHelpPanel = ({ section }: AccountingHelpPanelProps) => {
  const helpContent = {
    dashboard: {
      title: '¿Qué veo en esta pantalla?',
      items: [
        {
          question: '¿Qué es "Dinero disponible"?',
          answer: 'Es el efectivo que puedes usar ahora mismo: lo que hay en caja + bancos.'
        },
        {
          question: '¿Por qué el inventario tiene valor?',
          answer: 'Porque compraste productos que aún no has vendido. Es como dinero "congelado" en mercadería.'
        },
        {
          question: '¿Qué son los "Impuestos pendientes"?',
          answer: 'Es el IGV que cobraste en ventas menos el IGV que pagaste en compras. Si es positivo, lo pagas a SUNAT.'
        }
      ]
    },
    diario: {
      title: 'Libro Diario - ¿Para qué sirve?',
      items: [
        {
          question: '¿Qué es el Libro Diario?',
          answer: 'Es como el "historial bancario" de tu negocio: registra TODO lo que entra y sale, día por día.'
        },
        {
          question: '¿Por qué cada operación tiene Debe y Haber?',
          answer: 'Porque cada movimiento afecta 2 cosas. Ejemplo: compras mercadería (aumenta inventario) y pagas efectivo (disminuye caja).'
        },
        {
          question: '¿Debo registrar manualmente aquí?',
          answer: 'NO. El sistema lo hace automáticamente cuando registras ventas o compras. Solo consulta aquí.'
        }
      ]
    },
    balance: {
      title: 'Balance General - Tu "foto financiera"',
      items: [
        {
          question: '¿Qué es el Balance General?',
          answer: 'Es una "foto" de tu negocio: qué tienes (activos), qué debes (pasivos) y cuánto es tuyo (patrimonio).'
        },
        {
          question: '¿Cómo leo el Balance?',
          answer: 'Simple: Activos = Pasivos + Patrimonio. Lo que tienes = lo que debes + lo que es tuyo.'
        },
        {
          question: '¿Para qué sirve?',
          answer: 'Para saber si tu negocio está sano: si tienes más activos que deudas, vas bien.'
        }
      ]
    },
    export: {
      title: 'Exportar a SUNAT - Paso a paso',
      items: [
        {
          question: '¿Qué archivos necesita SUNAT?',
          answer: 'Principalmente el Libro Diario y Libro Mayor en formato TXT. Este sistema los genera automáticamente.'
        },
        {
          question: '¿Cuándo debo exportar?',
          answer: 'Mensualmente, hasta el día 10-22 del mes siguiente (según tu RUC).'
        },
        {
          question: '¿Qué hago con el archivo descargado?',
          answer: 'Lo subes al portal SUNAT SOL, sección "Libros Electrónicos". Si no sabes, pide ayuda a tu contador.'
        }
      ]
    }
  };

  const content = helpContent[section];

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-5 w-5 text-purple-600" />
          {content.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {content.items.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-sm font-medium text-purple-900">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-purple-800">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Button variant="link" size="sm" className="mt-3 h-auto p-0 text-purple-600">
          Ver tutorial completo en video →
        </Button>
      </CardContent>
    </Card>
  );
};
```

---

## 4. FLUJOS DE USUARIO MEJORADOS

### 4.1 Primer Uso del Módulo Contable

```
Usuario entra por primera vez a /dashboard/accounting

↓

[Pantalla de Bienvenida]
┌────────────────────────────────────────────────────────┐
│  🎉 ¡Bienvenido a tu Contabilidad Simplificada!        │
│                                                         │
│  No te preocupes, no necesitas ser contador para usar  │
│  este módulo. Te guiaremos en cada paso.               │
│                                                         │
│  ¿Qué puedes hacer aquí?                               │
│  ✅ Ver cuánto dinero tienes disponible                │
│  ✅ Revisar tus ventas e ingresos automáticamente      │
│  ✅ Exportar libros contables para SUNAT               │
│  ✅ Generar reportes para tu banco o inversionistas    │
│                                                         │
│  [📚 Ver tutorial de 3 minutos]  [Empezar ahora →]    │
└────────────────────────────────────────────────────────┘

↓ (Usuario hace clic en "Empezar ahora")

[Wizard de Configuración Inicial - 3 pasos]
Paso 1: "Cuéntanos sobre tu negocio"
- ¿Qué moneda usas? [PEN - Soles] [USD - Dólares]
- ¿Cuándo empieza tu año fiscal? [Enero] [Otro mes]

Paso 2: "Conecta tus cuentas bancarias" (Opcional)
- Banco de la Nación: [Conectar] [Después]
- BCP: [Conectar] [Después]
- Interbank: [Conectar] [Después]
- "O agrega manualmente tus bancos después"

Paso 3: "¡Todo listo!"
- Tu contabilidad ya está configurada
- A partir de ahora, cada venta y compra que registres
  se reflejará automáticamente en tu contabilidad
- [Ir al Dashboard →]
```

### 4.2 Usuario Descubre un Error en un Asiento

```
Usuario ve en Libro Diario un asiento que parece incorrecto

↓

[Botón visible: "¿Ves algo mal?"]

↓ (Click)

[Dialog de Ayuda]
┌────────────────────────────────────────────────────────┐
│  ⚠️ ¿Encontraste un error en este registro?            │
│                                                         │
│  Los asientos contables se generan automáticamente     │
│  desde tus ventas y compras. Si ves un error:          │
│                                                         │
│  1️⃣ Verifica la venta o compra original                │
│     [Ver operación original]                           │
│                                                         │
│  2️⃣ Si la operación original está mal:                 │
│     - Corrígela allí (no aquí)                         │
│     - El asiento se actualizará automáticamente        │
│                                                         │
│  3️⃣ Si el asiento sigue mal después de corregir:       │
│     [Reportar al contador] o [Contactar soporte]       │
│                                                         │
│  ⚠️ NO intentes editar el asiento directamente         │
│     Esto puede descuadrar tu contabilidad              │
└────────────────────────────────────────────────────────┘
```

---

## 5. GLOSARIO INTEGRADO EN LA UI

### 5.1 Componente de Glosario Flotante

```tsx
// /fronted/src/components/accounting/glossary-popover.tsx

const ACCOUNTING_GLOSSARY: Record<string, GlossaryTerm> = {
  'debe': {
    simple: 'Lo que ENTRA o AUMENTA',
    detailed: 'En contabilidad, el Debe registra aumentos de activos (lo que tienes) o disminuciones de pasivos (lo que debes).',
    example: 'Si recibes S/ 100 en caja, registras S/ 100 al Debe de la cuenta Caja.'
  },
  'haber': {
    simple: 'Lo que SALE o DISMINUYE',
    detailed: 'El Haber registra disminuciones de activos o aumentos de pasivos e ingresos.',
    example: 'Si pagas S/ 50 en efectivo, registras S/ 50 al Haber de la cuenta Caja.'
  },
  'igv': {
    simple: 'Impuesto del 18% sobre ventas',
    detailed: 'Impuesto General a las Ventas. Lo cobras cuando vendes (18% sobre el precio) y lo pagas a SUNAT mensualmente, descontando el IGV que tú pagaste en compras.',
    example: 'Vendes S/ 100 → Cobras S/ 118 (S/ 100 + S/ 18 IGV). Después pagas ese S/ 18 a SUNAT.'
  },
  'activo': {
    simple: 'Lo que TIENES (caja, inventario, etc.)',
    detailed: 'Recursos de valor que posee tu negocio: efectivo, productos en almacén, equipos, cuentas por cobrar.',
    example: 'Tienes S/ 5,000 en caja + S/ 10,000 en inventario = S/ 15,000 en activos.'
  },
  'pasivo': {
    simple: 'Lo que DEBES (deudas, impuestos)',
    detailed: 'Obligaciones que debes pagar: deudas con proveedores, préstamos bancarios, impuestos por pagar.',
    example: 'Debes S/ 3,000 a un proveedor + S/ 500 de IGV a SUNAT = S/ 3,500 en pasivos.'
  },
  'patrimonio': {
    simple: 'Lo que es TUYO (activos - pasivos)',
    detailed: 'El valor neto de tu negocio. Es lo que quedaría para ti si vendieras todo (activos) y pagaras todas las deudas (pasivos).',
    example: 'Tienes S/ 15,000 en activos y debes S/ 3,500 en pasivos = Tu patrimonio es S/ 11,500.'
  }
};

export const GlossaryPopover = ({ term }: { term: string }) => {
  const glossary = ACCOUNTING_GLOSSARY[term.toLowerCase()];

  if (!glossary) return <span>{term}</span>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="link"
          className="h-auto p-0 font-semibold underline decoration-dotted underline-offset-4"
        >
          {term}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold">{term}</h4>
          <p className="text-sm text-primary">{glossary.simple}</p>
          <p className="text-xs text-muted-foreground">{glossary.detailed}</p>
          {glossary.example && (
            <div className="rounded bg-slate-100 p-2 text-xs">
              <strong>Ejemplo:</strong> {glossary.example}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Uso en cualquier texto:
<p>
  El total del <GlossaryPopover term="debe" /> debe ser igual al <GlossaryPopover term="haber" />.
</p>
```

---

## 6. CHECKLIST DE IMPLEMENTACIÓN UX

### ✅ **Antes de Lanzar Cualquier Pantalla Contable:**

- [ ] **¿Hay un título claro?** - El usuario debe saber dónde está en 1 segundo
- [ ] **¿Hay una descripción de 1 línea?** - Qué hace esta pantalla
- [ ] **¿Los términos técnicos tienen tooltip?** - Hover sobre "Debe", "Haber", "IGV" muestra explicación
- [ ] **¿Hay ayuda contextual visible?** - Botón "?" o panel de ayuda
- [ ] **¿Los códigos de cuenta tienen nombres amigables?** - "1011 • Caja", no solo "1011"
- [ ] **¿Los números tienen formato local?** - S/ 1,234.56 (con comas y 2 decimales)
- [ ] **¿Hay iconos visuales?** - Cada tipo de cuenta con su ícono/color
- [ ] **¿Funciona en móvil?** - Cards en lugar de tablas, botones grandes
- [ ] **¿Los mensajes de error son educativos?** - No técnicos, explican QUÉ pasó y CÓMO arreglarlo
- [ ] **¿Hay ejemplos/tutoriales?** - Link a "Ver ejemplo" o "Tutorial en video"
- [ ] **¿El botón principal es obvio?** - Color primario, texto claro ("Descargar para SUNAT")
- [ ] **¿Hay confirmaciones antes de acciones destructivas?** - "¿Seguro que quieres eliminar?"
- [ ] **¿Hay feedback visual después de acciones?** - Toast "✅ Archivo descargado correctamente"

---

## 7. MEJORAS AL DOCUMENTO ORIGINAL

### 7.1 Actualizar Sección 3.2.3 (Generación Automática)

**AGREGAR al documento principal:**

```markdown
### 3.2.3 Generación Automática de Asientos desde Compras

**UI Propuesta para Mostrar al Usuario:**

Cuando el usuario registra una compra en `/dashboard/entries/new`, después de guardar:

1. Toast de confirmación:
   "✅ Compra registrada correctamente"

2. Opcioal: Dialog informativo (solo primera vez):
   ┌─────────────────────────────────────────────────────┐
   │ ✨ Tu contabilidad se actualizó automáticamente      │
   │                                                      │
   │ Registramos esta compra en tu libro contable:       │
   │ • Inventario aumentó en S/ 2,000                    │
   │ • IGV por deducir: S/ 360                           │
   │ • Total pagado: S/ 2,360                            │
   │                                                      │
   │ [Ver asiento contable] [Entendido]                  │
   └─────────────────────────────────────────────────────┘

3. Link discreto en la pantalla:
   "Ver cómo esto afecta tu contabilidad →"
```

### 7.2 Actualizar Sección 5 (Propuesta de Mejoras)

**AGREGAR como sub-sección 5.4:**

```markdown
### 5.4 Mejoras de UX/UI para Usuarios No Técnicos

#### 5.4.1 Dashboard Simplificado (Prioridad CRÍTICA)

En lugar de mostrar el Libro Diario como pantalla principal, crear:
- Dashboard con métricas visuales (efectivo, inventario, impuestos)
- Explicaciones en lenguaje simple
- Alertas proactivas ("Vence IGV en 3 días")

**Esfuerzo:** 40 horas
**Valor:** ALTO (reduce 80% de consultas de soporte)

#### 5.4.2 Wizard de Exportación SUNAT (Prioridad ALTA)

Reemplazar botón "Exportar PLE" por wizard guiado de 3 pasos.

**Esfuerzo:** 24 horas
**Valor:** ALTO (usuarios pueden exportar sin ayuda de contador)

#### 5.4.3 Glosario Integrado (Prioridad MEDIA)

Todos los términos técnicos con tooltip explicativo.

**Esfuerzo:** 16 horas
**Valor:** MEDIO (educación continua del usuario)

#### 5.4.4 Modo "Técnico" vs "Simple" (Prioridad BAJA)

Toggle global para mostrar/ocultar códigos de cuenta y detalles técnicos.

**Esfuerzo:** 8 horas
**Valor:** MEDIO (satisface a usuarios avanzados Y principiantes)
```

---

## 8. CONCLUSIONES Y RECOMENDACIONES

### ✅ **Principios de Diseño No Negociables:**

1. **Educación sobre Punición**
   - NO mostrar errores técnicos ("AccEntry.lines.debit must be >= 0")
   - SÍ explicar qué pasó y cómo arreglarlo ("El monto del debe no puede ser negativo. Verifica que el precio sea correcto.")

2. **Automatización sobre Manualidad**
   - El usuario NUNCA crea asientos manualmente (salvo casos excepcionales con permisos especiales)
   - TODO se genera desde ventas, compras, caja, bancos

3. **Simple por Defecto, Técnico Opcional**
   - Vista principal: lenguaje humano, métricas visuales
   - Vista técnica: colapsada, para contadores o usuarios avanzados

4. **Ayuda Proactiva**
   - No esperar a que el usuario pida ayuda
   - Tooltips, paneles de ayuda, wizards guiados

5. **Feedback Constante**
   - Cada acción tiene confirmación visual
   - Explicar QUÉ cambió después de cada operación

### 🎯 **Impacto Esperado:**

- **Reducción de soporte:** 70% menos consultas sobre contabilidad
- **Adopción:** 90% de usuarios usan el módulo (vs 30% actual estimado)
- **Satisfacción:** NPS > 50 en módulo contable
- **Cumplimiento SUNAT:** 100% de usuarios exportan correctamente

---

## PRÓXIMOS PASOS RECOMENDADOS

1. ✅ **Validar con usuarios reales:**
   - Mostrar mockups de Dashboard Simplificado
   - Probar wizard de exportación con 5 usuarios no contables
   - Iterar según feedback

2. ✅ **Implementar en fases:**
   - Fase 1A: Dashboard simplificado (antes que Fase 1 técnica)
   - Fase 1B: Wizard de exportación
   - Fase 1C: Tooltips y ayuda contextual
   - Luego continuar con Fases 2 y 3 del documento principal

3. ✅ **Crear librería de componentes reutilizables:**
   - `FinancialMetricCard`
   - `AccountingHelpPanel`
   - `GlossaryPopover`
   - `ExportWizard`

4. ✅ **Documentación de usuario:**
   - Videos tutoriales de 2-3 minutos
   - FAQ integrado en cada pantalla
   - Webinar mensual "Contabilidad para no contadores"

---

**Documento creado:** 13 de febrero de 2026
**Revisión sugerida:** Al completar Fase 1A (Dashboard Simplificado)

