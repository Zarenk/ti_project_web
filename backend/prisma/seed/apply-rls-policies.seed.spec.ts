import { mkdir, writeFile } from 'node:fs/promises';
import type { PrismaClient } from '@prisma/client';
import {
  applyRlsPolicies,
  parseApplyRlsCliArgs,
} from './apply-rls-policies.seed';

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(() => Promise.resolve(undefined)),
  writeFile: jest.fn(() => Promise.resolve(undefined)),
}));

const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

const createMockPrisma = () => ({
  $executeRawUnsafe: jest.fn(),
  $disconnect: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedMkdir.mockClear();
  mockedWriteFile.mockClear();
});

describe('applyRlsPolicies', () => {
  it('enables policies for selected entities', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const result = await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: ['store'],
      policyPrefix: 'rls_demo',
      policyRoles: ['app_user'],
      sessionVariable: 'app.tenant',
    });

    expect(result.statements).toHaveLength(1);
    const [entry] = result.statements;
    expect(entry.entity).toBe('store');
    expect(entry.applied).toEqual([
      'DROP POLICY IF EXISTS "rls_demo_store" ON "Store"',
      'ALTER TABLE "Store" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE "Store" NO FORCE ROW LEVEL SECURITY',
      'CREATE POLICY "rls_demo_store" ON "Store" FOR ALL TO app_user USING (NULLIF(current_setting(\'app.tenant\', true), \'\') IS NULL OR "organizationId" IS NULL OR "organizationId" = (NULLIF(current_setting(\'app.tenant\', true), \'\'))::int) WITH CHECK (NULLIF(current_setting(\'app.tenant\', true), \'\') IS NULL OR "organizationId" IS NULL OR "organizationId" = (NULLIF(current_setting(\'app.tenant\', true), \'\'))::int)',
    ]);

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(4);
    expect(logger.warn).not.toHaveBeenCalled();

    expect(result.summary.totalStatements).toBe(4);
    expect(result.summary.entries).toHaveLength(1);
    expect(result.summary.entries[0]).toMatchObject({
      entity: 'store',
      statementCount: 4,
    });
  });

  it('forces policies when requested', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: ['sales'],
      force: true,
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'ALTER TABLE "Sales" FORCE ROW LEVEL SECURITY',
    );
  });

  it('disables policies when configured', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: ['client'],
      disable: true,
    });

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'DROP POLICY IF EXISTS "rls_org_client" ON "Client"',
    );
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'ALTER TABLE "Client" DISABLE ROW LEVEL SECURITY',
    );
  });

  it('logs statements without executing when dry-run is set', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: ['orders'],
      dryRun: true,
    });

    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('(dry-run)'),
    );
  });

  it('persists and prints the summary when configured', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);

    const result = await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: ['store', 'client'],
      summaryPath: '/tmp/rls-summary.json',
      summaryStdout: true,
    });

    expect(mockedMkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
    expect(mockedWriteFile).toHaveBeenCalledTimes(1);
    const [, payload, encoding] = mockedWriteFile.mock.calls[0];
    expect(encoding).toBe('utf8');

    const parsed = JSON.parse(payload as string);
    expect(parsed.totalStatements).toBe(8);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]).toMatchObject({
      entity: 'store',
      statementCount: 4,
    });

    expect(result.summary.summaryFilePath).toBe('/tmp/rls-summary.json');
    expect(
      logger.info.mock.calls.some(
        ([message]) => message === '[apply-rls] Summary JSON:',
      ),
    ).toBe(true);
  });

  it('warns when no entities are matched', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const result = await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: [],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      '[apply-rls] No entities matched the provided filters.',
    );
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(result.summary.totalStatements).toBe(0);
  });
});

describe('parseApplyRlsCliArgs', () => {
  it('parses boolean flags and filters', () => {
    const options = parseApplyRlsCliArgs([
      '--dry-run=false',
      '--disable',
      '--force=yes',
      '--only=store,client',
      '--skip=client',
      '--policy-prefix=rls_stage',
      '--session-variable=app.org',
      '--roles=tenant_user,readonly',
    ]);

    expect(options.dryRun).toBe(false);
    expect(options.disable).toBe(true);
    expect(options.force).toBe(true);
    expect(options.onlyEntities).toEqual(['store', 'client']);
    expect(options.skipEntities).toEqual(['client']);
    expect(options.policyPrefix).toBe('rls_stage');
    expect(options.sessionVariable).toBe('app.org');
    expect(options.policyRoles).toEqual(['tenant_user', 'readonly']);
  });

  it('supports boolean flags without explicit values', () => {
    const options = parseApplyRlsCliArgs([
      '--dry-run',
      '--disable=no',
      '--force',
    ]);

    expect(options.dryRun).toBe(true);
    expect(options.disable).toBe(false);
    expect(options.force).toBe(true);
  });

  it('parses summary path and stdout flags', () => {
    const options = parseApplyRlsCliArgs([
      '--summary-path',
      'out/summary.json',
      '--summary-stdout=no',
      '--summaryStdout',
    ]);

    expect(options.summaryPath).toBe('out/summary.json');
    expect(options.summaryStdout).toBe(true);
  });
});