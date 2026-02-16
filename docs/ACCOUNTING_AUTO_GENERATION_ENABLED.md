# Habilitación de Generación Automática de Journal Entries

**Fecha:** 2026-02-15
**Estado:** ✅ CONFIGURADO
**Cambio:** Habilitadas variables de entorno para generación automática de asientos contables

---

## Problema Original

La sección de journals (`/dashboard/accounting/journals`) no mostraba asientos contables porque:

1. **Ventas:** Hooks habilitados por defecto ✅
2. **Compras/Entradas:** Hooks DESHABILITADOS por defecto ❌

Resultado: Solo se creaban journal entries para ventas, no para compras.

---

## Solución Aplicada

### Variables Agregadas a `backend/.env`

```bash
# Configuración de Contabilidad Automática
ACCOUNTING_HOOK_ENABLED=true              # Habilita hooks de contabilidad (default: true)
ACCOUNTING_HOOK_PURCHASE_ENABLED=true     # Habilita journal entries para compras (default: false)
ACCOUNTING_URL=http://localhost:4000/api  # URL del servicio contable
```

---

## Cómo Funciona la Generación Automática

### Para Ventas (Sales)

**Flujo:**
```
1. Usuario completa una venta en /dashboard/sales/new
   ↓
2. SalesService.executeSale() procesa la venta
   ↓
3. accountingHook.postSale(saleId) dispara hook
   ↓
4. POST http://localhost:4000/api/accounting/hooks/sale-posted
   ↓
5. SalePostedController recibe evento
   ↓
6. Crea JournalEntry con líneas:
   - Debit: 1011 Caja/Banco = Total venta
   - Credit: 7011 Ingresos = Subtotal sin IGV
   - Credit: 4011 IGV = IGV 18%
   - Debit: 6911 COGS = Costo de ventas
   ↓
7. Estado: POSTED (visible inmediatamente)
```

**Archivo:** `backend/src/accounting/hooks/sale-posted.controller.ts`

---

### Para Compras/Entradas (Purchases)

**Flujo Dual:** El sistema usa DOS mecanismos en paralelo:

#### Mecanismo 1: Creación Local (Siempre activo)
```
1. Usuario crea entrada en /dashboard/entries/new
   ↓
2. EntriesService.createEntry() procesa entrada
   ↓
3. accountingService.createJournalForInventoryEntry(entryId)
   ↓
4. Crea JournalEntry directamente en BD
   ↓
5. Líneas creadas:
   CON FACTURA:
   - Debit: 2011 Inventario = Neto sin IGV
   - Debit: 4011 IGV = IGV 18%
   - Credit: 4211/4611 Pasivo = Total
   → Estado: POSTED

   SIN FACTURA:
   - Debit: 2011 Inventario = Total (sin reconocer IGV)
   - Credit: 4211/4611 Pasivo = Total
   → Estado: DRAFT
```

**Archivo:** `backend/src/accounting/accounting.service.ts` (línea 445-731)

#### Mecanismo 2: Hook HTTP (AHORA HABILITADO)
```
1. Después de crear la entrada
   ↓
2. accountingHook.postPurchase(entryId)
   ↓
3. POST http://localhost:4000/api/accounting/hooks/purchase-posted
   ↓
4. PurchasePostedController recibe evento
   ↓
5. Crea SEGUNDO JournalEntry (adicional al local)
   ↓
6. Estado: POSTED
```

**Archivo:** `backend/src/accounting/hooks/purchase-posted.controller.ts`

**IMPORTANTE:** Con `ACCOUNTING_HOOK_PURCHASE_ENABLED=true`, cada compra genera:
- 1 journal entry local (Mecanismo 1)
- 1 journal entry por hook (Mecanismo 2)
- **Total: 2 journal entries por compra**

Si esto causa duplicados, desactivar con `ACCOUNTING_HOOK_PURCHASE_ENABLED=false`

---

## Verificaciones Requeridas

### 1. Reiniciar Backend

**Importante:** Los cambios en `.env` requieren reiniciar el servidor.

```bash
cd backend

# Opción 1: Si está corriendo con npm
# Ctrl+C para detener, luego:
npm run start:dev

# Opción 2: Si está corriendo con PM2
pm2 restart backend

# Opción 3: Si está corriendo con nodemon
# Se reinicia automáticamente
```

### 2. Verificar Logs al Iniciar

Buscar en logs del backend:

```
✅ [AccountingHookService] ACCOUNTING_HOOK_ENABLED: true
✅ [AccountingHookService] ACCOUNTING_HOOK_PURCHASE_ENABLED: true
✅ [AccountingHookService] ACCOUNTING_URL: http://localhost:4000/api
```

### 3. Crear Venta de Prueba

1. Ve a `/dashboard/sales/new`
2. Crea una venta completa
3. Observa logs del backend:
   ```
   ✅ [SalePostedController] Received sale-posted event for sale ${saleId}
   ✅ [SalePostedController] Entry ${entryId} created for sale ${saleId}
   ```
4. Ve a `/dashboard/accounting/journals`
5. **Deberías ver el journal entry de la venta**

### 4. Crear Entrada/Compra de Prueba

