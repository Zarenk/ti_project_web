import type { PrismaClient } from '@prisma/client';
import {
  applyRlsPolicies,
  parseApplyRlsCliArgs,
} from './apply-rls-policies.seed';

const createMockPrisma = () => ({
  $executeRawUnsafe: jest.fn(),
  $disconnect: jest.fn(),
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

  it('warns when no entities are matched', async () => {
    const prisma = createMockPrisma() as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

    await applyRlsPolicies({
      prisma,
      logger,
      onlyEntities: [],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      '[apply-rls] No entities matched the provided filters.',
    );
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
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
});