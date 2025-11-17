import { populateAccountingTenancy } from './populate-accounting-tenancy.seed';

const createMockPrisma = () => {
  const accEntry = {
    findMany: jest.fn(),
    update: jest.fn().mockImplementation(async () => ({})),
  };
  const entry = {
    findMany: jest.fn(),
  };
  const provider = {
    findMany: jest.fn(),
  };
  const prisma = {
    accEntry,
    entry,
    provider,
    $transaction: jest
      .fn()
      .mockImplementation(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    $disconnect: jest.fn(),
  };
  return prisma;
};

describe('populateAccountingTenancy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips when there are no accounting entries to backfill', async () => {
    const prisma = createMockPrisma();
    prisma.accEntry.findMany.mockResolvedValueOnce([]);

    const summary = await populateAccountingTenancy({ prisma: prisma as any });

    expect(summary.scanned).toBe(0);
    expect(summary.planned).toBe(0);
    expect(summary.updated).toBe(0);
    expect(prisma.accEntry.update).not.toHaveBeenCalled();
  });

  it('populates organization and company from inventory entries', async () => {
    const prisma = createMockPrisma();
    prisma.accEntry.findMany.mockResolvedValueOnce([
      {
        id: 101,
        organizationId: null,
        companyId: null,
        source: 'inventory_entry',
        sourceId: 501,
        providerId: 301,
      },
    ]);
    prisma.entry.findMany.mockResolvedValueOnce([
      {
        id: 501,
        organizationId: 7,
        store: { id: 9, organizationId: 7, companyId: 3 },
      },
    ]);
    prisma.provider.findMany.mockResolvedValueOnce([]);

    const summary = await populateAccountingTenancy({ prisma: prisma as any });

    expect(summary.planned).toBe(1);
    expect(summary.updated).toBe(1);
    expect(prisma.accEntry.update).toHaveBeenCalledWith({
      where: { id: 101 },
      data: {
        organization: { connect: { id: 7 } },
        company: { connect: { id: 3 } },
      },
    });
  });

  it('falls back to provider organization when inventory data is unavailable', async () => {
    const prisma = createMockPrisma();
    prisma.accEntry.findMany.mockResolvedValueOnce([
      {
        id: 202,
        organizationId: null,
        companyId: null,
        source: null,
        sourceId: null,
        providerId: 402,
      },
    ]);
    prisma.entry.findMany.mockResolvedValueOnce([]);
    prisma.provider.findMany.mockResolvedValueOnce([
      { id: 402, organizationId: 11 },
    ]);

    const summary = await populateAccountingTenancy({ prisma: prisma as any });

    expect(summary.planned).toBe(1);
    expect(summary.updated).toBe(1);
    expect(prisma.accEntry.update).toHaveBeenCalledWith({
      where: { id: 202 },
      data: { organization: { connect: { id: 11 } } },
    });
  });

  it('respects dry-run flag and does not persist updates', async () => {
    const prisma = createMockPrisma();
    prisma.accEntry.findMany.mockResolvedValueOnce([
      {
        id: 303,
        organizationId: null,
        companyId: null,
        source: 'inventory_entry',
        sourceId: 703,
        providerId: null,
      },
    ]);
    prisma.entry.findMany.mockResolvedValueOnce([
      {
        id: 703,
        organizationId: 17,
        store: { id: 70, organizationId: 17, companyId: 8 },
      },
    ]);
    prisma.provider.findMany.mockResolvedValueOnce([]);

    const summary = await populateAccountingTenancy({
      prisma: prisma as any,
      dryRun: true,
    });

    expect(summary.planned).toBe(1);
    expect(summary.updated).toBe(0);
    expect(prisma.accEntry.update).not.toHaveBeenCalled();
  });
});
