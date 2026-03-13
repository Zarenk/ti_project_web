# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TI Projecto Web

Sistema ERP multi-tenant con contabilidad de doble partida, diseñado para el mercado peruano. Soporta 8 verticales de negocio (General, Retail, Restaurantes, Servicios, Manufactura, Computación, Estudio de Abogados, Gimnasio). 65+ módulos NestJS, 90+ modelos Prisma.

## Stack

| Capa | Tecnologías |
|------|------------|
| **Backend** | NestJS, Prisma 7, PostgreSQL, Socket.IO, class-validator |
| **Frontend** | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Zod, react-hook-form, TanStack React Query, @react-pdf/renderer |
| **Auth** | JWT en cookies httpOnly |
| **Deploy** | Railway (backend Docker multi-stage con Python 3 para ML) |

## Estructura de Directorios

```
/backend/src/[module]/     # Módulos NestJS (controller + service + DTOs)
/backend/prisma/           # Schema y migraciones
/fronted/src/              # ⚠️ SÍ con 'd', NO "frontend"
  /app/api/                # API Routes (proxy al backend — NUNCA llamar backend directo)
  /app/dashboard/          # Área administrativa (*.api.tsx co-locados)
  /components/             # Componentes reutilizables (shadcn/ui)
  /context/                # React Contexts
  /hooks/                  # Custom hooks
  /lib/                    # Utilidades (query-client, query-keys, draft-utils, sse-fetch)
```

## Comandos de Desarrollo

```bash
# Backend (cd backend)
npm run start:dev                    # Dev server con watch
npm run build                       # Build producción (prisma generate + nest build)
npm run lint                        # ESLint con auto-fix
npm test                            # Jest unit tests
npm run test:e2e                    # Jest E2E tests
npx prisma migrate dev --name X     # Crear migración
npx prisma migrate deploy           # Aplicar migraciones
npx prisma generate                 # Regenerar cliente Prisma
npm run seed:tenant-ecoterra        # Setup completo tenant ECOTERRA
npm run seed:accounting             # Seed cuentas PCGE

# Frontend (cd fronted)
npm run dev                         # Next.js dev server
npm run build                       # Build producción
npm run lint                        # ESLint
npm test                            # Vitest unit tests
npx cypress open                    # Cypress E2E interactivo
npm run cypress:critical            # Solo tests críticos
```

## Arquitectura Core

### Multi-tenancy (SOURCE OF TRUTH)
- `organizationId` + `companyId` en todas las entidades
- Backend: `TenantHeaderMiddleware` → `@CurrentTenant()` decorador
- Frontend: `TenantSelectionContext` → query keys con tenant scope `["tenant", orgId, companyId, ...]`
- Permisos por módulo: `OrganizationMembership.modulePermissions` (JSON)

### Business Verticals
- Enum: `GENERAL`, `RESTAURANTS`, `RETAIL`, `SERVICES`, `MANUFACTURING`, `COMPUTERS`, `LAW_FIRM`, `GYM`
- Backend: `VerticalConfigService` + `@ModulePermission('legal')` guard
- Frontend: `TenantFeaturesContext` + `use-vertical-config.ts`
- Al cambiar vertical: datos específicos se archivan a `Archived*` (no se eliminan), con snapshot para rollback

### Permisos y Roles
- Roles usuario: ADMIN, EMPLOYEE, CLIENT, GUEST, SUPER_ADMIN_GLOBAL, SUPER_ADMIN_ORG
- Roles membresía: OWNER, ADMIN, MEMBER, VIEWER, SUPER_ADMIN
- Backend: `@Roles(...)` + `@ModulePermission(...)` + `@RequiresActiveSubscription(feature)`
- Frontend: `ModulePermissionGuard`, `DeleteActionsGuard`

### Contexto Peruano (SOURCE OF TRUTH)
- Monedas: PEN (Soles) y USD (Dólares). IGV: 18% (configurable)
- Documentos SUNAT: Facturas, Boletas, Notas de Crédito, Guías de Remisión
- Lookup DNI/RUC: `MiGoService` con cache 12h (`MIGO_TOKEN`)

## Convenciones de Código

### Naming
- Componentes: PascalCase (`ProductForm.tsx`), API files: kebab-case (`product-details.api.tsx`)
- Hooks: `use` prefix (`useAuth.ts`), Contexts: suffix `Context` (`AuthContext`)

