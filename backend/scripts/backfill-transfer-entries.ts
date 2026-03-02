import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Script de corrección: Crea Entry + EntryDetail para transferencias históricas
 * que no generaron entrada en la tienda destino.
 *
 * Problema: transferencias anteriores al fix solo movían stock y series pero no
 * creaban EntryDetail, impidiendo vender el producto en la tienda destino.
 *
 * Uso:
 *   npx ts-node scripts/backfill-transfer-entries.ts
 *   npx ts-node scripts/backfill-transfer-entries.ts --dry-run   (solo diagnóstico)
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.argv.includes('--dry-run');

interface TransferWithoutEntry {
  id: number;
  sourceStoreId: number;
  destinationStoreId: number;
  productId: number;
  quantity: number;
  serials: string[];
  organizationId: number | null;
  createdAt: Date;
  sourceStoreName: string;
  destinationStoreName: string;
  productName: string;
}

async function main() {
  console.log('='.repeat(80));
  console.log('BACKFILL: Entradas de Traslado para Transferencias Históricas');
  if (DRY_RUN) console.log('*** MODO DRY-RUN — no se crearán registros ***');
  console.log('='.repeat(80) + '\n');

  try {
    // Paso 1: Encontrar transferencias sin Entry correspondiente
    const transfers = await prisma.$queryRaw<TransferWithoutEntry[]>`
      SELECT
        t.id,
        t."sourceStoreId",
        t."destinationStoreId",
        t."productId",
        t.quantity,
        t.serials,
        t."organizationId",
        t."createdAt",
        ss.name as "sourceStoreName",
        ds.name as "destinationStoreName",
        p.name  as "productName"
      FROM "Transfer" t
        INNER JOIN "Store" ss ON ss.id = t."sourceStoreId"
        INNER JOIN "Store" ds ON ds.id = t."destinationStoreId"
        INNER JOIN "Product" p ON p.id = t."productId"
        LEFT JOIN "Entry" e ON e."referenceId" = 'transfer-' || t.id::text
      WHERE e.id IS NULL
      ORDER BY t."organizationId", t."createdAt"
    `;

    if (transfers.length === 0) {
      console.log('✅ Todas las transferencias ya tienen entrada asociada. Nada que corregir.');
      return;
    }

    console.log(`⚠️  ${transfers.length} transferencia(s) sin entrada en tienda destino:\n`);

    for (const t of transfers) {
      console.log(
        `  Transfer #${t.id}: ${t.productName} (ID ${t.productId}) — ` +
        `${t.quantity}u — ${t.sourceStoreName} → ${t.destinationStoreName} — ` +
        `${new Date(t.createdAt).toLocaleDateString('es-PE')}`,
      );
    }

    if (DRY_RUN) {
      console.log('\n*** Dry-run completo. Ejecuta sin --dry-run para aplicar correcciones. ***');
      return;
    }

    console.log('\nCreando entradas de traslado...\n');

    // Agrupar por organización para el proveedor interno
    const byOrg = new Map<number | null, TransferWithoutEntry[]>();
    for (const t of transfers) {
      const key = t.organizationId;
      if (!byOrg.has(key)) byOrg.set(key, []);
      byOrg.get(key)!.push(t);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [orgId, orgTransfers] of byOrg.entries()) {
      // Get or create "Traslado Interno" provider
      let provider = await prisma.provider.findFirst({
        where: { organizationId: orgId, documentNumber: 'TRASLADO-INTERNO' },
      });
      if (!provider) {
        provider = await prisma.provider.create({
          data: {
            name: 'Traslado Interno',
            description: 'Proveedor del sistema para entradas por traslado entre tiendas',
            documentNumber: 'TRASLADO-INTERNO',
            document: 'SISTEMA',
            organizationId: orgId,
          },
        });
        console.log(`  ✨ Proveedor "Traslado Interno" creado para org=${orgId} (ID: ${provider.id})`);
      }

      // Find admin user for the organization
      let user = await prisma.user.findFirst({
        where: { organizationId: orgId, role: 'ADMIN' },
      });
      if (!user) {
        user = await prisma.user.findFirst({
          where: { organizationId: orgId },
        });
      }
      if (!user) {
        console.error(`  ❌ No se encontró usuario para org=${orgId}. Saltando ${orgTransfers.length} transferencias.`);
        errorCount += orgTransfers.length;
        continue;
      }

      for (const t of orgTransfers) {
        try {
          // Find destination inventory
          const destInventory = await prisma.inventory.findFirst({
            where: { productId: t.productId, storeId: t.destinationStoreId },
          });
          if (!destInventory) {
            // May have been created by other means; try first from any store
            const anyInventory = await prisma.inventory.findFirst({
              where: { productId: t.productId },
            });
            if (!anyInventory) {
              console.error(`  ❌ Transfer #${t.id}: No inventory found for product ${t.productId}`);
              errorCount++;
              continue;
            }
          }

          // Find original cost from source store
          const originalDetail = await prisma.entryDetail.findFirst({
            where: { productId: t.productId, entry: { storeId: t.sourceStoreId } },
            orderBy: { createdAt: 'desc' },
            select: { price: true, priceInSoles: true },
          });
          const costPrice = originalDetail?.price ?? 0;
          const costPriceInSoles = originalDetail?.priceInSoles ?? 0;

          const entry = await prisma.entry.create({
            data: {
              storeId: t.destinationStoreId,
              userId: user.id,
              providerId: provider.id,
              date: t.createdAt,
              description: `TRASLADO — Transferencia desde ${t.sourceStoreName} (backfill)`,
              tipoMoneda: 'PEN',
              paymentMethod: 'CASH',
              paymentTerm: 'CASH',
              providerName: 'Traslado Interno',
              totalGross: costPrice * t.quantity,
              igvRate: 0,
              organizationId: orgId,
              referenceId: `transfer-${t.id}`,
              details: {
                create: [{
                  productId: t.productId,
                  quantity: t.quantity,
                  price: costPrice,
                  priceInSoles: costPriceInSoles,
                  inventoryId: destInventory?.id ?? undefined,
                }],
              },
            },
            include: { details: true },
          });

          // Re-link series to the new EntryDetail if transfer had serials
          const newDetail = entry.details[0];
          if (newDetail && t.serials && t.serials.length > 0) {
            const updated = await prisma.entryDetailSeries.updateMany({
              where: {
                serial: { in: t.serials },
                organizationId: orgId,
                storeId: t.destinationStoreId,
              },
              data: { entryDetailId: newDetail.id },
            });
            console.log(
              `  ✅ Transfer #${t.id}: Entry ${entry.id} creada — ` +
              `${t.productName} ${t.quantity}u → ${t.destinationStoreName} ` +
              `(${updated.count} series re-enlazadas)`,
            );
          } else {
            console.log(
              `  ✅ Transfer #${t.id}: Entry ${entry.id} creada — ` +
              `${t.productName} ${t.quantity}u → ${t.destinationStoreName}`,
            );
          }

          successCount++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Transfer #${t.id}: ${msg}`);
          errorCount++;
        }
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`\n✅ Entradas creadas: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📈 Total: ${successCount + errorCount} de ${transfers.length}`);

    if (errorCount === 0) {
      console.log('\n✨ Corrección completada. Los productos trasladados ahora pueden venderse.');
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
