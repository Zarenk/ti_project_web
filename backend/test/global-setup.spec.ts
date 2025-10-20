import { applyMultiTenantFixtures } from "prisma/seed/multi-tenant-fixtures.seed";
import globalSetup, {
  formatFixtureTotals,
  isRecoverablePrismaConnectionError,
  shouldSkipMultiTenantSeed,
} from "./global-setup";

jest.mock("prisma/seed/multi-tenant-fixtures.seed", () => ({
  applyMultiTenantFixtures: jest.fn(),
}));

describe('globalSetup multi-tenant fixtures orchestration', () => {
  const mockedApplyFixtures = applyMultiTenantFixtures as jest.MockedFunction<
    typeof applyMultiTenantFixtures
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SKIP_MULTI_TENANT_SEED;
    delete process.env.DATABASE_URL;
    delete process.env.MULTI_TENANT_FIXTURES_SUMMARY_PATH;
  });

  it.each([
    ['true', 'true'],
    ['TRUE', 'true'],
    [' TrUe ', 'true'],
    ['1', '1'],
    ['yes', 'yes'],
    ['YES', 'yes'],
    ['on', 'on'],
    ['ON', 'on'],
    [' y ', 'y'],
    ['T', 't'],
  ])(
    'skips fixture application when SKIP_MULTI_TENANT_SEED=%s',
    async (envValue, expectedLoggedValue) => {
      process.env.SKIP_MULTI_TENANT_SEED = envValue;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      await globalSetup();

      expect(mockedApplyFixtures).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        `[multi-tenant-seed] SKIP_MULTI_TENANT_SEED=${expectedLoggedValue} detected, skipping fixture application.`,
      );

      logSpy.mockRestore();
    },
  );

  it('warns and skips when DATABASE_URL is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await globalSetup();

    expect(mockedApplyFixtures).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[multi-tenant-seed] DATABASE_URL not set, skipping multi-tenant fixtures to avoid Prisma connection errors.',
    );

    warnSpy.mockRestore();
  });

  it('applies fixtures with a prefixed logger when configuration is valid', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    mockedApplyFixtures.mockResolvedValueOnce({
      processedAt: '2024-01-01T00:00:00.000Z',
      organizations: [
        {
          code: 'tenant-alpha',
          organizationId: 1,
          units: 2,
          stores: 1,
          providers: 1,
          users: 2,
          clients: 1,
          memberships: 2,
          products: 1,
          inventories: 1,
          storeOnInventories: 1,
          inventoryHistories: 1,
        },
      ],
      totals: {
        organizations: 1,
        units: 2,
        stores: 1,
        providers: 1,
        users: 2,
        clients: 1,
        memberships: 2,
        products: 1,
        inventories: 1,
        storeOnInventories: 1,
        inventoryHistories: 1,
      },
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await globalSetup();

    expect(mockedApplyFixtures).toHaveBeenCalledTimes(1);
    const [[callArgs]] = mockedApplyFixtures.mock.calls;
    expect(callArgs).toBeDefined();

    if (!callArgs) {
      throw new Error('applyMultiTenantFixtures should have been invoked once.');
    }

    expect(callArgs.logger).toBeInstanceOf(Function);
    expect(callArgs.summaryPath).toBeUndefined();

    callArgs.logger?.('fixtures ready');
    expect(logSpy).toHaveBeenCalledWith('[multi-tenant-seed] fixtures ready');
    expect(logSpy).toHaveBeenCalledWith(
      '[multi-tenant-seed] Processed organizations: tenant-alpha',
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[multi-tenant-seed] Fixture totals => organizations: 1, units: 2, stores: 1, providers: 1, users: 2, clients: 1, memberships: 2, products: 1, inventories: 1, storeOnInventories: 1, inventoryHistories: 1.',
    );

    logSpy.mockRestore();
  });

  it('passes summaryPath to the fixture helper when configured via environment variable', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.MULTI_TENANT_FIXTURES_SUMMARY_PATH = './tmp/fixtures-summary.json';
    mockedApplyFixtures.mockResolvedValueOnce({
      processedAt: '2024-01-02T00:00:00.000Z',
      organizations: [],
      totals: {
        organizations: 0,
        units: 0,
        stores: 0,
        providers: 0,
        users: 0,
        clients: 0,
        memberships: 0,
        products: 0,
        inventories: 0,
        storeOnInventories: 0,
        inventoryHistories: 0,
      },
      summaryFilePath: './tmp/fixtures-summary.json',
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await globalSetup();

    expect(mockedApplyFixtures).toHaveBeenCalledTimes(1);
    const [[callArgs]] = mockedApplyFixtures.mock.calls;
    expect(callArgs?.summaryPath).toBe('./tmp/fixtures-summary.json');
    expect(logSpy).toHaveBeenCalledWith(
      '[multi-tenant-seed] Summary file available at ./tmp/fixtures-summary.json.',
    );
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Fixture totals =>'),
    );

    logSpy.mockRestore();
  });

  it('logs a warning and swallows recoverable Prisma errors', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    mockedApplyFixtures.mockRejectedValueOnce({
      errorCode: 'P1001',
      message: "Can't reach database server",
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(globalSetup()).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply fixtures due to a database connectivity issue'),
    );

    warnSpy.mockRestore();
  });

  it('rethrows non-recoverable errors from fixture application', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    mockedApplyFixtures.mockRejectedValueOnce(new Error('unexpected failure'));

    await expect(globalSetup()).rejects.toThrow('unexpected failure');
  });

  afterAll(() => {
    delete process.env.SKIP_MULTI_TENANT_SEED;
    delete process.env.DATABASE_URL;
    delete process.env.MULTI_TENANT_FIXTURES_SUMMARY_PATH;
  });
});

