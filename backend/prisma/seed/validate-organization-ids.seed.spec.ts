import { mkdir, writeFile } from 'node:fs/promises';
import type { PrismaClient } from '@prisma/client';
import {
  parseValidateOrganizationCliArgs,
  validateOrganizationIds,
} from './validate-organization-ids.seed';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(() => Promise.resolve(undefined)),
  writeFile: jest.fn(() => Promise.resolve(undefined)),
}));

const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

type CountMock = jest.Mock<Promise<number>, [any?]>;

type FindManyMock = jest.Mock<Promise<any[]>, [any?]>;

type PrismaValidationMock = {
  store: { count: CountMock; findMany: FindManyMock };
  cashRegister: { count: CountMock; findMany: FindManyMock };
  user: { count: CountMock; findMany: FindManyMock };
  client: { count: CountMock; findMany: FindManyMock };
  inventory: { count: CountMock; findMany: FindManyMock };
  inventoryHistory: { count: CountMock; findMany: FindManyMock };
  entry: { count: CountMock; findMany: FindManyMock };
  provider: { count: CountMock; findMany: FindManyMock };
  sales: { count: CountMock; findMany: FindManyMock };
  transfer: { count: CountMock; findMany: FindManyMock };
  orders: { count: CountMock; findMany: FindManyMock };
  cashTransaction: { count: CountMock; findMany: FindManyMock };
  cashClosure: { count: CountMock; findMany: FindManyMock };
  $disconnect: jest.Mock<Promise<void>, []>;
};

const createCountMock = (total: number, missing: number): CountMock =>
  jest.fn(async (args?: any) => (args?.where?.organizationId === null ? missing : total));

const createFindManyMock = (items: any[]): FindManyMock => jest.fn(async () => items);

const buildPrismaValidationMock = (): PrismaValidationMock => ({
  store: {
    count: createCountMock(5, 2),
    findMany: createFindManyMock([
      { id: 1, organizationId: 1 },
      { id: 2, organizationId: 5 },
    ]),
  },
  cashRegister: {
    count: createCountMock(4, 0),
    findMany: createFindManyMock([
      { id: 10, organizationId: 1, store: { organizationId: 1 } },
      { id: 11, organizationId: 2, store: { organizationId: 3 } },
    ]),
  },
  user: {
    count: createCountMock(6, 1),
    findMany: createFindManyMock([]),
  },
  client: {
    count: createCountMock(7, 0),
    findMany: createFindManyMock([
      { id: 100, organizationId: 2, user: { organizationId: 2 } },
      { id: 101, organizationId: 4, user: { organizationId: 5 } },
    ]),
  },
  inventory: {
    count: createCountMock(3, 0),
    findMany: createFindManyMock([
      { id: 200, organizationId: 5, storeId: 2 },
    ]),
  },
  inventoryHistory: {
    count: createCountMock(9, 0),
    findMany: createFindManyMock([]),
  },
  entry: {
    count: createCountMock(8, 1),
    findMany: createFindManyMock([
      {
        id: 300,
        organizationId: 2,
        store: { organizationId: 2 },
        user: { organizationId: 2 },
        provider: { organizationId: 5 },
      },
      {
        id: 301,
        organizationId: 3,
        store: { organizationId: 3 },
        user: { organizationId: 3 },
        provider: { organizationId: 3 },
      },
    ]),
  },
  provider: {
    count: createCountMock(5, 0),
    findMany: createFindManyMock([]),
  },
  sales: {
    count: createCountMock(10, 0),
    findMany: createFindManyMock([]),
  },
  transfer: {
    count: createCountMock(2, 0),
    findMany: createFindManyMock([]),
  },
  orders: {
    count: createCountMock(4, 0),
    findMany: createFindManyMock([]),
  },
  cashTransaction: {
    count: createCountMock(6, 0),
    findMany: createFindManyMock([]),
  },
  cashClosure: {
    count: createCountMock(3, 0),
    findMany: createFindManyMock([]),
  },
  $disconnect: jest.fn(async () => undefined),
});

