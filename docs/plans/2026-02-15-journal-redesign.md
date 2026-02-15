# Rediseño del Libro Diario (Journal Entries)

**Fecha:** 15 de febrero de 2026
**Estado:** Diseño aprobado, pendiente implementación
**Contexto:** Mejora integral de la sección `/dashboard/accounting/journals`

---

## Problema Actual

La sección de Libro Diario tiene limitaciones importantes:

### Técnicas
- Usa tabla `Journal` simple en lugar del modelo `JournalEntry` completo del schema
- Códigos de cuenta hardcoded en frontend (`accountNames: Record<string, string>`)
- No integración con Chart of Accounts recién implementado
- Falta validación automática de balance (debe = haber)
- No cumple requisitos completos de SUNAT para exportación PLE

### UI/UX
- Interfaz genérica (solo tablas)
- Filtros limitados (solo selector de fecha)
- No hay búsqueda global
- Vista solo diaria (sin períodos: semana, mes)
- No categorización visual de tipos de asiento
- Mezcla asientos automáticos y manuales sin distinción clara

---

## Solución: Rediseño Completo Integrado

### Decisiones de Diseño

**Enfoque elegido:** Vista unificada con filtros avanzados

- **Vista única** que muestra todos los asientos (automáticos + manuales)
- **Badges de color** según origen: 🟢 Venta, 🔵 Compra, 🟡 Ingreso, 🟠 Manual
- **Filtros combinables** para mostrar/ocultar por tipo, estado, cuenta
- **Selector de período** con presets: Hoy, Esta semana, Este mes, Personalizado
- **Integración completa** con Chart of Accounts (sin códigos hardcoded)

---

## Arquitectura del Sistema

### 1. Modelo de Datos Unificado

**Migrar del modelo actual al modelo JournalEntry del schema:**

#### Modelo actual (a deprecar):
```typescript
interface Journal {
  id: string;
  date: string;
  description: string;
  amount: number;
  series?: string[];
}
```

#### Modelo nuevo (del schema Prisma):
```prisma
model JournalEntry {
  id          Int         @id @default(autoincrement())
  journalId   Int
  periodId    Int
  date        DateTime
  status      EntryStatus @default(DRAFT)
  description String?
  debitTotal  Decimal     @default(0.00)
  creditTotal Decimal     @default(0.00)

  // NUEVOS CAMPOS SUNAT:
  correlativo String      // M001, M002... (secuencial por mes)
  cuo         String      // Código Único de Operación
  sunatStatus String      // "0"|"1"|"8"|"9"
  source      String      // "SALE"|"PURCHASE"|"ADJUSTMENT"|"MANUAL"
  moneda      String      // "PEN"|"USD"
  tipoCambio  Decimal?    // Si moneda = USD

  period    Period         @relation(fields: [periodId], references: [id])
  lines     JournalLine[]

  @@check(name: "balance_check", expression: "debitTotal = creditTotal")
}

model JournalLine {
  id          Int     @id @default(autoincrement())
  entryId     Int
  accountId   Int     // FK a Account (Chart of Accounts)
  taxCodeId   Int?
  description String?
  debit       Decimal @default(0.00)
  credit      Decimal @default(0.00)

  entry   JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account Account      @relation(fields: [accountId], references: [id])
  taxCode TaxCode?     @relation(fields: [taxCodeId], references: [id])
}
```

### 2. Estados del Asiento

```typescript
enum EntryStatus {
  DRAFT    // 📝 Borrador - Editable, puede estar descuadrado
  POSTED   // ✓ Registrado - Bloqueado, debe=haber, aparece en PLE
  VOIDED   // 🚫 Anulado - No editable, no aparece en reportes
}

// Mapeo a códigos SUNAT para PLE:
const sunatStatusMap = {
  DRAFT: "0",    // Operación en proceso
  POSTED: "1",   // Operación confirmada
  VOIDED: "8",   // Operación anulada
  ERROR: "9"     // Con inconsistencias
};
```

### 3. Tipos de Asiento (source)

```typescript
enum EntrySource {
  SALE        // 🟢 Verde - Generado desde venta
  PURCHASE    // 🔵 Azul - Generado desde compra/entrada
  ADJUSTMENT  // 🟡 Amarillo - Ajuste de inventario
  MANUAL      // 🟠 Naranja - Creado manualmente por usuario
}
```

### 4. Integración con Chart of Accounts

**Eliminar códigos hardcoded:**

