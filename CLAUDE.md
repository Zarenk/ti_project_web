# CLAUDE.md - TI Projecto Web

## Descripción del Proyecto
Sistema integral de gestión empresarial multi-tenant con contabilidad integrada, diseñado para el mercado peruano. Incluye módulos de inventario, ventas, compras, cotizaciones, contabilidad y más.

## Stack Tecnológico

### Backend
- **Framework:** NestJS (Node.js)
- **ORM:** Prisma 7
- **Base de datos:** PostgreSQL
- **WebSockets:** Socket.IO (barcode gateway, chat)
- **Validaciones:** Class-validator, DTOs

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript (strict mode)
- **Estilos:** Tailwind CSS
- **Componentes UI:** shadcn/ui
- **Validaciones:** Zod
- **Forms:** react-hook-form
- **PDFs:** react-pdf, @react-pdf/renderer
- **Estado:** React Context API
- **HTTP:** fetch nativo

## Arquitectura del Proyecto

### Estructura de Directorios
```
/backend          # API NestJS
  /src
    /[module]     # Módulos por dominio
    /prisma       # Schema y migraciones
/fronted          # Cliente Next.js (SÍ, con 'd')
  /src
    /app          # App Router de Next.js
      /api        # API Routes (proxy al backend)
      /dashboard  # Área administrativa
    /components   # Componentes reutilizables
    /context      # Contexts de React
    /hooks        # Custom hooks
    /lib          # Utilidades
/docs             # Documentación del proyecto
```

### Multi-tenancy
- Sistema multi-tenant con `tenantId` en todas las entradas
- Schema enforcement configurable por organización
- Middleware de tenant en backend
- Context de tenant selection en frontend

## Convenciones de Código

### Reglas Generales
1. **TypeScript estricto:** Siempre tipar correctamente, evitar `any`
2. **Nombrado consistente:**
   - Componentes: PascalCase (`ProductForm.tsx`)
   - Archivos API: kebab-case (`product-details.api.tsx`)
   - Hooks: camelCase con prefijo `use` (`useAuth.ts`)
   - Contexts: PascalCase con sufijo Context (`AuthContext`)

3. **Imports organizados:**
   - React primero
   - Librerías externas
   - Imports relativos
   - Tipos al final

### Frontend (Next.js)

#### Componentes
- **Server Components por defecto** (Next.js 14)
- **Client Components** solo cuando sea necesario:
  - Hooks de React (useState, useEffect, etc.)
  - Event handlers
  - Context consumers
  - Browser APIs
- Marcar explícitamente con `'use client'` al inicio del archivo

#### API Routes
- Usar API routes en `/app/api/*` como proxy al backend
- Incluir manejo de errores consistente
- Validar datos con Zod antes de enviar al backend
- Patrón estándar:
```typescript
export async function GET/POST/PUT/DELETE(request: Request) {
  try {
    const token = cookies().get('authToken')?.value
    const response = await fetch(`${BACKEND_URL}/endpoint`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return Response.json(await response.json())
  } catch (error) {
    return Response.json({ error: 'mensaje' }, { status: 500 })
  }
}
```

#### Archivos API Separados
- Crear archivos `*.api.ts` o `*.api.tsx` para lógica de llamadas al backend
- No incluir lógica de API dentro de componentes
- Ejemplo: `products.api.tsx`, `sales.api.tsx`

#### Validaciones
- Usar Zod para esquemas de validación
- Definir schemas cerca de donde se usan
- Validar en cliente Y servidor

#### Estilos
- Tailwind CSS para todo el styling
- Componentes shadcn/ui para UI consistente
- No usar CSS modules ni styled-components
- Clases utilitarias antes que CSS personalizado

### Backend (NestJS)

#### Módulos
- Un módulo por dominio de negocio
- Estructura: controller, service, entity (Prisma model)
- DTOs con class-validator para validación
- Guards para autenticación y permisos

#### Base de Datos (Prisma)
- Migraciones con nombre descriptivo
- Siempre incluir `tenantId` en modelos multi-tenant
- Índices en campos de búsqueda frecuente
- Soft deletes preferidos sobre hard deletes

#### Seguridad
- JWT para autenticación
- Cookies httpOnly para tokens
- CORS configurado correctamente
- Rate limiting en endpoints sensibles
- Validación de permisos por módulo

## Reglas de Negocio Específicas

