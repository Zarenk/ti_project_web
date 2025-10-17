import { applyMultiTenantFixtures } from "prisma/seed/multi-tenant-fixtures.seed";
import globalSetup from "./global-setup";

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
  });

  it('skips fixture application when SKIP_MULTI_TENANT_SEED is true', async () => {
    process.env.SKIP_MULTI_TENANT_SEED = 'true';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await globalSetup();

    expect(mockedApplyFixtures).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      '[multi-tenant-seed] SKIP_MULTI_TENANT_SEED=true detected, skipping fixture application.',
    );

    logSpy.mockRestore();
  });

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
    mockedApplyFixtures.mockResolvedValueOnce();

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await globalSetup();

    expect(mockedApplyFixtures).toHaveBeenCalledTimes(1);
    const [[callArgs]] = mockedApplyFixtures.mock.calls;
    expect(callArgs).toBeDefined();

    if (!callArgs) {
      throw new Error('applyMultiTenantFixtures should have been invoked once.');
    }

    expect(callArgs.logger).toBeInstanceOf(Function);

    callArgs.logger?.('fixtures ready');
    expect(logSpy).toHaveBeenCalledWith('[multi-tenant-seed] fixtures ready');

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
  });
});