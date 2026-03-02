import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { HistoricalSnapshotService } from '../src/inventory/historical-snapshot.service';

/**
 * Script de producción para ejecutar el backfill de snapshots históricos
 *
 * USO:
 *   npx ts-node scripts/run-backfill-production.ts
 *
 * CONFIGURACIÓN:
 *   Editar las variables organizationId y companyId según la organización objetivo
 *   El script calcula automáticamente los últimos 12 meses desde la fecha actual
 */
async function runBackfill() {
  console.log('🚀 Iniciando backfill de snapshots históricos (PRODUCCIÓN)...\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const historicalSnapshotService = app.get(HistoricalSnapshotService);

    // Configurar rango de fechas (últimos 12 meses)
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Calcular fecha de inicio (12 meses atrás)
    let startMonth = currentMonth - 11;
    let startYear = currentYear;
    if (startMonth <= 0) {
      startMonth += 12;
      startYear -= 1;
    }

    console.log(`📅 Rango: ${startMonth}/${startYear} hasta ${currentMonth}/${currentYear}\n`);

    // CONFIGURACIÓN: Ajustar según la organización objetivo
    // Para ECOTERRA en producción:
    const organizationId = 1; // ECOTERRA
    const companyId = 1;

    console.log(`🏢 Organización: ${organizationId}, Empresa: ${companyId}\n`);
    console.log('⚠️  Este proceso puede tardar varios minutos...\n');

    const snapshots = await historicalSnapshotService.backfillSnapshots(
      startMonth,
      startYear,
      currentMonth,
      currentYear,
      organizationId,
      companyId,
    );

    // Mostrar resultados
    console.log('\n' + '='.repeat(70));
    console.log('✅ BACKFILL COMPLETADO');
    console.log('='.repeat(70));
    console.log(`Total snapshots creados: ${snapshots.length}\n`);

    if (snapshots.length > 0) {
      console.log('📊 Resumen de snapshots:');
      console.log('-'.repeat(70));
      snapshots.forEach((s) => {
        console.log(
          `${s.month.toString().padStart(2, '0')}/${s.year} - ` +
            `Valor: S/. ${s.totalInventoryValue.toFixed(2).padStart(12)} - ` +
            `Productos: ${s.totalProducts.toString().padStart(4)} - ` +
            `Unidades: ${s.totalUnits.toString().padStart(6)} - ` +
            `Tipo: ${s.snapshotType}`,
        );
      });
      console.log('-'.repeat(70));
    }

    console.log('\n✨ El dashboard ahora mostrará valores históricos correctos\n');
  } catch (error) {
    console.error('❌ Error durante el backfill:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Ejecutar
runBackfill()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
