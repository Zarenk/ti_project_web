# Resolución del Error 404: "No se encontró un detalle de entrada"

## 📋 Problema

Cuando intenta crear una venta (sale) con productos que fueron creados por scripts de demostración, recibe el siguiente error:

```
POST http://192.168.1.41:4000/api/sales 404 (Not Found)
Error: {"message":"No se encontró un detalle de entrada para el producto con ID 801 en la tienda 11.","error":"Not Found","statusCode":404}
```

### 🔍 Causa Raíz

El error ocurre en [sales-helper.ts](../src/utils/sales-helper.ts#L285):

```typescript
const entryDetail = await prismaTx.entryDetail.findFirst({
  where: {
    productId: detail.productId,
    entry: { storeId: storeInventory.storeId },
  },
});

if (!entryDetail) {
  throw new NotFoundException(
    `No se encontró un detalle de entrada para el producto con ID ${detail.productId} en la tienda ${storeInventory.storeId}.`
  );
}
```

**El sistema necesita que cada producto tenga:**
1. Un registro en la tabla `Inventory` (producto en tienda)
2. Un registro en la tabla `Entry` (entrada/recepción de inventario)
3. Un registro en la tabla `EntryDetail` (detalle de qué producto llegó en qué entrada)

Los scripts de demostración crean productos e inventarios, pero **NO crean las entradas (Entry) ni sus detalles (EntryDetail)** que registran cómo llegó ese producto a la tienda.

## 🗄️ Estructura de Datos Requerida

```
Entryhttps://www.youtube.com/
├── id: Int
├── storeId: Int (tienda a la que llega el producto)
├── userId: Int (usuario que registra la entrada)
├── providerId: Int (proveedor que envía)
├── date: DateTime
└── details: EntryDetail[]
    ├── id: Int
    ├── entryId: Int (referencia a Entry)
    ├── productId: Int (producto que entra)
    ├── quantity: Int (cantidad recibida)
    ├── price: Float (precio unitario)
    └── inventoryId: Int? (referencia a registro de Inventory)
```

## 🔧 Solución

Se proporcionan **3 scripts** para resolver este problema:

### 1. **analyze-products-without-entries.ts** (Diagnóstico)

Analiza la base de datos y identifica:
- Productos sin detalles de entrada
- Tiendas afectadas
- Patrones de precios
- Información sobre entradas existentes

**Uso:**
```bash
npx ts-node scripts/analyze-products-without-entries.ts
```

**Salida esperada:**
```
⚠️  Se encontraron 15 combinaciones producto-tienda sin entradas:

📦 Organización ID: 1
   └─ Tienda ID 11 (Tienda Principal):
      • Producto ID 801: "Laptop Dell" (Precio: 3500)
      • Producto ID 802: "Monitor LG" (Precio: 450)
      ...
```

### 2. **create-missing-entries.ts** (Solución)

Crea automáticamente:
- Una entrada por tienda/organización
- Un proveedor "Sistema" para la entrada
- Detalles de entrada para cada producto (1000 unidades)

**Uso:**
```bash
npx ts-node scripts/create-missing-entries.ts
```

**Qué hace:**
1. Identifica productos sin entradas
2. Agrupa por tienda y organización
3. Crea una `Entry` por grupo
4. Crea un `EntryDetail` por producto
5. Asigna cantidad inicial de 1000 unidades

**Salida esperada:**
```
📦 Procesando tienda 11 (Tienda Principal)...
   Organización: 1
   Productos a crear: 15
   ✨ Proveedor "Sistema" creado (ID: 5)
   ✅ Entrada creada (ID: 42)
   📝 Detalles de entrada creados: 15/15

✅ Detalles de entrada creados exitosamente: 15
```

### 3. **verify-entries-integrity.ts** (Verificación)

Verifica que:
- Todos los productos en inventario tengan detalles de entrada
- Las referencias están correctamente configuradas
- No hay productos orfandos

**Uso:**
```bash
npx ts-node scripts/verify-entries-integrity.ts
```

**Salida esperada después de la solución:**
```
✅ Productos CON detalles de entrada: 45
❌ Productos SIN detalles de entrada: 0

🎉 ¡Excelente! Todos los productos en inventario tienen detalles de entrada.
Las ventas funcionarán correctamente sin errores 404.
```

## 📋 Pasos para Resolver

### Paso 1: Diagnosticar el problema
```bash
cd backend
npx ts-node scripts/analyze-products-without-entries.ts
```

### Paso 2: Crear las entradas faltantes
```bash
npx ts-node scripts/create-missing-entries.ts
```

### Paso 3: Verificar que todo está correcto
```bash
npx ts-node scripts/verify-entries-integrity.ts
```

### Paso 4: Probar creación de ventas
```
Frontend: Intentar crear una venta con uno de los productos
Esperado: Venta creada exitosamente sin error 404
```

## 💡 Alternativas Manuales

Si prefieres hacerlo manualmente a través de SQL:

### Listar productos sin entradas:
```sql
SELECT DISTINCT
  i.productId,
  p.name as productName,
  i.storeId,
  s.name as storeName
FROM "Inventory" i
INNER JOIN "Product" p ON i.productId = p.id
INNER JOIN "Store" s ON i.storeId = s.id
LEFT JOIN "EntryDetail" ed ON ed.productId = i.productId AND ed.inventoryId = i.id
WHERE ed.id IS NULL
ORDER BY i.storeId, p.name;
```

### Crear entrada manualmente:
```sql
-- 1. Crear proveedor (si no existe)
INSERT INTO "Provider" (name, "contactPerson", email, phone, address, "organizationId")
VALUES ('Sistema', 'Automatizado', 'sistema@local.com', '000000000', 'Sistema', 1)
ON CONFLICT DO NOTHING;

-- 2. Crear entrada
INSERT INTO "Entry" (
  "storeId", "providerId", "userId", date, description, "organizationId",
  "paymentMethod", "paymentTerm", "igvRate"
)
VALUES (
  11,  -- storeId
  (SELECT id FROM "Provider" WHERE name = 'Sistema' AND "organizationId" = 1),
  (SELECT id FROM "User" WHERE "organizationId" = 1 LIMIT 1),  -- userId
  NOW(),
  'Entrada automática de productos sin entrada',
  1,  -- organizationId
  'CASH',
  'CASH',
  0.18
)
RETURNING id;  -- Guarda el ID de la entrada (ej: 42)

-- 3. Crear detalles de entrada (repetir por cada producto)
INSERT INTO "EntryDetail" (
  "entryId", "productId", quantity, price, "inventoryId"
)
VALUES (
  42,  -- entryId from previous query
  801, -- productId
  1000, -- cantidad inicial
  3500, -- precio (obtener de Product)
  (SELECT id FROM "Inventory" WHERE "productId" = 801 AND "storeId" = 11)
);
```

## 🚨 Consideraciones Importantes

1. **Cantidad Inicial**: Los scripts asignan 1000 unidades por defecto. Ajusta esto si necesitas otro valor.

2. **Fecha de Entrada**: Se usa la fecha actual (`NOW()`). Puedes cambiarla en los scripts si necesitas una fecha específica.

3. **Precio**: Se toma el precio de la tabla `Product`. Asegúrate de que sea correcto antes de ejecutar.

4. **Proveedor "Sistema"**: Se crea automáticamente si no existe. Es solo para referencia.

5. **Impacto en Reportes**: Las entradas creadas aparecerán en:
   - Reportes de inventario
   - Historial de entrada de productos
   - Análisis de costos
   
   Son datos válidos, así que no afectarán la integridad de reportes posteriores.

## 📊 Validación Post-Solución

Para confirmar que el error se resolvió:

1. Ejecuta `verify-entries-integrity.ts`
2. Debería mostrar: "Productos SIN detalles de entrada: 0"
3. Intenta crear una venta con los productos
4. Revisa que en Network no haya errores 404 en `/api/sales`

## 🔄 Prevención Futura

Para evitar este problema en nuevos scripts:

**Cuando crees productos, también crea una entrada:**

```typescript
// Al crear productos de prueba, agrega esto:
const entry = await prisma.entry.create({
  data: {
    storeId: storeId,
    providerId: systemProviderId,
    userId: adminUserId,
    date: new Date(),
    description: 'Entrada inicial de productos de demostración',
    organizationId: organizationId,
  },
});

// Para cada producto, crea el detalle:
await prisma.entryDetail.create({
  data: {
    entryId: entry.id,
    productId: product.id,
    quantity: 1000,
    price: product.price,
    inventoryId: inventory.id,
  },
});
```

## 📞 Soporte

Si el script genera errores:

1. **"No se encontró usuario para la organización"**: Asegúrate de que existen usuarios en la organización
2. **"No se encontró inventario"**: Verifica que los productos tengan registros en `Inventory`
3. **"Producto duplicado en Entry"**: El producto ya existe en esa entrada

Ejecuta `analyze-products-without-entries.ts` para diagnósticos detallados.
