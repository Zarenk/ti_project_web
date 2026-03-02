# KISS Cleanup — Phase 3 & Phase 4

> **Estado:** Phase 3 COMPLETADA — Phase 4 diferida por riesgo en produccion
> **Prerequisito:** Phase 1 (dead code) y Phase 2 (extract hooks/utils) completados
> **Fecha inicio:** 2026-02-21
> **Fecha cierre Phase 3:** 2026-02-21
> **Backup de seguridad:** commit `340de8c` en branch `develop`

---

## Phase 2 Completada (Referencia)

| Componente | Antes | Despues | Extraido a |
|-----------|-------|---------|-----------|
| cash-register-dashboard.tsx | 2761 | 1427 | cash-register-utils.ts (1362 lineas) |
| products-client.tsx | 590 | 483 | use-products-data.ts (150 lineas) |
| quick-entry-view.tsx | 760 | 658 | use-entry-cart.ts (145 lineas) |
| quick-sale-view.tsx | 1173 | 864 | use-sale-cart.ts + use-sale-payment.ts |
| legal/new/page.tsx | 835 | 835 | No necesita — form simple |

---

## Phase 3: Refactors Estructurales — COMPLETADA

### 3.1 DTOs Duplicados — Crear Base Generica ✅ (Session 1)

**Problema:** 16+ DTOs siguen el patron identico:
```typescript
export type CreateXxxDto = Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateXxxDto = Partial<CreateXxxDto> & { id: number };
```

**Modulos afectados:** clients, providers, contact, brands, category, products, sales, inventory, entries, campaigns, ads, activity

**Solucion propuesta:** Crear utilidades genericas en `backend/src/common/dto-base.ts`:
```typescript
export type BaseCreateDto<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type BaseUpdateDto<T> = Partial<BaseCreateDto<T>> & { id: number };
```

**Esfuerzo:** Bajo | **Impacto:** ~100+ lineas eliminadas | **Riesgo:** Bajo

---

### 3.2 Accounting Entry Builders ✅ (Session 3)

**Evaluacion KISS:** Los 6 servicios (320 lineas total, promedio 53 c/u) tienen logica de negocio diferente (2-5 lineas contables, cuentas distintas, IGV handling distinto). Un builder generico seria mas complejo que los 6 servicios simples.

**Accion tomada:** Extraer magic number `1.18` a constante compartida `IGV_FACTOR` + utilitario `round2` en `accounting/accounting.constants.ts`. Se elimino `const IGV_RATE = 0.18` dead code de purchase-posted.controller.ts.

---

### 3.3 Accounting Hook DTOs ⏭️ SKIP

**Evaluacion KISS:** Los 6 DTOs son 4-8 lineas cada uno con class-validator. Un DTO base ahorria solo 2 lineas por DTO. No justifica la abstraccion.

---

### 3.4 Filtro de Organizacion Duplicado ✅ (Session 2)

**Accion tomada:** Migrados 3 servicios a `buildOrganizationFilter` desde `organization.utils.ts`:
- `brands.service.ts` — 8 where clauses migradas
- `category.service.ts` — 10 where clauses migradas (composite keys intactas)
- `cashregister.service.ts` — Eliminada duplicacion local del metodo (18 usages migrados)

**No migrados (por diseno):** inventory (patron legacy OR), journals (array-based), tenancy (role-based), accounting (distincion undefined/null critica).

---

### 3.5 TODOs y Codigo Incompleto ✅ (Session 4)

**Accion tomada:**
- 6 guards de hooks contables: TODO → FIXME descriptivo (explica que son endpoints internos sin auth headers)
- 3 stubs en help.service.ts: Eliminado codigo comentado, reemplazado con FIXME conciso
- 3 hardcoded values (growth +8.5%, score +12, journalId 1): TODO → FIXME con contexto
- 1 dead code: `const IGV_RATE = 0.18` eliminado de purchase-posted.controller.ts
- 11 TODOs restantes: features aspiracionales (ads, publish, jurisprudence) — se dejan intactos

**Accion:** Mover a issues del repo o eliminar si no se van a implementar.

---

## Phase 4: Cambios Arquitectonicos (Riesgo Alto)

> **PRECAUCION:** Estos cambios afectan la estructura fundamental del backend.
> Requieren planificacion detallada, tests y despliegue gradual.

### 4.1 Servicios Monstruo — Descomponer

Los 10 servicios mas grandes del backend:

| Archivo | Lineas | Responsabilidades mezcladas |
|---------|--------|---------------------------|
| subscriptions.service.ts | 2,770 | Pagos, cuotas, notificaciones |
| tenancy.service.ts | 2,479 | Multi-tenant, companies, config vertical |
| sales.service.ts | 2,214 | Ordenes, inventario, accounting hooks |
| inventory.service.ts | 1,751 | Stock, transfers, snapshots, contabilidad |
| users.service.ts | 1,453 | CRUD, roles, permisos, metricas |
| entries.service.ts | 1,197 | Compras/ventas, inventario, accounting |
| help.service.ts | 1,193 | KB, embeddings, search, suggestions |
| websales.service.ts | 1,182 | Ventas web, inventario, tracking |
| products.service.ts | 1,146 | CRUD, imagenes, features, catalogo |
| cashregister.service.ts | 1,119 | Operaciones, cierres, transacciones |

**Estrategia de descomposicion (ejemplo subscriptions):**
```
subscriptions.service.ts (2,770 lineas)
  -> subscription-payment.service.ts   (pagos y cobros)
  -> subscription-quota.service.ts     (gestion de cuotas)
  -> subscription-notification.service.ts (emails, alertas)
  -> subscriptions.service.ts          (orquestador ~500 lineas)
```

**Esfuerzo:** Alto | **Impacto:** Mantenibilidad a largo plazo | **Riesgo:** Alto

---

### 4.2 Controller Base Generico

**Problema:** ~45 controllers con CRUD identico (boilerplate repetido):
```typescript
@Post() create()
@Get() findAll()
@Get(':id') findOne()
@Patch(':id') update()
@Delete(':id') remove()
```

**Solucion propuesta:** Crear `BaseCrudController<T>` abstracto.

**Esfuerzo:** Alto | **Impacto:** ~2,000+ lineas eliminadas | **Riesgo:** Alto (afecta todos los endpoints)

---

### 4.3 Modulo Contabilidad — Reorganizar

**Estado actual:** 16 servicios separados (3,916 lineas totales) con dependencias cruzadas:

```
accounting.service.ts (923)
├── entries.service.ts (437)
├── accounts.service.ts (107)
├── journal-entry.service.ts (762)
├── accounting-summary.service.ts (432)
├── accounting-analytics.service.ts (364)
├── account-mapping.service.ts (145)
├── account-bootstrap.service.ts (130)
├── ple-export.service.ts (97)
└── [6 servicios especializados 100-205 lineas c/u]
```

**Problema:** Falta separacion clara de responsabilidades; demasiadas interdependencias.

**Solucion propuesta:** Reorganizar en capas con responsabilidad unica (SRP):
- **Core:** Cuentas, asientos, journal
- **Reporting:** Resumenes, analytics, PLE
- **Integration:** Hooks, mapeo, bootstrap

**Esfuerzo:** Muy alto | **Impacto:** Mantenibilidad critica | **Riesgo:** Muy alto

---

### 4.4 Arquitectura Event-Driven

**Problema:** Comunicacion entre modulos es directa (imports cruzados). Ejemplo: ventas llama directamente a inventario, contabilidad, notificaciones.

**Solucion propuesta:** Implementar event bus con `@nestjs/event-emitter` para desacoplar modulos.

**Esfuerzo:** Muy alto | **Impacto:** Desacoplamiento total | **Riesgo:** Muy alto

---

## Resumen de Ejecucion Phase 3

| Session | Item | Resultado |
|---------|------|-----------|
| Session 1 | 3.1 DTOs base + 3.3 Eval | `AutoManagedBase/Tenant/MultiTenant` creados, 5 DTOs migrados. 3.3 SKIP per KISS |
| Session 2 | 3.4 Org filter | brands, category, cashregister migrados. 0 errores TS |
| Session 3 | 3.2 Entry builders | `IGV_FACTOR` + `round2` extraidos. Consolidacion completa SKIP per KISS |
| Session 4 | 3.5 TODOs | 14 TODOs limpiados (6 guards, 3 help stubs, 3 hardcoded, 1 dead code, 1 IGV_RATE) |

**TypeScript check final:** 0 errores en codigo fuente (solo pre-existentes en .spec.ts)

---

## Phase 4: Pendiente (requiere planificacion)

### Prioridad para Phase 4
1. [4.1] Descomponer servicios monstruo (empezar por el menos critico)
2. [4.2] Controller base generico
3. [4.3] Reorganizar modulo contabilidad
4. [4.4] Arquitectura event-driven (largo plazo)

### Checklist Pre-Ejecucion Phase 4

- [ ] Crear branch dedicado desde `develop`
- [ ] Backup de base de datos de produccion
- [ ] Verificar que tests existentes pasan
- [ ] Planificar rollback strategy
- [ ] Escribir tests ANTES del refactor
- [ ] Deploy gradual (staging -> produccion)

---

*Documento generado: 2026-02-21*
*Phase 3 completada: 2026-02-21*