```typescript
// ❌ Código actual (hardcoded)
const accountNames: Record<string, string> = {
  "1011": "Caja",
  "1041": "Banco – Yape/Transferencia",
  "7011": "Ventas",
  // ...
};

// ✅ Código nuevo (dinámico)
const accounts = await fetchAccounts(); // Del Chart of Accounts
const accountMap = new Map(accounts.map(a => [a.code, a]));
```

**Generación automática mejorada:**

```typescript
// Al crear una venta, buscar cuentas dinámicamente:
const cajaAccount = await getAccountByCode("10");
const ventasAccount = await getAccountByCode("70");

if (!cajaAccount || !ventasAccount) {
  throw new Error("Configure primero las cuentas en el Plan de Cuentas");
}

await createJournalEntry({
  source: "SALE",
  status: "POSTED", // Automático = registrado
  lines: [
    { accountId: cajaAccount.id, debit: 1180, credit: 0 },
    { accountId: ventasAccount.id, debit: 0, credit: 1000 },
    { accountId: igvAccount.id, debit: 0, credit: 180 },
  ]
});
```

---

## Estructura de la UI

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 Libro Diario                                  [+ Nuevo Asiento]│
├─────────────────────────────────────────────────────────────────┤
│ [Período: Hoy ▼] [🔍 Buscar...] [Filtros ▼] [Exportar PLE ▼]   │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Resumen del período: Hoy (15/02/2026)                        │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Total Debe: S/ 15,234.50  │  Total Haber: S/ 15,234.50 ✓ │   │
│ │ Asientos: 24 (18 automáticos, 6 manuales)                 │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ 📅 Jueves, 15 de febrero 2026                    S/ 3,450.00    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟢 Venta  #M001  09:30 AM               [Ver detalle ▼]    │ │
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ 10 - Caja y Bancos               Debe: S/ 1,180.00        │ │
│ │ 70 - Ventas                              Haber: S/ 1,000.00│ │
│ │ 40 - Tributos por pagar                  Haber: S/ 180.00 │ │
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ Balance: ✓ Cuadrado  |  Estado: ✓ Registrado              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🟠 Ajuste Manual #M002  14:15 PM    [Editar] [Eliminar]   │ │
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ 10 - Caja y Bancos               Debe: S/ 500.00          │ │
│ │ 12 - Cuentas por cobrar                  Haber: S/ 500.00 │ │
│ │ ─────────────────────────────────────────────────────────  │ │
│ │ Balance: ✓ Cuadrado  |  Estado: 📝 Borrador               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes Principales

#### 1. Header de Controles

```typescript
<JournalHeader>
  <PeriodSelector
    value={period}
    onChange={setPeriod}
    options={["Hoy", "Ayer", "Esta semana", "Este mes", "Personalizado"]}
  />

  <SearchBar
    placeholder="Buscar por glosa, cuenta, monto, comprobante..."
    value={search}
    onChange={setSearch}
  />

  <FiltersDropdown>
    <CheckboxGroup label="Tipos">
      <Checkbox value="SALE">🟢 Ventas</Checkbox>
      <Checkbox value="PURCHASE">🔵 Compras</Checkbox>
      <Checkbox value="ADJUSTMENT">🟡 Ajustes</Checkbox>
      <Checkbox value="MANUAL">🟠 Manuales</Checkbox>
    </CheckboxGroup>

    <CheckboxGroup label="Estado">
      <Checkbox value="POSTED">✓ Registrado</Checkbox>
      <Checkbox value="DRAFT">📝 Borrador</Checkbox>
    </CheckboxGroup>

    <AccountMultiSelect
      label="Cuentas específicas"
      accounts={chartOfAccounts}
    />

    <RadioGroup label="Balance">
      <Radio value="all">Todos</Radio>
      <Radio value="balanced">Solo cuadrados ✓</Radio>
      <Radio value="unbalanced">Solo descuadrados ⚠️</Radio>
    </RadioGroup>
  </FiltersDropdown>

  <ExportPLEButton period={period} />

  <Button onClick={openNewEntryForm}>+ Nuevo Asiento</Button>
</JournalHeader>
```

#### 2. Panel de Resumen

