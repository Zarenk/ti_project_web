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

type PrismaValidationMock = {
  store: { count: CountMock };
  cashRegister: { count: CountMock };
  user: { count: CountMock };
  client: { count: CountMock };
  inventory: { count: CountMock };
  inventoryHistory: { count: CountMock };
  entry: { count: CountMock };
  provider: { count: CountMock };
  sales: { count: CountMock };
  transfer: { count: CountMock };
  orders: { count: CountMock };
  cashTransaction: { count: CountMock };
  cashClosure: { count: CountMock };
  $disconnect: jest.Mock<Promise<void>, []>;
};

const createCountMock = (total: number, missing: number): CountMock =>
  jest.fn(async (args?: any) => (args?.where?.organizationId === null ? missing : total));

const buildPrismaValidationMock = (): PrismaValidationMock => ({
  store: { count: createCountMock(5, 2) },
  cashRegister: { count: createCountMock(4, 0) },
  user: { count: createCountMock(6, 1) },
  client: { count: createCountMock(7, 0) },
  inventory: { count: createCountMock(3, 0) },
  inventoryHistory: { count: createCountMock(9, 0) },
  entry: { count: createCountMock(8, 1) },
  provider: { count: createCountMock(5, 0) },
  sales: { count: createCountMock(10, 0) },
  transfer: { count: createCountMock(2, 0) },
  orders: { count: createCountMock(4, 0) },
  cashTransaction: { count: createCountMock(6, 0) },
  cashClosure: { count: createCountMock(3, 0) },
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
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('store'));
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