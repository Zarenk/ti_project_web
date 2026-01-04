import { PrismaClient } from '@prisma/client';

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
  ensure_default_settings: async (ctx) => {
    await noop('ensure_default_settings', ctx);
  },
  create_retail_catalogs: async (ctx) => {
    await noop('create_retail_catalogs', ctx);
  },
  setup_pos_stations: async (ctx) => {
    await noop('setup_pos_stations', ctx);
  },
  initialize_barcode_system: async (ctx) => {
    await noop('initialize_barcode_system', ctx);
  },
  create_restaurant_tables: async (ctx) => {
    await noop('create_restaurant_tables', ctx);
  },
  create_kitchen_stations: async (ctx) => {
    await noop('create_kitchen_stations', ctx);
  },
  convert_to_menu_items: async (ctx) => {
    await noop('convert_to_menu_items', ctx);
  },
  setup_project_templates: async (ctx) => {
    await noop('setup_project_templates', ctx);
  },
  setup_bom_system: async (ctx) => {
    await noop('setup_bom_system', ctx);
  },
  initialize_work_orders: async (ctx) => {
    await noop('initialize_work_orders', ctx);
  },
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
