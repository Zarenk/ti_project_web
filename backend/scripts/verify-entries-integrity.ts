import { PrismaClient } from '@prisma/client';

/**
 * Script para verificar que todos los productos en inventario tienen detalles de entrada
 */

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN: Integridad de Entradas de Productos');
  console.log('='.repeat(80) + '\n');

  try {
    // Paso 1: Contar productos totales en inventario
    const totalInventoryItems = await prisma.inventory.count();
    console.log(`📊 Total de productos en inventario: ${totalInventoryItems}\n`);

    // Paso 2: Contar productos con detalles de entrada
    const productsWithEntries = await prisma.$queryRaw<[{ count: BigInt }]>`
      SELECT COUNT(DISTINCT i."productId")
      FROM "Inventory" i
      INNER JOIN "EntryDetail" ed ON ed."productId" = i."productId" AND ed."inventoryId" = i.id
    `;
    const withEntriesCount = Number(productsWithEntries[0].count);

    // Paso 3: Contar productos SIN detalles de entrada
    const productsWithoutEntries = await prisma.$queryRaw<[{ count: BigInt }]>`
      SELECT COUNT(DISTINCT i."productId")
      FROM "Inventory" i
      LEFT JOIN "EntryDetail" ed ON ed."productId" = i."productId" AND ed."inventoryId" = i.id
      WHERE ed.id IS NULL
    `;
    const withoutEntriesCount = Number(productsWithoutEntries[0].count);

    console.log(`✅ Productos CON detalles de entrada: ${withEntriesCount}`);
    console.log(`❌ Productos SIN detalles de entrada: ${withoutEntriesCount}\n`);

    // Paso 4: Mostrar detalles de productos sin entrada si los hay
    if (withoutEntriesCount > 0) {
      console.log('⚠️  Productos que aún requieren detalles de entrada:\n');

      const remainingProducts = await prisma.$queryRaw<
        Array<{
          productId: number;
          productName: string;
          storeId: number;
          storeName: string;
          organizationId: number | null;
        }>
      >`
        SELECT DISTINCT
            i."productId",
            p.name as "productName",
            i."storeId",
            s.name as "storeName",
            p."organizationId"
        FROM "Inventory" i
          INNER JOIN "Product" p ON i."productId" = p.id
          INNER JOIN "Store" s ON i."storeId" = s.id
          LEFT JOIN "EntryDetail" ed ON ed."productId" = i."productId" AND ed."inventoryId" = i.id
        WHERE ed.id IS NULL
          ORDER BY p."organizationId", i."storeId", p.name;
      `;

      remainingProducts.forEach((p) => {
        console.log(`  • Producto ${p.productId}: "${p.productName}"`);
        console.log(`    └─ Tienda: ${p.storeId} (${p.storeName})`);
        console.log(`    └─ Organización: ${p.organizationId || 'Sin asignar'}\n`);
      });

      console.log('💡 Ejecuta nuevamente: npm run script -- create-missing-entries\n');
    } else {
      console.log('🎉 ¡Excelente! Todos los productos en inventario tienen detalles de entrada.');
      console.log('Las ventas funcionarán correctamente sin errores 404.\n');
    }

    // Paso 5: Estadísticas de entradas
    console.log('='.repeat(80));
    console.log('📈 Estadísticas de Entradas');
    console.log('='.repeat(80) + '\n');

    const entryStats = await prisma.entry.aggregate({
      _count: true,
      _max: { id: true },
    });

    console.log(`Total de entradas creadas: ${entryStats._count}`);

    // Top 5 entradas por cantidad de detalles
    const topEntries = await prisma.entry.findMany({
      select: {
        id: true,
        date: true,
        store: {
          select: { name: true },
        },
        details: {
          select: { productId: true },
        },
      },
      orderBy: {
        details: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    if (topEntries.length > 0) {
      console.log('\nTop 5 entradas por cantidad de productos:\n');
      topEntries.forEach((entry, index) => {
        console.log(`${index + 1}. Entrada ID ${entry.id}:`);
        console.log(`   - Tienda: ${entry.store.name}`);
        console.log(`   - Fecha: ${entry.date.toLocaleString('es-PE')}`);
        console.log(`   - Productos: ${entry.details.length}\n`);
      });
    }

    // Paso 6: Validación de referencia de inventario
    console.log('='.repeat(80));
    console.log('🔍 Validación de Referencias de Inventario');
    console.log('='.repeat(80) + '\n');

    const entryDetailsWithoutInventory = await prisma.entryDetail.findMany({
      where: { inventoryId: null },
      select: {
        id: true,
        product: { select: { name: true } },
        entry: { select: { id: true, store: { select: { name: true } } } },
      },
      take: 10,
    });

    if (entryDetailsWithoutInventory.length > 0) {
      console.log(`⚠️  Se encontraron ${entryDetailsWithoutInventory.length} detalles de entrada sin inventoryId asignado`);
      console.log('(mostrando primeros 10):\n');
      entryDetailsWithoutInventory.forEach((detail) => {
        console.log(`  • Detalle ${detail.id}: Producto "${detail.product.name}"`);
        console.log(`    └─ Entrada: ${detail.entry.id} (Tienda: ${detail.entry.store.name})\n`);
      });
    } else {
      console.log('✅ Todos los detalles de entrada tienen inventoryId correctamente asignado.\n');
    }
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