describe('shouldSkipMultiTenantSeed', () => {
  it('returns false when flag is undefined or empty', () => {
    expect(shouldSkipMultiTenantSeed(undefined)).toBe(false);
    expect(shouldSkipMultiTenantSeed(null)).toBe(false);
    expect(shouldSkipMultiTenantSeed('')).toBe(false);
    expect(shouldSkipMultiTenantSeed('   ')).toBe(false);
  });

  it('returns true for any supported truthy value regardless of case and spacing', () => {
    const truthyValues = ['true', 'TRUE', '  TrUe  ', '1', 'yes', 'YES', 'on', 'ON', ' y ', 'T'];
    for (const value of truthyValues) {
      expect(shouldSkipMultiTenantSeed(value)).toBe(true);
    }
  });

  it('returns false for any other value', () => {
    ['false', '0', 'no', 'off', 'skip', 'apply'].forEach((value) => {
      expect(shouldSkipMultiTenantSeed(value)).toBe(false);
    });
  });
});

describe('isRecoverablePrismaConnectionError', () => {
  it('returns true when Prisma error codes indicate connectivity issues', () => {
    expect(isRecoverablePrismaConnectionError({ errorCode: 'P1001' })).toBe(true);
    expect(isRecoverablePrismaConnectionError({ code: 'P1001' })).toBe(true);
    expect(
      isRecoverablePrismaConnectionError(new Error("Can't reach database server")),
    ).toBe(true);
  });

  it('returns true when error message hints connectivity problems even without Prisma code', () => {
    const cases = [
      new Error('ECONNREFUSED connection attempt failed'),
      new Error('Timed out waiting for database'),
      new Error('Failed to connect to postgres instance'),
    ];

    for (const error of cases) {
      expect(isRecoverablePrismaConnectionError(error)).toBe(true);
    }
  });

  it('returns false for unrelated errors', () => {
    expect(isRecoverablePrismaConnectionError(new Error('Validation failed'))).toBe(
      false,
    );
    expect(isRecoverablePrismaConnectionError({})).toBe(false);
    expect(isRecoverablePrismaConnectionError(null)).toBe(false);
    expect(isRecoverablePrismaConnectionError(undefined)).toBe(false);
  });
});

describe('formatFixtureTotals', () => {
  it('returns null when totals are undefined, null or empty', () => {
    expect(formatFixtureTotals(undefined)).toBeNull();
    expect(formatFixtureTotals(null)).toBeNull();
    expect(formatFixtureTotals({})).toBeNull();
    expect(formatFixtureTotals({ organizations: 0, users: 0 })).toBeNull();
  });

  it('formats totals by skipping zero or non-positive values', () => {
    const formatted = formatFixtureTotals({
      organizations: 2,
      users: 5,
      clients: 0,
      stores: -1,
    });

    expect(formatted).toBe('organizations: 2, users: 5');
  });
});