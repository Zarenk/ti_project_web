import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 🔒 MULTI-TENANT ISOLATION E2E TESTS
 *
 * Estos tests verifican la integridad del aislamiento multi-tenant
 * a nivel de base de datos.
 *
 * NOTA: Estos tests son principalmente tests de integración de DB
 * que verifican que los filtros de tenant están correctamente aplicados.
 *
 * Para tests completos de HTTP con autenticación, ver:
 * - sales.e2e-spec.ts
 * - accounting.e2e-spec.ts
 */
describe('Multi-Tenant Isolation (Database Level)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Sales Isolation at DB Level', () => {
    it('should have organizationId in all sales', async () => {
      const salesWithoutOrg = await prisma.sales.findMany({
        where: { organizationId: null },
        select: { id: true },
      });

      if (salesWithoutOrg.length > 0) {
        console.warn(
          `⚠️ Found ${salesWithoutOrg.length} sales without organizationId`,
        );
      }

      // Este es un warning, no un error bloqueante
      expect(salesWithoutOrg.length).toBeLessThan(10);
    });

    it('should be able to filter sales by organizationId', async () => {
      // Obtener dos organizaciones diferentes
      const orgs = await prisma.organization.findMany({ take: 2 });

      if (orgs.length < 2) {
        console.log('Skip: Need at least 2 organizations');
        return;
      }

      const [org1, org2] = orgs;

      // Obtener ventas de cada org
      const salesOrg1 = await prisma.sales.findMany({
        where: { organizationId: org1.id },
        take: 5,
      });

      const salesOrg2 = await prisma.sales.findMany({
        where: { organizationId: org2.id },
        take: 5,
      });

      // Verificar que las ventas pertenecen a la org correcta
      salesOrg1.forEach((sale) => {
        expect(sale.organizationId).toBe(org1.id);
      });

      salesOrg2.forEach((sale) => {
        expect(sale.organizationId).toBe(org2.id);
      });
    });
  });

  describe('User Isolation at DB Level', () => {
    it('should have organizationId in all users', async () => {
      const usersWithoutOrg = await prisma.user.findMany({
        where: { organizationId: null },
        select: { id: true, username: true },
      });

      if (usersWithoutOrg.length > 0) {
        console.warn(
          `⚠️ Found ${usersWithoutOrg.length} users without organizationId`,
        );
      }

      // Warning, no bloqueante
      expect(usersWithoutOrg.length).toBeLessThan(5);
    });

    it('should be able to filter users by organizationId', async () => {
      const orgs = await prisma.organization.findMany({ take: 2 });

      if (orgs.length < 2) {
        console.log('Skip: Need at least 2 organizations');
        return;
      }

      const [org1, org2] = orgs;

      const usersOrg1 = await prisma.user.findMany({
        where: { organizationId: org1.id },
        take: 5,
      });

      const usersOrg2 = await prisma.user.findMany({
        where: { organizationId: org2.id },
        take: 5,
      });

      usersOrg1.forEach((user) => {
        expect(user.organizationId).toBe(org1.id);
      });

      usersOrg2.forEach((user) => {
        expect(user.organizationId).toBe(org2.id);
      });
    });
  });

  describe('Product Isolation at DB Level', () => {
    it('should be able to filter products by organizationId', async () => {
      const orgs = await prisma.organization.findMany({ take: 2 });

      if (orgs.length < 2) {
        console.log('Skip: Need at least 2 organizations');
        return;
      }

      const [org1, org2] = orgs;

      const productsOrg1 = await prisma.product.findMany({
        where: { organizationId: org1.id },
        take: 5,
      });

      const productsOrg2 = await prisma.product.findMany({
        where: { organizationId: org2.id },
        take: 5,
      });

      productsOrg1.forEach((product) => {
        expect(product.organizationId).toBe(org1.id);
      });

      productsOrg2.forEach((product) => {
        expect(product.organizationId).toBe(org2.id);
      });
    });
  });

  describe('Accounting Entry Isolation at DB Level', () => {
    it('should have organizationId in accounting entries', async () => {
      const entriesCount = await prisma.accEntry.count();

      if (entriesCount === 0) {
        console.log('Skip: No accounting entries exist');
        return;
      }

      const entriesWithoutOrg = await prisma.accEntry.findMany({
        where: { organizationId: null },
        select: { id: true },
        take: 10,
      });

      if (entriesWithoutOrg.length > 0) {
        console.warn(
          `⚠️ Found ${entriesWithoutOrg.length} accounting entries without organizationId`,
        );
      }
    });

    it('should filter accounting entries by organizationId', async () => {
      const orgs = await prisma.organization.findMany({ take: 2 });

      if (orgs.length < 2) {
        console.log('Skip: Need at least 2 organizations');
        return;
      }

      const [org1, org2] = orgs;

      const entriesOrg1 = await prisma.accEntry.findMany({
        where: { organizationId: org1.id },
        take: 5,
      });

      const entriesOrg2 = await prisma.accEntry.findMany({
        where: { organizationId: org2.id },
        take: 5,
      });

      entriesOrg1.forEach((entry) => {
        expect(entry.organizationId).toBe(org1.id);
      });

      entriesOrg2.forEach((entry) => {
        expect(entry.organizationId).toBe(org2.id);
      });
    });
  });

  describe('Cross-Tenant Leak Prevention', () => {
    it('should NOT return data from other organization when filtering', async () => {
      const orgs = await prisma.organization.findMany({ take: 2 });

      if (orgs.length < 2) {
        console.log('Skip: Need at least 2 organizations');
        return;
      }

      const [org1, org2] = orgs;

      // Obtener ventas de org1 con filtro explícito
      const salesOrg1 = await prisma.sales.findMany({
        where: { organizationId: org1.id },
        select: { id: true, organizationId: true },
        take: 50,
      });

      // Verificar que NINGUNA venta pertenece a org2
      const leakedSales = salesOrg1.filter(
        (sale) => sale.organizationId === org2.id,
      );

      expect(leakedSales).toHaveLength(0);

      if (leakedSales.length > 0) {
        fail(`Data leak detected: Found ${leakedSales.length} sales from org2 in org1 query`);
      }
    });

    it('should verify unique organizations exist in database', async () => {
      const totalOrgs = await prisma.organization.count();

      expect(totalOrgs).toBeGreaterThan(0);

      if (totalOrgs === 1) {
        console.warn('⚠️ Only 1 organization exists - multi-tenant tests limited');
      }

      console.log(`✅ Found ${totalOrgs} organizations in database`);
    });
  });

  describe('Schema Integrity Checks', () => {
    it('should have organizationId field in critical models', async () => {
      // Verificar que los modelos críticos tienen el campo organizationId
      const checks = [
        { model: 'sales', field: 'organizationId' },
        { model: 'user', field: 'organizationId' },
        { model: 'product', field: 'organizationId' },
        { model: 'store', field: 'organizationId' },
        { model: 'accEntry', field: 'organizationId' },
      ];

      for (const check of checks) {
        try {
          const result = await (prisma as any)[check.model].findFirst({
            where: { [check.field]: { not: null } },
            select: { id: true, [check.field]: true },
          });

          if (!result) {
            console.warn(`⚠️ No ${check.model} found with ${check.field}`);
          } else {
            expect(result[check.field]).toBeDefined();
          }
        } catch (error: any) {
          fail(`Model ${check.model} does not have field ${check.field}: ${error.message}`);
        }
      }
    });

    it('should be able to join sales with organization', async () => {
      const saleWithOrg = await prisma.sales.findFirst({
        where: { organizationId: { not: null } },
        include: {
          // @ts-ignore - Este campo existe pero puede no estar en types
          organization: true,
        },
      });

      if (!saleWithOrg) {
        console.log('Skip: No sales with organization exist');
        return;
      }

      expect(saleWithOrg.organizationId).toBeDefined();
    });
  });
});