```typescript
<SummaryPanel>
  <Stat>
    <Label>Total Debe</Label>
    <Value className={debitTotal === creditTotal ? "text-green-600" : "text-red-600"}>
      {formatCurrency(debitTotal)}
    </Value>
  </Stat>

  <Stat>
    <Label>Total Haber</Label>
    <Value className={debitTotal === creditTotal ? "text-green-600" : "text-red-600"}>
      {formatCurrency(creditTotal)}
    </Value>
  </Stat>

  <Stat>
    <Label>Asientos</Label>
    <Value>
      {entries.length}
      <span className="text-sm text-muted">
        ({automaticCount} automáticos, {manualCount} manuales)
      </span>
    </Value>
  </Stat>

  {debitTotal !== creditTotal && (
    <Alert variant="destructive">
      ⚠️ Balance descuadrado: Diferencia de {formatCurrency(Math.abs(debitTotal - creditTotal))}
    </Alert>
  )}
</SummaryPanel>
```

#### 3. Card de Asiento

```typescript
<EntryCard entry={entry}>
  <CardHeader>
    <SourceBadge source={entry.source} />
    <EntryNumber>#{entry.correlativo}</EntryNumber>
    <Timestamp>{formatDateTime(entry.date)}</Timestamp>
    <StatusBadge status={entry.status} />
    <Actions>
      {entry.status === "DRAFT" && (
        <>
          <Button variant="ghost" onClick={() => editEntry(entry)}>Editar</Button>
          <Button variant="ghost" onClick={() => deleteEntry(entry)}>Eliminar</Button>
        </>
      )}
      <Button variant="ghost" onClick={() => viewDetails(entry)}>Ver detalle</Button>
    </Actions>
  </CardHeader>

  <CardContent>
    <LinesTable>
      {entry.lines.map(line => (
        <LineRow key={line.id}>
          <AccountCell>
            <Code>{line.account.code}</Code>
            <Name>{line.account.name}</Name>
          </AccountCell>
          <DebitCell>{line.debit > 0 && formatCurrency(line.debit)}</DebitCell>
          <CreditCell>{line.credit > 0 && formatCurrency(line.credit)}</CreditCell>
        </LineRow>
      ))}
    </LinesTable>
  </CardContent>

  <CardFooter>
    <BalanceIndicator balanced={entry.debitTotal === entry.creditTotal}>
      {entry.debitTotal === entry.creditTotal ? "✓ Cuadrado" : "⚠️ Descuadrado"}
    </BalanceIndicator>
    <StatusIndicator status={entry.status}>
      {entry.status === "POSTED" && "✓ Registrado"}
      {entry.status === "DRAFT" && "📝 Borrador"}
      {entry.status === "VOIDED" && "🚫 Anulado"}
    </StatusIndicator>
  </CardFooter>
</EntryCard>
```

---

## Sistema de Filtros y Búsqueda

### Búsqueda Global

Filtra en tiempo real por:
- Glosa/descripción del asiento
- Código o nombre de cuenta (ej: "70" o "Ventas")
- Monto (exacto o rango: ">1000", "500-2000")
- Número de comprobante/voucher
- Proveedor/Cliente

### Filtros Combinables

```typescript
interface JournalFilters {
  // Tipos de asiento
  sources: Array<"SALE" | "PURCHASE" | "ADJUSTMENT" | "MANUAL">;

  // Estados
  statuses: Array<"DRAFT" | "POSTED" | "VOIDED">;

  // Cuentas específicas
  accountIds: number[];

  // Balance
  balanceFilter: "all" | "balanced" | "unbalanced";

  // Período
  period: {
    preset?: "today" | "yesterday" | "this-week" | "this-month" | "last-month";
    custom?: { from: Date; to: Date };
  };
}
```

### Chips de Filtros Activos

```typescript
<FilterChips>
  {period && <Chip onRemove={() => setPeriod(null)}>Período: {period.label}</Chip>}
  {sources.map(s => (
    <Chip key={s} onRemove={() => removeSource(s)}>
      {sourceLabels[s]}
    </Chip>
  ))}
  {accountIds.map(id => (
    <Chip key={id} onRemove={() => removeAccount(id)}>
      Cuenta: {getAccountName(id)}
    </Chip>
  ))}
  {hasFilters && (
    <Button variant="ghost" onClick={clearAllFilters}>
      × Limpiar todo
    </Button>
  )}
</FilterChips>
```

### Persistencia en URL

```typescript
// Ejemplo de URL con filtros:
/accounting/journals?period=this-month&source=SALE&account=70&balance=balanced

// Permite compartir enlaces con filtros específicos
```

---

## Formulario de Asiento Manual

### Estructura del Formulario

