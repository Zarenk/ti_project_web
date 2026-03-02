# Backfill de Snapshots Históricos - Guía de Producción

## ¿Qué hace este script?

El script `run-backfill-production.ts` calcula y guarda snapshots históricos del inventario para los últimos 12 meses. Esto permite que el dashboard de ventas muestre valores históricos correctos del inventario en lugar de usar siempre el valor actual.

## Algoritmo

El script reconstruye el inventario histórico trabajando **hacia atrás** desde el stock actual:

```
Stock en Mes X = Stock Actual - (Entradas después de X) + (Salidas después de X)
```

Para cada producto en cada tienda, el script:
1. Obtiene el stock actual
2. Calcula las entradas DESPUÉS del mes objetivo
3. Calcula las ventas DESPUÉS del mes objetivo
4. Calcula el stock histórico usando la fórmula anterior
5. Obtiene el último precio de compra vigente en ese mes
6. Calcula el valor total (stock × precio)

## ¿Cuándo ejecutar?

### Primera vez en producción
Ejecutar una sola vez después del deployment para crear los snapshots de los últimos 12 meses.

### Re-ejecución
Normalmente NO es necesario re-ejecutar porque:
- El cron automático (`InventorySnapshotCron`) captura snapshots REALES cada mes
- Los snapshots CALCULATED son solo para backfill histórico

Solo re-ejecutar si:
- Los datos históricos se corrompieron
- Se requiere recalcular un período específico
- Se agregó una nueva organización que necesita datos históricos

## Uso en Producción

### Paso 1: Configurar el script

Editar `run-backfill-production.ts` y configurar:

```typescript
// CONFIGURACIÓN: Ajustar según la organización objetivo
const organizationId = 1; // ID de la organización
const companyId = 1;      // ID de la empresa
```

### Paso 2: Ejecutar en el servidor

**Opción A: Railway CLI (Recomendada)**
```bash
# Desde tu máquina local conectada a Railway
railway run npx ts-node scripts/run-backfill-production.ts
```

**Opción B: SSH al servidor**
```bash
# Conectarse al servidor
ssh usuario@servidor

# Navegar al directorio del backend
cd /path/to/backend

# Ejecutar el script
npx ts-node scripts/run-backfill-production.ts
```

**Opción C: Endpoint autenticado (backend en ejecución)**
```bash
# Ejecutar backfill via API
curl -X POST https://tu-dominio.com/api/inventory/snapshots/backfill \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startMonth": 3,
    "startYear": 2025,
    "endMonth": 2,
    "endYear": 2026
  }'
```

### Paso 3: Verificar resultados

El script mostrará:
```
📊 Resumen de snapshots:
----------------------------------------------------------------------
03/2025 - Valor: S/.  31,110.34 - Productos:  150 - Unidades:   5234 - Tipo: CALCULATED
04/2025 - Valor: S/.  32,450.12 - Productos:  152 - Unidades:   5412 - Tipo: CALCULATED
...
02/2026 - Valor: S/.  41,627.46 - Productos:  165 - Unidades:   6123 - Tipo: CALCULATED
----------------------------------------------------------------------
✅ Backfill completado: 12 snapshots creados
```

Verificar en la base de datos:
```sql
SELECT
  month,
  year,
  "totalInventoryValue",
  "totalProducts",
  "snapshotType"
FROM "InventorySnapshot"
WHERE "organizationId" = 1
ORDER BY year, month;
```

## Tiempo de Ejecución

El script puede tardar varios minutos dependiendo de:
- Cantidad de productos (~165 productos = ~2-5 minutos)
- Cantidad de transacciones históricas
- Velocidad del servidor de base de datos

**Estimado:** 2-10 minutos para 12 meses de datos

## Seguridad

⚠️ **Importante:**
- El script requiere acceso directo a la base de datos
- NO exponer como endpoint público sin autenticación
- El endpoint `/api/inventory/snapshots/backfill` está protegido con JWT
- Solo usuarios con permisos de administrador deben ejecutar

## Monitoreo

Durante la ejecución, el script muestra logs:
```
🚀 Iniciando backfill de snapshots históricos (PRODUCCIÓN)...
📅 Rango: 3/2025 hasta 2/2026
🏢 Organización: 1, Empresa: 1
⚠️  Este proceso puede tardar varios minutos...

📊 Calculando snapshot histórico para 3/2025 - Org: 1, Company: 1
📅 Rango del mes: 2025-03-01T05:00:00.000Z a 2025-03-31T04:59:59.999Z
📦 Encontrados 165 productos en inventario
✅ Calculados 523 registros de stock histórico
💰 Totales - Valor: S/. 31110.34, Productos: 150, Unidades: 5234
🔄 Creando snapshot calculado para 3/2025...
✅ Snapshot calculado guardado - ID: 45, Valor: S/. 31110.34

[... repite para cada mes ...]
```

## Troubleshooting

### Error: "Property 'storeOnInventory' does not exist"
- **Causa:** Prisma types desactualizados
- **Solución:** `npx prisma generate`

### Error: "0 snapshots creados"
- **Causa:** No hay productos en inventario o filtros incorrectos
- **Solución:** Verificar que existan productos para la organizationId/companyId

### Error: "Port 4000 already in use"
- **Causa:** Backend ya está corriendo
- **Solución:** El script crea su propio contexto de app, no requiere backend corriendo. Detener el backend primero.

### Valores muy bajos o cero
- **Causa:** Productos sin entradas históricas antes del mes objetivo
- **Solución:** Normal si los productos se agregaron después. Solo se calculan productos con stock histórico positivo.

## Mantenimiento Futuro

### Cron Automático
Después del backfill inicial, el sistema captura snapshots REALES automáticamente:
- Servicio: `InventorySnapshotCron`
- Frecuencia: Primer día de cada mes a las 00:00
- Tipo: `ACTUAL` (no `CALCULATED`)

### No Requiere Re-Ejecución
Los snapshots futuros se capturan automáticamente. Este script es **solo para backfill histórico**.

## Arquitectura

```
run-backfill-production.ts (script CLI)
    ↓
HistoricalSnapshotService
    ↓ backfillSnapshots()
    ↓
    ├─ calculateHistoricalSnapshot() (por cada mes)
    │   ├─ Obtiene inventario actual
    │   ├─ Calcula entradas después del mes
    │   ├─ Calcula ventas después del mes
    │   ├─ Calcula stock histórico (actual - entradas + ventas)
    │   └─ Obtiene último precio de compra vigente
    │
    └─ createCalculatedSnapshot()
        └─ Guarda en InventorySnapshot (tipo: CALCULATED)
```

## Contacto

Para soporte técnico o preguntas sobre el sistema de snapshots históricos, contactar al equipo de desarrollo.

---

**Última actualización:** 2026-02-20
