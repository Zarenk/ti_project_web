import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuotesService } from './quotes.service';

type PrismaMock = {
  quote: {
    findFirst: jest.Mock;
  };
  auditLog: {
    findMany: jest.Mock;
  };
};

const createPrismaMock = (): PrismaMock =>
  ({
    quote: {
      findFirst: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  }) as PrismaMock;

const createConfigMock = () =>
  ({
    get: jest.fn(),
  }) as unknown as ConfigService;

describe('QuotesService.findEvents', () => {
  let service: QuotesService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new QuotesService(
      createConfigMock(),
      prisma as unknown as PrismaService,
    );
  });

  it('throws not found when quote is not in tenant scope', async () => {
    prisma.quote.findFirst.mockResolvedValue(null);

    await expect(service.findEvents(99, 5, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.auditLog.findMany).not.toHaveBeenCalled();
  });

  it('filters events by organization when quote has organizationId', async () => {
    prisma.quote.findFirst.mockResolvedValue({ id: 7, organizationId: 33 });
    prisma.auditLog.findMany.mockResolvedValue([]);

    await service.findEvents(7, 12, 33);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: 'Quote',
          entityId: '7',
          companyId: 12,
          organizationId: 33,
        }),
      }),
    );
  });

  it('keeps compatibility for legacy quotes with null organizationId', async () => {
    prisma.quote.findFirst.mockResolvedValue({ id: 8, organizationId: null });
    prisma.auditLog.findMany.mockResolvedValue([]);

    await service.findEvents(8, 12, 44);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          organizationId: expect.anything(),
        }),
      }),
    );
  });
});
