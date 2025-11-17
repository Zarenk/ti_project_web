import { PrismaClient } from '@prisma/client';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type AuditDefinition = {
  name: string;
  model: keyof PrismaClient;
  organizationField?: string;
  companyField?: string;
};

type AuditResult = {
  entity: string;
  total: number;
  missingOrg?: number;
  wrongOrg?: number;
  missingCompany?: number;
  wrongCompany?: number;
};

type CliOptions = {
  organizationId?: number;
  organizationCode?: string;
  companyId?: number;
  companyName?: string;
};

const AUDIT_ENTITIES: AuditDefinition[] = [
  {
    name: 'Store',
    model: 'store',
    organizationField: 'organizationId',
    companyField: 'companyId',
  },
  { name: 'Entry', model: 'entry', organizationField: 'organizationId' },
  { name: 'Inventory', model: 'inventory', organizationField: 'organizationId' },
  {
    name: 'InventoryHistory',
    model: 'inventoryHistory',
    organizationField: 'organizationId',
  },
  { name: 'Sales', model: 'sales', organizationField: 'organizationId' },
  { name: 'Orders', model: 'orders', organizationField: 'organizationId' },
  {
    name: 'CashTransaction',
    model: 'cashTransaction',
    organizationField: 'organizationId',
  },
  {
    name: 'CashClosure',
    model: 'cashClosure',
    organizationField: 'organizationId',
  },
  {
    name: 'Category',
    model: 'category',
    organizationField: 'organizationId',
    companyField: 'companyId',
  },
  {
    name: 'Product',
    model: 'product',
    organizationField: 'organizationId',
    companyField: 'companyId',
  },
];

function parsePositiveInt(flag: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[tenancy-audit] ${flag} must be a positive integer.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--org-id=')) {
      const [, raw] = arg.split('=');
      options.organizationId = parsePositiveInt('--org-id', raw);
      continue;
    }
    if (arg === '--org-id') {
      options.organizationId = parsePositiveInt(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--org-code=')) {
      const [, raw] = arg.split('=');
      options.organizationCode = raw?.trim();
      continue;
    }
    if (arg === '--org-code') {
      options.organizationCode = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--company-id=')) {
      const [, raw] = arg.split('=');
      options.companyId = parsePositiveInt('--company-id', raw);
      continue;
    }
    if (arg === '--company-id') {
      options.companyId = parsePositiveInt(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--company-name=')) {
      const [, raw] = arg.split('=');
      options.companyName = raw?.trim();
      continue;
    }
    if (arg === '--company-name') {
      options.companyName = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[tenancy-audit] Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function resolveOrganizationId(
  prisma: PrismaClient,
  options: CliOptions,
): Promise<number> {
  if (options.organizationId) {
    return options.organizationId;
  }
  if (options.organizationCode) {
    const organization = await prisma.organization.findFirst({
      where: { code: options.organizationCode },
      select: { id: true },
    });
    if (!organization) {
      throw new Error(
        `[tenancy-audit] Organization with code "${options.organizationCode}" not found.`,
      );
    }
    return organization.id;
  }
  throw new Error(
    '[tenancy-audit] Provide --org-id or --org-code to run the audit.',
  );
}

async function resolveCompanyId(
  prisma: PrismaClient,
  organizationId: number,
  options: CliOptions,
): Promise<number | null> {
  if (options.companyId) {
    return options.companyId;
  }
  if (options.companyName) {
    const company = await prisma.company.findFirst({
      where: { organizationId, name: options.companyName },
      select: { id: true },
    });
    if (!company) {
      throw new Error(
        `[tenancy-audit] Company "${options.companyName}" not found for organization ${organizationId}.`,
      );
    }
    return company.id;
  }
  return null;
}

async function auditEntity(
  prisma: PrismaClient,
  definition: AuditDefinition,
  organizationId: number,
  companyId: number | null,
): Promise<AuditResult> {
  const model = (prisma as any)[definition.model];
  if (!model?.count) {
    throw new Error(
      `[tenancy-audit] Prisma model "${String(definition.model)}" is not available.`,
    );
  }

  const orgField = definition.organizationField;
  const companyField = definition.companyField;

  const total = await model.count();

  const missingOrg =
    orgField !== undefined
      ? await model.count({ where: { [orgField]: null } })
      : undefined;

  const wrongOrg =
    orgField !== undefined
      ? await model.count({
          where: {
            AND: [
              { [orgField]: { not: null } },
              { [orgField]: { not: organizationId } },
            ],
          },
        })
      : undefined;

  const missingCompany =
    companyField !== undefined && companyId !== null
      ? await model.count({
          where: {
            ...(orgField ? { [orgField]: organizationId } : {}),
            [companyField]: null,
          },
        })
      : undefined;

  const wrongCompany =
    companyField !== undefined && companyId !== null
      ? await model.count({
          where: {
            ...(orgField ? { [orgField]: organizationId } : {}),
            AND: [
              { [companyField]: { not: null } },
              { [companyField]: { not: companyId } },
            ],
          },
        })
      : undefined;

  return {
    entity: definition.name,
    total,
    missingOrg,
    wrongOrg,
    missingCompany,
    wrongCompany,
  };
}

function printResult(result: AuditResult, logger: Logger): boolean {
  const issues: string[] = [];

  if (result.missingOrg && result.missingOrg > 0) {
    issues.push(`missingOrg=${result.missingOrg}`);
  }
  if (result.wrongOrg && result.wrongOrg > 0) {
    issues.push(`wrongOrg=${result.wrongOrg}`);
  }
  if (result.missingCompany && result.missingCompany > 0) {
    issues.push(`missingCompany=${result.missingCompany}`);
  }
  if (result.wrongCompany && result.wrongCompany > 0) {
    issues.push(`wrongCompany=${result.wrongCompany}`);
  }

  if (issues.length === 0) {
    logger.info(
      `[tenancy-audit] ${result.entity}: OK (total=${result.total}).`,
    );
    return false;
  }

  logger.warn(
    `[tenancy-audit] ${result.entity}: issues detected (${issues.join(', ')}). total=${result.total}`,
  );
  return true;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const logger: Logger = console;

  try {
    const organizationId = await resolveOrganizationId(prisma, options);
    const companyId = await resolveCompanyId(prisma, organizationId, options);

    logger.info(
      `[tenancy-audit] Running audit for organizationId=${organizationId}${
        companyId ? ` companyId=${companyId}` : ''
      }.`,
    );

    let hasIssues = false;
    const results: AuditResult[] = [];

    for (const definition of AUDIT_ENTITIES) {
      const result = await auditEntity(
        prisma,
        definition,
        organizationId,
        companyId,
      );
      results.push(result);
      hasIssues = printResult(result, logger) || hasIssues;
    }

    logger.info(
      '[tenancy-audit] Completed. Entities audited:',
      results.length,
    );

    if (hasIssues) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('[tenancy-audit] Failed to run audit.', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
