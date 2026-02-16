# Business Verticals Implementation Plan (por empresa)

## Objetivo
Permitir que **cada empresa** dentro de una organizacion elija el vertical de negocio (GENERAL, RETAIL, RESTAURANTS, SERVICES, MANUFACTURING) que define sus modulos habilitados, formularios y esquema de productos/inventario. Las empresas comparten usuarios/clientes a traves de la organizacion, pero mantienen catalogos, inventario, ventas, contabilidad y caja independientes; por ello el vertical deja de ser global y pasa a ser una configuracion por empresa. Todas las empresas existentes se inicializaran en `GENERAL` para conservar el comportamiento actual.

---

## 1. Despliegue y rollback seguro
1. **Migracion**: anadir `business_vertical` y `product_schema_enforced` a `companies`, crear indices y constraints, nuevas tablas `company_vertical_change_audit` y `company_vertical_rollback_snapshots`. Inicializar cada empresa con el vertical de su organizacion (o `GENERAL` si no existia).
2. **Servicios**: desplegar backend con el nuevo modelo (config/cache por empresa). Mantener el selector oculto tras un feature flag (`NEXT_PUBLIC_VERTICAL_FEATURE_ENABLED`) hasta validar.
3. **Rollback**: cada cambio genera snapshot (`company_vertical_rollback_snapshots`). Para revertir, restaurar snapshot, registrar evento en auditoria y despachar eventos de invalidacion de cache.
4. **Rollout gradual**:
   - PoC interno (GENERAL + RETAIL).
   - Staging clonando una empresa real y ejecutando cambios completos.
   - Beta con 23 clientes piloto.
   - GA: habilitar el flag para todos los super admins de empresa.

---

## 2. Modelo de datos
| Elemento | Detalle |
| --- | --- |
| Enum `BusinessVertical` | `GENERAL`, `RETAIL`, `RESTAURANTS`, `SERVICES`, `MANUFACTURING` |
| Columna nueva | `companies.business_vertical VARCHAR(50) NOT NULL DEFAULT 'GENERAL'` |
| Flag validacion | `companies.product_schema_enforced BOOLEAN NOT NULL DEFAULT FALSE` |
| Overrides | `company_vertical_overrides` con `company_id` (UNIQUE) + `config_json JSONB` |
| Auditoria | `company_vertical_change_audit` (empresa, usuario, motivo, warnings, snapshot_id) |
| Snapshots | `company_vertical_rollback_snapshots` (empresa, snapshot JSON, expiracion) |

Scripts `scripts/validate-pre-migration.ts` / `post-migration.ts` se actualizan para validar columnas/tablas nuevas y que todas las empresas quedan en `GENERAL`.  

**Migracion de datos existentes**
- **Compatibilidad**: productos/inventario actuales siguen sin `extra_attributes`.
- **Asistente**: UI permite completar atributos nuevos en lote y marcar productos como migrados.
- **Validaciones progresivas**:
  1. Legacy sin cambios obligatorios.
  2. Nuevos productos deben cumplir `productSchema`.
  3. Una vez migrados, activar `product_schema_enforced`.

---

## 3. Registro de configuraciones (`VERTICAL_REGISTRY`)
Cada vertical incluye:
- `features`: modulos habilitados (ventas, kitchen, POS, etc.)
- `ui`: layout, colores, menus personalizados.
- `fiscal`: reglas de impuestos, campos obligatorios.
- `productSchema`: definicion de campos extra (tallas, lotes, BOM, etc.)
- `migrations`: scripts `onActivate` / `onDeactivate`.

`GENERAL` es fallback. Ejemplos de `productSchema`:

### RETAIL
```ts
{
  inventoryTracking: "by_variant",
  pricingModel: "by_variant",
  fields: [
    { key: "size", label: "Talla", type: "select", options: ["XS","S","M","L","XL","XXL"], required: true, group: "clothing" },
    { key: "color", label: "Color", type: "color", required: true, group: "clothing" },
    { key: "sku_variant", label: "SKU Variante", type: "text", generated: true, required: true },
    { key: "material", label: "Material", type: "text" }
  ]
}
```

