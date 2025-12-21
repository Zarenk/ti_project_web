# Business Verticals Implementation Plan

## Objetivo
Implementar un sistema de verticales de negocio (GENERAL, RESTAURANTS, RETAIL, SERVICES, MANUFACTURING) que permita personalizar módulos, UI y modelo de productos según el giro de la empresa, asegurando que todas las organizaciones actuales conserven el comportamiento GENERAL hasta que lo cambien explícitamente.

---

## 1. Despliegue y rollback seguro
1. Aplicar migración que añade `business_vertical` a `organizations`, índices, tabla de auditoría (`vertical_change_audit`) y snapshots (`vertical_rollback_snapshots`). Inicializar todas las organizaciones en `GENERAL`.
2. Desplegar backend con el nuevo campo y servicios. Mantener el selector de vertical oculto en el frontend mediante feature flag hasta validar.
3. Documentar procedimiento de rollback:
   - Crear snapshot antes de cada cambio (`vertical_rollback_snapshots`).
   - Para revertir, restaurar snapshot y registrar evento en auditoría.
4. **Estrategia de despliegue gradual**:
   - **Fase 1 (PoC)**: habilitar solo GENERAL + RETAIL en entornos internos.
   - **Fase 2 (Staging)**: clonar una organización real, ejecutar cambio y validar inventario/ventas/reportes.
   - **Fase 3 (Beta)**: seleccionar 2-3 clientes piloto, habilitar el selector y dar seguimiento.
   - **Fase 4 (GA)**: habilitar el feature flag para todos los super admins.

---

## 2. Modelo de datos
| Elemento | Detalle |
| --- | --- |
| Enum `BusinessVertical` | `GENERAL`, `RESTAURANTS`, `RETAIL`, `SERVICES`, `MANUFACTURING` |
| Columna nueva | `organizations.business_vertical VARCHAR(50) NOT NULL DEFAULT 'GENERAL'` |
| Overrides | Tabla `organization_vertical_overrides` (JSON) para ajustes específicos |
| Auditoría | `vertical_change_audit` guarda quién cambió qué, motivo, warnings, snapshot |
| Snapshots | `vertical_rollback_snapshots` guarda estado de datos relevante para rollback |

Scripts de validación `scripts/validate-pre-migration.ts` y `scripts/validate-post-migration.ts` verificarán estado antes/después.

### Estrategia de migración de datos existentes
- **Modo compatibilidad**: productos/inventario existentes siguen funcionando sin atributos adicionales (no se obliga a completar `extra_attributes`).
- **Asistente de migración**: UI ofrecerá herramientas para completar datos nuevos en lote (ej. tallas/colores) y marcar productos como "migrados".
- **Validaciones progresivas**:
  1. Productos legacy pueden guardarse sin nuevos campos.
  2. Productos nuevos deben cumplir `productSchema`.
  3. Una vez completada la migración, se puede activar la validación estricta para todos.
- **Inventario**: ver sección 7 para estrategias de transición (modo legacy, división por variantes, bloqueo si hay órdenes activas).

---

## 3. Registro de configuraciones (`VERTICAL_REGISTRY`)
Cada vertical define:
- `features`: flags para ventas, inventario, reservas, POS, etc.
- `ui`: layout de dashboard, theme, templates de comprobantes, menús personalizados.
- `fiscal`: reglas fiscales, campos obligatorios, formatos de factura.
- `productSchema`: campos adicionales y validaciones para productos/inventario (tallas/colores, lote/caducidad, BOM, etc.).
- `migrations`: scripts `onActivate`/`onDeactivate` y transformaciones de datos.

`GENERAL` actúa como fallback; las otras verticales heredan y sobreescriben lo necesario.

### Ejemplos de `productSchema`

#### RETAIL (ropa y variantes)
```ts
const RETAIL_PRODUCT_SCHEMA = {
  inventoryTracking: 'by_variant',
  pricingModel: 'by_variant',
  fields: [
    { key: 'size', label: 'Talla', type: 'select', options: ['XS','S','M','L','XL','XXL'], required: true, group: 'clothing' },
    { key: 'color', label: 'Color', type: 'color', required: true, group: 'clothing' },
    { key: 'sku_variant', label: 'SKU Variante', type: 'text', required: true, generated: true },
    { key: 'material', label: 'Material', type: 'text', required: false }
  ]
};
```

#### RESTAURANTS (menú/ingredientes)
```ts
const RESTAURANTS_PRODUCT_SCHEMA = {
  inventoryTracking: 'by_ingredient',
  pricingModel: 'by_modifiers',
  fields: [
    { key: 'prep_time', label: 'Tiempo de preparación (min)', type: 'number', required: true },
    { key: 'kitchen_station', label: 'Estación de cocina', type: 'select', options: ['GRILL','FRY','COLD','BAKERY'], required: true },
    { key: 'dietary_info', label: 'Información dietética', type: 'multi-select', options: ['VEGAN','GLUTEN_FREE','LACTOSE_FREE','SPICY'] },
    { key: 'allergens', label: 'Alérgenos', type: 'text', required: false }
  ]
};
```