```typescript
<JournalEntryForm>
  <FormField name="date">
    <Label>Fecha</Label>
    <DatePicker value={date} onChange={setDate} />
  </FormField>

  <FormField name="description">
    <Label>Glosa general</Label>
    <Textarea
      placeholder="Descripción del asiento contable..."
      value={description}
      onChange={setDescription}
    />
  </FormField>

  <LinesSection>
    <Label>Líneas del asiento</Label>

    {lines.map((line, index) => (
      <LineInput key={index}>
        <AccountSelect
          value={line.accountId}
          onChange={(id) => updateLine(index, 'accountId', id)}
          accounts={chartOfAccounts}
        />

        <MoneyInput
          label="Debe"
          value={line.debit}
          onChange={(v) => updateLine(index, 'debit', v)}
        />

        <MoneyInput
          label="Haber"
          value={line.credit}
          onChange={(v) => updateLine(index, 'credit', v)}
        />

        <Input
          placeholder="Glosa específica (opcional)"
          value={line.description}
          onChange={(e) => updateLine(index, 'description', e.target.value)}
        />

        <Button
          variant="ghost"
          onClick={() => removeLine(index)}
          disabled={lines.length <= 2}
        >
          🗑️
        </Button>
      </LineInput>
    ))}

    <Button onClick={addLine}>+ Agregar línea</Button>
  </LinesSection>

  <BalanceIndicator>
    <div>
      <Label>Debe Total:</Label>
      <Value>{formatCurrency(totalDebit)}</Value>
    </div>
    <div>
      <Label>Haber Total:</Label>
      <Value>{formatCurrency(totalCredit)}</Value>
    </div>
    <div className={totalDebit === totalCredit ? "text-green-600" : "text-red-600"}>
      {totalDebit === totalCredit ? "✓ Balance cuadrado" : "⚠️ Descuadrado"}
    </div>
  </BalanceIndicator>

  <FormActions>
    <Button
      variant="outline"
      onClick={saveDraft}
    >
      Guardar como borrador
    </Button>

    <Button
      onClick={postEntry}
      disabled={totalDebit !== totalCredit}
    >
      Registrar asiento
    </Button>
  </FormActions>
</JournalEntryForm>
```

### Validaciones

```typescript
// Validaciones en tiempo real:
const validations = {
  // Al menos 2 líneas
  minLines: lines.length >= 2,

  // Cada línea debe tener cuenta
  allLinesHaveAccount: lines.every(l => l.accountId),

  // Debe o Haber debe ser > 0 (no ambos)
  validAmounts: lines.every(l =>
    (l.debit > 0 && l.credit === 0) ||
    (l.credit > 0 && l.debit === 0)
  ),

  // Para POSTED, debe = haber
  balanced: totalDebit === totalCredit,
};

// Permite guardar como DRAFT aunque no esté balanceado
// No permite POSTED si no cumple todas las validaciones
```

---

## Exportación PLE (SUNAT)

### Formatos Soportados

#### PLE 5.1 - Libro Diario

```
Formato: LE{RUC}{PERIODO}{050100}{INDICADOR}{ESTADO}.txt

Estructura por línea:
RUC|PERIODO|CUO|CORRELATIVO|FECHA_OPERACION|GLOSA_ASIENTO|GLOSA_REFERENCIAL|
CUENTA|DEBE|HABER|DATO_ESTRUCTURADO|INDICADOR_ESTADO|

Ejemplo:
20519857538|202602|M001|00001|15/02/2026|Venta de productos varios||1011|1180.00|0.00||1|
20519857538|202602|M001|00001|15/02/2026|Venta de productos varios||7011|0.00|1000.00||1|
20519857538|202602|M001|00001|15/02/2026|Venta de productos varios||4011|0.00|180.00||1|
```

#### PLE 6.1 - Libro Mayor

```
Formato: LE{RUC}{PERIODO}{060100}{INDICADOR}{ESTADO}.txt

Estructura por línea:
RUC|PERIODO|CUENTA|SALDO_INICIAL_DEBE|SALDO_INICIAL_HABER|
MOVIMIENTO_DEBE|MOVIMIENTO_HABER|SALDO_FINAL_DEBE|SALDO_FINAL_HABER|
INDICADOR_ESTADO|

(Generado a partir de los asientos del período)
```

### Implementación de Exportación

