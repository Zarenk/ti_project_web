import {
  OrganizationMembershipRole,
  PrismaClient,
  UserRole,
} from '@prisma/client';

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
  membershipRole?: OrganizationMembershipRole;
  membershipDefault?: boolean;
  client?: UserClientFixture;
};

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
        role: UserRole.ADMIN,
        status: 'ACTIVO',
        membershipUnitCode: 'alpha-hq',
        membershipRole: OrganizationMembershipRole.ADMIN,
        membershipDefault: true,
      },
      {
        email: 'cliente@alpha.example.com',
        username: 'alpha.client',
        password: 'seeded-password',
        role: UserRole.CLIENT,
        status: 'ACTIVO',
        membershipUnitCode: 'alpha-retail',
        membershipRole: OrganizationMembershipRole.MEMBER,
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
        role: UserRole.ADMIN,
        status: 'ACTIVO',
        membershipUnitCode: 'beta-hq',
        membershipRole: OrganizationMembershipRole.ADMIN,
        membershipDefault: true,
      },
      {
        email: 'cliente@beta.example.com',
        username: 'beta.client',
        password: 'seeded-password',
        role: UserRole.CLIENT,
        status: 'ACTIVO',
        membershipUnitCode: 'beta-store',
        membershipRole: OrganizationMembershipRole.MEMBER,
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

async function ensureCategories(
  prisma: PrismaClient,
  fixtures: OrganizationFixture[],
) {
  const categoryNames = new Set<string>();
  for (const org of fixtures) {
    for (const product of org.products ?? []) {
      categoryNames.add(product.category);
    }
  }

  const categories = new Map<string, number>();
  for (const name of categoryNames) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {
        description: `Categoría de prueba multi-tenant para ${name}`,
        status: 'ACTIVE',
      },
      create: {
        name,
        description: `Categoría de prueba multi-tenant para ${name}`,
        status: 'ACTIVE',
        image: null,
      },
    });
    categories.set(name, category.id);
  }

  return categories;
}

async function ensureOrganization(
  prisma: PrismaClient,
  fixture: OrganizationFixture,
  categories: Map<string, number>,
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
  }

  const storeIds = new Map<string, number>();
  for (const store of fixture.stores) {
    const savedStore = await prisma.store.upsert({
      where: { name: store.name },
      update: {
        status: store.status ?? 'ACTIVE',
        phone: store.phone ?? null,
        adress: store.adress ?? null,
        email: store.email ?? null,
        website: store.website ?? null,
        organizationId: organization.id,
      },
      create: {
        name: store.name,
        status: store.status ?? 'ACTIVE',
        phone: store.phone ?? null,
        adress: store.adress ?? null,
        email: store.email ?? null,
        website: store.website ?? null,
        organizationId: organization.id,
      },
    });

    storeIds.set(store.name, savedStore.id);
  }

  for (const provider of fixture.providers) {
    await prisma.provider.upsert({
      where: { documentNumber: provider.documentNumber },
      update: {
        name: provider.name,
        document: provider.document,
        phone: provider.phone ?? null,
        adress: provider.adress ?? null,
        email: provider.email ?? null,
        website: provider.website ?? null,
        status: provider.status ?? 'ACTIVE',
        organizationId: organization.id,
      },
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
      },
    });
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
      },
      create: {
        email: userFixture.email,
        username: userFixture.username,
        password: userFixture.password,
        role: userFixture.role,
        status: userFixture.status ?? 'ACTIVO',
        organizationId: organization.id,
      },
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
          role: userFixture.membershipRole ?? OrganizationMembershipRole.MEMBER,
          isDefault: userFixture.membershipDefault ?? false,
        },
        create: {
          userId: user.id,
          organizationId: organization.id,
          organizationUnitId: unitId,
          role: userFixture.membershipRole ?? OrganizationMembershipRole.MEMBER,
          isDefault: userFixture.membershipDefault ?? false,
        },
      });
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
        },
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
        },
      });
    }

    createdUsers.push({ fixture: userFixture, user: { id: user.id, role: user.role } });
  }

  const referenceUser =
    createdUsers.find(({ user }) => user.role === UserRole.ADMIN)?.user ?? createdUsers[0]?.user;

  for (const product of fixture.products ?? []) {
    const categoryId = categories.get(product.category);
    if (!categoryId) {
      throw new Error(`Category ${product.category} not resolved for product ${product.name}`);
    }

    const savedProduct = await prisma.product.upsert({
      where: { name: product.name },
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
        },
        create: {
          productId: savedProduct.id,
          storeId,
          organizationId: organization.id,
        },
      });

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
          },
        });
      }
    }
  }

  logger(`Fixture applied for organization ${fixture.code}`);
}

type ApplyFixturesOptions = {
  prisma?: PrismaClient;
  logger?: (message: string) => void;
};

export async function applyMultiTenantFixtures(
  options: ApplyFixturesOptions = {},
) {
  const prisma = options.prisma ?? new PrismaClient();
  const logger = options.logger ?? console.log;
  const shouldDisconnect = !options.prisma;

  try {
    const categories = await ensureCategories(prisma, seedOrganizations);
    for (const organization of seedOrganizations) {
      await ensureOrganization(prisma, organization, categories, logger);
    }
    logger('Multi-tenant fixtures ensured.');
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

if (require.main === module) {
  applyMultiTenantFixtures().catch((error) => {
    console.error('Error applying multi-tenant fixtures:', error);
    process.exit(1);
  });
}