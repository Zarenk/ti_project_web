import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

type OrganizationUnitFixture = {
  code: string;
  name: string;
  parentCode?: string;
};

type StoreFixture = {
  name: string;
  status?: string;
  phone?: string;
  adress?: string;
  email?: string;
  website?: string;
};

type ProviderFixture = {
  name: string;
  document: string;
  documentNumber: string;
  phone?: string;
  adress?: string;
  email?: string;
  website?: string;
  status?: string;
};

type UserClientFixture = {
  name: string;
  typeNumber: string;
  type?: string;
  phone?: string;
  adress?: string;
  email?: string;
};

type UserFixture = {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  status?: string;
  membershipUnitCode?: string;
  membershipRole?: MembershipRole;
  membershipDefault?: boolean;
  client?: UserClientFixture;
};

type MembershipRole = 'OWNER' | 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'VIEWER';

type PrismaSeedClient = PrismaClient & Record<string, any>;

type ProductAllocation = {
  storeName: string;
  stock: number;
};

type ProductFixture = {
  name: string;
  category: string;
  price: number;
  description?: string;
  barcode?: string;
  priceSell?: number;
  allocations: ProductAllocation[];
};

type OrganizationFixture = {
  code: string;
  name: string;
  status?: string;
  units: OrganizationUnitFixture[];
  stores: StoreFixture[];
  providers: ProviderFixture[];
  users: UserFixture[];
  products?: ProductFixture[];
};

type OrganizationFixtureSummary = {
  code: string;
  organizationId: number;
  units: number;
  stores: number;
  providers: number;
  users: number;
  clients: number;
  memberships: number;
  products: number;
  inventories: number;
  storeOnInventories: number;
  inventoryHistories: number;
};

type FixtureTotals = {
  organizations: number;
  units: number;
  stores: number;
  providers: number;
  users: number;
  clients: number;
  memberships: number;
  products: number;
  inventories: number;
  storeOnInventories: number;
  inventoryHistories: number;
};

type MultiTenantFixtureSummary = {
  processedAt: string;
  organizations: OrganizationFixtureSummary[];
  totals: FixtureTotals;
  summaryFilePath?: string;
};