```typescript
async function exportPLE(
  period: { from: Date; to: Date },
  format: "5.1" | "6.1"
): Promise<string> {
  // 1. Obtener todos los asientos POSTED del período
  const entries = await prisma.journalEntry.findMany({
    where: {
      status: "POSTED",
      date: { gte: period.from, lte: period.to }
    },
    include: {
      lines: {
        include: { account: true }
      }
    },
    orderBy: { date: "asc" }
  });

  // 2. Obtener RUC de la empresa
  const company = await prisma.company.findFirst();
  const ruc = company.sunatRuc;

  // 3. Generar contenido según formato
  if (format === "5.1") {
    return generatePLE51(ruc, period, entries);
  } else {
    return generatePLE61(ruc, period, entries);
  }
}

function generatePLE51(
  ruc: string,
  period: { from: Date; to: Date },
  entries: JournalEntry[]
): string {
  const lines: string[] = [];

  const periodStr = format(period.from, "yyyyMM"); // 202602

  for (const entry of entries) {
    const dateStr = format(entry.date, "dd/MM/yyyy");

    for (const line of entry.lines) {
      const parts = [
        ruc,                                    // RUC
        periodStr,                              // PERIODO
        entry.cuo,                              // CUO
        entry.correlativo,                      // CORRELATIVO
        dateStr,                                // FECHA_OPERACION
        entry.description || "",                // GLOSA_ASIENTO
        line.description || "",                 // GLOSA_REFERENCIAL
        line.account.code,                      // CUENTA
        line.debit.toFixed(2),                  // DEBE
        line.credit.toFixed(2),                 // HABER
        "",                                     // DATO_ESTRUCTURADO
        entry.sunatStatus,                      // INDICADOR_ESTADO
      ];

      lines.push(parts.join("|"));
    }
  }

  return lines.join("\n");
}
```

### Generación de Archivo

```typescript
// En el controlador:
@Get('export/ple')
async exportPle(
  @Query('period') period: string,        // "2026-02"
  @Query('format') format: '5.1' | '6.1',
  @Res() res: Response
) {
  const [year, month] = period.split('-');
  const from = new Date(`${year}-${month}-01`);
  const to = endOfMonth(from);

  const content = await this.pleService.exportPLE({ from, to }, format);

  // Nombre de archivo según estándar SUNAT
  const ruc = await this.getRuc();
  const formatCode = format.replace('.', '');
  const indicator = '00';
  const estado = '1';
  const day = format(new Date(), 'dd');

  const filename = `LE${ruc}${year}${month}${day}${formatCode}${indicator}${estado}.txt`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
}
```

---

## Plan de Migración de Datos

### Migrar asientos existentes

```typescript
// Script de migración: backend/prisma/seed/migrate-journals.ts

async function migrateExistingJournals() {
  // 1. Obtener todos los "Journal" antiguos
  const oldJournals = await prisma.journal.findMany();

  // 2. Para cada uno, crear JournalEntry nuevo
  for (const old of oldJournals) {
    const entry = await prisma.journalEntry.create({
      data: {
        date: new Date(old.date),
        description: old.description,
        status: "POSTED", // Asumir que los existentes están registrados
        source: "MANUAL",
        correlativo: await generateCorrelativo(new Date(old.date)),
        cuo: generateCUO(),
        sunatStatus: "1",
        moneda: "PEN",
        debitTotal: old.amount || 0,
        creditTotal: old.amount || 0,

        lines: {
          create: [
            // Nota: Los Journal antiguos no tienen líneas detalladas
            // Crear una línea genérica o requerir revisión manual
          ]
        }
      }
    });
  }

  console.log(`Migrados ${oldJournals.length} asientos`);
}
```

### Generación de Correlativos

```typescript
async function generateCorrelativo(date: Date): Promise<string> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // Obtener último correlativo del mes
  const lastEntry = await prisma.journalEntry.findFirst({
    where: {
      date: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1)
      }
    },
    orderBy: { correlativo: 'desc' }
  });

  if (!lastEntry) {
    return "M001";
  }

  // Extraer número y sumar 1
  const match = lastEntry.correlativo.match(/M(\d+)/);
  const num = match ? parseInt(match[1]) + 1 : 1;

  return `M${String(num).padStart(3, '0')}`;
}
```

---

## Tecnologías y Dependencias

### Frontend
- **React** + **Next.js** (ya existente)
- **shadcn/ui** para componentes (ya existente)
- **Tailwind CSS** (ya existente)
- **react-hook-form** + **zod** para formularios
- **date-fns** para manejo de fechas

### Backend
- **NestJS** (ya existente)
- **Prisma ORM** (ya existente)
- **PostgreSQL** (ya existente)

### Nuevas dependencias
Ninguna - todo se implementa con el stack existente.

---

## Fases de Implementación

