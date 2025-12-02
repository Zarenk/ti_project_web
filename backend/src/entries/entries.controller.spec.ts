import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';

describe('EntriesController multi-tenant propagation', () => {
  let controller: EntriesController;
  let service: { createEntry: jest.Mock };
  let invoiceExtraction: {
    recordSample: jest.Mock;
    appendLog: jest.Mock;
    processSample: jest.Mock;
  };

  const baseBody = {
    storeId: 1,
    userId: 2,
    providerId: 3,
    date: new Date('2024-01-01T00:00:00.000Z'),
    details: [],
  };

  beforeEach(() => {
    service = {
      createEntry: jest.fn().mockResolvedValue({ id: 123 }),
    };
    invoiceExtraction = {
      recordSample: jest.fn(),
      appendLog: jest.fn(),
      processSample: jest.fn(),
    };
    controller = new EntriesController(
      service as unknown as EntriesService,
      invoiceExtraction as any,
    );
  });

  it('passes tenant organizationId to the service when available', async () => {
    const result = await controller.createEntry(baseBody as any, 42);

    expect(result).toEqual({ id: 123 });
    expect(service.createEntry).toHaveBeenCalledWith(baseBody, 42);
  });

  it('forwards legacy contexts with null organizationId', async () => {
    await controller.createEntry(baseBody as any, null);

    expect(service.createEntry).toHaveBeenCalledWith(baseBody, null);
  });

  it('does not override explicit payload organizationId when tenant is undefined', async () => {
    const payload = { ...baseBody, organizationId: 99 };

    await controller.createEntry(payload as any, undefined);

    expect(service.createEntry).toHaveBeenCalledWith(payload, undefined);
  });
});
