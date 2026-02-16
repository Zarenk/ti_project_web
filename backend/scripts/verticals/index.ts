import { PrismaClient } from '@prisma/client';
import { ensureDefaultSettings, cleanupGeneralData } from './general';
import {
  createRestaurantTables,
  createKitchenStations,
  convertToMenuItems,
  cleanupRestaurantsData,
} from './restaurants';
import {
  setupPosStations,
  initializeBarcodeSystem,
  createRetailCatalogs,
  cleanupRetailData,
} from './retail';
import {
  setupBomSystem,
  initializeWorkOrders,
  cleanupManufacturingData,
} from './manufacturing';
import { setupProjectTemplates, cleanupServicesData } from './services';
import { cleanupComputersData } from './computers';

export interface VerticalScriptContext {
  companyId: number;
  organizationId?: number | null;
  prisma?: PrismaClient;
  metadata?: Record<string, unknown>;
}

export type VerticalScriptName =
  | 'ensure_default_settings'
  | 'create_retail_catalogs'
  | 'setup_pos_stations'
  | 'initialize_barcode_system'
  | 'create_restaurant_tables'
  | 'create_kitchen_stations'
  | 'convert_to_menu_items'
  | 'setup_project_templates'
  | 'setup_bom_system'
  | 'initialize_work_orders';

export type VerticalScriptHandler = (
  context: VerticalScriptContext,
) => Promise<void>;

const noop = async (
  script: VerticalScriptName,
  context: VerticalScriptContext,
) => {
  console.info(
    `[vertical-script] ${script} ejecutado para empresa ${context.companyId} (org: ${context.organizationId ?? 'n/a'})`,
  );
};

const handlers: Record<VerticalScriptName, VerticalScriptHandler> = {
  ensure_default_settings: ensureDefaultSettings,
  create_retail_catalogs: createRetailCatalogs,
  setup_pos_stations: setupPosStations,
  initialize_barcode_system: initializeBarcodeSystem,
  create_restaurant_tables: createRestaurantTables,
  create_kitchen_stations: createKitchenStations,
  convert_to_menu_items: convertToMenuItems,
  setup_project_templates: setupProjectTemplates,
  setup_bom_system: setupBomSystem,
  initialize_work_orders: initializeWorkOrders,
};

export async function runVerticalScript(
  name: VerticalScriptName,
  context: VerticalScriptContext,
) {
  const handler = handlers[name];
  if (!handler) {
    console.warn(
      `[vertical-script] no existe handler para "${name}", se omite.`,
    );
    return;
  }
  await handler(context);
}

export function availableVerticalScripts(): VerticalScriptName[] {
  return Object.keys(handlers) as VerticalScriptName[];
}

// ── Cleanup Handlers ────────────────────────────────────────────────────────

export type BusinessVertical =
  | 'GENERAL'
  | 'RESTAURANTS'
  | 'RETAIL'
  | 'SERVICES'
  | 'MANUFACTURING'
  | 'COMPUTERS';

export type VerticalCleanupHandler = (
  context: VerticalScriptContext,
) => Promise<void>;

const cleanupHandlers: Record<BusinessVertical, VerticalCleanupHandler> = {
  GENERAL: cleanupGeneralData,
  RESTAURANTS: cleanupRestaurantsData,
  RETAIL: cleanupRetailData,
  SERVICES: cleanupServicesData,
  MANUFACTURING: cleanupManufacturingData,
  COMPUTERS: cleanupComputersData,
};

/**
 * Runs cleanup handler for a specific vertical
 * This is called when switching AWAY from a vertical
 * It archives and removes vertical-specific data
 */
export async function runVerticalCleanup(
  vertical: BusinessVertical,
  context: VerticalScriptContext,
): Promise<void> {
  const handler = cleanupHandlers[vertical];
  if (!handler) {
    console.warn(
      `[vertical-cleanup] no existe handler de limpieza para "${vertical}", se omite.`,
    );
    return;
  }

  console.log(
    `[vertical-cleanup] Ejecutando limpieza para vertical ${vertical} (empresa ${context.companyId})`,
  );
  await handler(context);
}
