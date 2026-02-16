import { render, screen, waitFor } from "@testing-library/react";
import { InventoryPage } from "./page";

jest.mock("@/utils/auth-fetch", () => ({
  authFetch: jest.fn((url) => {
    if (url.includes("/metrics")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            totalProcessed: 10,
            failedExtractions: 2,
            averageConfidence: 0.4,
            lowConfidenceSamples: [{ id: 1, mlConfidence: 0.35 }],
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          failureAlerts: [
            {
              id: 5,
              sampleId: 99,
              template: "FACTURA_ELECTRONICA",
              message: "Falló Donut",
              createdAt: new Date().toISOString(),
            },
          ],
          reviewDueTemplates: [
            {
              id: 7,
              documentType: "GUIA_REMISION",
              providerName: "Proveedor X",
              updatedAt: new Date().toISOString(),
            },
          ],
        }),
    });
  }),
}));

jest.mock("@/app/dashboard/inventory/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
}));
jest.mock("@/app/dashboard/inventory/columns", () => ({ useInventoryColumns: () => [] }));
jest.mock("@/app/dashboard/inventory/inventory.api", () => ({
  getInventoryWithCurrency: jest.fn().mockResolvedValue([]),
  getAllPurchasePrices: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/context/tenant-selection-context", () => ({
  useTenantSelection: () => ({
    selection: { organizationId: 1, companyId: 1 },
    version: "v1",
    loading: false,
  }),
}));

describe("InventoryPage alerts", () => {
  it("renders alert cards after fetching data", async () => {
    render(<InventoryPage />);
    await waitFor(() => expect(screen.getByText("Alertas recientes")).toBeInTheDocument());
    expect(screen.getByText("#99 · FACTURA_ELECTRONICA")).toBeInTheDocument();
    expect(screen.getByText("Proveedor X")).toBeInTheDocument();
  });
});