const seedOrganizations: OrganizationFixture[] = [
  {
    code: 'tenant-alpha',
    name: 'Tenant Alpha',
    status: 'ACTIVE',
    units: [
      { code: 'alpha-hq', name: 'Alpha HQ' },
      { code: 'alpha-retail', name: 'Alpha Retail', parentCode: 'alpha-hq' },
    ],
    stores: [
      {
        name: 'Alpha Central Store',
        status: 'ACTIVE',
        phone: '+51 900 111 222',
        adress: 'Av. Principal 123, Lima',
        email: 'central@alpha.example.com',
        website: 'https://alpha.example.com',
      },
    ],
    providers: [
      {
        name: 'Alpha Supplies',
        document: 'RUC',
        documentNumber: '20123456789',
        phone: '+51 900 222 333',
        adress: 'Jr. Comercio 456, Lima',
        email: 'proveedores@alpha.example.com',
        website: 'https://supplies.alpha.example.com',
        status: 'ACTIVE',
      },
    ],
    users: [
      {
        email: 'admin@alpha.example.com',
        username: 'alpha.admin',
        password: 'seeded-password',
        role: UserRole.SUPER_ADMIN_ORG,
        status: 'ACTIVO',
        membershipUnitCode: 'alpha-hq',
        membershipRole: 'SUPER_ADMIN',
        membershipDefault: true,
      },
      {
        email: 'cliente@alpha.example.com',
        username: 'alpha.client',
        password: 'seeded-password',
        role: UserRole.CLIENT,
        status: 'ACTIVO',
        membershipUnitCode: 'alpha-retail',
        membershipRole: 'MEMBER',
        membershipDefault: false,
        client: {
          name: 'Alpha Cliente',
          typeNumber: 'ALPHA-CLI-001',
          type: 'PERSON',
          phone: '+51 900 333 444',
          adress: 'Av. Comercio 789, Lima',
          email: 'cliente@alpha.example.com',
        },
      },
    ],
    products: [
      {
        name: 'Alpha Laptop 13"',
        category: 'Electrónicos',
        price: 1299.99,
        description: 'Laptop empresarial multi-tenant',
        barcode: 'ALPHA-LAPTOP-13',
        allocations: [
          { storeName: 'Alpha Central Store', stock: 25 },
        ],
      },
    ],
  },
  {
    code: 'tenant-beta',
    name: 'Tenant Beta',
    status: 'ACTIVE',
    units: [
      { code: 'beta-hq', name: 'Beta HQ' },
      { code: 'beta-store', name: 'Beta Storefront', parentCode: 'beta-hq' },
    ],
    stores: [
      {
        name: 'Beta Downtown Store',
        status: 'ACTIVE',
        phone: '+51 901 444 555',
        adress: 'Av. Tecnológica 987, Arequipa',
        email: 'downtown@beta.example.com',
        website: 'https://beta.example.com',
      },
    ],
    providers: [
      {
        name: 'Beta Imports',
        document: 'RUC',
        documentNumber: '20987654321',
        phone: '+51 901 555 666',
        adress: 'Jr. Industrias 321, Arequipa',
        email: 'proveedores@beta.example.com',
        website: 'https://imports.beta.example.com',
        status: 'ACTIVE',
      },
    ],
    users: [
      {
        email: 'admin@beta.example.com',
        username: 'beta.admin',
        password: 'seeded-password',
        role: UserRole.SUPER_ADMIN_ORG,
        status: 'ACTIVO',
        membershipUnitCode: 'beta-hq',
        membershipRole: 'SUPER_ADMIN',
        membershipDefault: true,
      },
      {
        email: 'cliente@beta.example.com',
        username: 'beta.client',
        password: 'seeded-password',
        role: UserRole.CLIENT,
        status: 'ACTIVO',
        membershipUnitCode: 'beta-store',
        membershipRole: 'MEMBER',
        membershipDefault: false,
        client: {
          name: 'Beta Cliente',
          typeNumber: 'BETA-CLI-001',
          type: 'PERSON',
          phone: '+51 901 777 888',
          adress: 'Av. Digital 654, Arequipa',
          email: 'cliente@beta.example.com',
        },
      },
    ],
    products: [
      {
        name: 'Beta Monitor 27"',
        category: 'Periféricos',
        price: 499.5,
        description: 'Monitor profesional multi-tenant',
        barcode: 'BETA-MONITOR-27',
        allocations: [
          { storeName: 'Beta Downtown Store', stock: 40 },
        ],
      },
    ],
  },
];

const FIXTURE_ORGANIZATION_CODES = new Set(
  seedOrganizations.map((organization) => organization.code),
);

