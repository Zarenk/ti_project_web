import { VerticalMigrationService } from './vertical-migration.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from './vertical-config.service';
import { VerticalEventsService } from './vertical-events.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { runVerticalScript, runVerticalCleanup } from '../../scripts/verticals';

jest.mock('../../scripts/verticals', () => ({
  runVerticalScript: jest.fn().mockResolvedValue(undefined),
  runVerticalCleanup: jest.fn().mockResolvedValue(undefined),
}));

const mockedRunScript = runVerticalScript as jest.Mock;
const mockedRunCleanup = runVerticalCleanup as jest.Mock;

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
    mockedRunCleanup.mockClear();

    service = new VerticalMigrationService(
      prisma as PrismaService,
      configService as VerticalConfigService,
      events as VerticalEventsService,
    );
  });

  it('applies a vertical change, stores snapshot and runs scripts', async () => {
    prisma.company.findUnique.mockResolvedValueOnce({ organizationId: 33 });
    tx.company.findUnique.mockResolvedValue({
      businessVertical: BusinessVertical.GENERAL,
    });

    await service.changeVertical({
      companyId: 10,
      actorId: 7,
      previousVertical: BusinessVertical.GENERAL,
      targetVertical: BusinessVertical.RETAIL,
      warnings: ['inventory'],
      reason: 'test',
    });

    // Verify cleanup was called for previous vertical
    expect(mockedRunCleanup).toHaveBeenCalledWith(
      BusinessVertical.GENERAL,
      expect.objectContaining({
        companyId: 10,
        organizationId: 33,
        metadata: { reason: 'test' },
      }),
    );

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
          userId: 7,
          oldVertical: BusinessVertical.GENERAL,
          newVertical: BusinessVertical.RETAIL,
          success: true,
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

    // Verify scripts were called (onActivate + possibly transformations)
    expect(mockedRunScript).toHaveBeenCalled();
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
    tx.company.findUnique.mockResolvedValue({
      businessVertical: BusinessVertical.RETAIL,
    });

    const result = await service.rollback(20, 5);

    expect(result).toBe(BusinessVertical.GENERAL);
    expect(
      prisma.companyVerticalRollbackSnapshot.findFirst,
    ).toHaveBeenCalledWith({
      where: { companyId: 20, expiresAt: { gte: expect.any(Date) } },
      orderBy: { createdAt: 'desc' },
    });

    // Verify cleanup was called for current vertical before rollback
    expect(mockedRunCleanup).toHaveBeenCalledWith(
      BusinessVertical.RETAIL,
      expect.objectContaining({
        companyId: 20,
        organizationId: 77,
        metadata: { reason: 'rollback' },
      }),
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.company.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { businessVertical: BusinessVertical.GENERAL },
    });
    expect(tx.companyVerticalChangeAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 20,
          organizationId: 77,
          userId: 5,
          oldVertical: BusinessVertical.RETAIL,
          newVertical: BusinessVertical.GENERAL,
          changeReason: 'rollback',
          success: true,
        }),
      }),
    );
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

    // Verify activation scripts were called
    expect(mockedRunScript).toHaveBeenCalled();
  });
});