describe('validateOrganizationIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('summarizes entities and logs warnings for missing organizationId values', async () => {
    const prisma = buildPrismaValidationMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const summary = await validateOrganizationIds({
      prisma: prisma as unknown as PrismaClient,
      logger,
      summaryStdout: true,
    });

    expect(summary.hasMissing).toBe(true);
    expect(summary.missingEntities).toEqual(['store', 'user', 'entry']);
    expect(summary.hasMismatched).toBe(true);
    expect(summary.mismatchedEntities).toEqual(['cash-register', 'client', 'entry']);
    expect(summary.processed['cash-register']?.mismatched).toBe(1);
    expect(summary.processed['cash-register']?.mismatchSample).toEqual([
      '11 (org=2 | refs=store:3)',
    ]);
    expect(summary.processed.entry?.mismatched).toBe(1);
    expect(summary.processed.entry?.mismatchSample).toEqual([
      '300 (org=2 | refs=store:2, user:2, provider:5)',
    ]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('store'));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('cash-register: detected 1 records'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('entry: detected 1 records'),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Summary JSON'),
      expect.any(String),
    );
    expect(prisma.$disconnect).not.toHaveBeenCalled();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('throws when failOnMissing is enabled and missing records are detected', async () => {
    const prisma = buildPrismaValidationMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await expect(
      validateOrganizationIds({
        prisma: prisma as unknown as PrismaClient,
        logger,
        failOnMissing: true,
      }),
    ).rejects.toThrow('[validate-org] Validation failed');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Validation failed'),
    );
  });

  it('throws when failOnMissing is enabled and only mismatches are detected', async () => {
    const prisma = buildPrismaValidationMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    prisma.store.count.mockResolvedValueOnce(5);
    prisma.store.count.mockResolvedValueOnce(0);
    prisma.cashRegister.count.mockResolvedValueOnce(4);
    prisma.cashRegister.count.mockResolvedValueOnce(0);

    await expect(
      validateOrganizationIds({
        prisma: prisma as unknown as PrismaClient,
        logger,
        failOnMissing: true,
        onlyEntities: ['cash-register'],
      }),
    ).rejects.toThrow('[validate-org] Validation failed');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('mismatched organizationId references'),
    );
  });

  it('respects entity filters when validating', async () => {
    const prisma = buildPrismaValidationMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await validateOrganizationIds({
      prisma: prisma as unknown as PrismaClient,
      logger,
      onlyEntities: ['store'],
    });

    expect(prisma.store.count).toHaveBeenCalledTimes(2);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('persists summary to disk when summaryPath is provided', async () => {
    const prisma = buildPrismaValidationMock();
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockedMkdir.mockResolvedValueOnce(undefined);
    mockedWriteFile.mockResolvedValueOnce(undefined);

    const summary = await validateOrganizationIds({
      prisma: prisma as unknown as PrismaClient,
      logger,
      summaryPath: '/tmp/validation.json',
    });

    expect(summary.summaryFilePath).toBe('/tmp/validation.json');
    expect(mockedMkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
    expect(mockedWriteFile).toHaveBeenCalledWith(
      '/tmp/validation.json',
      expect.any(String),
      'utf8',
    );
  });
});

describe('parseValidateOrganizationCliArgs', () => {
  it('parses list, boolean and summary options', () => {
    const options = parseValidateOrganizationCliArgs([
      '--only=store,user',
      '--skip=provider',
      '--summary-path',
      'report.json',
      '--summary-stdout=false',
      '--fail-on-missing',
    ]);

    expect(options).toEqual({
      onlyEntities: ['store', 'user'],
      skipEntities: ['provider'],
      summaryPath: 'report.json',
      summaryStdout: false,
      failOnMissing: true,
    });
  });

  it('throws on unknown flags', () => {
    expect(() => parseValidateOrganizationCliArgs(['--unknown'])).toThrow(
      '[validate-org] Unknown argument: --unknown',
    );
  });
});