### Fase 1: Backend - Modelo y Migraciones (2-3 días)

1. **Migración Prisma:**
   - Agregar campos a `JournalEntry`: correlativo, cuo, sunatStatus, source, moneda, tipoCambio
   - Migrar datos existentes de `Journal` → `JournalEntry`
   - Crear índices necesarios

2. **Services:**
   - `JournalEntryService`: CRUD de asientos
   - `AccountMappingService`: Mapeo automático de códigos a accountId
   - `PLEExportService`: Generación de archivos PLE 5.1 y 6.1
   - `CorrelativoService`: Generación de correlativos secuenciales

3. **Controllers:**
   - Actualizar `/api/accounting/journals` endpoints
   - Agregar `/api/accounting/journals/export-ple`

### Fase 2: Frontend - UI Base (2-3 días)

1. **Componentes base:**
   - `JournalHeader` con selectores y filtros
   - `SummaryPanel` con estadísticas
   - `EntryCard` para mostrar asientos
   - `EntryForm` para crear/editar manuales

2. **Hooks y estado:**
   - `useJournalFilters` para gestión de filtros
   - `useJournalEntries` para fetch y caché
   - `usePeriodSelector` para navegación temporal

3. **API Layer:**
   - Actualizar `journals.api.ts` con nuevos endpoints
   - Integración con Chart of Accounts

### Fase 3: Features Avanzadas (2 días)

1. **Búsqueda y filtros:**
   - Implementar búsqueda global
   - Filtros combinables
   - Persistencia en URL

2. **Exportación PLE:**
   - Botón de exportación
   - Selección de formato
   - Descarga de archivo

3. **Validaciones:**
   - Balance automático
   - Estados y transiciones
   - Alertas visuales

### Fase 4: Testing y Refinamiento (1-2 días)

1. **Testing:**
   - Unit tests para services
   - Integration tests para endpoints
   - E2E tests para flujos principales

2. **Refinamiento:**
   - Performance optimization
   - Mobile responsive
   - Accessibility

---

## Criterios de Éxito

✅ **Técnicos:**
- [ ] Migración 100% de datos existentes sin pérdida
- [ ] Balance automático funciona (constraint de DB)
- [ ] Exportación PLE cumple formato oficial SUNAT
- [ ] Integración con Chart of Accounts sin códigos hardcoded
- [ ] Todos los tests pasan (unit + integration + e2e)

✅ **Funcionales:**
- [ ] Usuario puede ver asientos de hoy en <2 segundos
- [ ] Usuario puede filtrar por tipo, estado, cuenta
- [ ] Usuario puede buscar por texto/monto
- [ ] Usuario puede crear asiento manual con validación en tiempo real
- [ ] Usuario puede exportar PLE 5.1 de un mes completo

✅ **UX:**
- [ ] Distinción visual clara entre asientos automáticos y manuales
- [ ] Balance siempre visible y actualizado
- [ ] Errores de validación claros y accionables
- [ ] Responsive en mobile y desktop

---

## Notas Técnicas

### Performance

**Problema:** Cargar todos los asientos de un mes puede ser lento.

**Solución:**
- Paginación en backend (20 asientos por página)
- Índices en `date`, `status`, `source`
- Lazy loading en frontend

### Compatibilidad

**Problema:** Asientos antiguos no tienen correlativos.

**Solución:**
- Generarlos en migración basándose en fecha
- Marca visual en UI para asientos migrados

### Multi-tenancy

**Problema:** Asegurar aislamiento entre organizaciones.

**Solución:**
- Todos los queries filtran por `organizationId`
- Guard en controller valida tenant
- Correlativos son por organización + período

---

## Referencias

- [Formato PLE 5.1 - SUNAT](https://www.sunat.gob.pe/legislacion/oficios/2010/informe-oficios/i031-2010.pdf)
- [Plan Contable General Empresarial - PCGE](https://www.mef.gob.pe/contenidos/conta_publ/documentac/PCGE_2019.pdf)
- [Documentación Prisma - Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [shadcn/ui - Components](https://ui.shadcn.com/)

---

## Próximos Pasos

1. ✅ Diseño aprobado (este documento)
2. ⏳ Crear migración Prisma para nuevos campos
3. ⏳ Implementar backend services
4. ⏳ Implementar UI base
5. ⏳ Testing y refinamiento
6. ⏳ Deploy a producción

---

**Última actualización:** 15 de febrero de 2026
**Autor:** Claude Sonnet 4.5
**Estado:** Listo para implementación