async function ensureOrganization(
  prisma: PrismaSeedClient,
  fixture: OrganizationFixture,
  categoriesByOrganization: Map<string, Map<string, number>>,
  logger: (message: string) => void,
) {
  const organization = await prisma.organization.upsert({
    where: { code: fixture.code },
    update: {
      name: fixture.name,
      status: fixture.status ?? 'ACTIVE',
    },
    create: {
      code: fixture.code,
      name: fixture.name,
      status: fixture.status ?? 'ACTIVE',
    },
  });

  const summary: OrganizationFixtureSummary = {
    code: fixture.code,
    organizationId: organization.id,
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
  };

  const unitIds = new Map<string, number>();
  for (const unit of fixture.units) {
    const parentId = unit.parentCode ? unitIds.get(unit.parentCode) ?? null : null;
    if (unit.parentCode && !unitIds.has(unit.parentCode)) {
      throw new Error(
        `Parent unit with code ${unit.parentCode} must be declared before children in organization ${fixture.code}`,
      );
    }

    const uniqueWhere = unit.code
      ? {
          organizationId_code: {
            organizationId: organization.id,
            code: unit.code,
          },
        }
      : {
          organizationId_name: {
            organizationId: organization.id,
            name: unit.name,
          },
        };

    const savedUnit = await prisma.organizationUnit.upsert({
      where: uniqueWhere,
      update: {
        name: unit.name,
        status: 'ACTIVE',
        parentUnitId: parentId,
      },
      create: {
        organizationId: organization.id,
        code: unit.code ?? null,
        name: unit.name,
        status: 'ACTIVE',
        parentUnitId: parentId,
      },
    });

    if (unit.code) {
      unitIds.set(unit.code, savedUnit.id);
    }
    unitIds.set(unit.name, savedUnit.id);
    summary.units += 1;
  }

  const storeIds = new Map<string, number>();
  for (const store of fixture.stores) {
    const savedStore = await prisma.store.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: store.name,
        },
      },
      update: {
        status: store.status ?? 'ACTIVE',
        phone: store.phone ?? null,
        adress: store.adress ?? null,
        email: store.email ?? null,
        website: store.website ?? null,
      } as any,
      create: {
        name: store.name,
        status: store.status ?? 'ACTIVE',
        phone: store.phone ?? null,
        adress: store.adress ?? null,
        email: store.email ?? null,
        website: store.website ?? null,
        organizationId: organization.id,
      } as any,
    });

    storeIds.set(store.name, savedStore.id);
    summary.stores += 1;
  }

  for (const provider of fixture.providers) {
    await prisma.provider.upsert({
      where: {
        organizationId_documentNumber: {
          organizationId: organization.id,
          documentNumber: provider.documentNumber,
        },
      },
      update: {
        name: provider.name,
        document: provider.document,
        phone: provider.phone ?? null,
        adress: provider.adress ?? null,
        email: provider.email ?? null,
        website: provider.website ?? null,
        status: provider.status ?? 'ACTIVE',
        organizationId: organization.id,
      } as any,
      create: {
        name: provider.name,
        document: provider.document,
        documentNumber: provider.documentNumber,
        phone: provider.phone ?? null,
        adress: provider.adress ?? null,
        email: provider.email ?? null,
        website: provider.website ?? null,
        status: provider.status ?? 'ACTIVE',
        organizationId: organization.id,
      } as any,
    });
    summary.providers += 1;
  }

  const createdUsers: {
    fixture: UserFixture;
    user: { id: number; role: UserRole };
  }[] = [];

  for (const userFixture of fixture.users) {
    const user = await prisma.user.upsert({
      where: { email: userFixture.email },
      update: {
        username: userFixture.username,
        password: userFixture.password,
        role: userFixture.role,
        status: userFixture.status ?? 'ACTIVO',
        organizationId: organization.id,
      } as any,
      create: {
        email: userFixture.email,
        username: userFixture.username,
        password: userFixture.password,
        role: userFixture.role,
        status: userFixture.status ?? 'ACTIVO',
        organizationId: organization.id,
      } as any,
    });

    if (userFixture.membershipUnitCode) {
      const unitId = unitIds.get(userFixture.membershipUnitCode);
      if (!unitId) {
        throw new Error(
          `Unknown membership unit ${userFixture.membershipUnitCode} for organization ${fixture.code}`,
        );
      }
      await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId_organizationUnitId: {
            userId: user.id,
            organizationId: organization.id,
            organizationUnitId: unitId,
          },
        },
        update: {
          role: userFixture.membershipRole ?? 'MEMBER',
          isDefault: userFixture.membershipDefault ?? false,
        },
        create: {
          userId: user.id,
          organizationId: organization.id,
          organizationUnitId: unitId,
          role: userFixture.membershipRole ?? 'MEMBER',
          isDefault: userFixture.membershipDefault ?? false,
        },
      });
      summary.memberships += 1;
    }

    if (userFixture.client) {
      await prisma.client.upsert({
        where: { userId: user.id },
        update: {
        name: userFixture.client.name,
        type: userFixture.client.type ?? 'PERSON',
        typeNumber: userFixture.client.typeNumber,
        phone: userFixture.client.phone ?? null,
        adress: userFixture.client.adress ?? null,
        email: userFixture.client.email ?? userFixture.email,
        status: 'ACTIVE',
        organizationId: organization.id,
      } as any,
      create: {
        userId: user.id,
        name: userFixture.client.name,
        type: userFixture.client.type ?? 'PERSON',
        typeNumber: userFixture.client.typeNumber,
        phone: userFixture.client.phone ?? null,
        adress: userFixture.client.adress ?? null,
        email: userFixture.client.email ?? userFixture.email,
        status: 'ACTIVE',
        organizationId: organization.id,
      } as any,
    });
      summary.clients += 1;
    }

    createdUsers.push({ fixture: userFixture, user: { id: user.id, role: user.role } });
    summary.users += 1;
  }

  const referenceUser =
    createdUsers.find(
      ({ user }) =>
        user.role === UserRole.SUPER_ADMIN_ORG || user.role === UserRole.ADMIN,
    )?.user ?? createdUsers[0]?.user;

  const orgId = organization.id;

  let categoryCache = categoriesByOrganization.get(fixture.code);
  if (!categoryCache) {
    categoryCache = new Map<string, number>();
    categoriesByOrganization.set(fixture.code, categoryCache);
  }

  const resolveCategoryId = async (categoryName: string): Promise<number> => {
    if (categoryCache!.has(categoryName)) {
      return categoryCache!.get(categoryName)!;
    }

    const category = await prisma.category.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: categoryName,
        },
      },
      update: {
        description: `Categoría de prueba multi-tenant para ${categoryName}`,
        status: 'ACTIVE',
        companyId: null,
      },
      create: {
        name: categoryName,
        description: `Categoría de prueba multi-tenant para ${categoryName}`,
        status: 'ACTIVE',
        organizationId: orgId,
        companyId: null,
      },
    });

    categoryCache!.set(categoryName, category.id);
    return category.id;
  };

  for (const product of fixture.products ?? []) {
    const categoryId = await resolveCategoryId(product.category);

    const savedProduct = await prisma.product.upsert({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: product.name,
        },
      },
      update: {
        description: product.description ?? null,
        price: product.price,
        priceSell: product.priceSell ?? product.price,
        barcode: product.barcode ?? null,
        images: [],
        status: 'ACTIVE',
        categoryId,
      },
      create: {
        name: product.name,
        description: product.description ?? null,
        price: product.price,
        priceSell: product.priceSell ?? product.price,
        barcode: product.barcode ?? null,
        qrCode: null,
        images: [],
        status: 'ACTIVE',
        categoryId,
      },
    });
    summary.products += 1;

    for (const allocation of product.allocations) {
      const storeId = storeIds.get(allocation.storeName);
      if (!storeId) {
        throw new Error(
          `Unknown store ${allocation.storeName} for product ${product.name} in organization ${fixture.code}`,
        );
      }

      const inventory = await prisma.inventory.upsert({
        where: {
          productId_storeId: {
            productId: savedProduct.id,
            storeId,
          },
        },
        update: {
          organizationId: organization.id,
        } as any,
        create: {
          productId: savedProduct.id,
          storeId,
          organizationId: organization.id,
        } as any,
      });
      summary.inventories += 1;

      const existingRelation = await prisma.storeOnInventory.findFirst({
        where: { inventoryId: inventory.id, storeId },
      });

      if (existingRelation) {
        if (existingRelation.stock !== allocation.stock) {
          await prisma.storeOnInventory.update({
            where: { id: existingRelation.id },
            data: { stock: allocation.stock },
          });
        }
      } else {
        await prisma.storeOnInventory.create({
          data: {
            inventoryId: inventory.id,
            storeId,
            stock: allocation.stock,
          },
        });
      }
      summary.storeOnInventories += 1;

      if (referenceUser) {
        await prisma.inventoryHistory.deleteMany({
          where: {
            inventoryId: inventory.id,
            action: 'seed-fixture',
          },
        });

        await prisma.inventoryHistory.create({
          data: {
            inventoryId: inventory.id,
            userId: referenceUser.id,
            action: 'seed-fixture',
            description: 'Carga inicial multi-tenant',
            stockChange: allocation.stock,
            previousStock: 0,
            newStock: allocation.stock,
            organizationId: organization.id,
          } as any,
        });
        summary.inventoryHistories += 1;
      }
    }
  }

  logger(`Fixture applied for organization ${fixture.code}`);
  return summary;
}

