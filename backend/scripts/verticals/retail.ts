import { VerticalScriptContext } from './index';

/**
 * Sets up POS stations for the RETAIL vertical
 * - Creates a default POS station if none exist
 * - Idempotent: Skips if stations already exist
 */
export async function setupPosStations(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn('[setup_pos_stations] Missing prisma or companyId, skipping');
    return;
  }

  // Check if stations already exist (idempotency)
  const existing = await prisma.posStation.count({
    where: { companyId },
  });

  if (existing > 0) {
    console.log(
      `[setup_pos_stations] Company ${companyId} already has ${existing} stations, skipping`,
    );
    return;
  }

  // Create default POS station
  await prisma.posStation.create({
    data: {
      companyId,
      stationCode: 'POS-01',
      stationName: 'Main Counter',
      isActive: true,
    },
  });

  console.log(
    `[setup_pos_stations] Created default POS station for company ${companyId}`,
  );
}

/**
 * Initializes barcode system for the RETAIL vertical
 * - Currently a no-op placeholder for future barcode configuration
 */
export async function initializeBarcodeSystem(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { companyId } = ctx;

  console.log(
    `[initialize_barcode_system] Barcode system initialized for company ${companyId}`,
  );
  // Future: Add barcode printer configuration, barcode format settings, etc.
}

/**
 * Creates default product catalogs/categories for RETAIL vertical
 * - Sets up common retail categories
 * - Idempotent: Checks if categories exist before creating
 */
export async function createRetailCatalogs(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn('[create_retail_catalogs] Missing prisma or companyId, skipping');
    return;
  }

  // Check if company already has categories
  const existingCategories = await prisma.category.count({
    where: { companyId },
  });

  if (existingCategories > 0) {
    console.log(
      `[create_retail_catalogs] Company ${companyId} already has ${existingCategories} categories, skipping`,
    );
    return;
  }

  // Create default retail categories
  const defaultCategories = [
    { name: 'Electrónica', description: 'Productos electrónicos y tecnología' },
    { name: 'Ropa y Accesorios', description: 'Vestimenta y complementos' },
    { name: 'Hogar y Jardín', description: 'Artículos para el hogar' },
    { name: 'Deportes', description: 'Equipamiento deportivo' },
    { name: 'Librería', description: 'Libros, útiles escolares y oficina' },
    { name: 'Otros', description: 'Productos varios' },
  ];

  await prisma.category.createMany({
    data: defaultCategories.map((cat) => ({
      ...cat,
      companyId,
      status: 'Activo',
    })),
    skipDuplicates: true,
  });

  console.log(
    `[create_retail_catalogs] Created ${defaultCategories.length} default categories for company ${companyId}`,
  );
}

/**
 * Cleanup handler for RETAIL vertical
 * - Archives and removes retail-specific data when switching away from this vertical
 * - Idempotent: Safe to run multiple times
 */
export async function cleanupRetailData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId, metadata } = ctx;

  if (!prisma || !companyId) {
    console.warn('[cleanup_retail_data] Missing prisma or companyId, skipping');
    return;
  }

  const reason = metadata?.reason as string | undefined;
  const archiveReason = reason || 'vertical_migration';

  // Archive PosStations
  const posStations = await prisma.posStation.findMany({
    where: { companyId },
  });

  if (posStations.length > 0) {
    await prisma.archivedPosStation.createMany({
      data: posStations.map((station) => ({
        originalId: station.id,
        companyId: station.companyId,
        stationCode: station.stationCode,
        stationName: station.stationName,
        ipAddress: station.ipAddress,
        isActive: station.isActive,
        lastHeartbeat: station.lastHeartbeat,
        archivedReason: archiveReason,
      })),
      skipDuplicates: true,
    });

    await prisma.posStation.deleteMany({
      where: { companyId },
    });

    console.log(
      `[cleanup_retail_data] Archived and deleted ${posStations.length} POS stations`,
    );
  }

  console.log(
    `[cleanup_retail_data] Cleanup completed for company ${companyId}`,
  );
}
