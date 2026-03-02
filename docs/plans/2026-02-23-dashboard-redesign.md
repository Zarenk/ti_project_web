# Dashboard Redesign — 2026-02-23

## Summary

Redesign of `/dashboard` home page with vertical-aware KPIs, role-based permission model, financial summary card, and enhanced activity feed.

## Changes Made

### New Files (6)

| File | Lines | Purpose |
|------|-------|---------|
| `fronted/src/app/dashboard/dashboard-config.ts` | ~200 | Declarative config map: per-vertical KPIs, role permissions, quick links |
| `fronted/src/app/dashboard/use-dashboard-data.ts` | ~310 | Custom hook: all data fetching, vertical resolution, financial data |
| `fronted/src/app/dashboard/dashboard-financial-card.tsx` | ~200 | Accounting summary with 4 metric tiles, sparklines, health score |
| `fronted/src/app/dashboard/dashboard-activity-feed.tsx` | ~80 | Enhanced activity timeline with type colors, amounts, empty state |
| `fronted/src/app/dashboard/dashboard-quick-links.tsx` | ~70 | Employee view: permission-filtered quick action cards |
| `docs/plans/2026-02-23-dashboard-redesign.md` | This file |

### Modified Files (1)

| File | Change |
|------|--------|
| `fronted/src/app/dashboard/page.tsx` | Rewritten from 706-line monolith to ~180-line orchestrator |

### Removed

- Redundant "Pro V1.3" header with Package icon (sidebar provides org switching)
- Static welcome card with 4 navigation links + dead "Empezar" button
- Inline data fetching logic (extracted to `use-dashboard-data.ts`)

## Architecture

### Role-Based Permission Matrix

| Feature | SUPER_ADMIN_GLOBAL | ADMIN / SUPER_ADMIN_ORG | EMPLOYEE |
|---------|-------------------|------------------------|----------|
| KPI Cards | All + sparklines | All + sparklines | Hidden |
| Financial Summary | Full (cash, inventory, taxes, profit) | Full | Hidden |
| Health Score | Visible | Visible | Hidden |
| Activity Feed | With amounts (S/.) | With amounts | Basic, no amounts |
| Quick Links | N/A (has full KPIs) | N/A | **Primary view** |
| Org Selector | Yes | No | No |

### Vertical KPI Config Map

| Vertical | Card 1 | Card 2 | Card 3 | Card 4 |
|----------|--------|--------|--------|--------|
| GENERAL/RETAIL/COMPUTERS/MANUFACTURING/SERVICES | Inventario Total | Ventas del mes | Items sin Stock | Ordenes Pendientes |
| RESTAURANTS | Ordenes hoy | Ventas del dia | Mesas ocupadas | Platos en cocina |
| LAW_FIRM | Expedientes activos | Honorarios del mes | Audiencias proximas | Casos cerrados |
| GYM | Miembros activos | Ingresos del mes | Check-ins hoy | Clases hoy |

### Data Fetching Strategy

1. **First wave (blocking):** Core KPIs + sparklines + activity (parallel `Promise.all`)
2. **Second wave (non-blocking):** Accounting summary + health score (fire after first wave)
3. **Vertical-specific:** GYM → `getGymOverview()`, LAW_FIRM → `getLegalStats()` (injected into first wave)
4. **Fallback:** If vertical endpoint fails, silently fall back to GENERAL config

### Financial Summary Card

Replaces the welcome card. Uses existing endpoints:
- `/accounting/summary` → cash, inventory value, taxes, profit + sparklines
- `/accounting/analytics/health-score` → health dot (0-100)

LAW_FIRM adaptation: "Honorarios cobrados" instead of "Efectivo disponible", "Cuentas por cobrar" instead of "Inventario valorizado".

## Risks

1. **RESTAURANTS vertical:** No analytics endpoint exists yet. Mesas/Cocina KPIs show 0. Backend endpoint needed.
2. **Accounting data dependency:** Financial card requires at least one sale. Empty state handles this gracefully.
3. **GYM/LAW_FIRM endpoints:** Depend on vertical modules being enabled. Fallback to GENERAL if API fails.

## Next Steps

1. Create `POST /restaurant-orders/analytics/summary` backend endpoint
2. Add restaurant-specific frontend proxy
3. Consider adding time-range selector for financial metrics
4. Add `prefers-reduced-motion` media query for sparkline animations