### Frontend
- **Server Components por defecto**, `'use client'` solo cuando necesario (hooks, events, browser APIs)
- **API Routes** (`/app/api/*`) como proxy: cookie `authToken` → `Authorization: Bearer` al backend
- **Archivos API co-locados**: `*.api.ts` o `*.api.tsx` por sección (`sales.api.tsx`, `legal-matters.api.tsx`)
- **Zod** para validaciones en cliente Y servidor
- **Paginación**: SIEMPRE `@/components/data-table-pagination` (`DataTablePagination` o `ManualPagination`). NO crear nuevos
- **Errores inline**: mensajes de validación debajo del input (además del toast)
- **`cursor-pointer`**: obligatorio en TODO elemento interactivo

### Responsive Mobile
- Reglas completas y patrones: ver `docs/examples/responsive-mobile-rules.md`
- Principio clave: `w-full min-w-0 overflow-hidden` en contenedores, `break-words` en texto, `flex-shrink-0` en iconos
- Verificar siempre en viewport 375px — NO debe haber scroll horizontal

### Patrones UI (ver templates en `docs/examples/`)
- **Filtros colapsables mobile**: `docs/examples/mobile-collapsible-filters.tsx` — Usar en TODA página de listado con múltiples filtros. Refs: `sales/page.tsx`, `entries/data-table.tsx`
- **Consulta SUNAT (DNI/RUC)**: `docs/examples/sunat-lookup-dialog.tsx` — Botón icono + Dialog junto al selector de cliente. API: `lookupSunatDocument()` en `sales.api.tsx`. Refs: `sales-form.tsx`, `quote-context-bar.tsx`

### Backend (NestJS)
- Un módulo por dominio: controller + service + DTOs con class-validator
- Guards: `JwtAuthGuard`, `RolesGuard`, `TenantRequiredGuard`, `SubscriptionStatusGuard`
- Prisma snake_case models: usar nombre exacto como accessor (`this.prisma.cash_registers`, NO `cashRegister`)
- Soft deletes preferidos. Siempre `tenantId` en modelos multi-tenant

## React Query (SOURCE OF TRUTH)

Config: `fronted/src/lib/query-client.ts` — staleTime 2min, gcTime 5min, retry max 2

**SIEMPRE** usar `queryKeys` factory (`fronted/src/lib/query-keys.ts`), nunca strings hardcodeadas:
```typescript
queryKeys.products.list(orgId, companyId, filters) // lectura
queryKeys.products.root(orgId, companyId)           // invalidación
```

**Invalidación cruzada OBLIGATORIA** después de mutaciones:
- Crear producto → products + inventory
- Crear entrada → entries + inventory + products
- Crear/eliminar venta → sales + inventory + products

Drafts: `fronted/src/lib/draft-utils.ts` — localStorage con TTL 24h, limpiados en logout

## Módulos del Sistema (archivo clave + qué resuelve)

| Módulo | Archivo principal | Propósito |
|--------|------------------|-----------|
| Productos | `products/products.service.ts` | CRUD + `createWithInitialStock()` |
| Ventas | `sales/sales.service.ts` + `utils/sales-helper.ts` | Transacción atómica venta + pagos + stock |
| Entradas | `entries/entries.service.ts` | Transacción atómica compra + stock + series |
| Inventario | `inventory/inventory.service.ts` | Stock por tienda, transferencias, import Excel |
| Contabilidad | `accounting/hooks/accounting-hook.service.ts` | Hooks post-transaccionales, PCGE, doble partida |
| Credit Notes | `credit-notes/credit-notes.service.ts` | Solo ventas ACCEPTED por SUNAT, auto-anulación |
| Guías | `guide/` | Guías de remisión SUNAT (XML GRE 2022) |
| Suscripciones | `subscriptions/subscriptions.service.ts` | Planes, dunning, trial, webhook MercadoPago |
| Legal | `legal-matters/`, `legal-documents/`, `legal-events/` | Expedientes, documentos SHA-256, eventos |
| Restaurante | `restaurant-orders/`, `kitchen-stations/` | Pedidos, mesas, cocina WebSocket |
| Gimnasio | `gym/` | Membresías (state machine), check-ins, clases, datos encriptados AES-256-GCM |
| WhatsApp | `whatsapp/` | Baileys, rate limiting anti-ban, templates, automaciones |
| E-commerce | `websales/`, `catalog/` | Catálogo público, Culqi payments (server-side price verification) |
| ML | `ml/` | Bridge NestJS→Python: demand forecasting, basket analysis |
| Chatbot | `fronted/src/data/help/intents/` + `tools/` | 9 intents operacionales, threshold 0.85, tool execution |
| Ayuda | `help/` + `fronted/src/components/help/` | Embeddings vectoriales, AI multi-proveedor con circuit breaker |