#### FARMACIA (usado en RESTAURANTS/GENERAL según país)
```ts
const PHARMACY_PRODUCT_SCHEMA = {
  inventoryTracking: 'lot_tracking',
  fields: [
    { key: 'composition', label: 'Composición', type: 'textarea', required: true },
    { key: 'dosage', label: 'Dosis', type: 'text', required: true },
    { key: 'registration_number', label: 'Registro sanitario', type: 'text', required: true },
    { key: 'expiration_date', label: 'Fecha de caducidad', type: 'date', required: true },
    { key: 'lot_number', label: 'Número de lote', type: 'text', required: true }
  ]
};
```

---

## 4. Servicios backend
### VerticalConfigService
- Recupera config (mem cache → Redis → DB), mezcla overrides y expone:
  - `getConfig(organizationId)`
  - `getFeatures(organizationId)`
  - `isFeatureEnabled(organizationId, feature)`
  - `invalidateCache(organizationId)` (mem cache + Redis + event bus)
- La versión de config = `business_vertical + updated_at` para cache busting.

### VerticalCompatibilityService
- `check(organizationId, from, to)` devuelve `CompatibilityCheckResult`:
  - valida integridad de datos (mesas activas, órdenes en curso, inventarios, etc.)
  - revisa módulos activos, integraciones, custom fields, transacciones abiertas
  - analiza impacto de datos (tablas afectadas, campos ocultos, necesidad de migración)
  - calcula downtime estimado y warnings.

### VerticalMigrationService
- Ejecuta scripts definidos en `migrations.onActivate/onDeactivate`.
- Crea snapshot, registra auditoría, emite evento `vertical.changed`, invalida caches.

---

## 5. API y seguridad
Endpoints (solo `SUPER_ADMIN_GLOBAL` y `SUPER_ADMIN_ORG`):
- `GET /api/organizations/:id/vertical`
- `POST /api/organizations/:id/vertical/compatibility-check`
- `PUT /api/organizations/:id/vertical`
- `POST /api/organizations/:id/vertical/rollback`

Todos registran auditoría y motivo. El `PUT` ejecuta `CompatibilityService` antes de confirmar. Si hay warnings, pide confirmación explícita; si hay errores, bloquea el cambio.

**Casos borde a validar antes del cambio:**
- Órdenes de venta/producción/mesas activas (bloquear hasta completar).
- Integraciones externas (POS, eCommerce) habilitadas que no soporten el nuevo vertical.
- Reportes personalizados o campos custom que podrían romperse; avisar en warnings.
- Multi-vertical (ej. cafetería con merchandising): manejarlo mediante overrides específicos o permitir seleccionar vertical base + features adicionales.

---

## 6. Frontend / UX
1. **Panel “Vertical de Negocio”** (visible solo a super admins):
   - Selector de vertical.
   - Botón “Validar compatibilidad” que muestra warnings/errores.
   - Modal de confirmación con resumen, motivo obligatorio y opción de descargar reporte.
2. **Cambio aplicado**:
   - Mostrar progreso y, al finalizar, forzar refresh de `site-settings`, `tenant context` y `useVerticalFeatures`.
   - Notificar que ciertos formularios (productos, inventario, ventas) se actualizarán.
3. **UI dinámica**:
   - `useVerticalConfig()` expone `config.features`, `config.ui` y `config.productSchema`.
   - Formularios de productos/inventario renderizan campos según `productSchema` (por ejemplo tallas/colores para RETAIL, lote/caducidad para FARMACIA/RESTAURANTS, BOM/work orders para MANUFACTURING).
   - Tablas y reportes muestran columnas dinámicas (talla/color, lote, etc.).

### Flujo UI detallado
1. **Selector**: se ubica en la vista de Organización. Incluye tooltip explicando impacto del cambio.
2. **Compatibilidad**: abre modal con resultados (errores, warnings, módulos afectados, downtime estimado). Permite descargar reporte.
3. **Confirmación**: requiere seleccionar “Acepto riesgos”, ingresar motivo y, opcionalmente, elegir si se ejecutarán scripts de migración inmediatamente o manualmente.
4. **Post-cambio**: banner informativo que describe nuevos campos requeridos y enlaces a asistentes de migración de productos.
5. **Formularios de productos**:
   - `GENERAL`: formulario simple (nombre, precio, stock, categoría).
   - `RETAIL`: secciones para variantes (talla/color), precios por variante, stock por variante.
   - `RESTAURANTS`: secciones para ingredientes, estaciones de cocina, alérgenos, tiempo de preparación.
   - `SERVICES`: campos para proyectos, citas, work orders.
6. **Inventario**:
   - Vista legacy muestra productos sin variantes (marca “Legacy”).
   - Vista nueva agrupa por variantes (grid “Talla/Color”).
   - Asistente “Dividir stock” para convertir un SKU en variantes múltiplas.

---

