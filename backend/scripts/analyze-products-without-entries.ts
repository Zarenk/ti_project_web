import { PrismaClient } from '@prisma/client';

/**
 * Script para analizar y crear entradas faltantes para productos que no tienen detalles de entrada
 * Esto resuelve el error: "No se encontró un detalle de entrada para el producto con ID X en la tienda Y"
 * Cuando se intenta crear una venta con productos que fueron creados por scripts sin entradas asociadas
 */

const prisma = new PrismaClient();

interface ProductWithoutEntry {
  productId: number;
  productName: string;
  storeId: number;
  storeName: string;
  price: number;
  organizationId: number | null;
}

async function main() {
  console.log('='.repeat(80));
  console.log('ANÁLISIS: Productos sin Detalles de Entrada');
  console.log('='.repeat(80));

  try {
    // Paso 1: Encontrar productos que tienen inventario en tiendas pero sin detalles de entrada
    console.log('\n📊 Analizando productos sin detalles de entrada...\n');

    const productsWithoutEntries = await prisma.$queryRaw<ProductWithoutEntry[]>`
      SELECT DISTINCT
          i."productId",
          p.name as "productName",
          i."storeId",
          s.name as "storeName",
          p.price,
          p."organizationId"
      FROM "Inventory" i
            INNER JOIN "Product" p ON i."productId" = p.id
            INNER JOIN "Store" s ON i."storeId" = s.id
            LEFT JOIN "EntryDetail" ed ON ed."productId" = i."productId" AND ed."inventoryId" = i.id
      WHERE ed.id IS NULL
            ORDER BY p."organizationId", i."storeId", p.name;
    `;

    if (productsWithoutEntries.length === 0) {
      console.log('✅ Todos los productos tienen detalles de entrada correctamente configurados.');
      console.log('No se requiere acción.');
      return;
    }

    console.log(`⚠️  Se encontraron ${productsWithoutEntries.length} combinaciones producto-tienda sin entradas:\n`);

    // Agrupar por organización y tienda para mejor visualización
    const groupedByOrg = new Map<number | null, Map<number, ProductWithoutEntry[]>>();
    for (const product of productsWithoutEntries) {
      if (!groupedByOrg.has(product.organizationId)) {
        groupedByOrg.set(product.organizationId, new Map());
      }
      const storeMap = groupedByOrg.get(product.organizationId)!;
      if (!storeMap.has(product.storeId)) {
        storeMap.set(product.storeId, []);
      }
      storeMap.get(product.storeId)!.push(product);
    }

    for (const [orgId, storeMap] of groupedByOrg.entries()) {
      console.log(`\n📦 Organización ID: ${orgId || 'Sin asignar'}`);
      for (const [storeId, products] of storeMap.entries()) {
        console.log(`   └─ Tienda ID ${storeId} (${products[0].storeName}):`);
        products.forEach((p) => {
          console.log(`      • Producto ID ${p.productId}: "${p.productName}" (Precio: ${p.price})`);
        });
      }
    }

    // Paso 2: Mostrar estructura de Entry/EntryDetail necesaria
    console.log('\n' + '='.repeat(80));
    console.log('ℹ️  Información de Entradas (Entry) Existentes');
    console.log('='.repeat(80) + '\n');

    // Buscar entradas existentes para usar como referencia
    const existingEntries = await prisma.entry.findMany({
      select: {
        id: true,
        storeId: true,
        date: true,
        details: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            price: true,
          },
        },
      },
      take: 5,
    });

    if (existingEntries.length === 0) {
      console.log(
        '⚠️  No hay entradas existentes en la base de datos. Se necesita crear una entrada primero.',
      );
    } else {
      console.log(`✅ Se encontraron ${existingEntries.length} entradas existentes (mostrando primeras 5):\n`);
      existingEntries.forEach((entry) => {
        console.log(`   Entry ID ${entry.id}:`);
        console.log(`     - Tienda: ${entry.storeId}`);
        console.log(`     - Fecha: ${entry.date}`);
        console.log(`     - Detalles: ${entry.details.length} productos`);
        entry.details.forEach((detail) => {
          console.log(`       • Producto ${detail.productId}: ${detail.quantity} unidades @ ${detail.price} c/u`);
        });
        console.log('');
      });
    }

    // Paso 3: Generar estadísticas
    console.log('='.repeat(80));
    console.log('📈 Estadísticas');
    console.log('='.repeat(80) + '\n');

    const orgCount = groupedByOrg.size;
    const totalStores = Array.from(groupedByOrg.values()).reduce((sum, storeMap) => sum + storeMap.size, 0);
    const totalProducts = productsWithoutEntries.length;

    console.log(`Total de organizaciones afectadas: ${orgCount}`);
    console.log(`Total de tiendas con productos sin entrada: ${totalStores}`);
    console.log(`Total de productos-tienda afectados: ${totalProducts}`);

    // Agrupar por precio para detectar patrones
    const priceGroups = new Map<number, number>();
    for (const product of productsWithoutEntries) {
      const count = priceGroups.get(product.price) || 0;
      priceGroups.set(product.price, count + 1);
    }

    console.log(`\nProductos agrupados por precio:`);
    for (const [price, count] of Array.from(priceGroups.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`  • Precio ${price}: ${count} productos`);
    }

    // Paso 4: Mostrar comando SQL para más análisis
    console.log('\n' + '='.repeat(80));
    console.log('🔧 Próximos Pasos');
    console.log('='.repeat(80) + '\n');

    console.log('Para resolver este problema, hay dos opciones:\n');
    console.log('OPCIÓN 1: Crear una entrada genérica para cada producto sin entrada');
    console.log('  - Se crearán entradas con fecha actual desde un proveedor "Sistema"');
    console.log('  - Se crearán detalles de entrada con cantidad inicial de 1000 unidades');
    console.log('  - Esto permitirá que los productos se usen en ventas\n');

    console.log('OPCIÓN 2: Asignar productos a entradas existentes');
    console.log('  - Se buscarán entradas existentes por tienda y organización');
    console.log('  - Se asignarán los productos a esas entradas como detalles\n');

    console.log('Recomendación: Usar OPCIÓN 1 para resolver rápidamente');
    console.log('Ejecutar: npm run script -- create-missing-entries\n');
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
