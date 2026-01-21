import { SalesService } from 'src/sales/sales.service';
import { AccountingService } from 'src/accounting/accounting.service';
import { InventoryService } from 'src/inventory/inventory.service';
import { InvoiceTemplatesService } from 'src/invoice-templates/invoice-templates.service';

describe('Vertical permission safety checks', () => {
  it('does not block sales flow when vertical sales flag is false', async () => {
    const verticalConfig = {
      getConfig: jest.fn().mockResolvedValue({ features: { sales: false } }),
    };
    const service = new SalesService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      verticalConfig as any,
    );

    await expect(
      (service as any).ensureSalesFeatureEnabled(123),
    ).resolves.toBeUndefined();
    expect(verticalConfig.getConfig).toHaveBeenCalledWith(123);
  });

  it('does not block accounting flow when vertical sales flag is false', async () => {
    const verticalConfig = {
      getConfig: jest.fn().mockResolvedValue({ features: { sales: false } }),
    };
    const service = new AccountingService({} as any, verticalConfig as any);

    await expect(
      (service as any).ensureAccountingFeatureEnabled(123),
    ).resolves.toBeUndefined();
    expect(verticalConfig.getConfig).toHaveBeenCalledWith(123);
  });

  it('does not block invoice templates when vertical sales flag is false', async () => {
    const verticalConfig = {
      getConfig: jest.fn().mockResolvedValue({ features: { sales: false } }),
    };
    const tenantContext = {
      getContext: () => ({ organizationId: 1, companyId: 123, userId: 7 }),
    };
    const service = new InvoiceTemplatesService(
      {} as any,
      tenantContext as any,
      verticalConfig as any,
    );

    await expect(
      (service as any).ensureBillingFeatureEnabled(),
    ).resolves.toBeUndefined();
    expect(verticalConfig.getConfig).toHaveBeenCalledWith(123);
  });

  it('allows inventory flow when vertical inventory flag is true', async () => {
    const verticalConfig = {
      getConfig: jest.fn().mockResolvedValue({ features: { inventory: true } }),
    };
    const service = new InventoryService(
      {} as any,
      {} as any,
      {} as any,
      verticalConfig as any,
    );

    await expect(
      (service as any).ensureInventoryFeatureEnabled(123),
    ).resolves.toBeUndefined();
    expect(verticalConfig.getConfig).toHaveBeenCalledWith(123);
  });
});
