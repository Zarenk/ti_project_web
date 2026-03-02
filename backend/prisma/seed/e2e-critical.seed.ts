/**
 * E2E Critical Test Seed
 *
 * Creates deterministic test data for the critical E2E Cypress suite.
 * Designed to run against a clean `ecoterra_test` database.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecoterra_test \
 *     npx ts-node prisma/seed/e2e-critical.seed.ts
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const PASSWORD = 'Test1234!';
const SALT_ROUNDS = 10;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  // Safety: never run against production
  const lowerUrl = connectionString.toLowerCase();
  if (
    lowerUrl.includes('railway') ||
    lowerUrl.includes('neon') ||
    lowerUrl.includes('supabase') ||
    lowerUrl.includes('heroku')
  ) {
    throw new Error('ABORT: Refusing to seed a production database.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter }) as any;

  try {
    const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    console.log('[e2e-seed] Creating organization...');
    const org = await prisma.organization.upsert({
      where: { code: 'e2e-test' },
      update: { name: 'E2E Test Corp', status: 'ACTIVE' },
      create: { code: 'e2e-test', name: 'E2E Test Corp', status: 'ACTIVE' },
    });

    console.log('[e2e-seed] Creating units...');
    const hqUnit = await prisma.organizationUnit.upsert({
      where: {
        organizationId_code: { organizationId: org.id, code: 'e2e-hq' },
      },
      update: { name: 'E2E HQ', status: 'ACTIVE' },
      create: {
        organizationId: org.id,
        code: 'e2e-hq',
        name: 'E2E HQ',
        status: 'ACTIVE',
      },
    });

    console.log('[e2e-seed] Creating company...');
    const company = await prisma.company.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: 'E2E Sucursal',
        },
      },
      update: { status: 'ACTIVE', legalName: 'E2E Sucursal S.A.' },
      create: {
        organizationId: org.id,
        name: 'E2E Sucursal',
        legalName: 'E2E Sucursal S.A.',
        taxId: '20999999990',
        status: 'ACTIVE',
      },
    });

    console.log('[e2e-seed] Creating store...');
    const store = await prisma.store.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: 'Tienda E2E',
        },
      },
      update: { status: 'ACTIVE', companyId: company.id },
      create: {
        name: 'Tienda E2E',
        status: 'ACTIVE',
        organizationId: org.id,
        companyId: company.id,
        adress: 'Av. Test 123',
      } as any,
    });

    console.log('[e2e-seed] Creating category...');
    const category = await prisma.category.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: 'Categoria E2E',
        },
      },
      update: { status: 'ACTIVE' },
      create: {
        name: 'Categoria E2E',
        description: 'Categoria para tests E2E',
        status: 'ACTIVE',
        organizationId: org.id,
      },
    });

    console.log('[e2e-seed] Creating provider...');
    await prisma.provider.upsert({
      where: {
        organizationId_documentNumber: {
          organizationId: org.id,
          documentNumber: '20999999991',
        },
      },
      update: {
        name: 'Proveedor E2E',
        document: 'RUC',
        status: 'ACTIVE',
      },
      create: {
        name: 'Proveedor E2E',
        document: 'RUC',
        documentNumber: '20999999991',
        status: 'ACTIVE',
        organizationId: org.id,
      } as any,
    });

    // Generic client — requires a linked User, create a dummy one
    console.log('[e2e-seed] Creating generic client...');
    const clientUser = await prisma.user.upsert({
      where: { email: 'client-generic@e2etest.com' },
      update: { username: 'e2e.client', role: UserRole.CLIENT, status: 'ACTIVO' },
      create: {
        email: 'client-generic@e2etest.com',
        username: 'e2e.client',
        password: hashedPassword,
        role: UserRole.CLIENT,
        status: 'ACTIVO',
        organizationId: org.id,
      } as any,
    });
    await prisma.client.upsert({
      where: { userId: clientUser.id },
      update: { name: 'Sin Cliente', status: 'ACTIVE' },
      create: {
        userId: clientUser.id,
        name: 'Sin Cliente',
        type: 'PERSON',
        typeNumber: '00000000',
        status: 'ACTIVE',
        organizationId: org.id,
      } as any,
    });

    console.log('[e2e-seed] Creating payment method...');
    const paymentMethod = await prisma.paymentMethod.upsert({
      where: { name: 'EN EFECTIVO' },
      update: { isActive: true },
      create: { name: 'EN EFECTIVO', isActive: true },
    });
    // Ensure other common methods exist
    for (const name of ['TRANSFERENCIA', 'PAGO CON VISA', 'YAPE', 'PLIN']) {
      await prisma.paymentMethod.upsert({
        where: { name },
        update: { isActive: true },
        create: { name, isActive: true },
      });
    }

    console.log('[e2e-seed] Creating users...');
    const users = [
      {
        email: 'admin@e2etest.com',
        username: 'e2e.admin',
        role: UserRole.ADMIN,
        membershipRole: 'ADMIN',
      },
      {
        email: 'employee@e2etest.com',
        username: 'e2e.employee',
        role: UserRole.EMPLOYEE,
        membershipRole: 'MEMBER',
      },
      {
        email: 'orgadmin@e2etest.com',
        username: 'e2e.orgadmin',
        role: UserRole.SUPER_ADMIN_ORG,
        membershipRole: 'SUPER_ADMIN',
      },
    ];

    for (const u of users) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          username: u.username,
          password: hashedPassword,
          role: u.role,
          status: 'ACTIVO',
          organizationId: org.id,
        } as any,
        create: {
          email: u.email,
          username: u.username,
          password: hashedPassword,
          role: u.role,
          status: 'ACTIVO',
          organizationId: org.id,
        } as any,
      });

      await prisma.organizationMembership.upsert({
        where: {
          userId_organizationId_organizationUnitId: {
            userId: user.id,
            organizationId: org.id,
            organizationUnitId: hqUnit.id,
          },
        },
        update: {
          role: u.membershipRole,
          isDefault: true,
        },
        create: {
          userId: user.id,
          organizationId: org.id,
          organizationUnitId: hqUnit.id,
          role: u.membershipRole,
          isDefault: true,
        },
      });
    }

    console.log('[e2e-seed] Creating accounting journal...');
    await prisma.journal.upsert({
      where: { code: 'LD-001' },
      update: { name: 'Libro Diario' },
      create: { code: 'LD-001', name: 'Libro Diario' },
    });

    console.log('[e2e-seed] Creating PCGE accounts...');
    const accounts = [
      { code: '1011', name: 'Caja', accountType: 'ACTIVO' },
      { code: '1041', name: 'Cuentas Corrientes', accountType: 'ACTIVO' },
      { code: '2011', name: 'Mercaderias', accountType: 'ACTIVO' },
      { code: '4011', name: 'IGV - Cuenta propia', accountType: 'PASIVO' },
      { code: '4211', name: 'Facturas por Pagar', accountType: 'PASIVO' },
      { code: '6011', name: 'Mercaderias Compradas', accountType: 'GASTO' },
      { code: '6911', name: 'Costo de Ventas', accountType: 'GASTO' },
      { code: '7011', name: 'Ventas de Mercaderias', accountType: 'INGRESO' },
    ];

    for (const acc of accounts) {
      await prisma.account.upsert({
        where: {
          code_organizationId: {
            code: acc.code,
            organizationId: org.id,
          },
        },
        update: { name: acc.name, accountType: acc.accountType as any },
        create: {
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType as any,
          organizationId: org.id,
        },
      });
    }

    console.log('[e2e-seed] Creating site settings...');
    const tenantKey = `${org.id}:${company.id}`;
    const siteData = {
      companyName: 'E2E Sucursal',
      currency: 'PEN',
      igvRate: 18,
    };
    await prisma.siteSettings.upsert({
      where: { tenantKey },
      update: { data: siteData },
      create: {
        tenantKey,
        data: siteData,
        organizationId: org.id,
        companyId: company.id,
      },
    });

    console.log(`[e2e-seed] Done!`);
    console.log(`  Organization: ${org.id} (${org.code})`);
    console.log(`  Company: ${company.id}`);
    console.log(`  Store: ${store.id}`);
    console.log(`  Category: ${category.id}`);
    console.log(`  Payment Method: ${paymentMethod.id}`);
    console.log(`  Users: admin@e2etest.com, employee@e2etest.com, orgadmin@e2etest.com`);
    console.log(`  Password: ${PASSWORD}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[e2e-seed] Fatal error:', err);
  process.exit(1);
});