type ApplyFixturesOptions = {
  prisma?: PrismaSeedClient;
  logger?: (message: string) => void;
  summaryPath?: string;
  onlyOrganizations?: string[];
  skipOrganizations?: string[];
};

async function persistFixtureSummaryToFile(
  summaryPath: string,
  summary: MultiTenantFixtureSummary,
  logger: (message: string) => void,
): Promise<boolean> {
  try {
    await mkdir(dirname(summaryPath), { recursive: true });
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    logger(`Fixture summary persisted at ${summaryPath}.`);
    return true;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    logger(
      `Failed to persist multi-tenant fixture summary at ${summaryPath}: ${details}`,
    );
    return false;
  }
}

function computeTotals(summaries: OrganizationFixtureSummary[]): FixtureTotals {
  const totals: FixtureTotals = {
    organizations: summaries.length,
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
  };

  for (const summary of summaries) {
    totals.units += summary.units;
    totals.stores += summary.stores;
    totals.providers += summary.providers;
    totals.users += summary.users;
    totals.clients += summary.clients;
    totals.memberships += summary.memberships;
    totals.products += summary.products;
    totals.inventories += summary.inventories;
    totals.storeOnInventories += summary.storeOnInventories;
    totals.inventoryHistories += summary.inventoryHistories;
  }

  return totals;
}