1. Ve a `/dashboard/entries/new`
2. Crea una entrada completa (con o sin factura)
3. Observa logs del backend:
   ```
   ✅ [EntriesService] Created local journal entry ${entryId} for entry ${entryId}
   ✅ [PurchasePostedController] Received purchase-posted event for entry ${entryId}
   ✅ [PurchasePostedController] Entry created for purchase ${entryId}
   ```
4. Ve a `/dashboard/accounting/journals`
5. **Deberías ver 1-2 journal entries de la compra**

---

## Logs Esperados (Éxito)

### Al Crear Venta:
```
[Nest] INFO [SalesService] Executing sale 123
[Nest] INFO [AccountingHookService] Posting sale 123 to accounting
[Nest] INFO [SalePostedController] Received sale-posted event for sale 123
[Nest] INFO [SalePostedController] Sale 123 has invoice F001-00000123
[Nest] INFO [JournalEntryService] Creating journal entry for sale 123
[Nest] INFO [SalePostedController] Entry 456 created for sale 123 with status POSTED
```

### Al Crear Compra:
```
[Nest] INFO [EntriesService] Creating entry for purchase
[Nest] INFO [AccountingService] Creating journal for inventory entry 789
[Nest] INFO [AccountingService] Created local journal entry 1011 for entry 789
[Nest] INFO [AccountingHookService] Posting purchase 789 to accounting
[Nest] INFO [PurchasePostedController] Received purchase-posted event for entry 789
[Nest] INFO [PurchasePostedController] Entry 1012 created for purchase 789
```

---

## Logs de Error (Si Algo Falla)

### Error: Módulo Contabilidad Deshabilitado
```
[Nest] ERROR [VerticalCompatibilityGuard] El modulo de contabilidad no esta habilitado para esta empresa.
```
**Solución:** Verificar en BD que `company.features.accounting = true`

### Error: Asiento Desbalanceado
```
[Nest] ERROR [JournalEntryService] Unbalanced entry: debit=1500.00, credit=1450.00
```
**Solución:** Revisar lógica de cálculo de líneas en accounting services

### Error: Hook Deshabilitado
```
[Nest] LOG [AccountingHookService] purchase hook disabled; skipping postPurchase(789)
```
**Solución:** Verificar `ACCOUNTING_HOOK_PURCHASE_ENABLED=true` en .env

### Error: Duplicado
```
[Nest] WARN [SalePostedController] Entry already exists for invoice F001-123, skipping
```
**Normal:** El sistema previene duplicados por serie/correlativo

---

## Configuraciones Avanzadas

### Deshabilitar Hooks Completamente

```bash
ACCOUNTING_HOOK_ENABLED=false
```
**Efecto:** Ninguna venta/compra creará journal entries automáticamente.

### Deshabilitar Solo Compras

```bash
ACCOUNTING_HOOK_ENABLED=true
ACCOUNTING_HOOK_PURCHASE_ENABLED=false
```
**Efecto:**
- Ventas SÍ crean journal entries automáticamente
- Compras solo crean journal entry local (Mecanismo 1)
- **Recomendado** para evitar duplicados

### Cambiar URL del Servicio Contable

```bash
ACCOUNTING_URL=http://accounting-service:4000/api
```
**Efecto:** Los hooks se enviarán a un servidor contable separado.

---

## Checklist de Verificación Post-Configuración

- [ ] Variables agregadas a `backend/.env`
- [ ] Backend reiniciado
- [ ] Logs muestran hooks habilitados
- [ ] Crear venta de prueba
- [ ] Verificar journal entry creado para venta
- [ ] Ir a `/dashboard/accounting/journals`
- [ ] Confirmar que se muestra el asiento de la venta
- [ ] Crear compra de prueba
- [ ] Verificar journal entries creados para compra
- [ ] Confirmar que NO hay duplicados problemáticos

---

## Próximos Pasos

Si los journal entries se crean correctamente pero NO se muestran en la UI:

1. **Verificar filtros frontend/backend**
   - Problema de mapeo `source`/`sources`
   - Problema de mapeo `status`/`statuses`
   - Problema de mapeo `accountCode`/`accountIds`

2. **Verificar mapeo de campos**
   - `debe`/`haber` vs `debit`/`credit`
   - Estructura de líneas en respuesta

3. **Verificar consulta BD**
   - Usar Prisma Studio para ver journal entries directamente
   - Verificar organizationId y companyId correctos

---

## Archivos Clave Modificados

1. ✅ `backend/.env` - Agregadas 3 variables de configuración

## Archivos de Referencia (NO Modificados)

- `backend/src/accounting/hooks/accounting-hook.service.ts` - Orquestador de hooks
- `backend/src/accounting/hooks/sale-posted.controller.ts` - Hook de ventas
- `backend/src/accounting/hooks/purchase-posted.controller.ts` - Hook de compras
- `backend/src/sales/sales.service.ts` - Dispara hook de venta
- `backend/src/entries/entries.service.ts` - Dispara hook de compra
- `backend/src/accounting/accounting.service.ts` - Creación local de journal entries

---

**Última actualización:** 2026-02-15 23:45
**Status:** ✅ CONFIGURADO - Pendiente de reiniciar backend y probar