### Contexto Peruano
- **Monedas:** PEN (Soles) y USD (Dólares)
- **Tipo de cambio:** Actualizable por usuario
- **Impuestos:** IGV 18% (configurable)
- **Documentos:** Facturas, Boletas (según SUNAT)

### Módulos Principales

#### Inventario
- Control de stock por tienda
- Alertas de stock mínimo
- Múltiples unidades de medida
- Trazabilidad de movimientos

#### Ventas
- Cotizaciones → Órdenes → Ventas completadas
- Generación de PDFs (facturas, boletas)
- Múltiples métodos de pago
- Integración con caja registradora

#### Entradas/Compras
- Registro de compras a proveedores
- Extracción de datos desde PDF de factura
- Actualización automática de inventario
- Generación de guías de remisión

#### Contabilidad
- Sistema híbrido simplificado/completo
- Registro de compras y ventas
- Conciliación bancaria
- Reportes SUNAT

### Permisos y Roles
- Sistema basado en módulos
- Guard `ModulePermissionGuard` en frontend
- Guard `DeleteActionsGuard` para operaciones destructivas
- Verificar permisos en backend siempre

## Patrones y Mejores Prácticas

### Performance
- Lazy loading de componentes pesados
- Debouncing en búsquedas
- Paginación en listados grandes
- Optimistic updates donde sea apropiado
- React.memo para componentes costosos

### Multi-Agent Orchestration

**Cuándo Usar Agentes Especializados:**

Usar el sistema de agentes (Task tool) para maximizar eficiencia y paralelismo en tareas complejas:

#### Tipos de Agentes Disponibles

1. **Explore Agent** - Exploración rápida de codebase
   - Búsquedas de código por patrones
   - Encontrar archivos específicos
   - Responder preguntas sobre arquitectura
   - Thoroughness: "quick", "medium", "very thorough"

2. **Plan Agent** - Diseño de implementación
   - Planificar estrategias de implementación
   - Identificar archivos críticos
   - Analizar trade-offs arquitectónicos
   - Usar ANTES de escribir código complejo

3. **Bash Agent** - Operaciones de terminal
   - Git operations
   - Ejecución de comandos
   - Scripts de automatización

4. **General-Purpose Agent** - Tareas multi-paso complejas
   - Búsquedas que requieren múltiples intentos
   - Investigación profunda
   - Tareas que combinan múltiples herramientas

#### Cuándo Paralelizar vs. Secuencial

**USAR PARALELIZACIÓN (múltiples agentes en paralelo):**
```typescript
// ✅ Múltiples búsquedas independientes
Task("buscar componentes auth", "Explore")
Task("buscar configuración CORS", "Explore")
Task("buscar validators JWT", "Explore")

// ✅ Investigación de múltiples archivos
Task("analizar products.service.ts", "Explore")
Task("analizar inventory.service.ts", "Explore")

// ✅ Operaciones Git independientes
Task("git status", "Bash")
Task("git diff", "Bash")
Task("git log", "Bash")
```

**EJECUTAR SECUENCIALMENTE:**
```typescript
// ❌ NO paralelizar - operaciones dependientes
await Task("git add .", "Bash")
await Task("git commit", "Bash")  // Depende del add
await Task("git push", "Bash")    // Depende del commit

// ❌ NO paralelizar - lectura antes de edición
await Task("leer archivo config", "Explore")
// Luego usar Edit tool con información obtenida
```

#### Mejores Prácticas

1. **Siempre paralelizar búsquedas independientes**
   - Si buscas 3 archivos diferentes, usa 3 agentes en paralelo
   - Si investigas múltiples módulos, paraleliza

2. **Usar Explore Agent para búsquedas amplias**
   - Si no sabes exactamente dónde buscar
   - Si necesitas buscar en múltiples ubicaciones
   - Si la búsqueda puede requerir varios intentos

3. **Usar Plan Agent ANTES de implementaciones complejas**
   - Features nuevas con múltiples archivos
   - Refactors arquitectónicos
   - Cambios que afectan múltiples módulos

4. **Delegar, no duplicar**
   - Si delegas una búsqueda a un agente, NO la hagas tú también
   - Espera el resultado del agente y úsalo

5. **Descripción clara del task**
   - 3-5 palabras descriptivas
   - Específico sobre qué debe hacer
   - Incluir contexto necesario en el prompt

#### Ejemplos de Uso Efectivo

**Ejemplo 1: Investigación de Bug**
```typescript
// ✅ CORRECTO - Paralelo
Task("buscar todos los usos de ProductsService", "Explore", "medium")
Task("buscar implementaciones de barcode gateway", "Explore", "quick")
Task("buscar configuraciones de WebSocket", "Explore", "quick")
```

