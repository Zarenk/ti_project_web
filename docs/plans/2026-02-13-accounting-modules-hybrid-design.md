# Diseño de Módulos Contables Híbridos - Sistema Dual-Mode

**Fecha:** 13 de Febrero, 2026
**Versión:** 1.0
**Estado:** Diseño Aprobado - Listo para Implementación
**Autor:** Claude Sonnet 4.5

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Contexto y Motivación](#contexto-y-motivación)
3. [Objetivos del Diseño](#objetivos-del-diseño)
4. [Arquitectura del Sistema Híbrido](#arquitectura-del-sistema-híbrido)
5. [Modo Simple (Por Defecto)](#modo-simple-por-defecto)
6. [Modo Contador (Avanzado)](#modo-contador-avanzado)
7. [Sistema de Toggle y Persistencia](#sistema-de-toggle-y-persistencia)
8. [Componentes Reutilizables](#componentes-reutilizables)
9. [Flujos de Datos](#flujos-de-datos)
10. [Plan de Implementación](#plan-de-implementación)
11. [Consideraciones Técnicas](#consideraciones-técnicas)
12. [Métricas de Éxito](#métricas-de-éxito)

---

## Resumen Ejecutivo

Se diseña un **sistema contable de doble modo** que reconcilia las necesidades de usuarios sin conocimientos contables (dueños de PYME) con las de contadores profesionales, mediante dos interfaces distintas sobre la misma base de datos.

**Decisión Clave:** Priorizar **Decisiones → Educación → Verificación**, no solo registro contable.

**Solución:** Sistema híbrido con:
- **Modo Simple (por defecto):** 3 espacios modernos sin jerga contable
- **Modo Contador (opcional):** 5 módulos tradicionales mejorados
- **Toggle instantáneo** entre modos con preferencia persistente

---

## Contexto y Motivación

### Problema Identificado

Los módulos contables tradicionales (Plan de Cuentas, Diarios, Asientos, Libro Mayor, Balance de Comprobación) fueron diseñados para **contadores del siglo XX**, no para **dueños de PYME del 2026**.

**Evidencia del problema:**
- Usuarios objetivo son PYME sin formación contable
- Priorizan decisiones financieras sobre registros técnicos
- Terminología ("Debe/Haber", códigos de cuenta) confunde más que ayuda
- El sistema YA tiene automatización (hooks de ventas/compras)
- Obligaciones SUNAT pueden cumplirse sin exponer complejidad contable

### Necesidades Contradictorias

| Usuario Tipo | Necesita | NO Necesita |
|--------------|----------|-------------|
| **Dueño PYME** | ¿Puedo comprar hoy?<br>¿Mis precios son buenos?<br>Cumplir SUNAT | Ver códigos de cuenta<br>Crear asientos manuales<br>Entender Debe/Haber |
| **Contador** | Auditar asientos<br>Exportar libros oficiales<br>Ajustes manuales | Simplificaciones<br>"Esconder" la contabilidad<br>Lenguaje no técnico |

### Solución: Sistema Híbrido

En lugar de elegir entre simplicidad y completitud, **ofrecer ambas vistas sobre los mismos datos**, permitiendo al usuario elegir según su rol y experiencia.

---

## Objetivos del Diseño

### Objetivos Primarios

1. **Decisiones Primero**
   - Mostrar información accionable antes que registros históricos
   - Responder preguntas: "¿Cuánto puedo gastar?" / "¿Estoy ganando?"
   - Insights automáticos basados en patrones

2. **Educación Integrada**
   - Tooltips en CADA término técnico (ambos modos)
   - Explicar "por qué" no solo "qué"
   - Vincular conceptos contables con impacto de negocio

3. **Verificación Transparente**
   - Usuario puede validar que automatización funciona
   - Trazabilidad: venta → asiento → impacto en cuentas
   - Alertas si algo requiere atención

### Objetivos Secundarios

4. **Cumplimiento SUNAT Sin Fricción**
   - Exportaciones PLE con un click
   - Recordatorios automáticos de vencimientos
   - Validación de libros electrónicos

5. **Escalabilidad de Usuario**
   - Usuario empieza en Modo Simple
   - Puede migrar a Modo Contador cuando domine conceptos
   - Sin perder funcionalidad en ningún modo

6. **Pragmatismo Técnico**
   - Reutilizar infraestructura existente (hooks, servicios)
   - No duplicar lógica de negocio
   - Mismos datos, diferente presentación

---

## Arquitectura del Sistema Híbrido

### Principio Fundamental: Dual-Mode UI, Single Source of Truth

```
┌─────────────────────────────────────────────────────┐
│                   USUARIO                           │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │  Toggle de Modo       │
       │  (Header Component)   │
       └───────────┬───────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
   ┌───▼────┐            ┌─────▼─────┐
   │ MODO   │            │   MODO    │
   │ SIMPLE │            │ CONTADOR  │
   │  😊    │            │    👔     │
   └───┬────┘            └─────┬─────┘
       │                       │
       │ (Ambos consumen)      │
       │                       │
       └───────────┬───────────┘
                   │
       ┌───────────▼───────────┐
       │  MISMA BASE DE DATOS  │
       │  • AccEntry           │
       │  • AccEntryLine       │
       │  • Account            │
       │  • Journal            │
       └───────────────────────┘
```

### Estructura de Routing

```
/dashboard/accounting
├─ ?mode=simple (default)
│  ├─ /dinero           → Espacio "Mi Dinero"
│  ├─ /salud            → Espacio "Salud del Negocio"
│  └─ /sunat            → Espacio "SUNAT"
│
└─ ?mode=contador
   ├─ /chart            → Plan de Cuentas
   ├─ /journals         → Diarios
   ├─ /entries          → Asientos
   ├─ /reports/ledger   → Libro Mayor
   └─ /reports/trial-balance → Balance de Comprobación
```

### Filosofía de Diseño por Modo

| Aspecto | Modo Simple 😊 | Modo Contador 👔 |
|---------|----------------|------------------|
| **Filosofía** | "No soy contador, solo quiero saber si mi negocio va bien" | "Necesito registros técnicos para auditar y cumplir normas" |
| **Lenguaje** | Humano ("Lo que tienes/debes") | Técnico ("Activos/Pasivos", "Debe/Haber") |
| **Navegación** | 3 espacios temáticos | 5 módulos tradicionales |
| **Prioridad** | Insights → Gráficos → Detalles | Detalles → Análisis → Exportaciones |
| **Acciones** | Solo consulta + exportaciones SUNAT | CRUD completo + ajustes manuales |
| **Complejidad** | Baja (oculta códigos) | Alta (muestra todo) |
| **Usuario Objetivo** | Dueño PYME, gerente | Contador, asistente contable |

---

## Modo Simple (Por Defecto)

### Principio de Diseño

**"Un dueño de negocio no necesita saber contabilidad para gestionar bien su empresa."**

- Ocultar códigos de cuenta (1011, 7011, etc.)
- Evitar terminología técnica (Debe/Haber, Activo/Pasivo)
- Enfocarse en decisiones operativas y estratégicas
- Mostrar automatización como "magia que funciona"

### Estructura de Navegación

```tsx
┌─────────────────────────────────────────────────────┐
│  📊 CONTABILIDAD                 [Modo: Simple 😊]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [💰 Mi Dinero]  [📊 Salud del Negocio]  [🏛️ SUNAT] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### Espacio 1: 💰 Mi Dinero

**Propósito:** Responder "¿Cuánto dinero tengo? ¿Cuánto puedo gastar?"

**Ruta:** `/dashboard/accounting/dinero?mode=simple`

**Equivalencia Contable:** Libro Mayor de cuentas de efectivo (1011 Caja + 1041 Bancos)

#### Sección 1: Resumen de Liquidez (Decision Layer)

```tsx
┌────────────────────────────────────────────┐
│ 💰 MI DINERO AHORA                         │
│ Actualizado: Hace 5 min                    │
├────────────────────────────────────────────┤
│                                            │
│ Total disponible:    S/ 12,300.00          │
│                                            │
│ Desglose:                                  │
│ • En efectivo (caja):    S/  4,200.00     │
│ • En banco:              S/  8,100.00     │
│                                            │
│ Separado para obligaciones:                │
│ • IGV por pagar 🔒:      S/  1,800.00     │
│                                            │
│ ─────────────────────────────────────────  │
│ 🎯 Puedes gastar hoy:    S/  7,500.00     │
│                                            │
│ ℹ️ Esta es tu liquidez real después de     │
│    apartar lo que debes a SUNAT            │
│                                            │
│ [Simular compra] [Ver próximos 7 días]     │
└────────────────────────────────────────────┘
```

**Cálculo de "Puedes gastar hoy":**
```typescript
const liquidezDisponible = (efectivo + banco) - igvPorPagar - margenSeguridad

// Margen de seguridad: 20% del promedio mensual
const margenSeguridad = promedioMensual * 0.20
```

#### Sección 2: Evolución (Visualization Layer)

```tsx
┌────────────────────────────────────────────┐
│ 📈 EVOLUCIÓN (Últimos 30 días)             │
│                                            │
│ [Gráfico de área - Balance de efectivo]   │
│                                            │
│ S/12K ┤                    ●← Hoy          │
│ S/10K ┤        ╱╲        ╱                 │
│ S/ 8K ┤      ╱    ╲    ╱                   │
│ S/ 6K ┤    ╱        ╲╱                     │
│       └────────────────────────────────    │
│        1   5   10  15  20  25  30 (días)   │
│                                            │
│ Tendencia: ↗️ Creciente (+8% vs mes pasado)│
│                                            │
│ [Comparar con mes anterior]                │
└────────────────────────────────────────────┘
```

#### Sección 3: Movimientos del Día (Detail Layer)

```tsx
┌────────────────────────────────────────────┐
│ 📋 MOVIMIENTOS DE HOY                      │
│                                            │
│ 12:45 PM  💚 Entró S/ 590.00              │
│           Venta a Cliente ABC              │
│           ℹ️ Factura F001-00234            │
│           [Ver detalle]                    │
│                                            │
│ 11:30 AM  💔 Salió S/ 800.00              │
│           Compra de inventario             │
│           ℹ️ Proveedor XYZ                 │
│           [Ver detalle]                    │
│                                            │
│ 09:15 AM  💚 Entró S/ 236.00              │
│           Venta local                      │
│           ℹ️ Boleta B001-00123             │
│           [Ver detalle]                    │
│                                            │
│ [Ver todos los movimientos del mes]        │
└────────────────────────────────────────────┘
```

**Código de colores:**
- 💚 Verde: Entradas de dinero
- 💔 Rojo: Salidas de dinero
- Sin mostrar "Debe/Haber"

#### Sección 4: Insights Automáticos

```tsx
┌────────────────────────────────────────────┐
│ 💡 INSIGHTS                                │
│                                            │
│ ⚠️ Tu efectivo bajó 12% vs mes pasado      │
│    Esto pasó porque:                       │
│    • Aumentaron pagos con transferencia    │
│    • Compraste más inventario              │
│                                            │
│    Recomendación:                          │
│    → Incentiva pagos en efectivo con 5%    │
│       descuento                            │
│                                            │
│ ✅ Tu banco creció 8% - tendencia positiva │
│                                            │
│ [Ver análisis completo]                    │
└────────────────────────────────────────────┘
```

---

### Espacio 2: 📊 Salud del Negocio

**Propósito:** Responder "¿Mi negocio está sano? ¿Estoy ganando o perdiendo?"

**Ruta:** `/dashboard/accounting/salud?mode=simple`

**Equivalencia Contable:** Balance de Comprobación resumido + Estado de Resultados

#### Sección 1: Indicador General (Decision Layer)

```tsx
┌────────────────────────────────────────────┐
│ 📊 SALUD DE TU NEGOCIO                     │
│ Período: Febrero 2026                      │
├────────────────────────────────────────────┤
│                                            │
│ Estado general:  ✅ EXCELENTE               │
│                                            │
│ Lo que tienes:       S/ 27,000.00          │
│ Lo que debes:        S/  1,800.00          │
│ ─────────────────────────────────────────  │
│ Tu patrimonio neto:  S/ 25,200.00          │
│                                            │
│ Cambio vs mes pasado:  ⬆️ +8% (S/1,800)   │
│                                            │
│ ℹ️ Tu negocio vale S/25,200 en este momento│
│    y está creciendo sostenidamente         │
│                                            │
│ [Ver desglose completo]                    │
└────────────────────────────────────────────┘
```

**Criterios de "Estado general":**
```typescript
type HealthStatus = 'EXCELENTE' | 'BUENO' | 'ATENCIÓN' | 'CRÍTICO'

const evaluarSalud = (datos: FinancialData): HealthStatus => {
  const ratioSolvencia = datos.activos / datos.pasivos
  const margenGanancia = (datos.ingresos - datos.costos) / datos.ingresos
  const tendenciaPatrimonio = datos.patrimonioActual / datos.patrimonioAnterior

  if (ratioSolvencia > 10 && margenGanancia > 0.20 && tendenciaPatrimonio > 1.05) {
    return 'EXCELENTE' // ✅
  } else if (ratioSolvencia > 5 && margenGanancia > 0.10 && tendenciaPatrimonio > 1.0) {
    return 'BUENO' // ✔️
  } else if (ratioSolvencia > 2 && margenGanancia > 0) {
    return 'ATENCIÓN' // ⚠️
  } else {
    return 'CRÍTICO' // 🚨
  }
}
```

#### Sección 2: Composición de Activos (Visualization Layer)

```tsx
┌────────────────────────────────────────────┐
│ 📊 COMPOSICIÓN DE LO QUE TIENES            │
│                                            │
│ [Gráfico de dona interactivo]              │
│                                            │
│ 🟢 Efectivo (45%)        S/ 12,300         │
│    ℹ️ Dinero en caja y banco               │
│                                            │
│ 🔵 Inventario (45%)      S/ 12,300         │
│    ℹ️ Productos en stock                   │
│                                            │
│ 🟡 Por cobrar (10%)      S/  2,400         │
│    ℹ️ Clientes que te deben                │
│                                            │
│ 💡 EVALUACIÓN:                             │
│ Distribución balanceada ✅                 │
│ Tienes buen equilibrio entre liquidez     │
│ e inventario.                              │
│                                            │
│ [Ver detalle por categoría]                │
└────────────────────────────────────────────┘
```

#### Sección 3: Rentabilidad (Visualization Layer)

```tsx
┌────────────────────────────────────────────┐
│ 💰 RENTABILIDAD ESTE MES                   │
│                                            │
│ Ingresos por ventas:     S/ 45,600.00     │
│ Costos de productos:     S/ 32,400.00     │
│ ─────────────────────────────────────────  │
│ Ganancia bruta:          S/ 13,200.00     │
│ Margen de ganancia:      29% ✅            │
│                                            │
│ [Gráfico de barras comparativo]            │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ Ingresos  ████████████████████     │    │
│ │ Costos    ████████████             │    │
│ │ Ganancia  ███████                  │    │
│ └────────────────────────────────────┘    │
│                                            │
│ 💡 Tu margen de 29% está por encima del    │
│    promedio del sector (20-25%)            │
│                                            │
│ [Ver productos más rentables]              │
└────────────────────────────────────────────┘
```

#### Sección 4: Evolución del Patrimonio

```tsx
┌────────────────────────────────────────────┐
│ 📈 EVOLUCIÓN DE TU PATRIMONIO (6 meses)    │
│                                            │
│ [Gráfico de barras]                        │
│                                            │
│        Feb    Ene    Dic    Nov    Oct     │
│ S/30K   ▓                                  │
│ S/25K   ▓     ▓                           │
│ S/20K   ▓     ▓     ▓                     │
│ S/15K   ▓     ▓     ▓     ▓              │
│         ▓     ▓     ▓     ▓     ▓        │
│                                            │
│ Crecimiento promedio: 8% mensual ⬆️        │
│                                            │
│ 💡 PROYECCIÓN:                             │
│ A este ritmo, en 6 meses tu negocio        │
│ valdrá aproximadamente S/ 40,000           │
│                                            │
│ [Ver proyección detallada]                 │
└────────────────────────────────────────────┘
```

#### Sección 5: Indicadores Clave (Detail Layer Colapsable)

```tsx
┌────────────────────────────────────────────┐
│ 📊 INDICADORES DE SALUD FINANCIERA         │
│ [Expandir/Colapsar ↓]                      │
├────────────────────────────────────────────┤
│                                            │
│ ✅ Solvencia: EXCELENTE                    │
│    Ratio: 15:1 (tienes S/15 por cada S/1  │
│    que debes)                              │
│    Benchmark: >5:1 es saludable            │
│                                            │
│ ✅ Liquidez: SALUDABLE                     │
│    Efectivo disponible: S/ 12,300          │
│    Cubre 9.5 días de operación             │
│    Benchmark: >7 días es seguro            │
│                                            │
│ ✅ Rentabilidad: BUENA                     │
│    Margen bruto: 29%                       │
│    Benchmark: >20% es rentable             │
│                                            │
│ [Ver explicación de cada indicador]        │
└────────────────────────────────────────────┘
```

---

### Espacio 3: 🏛️ SUNAT (Cumplimiento)

**Propósito:** Cumplir obligaciones fiscales sin fricción

**Ruta:** `/dashboard/accounting/sunat?mode=simple`

**Equivalencia Contable:** Asientos + Libros Electrónicos + Exportaciones PLE

#### Sección 1: Próximos Vencimientos (Decision Layer)

```tsx
┌────────────────────────────────────────────┐
│ 🏛️ OBLIGACIONES CON SUNAT                  │
│ Actualizado: Hace 5 min                    │
├────────────────────────────────────────────┤
│                                            │
│ ⚠️ PRÓXIMO VENCIMIENTO                     │
│                                            │
│ IGV de Febrero 2026                        │
│                                            │
│ Monto a pagar:     S/ 1,800.00             │
│ Fecha límite:      18/02/2026 (3 días) ⏰  │
│                                            │
│ ℹ️ Este es el impuesto que cobraste en tus │
│    ventas y debes entregar a SUNAT         │
│                                            │
│ [Generar reporte de pago]                  │
│ [Exportar declaración]                     │
│ [Configurar recordatorio]                  │
│                                            │
│ 📅 Próximo después de este:                │
│ IGV de Marzo 2026 → Vence 18/03/2026       │
└────────────────────────────────────────────┘
```

**Sistema de Alertas Automáticas:**
```typescript
type AlertLevel = 'info' | 'warning' | 'urgent'

const getAlertLevel = (diasRestantes: number): AlertLevel => {
  if (diasRestantes <= 3) return 'urgent'  // 🚨
  if (diasRestantes <= 7) return 'warning' // ⚠️
  return 'info'                            // ℹ️
}

// Toast notification automático:
// - 7 días antes: "Recordatorio: IGV vence en 1 semana"
// - 3 días antes: "⚠️ URGENTE: IGV vence en 3 días"
// - 1 día antes: "🚨 CRÍTICO: IGV vence mañana!"
```

#### Sección 2: Estado de Libros Electrónicos (Verification Layer)

```tsx
┌────────────────────────────────────────────┐
│ ✅ ESTADO DE TUS LIBROS ELECTRÓNICOS       │
│                                            │
│ ✅ Libro de Ventas:   Al día (156 registros)│
│    Último registro: Hoy 12:45 PM           │
│    [Ver detalle]                           │
│                                            │
│ ✅ Libro de Compras:  Al día ( 89 registros)│
│    Último registro: Hoy 11:30 AM           │
│    [Ver detalle]                           │
│                                            │
│ ✅ Libro Diario:      Actualizado           │
│    Balance: Cuadrado ✅                     │
│    [Ver resumen]                           │
│                                            │
│ ✅ Libro Mayor:       Actualizado           │
│    Cuentas activas: 24                     │
│    [Ver resumen]                           │
│                                            │
│ 💡 Todos tus libros están sincronizados    │
│    y listos para SUNAT                     │
│                                            │
│ Última sincronización: Hoy 12:45 PM        │
│ [Forzar actualización]                     │
└────────────────────────────────────────────┘
```

#### Sección 3: Exportaciones (Action Layer)

```tsx
┌────────────────────────────────────────────┐
│ 📥 EXPORTAR PARA SUNAT                     │
│                                            │
│ Selecciona el período:                     │
│ [Febrero 2026 ▼]                           │
│                                            │
│ Formatos oficiales disponibles:            │
│                                            │
│ 📄 PLE 5.1 - Libro Diario                 │
│    Formato: TXT (oficial SUNAT)            │
│    ℹ️ Todos los asientos del mes           │
│    [Descargar]                             │
│                                            │
│ 📄 PLE 6.1 - Libro Mayor                  │
│    Formato: TXT (oficial SUNAT)            │
│    ℹ️ Movimientos por cuenta               │
│    [Descargar]                             │
│                                            │
│ 📄 Registro de Ventas                      │
│    Formato: Excel + TXT                    │
│    ℹ️ Todas tus facturas y boletas         │
│    [Descargar]                             │
│                                            │
│ 📄 Registro de Compras                     │
│    Formato: Excel + TXT                    │
│    ℹ️ Todas tus compras a proveedores      │
│    [Descargar]                             │
│                                            │
│ [Descargar todo (ZIP)]                     │
└────────────────────────────────────────────┘
```

**Wizard de Exportación (Modal):**
```tsx
Paso 1/3: Seleccionar Período
┌────────────────────────────────────────┐
│ ¿Qué mes quieres exportar?             │
│                                        │
│ [Febrero 2026 ▼]                       │
│                                        │
│ 💡 Solo puedes exportar meses cerrados │
│    (el actual NO se puede exportar)    │
│                                        │
│ [Continuar →]                          │
└────────────────────────────────────────┘

Paso 2/3: Seleccionar Formato
┌────────────────────────────────────────┐
│ ¿Qué libro necesitas?                  │
│                                        │
│ ○ Libro Diario (PLE 5.1)               │
│   Recomendado para: Declaración mensual│
│                                        │
│ ● Libro Mayor (PLE 6.1)                │
│   Recomendado para: Auditoría          │
│                                        │
│ ○ Registro de Ventas                   │
│   Recomendado para: Verificar ventas   │
│                                        │
│ [← Atrás]  [Continuar →]               │
└────────────────────────────────────────┘

Paso 3/3: Descargar
┌────────────────────────────────────────┐
│ ✅ Listo para descargar                │
│                                        │
│ Archivo: LE20519857538202602065...txt  │
│ Tamaño: 45 KB                          │
│ Período: Febrero 2026                  │
│ Formato: PLE 6.1 (Libro Mayor)         │
│                                        │
│ 📋 PRÓXIMOS PASOS:                     │
│ 1. Descarga el archivo                 │
│ 2. Ve a SUNAT SOL                      │
│    [Abrir SUNAT SOL →]                 │
│ 3. Sube el archivo en "Libros          │
│    Electrónicos"                       │
│                                        │
│ [Descargar archivo]                    │
└────────────────────────────────────────┘
```

#### Sección 4: Automatización (Transparency Layer)

```tsx
┌────────────────────────────────────────────┐
│ 🤖 AUTOMATIZACIÓN CONTABLE                 │
│                                            │
│ ✅ Sistema funcionando correctamente       │
│                                            │
│ Últimas 24 horas:                          │
│ • 12 ventas registradas automáticamente    │
│ •  3 compras registradas automáticamente   │
│ •  0 errores detectados                    │
│                                            │
│ ℹ️ El sistema crea los asientos contables  │
│    automáticamente cuando:                 │
│    • Haces una venta                       │
│    • Registras una compra                  │
│    • Ajustas inventario                    │
│                                            │
│ NO necesitas hacer nada manualmente ✅     │
│                                            │
│ [Ver log de automatización]                │
│ [Configurar alertas]                       │
└────────────────────────────────────────────┘
```

---

## Modo Contador (Avanzado)

### Principio de Diseño

**"Un contador necesita acceso completo a los registros contables con terminología técnica estándar."**

- Mostrar códigos de cuenta del PCGE
- Usar terminología técnica correcta (Debe/Haber, Activo/Pasivo)
- Permitir CRUD completo de asientos y plan de cuentas
- Mantener trazabilidad y auditoría
- PERO aún con tooltips educativos y 3 capas de diseño

### Estructura de Navegación

```tsx
┌──────────────────────────────────────────────────────┐
│  📊 CONTABILIDAD                [Modo: Contador 👔]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Módulos Contables:                                  │
│  • Plan de Cuentas                                   │
│  • Diarios                                          │
│  • Asientos                                         │
│  • Libro Mayor                                      │
│  • Balance de Comprobación                          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Diferencias Clave vs Modo Simple

| Elemento | Modo Simple | Modo Contador |
|----------|-------------|---------------|
| **Códigos** | Ocultos | Visibles (1011, 7011) |
| **Terminología** | "Dinero que entra/sale" | "Debe/Haber" |
| **Cuentas** | Categorías simples | Plan PCGE completo |
| **Creación** | Solo automática | Manual + automática |
| **Edición** | No permitida | Sí (con validaciones) |
| **Tooltips** | Básicos | Técnicos + educativos |
| **Detail Layer** | Colapsado por defecto | Expandido por defecto |

### Módulos Detallados

**Nota:** Los 5 módulos (Plan de Cuentas, Diarios, Asientos, Libro Mayor, Balance) usan el diseño ya especificado en las secciones anteriores del brainstorming, con estas adiciones:

1. **Mantienen las 3 capas:**
   - Decision Layer: Insights accionables
   - Visualization Layer: Gráficos y comparativos
   - Detail Layer: Tablas técnicas completas

2. **Agregan acciones avanzadas:**
   - Crear asiento manual
   - Editar asiento en borrador
   - Anular asiento (void)
   - Exportar a Excel personalizado

3. **Tooltips educativos omnipresentes:**
   - Cada código de cuenta: tooltip con nombre + categoría
   - Debe/Haber: explicación con ejemplos
   - Estados de asiento: qué significa cada uno

4. **Validaciones en tiempo real:**
   - Balance Debe = Haber
   - Cuentas válidas según PCGE
   - Períodos fiscales cerrados

---

## Sistema de Toggle y Persistencia

### Componente de Toggle

**Ubicación:** Header permanente de la sección de contabilidad

```tsx
// /fronted/src/app/dashboard/accounting/components/ModeToggle.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Smile, Briefcase } from 'lucide-react'
import { authFetch } from '@/utils/auth-fetch'

type AccountingMode = 'simple' | 'contador'

export function ModeToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<AccountingMode>('simple')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [targetMode, setTargetMode] = useState<AccountingMode>('simple')

  useEffect(() => {
    // Cargar modo desde URL o localStorage
    const urlMode = searchParams.get('mode') as AccountingMode
    const storedMode = localStorage.getItem('accounting-mode') as AccountingMode

    setMode(urlMode || storedMode || 'simple')
  }, [searchParams])

  const handleModeChange = (newMode: AccountingMode) => {
    if (newMode === mode) return

    setTargetMode(newMode)
    setShowConfirmation(true)
  }

  const confirmModeChange = async () => {
    // 1. Guardar en localStorage (inmediato)
    localStorage.setItem('accounting-mode', targetMode)

    // 2. Guardar en servidor (persistente)
    try {
      await authFetch('/api/users/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountingMode: targetMode })
      })
    } catch (error) {
      console.error('Error saving mode preference:', error)
    }

    // 3. Actualizar URL y estado
    setMode(targetMode)
    setShowConfirmation(false)

    // 4. Redirigir a la página principal del nuevo modo
    const basePath = '/dashboard/accounting'
    const newPath = targetMode === 'simple'
      ? `${basePath}/dinero?mode=simple`
      : `${basePath}/chart?mode=contador`

    router.push(newPath)
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border p-1 bg-muted/50">
        <Button
          variant={mode === 'simple' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleModeChange('simple')}
          className="gap-2"
        >
          <Smile className="h-4 w-4" />
          Simple
        </Button>

        <Button
          variant={mode === 'contador' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleModeChange('contador')}
          className="gap-2"
        >
          <Briefcase className="h-4 w-4" />
          Contador
        </Button>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {targetMode === 'contador'
                ? 'Cambiar a Modo Contador 👔'
                : 'Cambiar a Modo Simple 😊'
              }
            </DialogTitle>
            <DialogDescription>
              {targetMode === 'contador' ? (
                <>
                  Ahora verás:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Terminología contable técnica</li>
                    <li>Códigos de cuentas (Plan PCGE)</li>
                    <li>Asientos contables detallados</li>
                    <li>Debe/Haber en tablas</li>
                    <li>Opciones avanzadas de edición</li>
                  </ul>
                  <p className="mt-3 font-semibold">Recomendado para:</p>
                  <p>Contadores profesionales, asistentes contables, usuarios con conocimientos técnicos</p>
                </>
              ) : (
                <>
                  Ahora verás:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Lenguaje sin jerga contable</li>
                    <li>Enfoque en decisiones de negocio</li>
                    <li>Gráficos y resúmenes visuales</li>
                    <li>Solo 3 espacios principales</li>
                  </ul>
                  <p className="mt-3 font-semibold">Recomendado para:</p>
                  <p>Dueños de negocio, gerentes sin formación contable, gestión diaria</p>
                  <p className="mt-2 text-amber-600">⚠️ Algunas acciones avanzadas estarán ocultas</p>
                </>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                💡 TIP: Todos los datos son los mismos, solo cambia cómo se presentan
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmModeChange}>
              Cambiar modo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Backend: Guardar Preferencia

```typescript
// /backend/src/users/users.service.ts

async updatePreferences(userId: number, preferences: Partial<UserPreferences>) {
  return this.prisma.user.update({
    where: { id: userId },
    data: {
      preferences: {
        ...currentPreferences,
        ...preferences
      }
    }
  })
}

// Schema Prisma (ya existe el campo preferences: Json?)
// Si no existe, agregar:
model User {
  // ...campos existentes
  preferences Json? @default("{\"accountingMode\":\"simple\"}")
}
```

### Routing con Parámetro de Modo

```typescript
// /fronted/src/app/dashboard/accounting/layout.tsx

'use client'

import { useSearchParams } from 'next/navigation'
import { ModeToggle } from './components/ModeToggle'

export default function AccountingLayout({ children }) {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'simple'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contabilidad</h1>
          <p className="text-muted-foreground">
            {mode === 'simple'
              ? 'Gestiona las finanzas de tu negocio'
              : 'Registros contables y auditoría'
            }
          </p>
        </div>
        <ModeToggle />
      </div>

      {children}
    </div>
  )
}
```

---

## Componentes Reutilizables

### 1. EducationalTooltip (Mejorado)

```tsx
// /fronted/src/app/dashboard/accounting/components/EducationalTooltip.tsx

import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface Props {
  term: string
  shortExplanation: string
  detailedExplanation?: React.ReactNode
  examples?: string[]
  mode: 'simple' | 'contador'
}

export function EducationalTooltip({ term, shortExplanation, detailedExplanation, examples, mode }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </DialogTrigger>

            {detailedExplanation && (
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{term}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {detailedExplanation}

                  {examples && examples.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Ejemplos:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {examples.map((example, idx) => (
                          <li key={idx} className="text-sm">{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </DialogContent>
            )}
          </Dialog>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{shortExplanation}</p>
          {detailedExplanation && (
            <p className="text-xs text-muted-foreground mt-1">
              Haz clic para ver más detalles
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Ejemplo de uso:
<EducationalTooltip
  term="Debe"
  mode="contador"
  shortExplanation="Dinero que ENTRA o activos que AUMENTAN"
  detailedExplanation={
    <>
      <p>En contabilidad, <strong>DEBE</strong> significa:</p>
      <ul className="list-disc list-inside mt-2">
        <li>💰 Dinero que entra (en cuentas de efectivo)</li>
        <li>📈 Activos que aumentan (inventario sube)</li>
        <li>📉 Pasivos que disminuyen (pagaste una deuda)</li>
      </ul>
    </>
  }
  examples={[
    "Venta: Caja aumenta (Debe)",
    "Compra inventario: Mercaderías aumentan (Debe)"
  ]}
/>
```

### 2. ActionableInsightCard

```tsx
// /fronted/src/app/dashboard/accounting/components/ActionableInsightCard.tsx

import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type InsightType = 'success' | 'warning' | 'danger' | 'info'

interface Action {
  label: string
  onClick: () => void
  primary?: boolean
}

interface Props {
  type: InsightType
  icon?: React.ReactNode
  title: string
  description: string
  impact?: string
  actions: Action[]
}

const typeConfig: Record<InsightType, { Icon: any, className: string }> = {
  success: { Icon: CheckCircle, className: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950' },
  warning: { Icon: AlertTriangle, className: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' },
  danger: { Icon: AlertCircle, className: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' },
  info: { Icon: Info, className: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950' }
}

export function ActionableInsightCard({ type, icon, title, description, impact, actions }: Props) {
  const { Icon: DefaultIcon, className } = typeConfig[type]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {icon || <DefaultIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            {impact && (
              <p className="text-sm font-medium mt-2 text-amber-700 dark:text-amber-400">
                ⚠️ {impact}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardFooter className="flex flex-wrap gap-2 pt-0">
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant={action.primary ? 'default' : 'outline'}
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </CardFooter>
    </Card>
  )
}
```

### 3. ComparisonChart

```tsx
// /fronted/src/app/dashboard/accounting/components/ComparisonChart.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  title: string
  current: { value: number, label: string }
  previous: { value: number, label: string }
  metric: string
  insight?: string
  onDrillDown?: () => void
}

export function ComparisonChart({ title, current, previous, metric, insight, onDrillDown }: Props) {
  const change = current.value - previous.value
  const percentChange = previous.value > 0 ? ((change / previous.value) * 100) : 0
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Barras comparativas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{current.label}</span>
              <span className="font-semibold">{current.value.toLocaleString('es-PE')} {metric}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min((current.value / Math.max(current.value, previous.value)) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{previous.label}</span>
              <span>{previous.value.toLocaleString('es-PE')} {metric}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-muted-foreground/50 transition-all"
                style={{ width: `${Math.min((previous.value / Math.max(current.value, previous.value)) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Indicador de cambio */}
          <div className={`flex items-center gap-2 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground">
              ({change > 0 ? '+' : ''}{change.toLocaleString('es-PE')} {metric})
            </span>
          </div>

          {insight && (
            <p className="text-sm text-muted-foreground">{insight}</p>
          )}

          {onDrillDown && (
            <button
              onClick={onDrillDown}
              className="text-sm text-primary hover:underline"
            >
              Ver detalle →
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Flujos de Datos

### Flujo 1: Carga de Modo Simple - "Mi Dinero"

```
Usuario → /dashboard/accounting/dinero?mode=simple
  │
  ├─> Layout verifica modo (URL param o localStorage)
  │
  ├─> Componente MiDinero se monta
  │
  ├─> useEffect() llama a fetchLiquidezData()
  │     │
  │     └─> GET /api/accounting/liquidity
  │           │
  │           └─> Backend:
  │               1. Obtiene tenant context
  │               2. Query agregadas:
  │                  - SUM(AccEntryLine) WHERE account IN ('1011','1041')
  │                  - SUM(AccEntryLine) WHERE account = '4011'
  │               3. Calcula liquidez disponible
  │               4. Genera insights (compara con mes anterior)
  │               5. Retorna JSON
  │
  ├─> Estado actualizado → Componente re-renderiza
  │
  └─> Decision Layer: Muestra S/ disponible
      Visualization Layer: Gráfico de 30 días
      Detail Layer: Lista de movimientos
```

**Endpoint Nuevo:**
```typescript
// GET /api/accounting/liquidity
{
  totalDisponible: 12300,
  efectivo: 4200,
  banco: 8100,
  igvReservado: 1800,
  puedesGastar: 7500,
  insights: [
    { type: 'warning', message: 'Tu efectivo bajó 12% vs mes pasado' }
  ],
  sparkline: [
    { date: '2026-02-01', balance: 11200 },
    // ...30 días
  ]
}
```

### Flujo 2: Exportación SUNAT

```
Usuario → Click "Exportar PLE 6.1"
  │
  ├─> Modal Wizard abre (Paso 1: Período)
  │
  ├─> Usuario selecciona "Febrero 2026"
  │
  ├─> Paso 2: Confirma formato PLE 6.1
  │
  ├─> Paso 3: Click "Descargar"
  │     │
  │     └─> GET /api/accounting/export/ple?period=2026-02&format=6.1
  │           │
  │           └─> Backend (YA EXISTE):
  │               1. PleExportService.exportLibroMayor()
  │               2. Genera archivo TXT
  │               3. Response con Content-Disposition: attachment
  │
  └─> Navegador descarga archivo
      "LE20519857538202602280601001.txt"
```

### Flujo 3: Toggle de Modo

```
Usuario → Click en "Modo Contador"
  │
  ├─> ModeToggle muestra Dialog de confirmación
  │
  ├─> Usuario confirma
  │     │
  │     ├─> localStorage.setItem('accounting-mode', 'contador')
  │     │
  │     ├─> PATCH /api/users/preferences
  │     │     body: { accountingMode: 'contador' }
  │     │
  │     └─> router.push('/dashboard/accounting/chart?mode=contador')
  │
  └─> Página recarga con Modo Contador activado
      - Muestra 5 módulos en navbar
      - Tablas con códigos de cuenta visibles
      - Terminología técnica
```

---

## Plan de Implementación

### Fase 1: Infraestructura Híbrida (Semana 1-2)

**Objetivo:** Sistema de toggle funcionando con persistencia

**Tareas:**
1. ✅ Crear componente `ModeToggle`
   - Toggle visual (Simple ↔ Contador)
   - Modal de confirmación con explicaciones
   - Persistencia en localStorage

2. ✅ Backend: Guardar preferencia de modo
   - Endpoint `PATCH /api/users/preferences`
   - Agregar campo `preferences.accountingMode` a User model
   - Migration de Prisma

3. ✅ Routing condicional
   - Actualizar `/dashboard/accounting/layout.tsx`
   - Renderizar navegación según modo
   - Redirecciones automáticas

**Validación:**
- [ ] Usuario puede cambiar de modo
- [ ] Preferencia se guarda y persiste al recargar
- [ ] Navegación cambia según modo

---

### Fase 2: Modo Simple - Espacios Modernos (Semana 3-5)

**Objetivo:** 3 espacios del Modo Simple funcionando

#### Semana 3: Espacio "Mi Dinero"

**Tareas:**
1. ✅ Crear `/dashboard/accounting/dinero/page.tsx`
2. ✅ Backend: Endpoint `GET /api/accounting/liquidity`
   ```typescript
   // Retorna:
   // - Balance de efectivo y banco
   // - IGV reservado
   // - Liquidez disponible
   // - Sparkline de 30 días
   // - Insights automáticos
   ```
3. ✅ Componentes:
   - `LiquidityCard` (Decision Layer)
   - `CashFlowChart` (Visualization)
   - `MovementsList` (Detail Layer)

**Validación:**
- [ ] Muestra balance correcto
- [ ] Cálculo de "puedes gastar" es preciso
- [ ] Gráfico de 30 días funciona
- [ ] Insights se generan automáticamente

#### Semana 4: Espacio "Salud del Negocio"

**Tareas:**
1. ✅ Crear `/dashboard/accounting/salud/page.tsx`
2. ✅ Backend: Endpoint `GET /api/accounting/health`
   ```typescript
   // Retorna:
   // - Activos totales
   // - Pasivos totales
   // - Patrimonio neto
   // - Ratios financieros
   // - Tendencias de 6 meses
   ```
3. ✅ Componentes:
   - `HealthIndicator` (Estado general)
   - `AssetsCompositionChart` (Dona de activos)
   - `ProfitabilityCard` (Rentabilidad)
   - `PatrimonyEvolution` (Gráfico 6 meses)

**Validación:**
- [ ] Estado general se evalúa correctamente
- [ ] Gráficos muestran datos reales
- [ ] Ratios calculados correctamente
- [ ] Comparativas de períodos funcionan

#### Semana 5: Espacio "SUNAT"

**Tareas:**
1. ✅ Crear `/dashboard/accounting/sunat/page.tsx`
2. ✅ Backend: Endpoint `GET /api/accounting/compliance`
   ```typescript
   // Retorna:
   // - Próximos vencimientos de impuestos
   // - Estado de libros electrónicos
   // - Log de automatización
   ```
3. ✅ Componentes:
   - `UpcomingDeadlinesCard` (Vencimientos)
   - `ElectronicBooksStatus` (Estado de libros)
   - `ExportWizard` (YA EXISTE - reutilizar)
   - `AutomationLog` (Transparencia)

**Validación:**
- [ ] Alertas de vencimiento funcionan
- [ ] Estado de libros es preciso
- [ ] Exportaciones PLE siguen funcionando
- [ ] Log de automatización muestra eventos

---

### Fase 3: Modo Contador - Mejoras a Módulos Existentes (Semana 6-8)

**Objetivo:** Mejorar los 5 módulos tradicionales con el diseño de 3 capas

**Nota:** Los módulos YA EXISTEN, solo se mejoran con:
- Decision Layer (insights arriba)
- Visualization Layer (gráficos)
- Tooltips educativos
- Mantener funcionalidad actual

#### Semana 6: Plan de Cuentas + Diarios

**Plan de Cuentas:**
- ✅ Agregar Decision Layer: Card de "Cuentas más importantes"
- ✅ Agregar Visualization Layer: Árbol interactivo con colores
- ✅ Tooltips en cada código de cuenta
- ✅ Indicadores de uso (activa/inactiva)

**Diarios:**
- ✅ Agregar Decision Layer: Resumen del día
- ✅ Mejorar tabla: Agrupación visual por asiento
- ✅ Código de colores (entradas/salidas)
- ✅ Mini-contexto en cada fila

#### Semana 7: Asientos + Libro Mayor

**Asientos:**
- ✅ Agregar Decision Layer: "Asientos que requieren atención"
- ✅ Timeline de asientos del día
- ✅ Modal de asiento mejorado (con impacto en negocio)
- ✅ Wizard simplificado para creación manual

**Libro Mayor:**
- ✅ Agregar Decision Layer: "Cuentas que necesitan atención"
- ✅ Gráfico de evolución de balance
- ✅ Top 5 movimientos del período
- ✅ Filtros avanzados

#### Semana 8: Balance de Comprobación

- ✅ Agregar Decision Layer: Estado del balance + salud financiera
- ✅ Ecuación contable visual
- ✅ Gráfico de distribución de activos
- ✅ Panel de verificaciones automáticas

---

### Fase 4: Refinamiento y Testing (Semana 9-10)

**Objetivo:** Pulir UX y validar con usuarios reales

**Tareas:**

1. **Testing de Usabilidad (Semana 9)**
   - [ ] 5 usuarios en Modo Simple (dueños PYME)
   - [ ] 3 usuarios en Modo Contador (contadores)
   - [ ] Recoger feedback sobre:
     - Claridad de lenguaje
     - Utilidad de insights
     - Facilidad de navegación
     - Bugs encontrados

2. **Ajustes de UX (Semana 9)**
   - [ ] Mejorar tooltips según feedback
   - [ ] Ajustar umbrales de insights
   - [ ] Optimizar performance de gráficos
   - [ ] Mobile responsiveness

3. **Optimización de Performance (Semana 10)**
   - [ ] Caché de queries pesadas
   - [ ] Lazy loading de gráficos
   - [ ] Reducir bundle size
   - [ ] Server-side rendering donde aplique

4. **Documentación (Semana 10)**
   - [ ] Guía de usuario para Modo Simple
   - [ ] Guía técnica para Modo Contador
   - [ ] Video tutorial de 5 min
   - [ ] FAQ en sistema de ayuda

---

## Consideraciones Técnicas

### Performance

**Queries Pesadas:**
```typescript
// Problema: Calcular sparkline de 30 días puede ser lento
// Solución: Caché de 1 hora + queries optimizadas

// Backend:
const getCashFlowSparkline = async (orgId: number) => {
  const cached = await redis.get(`sparkline:${orgId}:cash`)
  if (cached) return JSON.parse(cached)

  const data = await prisma.$queryRaw`
    SELECT
      DATE(date) as day,
      SUM(CASE WHEN account IN ('1011','1041') THEN debit - credit ELSE 0 END) as balance
    FROM AccEntryLine
    WHERE organizationId = ${orgId}
      AND date >= NOW() - INTERVAL 30 DAY
    GROUP BY DATE(date)
    ORDER BY day
  `

  await redis.setex(`sparkline:${orgId}:cash`, 3600, JSON.stringify(data))
  return data
}
```

**Bundle Size:**
```bash
# Lazy load gráficos pesados (Recharts)
const CashFlowChart = dynamic(() => import('./CashFlowChart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false
})
```

### Seguridad

**Validación de Modo:**
```typescript
// No confiar solo en URL param o localStorage
// Validar en cada request que el usuario tiene permiso

// Backend middleware:
const validateAccountingMode = (req: Request, mode: 'simple' | 'contador') => {
  const user = req.user

  // Modo Contador requiere rol específico
  if (mode === 'contador') {
    const allowedRoles = ['SUPER_ADMIN', 'CONTADOR', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Modo Contador no disponible para tu rol')
    }
  }

  return true
}
```

**Acciones Restringidas:**
```typescript
// En Modo Simple, NO permitir:
// - Crear asientos manuales
// - Editar asientos
// - Modificar plan de cuentas
// - Anular asientos

// Validar en backend:
if (mode === 'simple' && action === 'CREATE_MANUAL_ENTRY') {
  throw new ForbiddenException('Acción solo disponible en Modo Contador')
}
```

### Escalabilidad

**Multi-tenancy:**
```typescript
// TODOS los endpoints deben filtrar por tenant
// Ya existe TenantContextGuard, asegurar que se use

@Get('/liquidity')
@UseGuards(TenantContextGuard)
async getLiquidity(@TenantContext() ctx: TenantContextDto) {
  // ctx.organizationId está garantizado
  return this.accountingService.calculateLiquidity(ctx.organizationId, ctx.companyId)
}
```

**Paginación:**
```typescript
// Listas largas deben paginar
// Ejemplo: Movimientos del mes en "Mi Dinero"

interface PaginatedMovements {
  data: Movement[]
  total: number
  page: number
  pageSize: number
}

// Request:
GET /api/accounting/movements?date=2026-02&page=1&size=50
```

### Accesibilidad

**ARIA Labels:**
```tsx
// Todos los gráficos necesitan descripción
<div role="img" aria-label="Gráfico de flujo de caja mostrando tendencia creciente de 8% en los últimos 30 días">
  <CashFlowChart />
</div>

// Tooltips accesibles por teclado
<button aria-describedby="tooltip-debe">
  Debe <HelpCircle />
</button>
```

**Keyboard Navigation:**
```tsx
// Toggle de modo accesible por teclado
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleModeChange('contador')
    }
  }}
>
  Modo Contador
</button>
```

### Internacionalización (Futuro)

**Preparar para i18n:**
```typescript
// Aunque ahora es solo español, estructurar para futuro

// En vez de:
const message = "Tu efectivo bajó 12%"

// Usar:
const message = t('accounting.insights.cash_decreased', { percent: 12 })

// Archivo es-PE.json:
{
  "accounting": {
    "insights": {
      "cash_decreased": "Tu efectivo bajó {percent}%"
    }
  }
}
```

---

## Métricas de Éxito

### KPIs Cuantitativos

**Adopción de Modo:**
```typescript
// Trackear en analytics
{
  event: 'accounting_mode_changed',
  properties: {
    from: 'simple',
    to: 'contador',
    userId: 123,
    role: 'ADMIN'
  }
}

// Objetivos:
// - 80% de usuarios permanecen en Modo Simple
// - 100% de contadores usan Modo Contador
// - <5% cambian de modo frecuentemente (indica confusión)
```

**Engagement:**
```typescript
// Métricas por modo:
- Tiempo promedio en página
- Clicks en insights
- Exportaciones SUNAT realizadas
- Drill-downs en gráficos

// Objetivos Modo Simple:
// - Tiempo en página: 2-5 min (suficiente para decisión)
// - 60% hacen click en al menos 1 insight
// - 80% exportan PLE cuando se acerca vencimiento

// Objetivos Modo Contador:
// - Tiempo en página: 10-30 min (trabajo detallado)
// - 90% usan filtros avanzados
// - 70% crean asientos manuales
```

### KPIs Cualitativos

**Satisfacción de Usuario:**
```
Encuesta NPS después de 2 semanas de uso:

Modo Simple:
"¿Qué tan probable es que recomiendes esta contabilidad a otro dueño de negocio?"
Objetivo: NPS > 50

Modo Contador:
"¿Esta herramienta te permite hacer tu trabajo contable eficientemente?"
Objetivo: 80% responde "Sí"
```

**Reducción de Soporte:**
```
Comparar tickets de soporte antes/después:

Antes (módulos tradicionales):
- "No entiendo qué es Debe/Haber" → 15 tickets/mes
- "¿Cómo sé cuánto puedo gastar?" → 20 tickets/mes
- "¿Cómo exporto para SUNAT?" → 25 tickets/mes

Después (modo híbrido):
Objetivo: Reducir 70% de estos tickets
```

### Errores y Validación

**Correctitud Contable:**
```typescript
// Test automático diario:
// Verificar que Modo Simple y Modo Contador muestran mismos números

const dailyValidation = async () => {
  const simpleData = await fetchLiquidityData('simple')
  const contadorData = await fetchAccountBalance(['1011', '1041'], 'contador')

  if (simpleData.totalDisponible !== contadorData.total) {
    alertDevelopers('DISCREPANCY: Simple vs Contador data mismatch')
  }
}

// Objetivo: 0 discrepancias
```

**Validación de Exportaciones:**
```typescript
// Cada PLE exportado debe:
// - Pasar validador oficial de SUNAT
// - Tener Debe = Haber
// - No tener fechas inválidas

// Objetivo: 100% de exportaciones válidas
```

---

## Apéndices

### A. Glosario de Términos

**Para Modo Simple:**
- "Lo que tienes" = Activos
- "Lo que debes" = Pasivos
- "Tu patrimonio" = Capital + Resultados acumulados
- "Dinero que entra" = Débito en cuentas de efectivo
- "Dinero que sale" = Crédito en cuentas de efectivo

**Para Modo Contador:**
- PCGE = Plan Contable General Empresarial (Perú)
- PLE = Programa de Libros Electrónicos (SUNAT)
- Debe/Haber = Sistema de partida doble
- Asiento = Entry (AccEntry)
- Diario = Journal
- Mayor = Ledger

### B. Códigos de Cuenta Relevantes

```
1011 - Caja
1041 - Bancos (Ctas corrientes)
1212 - Clientes (Cuentas por cobrar)
2011 - Mercaderías (Inventario)
4011 - IGV por pagar
6911 - Costo de ventas
7011 - Ventas
```

### C. Referencias Normativas

- Resolución de Superintendencia N° 361-2015/SUNAT (PLE)
- Plan Contable General Empresarial (PCGE) - Resolución CNC N° 043-2010-EF/94
- NIC 1: Presentación de Estados Financieros
- NIIF para PYMES (aplicable a target de usuarios)

---

## Conclusión

Este diseño híbrido reconcilia las necesidades contradictorias de:
1. **Dueños de PYME** que necesitan tomar decisiones sin entender contabilidad
2. **Contadores** que necesitan acceso técnico completo con terminología estándar

**Clave del éxito:**
- Mismo backend (Single Source of Truth)
- Dos interfaces adaptadas a cada perfil
- Transición suave entre modos
- Educación integrada en ambos modos
- Automatización transparente

**Próximo Paso:** Implementación en 4 fases (10 semanas)

---

**Aprobado para Implementación:** 13 de Febrero, 2026

**Contacto para Preguntas:**
- Diseño: Claude Sonnet 4.5
- Implementación: Equipo de Desarrollo

---

**Co-Authored-By:** Claude Sonnet 4.5 <noreply@anthropic.com>
