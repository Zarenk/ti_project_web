import { PrismaClient } from '@prisma/client';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type SeedOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  organizationId?: number;
  organizationCode?: string;
  companyId?: number;
  companyName?: string;
  legalName?: string;
  taxId?: string;
  status?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

function parsePositiveInt(flag: string, raw: string | undefined): number {
  const parsed = Number(raw);
  if (!raw || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[ensure-company] ${flag} must be a positive integer`);
  }
  return parsed;
}

export function parseEnsureCompanyArgs(argv: string[]): SeedOptions {
  const options: SeedOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--organization-id=')) {
      const [, raw] = arg.split('=');
      options.organizationId = parsePositiveInt('--organization-id', raw);
      continue;
    }
    if (arg === '--organization-id') {
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

    if (arg.startsWith('--legal-name=')) {
      const [, raw] = arg.split('=');
      options.legalName = raw?.trim();
      continue;
    }
    if (arg === '--legal-name') {
      options.legalName = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--tax-id=')) {
      const [, raw] = arg.split('=');
      options.taxId = raw?.trim();
      continue;
    }
    if (arg === '--tax-id') {
      options.taxId = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--status=')) {
      const [, raw] = arg.split('=');
      options.status = raw?.trim();
      continue;
    }
    if (arg === '--status') {
      options.status = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--primary-color=')) {
      const [, raw] = arg.split('=');
      options.primaryColor = raw?.trim();
      continue;
    }
    if (arg === '--primary-color') {
      options.primaryColor = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--secondary-color=')) {
      const [, raw] = arg.split('=');
      options.secondaryColor = raw?.trim();
      continue;
    }
    if (arg === '--secondary-color') {
      options.secondaryColor = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[ensure-company] Unknown argument: ${arg}`);
    }
  }

  return options;
}

async function resolveOrganizationId(
  prisma: PrismaClient,
  options: SeedOptions,
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
        `[ensure-company] Organization with code "${options.organizationCode}" not found.`,
      );
    }
    return organization.id;
  }

  throw new Error(
    '[ensure-company] Provide --organization-id or --org-code to identify the tenant.',
  );
}

export async function ensureCompany(options: SeedOptions): Promise<void> {
  const prisma = options.prisma ?? new PrismaClient();
  const logger = options.logger ?? console;

  try {
    const organizationId = await resolveOrganizationId(prisma, options);
    const name = options.companyName?.trim();

    if (!name) {
      throw new Error('[ensure-company] Provide --company-name to continue.');
    }

    const uniqueWhere = {
      organizationId_name: {
        organizationId,
        name,
      },
    };

    const payload = {
      organizationId,
      name,
      legalName: options.legalName ?? name,
      taxId: options.taxId ?? null,
      status: options.status ?? 'ACTIVE',
      primaryColor: options.primaryColor ?? null,
      secondaryColor: options.secondaryColor ?? null,
    };

    const saved = await prisma.company.upsert({
      where: uniqueWhere,
      update: payload,
      create: payload,
    });

    logger.info(
      `[ensure-company] Ensured company "${saved.name}" (id=${saved.id}) for organization ${organizationId}.`,
    );
  } finally {
    if (!options.prisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  try {
    const options = parseEnsureCompanyArgs(process.argv.slice(2));
    ensureCompany(options).catch((error) => {
      console.error('[ensure-company] Failed to ensure company.', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('[ensure-company] Failed to parse arguments.', error);
    process.exit(1);
  }
}
