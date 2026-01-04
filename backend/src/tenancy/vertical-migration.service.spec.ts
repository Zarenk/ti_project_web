import { VerticalMigrationService } from './vertical-migration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from './vertical-config.service';
import { VerticalEventsService } from './vertical-events.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { runVerticalScript } from '../../scripts/verticals';

jest.mock('../../scripts/verticals', () => ({
  runVerticalScript: jest.fn().mockResolvedValue(undefined),
}));

const mockedRunScript = runVerticalScript as jest.Mock;

describe('VerticalMigrationService', () => {
  let prisma: any;
  let configService: any;
  let events: any;
  let service: VerticalMigrationService;
  let tx: any;

  beforeEach(() => {
    tx = {
      company: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      companyVerticalRollbackSnapshot: {
        create: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      companyVerticalChangeAudit: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prisma = {
      company: {
        findUnique: jest.fn(),
      },
      companyVerticalRollbackSnapshot: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(tx)),
    };

    configService = {
      invalidateCache: jest.fn(),
    };

    events = {
      emitChanged: jest.fn(),
    };

    mockedRunScript.mockClear();

    service = new VerticalMigrationService(
      prisma as PrismaService,
      configService as VerticalConfigService,
      events as VerticalEventsService,
    );
  });

  it('applies a vertical change, stores snapshot and runs scripts', async () => {
    prisma.company.findUnique.mockResolvedValue({ organizationId: 33 });

    await service.changeVertical({
      companyId: 10,
      actorId: 7,
      previousVertical: BusinessVertical.GENERAL,
      targetVertical: BusinessVertical.RETAIL,
      warnings: ['inventory'],
      reason: 'test',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { businessVertical: BusinessVertical.RETAIL },
    });
    expect(
      tx.companyVerticalRollbackSnapshot.create,
    ).toHaveBeenCalledWith(expect.any(Object));
    expect(tx.companyVerticalChangeAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 10,
          organizationId: 33,
        }),
      }),
    );
    expect(configService.invalidateCache).toHaveBeenCalledWith(10, 33);
    expect(events.emitChanged).toHaveBeenCalledWith({
      companyId: 10,
      organizationId: 33,
      previousVertical: BusinessVertical.GENERAL,
      newVertical: BusinessVertical.RETAIL,
    });
    expect(mockedRunScript).toHaveBeenCalledWith(
      'create_retail_catalogs',
      expect.objectContaining({ companyId: 10, organizationId: 33 }),
    );
  });

  it('performs rollback using the latest snapshot', async () => {
    prisma.companyVerticalRollbackSnapshot.findFirst.mockResolvedValue({
      id: 'snap-id',
      snapshotData: {
        previousVertical: BusinessVertical.GENERAL,
      },
    });
    prisma.company.findUnique.mockResolvedValue({
      businessVertical: BusinessVertical.RETAIL,
      organizationId: 77,
    });

    const result = await service.rollback(20, 5);

    expect(result).toBe(BusinessVertical.GENERAL);
    expect(
      prisma.companyVerticalRollbackSnapshot.findFirst,
    ).toHaveBeenCalledWith({
      where: { companyId: 20 },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.companyVerticalRollbackSnapshot.delete).toHaveBeenCalledWith({
      where: { id: 'snap-id' },
    });
    expect(configService.invalidateCache).toHaveBeenCalledWith(20, 77);
    expect(events.emitChanged).toHaveBeenCalledWith({
      companyId: 20,
      organizationId: 77,
      previousVertical: BusinessVertical.RETAIL,
      newVertical: BusinessVertical.GENERAL,
    });
  });
});
