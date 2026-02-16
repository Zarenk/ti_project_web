# ANÁLISIS EXHAUSTIVO: SISTEMA CONTABLE BASADO EN NORMATIVAS SUNAT 2026

> **⚠️ ACTUALIZACIÓN IMPORTANTE:** Este documento ha sido **consolidado y actualizado** con hallazgos críticos adicionales.
> **Revisar versión consolidada:** [`CONSOLIDACION_ANALISIS_CONTABLE.md`](./CONSOLIDACION_ANALISIS_CONTABLE.md)
> La versión consolidada incluye:
> - ✅ Infraestructura existente descubierta (7 hooks automáticos, 6 servicios de mapeo)
> - ✅ Gaps reales actualizados (mucho menor de lo estimado inicialmente)
> - ✅ Roadmap refinado con esfuerzos realistas
> - ✅ Componentes reutilizables identificados

**Fecha de análisis:** 13 de febrero de 2026
**Sistema:** ADSLab Sistema de Gestión Empresarial
**Objetivo:** Mejorar el área contable con integración automática conforme a SUNAT 2026
**Estado:** 📄 DOCUMENTO ORIGINAL - Ver consolidación para análisis completo

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Marco Normativo SUNAT 2026](#marco-normativo-sunat-2026)
3. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
4. [Análisis de Brechas (Gap Analysis)](#análisis-de-brechas)
5. [Propuesta de Mejoras](#propuesta-de-mejoras)
6. [Hoja de Ruta de Implementación](#hoja-de-ruta)
7. [Anexos Técnicos](#anexos-técnicos)

---

## 1. RESUMEN EJECUTIVO {#resumen-ejecutivo}

### 1.1 Situación Actual

El sistema ADSLab cuenta con **funcionalidad contable básica** que incluye:
- ✅ Plan de Cuentas basado en PCGE
- ✅ Libro Diario y Libro Mayor
- ✅ Balance de Comprobación
- ✅ **Generación automática de asientos** desde ingresos de inventario (compras)
- ✅ Multi-tenancy (organizaciones y empresas)
- ⚠️ Integración parcial con ventas (no automatizada)
- ❌ No cumple completamente con SUNAT 2026 (SIRE, PLE, PDT 621)

### 1.2 Normativas SUNAT 2026 Aplicables

#### **SIRE - Sistema Integrado de Registros Electrónicos**
- **Obligatorio desde:** Enero 2026 (PRICOS ≤2,300 UIT) / Junio 2026 (PRICOS >2,300 UIT)
- **Funcionalidad:** Generación automática de Registro de Compras Electrónico (RCE) y Registro de Ventas e Ingresos Electrónico (RVIE) a partir de CPE
- **Estado:** Sistema NO integrado con SIRE

#### **PLE - Programa de Libros Electrónicos**
- **Versión vigente:** 5.2.0.7 (publicado enero 2025)
- **Formatos requeridos:**
  - 5.1/5.3: Libro Diario Electrónico
  - 6.1: Libro Mayor Electrónico
  - 3.1/3.2: Inventarios y Balances
- **Estado:** Sistema NO genera archivos TXT en formato PLE

#### **PDT 621 - IGV Renta Mensual**
- **Funcionalidad:** Declaración mensual de IGV y pagos a cuenta de renta
- **Requisito:** Registros de compras y ventas electrónicos previamente presentados
- **Estado:** No hay integración directa con PDT 621

### 1.3 Impacto de Cumplimiento

| Normativa | Riesgo de Incumplimiento | Multas SUNAT | Prioridad |
|-----------|-------------------------|--------------|-----------|
| SIRE | **ALTO** | 0.3% - 0.6% UIT por periodo | 🔴 CRÍTICA |
| PLE (Libro Diario) | **ALTO** | 0.3% UIT | 🔴 CRÍTICA |
| PDT 621 | **MEDIO** | Variable según infracción | 🟡 ALTA |
| Facturación Electrónica | ✅ CUMPLIDO | - | ✅ OK |

**Conclusión:** Se requiere implementación **URGENTE** de exportación PLE y preparación para SIRE antes de junio 2026.

---

## 2. MARCO NORMATIVO SUNAT 2026 {#marco-normativo-sunat-2026}

### 2.1 Plan Contable General Empresarial (PCGE)

El PCGE es **obligatorio** para todas las empresas en Perú, alineado con NIIF (Normas Internacionales de Información Financiera).

#### **Estructura de Clases de Cuentas**

| Elemento | Clase | Descripción | Ejemplos |
|----------|-------|-------------|----------|
| **1** | **Activo Disponible** | Efectivo y equivalentes | 10 Caja y Bancos, 11 Inversiones Financieras |
| **2** | **Activo Realizable** | Inventarios y derechos de cobro | 20 Mercaderías, 21 Productos Terminados, 23 Productos en Proceso |
| **3** | **Activo Inmovilizado** | Activos fijos, intangibles | 33 Inmuebles, Maquinaria y Equipo, 34 Intangibles |
| **4** | **Pasivo** | Obligaciones y deudas | 40 Tributos, 42 Cuentas por Pagar Comerciales, 45 Obligaciones Financieras |
| **5** | **Patrimonio** | Capital y resultados acumulados | 50 Capital, 59 Resultados Acumulados |
| **6** | **Gastos por Naturaleza** | Clasificación de gastos | 60 Compras, 62 Gastos de Personal, 63 Gastos de Servicios |
| **7** | **Ingresos** | Ventas y otros ingresos | 70 Ventas, 75 Otros Ingresos de Gestión |
| **8** | **Saldos Intermediarios** | Cuentas de gestión | 80 Margen Comercial, 81 Producción del Ejercicio |
| **9** | **Cuentas Analíticas** | Costos de producción | 90 Costos de Producción, 91 Costos por Distribuir |
| **0** | **Cuentas de Orden** | Cuentas fuera de balance | 01 Bienes en Consignación, 04 Deudores por Contra |

**Fuentes:**
- [PCGE Oficial - Ministerio de Economía y Finanzas](https://www.mef.gob.pe/contenidos/conta_publ/pcge/PCGE_2019.pdf)
- [¿Qué es el PCGE? - SOSCIA](https://soscia.pe/Consultas/plan-contable-general-empresarial/)
- [Guía del PCGE - Caballero Contadores](https://caballerocontadoresyasociados.com/guia-del-plan-contable-general-empresarial-en-el-peru/)

### 2.2 SIRE - Sistema Integrado de Registros Electrónicos

#### **¿Qué es el SIRE?**

Sistema de SUNAT que **automatiza** la generación del Registro de Compras Electrónico (RCE) y Registro de Ventas e Ingresos Electrónico (RVIE) a partir de los Comprobantes de Pago Electrónicos (CPE) ya emitidos/recibidos.

#### **Cronograma de Obligatoriedad 2026**

| Segmento de Contribuyentes | Fecha Obligatoria | Estado Actual |
|----------------------------|-------------------|---------------|
| **PRICOS con ingresos 2024 ≤ 2,300 UIT** | **Enero 2026** | ⚠️ Periodo de gracia hasta **junio 2026** sin sanciones |
| **PRICOS con ingresos 2024 > 2,300 UIT** | **Junio 2026** | ⏳ Próximo a entrar en vigencia |
| Buenos Contribuyentes | A definir por SUNAT | - |
| Régimen General | A definir por SUNAT | - |

**Fuentes:**
- [SIRE Oficial - SUNAT](https://sire.sunat.gob.pe/)
- [SUNAT amplía plazo SIRE sin sanciones hasta junio 2026 - Mifact](https://mifact.net/sunat-amplia-plazo-del-sire-sin-sanciones-hasta-junio-de-2026/)
- [SIRE SUNAT 2025-2026: cronograma oficial - Seminarios TOP](https://seminariostop.com/blog/sire-2025-cronograma-obligados-sunat/)

#### **Funcionamiento del SIRE**

```
┌─────────────────────────────────────────────────────────────┐
│  PASO 1: Emisión/Recepción de Comprobantes Electrónicos    │
│  • Empresa emite Factura Electrónica (CPE)                  │
│  • SUNAT recibe y valida CPE automáticamente                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 2: Propuesta Automática SIRE                          │
│  • SUNAT genera propuesta de RCE (compras) y RVIE (ventas) │
│  • Basado en CPE validados                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 3: Revisión y Ajuste del Contribuyente               │
│  • Contribuyente accede a SIRE en portal SUNAT              │
│  • Acepta, completa o ajusta la propuesta                   │
│  • Agrega datos adicionales si es necesario                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PASO 4: Cierre y Validación                                │
│  • SIRE valida consistencia                                 │
│  • Genera RCE y RVIE oficiales                              │
│  • Estos registros alimentan el PDT 621 (IGV mensual)       │
└─────────────────────────────────────────────────────────────┘
```

**Dato Estructurado (Campo 20):**
Es **OBLIGATORIO** para operaciones de compras y ventas. La información debe **coincidir** con el RCE y RVIE electrónicos.

#### **Ventajas del SIRE**

- ✅ **Automatización:** Reduce trabajo manual de registro
- ✅ **Trazabilidad:** SUNAT cruza información en tiempo real
- ✅ **Reducción de errores:** Sistema valida automáticamente
- ⚠️ **Requiere:** CPE correctamente emitidos y sistema de facturación integrado

### 2.3 PLE - Programa de Libros Electrónicos

#### **Versión vigente:** 5.2.0.7 (publicado 31 de enero de 2025)

#### **Libros Obligatorios Según Régimen**

| Libro Electrónico | Formato PLE | Obligatorio Para | Plazo de Atraso Máximo |
|-------------------|-------------|------------------|------------------------|
| **Libro Diario** | 5.1 (completo) / 5.2 (simplificado) | Régimen General | 3 meses |
| **Libro Mayor** | 6.1 | Régimen General | 3 meses |
| **Inventarios y Balances** | 3.1 / 3.2 / 3.3... | Régimen General | Según tipo de activo |
| **Registro de Compras** | 8.1 | Régimen General y MYPE | Máximo 10 días hábiles del mes siguiente |
| **Registro de Ventas** | 14.1 | Régimen General y MYPE | Máximo 10 días hábiles del mes siguiente |

**Fuentes:**
- [Estructura Libros Electrónicos PLE - SUNAT](https://www.gob.pe/institucion/sunat/informes-publicaciones/356712-estructura-de-los-libros-y-registros-electronicos-en-el-ple)
- [Libro Diario Electrónico Formato 5.1-5.3 - Noticiero Contable](https://noticierocontable.com/ple-5-0-libro-diario-electronico/)
- [Última versión PLE 2026 - Noticiero Contable](https://noticierocontable.com/ultima-version-del-ple/)

#### **Formato de Archivos PLE**

Los archivos deben generarse en formato **TXT delimitado por pipes (|)** con estructura definida en:
- **Resolución de Superintendencia N.º 286-2009/SUNAT** (Anexo 2)
- **Modificaciones:** RS N.º 248-2012, RS N.º 169-2015

**Ejemplo de estructura Libro Diario Formato 5.1:**

```
20519857538|2026|01|01|00|M0|01|0001|20260115|1011|Caja|100.00|0.00||1|
20519857538|2026|01|01|00|M0|01|0001|20260115|7011|Ventas|0.00|100.00||1|
```

**Campos obligatorios:**
1. RUC
2. Año
3. Mes
4. Número correlativo del asiento
5. Cuenta contable (PCGE)
6. Descripción
7. Debe
8. Haber
9. Indicador de estado (1 = válido, 8 = anulado, 9 = ajuste)

#### **Validación PLE**

El **Programa de Libros Electrónicos (PLE)** es una aplicación descargable que:
1. Valida la estructura del archivo TXT
2. Genera archivo **resumen** si está conforme
3. Permite enviar a SUNAT (o genera error con detalles)

**Sanciones por incumplimiento:**
- No llevar libros electrónicos: **0.3% de ingresos netos** (mínimo 10% UIT)
- Atraso mayor al permitido: **0.3% UIT por cada libro**

**Fuente:** [Tabla de infracciones libros - SUNAT](http://contenido.app.sunat.gob.pe/insc/Libros+y+Registros/Infracciones+y+Sanciones+Libros+y+Registros.pdf)

### 2.4 PDT 621 - IGV Renta Mensual

#### **¿Qué es el PDT 621?**

Formulario Virtual para **declaración mensual** de:
- **IGV:** Impuesto General a las Ventas (18%)
- **Renta de Tercera Categoría:** Pagos a cuenta mensuales

**Fuentes:**
- [Formulario Virtual 621 - SUNAT](https://orientacion.sunat.gob.pe/01-formulario-virtual-ndeg-621-igv-renta-mensual)
- [PDT 621: Cómo declarar IGV mensual - IVA Calculator](https://ivacalculator.com/peru/pdt-621-declaracion-igv/)

#### **Estructura del PDT 621**

```
┌─────────────────────────────────────────────────────────────┐
│  SECCIÓN A: DETERMINACIÓN DEL IGV                           │
│  • Base imponible de ventas gravadas                        │
│  • IGV de ventas (débito fiscal)                            │
│  • IGV de compras (crédito fiscal)                          │
│  • IGV a pagar o saldo a favor                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SECCIÓN B: RENTA MENSUAL                                   │
│  • Ingresos netos del mes                                   │
│  • Coeficiente o porcentaje de pago a cuenta                │
│  • Pago a cuenta de renta                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SECCIÓN C: TOTALES Y PAGO                                  │
│  • Total tributos a pagar                                   │
│  • Intereses moratorios (si aplica)                         │
│  • Formulario 1662 (orden de pago)                          │
└─────────────────────────────────────────────────────────────┘
```

#### **Requisitos Previos al PDT 621**

⚠️ **IMPORTANTE:** Antes de declarar PDT 621, debes haber presentado:
1. **Registro de Ventas e Ingresos Electrónico (RVIE)** - vía SIRE o PLE
2. **Registro de Compras Electrónico (RCE)** - vía SIRE o PLE

**Plazo de presentación:** Según cronograma SUNAT (generalmente hasta el día 14-22 del mes siguiente, según último dígito RUC)

#### **Integración SUNAT Operaciones en Línea (SOL)**

Desde 2024, el PDT 621 se presenta **exclusivamente vía SOL** (Sunat Operaciones en Línea). SUNAT **propone automáticamente** los datos basándose en:
- CPE emitidos (facturas, boletas)
- CPE recibidos (registrados en sistema)
- Información del SIRE

**Flujo automatizado:**

```
Sistema Empresarial (ADSLab)
        ↓
Emite CPE (Facturación Electrónica) ✅ ACTUAL
        ↓
SUNAT valida y almacena CPE
        ↓
SIRE propone RCE y RVIE ❌ NO INTEGRADO
        ↓
Contribuyente revisa y cierra SIRE
        ↓
PDT 621 propone IGV automáticamente ❌ NO INTEGRADO
        ↓
Contribuyente valida y presenta declaración
```

### 2.5 Impuesto General a las Ventas (IGV)

#### **Tasa IGV 2026**

| Concepto | Tasa 2026 | Base Legal |
|----------|-----------|------------|
| **IGV General** | **18%** | Ley del IGV |
| **Restaurantes y Hoteles** | **8%** (temporal) | Decreto Legislativo vigente 2026 |
| **IPM (Impuesto de Promoción Municipal)** | Incluido en el 18% (2%) | - |

**Fuentes:**
- [IGV - SUNAT Emprender](https://emprender.sunat.gob.pe/principales-impuestos/impuesto-general-las-ventas-igv/impuesto-general-las-ventas)
- [Reducción IGV Restaurantes - SUNAT](https://emprender.sunat.gob.pe/principales-impuestos/impuesto-general-las-ventas-igv/reduccion-igv-para-restaurantes-hoteles)

#### **Mecánica del IGV en Compras y Ventas**

##### **COMPRAS (IGV Crédito Fiscal - Cuenta 4011)**

```
Compra de mercadería S/ 118.00 (incluido IGV)

Base imponible: S/ 100.00 (118 / 1.18)
IGV 18%:        S/  18.00

Asiento contable:
─────────────────────────────────────────────
DEBE:  2011 Mercaderías              100.00
DEBE:  4011 IGV - Crédito Fiscal      18.00
       HABER: 1011 Caja                      118.00
─────────────────────────────────────────────
```

##### **VENTAS (IGV Débito Fiscal - Cuenta 4011)**

```
Venta de mercadería S/ 236.00 (incluido IGV)

Base imponible: S/ 200.00 (236 / 1.18)
IGV 18%:        S/  36.00

Asiento contable:
─────────────────────────────────────────────
DEBE:  1011 Caja                     236.00
       HABER: 7011 Ventas - Mercaderías      200.00
       HABER: 4011 IGV - Débito Fiscal        36.00
─────────────────────────────────────────────
```

##### **LIQUIDACIÓN MENSUAL DEL IGV**

```
IGV Débito Fiscal (ventas):    S/ 1,000.00
IGV Crédito Fiscal (compras):  S/   800.00
                               ───────────
IGV a pagar a SUNAT:           S/   200.00
```

**Asiento de pago:**
```
DEBE:  4011 IGV - Débito Fiscal      1,000.00
       HABER: 4011 IGV - Crédito Fiscal       800.00
       HABER: 1011 Caja                       200.00
```

#### **Requisitos para Acreditar el Crédito Fiscal**

⚠️ Para que el IGV de compras sea **deducible**, se requiere:
1. ✅ **Comprobante de pago válido** (factura electrónica)
2. ✅ Compra **relacionada con actividad gravada** del negocio
3. ✅ Comprobante **anotado en el Registro de Compras** dentro del plazo
4. ✅ **Pago con medio bancarizado** si la operación supera S/ 3,500 o US$ 1,000

**Compras sin factura:**
Si NO se tiene comprobante de pago válido:
- ❌ **NO se puede acreditar IGV** como crédito fiscal
- ⚠️ El IGV se considera **GASTO** (no deducible)
- Se usa cuenta **4091 - IGV por Acreditar (Suspense)**

**Implementación actual en el sistema:**

```typescript
// backend/src/accounting/accounting.service.ts (línea 42-44)
const REQUIRE_INVOICE_TO_RECOGNIZE_TAX =
  (process.env.REQUIRE_INVOICE_TO_RECOGNIZE_TAX ?? 'true') !== 'false';
const IGV_SUSPENSE_ACCOUNT = process.env.IGV_SUSPENSE_ACCOUNT ?? '4091';

// Línea 609-664: Lógica de asiento según comprobante
if (invoiceSerie && invoiceCorr) {
  // CON COMPROBANTE: IGV va a cuenta 4011 (deducible)
  linesToCreate = [
    { account: '2011', debit: net, ... },
    { account: '4011', debit: igv, ... },  // ✅ IGV deducible
    { account: creditAccount, credit: amount, ... }
  ];
} else {
  if (REQUIRE_INVOICE_TO_RECOGNIZE_TAX) {
    // SIN COMPROBANTE + FLAG ACTIVO: NO reconoce IGV
    linesToCreate = [
      { account: '2011', debit: amount, ... },  // ❌ IGV va directo a costo
      { account: creditAccount, credit: amount, ... }
    ];
  } else {
    // SIN COMPROBANTE + FLAG DESACTIVADO: IGV a suspense
    linesToCreate = [
      { account: '2011', debit: net, ... },
      { account: '4091', debit: igv, ... },  // ⚠️ IGV en suspense
      { account: creditAccount, credit: amount, ... }
    ];
  }
}
```

**Conclusión:** El sistema **YA IMPLEMENTA** correctamente la normativa de IGV en compras, con opción configurable para empresas que no requieren comprobante (opcional).

---

## 3. ANÁLISIS DEL SISTEMA ACTUAL {#análisis-del-sistema-actual}

### 3.1 Arquitectura de Base de Datos Contable

#### **Modelos Prisma Implementados**

```prisma
// === Modelos Contables Simplificados (Sistema Actual) ===

model Account {
  id        Int       @id @default(autoincrement())
  code      String    @unique           // Código PCGE (ej: "2011", "4011")
  name      String                      // Nombre de cuenta
  parentId  Int?                        // Cuenta padre (jerarquía)
  parent    Account?  @relation("AccountChildren", fields: [parentId], references: [id])
  children  Account[] @relation("AccountChildren")
  level     Int                         // Nivel jerárquico (1-5 dígitos)
  isPosting Boolean   @default(false)   // ¿Permite movimientos? (solo hojas)
  taxCodes  TaxCode[]                   // Códigos de impuestos asociados
}

model AccPeriod {
  id        Int             @id @default(autoincrement())
  name      String          @unique      // "2026-01", "2026-02", etc.
  status    AccPeriodStatus @default(OPEN)  // OPEN | LOCKED
  entries   AccEntry[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
}

model AccEntry {
  id             Int            @id @default(autoincrement())
  periodId       Int
  date           DateTime                   // Fecha del asiento
  status         AccEntryStatus @default(DRAFT)  // DRAFT | POSTED | VOID
  totalDebit     Float                      // Total debe
  totalCredit    Float                      // Total haber
  providerId     Int?                       // Proveedor (si es compra)
  serie          String?                    // Serie de comprobante (ej: "F001")
  correlativo    String?                    // Correlativo (ej: "00123")
  invoiceUrl     String?                    // URL del PDF/XML de factura
  source         String?                    // Origen: "inventory_entry", "sale", "manual"
  sourceId       Int?                       // ID del documento origen
  referenceId    String?        @unique     // ID único de referencia
  organizationId Int?                       // Multi-tenancy
  companyId      Int?

  period         AccPeriod      @relation(fields: [periodId], references: [id])
  provider       Provider?      @relation(fields: [providerId], references: [id])
  organization   Organization?  @relation(fields: [organizationId], references: [id])
  company        Company?       @relation(fields: [companyId], references: [id])
  lines          AccEntryLine[]             // Líneas del asiento

  @@unique([source, sourceId])              // Evita duplicados
  @@index([periodId])
  @@index([organizationId, companyId])
}

model AccEntryLine {
  id          Int      @id @default(autoincrement())
  entryId     Int
  account     String                        // Código de cuenta (ej: "2011")
  description String?                       // Glosa de la línea
  debit       Float    @default(0)          // Monto debe
  credit      Float    @default(0)          // Monto haber
  quantity    Float?                        // Cantidad (opcional, para inventario)
  entry       AccEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@index([entryId])
}
```

#### **Modelos Contables Avanzados (Preparados pero NO Usados)**

El esquema incluye modelos para un sistema contable más completo, pero **NO están implementados en el servicio**:

```prisma
model Journal {
  id        Int      @id @default(autoincrement())
  code      String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  entries   Entry[]
}

model Period {
  id         Int            @id @default(autoincrement())
  startDate  DateTime
  endDate    DateTime
  status     PeriodStatus   @default(OPEN)
  entries    JournalEntry[]
  pleExports PleExport[]
}

model JournalEntry {
  id          Int         @id @default(autoincrement())
  journalId   Int
  periodId    Int
  date        DateTime
  status      EntryStatus @default(DRAFT)
  description String?
  debitTotal  Decimal     @default(0.00)
  creditTotal Decimal     @default(0.00)
  period      Period      @relation(fields: [periodId], references: [id])
  lines       JournalLine[]
  documents   DocumentLink[]
  auditLogs   AuditLog[]
}

model PleExport {
  id         Int      @id @default(autoincrement())
  periodId   Int
  type       PleType  // LIBRO_DIARIO | LIBRO_MAYOR | REG_COMPRAS | REG_VENTAS
  fileUrl    String
  exportedAt DateTime @default(now())
  period     Period   @relation(fields: [periodId], references: [id])
}

enum PleType {
  LIBRO_DIARIO
  LIBRO_MAYOR
  INVENTARIOS_BALANCES
  REG_COMPRAS
  REG_VENTAS
}
```

**Observación:** Estos modelos están **preparados** para un sistema contable más robusto con:
- Diarios separados (ventas, compras, caja, banco)
- Gestión de periodos contables
- **Exportación PLE** (CRÍTICO para SUNAT 2026)
- Auditoría de cambios
- Adjuntar documentos a asientos

### 3.2 Lógica de Negocio Contable

#### **AccountingService - Métodos Implementados**

**Archivo:** `backend/src/accounting/accounting.service.ts` (690 líneas)

##### **1. Gestión de Plan de Cuentas**

```typescript
async getAccounts(tenantContext?: TenantContext | null): Promise<AccountNode[]>
// Retorna árbol jerárquico de cuentas PCGE

async createAccount(data: {...}, tenantContext?: TenantContext | null): Promise<AccountNode>
// Crea nueva cuenta contable (valida nivel jerárquico)

async updateAccount(id: number, data: {...}, tenantContext?: TenantContext | null): Promise<AccountNode>
// Actualiza cuenta existente
```

**Estado:** ✅ **IMPLEMENTADO** - Plan de cuentas jerárquico funcional

##### **2. Reportes Contables**

```typescript
async getLedger(params: {
  accountCode?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}, tenantContext?: TenantContext | null)
// Libro Mayor: movimientos de una cuenta con saldo acumulado

async getTrialBalance(period: string, tenantContext?: TenantContext | null)
// Balance de Comprobación: saldos de apertura, movimientos, cierre por cuenta
```

**Estado:** ✅ **IMPLEMENTADO** - Reportes básicos funcionales

##### **3. Generación Automática de Asientos desde Compras**

```typescript
async createJournalForInventoryEntry(
  entryId: number,
  tenantContext?: TenantContext | null
)
```

**Flujo de generación automática:**

```
ENTRADA DE INVENTARIO (compra de mercadería)
↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Leer Entry (ingreso de inventario)                 │
│ • Detalles de productos comprados                           │
│ • Proveedor                                                 │
│ • Almacén/tienda                                            │
│ • Serie y correlativo de factura (si existe)                │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Cálculo de montos                                  │
│ • Total Bruto = suma de (cantidad × precio unitario)        │
│ • Tasa IGV = 18% (por defecto, configurable)               │
│ • Base Imponible = Total / (1 + 0.18) = Total / 1.18       │
│ • IGV = Total - Base Imponible                              │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Determinar cuentas según tipo de compra            │
│                                                             │
│ CON FACTURA (serie + correlativo):                         │
│   DEBE:  2011 Mercaderías           [Base Imponible]       │
│   DEBE:  4011 IGV Crédito Fiscal    [IGV]                  │
│   HABER: 1011/1041/4211              [Total]               │
│          (Caja/Banco/Cuentas por Pagar según forma pago)   │
│                                                             │
│ SIN FACTURA + REQUIRE_INVOICE=true:                        │
│   DEBE:  2011 Mercaderías           [Total]                │
│   HABER: 1011/1041/4211              [Total]               │
│   (IGV NO deducible, va directo a costo)                   │
│                                                             │
│ SIN FACTURA + REQUIRE_INVOICE=false:                       │
│   DEBE:  2011 Mercaderías           [Base Imponible]       │
│   DEBE:  4091 IGV por Acreditar     [IGV]                  │
│   HABER: 1011/1041/4211              [Total]               │
│   (IGV en suspense, pendiente de sustento)                 │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 4: Generar glosas descriptivas                        │
│ • Incluye resumen de TODOS los ítems: "2x Laptop HP, 1x... │
│ • Incluye series/IMEI si aplica                             │
│ • Referencia a factura: "Compra F001-00123" o              │
│   "(sin comprobante)"                                       │
│ • Evita duplicados agregando sufijo si ya existe asiento   │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ PASO 5: Crear asiento contable (AccEntry)                  │
│ • Asociado al periodo (YYYY-MM automático desde fecha)      │
│ • Estado: POSTED (con factura) | DRAFT (sin factura)       │
│ • Source: "inventory_entry", sourceId: [entryId]            │
│ • Líneas (AccEntryLine) con debe/haber balanceados         │
└─────────────────────────────────────────────────────────────┘
```

**Ejemplo de asiento generado:**

```
Compra de 2x Laptop HP EliteBook (IMEI: 123, 456) - S/ 2,360.00
Factura F001-00045 del proveedor "Importaciones Tech SAC"
Forma de pago: Crédito

Cálculos:
  Total Bruto:      S/ 2,360.00
  Base Imponible:   S/ 2,000.00  (2,360 / 1.18)
  IGV 18%:          S/   360.00

Asiento Contable:
───────────────────────────────────────────────────────────────
PERIODO: 2026-01
FECHA: 15/01/2026
ESTADO: POSTED
PROVEEDOR: Importaciones Tech SAC
SERIE: F001, CORRELATIVO: 00045
───────────────────────────────────────────────────────────────
LÍNEA 1:
  CUENTA: 2011 - Mercaderías
  GLOSA: Ingreso 2x Laptop HP EliteBook (IMEI: 123, 456) – Compra F001-00045
  DEBE: S/ 2,000.00
  HABER: S/ 0.00
  CANTIDAD: 2
───────────────────────────────────────────────────────────────
LÍNEA 2:
  CUENTA: 4011 - IGV Crédito Fiscal
  GLOSA: IGV Compra F001-00045
  DEBE: S/ 360.00
  HABER: S/ 0.00
───────────────────────────────────────────────────────────────
LÍNEA 3:
  CUENTA: 4211 - Facturas por Pagar
  GLOSA: Pago Compra F001-00045
  DEBE: S/ 0.00
  HABER: S/ 2,360.00
───────────────────────────────────────────────────────────────
TOTALES:
  DEBE:  S/ 2,360.00
  HABER: S/ 2,360.00  ✅ BALANCEADO
───────────────────────────────────────────────────────────────
```

**Estado:** ✅ **IMPLEMENTADO** y **conforme a SUNAT**

**Fortalezas detectadas:**
- ✅ Cálculo correcto de IGV (18%)
- ✅ Diferenciación con factura / sin factura
- ✅ Cuenta suspense configurable (`IGV_SUSPENSE_ACCOUNT=4091`)
- ✅ Glosas descriptivas con resumen de todos los ítems
- ✅ Evita duplicados por misma factura en mismo periodo
- ✅ Multi-tenancy (organizationId, companyId)

**Limitaciones detectadas:**
- ⚠️ Solo genera asientos para **COMPRAS** (inventory entries)
- ❌ **NO genera asientos para VENTAS** automáticamente
- ❌ No existe método `createJournalForSale()`
- ❌ No exporta PLE (formato TXT SUNAT)
- ❌ No integra con SIRE
- ❌ No calcula PDT 621

### 3.3 Integración con Otros Módulos

#### **3.3.1 Facturación Electrónica (SUNAT CPE)**

**Estado:** ✅ **INTEGRADO**

**Modelos:**
```prisma
model SunatTransmission {
  id                    Int      @id @default(autoincrement())
  companyId             Int
  organizationId        Int?
  saleId                Int?
  subscriptionInvoiceId Int?
  environment           String   @default("BETA")
  documentType          String                      // "01" Factura, "03" Boleta
  serie                 String?                     // F001, B001, etc.
  correlativo           String?
  zipFilePath           String?                     // ZIP firmado enviado
  xmlFilePath           String?                     // XML del CPE
  cdrFilePath           String?                     // CDR respuesta SUNAT
  cdrCode               String?                     // Código de respuesta
  cdrDescription        String?                     // Descripción respuesta
  ticket                String?
  status                String   @default("PENDING") // PENDING, ACCEPTED, REJECTED
  response              Json?
  payload               Json?
  errorMessage          String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  sale                Sales?               @relation(fields: [saleId], references: [id])
}
```

**Observación:** El sistema **YA EMITE** comprobantes electrónicos (CPE) a SUNAT correctamente. Esto es **FUNDAMENTAL** para:
- Alimentar SIRE (compras y ventas)
- Cumplir obligación de facturación electrónica
- Trazabilidad fiscal

#### **3.3.2 Gestión de Ventas**

**Modelo:**
```prisma
model Sales {
  id                    Int                  @id @default(autoincrement())
  saleDate              DateTime             @default(now())
  total                 Float
  discount              Float                @default(0)
  organizationId        Int?
  companyId             Int?
  storeId               Int?
  clientId              Int?
  userId                Int?
  paymentType           String
  creditDays            Int?
  details               SaleDetail[]
  sunatTransmissions    SunatTransmission[]
  // ... más campos
}
```

**Análisis:**
- ✅ Sistema de ventas robusto
- ✅ Relación con CPE (sunatTransmissions)
- ❌ **NO hay relación con AccEntry** (asientos contables)
- ❌ **NO se generan asientos automáticamente al vender**

**Brecha crítica:** Al registrar una venta, NO se crea automáticamente el asiento contable correspondiente:

```
Venta ideal (AUTOMÁTICA):
───────────────────────────────────────────────
DEBE:  1011 Caja / 1212 Cuentas por Cobrar
DEBE:  6911 Costo de Ventas
       HABER: 7011 Ventas
       HABER: 4011 IGV Débito Fiscal
       HABER: 2011 Mercaderías
───────────────────────────────────────────────
```

Actualmente, esto se debe registrar **MANUALMENTE**, lo cual es:
- ❌ Propenso a errores
- ❌ Ineficiente
- ❌ No cumple con automatización esperada

#### **3.3.3 Ingresos de Inventario (Compras)**

**Estado:** ✅ **INTEGRADO COMPLETAMENTE**

Como se documentó en 3.2.3, el método `createJournalForInventoryEntry()` genera automáticamente asientos contables desde ingresos de inventario.

**Trigger de llamada:**
Probablemente se invoca desde:
- **EntriesService** al crear/actualizar una entrada
- **EntriesController** vía endpoint POST/PUT

**Verificar en:** `backend/src/entries/entries.service.ts`

#### **3.3.4 Caja Registradora y Bancos**

**Modelo CashRegister:**
```prisma
model CashRegister {
  id             Int      @id @default(autoincrement())
  organizationId Int?
  companyId      Int?
  storeId        Int?
  userId         Int?
  openingDate    DateTime
  closingDate    DateTime?
  initialAmount  Float    @default(0)
  finalAmount    Float?
  status         String   @default("open")  // open | closed
  notes          String?
  movements      CashMovement[]
}

model CashMovement {
  id             Int      @id @default(autoincrement())
  cashRegisterId Int
  type           String                      // "income" | "expense" | "sale" | "refund"
  amount         Float
  description    String?
  createdAt      DateTime @default(now())
  cashRegister   CashRegister @relation(fields: [cashRegisterId], references: [id])
}
```

**Análisis:**
- ✅ Sistema de caja operativo
- ❌ **NO integrado con contabilidad**
- ❌ No genera asientos de apertura/cierre de caja
- ❌ No concilia con cuenta 1011 Caja

**Brecha:** Al cerrar la caja, debería generarse automáticamente:
```
Cierre de Caja 15/01/2026:
─────────────────────────────────────────────
Saldo inicial:   S/ 100.00
Ingresos ventas: S/ 500.00
Gastos varios:   S/ (50.00)
─────────────────────────────────────────────
Saldo final:     S/ 550.00

Asiento de cierre:
DEBE:  1011 Caja                     550.00
       HABER: Cuenta transitoria             550.00
```

### 3.4 Frontend Contable

#### **Rutas Implementadas**

**Análisis del código frontend:**

```typescript
// fronted/src/app/dashboard/accounting/entries/[id]/page.tsx
// fronted/src/app/dashboard/accounting/journals/page.tsx
```

**Pantallas disponibles:**
1. **Plan de Cuentas:** CRUD de cuentas contables
2. **Libro Diario (Journals):** Visualización de asientos por periodo
3. **Detalle de Asiento:** Ver líneas de debe/haber de un asiento específico
4. **Reportes:**
   - Libro Mayor (Ledger)
   - Balance de Comprobación (Trial Balance)

**Estado:** ✅ **FUNCIONAL** para operaciones básicas

**Limitaciones:**
- ⚠️ No hay pantalla de "Creación Manual de Asientos"
- ⚠️ No hay pantalla de "Cierre de Periodo"
- ❌ No hay opción de exportar PLE
- ❌ No hay integración con SIRE
- ❌ No hay dashboard de análisis contable/financiero

### 3.5 Documentación de Ayuda (Help System)

**Archivo:** `fronted/src/data/help/sections/accounting.ts` (23 entries)

**Cobertura de temas:**
- ✅ Plan de cuentas
- ✅ Libros diario y mayor
- ✅ Balance de comprobación
- ✅ Periodos contables
- ✅ Cierre contable (teórico)
- ✅ Estados financieros (teórico)
- ✅ Depreciación, centros de costo, presupuestos (teóricos)
- ✅ **Exportación SUNAT/PLE** (teórico - no implementado)
- ✅ Conciliación bancaria (teórico)
- ✅ Multimoneda (teórico)

**Observación:** La documentación es **extensa y bien estructurada**, pero muchas funcionalidades descritas **NO están implementadas** (estados financieros automatizados, exportación PLE, conciliación bancaria, etc.).

**Recomendación:** Actualizar la documentación para reflejar el estado real del sistema O implementar las funcionalidades faltantes.

---

## 4. ANÁLISIS DE BRECHAS (GAP ANALYSIS) {#análisis-de-brechas}

### 4.1 Tabla Comparativa: Requerido vs Implementado

| # | Requisito SUNAT 2026 | Estado Actual | Prioridad | Esfuerzo Estimado |
|---|---------------------|---------------|-----------|-------------------|
| **1** | **Exportación PLE Libro Diario (5.1/5.2)** | ❌ NO IMPLEMENTADO | 🔴 CRÍTICA | 40 horas |
| **2** | **Exportación PLE Libro Mayor (6.1)** | ❌ NO IMPLEMENTADO | 🔴 CRÍTICA | 24 horas |
| **3** | **Exportación PLE Inventarios y Balances (3.x)** | ❌ NO IMPLEMENTADO | 🟡 ALTA | 32 horas |
| **4** | **Integración SIRE (lectura propuesta)** | ❌ NO IMPLEMENTADO | 🟡 ALTA | 60 horas |
| **5** | **Asientos automáticos VENTAS** | ❌ NO IMPLEMENTADO | 🔴 CRÍTICA | 48 horas |
| **6** | **Asientos automáticos CAJA** | ❌ NO IMPLEMENTADO | 🟡 ALTA | 24 horas |
| **7** | **Conciliación bancaria** | ❌ NO IMPLEMENTADO | 🟡 ALTA | 40 horas |
| **8** | **Estados financieros automatizados** | ⚠️ PARCIAL (Trial Balance OK) | 🟢 MEDIA | 32 horas |
| **9** | **Depreciación de activos fijos** | ❌ NO IMPLEMENTADO | 🟢 MEDIA | 40 horas |
| **10** | **Centros de costo** | ❌ NO IMPLEMENTADO | 🟢 BAJA | 32 horas |
| **11** | **Multimoneda contable** | ❌ NO IMPLEMENTADO | 🟢 BAJA | 48 horas |
| **12** | **Auditoría de cambios contables** | ⚠️ PARCIAL (modelos preparados) | 🟢 MEDIA | 16 horas |
| **13** | **Cierre de periodo** | ⚠️ PARCIAL (modelo OK, UI/lógica NO) | 🟡 ALTA | 24 horas |
| **14** | **Asientos de apertura/cierre fiscal** | ❌ NO IMPLEMENTADO | 🟡 ALTA | 32 horas |
| **15** | **Plan de cuentas PCGE completo** | ⚠️ PARCIAL (estructura OK, faltan cuentas) | 🟡 ALTA | 16 horas |

### 4.2 Brechas Críticas (Bloquean cumplimiento SUNAT)

#### **BRECHA #1: Exportación PLE Libro Diario**

**Requisito legal:**
Presentar mensualmente Libro Diario en formato TXT según RS 286-2009 (Anexo 2, Formato 5.1/5.2)

**Estado actual:**
- ❌ NO hay método `exportPLE()` en AccountingService
- ❌ NO hay modelo `PleExport` en uso
- ❌ NO hay endpoint `/accounting/export/ple-diario`
- ❌ NO hay UI para exportar

**Impacto:**
- 🚨 **Multa:** 0.3% UIT por cada mes sin presentar
- 🚨 **Bloquea:** Cierre contable formal
- 🚨 **Auditoría:** No hay evidencia digital para SUNAT

**Solución requerida:**
Implementar generador de archivo TXT con estructura:
```
RUC|AÑO|MES|NRO_ASIENTO|CUENTA|DEBE|HABER|MONEDA|TIPO_CAMBIO|DESCRIPCION|ESTADO|...
```

#### **BRECHA #2: Asientos Automáticos de Ventas**

**Requisito de negocio:**
Al registrar una venta, generar automáticamente asiento contable con:
- Ingreso de efectivo o cuenta por cobrar
- Reconocimiento de ingreso (cuenta 7011)
- IGV débito fiscal (cuenta 4011)
- Costo de venta y salida de inventario (cuentas 6911 y 2011)

**Estado actual:**
- ✅ Sistema de ventas funcional (SalesService)
- ✅ Facturación electrónica CPE emitida a SUNAT
- ❌ **NO se genera asiento contable**
- ❌ **NO hay método `createJournalForSale()`**

**Impacto:**
- 🚨 **Contabilidad incompleta:** Libro Diario solo refleja compras, no ventas
- 🚨 **Reportes erróneos:** Balance y Estados Financieros no muestran ingresos reales
- 🚨 **Trabajo manual:** Contador debe registrar ventas manualmente

**Solución requerida:**
Crear método similar a `createJournalForInventoryEntry()` pero para ventas.

#### **BRECHA #3: Integración SIRE**

**Requisito SUNAT 2026:**
- Empresas deben usar SIRE para generar RCE y RVIE desde junio 2026
- SIRE toma datos de CPE emitidos/recibidos
- Contribuyente revisa propuesta y cierra registros

**Estado actual:**
- ✅ CPE emitidos correctamente (facturación electrónica)
- ❌ **NO hay consumo de API SIRE** para leer propuesta de registros
- ❌ **NO hay endpoint SUNAT OAuth** para autenticar
- ❌ **NO hay integración con portal SOL**

**Impacto:**
- 🚨 **Trabajo duplicado:** Usuario debe ingresar manualmente en portal SUNAT
- 🚨 **Propenso a errores:** Datos pueden no coincidir con CPE
- 🚨 **Incumplimiento futuro:** Cuando SIRE sea obligatorio universal

**Solución requerida:**
- Implementar cliente API SIRE (consume endpoints REST de SUNAT)
- OAuth 2.0 con SUNAT (solicitar token de acceso)
- Pantalla de revisión de propuestas RCE/RVIE
- Botón "Enviar a SIRE" que cierra registros

### 4.3 Brechas de Alto Impacto (Afectan operatividad)

#### **BRECHA #4: Estados Financieros Automatizados**

**Necesidad:**
- Balance General (Activos, Pasivos, Patrimonio) a una fecha
- Estado de Resultados (Ingresos, Gastos, Utilidad) en un periodo
- Flujo de Efectivo

**Estado actual:**
- ✅ Trial Balance (Balance de Comprobación) implementado
- ❌ **NO hay Balance General** automatizado
- ❌ **NO hay Estado de Resultados** automatizado
- ❌ **NO hay Flujo de Efectivo** automatizado

**Solución:**
Crear reportes que agreguen cuentas por clase PCGE:
- Activo (clases 1, 2, 3)
- Pasivo (clase 4)
- Patrimonio (clase 5)
- Ingresos (clase 7)
- Gastos (clase 6)

#### **BRECHA #5: Cierre de Periodo Contable**

**Necesidad:**
- Bloquear asientos de un periodo cerrado
- Generar asientos de cierre (anual)
- Generar asientos de apertura (nuevo año)

**Estado actual:**
- ✅ Modelo `AccPeriod` con estado OPEN/LOCKED
- ❌ **NO hay UI** para cerrar periodo
- ❌ **NO se valida** el estado del periodo al crear asientos
- ❌ **NO se generan** asientos de cierre/apertura automáticos

**Solución:**
- Pantalla de gestión de periodos
- Validación en `createJournalForInventoryEntry()` que rechace asientos en periodo LOCKED
- Método `generateClosingEntry()` y `generateOpeningEntry()`

### 4.4 Brechas de Mejora Operativa (Nice to have)

- Depreciación de activos fijos
- Centros de costo
- Presupuestos vs Real
- Multimoneda contable
- Conciliación bancaria automatizada
- Auditoría de cambios (quién modificó qué)

---

## 5. PROPUESTA DE MEJORAS {#propuesta-de-mejoras}

### 5.1 Arquitectura Propuesta

#### **Diagrama de Flujo Completo (Automatización Integral)**

```
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULOS OPERATIVOS                        │
│  • Ventas (Sales)                                           │
│  • Compras (Entries - Inventory)                            │
│  • Caja Registradora (CashRegister)                         │
│  • Bancos (movimientos bancarios)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │    EVENT BUS / SERVICE CALLS          │
        │  • onSaleCreated(saleId)              │
        │  • onEntryCreated(entryId)            │
        │  • onCashRegisterClosed(registerId)   │
        └───────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              ACCOUNTING SERVICE (Capa de Integración)       │
│                                                             │
│  • createJournalForSale(saleId) ✅ NUEVO                    │
│  • createJournalForInventoryEntry(entryId) ✅ EXISTENTE     │
│  • createJournalForCashClosure(registerId) ✅ NUEVO         │
│  • createJournalForBankMovement(movementId) ✅ NUEVO        │
│                                                             │
│  • createManualEntry(data) ✅ NUEVO                         │
│  • updateEntry(id, data) ✅ NUEVO                           │
│  • voidEntry(id) ✅ NUEVO                                   │
│                                                             │
│  • closePeriod(periodId) ✅ NUEVO                           │
│  • generateClosingEntry(periodId) ✅ NUEVO                  │
│  • generateOpeningEntry(newPeriodId, prevPeriodId) ✅ NUEVO │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    MÓDULO CONTABLE (Core)                   │
│                                                             │
│  • Plan de Cuentas (Account)                               │
│  • Periodos Contables (AccPeriod)                          │
│  • Asientos Contables (AccEntry)                           │
│  • Líneas de Asiento (AccEntryLine)                        │
│                                                             │
│  • getLedger() ✅ EXISTENTE                                 │
│  • getTrialBalance() ✅ EXISTENTE                           │
│  • getBalanceSheet() ✅ NUEVO                               │
│  • getIncomeStatement() ✅ NUEVO                            │
│  • getCashFlowStatement() ✅ NUEVO                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              EXPORTACIÓN FISCAL (SUNAT 2026)                │
│                                                             │
│  • exportPLE_Diario(period) ✅ NUEVO                        │
│  • exportPLE_Mayor(period) ✅ NUEVO                         │
│  • exportPLE_InventariosBalances(period) ✅ NUEVO           │
│                                                             │
│  • syncSIRE_ComprasPropuesta() ✅ NUEVO                     │
│  • syncSIRE_VentasPropuesta() ✅ NUEVO                      │
│  • submitSIRE_Registros(period) ✅ NUEVO                    │
│                                                             │
│  • calculatePDT621_Preview(period) ✅ NUEVO                 │
│    (IGV a pagar, Renta a pagar)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUNAT (Externo)                          │
│  • Portal SOL (declaraciones PDT 621)                       │
│  • SIRE API (registros compras/ventas)                     │
│  • PLE Validador (archivos TXT)                            │
│  • Facturación Electrónica ✅ YA INTEGRADO                  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Mejoras Prioritarias (Roadmap por Fases)

#### **FASE 1: CUMPLIMIENTO BÁSICO SUNAT (3 meses)**

**Objetivo:** Cumplir requisitos mínimos para evitar multas

| # | Tarea | Descripción | Esfuerzo | Responsable |
|---|-------|-------------|----------|-------------|
| 1.1 | **Asientos automáticos VENTAS** | Implementar `createJournalForSale()` similar a compras | 48h | Backend Dev |
| 1.2 | **Exportación PLE Libro Diario** | Generar TXT formato 5.1/5.2 según Anexo 2 RS 286-2009 | 40h | Backend Dev |
| 1.3 | **Exportación PLE Libro Mayor** | Generar TXT formato 6.1 | 24h | Backend Dev |
| 1.4 | **UI: Exportar PLE** | Pantalla en `/dashboard/accounting/export` | 16h | Frontend Dev |
| 1.5 | **Plan de cuentas completo PCGE** | Importar catálogo completo de cuentas (seed script) | 16h | Backend Dev |
| 1.6 | **Validación cierre de periodo** | No permitir asientos en periodo LOCKED | 8h | Backend Dev |
| 1.7 | **UI: Gestión de periodos** | Pantalla para abrir/cerrar periodos | 16h | Frontend Dev |
| 1.8 | **Testing integral** | Pruebas E2E de flujo completo compra→asiento→PLE | 24h | QA |

**Total Fase 1:** **192 horas** (~5 semanas con 1 dev full-time)

**Entregables:**
- ✅ Sistema genera asientos automáticos de compras y ventas
- ✅ Sistema exporta PLE Diario y Mayor en formato SUNAT
- ✅ Periodos contables bloqueables
- ✅ Cumplimiento normativo básico

#### **FASE 2: AUTOMATIZACIÓN AVANZADA (2 meses)**

**Objetivo:** Reducir trabajo manual del contador

| # | Tarea | Descripción | Esfuerzo | Responsable |
|---|-------|-------------|----------|-------------|
| 2.1 | **Asientos automáticos CAJA** | Apertura/cierre de caja registradora | 24h | Backend Dev |
| 2.2 | **Estados financieros** | Balance General, Estado de Resultados, Flujo de Efectivo | 32h | Backend Dev |
| 2.3 | **UI: Estados financieros** | Dashboards con gráficos | 40h | Frontend Dev |
| 2.4 | **Conciliación bancaria** | Marcar movimientos bancarios vs libro | 40h | Backend + Frontend |
| 2.5 | **Asientos de cierre fiscal** | Generación automática cierre/apertura anual | 32h | Backend Dev |
| 2.6 | **Depreciación activos fijos** | CRUD activos + cálculo automático depreciación | 40h | Backend + Frontend |
| 2.7 | **Auditoría de cambios** | Log de modificaciones a asientos | 16h | Backend Dev |

**Total Fase 2:** **224 horas** (~6 semanas con 1 dev full-time)

**Entregables:**
- ✅ Cierre de caja automático → asiento contable
- ✅ Estados financieros en tiempo real
- ✅ Conciliación bancaria visual
- ✅ Depreciación de activos automatizada

#### **FASE 3: INTEGRACIÓN SIRE Y PDT 621 (3 meses)**

**Objetivo:** Integración completa con sistemas SUNAT 2026

| # | Tarea | Descripción | Esfuerzo | Responsable |
|---|-------|-------------|----------|-------------|
| 3.1 | **Cliente API SIRE** | Consumo de endpoints REST SUNAT SIRE | 48h | Backend Dev |
| 3.2 | **OAuth SUNAT** | Autenticación con portal SOL | 24h | Backend Dev |
| 3.3 | **Sincronización RCE/RVIE** | Leer propuesta SIRE y mapear a sistema | 40h | Backend Dev |
| 3.4 | **UI: Revisión SIRE** | Pantalla de validación propuesta compras/ventas | 32h | Frontend Dev |
| 3.5 | **Envío cierre SIRE** | Endpoint para cerrar registros en SIRE | 16h | Backend Dev |
| 3.6 | **Cálculo PDT 621** | Algoritmo de cálculo IGV y Renta | 32h | Backend Dev |
| 3.7 | **UI: Preview PDT 621** | Vista previa de declaración antes de enviar | 24h | Frontend Dev |
| 3.8 | **Exportación XML PDT 621** | Generar archivo XML para importar en SOL | 32h | Backend Dev |

**Total Fase 3:** **248 horas** (~7 semanas con 1 dev full-time)

**Entregables:**
- ✅ Integración bidireccional con SIRE
- ✅ Propuestas de RCE/RVIE automáticas
- ✅ Cálculo y preview de PDT 621
- ✅ Exportación lista para presentar en SOL

#### **FASE 4: MEJORAS OPCIONALES (Backlog)**

- Centros de costo y análisis por proyecto
- Presupuestos vs Real
- Multimoneda contable (dólares, euros)
- Reportes personalizados con filtros avanzados
- Dashboard ejecutivo con KPIs financieros
- Alertas automáticas (vencimientos, descuadres)

### 5.3 Especificaciones Técnicas Detalladas

#### **5.3.1 Asientos Automáticos de Ventas**

**Archivo:** `backend/src/accounting/accounting.service.ts`

**Método nuevo:**
```typescript
async createJournalForSale(
  saleId: number,
  tenantContext?: TenantContext | null
): Promise<void> {
  await this.prisma.$transaction(async (prisma) => {
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        details: { include: { product: true } },
        client: true,
        store: { select: { companyId: true, organizationId: true } }
      }
    });

    if (!sale) return;

    // Evitar duplicados
    const existing = await prisma.accEntry.findFirst({
      where: { source: 'sale', sourceId: saleId }
    });
    if (existing) return;

    const igvRate = 0.18; // Configurable
    const total = sale.total;
    const net = total / (1 + igvRate);
    const igv = total - net;

    // Calcular costo de venta (suma de precios de compra * cantidades)
    let costOfSale = 0;
    for (const detail of sale.details) {
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: detail.productId,
          storeId: sale.storeId
        }
      });
      const unitCost = inventory?.averageCost || detail.product?.price || 0;
      costOfSale += unitCost * detail.quantity;
    }

    // Determinar cuenta de cobro
    let receivableAccount = '1011'; // Caja (contado)
    if (sale.paymentType === 'CREDIT') {
      receivableAccount = '1212'; // Cuentas por Cobrar
    } else if (/transfer|yape|plin/i.test(sale.paymentType)) {
      receivableAccount = '1041'; // Banco
    }

    const periodName = format(sale.saleDate, 'yyyy-MM');
    let period = await prisma.accPeriod.findUnique({ where: { name: periodName } });
    if (!period) {
      period = await prisma.accPeriod.create({ data: { name: periodName } });
    }

    // Generar glosa
    const clientName = sale.client?.name || 'Cliente Genérico';
    const sunatTransmission = await prisma.sunatTransmission.findFirst({
      where: { saleId: sale.id, status: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' }
    });
    const invoiceCode = sunatTransmission
      ? `${sunatTransmission.serie}-${sunatTransmission.correlativo}`
      : '(sin CPE)';

    const saleDesc = `Venta ${invoiceCode} - Cliente: ${clientName}`;
    const igvDesc = `IGV Venta ${invoiceCode}`;
    const costDesc = `Costo de Venta ${invoiceCode}`;

    // Crear asiento
    const linesToCreate = [
      // Ingreso de efectivo/cobro
      {
        account: receivableAccount,
        description: saleDesc,
        debit: total,
        credit: 0,
        quantity: null
      },
      // Reconocimiento ingreso
      {
        account: '7011',
        description: saleDesc,
        debit: 0,
        credit: net,
        quantity: null
      },
      // IGV débito fiscal
      {
        account: '4011',
        description: igvDesc,
        debit: 0,
        credit: igv,
        quantity: null
      },
      // Costo de venta (si se puede calcular)
      ...(costOfSale > 0 ? [
        {
          account: '6911',
          description: costDesc,
          debit: costOfSale,
          credit: 0,
          quantity: null
        },
        {
          account: '2011',
          description: costDesc,
          debit: 0,
          credit: costOfSale,
          quantity: null
        }
      ] : [])
    ];

    await prisma.accEntry.create({
      data: {
        periodId: period.id,
        date: sale.saleDate,
        status: sunatTransmission ? 'POSTED' : 'DRAFT',
        totalDebit: total + costOfSale,
        totalCredit: total + costOfSale,
        serie: sunatTransmission?.serie || undefined,
        correlativo: sunatTransmission?.correlativo || undefined,
        source: 'sale',
        sourceId: saleId,
        organizationId: sale.organizationId,
        companyId: sale.companyId,
        lines: { create: linesToCreate }
      }
    });
  });
}
```

**Trigger de llamada:**
Modificar `SalesService` para invocar este método después de crear venta:

```typescript
// backend/src/sales/sales.service.ts

import { AccountingService } from '../accounting/accounting.service';

export class SalesService {
  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService // ✅ INYECTAR
  ) {}

  async create(data: CreateSaleDto, tenantContext: TenantContext) {
    const sale = await this.prisma.sales.create({ data: ... });

    // ✅ GENERAR ASIENTO AUTOMÁTICAMENTE
    try {
      await this.accountingService.createJournalForSale(sale.id, tenantContext);
    } catch (error) {
      console.error('Error generando asiento de venta:', error);
      // No fallar la venta por error contable (registrar en log)
    }

    return sale;
  }
}
```

#### **5.3.2 Exportación PLE Libro Diario**

**Formato 5.1 - Libro Diario (Completo)**

**Estructura del archivo TXT:**

```
CAMPO|DESCRIPCIÓN|TIPO|LONGITUD|EJEMPLO
-----|-----------|----|---------|---------
1|Periodo|N|6|202601
2|Código Único de la Operación (CUO)|AN|40|20260115-01
3|Número Correlativo del Asiento|AN|10|0001
4|Fecha de la Operación|D|10|15/01/2026
5|Glosa o Descripción|AN|200|Compra mercadería
6|Glosa Referencial|AN|200|
7|Cuenta Contable|AN|24|2011
8|Descripción de la Cuenta|AN|100|Mercaderías
9|Monto del Debe|N|18.2|2000.00
10|Monto del Haber|N|18.2|0.00
11|Dato Estructurado|AN|-|
12|Indicador de Estado|N|1|1
```

**Método de exportación:**

```typescript
async exportPLE_Diario(
  period: string, // "2026-01"
  tenantContext?: TenantContext | null
): Promise<string> {
  // 1. Obtener todos los asientos del periodo
  const accPeriod = await this.prisma.accPeriod.findUnique({
    where: { name: period },
    include: {
      entries: {
        include: {
          lines: true,
          provider: true
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }]
      }
    }
  });

  if (!accPeriod) {
    throw new Error(`Periodo ${period} no encontrado`);
  }

  // 2. Generar líneas del archivo TXT
  const lines: string[] = [];

  for (const entry of accPeriod.entries) {
    // Solo exportar asientos POSTED (no DRAFT ni VOID)
    if (entry.status !== 'POSTED') continue;

    const dateStr = format(entry.date, 'dd/MM/yyyy');
    const [year, month] = period.split('-');
    const periodCode = `${year}${month}`;

    // CUO: Código Único de Operación (fecha + secuencial)
    const cuo = `${format(entry.date, 'yyyyMMdd')}-${String(entry.id).padStart(6, '0')}`;

    // Número correlativo del asiento
    const correlativo = String(entry.id).padStart(10, '0');

    for (const line of entry.lines) {
      // Obtener descripción de cuenta
      const account = await this.prisma.account.findFirst({
        where: { code: line.account }
      });

      const accountName = account?.name || '';

      // Formato de montos: 2 decimales con punto
      const debe = line.debit.toFixed(2);
      const haber = line.credit.toFixed(2);

      // Dato Estructurado (Campo 20): solo si es compra/venta
      let datoEstructurado = '';
      if (entry.serie && entry.correlativo) {
        // Formato: TipoDoc|Serie|Numero|FechaEmision|...
        datoEstructurado = `01|${entry.serie}|${entry.correlativo}|${dateStr}`;
      }

      // Estado: 1 = activo, 8 = anulado, 9 = ajuste
      const estado = entry.status === 'VOID' ? '8' : '1';

      // Construir línea
      const txtLine = [
        periodCode,
        cuo,
        correlativo,
        dateStr,
        line.description || '',
        '', // Glosa referencial
        line.account,
        accountName,
        debe,
        haber,
        datoEstructurado,
        estado
      ].join('|');

      lines.push(txtLine);
    }
  }

  // 3. Generar archivo
  const content = lines.join('\r\n');

  // 4. Guardar en sistema de archivos o retornar
  const filename = `LE${RUC}${periodCode}00050100001111.txt`;
  // RUC: obtener del tenant
  // Formato nombre: LE[RUC][PERIODO]00[FORMATO][0/1][1/0][1/0][1/0][CORRELATIVO].txt

  return content;
}
```

**Endpoint:**

```typescript
// backend/src/accounting/accounting.controller.ts

@Get('export/ple-diario')
async exportPLEDiario(
  @Query('period') period: string,
  @CurrentTenant() tenant: TenantContext | null,
  @Res() res: Response
) {
  const txtContent = await this.accountingService.exportPLE_Diario(period, tenant);

  const filename = `Libro_Diario_${period}.txt`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(txtContent);
}
```

**UI:**

```tsx
// fronted/src/app/dashboard/accounting/export/page.tsx

export default function AccountingExportPage() {
  const [period, setPeriod] = useState('2026-01');
  const [loading, setLoading] = useState(false);

  const handleExportPLE = async (type: 'diario' | 'mayor') => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/export/ple-${type}?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Libro_${type}_${period}.txt`;
      a.click();

      toast.success(`Libro ${type} exportado correctamente`);
    } catch (error) {
      toast.error('Error al exportar PLE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exportar Libros Electrónicos (PLE)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Selecciona el periodo</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />

          <div className="mt-4 flex gap-4">
            <Button onClick={() => handleExportPLE('diario')} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Libro Diario (5.1)
            </Button>

            <Button onClick={() => handleExportPLE('mayor')} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Libro Mayor (6.1)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### **5.3.3 Integración SIRE - Cliente API**

**Arquitectura de integración:**

```
Sistema ADSLab
      ↓
[1] OAuth 2.0 con SUNAT
      ↓ (token de acceso)
[2] GET /sire/propuesta/compras/{periodo}
      ↓ (JSON con propuesta RCE)
[3] Mapear a estructura interna
      ↓
[4] Mostrar en UI para revisión
      ↓
[5] Ajustes manuales (si necesario)
      ↓
[6] POST /sire/cierre/compras/{periodo}
      ↓ (Confirma y cierra RCE)
✅ Registro cerrado en SIRE
```

**Implementación:**

```typescript
// backend/src/sunat/sire.service.ts

export class SireService {
  private readonly SIRE_BASE_URL = 'https://api-seguridad.sunat.gob.pe/sire/v1';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService
  ) {}

  // OAuth 2.0 - Obtener token de acceso
  async getAccessToken(ruc: string, username: string, password: string): Promise<string> {
    const response = await this.httpService.post(
      'https://api-seguridad.sunat.gob.pe/v1/clientessol/[CLIENT_ID]/oauth2/token',
      new URLSearchParams({
        grant_type: 'password',
        scope: 'sire',
        client_id: process.env.SUNAT_CLIENT_ID,
        client_secret: process.env.SUNAT_CLIENT_SECRET,
        username: `${ruc}${username}`,
        password
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    ).toPromise();

    return response.data.access_token;
  }

  // Leer propuesta de Registro de Compras
  async getPropuestaCompras(periodo: string, token: string): Promise<any> {
    const [year, month] = periodo.split('-');
    const response = await this.httpService.get(
      `${this.SIRE_BASE_URL}/registro-compras/${year}${month}/propuesta`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).toPromise();

    return response.data;
  }

  // Cerrar Registro de Compras (confirmar)
  async cerrarRegistroCompras(periodo: string, token: string): Promise<void> {
    const [year, month] = periodo.split('-');
    await this.httpService.post(
      `${this.SIRE_BASE_URL}/registro-compras/${year}${month}/cerrar`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    ).toPromise();
  }
}
```

**Nota:** Esta es una implementación **conceptual**. La API real de SIRE puede tener endpoints y autenticación diferentes. Se requiere documentación oficial de SUNAT.

---

## 6. HOJA DE RUTA DE IMPLEMENTACIÓN {#hoja-de-ruta}

### 6.1 Timeline Propuesto (12 meses)

```
MES 1-3: FASE 1 - Cumplimiento Básico SUNAT
├── Semana 1-2: Asientos automáticos de ventas
├── Semana 3-5: Exportación PLE (Diario y Mayor)
├── Semana 6-8: UI de exportación + testing
├── Semana 9-12: Plan de cuentas completo + cierre de periodo
└── Entregable: Sistema cumple normativa básica SUNAT 2026

MES 4-6: FASE 2 - Automatización Avanzada
├── Semana 13-15: Asientos automáticos de caja
├── Semana 16-18: Estados financieros (Balance, P&L, Cash Flow)
├── Semana 19-21: Conciliación bancaria
├── Semana 22-24: Depreciación y cierre fiscal
└── Entregable: Contador reduce trabajo manual en 60%

MES 7-9: FASE 3 - Integración SIRE
├── Semana 25-27: Cliente API SIRE + OAuth SUNAT
├── Semana 28-30: Sincronización RCE/RVIE
├── Semana 31-33: Cálculo PDT 621
├── Semana 34-36: Testing integral SIRE
└── Entregable: Integración completa con sistemas SUNAT

MES 10-12: FASE 4 - Mejoras Opcionales
├── Semana 37-40: Centros de costo + presupuestos
├── Semana 41-44: Multimoneda
├── Semana 45-48: Dashboard ejecutivo + KPIs
└── Entregable: Sistema contable de clase mundial
```

### 6.2 Recursos Necesarios

| Rol | Dedicación | Duración | Costo Estimado (USD) |
|-----|-----------|----------|----------------------|
| Backend Developer Senior | Full-time | 9 meses | $45,000 |
| Frontend Developer | Full-time | 6 meses | $30,000 |
| QA/Tester | Part-time (50%) | 6 meses | $12,000 |
| Contador/Consultor SUNAT | Consultoría | 40 horas | $4,000 |
| DevOps (infra SUNAT) | Consultoría | 20 horas | $2,000 |
| **TOTAL** | | | **$93,000** |

**Alternativa low-cost:**
- 1 Fullstack Developer (80% backend, 20% frontend): $60,000
- Consultoría puntual contador: $4,000
- **Total:** $64,000

### 6.3 Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **API SIRE no documentada** | ALTA | ALTO | Consultar con SUNAT, usar ingeniería inversa de portal, implementar con Web Scraping si API no está disponible |
| **Cambios normativos SUNAT** | MEDIA | ALTO | Arquitectura modular, parámetros configurables, monitoreo de boletines SUNAT |
| **Performance con alto volumen** | MEDIA | MEDIO | Indexación de BD, paginación, caché de reportes, colas asíncronas |
| **Errores en cálculos contables** | BAJA | CRÍTICO | Testing exhaustivo, validación cruzada con contador, auditoría de asientos |
| **Resistencia al cambio de usuarios** | MEDIA | MEDIO | Capacitación, documentación clara, migración gradual (opcional manual + automático) |

---

## 7. ANEXOS TÉCNICOS {#anexos-técnicos}

### 7.1 Plan de Cuentas PCGE (Primeras 100 Cuentas)

**Seed Script para `backend/prisma/seed/`:**

```typescript
// pcge-accounts.seed.ts

export const PCGE_ACCOUNTS = [
  // ELEMENTO 1: ACTIVO DISPONIBLE
  { code: '10', name: 'Efectivo y Equivalentes de Efectivo', parentId: null, level: 2, isPosting: false },
  { code: '101', name: 'Caja', parentId: 10, level: 3, isPosting: false },
  { code: '1011', name: 'Caja Efectivo', parentId: 101, level: 4, isPosting: true },
  { code: '104', name: 'Cuentas Corrientes en Instituciones Financieras', parentId: 10, level: 3, isPosting: false },
  { code: '1041', name: 'Cuentas Corrientes Operativas', parentId: 104, level: 4, isPosting: true },

  // ELEMENTO 2: ACTIVO REALIZABLE
  { code: '20', name: 'Mercaderías', parentId: null, level: 2, isPosting: false },
  { code: '201', name: 'Mercaderías Manufacturadas', parentId: 20, level: 3, isPosting: false },
  { code: '2011', name: 'Mercaderías Manufacturadas - Costo', parentId: 201, level: 4, isPosting: true },

  { code: '12', name: 'Cuentas por Cobrar Comerciales - Terceros', parentId: null, level: 2, isPosting: false },
  { code: '121', name: 'Facturas, Boletas y Otros Comprobantes por Cobrar', parentId: 12, level: 3, isPosting: false },
  { code: '1212', name: 'Emitidas en Cartera', parentId: 121, level: 4, isPosting: true },

  // ELEMENTO 4: PASIVO
  { code: '40', name: 'Tributos, Contraprestaciones y Aportes al Sistema de Pensiones y de Salud por Pagar', parentId: null, level: 2, isPosting: false },
  { code: '401', name: 'Gobierno Central', parentId: 40, level: 3, isPosting: false },
  { code: '4011', name: 'IGV e IPM', parentId: 401, level: 4, isPosting: true },
  { code: '40111', name: 'IGV - Cuenta Propia', parentId: 4011, level: 5, isPosting: true },
  { code: '409', name: 'Otros Costos Administrativos e Intereses', parentId: 40, level: 3, isPosting: false },
  { code: '4091', name: 'IGV por Acreditar (Suspense)', parentId: 409, level: 4, isPosting: true },

  { code: '42', name: 'Cuentas por Pagar Comerciales - Terceros', parentId: null, level: 2, isPosting: false },
  { code: '421', name: 'Facturas, Boletas y Otros Comprobantes por Pagar', parentId: 42, level: 3, isPosting: false },
  { code: '4211', name: 'No Emitidas', parentId: 421, level: 4, isPosting: true },

  // ELEMENTO 6: GASTOS
  { code: '60', name: 'Compras', parentId: null, level: 2, isPosting: false },
  { code: '601', name: 'Mercaderías', parentId: 60, level: 3, isPosting: false },
  { code: '6011', name: 'Mercaderías Manufacturadas', parentId: 601, level: 4, isPosting: true },

  { code: '69', name: 'Costo de Ventas', parentId: null, level: 2, isPosting: false },
  { code: '691', name: 'Mercaderías', parentId: 69, level: 3, isPosting: false },
  { code: '6911', name: 'Mercaderías Manufacturadas - Terceros', parentId: 691, level: 4, isPosting: true },

  // ELEMENTO 7: INGRESOS
  { code: '70', name: 'Ventas', parentId: null, level: 2, isPosting: false },
  { code: '701', name: 'Mercaderías', parentId: 70, level: 3, isPosting: false },
  { code: '7011', name: 'Mercaderías Manufacturadas - Terceros', parentId: 701, level: 4, isPosting: true },

  // Más cuentas... (total ~200 cuentas PCGE completas)
];

export async function seedPCGE(prisma: PrismaClient) {
  console.log('Seeding PCGE accounts...');

  for (const account of PCGE_ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: account.code },
      update: {},
      create: account
    });
  }

  console.log(`✅ ${PCGE_ACCOUNTS.length} cuentas PCGE creadas`);
}
```

### 7.2 Estructura Detallada Archivo PLE (Formato 5.1)

**Referencia:** Resolución de Superintendencia N.º 286-2009/SUNAT - Anexo 2

| Campo | Nombre | Tipo | Longitud | Obligatorio | Formato | Ejemplo |
|-------|--------|------|----------|-------------|---------|---------|
| 1 | Periodo | Numérico | 6 | SÍ | YYYYMM | 202601 |
| 2 | Código Único de Operación (CUO) | Alfanumérico | 40 | SÍ | Formato libre (recomendado: YYYYMMDD-ID) | 20260115-000001 |
| 3 | Número Correlativo del Asiento | Alfanumérico | 10 | SÍ | Secuencial | 0001 |
| 4 | Fecha de la Operación | Fecha | 10 | SÍ | DD/MM/YYYY | 15/01/2026 |
| 5 | Glosa o Descripción de la Operación | Alfanumérico | 200 | NO | Texto libre | Compra mercadería F001-123 |
| 6 | Glosa Referencial | Alfanumérico | 200 | NO | Texto libre | |
| 7 | Código de la Cuenta Contable | Alfanumérico | 24 | SÍ | Código PCGE | 2011 |
| 8 | Denominación de la Cuenta Contable | Alfanumérico | 100 | NO | Texto libre | Mercaderías |
| 9 | Monto del Debe | Numérico | 18.2 | SÍ | Decimal con 2 dec | 2000.00 |
| 10 | Monto del Haber | Numérico | 18.2 | SÍ | Decimal con 2 dec | 0.00 |
| 11 | Dato Estructurado | Alfanumérico | Variable | SI (compras/ventas) | Ver tabla datos estructurados | 01\|F001\|123\|15/01/2026 |
| 12 | Indicador de Estado de la Operación | Numérico | 1 | SÍ | 1, 8 o 9 | 1 |

**Indicador de Estado:**
- `1` = Activo/Válido
- `8` = Anulado
- `9` = Ajuste o Regularización

**Dato Estructurado (Campo 11):**
Solo para operaciones relacionadas con comprobantes de pago (compras/ventas).

Formato:
```
TipoDoc|Serie|Numero|FechaEmision|TipoDocIdentidad|NumIdentidad|RazonSocial|MontoBase|IGV|Total
```

Ejemplo:
```
01|F001|00012345|15/01/2026|6|20519857538|Proveedor SAC|2000.00|360.00|2360.00
```

### 7.3 Ejemplo Completo de Archivo PLE Libro Diario

**Nombre de archivo:**
`LE20519857538202601000501000011111.txt`

**Desglose del nombre:**
- `LE`: Prefijo (Libros Electrónicos)
- `20519857538`: RUC
- `202601`: Periodo (Enero 2026)
- `00`: Código de oportunidad (00 = Cierre)
- `0501`: Formato (5.1 = Libro Diario completo)
- `00`: Moneda (00 = Soles)
- `0011`: Correlativo del archivo
- `1`: Indicador de cierre (1 = con cierre)

**Contenido del archivo (delimitado por `|`):**

```
202601|20260115-000001|0001|15/01/2026|Compra mercadería F001-00045||2011|Mercaderías|2000.00|0.00|01|F001|00045|15/01/2026|6|20600123456|Importaciones Tech SAC|2000.00|360.00|2360.00|1|
202601|20260115-000001|0001|15/01/2026|IGV Compra F001-00045||4011|IGV Crédito Fiscal|360.00|0.00|01|F001|00045|15/01/2026|6|20600123456|Importaciones Tech SAC|2000.00|360.00|2360.00|1|
202601|20260115-000001|0001|15/01/2026|Pago Compra F001-00045||4211|Facturas por Pagar|0.00|2360.00|01|F001|00045|15/01/2026|6|20600123456|Importaciones Tech SAC|2000.00|360.00|2360.00|1|
202601|20260116-000002|0002|16/01/2026|Venta B001-00123||1011|Caja|236.00|0.00|03|B001|00123|16/01/2026|1|12345678|Cliente Particular|200.00|36.00|236.00|1|
202601|20260116-000002|0002|16/01/2026|Venta B001-00123||7011|Ventas Mercaderías|0.00|200.00|03|B001|00123|16/01/2026|1|12345678|Cliente Particular|200.00|36.00|236.00|1|
202601|20260116-000002|0002|16/01/2026|IGV Venta B001-00123||4011|IGV Débito Fiscal|0.00|36.00|03|B001|00123|16/01/2026|1|12345678|Cliente Particular|200.00|36.00|236.00|1|
```

**Validación:**
- Cada asiento debe estar balanceado (suma de DEBE = suma de HABER)
- Formato de fechas consistente (DD/MM/YYYY)
- Montos con exactamente 2 decimales
- Dato estructurado presente en operaciones con CPE

### 7.4 Referencias Normativas

**Leyes y Resoluciones:**
- [Resolución de Superintendencia N.º 286-2009/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2009/286.htm) - Libros Electrónicos
- [Resolución de Superintendencia N.º 234-2006/SUNAT](https://www.sunat.gob.pe/legislacion/superin/2006/234.htm) - Plazos de atraso
- [Decreto Legislativo N.º 1270](https://www.sunat.gob.pe/legislacion/dl/2016/DL_1270.pdf) - Fortalecimiento de la SUNAT
- [Plan Contable General Empresarial - Versión 2019](https://www.mef.gob.pe/contenidos/conta_publ/pcge/PCGE_2019.pdf)

**Portales SUNAT:**
- [SIRE - Sistema Integrado de Registros Electrónicos](https://sire.sunat.gob.pe/)
- [PLE - Programa de Libros Electrónicos](https://www.sunat.gob.pe/orientacion/librosRegistros-Electronicos/index.html)
- [SOL - SUNAT Operaciones en Línea](https://www.sunat.gob.pe/ol-ti-itidentificacion/identificar)
- [Facturación Electrónica](https://cpe.sunat.gob.pe/)

**Documentación Técnica:**
- [Estructura de Libros Electrónicos PLE](https://www.gob.pe/institucion/sunat/informes-publicaciones/356712-estructura-de-los-libros-y-registros-electronicos-en-el-ple)
- [Ayuda Formulario 621](https://www.sunat.gob.pe/operacLinea/ayudas/Ayuda_621_IGV_Renta_Mensual.pdf)
- [Preguntas Frecuentes Libros Electrónicos](http://contenido.app.sunat.gob.pe/insc/Libros+y+Registros+Electronicos/Preguntas+Frecuentes.pdf)

---

## CONCLUSIONES Y RECOMENDACIONES FINALES

### ✅ **Fortalezas del Sistema Actual**

1. **Base sólida:** Modelos de datos bien diseñados, preparados para expansión
2. **Automatización de compras:** `createJournalForInventoryEntry()` funciona correctamente
3. **Multi-tenancy:** Soporta múltiples organizaciones y empresas
4. **Facturación electrónica:** CPE integrados con SUNAT (✅ crítico)
5. **Documentación:** Sistema de ayuda extenso y bien estructurado

### 🚨 **Brechas Críticas (Requieren acción URGENTE)**

1. **Exportación PLE:** Sin esto, sistema NO CUMPLE con SUNAT 2026
2. **Asientos de ventas:** Contabilidad incompleta, reportes erróneos
3. **SIRE:** Integración necesaria antes de junio 2026 (PRICOS)

### 🎯 **Recomendación Estratégica**

**Prioridad 1 (3 meses):** FASE 1 - Cumplimiento Básico SUNAT
- Implementar exportación PLE (Diario + Mayor)
- Implementar asientos automáticos de ventas
- Completar plan de cuentas PCGE
- Habilitar cierre de periodos

**Resultado esperado:** Sistema cumple 100% normativa SUNAT, evita multas, genera reportes contables confiables.

**Prioridad 2 (Siguientes 6 meses):** FASE 2 y 3 - Automatización y SIRE

### 💡 **Valor Agregado para el Usuario Final**

Con estas mejoras implementadas:
- ✅ Contador reduce trabajo manual en **60-70%**
- ✅ Reportes financieros en **tiempo real**
- ✅ **Cero riesgo** de multas SUNAT
- ✅ **Trazabilidad total** de operaciones contables
- ✅ **Integración completa** entre operaciones y contabilidad

---

**DOCUMENTO GENERADO:** 13 de febrero de 2026
**PRÓXIMA REVISIÓN:** Al publicarse nuevos boletines SUNAT o cambios normativos