## Patrones Backend Reutilizables (archivo → problema que resuelve)

- `common/state-machine/` → Transiciones tipadas (usado en gym memberships)
- `common/locking/` → `SELECT FOR UPDATE` pessimistic locking en transacciones Prisma
- `common/dto/` → `AutoManagedMultiTenant` para Omit de campos auto-gestionados
- `sunat/sunat-retry.cron.ts` → Reintento transmisiones SUNAT cada 30min (max 3, últimas 48h)
- `common/guards/subscription-status.guard.ts` → `@RequiresActiveSubscription(feature)` — protege SUNAT, guías, WhatsApp, credit notes
- Frontend: `isSubscriptionBlockedError()` en `subscription-error.ts` + `SubscriptionBlockedDialog`

## Filosofía KISS

- Componentes < 500 líneas de lógica. Max ~15 useState → agrupar en custom hooks
- Funciones < 50 líneas. No duplicar: si se repite 2+ veces → extraer utilidad
- Pure utilities → `*-utils.ts`. Hooks → `use-*.ts` en mismo directorio
- No sobre-ingenierizar: un `if` > patrón Strategy cuando solo hay 2 casos
- No mezclar refactor con cambios funcionales en el mismo commit
- No abstracciones prematuras para código usado una sola vez

## Reglas Críticas — NO VIOLAR

### Queries
1. **NUNCA `take: 500`** ni límites hardcoded en `products.service.ts findAll()` — oculta productos silenciosamente
2. **Verificar `organizationId !== null`** antes de queries — `WHERE organizationId = NULL` devuelve 0 rows
3. **useEffect de productos** DEBE depender de `selection` (tenant context)

### Inventario y Series (SOURCE OF TRUTH)
4. **`StoreOnInventory.stock`** es la ÚNICA fuente de verdad para stock real — usar `increment`/`decrement` atómicos
5. **`EntryDetailSeries.storeId`** es la fuente de verdad para ubicación de serie — NUNCA usar `entry.storeId` (ese es el store original). Bug 2026-03-02
6. **Currency breakdown** debe considerar `Transfer` records, no solo `EntryDetail`
7. **NUNCA eliminar** `EntryDetailSeries` — solo cambiar status (active/inactive)

### Transacciones Atómicas
8. **`createEntry()`** y **`executeSale()`** usan transacciones Prisma — pasos nuevos VAN DENTRO. Operaciones que pueden fallar independientemente (contabilidad) van FUERA como post-operación no-bloqueante
9. **`deleteSale()`** revierte TODO: stock, series, pagos, CashRegister. Ventas SUNAT ACCEPTED no se pueden eliminar (requieren nota de crédito)
10. **Validaciones que NO eliminar**: stock suficiente, serie no duplicada, balance contable cuadrado, referenceId único

### Contabilidad
11. **`AccountingSummaryService` usa `journalLine`** (NO `accEntryLine`) — ese es el sistema antiguo vacío
12. Cuentas PCGE: Ventas (1041/1011, 7011, 4011, 6911, 2011). Compras (2011, 4011, 1011/4211)

### SUNAT
13. **Guías XML**: `cbc:HandlingInstructions` para motivo de traslado — NUNCA `cbc:Information` (error 3457)
14. **`MERCADOPAGO_WEBHOOK_SECRET`** DEBE existir en producción — sin ella, todos los webhooks rechazados con 400

### Cache
15. **Invalidación cruzada obligatoria** (ver sección React Query arriba)
16. **Usar `queryKeys.domain.root()`** para invalidación — nunca strings hardcodeadas

### Prisma
17. **Modelos snake_case** → accessor exacto: `this.prisma.cash_registers`. Tipos: `Prisma.cash_registersWhereInput`
18. **`as any` en queries Prisma son bombas de tiempo** — ocultan nombres de relación incorrectos que explotan en runtime (500). Bug 2026-03-08

