import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type SeedOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  organizationId?: number;
  organizationCode?: string;
  companyId?: number | null;
  companyName?: string;
  tenantKey?: string;
  data?: unknown;
  dataPath?: string;
  allowMissingCompany?: boolean;
};

function parseNumericFlag(flag: string, value: string | undefined): number {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`[ensure-site-settings] ${flag} must be a positive integer`);
  }
  return parsed;
}

async function loadDataFromPath(pathValue: string | undefined): Promise<unknown> {
  if (!pathValue) {
    return undefined;
  }
  const contents = await readFile(pathValue, 'utf8');
  return JSON.parse(contents);
}

export async function parseCliArgs(argv: string[]): Promise<SeedOptions> {
  const options: SeedOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg.startsWith('--organization-id=')) {
      const [, value] = arg.split('=');
      options.organizationId = parseNumericFlag('--organization-id', value);
      continue;
    }
    if (arg === '--organization-id') {
      options.organizationId = parseNumericFlag(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--org-code=')) {
      const [, value] = arg.split('=');
      options.organizationCode = value?.trim();
      continue;
    }
    if (arg === '--org-code') {
      options.organizationCode = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--company-id=')) {
      const [, value] = arg.split('=');
      options.companyId = parseNumericFlag('--company-id', value);
      continue;
    }
    if (arg === '--company-id') {
      options.companyId = parseNumericFlag(arg, argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--company-name=')) {
      const [, value] = arg.split('=');
      options.companyName = value?.trim();
      continue;
    }
    if (arg === '--company-name') {
      options.companyName = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--tenant-key=')) {
      const [, value] = arg.split('=');
      options.tenantKey = value?.trim();
      continue;
    }
    if (arg === '--tenant-key') {
      options.tenantKey = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg.startsWith('--data=')) {
      const [, value] = arg.split('=');
      options.data = value ? JSON.parse(value) : undefined;
      continue;
    }
    if (arg === '--data') {
      const raw = argv[index + 1];
      options.data = raw ? JSON.parse(raw) : undefined;
      index += 1;
      continue;
    }

    if (arg.startsWith('--data-path=')) {
      const [, value] = arg.split('=');
      options.dataPath = value?.trim();
      continue;
    }
    if (arg === '--data-path') {
      options.dataPath = argv[index + 1]?.trim();
      index += 1;
      continue;
    }

    if (arg === '--allow-missing-company') {
      options.allowMissingCompany = true;
      continue;
    }
    if (arg.startsWith('--allow-missing-company=')) {
      const [, raw] = arg.split('=');
      const normalized = raw?.toLowerCase();
      options.allowMissingCompany =
        normalized === '1' ||
        normalized === 'true' ||
        normalized === 'yes';
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[ensure-site-settings] Unknown argument: ${arg}`);
    }
  }

  if (!options.data && options.dataPath) {
    options.data = await loadDataFromPath(options.dataPath);
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
        `[ensure-site-settings] Organization with code "${options.organizationCode}" not found.`,
      );
    }
    return organization.id;
  }

  throw new Error(
    '[ensure-site-settings] Provide --organization-id or --org-code to identify the tenant.',
  );
}

async function resolveCompanyId(
  prisma: PrismaClient,
  organizationId: number,
  options: SeedOptions,
  logger: Logger,
): Promise<number | null> {
  if (typeof options.companyId === 'number') {
    return options.companyId;
  }

  if (options.companyName) {
    const company = await prisma.company.findFirst({
      where: {
        organizationId,
        name: options.companyName,
      },
      select: { id: true },
    });
    if (!company) {
      if (options.allowMissingCompany) {
        logger.warn(
          `[ensure-site-settings] Company "${options.companyName}" not found for organization ${organizationId}. Continuing without company.`,
        );
        return null;
      }
      throw new Error(
        `[ensure-site-settings] Company "${options.companyName}" not found for organization ${organizationId}.`,
      );
    }
    return company.id;
  }

  return null;
}

export async function ensureSiteSettings(options: SeedOptions): Promise<void> {
  const prisma = options.prisma ?? new PrismaClient();
  const logger = options.logger ?? console;

  try {
    const organizationId = await resolveOrganizationId(prisma, options);
    const companyId = await resolveCompanyId(prisma, organizationId, options, logger);
    const tenantKey =
      options.tenantKey ??
      `org:${organizationId}|company:${companyId ?? 0}`;
    const data = options.data ?? {};

    const saved = await prisma.siteSettings.upsert({
      where: { tenantKey },
      update: {
        organizationId,
        companyId,
        data,
      },
      create: {
        tenantKey,
        organizationId,
        companyId,
        data,
      },
    });

    logger.info(
      `[ensure-site-settings] Ensured site settings (id=${saved.id}) for tenantKey=${tenantKey}.`,
    );
  } finally {
    if (!options.prisma) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  parseCliArgs(process.argv.slice(2))
    .then((cliOptions) => ensureSiteSettings(cliOptions))
    .catch((error) => {
      console.error('[ensure-site-settings] Failed to ensure site settings.', error);
      process.exit(1);
    });
}
