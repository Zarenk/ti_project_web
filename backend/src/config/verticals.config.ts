import { BusinessVertical } from '../types/business-vertical.enum';

export interface VerticalFeatures {
  sales: boolean;
  inventory: boolean;
  production: boolean;
  reservations: boolean;
  appointments: boolean;
  multiWarehouse: boolean;
  lotTracking: boolean;
  serialNumbers: boolean;
  tableManagement: boolean;
  kitchenDisplay: boolean;
  workOrders: boolean;
  projectTracking: boolean;
  posIntegration: boolean;
  ecommerceIntegration: boolean;
  deliveryPlatforms: boolean;
  accounting: boolean;
  cashRegister: boolean;
  quotes: boolean;
}

export interface VerticalUIConfig {
  theme?: 'default' | 'restaurant' | 'retail' | 'services';
  dashboardLayout: 'standard' | 'sales-focused' | 'production-focused';
  primaryColor?: string;
  templates: {
    invoice: string;
    receipt: string;
    report: string;
  };
  customMenuItems?: Array<{
    label: string;
    path: string;
    icon: string;
  }>;
}

export interface VerticalProductSchemaField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'select'
    | 'multi-select'
    | 'color'
    | 'textarea'
    | 'date'
    | 'json';
  options?: string[];
  required?: boolean;
  group?: string;
  generated?: boolean;
}

export interface VerticalProductSchema {
  inventoryTracking: 'by_product' | 'by_variant' | 'by_ingredient' | 'lot_tracking';
  pricingModel: 'uniform' | 'by_variant' | 'by_modifiers';
  fields: VerticalProductSchemaField[];
}

export interface VerticalFiscalConfig {
  taxCalculation: 'standard' | 'retail' | 'restaurant' | 'service';
  requiredFields: string[];
  invoiceFormat: 'standard' | 'simplified' | 'detailed';
  taxCategories?: string[];
}

export interface VerticalMigrationScripts {
  onActivate?: string[];
  onDeactivate?: string[];
  dataTransformations?: Array<{
    table: string;
    transformation: string;
  }>;
}

export interface VerticalConfig {
  name: BusinessVertical;
  displayName: string;
  description: string;
  icon: string;
  features: VerticalFeatures;
  ui: VerticalUIConfig;
  productSchema: VerticalProductSchema;
  alternateSchemas?: Record<string, VerticalProductSchema>;
  fiscal: VerticalFiscalConfig;
  migrations?: VerticalMigrationScripts;
  requiresDataMigration: boolean;
  isActive: boolean;
  version: string;
}

const BASE_FEATURES: VerticalFeatures = {
  sales: true,
  inventory: true,
  production: true,
  reservations: true,
  appointments: true,
  multiWarehouse: true,
  lotTracking: true,
  serialNumbers: true,
  tableManagement: true,
  kitchenDisplay: true,
  workOrders: true,
  projectTracking: true,
  posIntegration: true,
  ecommerceIntegration: true,
  deliveryPlatforms: true,
  accounting: true,
  cashRegister: true,
  quotes: true,
};

const GENERAL_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_product',
  pricingModel: 'uniform',
  fields: [],
};

const COMPUTERS_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_product',
  pricingModel: 'uniform',
  fields: [],
};

const RETAIL_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_variant',
  pricingModel: 'by_variant',
  fields: [
    {
      key: 'size',
      label: 'Talla',
      type: 'select',
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      required: true,
      group: 'clothing',
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      options: [
        'Negro',
        'Blanco',
        'Azul',
        'Rojo',
        'Verde',
        'Amarillo',
        'Gris',
        'Marron',
        'Rosado',
        'Morado',
        'Naranja',
      ],
      required: true,
      group: 'clothing',
    },
    {
      key: 'sku_variant',
      label: 'SKU Variante',
      type: 'text',
      generated: true,
      required: true,
    },
    {
      key: 'material',
      label: 'Material',
      type: 'text',
    },
    {
      key: 'variants',
      label: 'Variantes',
      type: 'json',
      required: false,
    },
  ],
};