**Ejemplo 2: Implementación de Feature**
```typescript
// Paso 1: Planear
Task("diseñar sistema de notificaciones", "Plan")

// Paso 2: Después del plan, investigar en paralelo
Task("buscar patrones de notificación existentes", "Explore")
Task("buscar configuración de email", "Explore")

// Paso 3: Implementar basado en plan e investigación
```

**Ejemplo 3: Debugging Multi-Módulo**
```typescript
// ✅ Investigar todos los módulos relacionados en paralelo
Task("analizar flujo en auth.service.ts", "Explore", "medium")
Task("analizar flujo en users.service.ts", "Explore", "medium")
Task("analizar middleware de tenant", "Explore", "medium")
```

#### Indicadores de Cuándo Usar Agentes

**Usar Explore Agent si:**
- Necesitas buscar más de 2 archivos/patrones
- No sabes exactamente dónde está el código
- La búsqueda puede requerir múltiples intentos
- Necesitas entender arquitectura/flujo

**Usar Plan Agent si:**
- El cambio afecta 3+ archivos
- Hay múltiples enfoques posibles
- Requiere decisiones arquitectónicas
- Es una feature nueva o refactor grande

**NO usar agentes si:**
- Sabes el archivo exacto (usa Read directamente)
- Es una búsqueda simple (usa Grep/Glob directamente)
- Es un cambio trivial (edita directamente)

### Manejo de Errores
- Try-catch en todas las llamadas API
- Mensajes de error amigables al usuario
- Toast/notifications para feedback
- Logging de errores en backend

### Datos Sensibles
- **NUNCA** commitear:
  - `.env` files
  - Credenciales
  - Tokens
  - Archivos de backup de BD
- Usar variables de entorno para configuración
- `.gitignore` actualizado

### Testing
- Cypress para E2E (configurado en `/fronted`)
- Tests unitarios para lógica crítica
- Validar flujos completos de negocio

## Sistema de Ayuda Contextual

El proyecto incluye un sistema de ayuda contextual inteligente:
- Ubicado en `/fronted/src/data/help/`
- Búsqueda fuzzy y por intención
- Screenshots en `/fronted/public/help/`
- Componente `HelpAssistant` para asistencia en tiempo real

## Comandos Útiles

```bash
# Backend
cd backend
npm run start:dev        # Desarrollo
npm run migration:dev    # Crear migración
npm run migration:run    # Aplicar migraciones

# Frontend
cd fronted
npm run dev             # Desarrollo
npm run build           # Build producción
npm run lint            # Linting
npx cypress open        # Tests E2E
```

## Notas Importantes

1. **Nombre del directorio:** Es `fronted` (con 'd'), NO `frontend`
2. **Prisma:** Versión 7 con nuevas características
3. **Autenticación:** Tokens en cookies httpOnly, no localStorage
4. **WebSockets:** Gateway de barcode en puerto específico
5. **PDFs:** Generación server-side con @react-pdf/renderer
6. **Imágenes:** Upload a `/storage` con validación de tamaño

## Cuando Hagas Cambios

### Antes de Implementar
- Leer archivos relacionados antes de modificar
- Entender el contexto del módulo
- Verificar dependencias entre módulos
- Revisar si existe patrón similar en otro módulo

### Al Crear Código
- Seguir patrones existentes en el proyecto
- Mantener consistencia con código similar
- No sobre-ingenierizar soluciones simples
- Comentar solo lógica compleja, no código obvio
- Evitar duplicación de código

### Después de Implementar
- Verificar que no rompiste funcionalidad existente
- Revisar imports no usados
- Confirmar que tipos TypeScript son correctos
- Probar en desarrollo antes de confirmar

## Reglas Críticas - NO VIOLAR

### Queries de Productos
1. **NUNCA agregar `take: 500` ni límites hardcoded** en `products.service.ts findAll()`. Las organizaciones pueden tener 500+ productos y un límite silenciosamente oculta productos antiguos de todas las búsquedas (entries, sales, products page). Bug descubierto 2026-02-17.
2. **Siempre verificar `organizationId !== null`** antes de queries. `WHERE organizationId = NULL` devuelve 0 resultados.
3. **useEffect que carga productos** en el frontend DEBE depender del `selection` (contexto de tenant), no solo de filtros locales.