### RESTAURANTS
```ts
{
  inventoryTracking: "by_ingredient",
  pricingModel: "by_modifiers",
  fields: [
    { key: "prep_time", label: "Tiempo de preparacion (min)", type: "number", required: true },
    { key: "kitchen_station", label: "Estacion de cocina", type: "select", options: ["GRILL","FRY","COLD","BAKERY"], required: true },
    { key: "dietary_info", label: "Informacion dietetica", type: "multi-select", options: ["VEGAN","GLUTEN_FREE","LACTOSE_FREE","SPICY"] },
    { key: "allergens", label: "Alergenos", type: "text" }
  ]
}
```

### FARMACIA
```ts
{
  inventoryTracking: "lot_tracking",
  fields: [
    { key: "composition", label: "Composicion", type: "textarea", required: true },
    { key: "dosage", label: "Dosis", type: "text", required: true },
    { key: "registration_number", label: "Registro sanitario", type: "text", required: true },
    { key: "expiration_date", label: "Fecha de caducidad", type: "date", required: true },
    { key: "lot_number", label: "Numero de lote", type: "text", required: true }
  ]
}
```

---

## 4. Servicios backend
### VerticalConfigService
- `getConfig(companyId)` obtiene la configuracion (mem cache  Redis  DB) y mezcla overrides.
- `getFeatures(companyId)` / `isFeatureEnabled(companyId, feature)`.
- `invalidateCache(companyId)` invalida memoria, Redis y emite eventos (`vertical.config.invalidated`).
- Version de cache = `company.business_vertical + company.updated_at`.

### VerticalCompatibilityService
`check(companyId, from, to)` devuelve `CompatibilityCheckResult`:
- Integridad de datos (ordenes activas, work orders, mesas, POS en progreso).
- Modulos activos, integraciones externas, campos personalizados.
- Impacto en tablas / columnas (`dataImpact`), advertencias, downtime estimado.

### VerticalMigrationService
- Ejecuta scripts `onActivate/onDeactivate`.
- Crea snapshot, registra auditoria, emite `company.vertical.changed`, invalida caches.

---

## 5. API y seguridad
Endpoints (solo `SUPER_ADMIN_GLOBAL` / `SUPER_ADMIN_ORG` / admins de la empresa):
- `GET /api/companies/:id/vertical`
- `POST /api/companies/:id/vertical/compatibility-check`
- `PUT /api/companies/:id/vertical`
- `POST /api/companies/:id/vertical/rollback`
- `POST /api/companies/:id/vertical/enforce-schema` (toggle `product_schema_enforced`)

Cada llamada registra auditoria (usuario, motivo, warnings, snapshot). El `PUT` bloquea si hay errores; con warnings requiere `force=true`.

**Permisos**  
`TenantContextService` expone `allowedCompanyIds`; el guard permite el acceso si:
- el usuario es super admin global,
- es super admin de la organizacion duena de la empresa,
- o el `companyId` solicitado aparece en `allowedCompanyIds`.

Casos borde:
- Ordenes de venta/produccion/mesas en progreso.
- Integraciones activas que no soporten el vertical.
- Reportes o campos custom que quedarian invalidos.
- Uso multi-vertical: permitir overrides por empresa, no por organizacion.

---

## 6. Frontend / UX
1. **Panel Vertical de negocio por empresa** (visible en /dashboard/companies/:id):
   - Muestra vertical actual, selector de objetivo, botones Validar compatibilidad y Cambiar vertical.
   - Modal de confirmacion con motivo obligatorio, seleccion auto/manual de scripts, descarga de reporte y casilla Acepto riesgos.
2. **Aplicaci�n del cambio**:
   - Mostrar progreso (Procesando...), invalidar site-settings, TenantFeaturesContext, useVerticalConfig.
   - Banner post-cambio explicando nuevos campos y, adicionalmente, banner global cuando existan productos legacy pendientes (link al asistente).