const RESTAURANTS_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_ingredient',
  pricingModel: 'by_modifiers',
  fields: [
    {
      key: 'ingredients',
      label: 'Ingredientes',
      type: 'json',
      required: true,
    },
    {
      key: 'ingredient_unit',
      label: 'Unidad de medida',
      type: 'select',
      options: ['UNIDAD', 'KG', 'GR', 'LT', 'ML'],
      required: true,
    },
    {
      key: 'prep_time',
      label: 'Tiempo de preparacion (min)',
      type: 'number',
      required: true,
    },
    {
      key: 'kitchen_station',
      label: 'Estacion de cocina',
      type: 'select',
      options: ['GRILL', 'FRY', 'COLD', 'BAKERY'],
      required: true,
    },
    {
      key: 'dietary_info',
      label: 'Informacion dietetica',
      type: 'multi-select',
      options: ['VEGAN', 'GLUTEN_FREE', 'LACTOSE_FREE', 'SPICY'],
    },
    {
      key: 'allergens',
      label: 'Alergenos',
      type: 'text',
    },
    {
      key: 'expiration_date',
      label: 'Fecha de caducidad',
      type: 'date',
    },
    {
      key: 'lot_number',
      label: 'Numero de lote',
      type: 'text',
    },
  ],
};

const PHARMACY_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'lot_tracking',
  pricingModel: 'uniform',
  fields: [
    {
      key: 'composition',
      label: 'Composicion',
      type: 'textarea',
      required: true,
    },
    { key: 'dosage', label: 'Dosis', type: 'text', required: true },
    {
      key: 'registration_number',
      label: 'Registro sanitario',
      type: 'text',
      required: true,
    },
    {
      key: 'expiration_date',
      label: 'Fecha de caducidad',
      type: 'text',
      required: true,
    },
    { key: 'lot_number', label: 'Numero de lote', type: 'text', required: true },
  ],
};

const SERVICES_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_product',
  pricingModel: 'uniform',
  fields: [
    {
      key: 'service_type',
      label: 'Tipo de servicio',
      type: 'select',
      options: ['CONSULTORIA', 'MANTENIMIENTO', 'PROYECTO'],
    },
    {
      key: 'billable_rate',
      label: 'Tarifa por hora',
      type: 'number',
    },
  ],
};

const MANUFACTURING_PRODUCT_SCHEMA: VerticalProductSchema = {
  inventoryTracking: 'by_product',
  pricingModel: 'uniform',
  fields: [
    {
      key: 'bom_code',
      label: 'Codigo BOM',
      type: 'text',
      required: true,
    },
    {
      key: 'work_center',
      label: 'Centro de trabajo',
      type: 'text',
    },
    {
      key: 'lead_time_days',
      label: 'Tiempo de produccion (dias)',
      type: 'number',
    },
  ],
};

