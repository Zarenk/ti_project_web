import { PrismaClient } from '@prisma/client';

/**
 * Script para crear automáticamente entradas y detalles de entrada para productos que no tienen
 * Resuelve: "No se encontró un detalle de entrada para el producto con ID X en la tienda Y"
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
  console.log('CREACIÓN: Entradas Faltantes para Productos');
  console.log('='.repeat(80) + '\n');

  try {
    // Paso 1: Encontrar productos sin detalles de entrada
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
      console.log('✅ No hay productos sin entradas. Todo está correcto.');
      return;
    }

    console.log(`⚠️  Se encontraron ${productsWithoutEntries.length} productos sin entradas\n`);
    console.log('Iniciando creación de entradas...\n');

    // Paso 2: Agrupar productos por tienda y organización
    const groupedByStore = new Map<
      string,
      { storeId: number; storeName: string; organizationId: number | null; products: ProductWithoutEntry[] }
    >();

    for (const product of productsWithoutEntries) {
      const key = `${product.organizationId}_${product.storeId}`;
      if (!groupedByStore.has(key)) {
        groupedByStore.set(key, {
          storeId: product.storeId,
          storeName: product.storeName,
          organizationId: product.organizationId,
          products: [],
        });
      }
      groupedByStore.get(key)!.products.push(product);
    }

    let successCount = 0;
    let errorCount = 0;

    // Paso 3: Por cada grupo tienda, crear una entrada con todos sus productos
    for (const [key, group] of groupedByStore.entries()) {
      console.log(`\n📦 Procesando tienda ${group.storeId} (${group.storeName})...`);
      console.log(`   Organización: ${group.organizationId || 'Sin asignar'}`);
      console.log(`   Productos a crear: ${group.products.length}`);

      try {
        // Buscar o crear un proveedor "Sistema"
        let systemProvider = await prisma.provider.findFirst({
          where: {
            name: 'Sistema',
            organizationId: group.organizationId,
          },
        });

        if (!systemProvider) {
          systemProvider = await prisma.provider.create({
            data: {
              name: 'Sistema',
              description: 'Proveedor creado por script automático',
              email: 'sistema@local.com',
              phone: '000000000',
              adress: 'Sistema Automatizado',
              organizationId: group.organizationId,
            },
          });
          console.log(`   ✨ Proveedor "Sistema" creado (ID: ${systemProvider.id})`);
        }

        // Buscar un usuario para la entrada (preferir admin, sino cualquiera de la organización)
        let entryUser = await prisma.user.findFirst({
          where: {
            organizationId: group.organizationId,
            role: 'ADMIN',
          },
        });

        if (!entryUser) {
          entryUser = await prisma.user.findFirst({
            where: { organizationId: group.organizationId },
          });
        }

        if (!entryUser) {
          throw new Error(`No se encontró usuario para la organización ${group.organizationId}`);
        }

        // Crear la entrada
        const entry = await prisma.entry.create({
          data: {
            storeId: group.storeId,
            providerId: systemProvider.id,
            userId: entryUser.id,
            date: new Date(),
            description: `Entrada automática de productos sin entrada (${new Date().toLocaleString('es-PE')})`,
            organizationId: group.organizationId,
            paymentMethod: 'CASH',
            paymentTerm: 'CASH',
            igvRate: 0.18,
          },
        });

        console.log(`   ✅ Entrada creada (ID: ${entry.id})`);

        // Crear los detalles de entrada para cada producto (buscar inventory por producto)
        let detailsCreated = 0;
        for (const product of group.products) {
          try {
            const inventoryForProduct = await prisma.inventory.findFirst({
              where: {
                productId: product.productId,
                storeId: group.storeId,
              },
            });

            if (!inventoryForProduct) {
              console.error(`   ❌ No se encontró inventario para producto ${product.productId} en tienda ${group.storeId}`);
              errorCount++;
              continue;
            }

            const entryDetail = await prisma.entryDetail.create({
              data: {
                entryId: entry.id,
                productId: product.productId,
                quantity: 1000, // Cantidad inicial de 1000 unidades
                price: product.price,
                inventoryId: inventoryForProduct.id,
              },
            });
            detailsCreated++;
          } catch (detailError) {
            console.error(
              `   ❌ Error creando detalle para producto ${product.productId}: ${detailError instanceof Error ? detailError.message : 'Error desconocido'}`,
            );
            errorCount++;
          }
        }

        console.log(`   📝 Detalles de entrada creados: ${detailsCreated}/${group.products.length}`);
        successCount += detailsCreated;
      } catch (error) {
        console.error(`   ❌ Error procesando tienda: ${error instanceof Error ? error.message : error}`);
        errorCount += group.products.length;
      }
    }

    // Paso 4: Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log(`\n✅ Detalles de entrada creados exitosamente: ${successCount}`);
    console.log(`❌ Errores durante la creación: ${errorCount}`);
    console.log(`\n📈 Total procesado: ${successCount + errorCount} de ${productsWithoutEntries.length}`);

    if (errorCount === 0) {
      console.log('\n✨ ¡Operación completada exitosamente!');
      console.log('Ahora los productos pueden ser usados en ventas sin errores 404.');
    } else {
      console.log('\n⚠️  Algunos errores ocurrieron. Revisa los detalles arriba.');
    }
  } catch (error) {
    console.error('❌ Error crítico:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