3. **UI din�mica**:
   - useVerticalConfig(companyId) expone Features/ui/productSchema.
   - Formularios de productos/inventario renderizan campos segun productSchema.
   - Tablas/listas muestran columnas dinamicas y chips Legacy.
   - Menus laterales incluyen customMenuItems definidos por el vertical.
4. **Inventario / productos**:
   - Vista legacy y vista variantes.
   - Asistente Dividir stock (Retail) o Asignar receta (Restaurants) dentro de la pagina de migracion.
   - Indicadores de progreso por empresa (panel, chips y banner global).
   - Pagina /dashboard/products/migration con listado filtrable, seleccion multiple y acciones masivas (dividir stock, asignar receta, marcar migrado). Enlazada desde el panel, el banner y las vistas de inventario/productos.

---

## 7. Modelo de productos e inventario adaptable
- `products.extra_attributes JSONB` (valores segun `productSchema`).
- `is_vertical_migrated` flag para saber si un producto completo la migracion.
- Endpoints:
  - `POST /api/products/:id/vertical-migration` (guardar atributos en lote).
  - `GET /api/products?companyId=&migrationStatus=legacy|migrated`.
  - KPI de avance `/api/companies/:id/vertical/status` (alias liviano del estado de migracion).
- Frontend:
  - `ProductsTable` / `Inventory` filtran por `migrationStatus` (todos/legacy/migrados).
  - Chips "Legacy" y columnas dinamicas segun `productSchema`.
  - Banner en inventario con enlace al asistente cuando hay pendientes.
- Pendiente: validacion manual del flujo end-to-end (crear legacy, ver chip/banner/KPI, migrar desde asistente).

---

## 8. Consumo en modulos
- Backend: ventas y facturacion **siempre deben estar habilitadas**; el vertical solo ajusta captura/estructura de datos (productos/inventario), no bloquea comprobantes.
- Backend: inventario y POS consultan `VerticalConfigService(companyId)` en lugar de asumir un esquema global.
- Frontend: `TenantFeaturesContext` combina permisos + vertical actual de la empresa seleccionada.
- Integraciones: `VerticalCompatibilityService` valida conectores activos (POS, eCommerce, delivery, contabilidad).

---

## 9. Pruebas y monitoreo
- **Unit tests**: servicios de config/compatibilidad/migracion, DTOs, scripts CLI.
- **E2E**: flujo GENERALRETAILrollback con empresa clonada (productos + inventario).
- **Performance**: empresas con +1000 productos y multiples variantes.
- **Monitoreo**: alertar fallas en auditoria/snapshots, eventos `company.vertical.changed`, metricas de migracion por empresa.
- **Documentacion**: guia para super admins, troubleshooting, runbook de rollback, video walkthrough.

---

## 10. Orden recomendado
1. Migracion DB + scripts de validacion.
2. `VERTICAL_REGISTRY` + servicios backend por empresa.
3. APIs / auditoria / snapshots.
4. Hooks frontend (`useVerticalConfig`, `TenantFeaturesContext`).
5. Panel UX por empresa + compatibilidad + confirmacion + reportes.
6. Adaptar productos, inventario, ventas y asistente de migracion para usar `productSchema`.
7. Pruebas unitarias/E2E, beta cerrada, habilitar flag global.

---

## Checklist rapido
- [ ] Migraciones ejecutadas y validadas.
- [ ] Servicios (`VerticalConfigService`, `VerticalCompatibilityService`, `VerticalMigrationService`) cubiertos con tests.
- [ ] APIs `/companies/:id/vertical*` protegidas y auditadas.
- [ ] Frontend con panel por empresa + hook `useVerticalConfig`.
- [ ] Asistente de migracion y tablas con indicadores "Legacy".
- [ ] Scripts CLI (`validate-*`, `migrate-products-to-extra-attributes`, `set-vertical-override`) listos.
- [ ] Documentacion para clientes y soporte actualizada.