function normalizeOrganizationCodes(codes?: string[]): string[] {
  if (!codes || codes.length === 0) {
    return [];
  }

  const unique: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (!trimmed.length) {
      continue;
    }
    if (!unique.includes(trimmed)) {
      unique.push(trimmed);
    }
  }

  return unique;
}

function validateOrganizationCodes(codes: string[], source: string) {
  for (const code of codes) {
    if (!FIXTURE_ORGANIZATION_CODES.has(code)) {
      throw new Error(
        `[multi-tenant-seed] Unknown organization code provided in ${source}: ${code}`,
      );
    }
  }
}

function filterOrganizations(
  onlyOrganizations: string[],
  skipOrganizations: string[],
) {
  const hasFilters = onlyOrganizations.length > 0 || skipOrganizations.length > 0;
  const effectiveOnly =
    onlyOrganizations.length > 0
      ? new Set(onlyOrganizations)
      : new Set(FIXTURE_ORGANIZATION_CODES);
  const skipSet = new Set(skipOrganizations);

  const selected = seedOrganizations.filter(
    (organization) =>
      effectiveOnly.has(organization.code) && !skipSet.has(organization.code),
  );

  return { selected, hasFilters } as const;
}

export async function applyMultiTenantFixtures(
  options: ApplyFixturesOptions = {},
): Promise<MultiTenantFixtureSummary> {
  // Create PrismaClient with adapter for Prisma 7.x
  let prisma: PrismaSeedClient;
  if (options.prisma) {
    prisma = options.prisma as PrismaSeedClient;
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter }) as PrismaSeedClient;
  }
  const logger = options.logger ?? console.log;
  const shouldDisconnect = !options.prisma;

  try {
    const onlyOrganizations = normalizeOrganizationCodes(options.onlyOrganizations);
    const skipOrganizations = normalizeOrganizationCodes(options.skipOrganizations);

    validateOrganizationCodes(onlyOrganizations, 'onlyOrganizations');
    validateOrganizationCodes(skipOrganizations, 'skipOrganizations');

    const { selected, hasFilters } = filterOrganizations(
      onlyOrganizations,
      skipOrganizations,
    );

    if (selected.length === 0) {
      if (hasFilters) {
        logger('[multi-tenant-seed] No organizations matched the provided filters.');
      }

      const emptySummary: MultiTenantFixtureSummary = {
        processedAt: new Date().toISOString(),
        organizations: [],
        totals: computeTotals([]),
      };

      if (options.summaryPath) {
        const persisted = await persistFixtureSummaryToFile(
          options.summaryPath,
          emptySummary,
          logger,
        );
        if (persisted) {
          emptySummary.summaryFilePath = options.summaryPath;
        }
      }

      return emptySummary;
    }

    const categories = new Map<string, Map<string, number>>();
    const organizationSummaries: OrganizationFixtureSummary[] = [];
    for (const organization of selected) {
      const summary = await ensureOrganization(
        prisma,
        organization,
        categories,
        logger,
      );
      organizationSummaries.push(summary);
    }
    const summary: MultiTenantFixtureSummary = {
      processedAt: new Date().toISOString(),
      organizations: organizationSummaries,
      totals: computeTotals(organizationSummaries),
    };

    if (options.summaryPath) {
      const persisted = await persistFixtureSummaryToFile(
        options.summaryPath,
        summary,
        logger,
      );
      if (persisted) {
        summary.summaryFilePath = options.summaryPath;
      }
    }
    logger(
      `Multi-tenant fixtures ensured for ${summary.totals.organizations} organization(s).`,
    );
    return summary;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

type FixtureCliOptions = {
  summaryPath?: string;
  onlyOrganizations?: string[];
  skipOrganizations?: string[];
};

function parseFlagValue(
  argv: string[],
  index: number,
  flag: string,
): { value?: string; nextIndex: number } {
  if (flag.includes('=')) {
    const equalsIndex = flag.indexOf('=');
    const rawValue = flag.slice(equalsIndex + 1);
    return { value: rawValue || undefined, nextIndex: index };
  }

  const nextValue = argv[index + 1];
  return {
    value: nextValue,
    nextIndex: nextValue === undefined ? index : index + 1,
  };
}

const SUMMARY_PATH_FLAGS = new Set([
  '--summary-path',
  '--summaryPath',
  '--summary-file',
  '--summaryFile',
]);

const ONLY_ORGANIZATION_FLAGS = new Set([
  '--only',
  '--only-organizations',
  '--onlyOrganizations',
]);

const SKIP_ORGANIZATION_FLAGS = new Set([
  '--skip',
  '--skip-organizations',
  '--skipOrganizations',
]);

function parseOrganizationList(value: string | undefined, flag: string): string[] {
  if (!value) {
    throw new Error(`[multi-tenant-seed] Missing value for ${flag}.`);
  }

  const codes = value
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);

  if (!codes.length) {
    throw new Error(
      `[multi-tenant-seed] ${flag} requires at least one organization code.`,
    );
  }

  const unique: string[] = [];
  for (const code of codes) {
    if (!unique.includes(code)) {
      unique.push(code);
    }
  }

  return unique;
}

