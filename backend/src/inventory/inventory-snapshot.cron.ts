import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventorySnapshotService } from './inventory-snapshot.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InventorySnapshotCron {
  private readonly logger = new Logger(InventorySnapshotCron.name);

  constructor(
    private readonly snapshotService: InventorySnapshotService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Ejecutar snapshots al final de cada mes
   * Se ejecuta el último día de cada mes a las 23:55
   * Cron: "55 23 28-31 * *" - revisa si es el último día del mes
   */
  @Cron('55 23 28-31 * *', {
    timeZone: 'America/Lima', // Zona horaria de Perú
  })
  async handleMonthlySnapshots() {
    this.logger.log('🔄 Iniciando verificación de snapshots mensuales...');

    // Verificar si mañana es el día 1 (es decir, hoy es el último día del mes)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (tomorrow.getDate() !== 1) {
      this.logger.log(
        '⏭️  No es el último día del mes, esperando al siguiente día...',
      );
      return;
    }

    this.logger.log(
      `✅ Es el último día del mes ${today.getMonth() + 1}/${today.getFullYear()}. Creando snapshots...`,
    );

    try {
      // Obtener todas las organizaciones
      const organizations = await this.prisma.organization.findMany({
        select: { id: true, name: true },
      });

      // Obtener todas las empresas
      const companies = await this.prisma.company.findMany({
        select: { id: true, name: true, organizationId: true },
      });

      let successCount = 0;
      let errorCount = 0;

      // Crear snapshots por organización
      for (const org of organizations) {
        try {
          const result = await this.snapshotService.createCurrentMonthSnapshot(
            org.id,
            null,
          );
          this.logger.log(
            `✅ Snapshot creado para organización "${org.name}" (ID: ${org.id}) - ` +
              `Valor: S/. ${result.totalInventoryValue.toFixed(2)}, ` +
              `Productos: ${result.totalProducts}, Unidades: ${result.totalUnits}`,
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `❌ Error al crear snapshot para organización "${org.name}" (ID: ${org.id}):`,
            error instanceof Error ? error.message : String(error),
          );
          errorCount++;
        }
      }

      // Crear snapshots por empresa
      for (const company of companies) {
        try {
          const result = await this.snapshotService.createCurrentMonthSnapshot(
            company.organizationId,
            company.id,
          );
          this.logger.log(
            `✅ Snapshot creado para empresa "${company.name}" (ID: ${company.id}) - ` +
              `Valor: S/. ${result.totalInventoryValue.toFixed(2)}, ` +
              `Productos: ${result.totalProducts}, Unidades: ${result.totalUnits}`,
          );
          successCount++;
        } catch (error) {
          this.logger.error(
            `❌ Error al crear snapshot para empresa "${company.name}" (ID: ${company.id}):`,
            error instanceof Error ? error.message : String(error),
          );
          errorCount++;
        }
      }

      this.logger.log(
        `🎉 Snapshots mensuales completados: ${successCount} exitosos, ${errorCount} errores`,
      );
    } catch (error) {
      this.logger.error('❌ Error fatal en el proceso de snapshots:', error);
    }
  }

  /**
   * Endpoint manual para testing (ejecuta todos los snapshots inmediatamente)
   * Solo para desarrollo/pruebas - comentar en producción si no se necesita
   */
  async executeSnapshotsManually() {
    this.logger.log('🔧 Ejecución manual de snapshots solicitada');
    await this.handleMonthlySnapshots();
  }
}