### Sistema Contable
4. **AccountingSummaryService usa `journalLine`** (NO `accEntryLine`). Migrado 2026-02-17.
5. **Nunca cambiar** el servicio de summary para usar `accEntryLine` - ese es el sistema antiguo vacío.

## Flujo Crítico: Entradas y Salidas de Inventario

> **PRECAUCIÓN MÁXIMA**: Los módulos de Entradas (compras) y Ventas (salidas) son el corazón transaccional del sistema. Un error aquí corrompe inventario, contabilidad y datos SUNAT simultáneamente. **SIEMPRE leer los archivos involucrados antes de tocar cualquier cosa.**

### Arquitectura del Flujo

```
ENTRADAS (Compras)                          SALIDAS (Ventas)
─────────────────                          ────────────────
Entry                                      Sales
 ├─ EntryDetail (líneas)                    ├─ SalesDetail (líneas)
 │   ├─ EntryDetailSeries (series S/N)     │   ├─ entryDetailId → EntryDetail
 │   └─ inventoryId → Inventory            │   ├─ storeOnInventoryId → StoreOnInventory
 ├─ Invoice (factura proveedor)            │   └─ series: String[] (series vendidas)
 └─ Journal (asiento contable)             ├─ SalePayment → CashTransaction → CashRegister
                                           ├─ InvoiceSales (comprobante SUNAT)
    Inventory                              └─ SunatTransmission
     └─ StoreOnInventory
         ├─ stock: Int (STOCK REAL)        JournalEntry (contabilidad)
         └─ InventoryHistory (auditoría)    └─ JournalLine (debe/haber)
```

### Archivos Clave — Leer ANTES de Modificar

| Archivo | Responsabilidad | Riesgo |
|---------|----------------|--------|
| `backend/src/entries/entries.service.ts` | `createEntry()` — transacción principal de compras | CRÍTICO: stock, series, contabilidad |
| `backend/src/sales/sales.service.ts` | `createSale()`, `deleteSale()` — ventas completas | CRÍTICO: stock, pagos, SUNAT |
| `backend/src/utils/sales-helper.ts` | `executeSale()` — transacción atómica de venta | CRÍTICO: reduce stock, registra pagos |
| `backend/src/products/products.service.ts` | `createWithInitialStock()` — producto + entrada | ALTO: llama a `createEntry()` |
| `backend/src/inventory/inventory.service.ts` | Excel import, consultas de stock, transferencias | ALTO: crea entries en bulk |
| `backend/src/accounting/hooks/sale-posted.controller.ts` | Hook async: genera asiento contable de venta | MEDIO: contabilidad post-venta |
| `backend/src/accounting/hooks/purchase-posted.controller.ts` | Hook async: genera asiento contable de compra | MEDIO: contabilidad post-compra |
| `backend/src/accounting/services/journal-entry.service.ts` | `create()` — crea JournalEntry + JournalLines | MEDIO: correlativo, CUO, período |
| `backend/src/accounting/accounting.service.ts` | `createJournalForInventoryEntry()` | MEDIO: asientos de compras |

### Reglas de Seguridad del Flujo

#### 1. NUNCA romper la transacción atómica
- `createEntry()` usa una **transacción Prisma** que crea Entry + Details + Series + actualiza Stock + InventoryHistory **todo junto**
- `executeSale()` usa una **transacción Prisma** que crea Sale + Details + reduce Stock + marca Series + registra Pagos + CashRegister **todo junto**
- **Si agregas un paso nuevo, DEBE estar DENTRO de la transacción existente** (no después)
- Si el paso nuevo puede fallar independientemente (como contabilidad), va FUERA de la transacción como post-operación no-bloqueante

#### 2. Stock: StoreOnInventory es la fuente de verdad
- `StoreOnInventory.stock` es el **único campo** que contiene el stock real
- Entradas: `stock: { increment: quantity }` (atómico)
- Ventas: `stock: storeInventory.stock - detail.quantity` (dentro de transacción)
- **NUNCA** hacer `stock = X` directo — siempre usar increment/decrement o calcular desde el valor leído dentro de la misma transacción
- `@@unique([productId, storeId])` en Inventory — un registro por producto por tienda

#### 3. Series (Números de Serie) son únicos por organización
- Constraint: `@@unique([organizationId, serial])` en `EntryDetailSeries`
- Al crear entrada: status = `"active"`
- Al vender: status = `"inactive"` (y serial va al array `SalesDetail.series`)
- Al eliminar venta: status vuelve a `"active"`
- **NUNCA** eliminar registros de EntryDetailSeries — solo cambiar status
- Endpoint de validación: `POST /api/series/check`