export function parseFixtureCliArgs(argv: string[]): FixtureCliOptions {
  const options: FixtureCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    const [flagName] = arg.split('=');
    if (SUMMARY_PATH_FLAGS.has(flagName)) {
      const { value, nextIndex } = parseFlagValue(argv, index, arg);
      options.summaryPath = value;
      if (!arg.includes('=')) {
        index = nextIndex;
      }
      continue;
    }

    if (ONLY_ORGANIZATION_FLAGS.has(flagName)) {
      const { value, nextIndex } = parseFlagValue(argv, index, arg);
      options.onlyOrganizations = parseOrganizationList(value, flagName);
      if (!arg.includes('=')) {
        index = nextIndex;
      }
      continue;
    }

    if (SKIP_ORGANIZATION_FLAGS.has(flagName)) {
      const { value, nextIndex } = parseFlagValue(argv, index, arg);
      options.skipOrganizations = parseOrganizationList(value, flagName);
      if (!arg.includes('=')) {
        index = nextIndex;
      }
      continue;
    }

  }

  return options;
}

if (require.main === module) {
  const cliOptions = parseFixtureCliArgs(process.argv.slice(2));
  applyMultiTenantFixtures({
    summaryPath: cliOptions.summaryPath,
    onlyOrganizations: cliOptions.onlyOrganizations,
    skipOrganizations: cliOptions.skipOrganizations,
  })
    .then((summary) => {
      if (cliOptions.summaryPath && summary.summaryFilePath) {
        console.log(
          `[multi-tenant-seed] Summary written to ${summary.summaryFilePath}.`,
        );
      }
    })
    .catch((error) => {
      console.error('Error applying multi-tenant fixtures:', error);
      process.exit(1);
    });
}