## Flujo Transaccional: Entradas y Salidas

> **PRECAUCIÓN MÁXIMA**: Un error aquí corrompe inventario, contabilidad y datos SUNAT. SIEMPRE leer los archivos involucrados antes de modificar.

```
ENTRADAS (Compras)                          SALIDAS (Ventas)
Entry                                      Sales
 ├─ EntryDetail (líneas)                    ├─ SalesDetail (líneas)
 │   ├─ EntryDetailSeries (series S/N)     │   ├─ entryDetailId → EntryDetail
 │   └─ inventoryId → Inventory            │   └─ series: String[] (series vendidas)
 ├─ Invoice (factura proveedor)            ├─ SalePayment → CashTransaction → CashRegister
 └─ *JournalEntry* (post-tx)              ├─ InvoiceSales → SunatTransmission
                                           └─ *JournalEntry* (post-tx)
Inventory → StoreOnInventory (stock real) → InventoryHistory (auditoría)
```

| Operación | Tablas modificadas (en orden) |
|-----------|-------------------------------|
| **Crear entrada** | Entry → EntryDetail → EntryDetailSeries → StoreOnInventory (increment) → InventoryHistory → *JournalEntry* |
| **Crear venta** | Sales → SalesDetail → EntryDetailSeries (→inactive) → StoreOnInventory (decrement) → InventoryHistory → SalePayment → CashTransaction → CashRegister → InvoiceSales → *JournalEntry* |
| **Eliminar venta** | StoreOnInventory (increment) → EntryDetailSeries (→active) → CashRegister (decrement) → CashTransaction/SalePayment/SalesDetail/Sales (delete) |
| **Transferir** | Transfer → StoreOnInventory (decrement origen, increment destino) → InventoryHistory (×2) → EntryDetailSeries (storeId→destino) |

*Cursiva = post-transacción, no-bloqueante*

## Checklist Pre-Deploy (OBLIGATORIO antes de push/merge a `main`)

1. `cd backend && npm run build` — El dev server NO verifica tipos; solo `tsc` los detecta
2. `cd fronted && npm run build` — Verificar frontend compila
3. Si se modificó `prisma/schema.prisma`: `npx prisma generate` + rebuild
4. Buscar `as any` en queries Prisma y verificar nombres de relación manualmente
5. Verificar que `MERCADOPAGO_WEBHOOK_SECRET` existe en producción si se tocaron webhooks
6. No commitear `.env`, credenciales, tokens ni backups de BD

## Rutas Críticas (mapa mínimo para onboarding)

| Propósito | Path |
|-----------|------|
| Schema BD | `backend/prisma/schema.prisma` |
| Productos service | `backend/src/products/products.service.ts` |
| Ventas service | `backend/src/sales/sales.service.ts` |
| Venta atómica | `backend/src/utils/sales-helper.ts` |
| Entradas service | `backend/src/entries/entries.service.ts` |
| Inventario service | `backend/src/inventory/inventory.service.ts` |
| Hooks contables | `backend/src/accounting/hooks/accounting-hook.service.ts` |
| Query keys factory | `fronted/src/lib/query-keys.ts` |
| Query client config | `fronted/src/lib/query-client.ts` |
| Sidebar navigation | `fronted/src/components/sidebar-navigation-data.ts` |
| Tenant context | `fronted/src/context/TenantSelectionContext.tsx` |
| Subscription guard | `backend/src/common/guards/subscription-status.guard.ts` |

## Notas

- Directorio frontend: `fronted` (con 'd'), NO `frontend`
- API Proxy: frontend NUNCA llama al backend directo — pasa por `/app/api/*`
- Navbar `data-navcolor`: solo desktop (md+). En mobile `navColor=""` para que `bg-background` maneje temas
- HorizontalScroller: wrapper externo DEBE tener `overflow-hidden w-full min-w-0`
- Culqi payments: endpoint `POST /api/web-sales/payments/culqi` (NO `/api/payments/culqi`)
- Docker: `DATABASE_URL` dummy requerido en `prisma generate` durante build
- Subscription enforcement: features premium requieren suscripción activa — 403 muestra `SubscriptionBlockedDialog`

---

**Última actualización:** 2026-03-09
**Versión:** 3.0
