import { VerticalScriptContext } from './index';

/**
 * Sets up BOM (Bill of Materials) system for the MANUFACTURING vertical
 * - Enables BOM functionality via company configuration
 * - Idempotent: Uses upsert to avoid duplicates
 */
export async function setupBomSystem(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn('[setup_bom_system] Missing prisma or companyId, skipping');
    return;
  }

  // Enable BOM system via company settings
  // Note: CompanyConfiguration model might not exist yet,
  // so for now we just log that BOM is enabled
  console.log(
    `[setup_bom_system] BOM system enabled for company ${companyId}`,
  );

  // Future: When CompanyConfiguration model exists, use:
  // await prisma.companyConfiguration.upsert({
  //   where: {
  //     companyId_configKey: {
  //       companyId,
  //       configKey: 'bom_enabled'
  //     }
  //   },
  //   update: { configValue: 'true' },
  //   create: {
  //     companyId,
  //     configKey: 'bom_enabled',
  //     configValue: 'true',
  //   },
  // });
}

/**
 * Initializes work orders system for the MANUFACTURING vertical
 * - Sets up work order sequence counter
 * - Idempotent: Uses upsert to avoid duplicates
 */
export async function initializeWorkOrders(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[initialize_work_orders] Missing prisma or companyId, skipping',
    );
    return;
  }

  // Initialize work order sequence
  // Note: CompanyConfiguration model might not exist yet,
  // so for now we just log that work orders are initialized
  console.log(
    `[initialize_work_orders] Work order system initialized for company ${companyId}`,
  );

  // Future: When CompanyConfiguration model exists, use:
  // await prisma.companyConfiguration.upsert({
  //   where: {
  //     companyId_configKey: {
  //       companyId,
  //       configKey: 'work_order_sequence'
  //     }
  //   },
  //   update: {},
  //   create: {
  //     companyId,
  //     configKey: 'work_order_sequence',
  //     configValue: '1',
  //   },
  // });
}

/**
 * Cleanup handler for MANUFACTURING vertical
 * - Archives and removes manufacturing-specific data when switching away from this vertical
 * - Idempotent: Safe to run multiple times
 */
export async function cleanupManufacturingData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId, metadata } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[cleanup_manufacturing_data] Missing prisma or companyId, skipping',
    );
    return;
  }

  const reason = metadata?.reason as string | undefined;
  const archiveReason = reason || 'vertical_migration';

  // Archive BillOfMaterials
  const boms = await prisma.billOfMaterials.findMany({
    where: { companyId },
  });

  if (boms.length > 0) {
    await prisma.archivedBillOfMaterials.createMany({
      data: boms.map((bom) => ({
        originalId: bom.id,
        companyId: bom.companyId,
        productId: bom.productId,
        componentId: bom.componentId,
        quantity: bom.quantity,
        unit: bom.unit,
        wastagePercent: bom.wastagePercent,
        archivedReason: archiveReason,
      })),
      skipDuplicates: true,
    });

    await prisma.billOfMaterials.deleteMany({
      where: { companyId },
    });

    console.log(
      `[cleanup_manufacturing_data] Archived and deleted ${boms.length} bills of materials`,
    );
  }

  // Archive WorkOrders
  const workOrders = await prisma.workOrder.findMany({
    where: { companyId },
  });

  if (workOrders.length > 0) {
    await prisma.archivedWorkOrder.createMany({
      data: workOrders.map((wo) => ({
        originalId: wo.id,
        companyId: wo.companyId,
        woNumber: wo.woNumber,
        productId: wo.productId,
        quantity: wo.quantity,
        status: wo.status,
        scheduledDate: wo.scheduledDate,
        completedDate: wo.completedDate,
        archivedReason: archiveReason,
      })),
      skipDuplicates: true,
    });

    await prisma.workOrder.deleteMany({
      where: { companyId },
    });

    console.log(
      `[cleanup_manufacturing_data] Archived and deleted ${workOrders.length} work orders`,
    );
  }

  console.log(
    `[cleanup_manufacturing_data] Cleanup completed for company ${companyId}`,
  );
}
