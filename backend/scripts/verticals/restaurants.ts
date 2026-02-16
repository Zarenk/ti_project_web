import { VerticalScriptContext } from './index';

/**
 * Creates default restaurant tables for the RESTAURANTS vertical
 * - Creates 5 default tables (M1-M5) with varying capacities
 * - Idempotent: Skips if tables already exist
 */
export async function createRestaurantTables(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[create_restaurant_tables] Missing prisma or companyId, skipping',
    );
    return;
  }

  // Check if tables already exist (idempotency)
  const existing = await prisma.restaurantTable.count({
    where: { companyId },
  });

  if (existing > 0) {
    console.log(
      `[create_restaurant_tables] Company ${companyId} already has ${existing} tables, skipping`,
    );
    return;
  }

  // Create default tables
  const defaultTables = [
    { code: 'M1', name: 'Mesa 1', capacity: 2, area: 'Principal' },
    { code: 'M2', name: 'Mesa 2', capacity: 4, area: 'Principal' },
    { code: 'M3', name: 'Mesa 3', capacity: 4, area: 'Principal' },
    { code: 'M4', name: 'Mesa 4', capacity: 6, area: 'Terraza' },
    { code: 'M5', name: 'Mesa 5', capacity: 8, area: 'Terraza' },
  ];

  await prisma.restaurantTable.createMany({
    data: defaultTables.map((t) => ({
      ...t,
      companyId,
      status: 'AVAILABLE' as const,
    })),
    skipDuplicates: true,
  });

  console.log(
    `[create_restaurant_tables] Created ${defaultTables.length} tables for company ${companyId}`,
  );
}

/**
 * Creates default kitchen stations for the RESTAURANTS vertical
 * - Creates 4 default stations (Grill, Cold, Bar, Pastry)
 * - Idempotent: Skips if stations already exist
 */
export async function createKitchenStations(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[create_kitchen_stations] Missing prisma or companyId, skipping',
    );
    return;
  }

  // Check if stations already exist (idempotency)
  const existing = await prisma.kitchenStation.count({
    where: { companyId },
  });

  if (existing > 0) {
    console.log(
      `[create_kitchen_stations] Company ${companyId} already has ${existing} stations, skipping`,
    );
    return;
  }

  // Create default stations
  const defaultStations = [
    { code: 'GRILL', name: 'Grill' },
    { code: 'COLD', name: 'Cold Station' },
    { code: 'BAR', name: 'Bar' },
    { code: 'PASTRY', name: 'Pastry' },
  ];

  await prisma.kitchenStation.createMany({
    data: defaultStations.map((s) => ({
      ...s,
      companyId,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  console.log(
    `[create_kitchen_stations] Created ${defaultStations.length} stations for company ${companyId}`,
  );
}

/**
 * Converts existing products to menu items for RESTAURANTS vertical
 * - Tags products appropriately for restaurant use
 * - Creates default menu categories if needed
 * - Idempotent: Only processes products that haven't been converted
 */
export async function convertToMenuItems(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn('[convert_to_menu_items] Missing prisma or companyId, skipping');
    return;
  }

  // Check if company has products
  const productCount = await prisma.product.count({
    where: { companyId },
  });

  if (productCount === 0) {
    console.log(
      `[convert_to_menu_items] Company ${companyId} has no products, skipping`,
    );
    return;
  }

  // Get organizationId for category unique constraint
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  });

  if (!company) {
    console.warn(`[convert_to_menu_items] Company ${companyId} not found`);
    return;
  }

  // Create default menu categories if they don't exist
  const menuCategories = [
    { name: 'Entradas', description: 'Platos de entrada' },
    { name: 'Platos Principales', description: 'Platos principales' },
    { name: 'Postres', description: 'Postres y dulces' },
    { name: 'Bebidas', description: 'Bebidas y refrescos' },
  ];

  for (const cat of menuCategories) {
    await prisma.category.upsert({
      where: {
        organizationId_name: {
          organizationId: company.organizationId,
          name: cat.name,
        },
      },
      update: {},
      create: {
        ...cat,
        companyId,
        organizationId: company.organizationId,
        status: 'Activo',
      },
    });
  }

  console.log(
    `[convert_to_menu_items] Ensured ${menuCategories.length} menu categories exist for company ${companyId}`,
  );

  // Note: Actual product conversion would involve:
  // - Updating product metadata to mark them as menu items
  // - Adjusting pricing strategies for restaurant context
  // - Setting up kitchen station assignments
  // For now, we ensure the categories exist so products can be properly categorized
}

/**
 * Cleanup handler for RESTAURANTS vertical
 * - Archives and removes restaurant-specific data when switching away from this vertical
 * - Idempotent: Safe to run multiple times
 */
export async function cleanupRestaurantsData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId, metadata } = ctx;

  if (!prisma || !companyId) {
    console.warn('[cleanup_restaurants_data] Missing prisma or companyId, skipping');
    return;
  }

  const reason = metadata?.reason as string | undefined;
  const archiveReason = reason || 'vertical_migration';

  // Archive RestaurantTables
  const tables = await prisma.restaurantTable.findMany({
    where: { companyId },
  });

  if (tables.length > 0) {
    await prisma.archivedRestaurantTable.createMany({
      data: tables.map((table) => ({
        originalId: table.id,
        companyId: table.companyId!,
        organizationId: table.organizationId,
        name: table.name,
        code: table.code,
        capacity: table.capacity,
        area: table.area,
        status: table.status,
        currentOrderId: table.currentOrderId,
        archivedReason: archiveReason,
      })),
      skipDuplicates: true,
    });

    await prisma.restaurantTable.deleteMany({
      where: { companyId },
    });

    console.log(
      `[cleanup_restaurants_data] Archived and deleted ${tables.length} restaurant tables`,
    );
  }

  // Archive KitchenStations
  const stations = await prisma.kitchenStation.findMany({
    where: { companyId },
  });

  if (stations.length > 0) {
    await prisma.archivedKitchenStation.createMany({
      data: stations.map((station) => ({
        originalId: station.id,
        companyId: station.companyId!,
        organizationId: station.organizationId,
        name: station.name,
        code: station.code,
        isActive: station.isActive,
        archivedReason: archiveReason,
      })),
      skipDuplicates: true,
    });

    await prisma.kitchenStation.deleteMany({
      where: { companyId },
    });

    console.log(
      `[cleanup_restaurants_data] Archived and deleted ${stations.length} kitchen stations`,
    );
  }

  console.log(
    `[cleanup_restaurants_data] Cleanup completed for company ${companyId}`,
  );
}
