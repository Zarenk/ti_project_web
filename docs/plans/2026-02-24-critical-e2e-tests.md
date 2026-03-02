# Critical E2E Test Suite — Design Document

**Date:** 2026-02-24
**Goal:** Automated E2E tests for critical business flows. One command (`npm run test:critical`) to validate the system before each deploy.

## Architecture

```
npm run test:critical
  │
  ├── 1. Reset DB ecoterra_test + seed datos fijos
  ├── 2. Levantar backend (PORT=4000, DATABASE_URL=ecoterra_test)
  ├── 3. Levantar frontend (PORT=3000)
  ├── 4. Ejecutar Cypress specs en orden secuencial
  └── 5. Matar procesos + reportar resultados
```

- **DB**: `ecoterra_test` en localhost:5432 (separada de `ecoterra` dev)
- **Ports**: 4000/3000 (mismos que dev — verificar que no haya procesos corriendo)
- **Seed**: Datos predecibles y fijos (ver abajo)

## Seed Data (Known Fixtures)

| Entity | Value | ID |
|--------|-------|----|
| Organization | "E2E Test Corp" | 1 |
| Company | "E2E Sucursal" | 1 |
| Store | "Tienda E2E" | 1 |
| Category | "Categoria E2E" | 1 |
| Provider | "Proveedor E2E" (RUC: 20999999991) | 1 |
| Client (generic) | "Sin Cliente" | 1 |
| PaymentMethod | "EN EFECTIVO" | 1 |
| Journal | "Libro Diario" | 1 |
| Account 1011 | "Caja" (ACTIVO) | — |
| Account 1041 | "Cuentas Corrientes" (ACTIVO) | — |
| Account 2011 | "Mercaderias" (ACTIVO) | — |
| Account 4011 | "IGV" (PASIVO) | — |
| Account 4211 | "Facturas por Pagar" (PASIVO) | — |
| Account 6011 | "Mercaderias" (GASTO) | — |
| Account 6911 | "Costo de Ventas" (GASTO) | — |
| Account 7011 | "Ventas" (INGRESO) | — |

### Users

| Email | Password | Role | Membership Role |
|-------|----------|------|-----------------|
| admin@e2etest.com | Test1234! | ADMIN | ADMIN |
| employee@e2etest.com | Test1234! | EMPLOYEE | MEMBER |
| orgadmin@e2etest.com | Test1234! | SUPER_ADMIN_ORG | SUPER_ADMIN |

## Specs Structure

```
fronted/cypress/e2e/critical/
├── 01-auth.cy.ts
├── 02-products-crud.cy.ts
├── 03-inventory-entry.cy.ts
├── 04-entry-with-series.cy.ts
├── 05-cash-register.cy.ts
├── 06-sale-flow.cy.ts
├── 07-sale-with-series.cy.ts
├── 08-sale-delete.cy.ts
├── 09-role-permissions.cy.ts
└── _support/
    └── test-constants.ts
```

## Spec Details

### 01-auth.cy.ts
- Login as admin@e2etest.com via UI → redirects to /dashboard
- Login as employee@e2etest.com → redirects to /dashboard
- Login as orgadmin@e2etest.com → redirects to /dashboard
- Logout → redirects to /login
- Invalid credentials → error message

### 02-products-crud.cy.ts
- **Login**: `cy.loginViaApi()` as admin
- Create product "Producto E2E" (price=100, priceSell=120, SKU=E2E-001)
- **Verify**: appears in product table
- Edit product: change name to "Producto E2E Editado", price to 130
- **Verify**: table reflects changes
- Upload image to product
- **Verify**: image visible in product detail
- Create "Producto E2E Eliminar"
- Delete the second product
- **Verify**: deleted product gone, first product intact

### 03-inventory-entry.cy.ts
- Create entry: 50 units of "Producto E2E Editado" at cost 80
- **Verify stock**: navigate to inventory → stock = 50
- **Verify entry**: entry appears in entries list with correct amount
- **Verify accounting** (via API): journal entry exists with accounts 2011/4211

### 04-entry-with-series.cy.ts
- Create second product "Producto E2E Series" for serial tracking
- Create entry: 10 units with serials SN-E2E-001 to SN-E2E-010
- **Verify stock**: 10 units
- **Verify series** (via API): all 10 serials exist with status "active"