#### 4. Eliminación de ventas requiere reversión completa
- `deleteSale()` revierte TODO: stock, series, pagos, CashRegister, contabilidad
- **Ventas transmitidas a SUNAT NO se pueden eliminar** — requieren nota de crédito
- Verificación: `SunatTransmission` con status `'ACCEPTED'`

#### 5. Contabilidad es post-transaccional y no-bloqueante
- Los hooks de contabilidad (`postSale`, `postPurchase`) se ejecutan DESPUÉS de la transacción principal
- Usan 3 reintentos con backoff exponencial
- **Si fallan, la venta/entrada YA se creó** — la contabilidad se puede regenerar
- Cuentas PCGE usadas:
  - Ventas: 1041/1011 (cobro), 7011 (ingreso), 4011 (IGV), 6911 (costo venta), 2011 (inventario)
  - Compras: 2011 (inventario), 4011 (IGV), 1011/4211 (pago/cuenta por pagar)

#### 6. Validaciones que NO debes eliminar
- Stock suficiente antes de vender (`BadRequestException` si `stock < quantity`)
- Serie no duplicada antes de crear (`checkSeries` endpoint)
- Balance contable cuadrado (`debitTotal === creditTotal`) antes de crear JournalEntry
- `referenceId` único en Entry y Sales (evita duplicados por retry)

### Qué Verificar al Modificar Estos Módulos

**Antes de tocar entradas (`entries.service.ts`):**
- [ ] ¿El cambio está DENTRO o FUERA de la transacción? ¿Dónde debe estar?
- [ ] ¿Afecta la creación de `StoreOnInventory`? Verificar que el increment sea correcto
- [ ] ¿Toca `EntryDetailSeries`? Respetar el constraint unique por organización
- [ ] ¿El `InventoryHistory` refleja el cambio correctamente?
- [ ] ¿La contabilidad post-transacción sigue recibiendo los datos correctos?

**Antes de tocar ventas (`sales.service.ts`, `sales-helper.ts`):**
- [ ] ¿El cambio está DENTRO del `executeSale()` transaction block?
- [ ] ¿Afecta la reducción de stock? Verificar que sea consistente
- [ ] ¿Toca pagos/CashRegister? El balance debe ser correcto
- [ ] ¿`deleteSale()` puede revertir tu cambio correctamente?
- [ ] ¿Afecta InvoiceSales o CompanyDocumentSequence? Los correlativos son irrecuperables

**Antes de tocar contabilidad (`accounting/hooks/`, `journal-entry.service.ts`):**
- [ ] ¿Las cuentas PCGE son correctas para el tipo de operación?
- [ ] ¿El asiento cuadra (debe = haber)?
- [ ] ¿El `correlativo` se genera correctamente por organización y período?
- [ ] ¿Hay duplicados? Verificar detección de entries existentes

### Tablas Afectadas por Operación

| Operación | Tablas modificadas (en orden) |
|-----------|-------------------------------|
| **Crear entrada** | Entry → EntryDetail → EntryDetailSeries → Inventory (upsert) → StoreOnInventory (increment) → InventoryHistory → *AccEntry* → *JournalEntry* |
| **Crear venta** | Sales → SalesDetail → EntryDetailSeries (status→inactive) → StoreOnInventory (decrement) → InventoryHistory → SalePayment → CashTransaction → CashRegister (increment balance) → InvoiceSales → *JournalEntry* |
| **Eliminar venta** | StoreOnInventory (increment) → InventoryHistory → EntryDetailSeries (status→active) → CashRegister (decrement) → CashTransaction (delete) → SalePayment (delete) → SalesDetail (delete) → Sales (delete) → AccEntry (void) |
| **Producto con stock** | Product → (llama createEntry completo) |
| **Import Excel** | Por cada fila: Product (upsert) → Entry → EntryDetail → Inventory → StoreOnInventory → EntryDetailSeries |

*Cursiva = post-transacción, no-bloqueante*

## Recursos del Proyecto

- Documentación en `/docs`
- Guías de ayuda en `/fronted/public/help`
- Schemas de Prisma en `/backend/prisma/schema.prisma`
- Tipos compartidos generados desde Prisma

---

**Última actualización:** 2026-02-18
**Versión:** 1.3

Este archivo debe actualizarse cuando cambien convenciones, patrones o reglas importantes del proyecto.