export const VERTICAL_REGISTRY: Record<BusinessVertical, VerticalConfig> = {
  [BusinessVertical.GENERAL]: {
    name: BusinessVertical.GENERAL,
    displayName: 'General',
    description: 'Configuracion estandar para organizaciones sin requisitos especificos.',
    icon: 'building',
    features: { ...BASE_FEATURES },
    ui: {
      theme: 'default',
      dashboardLayout: 'standard',
      templates: {
        invoice: 'standard-invoice',
        receipt: 'standard-receipt',
        report: 'standard-report',
      },
    },
    productSchema: GENERAL_PRODUCT_SCHEMA,
    alternateSchemas: { pharmacy: PHARMACY_PRODUCT_SCHEMA },
    fiscal: {
      taxCalculation: 'standard',
      requiredFields: ['tax_id'],
      invoiceFormat: 'standard',
      taxCategories: ['general'],
    },
    migrations: {
      onActivate: ['ensure_default_settings'],
    },
    requiresDataMigration: false,
    isActive: true,
    version: '1.0.0',
  },
  [BusinessVertical.COMPUTERS]: {
    name: BusinessVertical.COMPUTERS,
    displayName: 'Venta de Computadoras/Laptops',
    description: 'Optimizado para catalogos de computadoras con especificaciones.',
    icon: 'laptop',
    features: {
      sales: true,
      inventory: true,
      production: false,
      reservations: false,
      appointments: false,
      multiWarehouse: true,
      lotTracking: false,
      serialNumbers: true,
      tableManagement: false,
      kitchenDisplay: false,
      workOrders: false,
      projectTracking: false,
      posIntegration: true,
      ecommerceIntegration: true,
      deliveryPlatforms: false,
      accounting: true,
      cashRegister: true,
      quotes: true,
    },
    ui: {
      theme: 'default',
      dashboardLayout: 'sales-focused',
      primaryColor: '#0EA5E9',
      templates: {
        invoice: 'standard-invoice',
        receipt: 'standard-receipt',
        report: 'inventory-report',
      },
    },
    productSchema: COMPUTERS_PRODUCT_SCHEMA,
    fiscal: {
      taxCalculation: 'standard',
      requiredFields: ['tax_id'],
      invoiceFormat: 'standard',
      taxCategories: ['general'],
    },
    requiresDataMigration: false,
    isActive: true,
    version: '1.0.0',
  },
  [BusinessVertical.RETAIL]: {
    name: BusinessVertical.RETAIL,
    displayName: 'Comercio Minorista',
    description: 'Optimizado para tiendas de ropa y comercios con variantes.',
    icon: 'shopping-bag',
    features: {
      sales: true,
      inventory: true,
      production: false,
      reservations: false,
      appointments: false,
      multiWarehouse: true,
      lotTracking: true,
      serialNumbers: true,
      tableManagement: false,
      kitchenDisplay: false,
      workOrders: false,
      projectTracking: false,
      posIntegration: true,
      ecommerceIntegration: true,
      deliveryPlatforms: true,
      accounting: true,
      cashRegister: true,
      quotes: true,
    },
    ui: {
      theme: 'retail',
      dashboardLayout: 'sales-focused',
      primaryColor: '#4ECDC4',
      templates: {
        invoice: 'retail-invoice',
        receipt: 'retail-receipt',
        report: 'inventory-report',
      },
      customMenuItems: [
        { label: 'POS', path: '/pos', icon: 'cash-register' },
        { label: 'Catalogo', path: '/catalog', icon: 'book' },
      ],
    },
    productSchema: RETAIL_PRODUCT_SCHEMA,
    fiscal: {
      taxCalculation: 'retail',
      requiredFields: ['tax_id', 'store_code'],
      invoiceFormat: 'detailed',
      taxCategories: ['standard', 'reduced', 'exempt'],
    },
    migrations: {
      onActivate: [
        'create_retail_catalogs',
        'setup_pos_stations',
        'initialize_barcode_system',
      ],
    },
    requiresDataMigration: true,
    isActive: true,
    version: '1.0.0',
  },
  [BusinessVertical.RESTAURANTS]: {
    name: BusinessVertical.RESTAURANTS,
    displayName: 'Restaurantes y Cafeterias',
    description: 'Vertical especializado para menu, reservas y cocina.',
    icon: 'utensils',
    features: {
      sales: true,
      inventory: true,
      production: false,
      reservations: true,
      appointments: false,
      multiWarehouse: false,
      lotTracking: true,
      serialNumbers: false,
      tableManagement: true,
      kitchenDisplay: true,
      workOrders: false,
      projectTracking: false,
      posIntegration: true,
      ecommerceIntegration: true,
      deliveryPlatforms: true,
      accounting: true,
      cashRegister: true,
      quotes: true,
    },
    ui: {
      theme: 'restaurant',
      dashboardLayout: 'sales-focused',
      templates: {
        invoice: 'restaurant-invoice',
        receipt: 'restaurant-receipt',
        report: 'sales-report',
      },
      customMenuItems: [
        { label: 'Mesas', path: '/dashboard/tables', icon: 'table' },
        { label: 'Comanda', path: '/dashboard/kitchen', icon: 'kitchen' },
        { label: 'Insumos', path: '/dashboard/ingredients', icon: 'ingredients' },
        { label: 'Platos', path: '/dashboard/products', icon: 'book' },
        { label: 'Órdenes', path: '/dashboard/restaurant-orders', icon: 'orders' },
        { label: 'Caja', path: '/dashboard/cashregister', icon: 'cash-register' },
      ],
    },
    productSchema: RESTAURANTS_PRODUCT_SCHEMA,
    alternateSchemas: { pharmacy: PHARMACY_PRODUCT_SCHEMA },
    fiscal: {
      taxCalculation: 'restaurant',
      requiredFields: ['tax_id', 'service_charge'],
      invoiceFormat: 'simplified',
      taxCategories: ['food', 'beverage', 'service'],
    },
    migrations: {
      onActivate: ['create_restaurant_tables', 'create_kitchen_stations'],
      dataTransformations: [
        { table: 'products', transformation: 'convert_to_menu_items' },
      ],
    },
    requiresDataMigration: true,
    isActive: true,
    version: '1.0.0',
  },
  [BusinessVertical.SERVICES]: {
    name: BusinessVertical.SERVICES,
    displayName: 'Servicios Profesionales',
    description: 'Pensado para estudios, agencias y consultoras.',
    icon: 'briefcase',
    features: {
      sales: true,
      inventory: false,
      production: false,
      reservations: false,
      appointments: true,
      multiWarehouse: false,
      lotTracking: false,
      serialNumbers: false,
      tableManagement: false,
      kitchenDisplay: false,
      workOrders: true,
      projectTracking: true,
      posIntegration: false,
      ecommerceIntegration: false,
      deliveryPlatforms: false,
      accounting: true,
      cashRegister: true,
      quotes: true,
    },
    ui: {
      theme: 'services',
      dashboardLayout: 'production-focused',
      templates: {
        invoice: 'service-invoice',
        receipt: 'service-receipt',
        report: 'project-report',
      },
    },
    productSchema: SERVICES_PRODUCT_SCHEMA,
    fiscal: {
      taxCalculation: 'service',
      requiredFields: ['tax_id', 'professional_license'],
      invoiceFormat: 'detailed',
      taxCategories: ['services'],
    },
    migrations: {
      onActivate: ['setup_project_templates'],
    },
    requiresDataMigration: true,
    isActive: false,
    version: '1.0.0',
  },
  [BusinessVertical.MANUFACTURING]: {
    name: BusinessVertical.MANUFACTURING,
    displayName: 'Manufactura y Produccion',
    description: 'Para empresas con ordenes de trabajo y BOMs.',
    icon: 'industry',
    features: {
      sales: true,
      inventory: true,
      production: true,
      reservations: false,
      appointments: false,
      multiWarehouse: true,
      lotTracking: true,
      serialNumbers: true,
      tableManagement: false,
      kitchenDisplay: false,
      workOrders: true,
      projectTracking: true,
      posIntegration: false,
      ecommerceIntegration: true,
      deliveryPlatforms: false,
      accounting: true,
      cashRegister: true,
      quotes: true,
    },
    ui: {
      theme: 'default',
      dashboardLayout: 'production-focused',
      templates: {
        invoice: 'manufacturing-invoice',
        receipt: 'standard-receipt',
        report: 'production-report',
      },
    },
    productSchema: MANUFACTURING_PRODUCT_SCHEMA,
    fiscal: {
      taxCalculation: 'standard',
      requiredFields: ['tax_id', 'manufacturing_license'],
      invoiceFormat: 'detailed',
      taxCategories: ['raw_materials', 'finished_goods'],
    },
    migrations: {
      onActivate: ['setup_bom_system', 'initialize_work_orders'],
    },
    requiresDataMigration: true,
    isActive: false,
    version: '1.0.0',
  },
};