### 05-cash-register.cy.ts
- Open cash register with initial balance 0
- **Verify**: cash register appears as ACTIVE with S/. 0.00

### 06-sale-flow.cy.ts
- Create sale: 5 units of "Producto E2E Editado" at 130 = S/. 650 (+ IGV)
- Payment: full in cash
- **Verify stock**: inventory shows 45 (was 50)
- **Verify cash register**: balance increased by payment amount
- **Verify sale**: appears in sales list with correct total
- **Verify accounting** (via API): journal entry with 1041/7011/4011/6911/2011
- **Verify PDF**: PDF button doesn't return 500

### 07-sale-with-series.cy.ts
- Create sale: 2 units of "Producto E2E Series" selecting SN-E2E-001 and SN-E2E-002
- **Verify stock**: 8 (was 10)
- **Verify series** (via API): SN-E2E-001 and SN-E2E-002 → status "inactive"
- **Verify remaining**: SN-E2E-003 to SN-E2E-010 → status "active"

### 08-sale-delete.cy.ts
- Delete the sale from spec 06
- **Verify stock reversed**: 50 (was 45)
- **Verify cash register reversed**: balance back to previous value
- **Verify transaction removed**: cash movement gone
- Delete the sale from spec 07
- **Verify series reversed**: SN-E2E-001 and SN-E2E-002 → status "active" again
- **Verify stock**: back to 10

### 09-role-permissions.cy.ts
- Login as employee@e2etest.com
- **Verify dashboard**: only quick links visible, no KPIs, no financial summary
- Can see products list (read-only)
- Can create a basic sale
- **Cannot** delete sales (button not visible)
- **Cannot** access /dashboard/accounting (redirect or blocked)
- **Cannot** access /dashboard/options (system config)

## Verification Strategy

- **UI actions**: Always via Cypress (click, type, navigate) — simulates real user
- **Side-effect verification**: Hybrid approach
  - Navigate to relevant page when possible (inventory page for stock)
  - Use `cy.request()` to backend API for data not visible in UI (series status, journal entries)

## Constants File

```typescript
export const TEST = {
  PRODUCT_NAME: "Producto E2E",
  PRODUCT_NAME_EDITED: "Producto E2E Editado",
  PRODUCT_SERIES_NAME: "Producto E2E Series",
  PRODUCT_PRICE: 100,
  PRODUCT_PRICE_SELL: 120,
  PRODUCT_PRICE_EDITED: 130,
  PRODUCT_COST: 80,
  PRODUCT_SKU: "E2E-001",
  PRODUCT_DELETE_NAME: "Producto E2E Eliminar",
  ENTRY_QTY: 50,
  SERIAL_PREFIX: "SN-E2E-",
  SERIAL_QTY: 10,
  SALE_QTY: 5,
  SALE_SERIAL_QTY: 2,
  ADMIN_EMAIL: "admin@e2etest.com",
  EMPLOYEE_EMAIL: "employee@e2etest.com",
  ORG_ADMIN_EMAIL: "orgadmin@e2etest.com",
  PASSWORD: "Test1234!",
  ORG_NAME: "E2E Test Corp",
  STORE_NAME: "Tienda E2E",
  PROVIDER_NAME: "Proveedor E2E",
  CATEGORY_NAME: "Categoria E2E",
} as const
```

## Orchestration Script

Single entry point: `scripts/test-critical.sh`

```bash
#!/bin/bash
set -e

# 1. Check ports are free
# 2. Reset test DB: dropdb + createdb + prisma db push + seed
# 3. Start backend with TEST env vars
# 4. Start frontend
# 5. Wait for both to be healthy
# 6. Run Cypress specs in order
# 7. Kill processes
# 8. Report results
```

Registered as `npm run test:critical` in root or fronted package.json.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tests break when UI changes | Use text-based selectors (button contains "text") not fragile CSS classes |
| Slow execution (>10min) | Sequential specs but parallel API calls within each. Target: <8min |
| Flaky due to timing | Use `cy.intercept()` + `cy.wait()` for API-dependent assertions |
| DB state leaks between runs | Full reset (drop + create + seed) before each suite |
| Port conflicts with dev | Script checks and warns if ports 4000/3000 are in use |