## 7. Modelo de productos e inventario adaptable
1. Añadir columna JSON `products.extra_attributes` o tabla `product_attributes`.
2. Definir `productSchema` por vertical con campos, tipos, obligatoriedad y reglas de validación.
3. Backend:
   - Al guardar productos/inventario, validar contra `productSchema`.
   - Exponer estos metadatos vía API para que el frontend genere formularios.
4. Frontend:
   - `ProductFormLayout` consume `productSchema` y muestra componentes específicos (`ClothingFields`, `PharmacyFields`, etc.).
   - Reportes/exports incluyen atributos relevantes del vertical.

### Estrategias de transición de inventario
| Escenario | Acción |
| --- | --- |
| Productos legacy sin atributos | Mostrar tag “Legacy” y permitir venta/edición limitada. |
| Cambio a RETAIL (variantes) | Ofrecer asistente para dividir stock en variantes (ej. tallas/colores), con opción de mantener SKU único hasta completar. |
| Cambio a RESTAURANTS (ingredientes) | Permitir asignar recetas gradualmente; bloquear cambio si hay órdenes de cocina activas. |
| Cambio a SERVICES (sin inventario físico) | Advertir cuántos productos tipo “inventario” quedarán ocultos; permitir convertirlos a servicios. |
| Lotes/caducidad activos | Bloquear si hay lotes sin caducidad o sin stock cero; requerir completar campos antes del cambio. |

**Criterios de bloqueo**:
- Órdenes/mesas/kitchen tickets en estado activo.
- Work orders/órdenes de producción “pending/in_progress”.
- Transacciones de inventario abiertas (importaciones, transferencias) o integraciones sincronizando.

---

## 8. Consumo en módulos
- Backend: todos los servicios sensibles (ventas, inventario, producción, POS, citas) consultan `VerticalConfigService` en lugar de condiciones hard-coded.
- Frontend: `site-settings` o `TenantFeaturesContext` propaga flags para habilitar/ocultar menús, dashboards, componentes (ej. `tableManagement`, `kitchenDisplay`, `workOrders`).

**Integraciones**:
- Antes de cambiar vertical, `VerticalCompatibilityService` debe validar integraciones activas (POS, eCommerce, delivery). Si no soportan el nuevo vertical, advertir y bloquear/habilitar solo tras confirmación.
- Reportes personalizados: registrar qué reportes usan campos específicos; avisar si quedarían incompletos tras el cambio.

---

## 9. Pruebas y monitoreo
- **Unit tests**: servicios de config, compatibilidad, migración, validación de productos.
- **E2E**: flujos de cambio de vertical con datos reales (GENERAL→RETAIL, GENERAL→RESTAURANTS, etc.).
- **Monitoreo**: alertar fallos en `vertical_change_audit`, eventos `vertical.changed`, o si se dispara rollback.
- **Documentación para soporte**: todos los clientes siguen en `GENERAL`, cambios son reversibles, se recomienda completar los campos nuevos tras cambiar de vertical.
- **Pruebas de performance**: simular organizaciones con 1000+ productos y validar que `productSchema` y variantes no degradan tiempos de respuesta ni exportaciones.

---

## 10. Orden recomendado de implementación
1. Migración + scripts de validación.
2. Registro de verticales + servicios backend.
3. API segura y auditoría.
4. Hook/servicio frontend (`useVerticalConfig`) y feature flag.
5. UI de administración + compatibilidad + confirmación.
6. Adaptación de módulos de productos/inventario/ventas para consumir `productSchema`.
7. Pruebas + despliegue (backend → frontend → habilitar flag).

Con este plan la plataforma soportará verticales específicos sin romper a los clientes existentes y permitirá evolucionar la experiencia de productos, inventario y ventas según el tipo de negocio.

---

## Checklist operativo
### Backend / DB
- [ ] Migraciones up/down probadas; backups antes de producción.
- [ ] `VERTICAL_REGISTRY` inicial (GENERAL + RETAIL) con `productSchema` real.
- [ ] Servicios `VerticalConfigService`, `VerticalCompatibilityService`, `VerticalMigrationService` con tests unitarios.
- [ ] Scripts de validación pre/post migración ejecutados en staging.
- [ ] Sistema de snapshots y auditoría validado (incluye rollback manual).

### Frontend
- [ ] `useVerticalConfig` + `TenantFeaturesContext` expone features/UI/productSchema.
- [ ] Panel de administración con selector + compatibilidad + confirmación.
- [ ] Formulario de productos actualizado (modo GENERAL + RETAIL como primera entrega).
- [ ] Asistentes de migración (división de variantes, completado de campos).
- [ ] Documentación y tutorial para super admins.

### Testing
- [ ] E2E cambio GENERAL→RETAIL→GENERAL (rollback) con datos simulados.
- [ ] Tests con inventario masivo (1000 productos).
- [ ] Validación con integraciones activas en staging.
- [ ] Beta con clientes piloto y feedback registrado.

### Documentación
- [ ] Guía de migración para clientes (paso a paso, mejores prácticas).
- [ ] Troubleshooting y runbook para soporte (errores comunes, rollback).
- [ ] Video tutorial o walkthrough de la nueva UI.
