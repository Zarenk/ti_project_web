import {
  logOrganizationContext,
  resetOrganizationContextLogger,
  setOrganizationContextLogger,
} from './organization-context.logger';

describe('logOrganizationContext', () => {
  const logMock = jest.fn();
  const warnMock = jest.fn();

  beforeEach(() => {
    logMock.mockReset();
    warnMock.mockReset();
    setOrganizationContextLogger({
      log: logMock,
      warn: warnMock,
    });
  });

  afterAll(() => {
    resetOrganizationContextLogger();
  });

  it('logs the organization identifier when provided', () => {
    logOrganizationContext({
      service: 'ClientsService',
      operation: 'create',
      organizationId: 42,
    });

    expect(logMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      '[ClientsService.create] organizationId=42',
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('includes serialized metadata when present', () => {
    logOrganizationContext({
      service: 'InventoryService',
      operation: 'transfer',
      organizationId: 7,
      metadata: { storeId: 3, inventoryId: 9 },
    });

    expect(logMock).toHaveBeenCalledWith(
      '[InventoryService.transfer] organizationId=7 | metadata={"storeId":3,"inventoryId":9}',
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('emits a warning when organizationId is missing', () => {
    logOrganizationContext({
      service: 'SalesService',
      operation: 'createSale',
      metadata: { saleId: 10 },
    });

    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      '[SalesService.createSale] executed without organizationId | metadata={"saleId":10}',
    );
    expect(logMock).not.toHaveBeenCalled();
  });
});