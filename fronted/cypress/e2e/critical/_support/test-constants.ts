/**
 * Deterministic constants for the critical E2E test suite.
 * These values must match the seed data in backend/prisma/seed/e2e-critical.seed.ts
 */
export const T = {
  // ── Users ────────────────────────────────────────
  ADMIN_EMAIL: "admin@e2etest.com",
  EMPLOYEE_EMAIL: "employee@e2etest.com",
  ORG_ADMIN_EMAIL: "orgadmin@e2etest.com",
  PASSWORD: "Test1234!",

  // ── Organization ─────────────────────────────────
  ORG_NAME: "E2E Test Corp",
  ORG_CODE: "e2e-test",
  COMPANY_NAME: "E2E Sucursal",
  STORE_NAME: "Tienda E2E",
  PROVIDER_NAME: "Proveedor E2E",
  CATEGORY_NAME: "Categoria E2E",

  // ── Product – basic (no series) ──────────────────
  PRODUCT_NAME: "Producto E2E Test",
  PRODUCT_NAME_EDITED: "Producto E2E Editado",
  PRODUCT_PRICE: 100,
  PRODUCT_PRICE_SELL: 120,
  PRODUCT_PRICE_EDITED: 130,
  PRODUCT_COST: 80,
  PRODUCT_SKU: "E2E-001",

  // ── Product – to be deleted ──────────────────────
  PRODUCT_DELETE_NAME: "Producto E2E Eliminar",

  // ── Product – series tracking ────────────────────
  PRODUCT_SERIES_NAME: "Producto E2E Series",
  PRODUCT_SERIES_SKU: "E2E-SER-001",

  // ── Entry (inventory inbound) ────────────────────
  ENTRY_QTY: 50,

  // ── Series ───────────────────────────────────────
  SERIAL_PREFIX: "SN-E2E-",
  SERIAL_QTY: 10,

  // ── Sale ─────────────────────────────────────────
  SALE_QTY: 5,
  SALE_SERIAL_QTY: 2,

  // ── Timeouts ─────────────────────────────────────
  PAGE_LOAD: 60_000,
  API_WAIT: 20_000,
} as const;

/**
 * Generate serial numbers: SN-E2E-001 ... SN-E2E-010
 */
export function generateSerials(count: number = T.SERIAL_QTY): string[] {
  return Array.from({ length: count }, (_, i) =>
    `${T.SERIAL_PREFIX}${String(i + 1).padStart(3, "0")}`,
  );
}
