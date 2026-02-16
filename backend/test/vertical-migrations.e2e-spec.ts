import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';
import { VerticalMigrationService } from '../src/tenancy/vertical-migration.service';
import { VerticalConfigService } from '../src/tenancy/vertical-config.service';
import { VerticalEventsService } from '../src/tenancy/vertical-events.service';
import { BusinessVertical } from '../src/types/business-vertical.enum';

/**
 * Integration tests for vertical migration system
 * Tests concurrent migrations, rollbacks, cleanup, and data transformations
 */
describe('Vertical Migrations Integration (e2e)', () => {
  let app: INestApplication;
  let migrationService: VerticalMigrationService;
  let prismaService: PrismaService;
  let configService: VerticalConfigService;

  const testCompanyId = 9999;
  const testOrganizationId = 8888;
  const testActorId = 7777;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
      providers: [
        VerticalMigrationService,
        VerticalConfigService,
        VerticalEventsService,
        PrismaService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    migrationService = moduleFixture.get<VerticalMigrationService>(
      VerticalMigrationService,
    );
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    configService = moduleFixture.get<VerticalConfigService>(
      VerticalConfigService,
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await prismaService.companyVerticalChangeAudit.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prismaService.companyVerticalRollbackSnapshot.deleteMany({
      where: { companyId: testCompanyId },
    });
    await prismaService.company.deleteMany({
      where: { id: testCompanyId },
    });
    await prismaService.organization.deleteMany({
      where: { id: testOrganizationId },
    });

    await app.close();
  });

  describe('Concurrent Migration Protection', () => {
    beforeEach(async () => {
      // Create test organization and company
      await prismaService.organization.create({
        data: {
          id: testOrganizationId,
          name: 'Test Org',
          code: 'test-org',
          status: 'ACTIVE',
        },
      });

      await prismaService.company.create({
        data: {
          id: testCompanyId,
          organizationId: testOrganizationId,
          name: 'Test Company',
          legalName: 'Test Company LLC',
          taxId: '12345678901',
          businessVertical: BusinessVertical.GENERAL,
        },
      });

      // Create test user for audit logs
      await prismaService.user.create({
        data: {
          id: testActorId,
          email: 'test-actor@example.com',
          username: 'test-actor',
          password: 'hashed-password',
          organizationId: testOrganizationId,
          role: 'ADMIN',
        },
      });
    });

    afterEach(async () => {
      await prismaService.companyVerticalChangeAudit.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.companyVerticalRollbackSnapshot.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.user.delete({
        where: { id: testActorId },
      });
      await prismaService.company.delete({
        where: { id: testCompanyId },
      });
      await prismaService.organization.delete({
        where: { id: testOrganizationId },
      });
    });

    it('should prevent concurrent migrations to the same company', async () => {
      // Simulate two concurrent migration attempts
      const migration1 = migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      // Small delay to ensure first migration starts
      await new Promise((resolve) => setTimeout(resolve, 50));

      const migration2 = migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RESTAURANTS,
        warnings: [],
      });

      // One should succeed, one should fail with BadRequestException
      const results = await Promise.allSettled([migration1, migration2]);

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failureCount = results.filter(
        (r) =>
          r.status === 'rejected' &&
          r.reason instanceof BadRequestException,
      ).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verify final state - should be one of the target verticals
      const company = await prismaService.company.findUnique({
        where: { id: testCompanyId },
        select: { businessVertical: true },
      });

      expect([BusinessVertical.RETAIL, BusinessVertical.RESTAURANTS]).toContain(
        company?.businessVertical,
      );
    }, 30000); // 30 second timeout for concurrent operations

    it('should create audit log for successful migration', async () => {
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: ['Test warning'],
        reason: 'Integration test',
      });

      const auditLog = await prismaService.companyVerticalChangeAudit.findFirst({
        where: {
          companyId: testCompanyId,
          oldVertical: BusinessVertical.GENERAL,
          newVertical: BusinessVertical.RETAIL,
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.success).toBe(true);
      expect(auditLog?.userId).toBe(testActorId);
      expect(auditLog?.changeReason).toBe('Integration test');
    });

    it('should create rollback snapshot', async () => {
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      const snapshot = await prismaService.companyVerticalRollbackSnapshot.findFirst(
        {
          where: { companyId: testCompanyId },
        },
      );

      expect(snapshot).toBeDefined();
      expect(snapshot?.expiresAt).toBeDefined();

      const snapshotData = snapshot?.snapshotData as any;
      expect(snapshotData?.previousVertical).toBe(BusinessVertical.GENERAL);
    });
  });

  describe('Rollback Functionality', () => {
    beforeEach(async () => {
      await prismaService.organization.create({
        data: {
          id: testOrganizationId,
          name: 'Test Org',
          code: 'test-org',
          status: 'ACTIVE',
        },
      });

      await prismaService.company.create({
        data: {
          id: testCompanyId,
          organizationId: testOrganizationId,
          name: 'Test Company',
          legalName: 'Test Company LLC',
          taxId: '12345678901',
          businessVertical: BusinessVertical.GENERAL,
        },
      });

      // Create test user for audit logs
      await prismaService.user.create({
        data: {
          id: testActorId,
          email: 'test-actor@example.com',
          username: 'test-actor',
          password: 'hashed-password',
          organizationId: testOrganizationId,
          role: 'ADMIN',
        },
      });
    });

    afterEach(async () => {
      await prismaService.companyVerticalChangeAudit.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.companyVerticalRollbackSnapshot.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.user.delete({
        where: { id: testActorId },
      });
      await prismaService.company.delete({
        where: { id: testCompanyId },
      });
      await prismaService.organization.delete({
        where: { id: testOrganizationId },
      });
    });

    it('should rollback to previous vertical', async () => {
      // First migration: GENERAL -> RETAIL
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      let company = await prismaService.company.findUnique({
        where: { id: testCompanyId },
      });
      expect(company?.businessVertical).toBe(BusinessVertical.RETAIL);

      // Rollback
      const rolledBackVertical = await migrationService.rollback(
        testCompanyId,
        testActorId,
      );

      expect(rolledBackVertical).toBe(BusinessVertical.GENERAL);

      company = await prismaService.company.findUnique({
        where: { id: testCompanyId },
      });
      expect(company?.businessVertical).toBe(BusinessVertical.GENERAL);
    });

    it('should delete snapshot after rollback', async () => {
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      const snapshotBefore = await prismaService.companyVerticalRollbackSnapshot.findFirst(
        {
          where: { companyId: testCompanyId },
        },
      );
      expect(snapshotBefore).toBeDefined();

      await migrationService.rollback(testCompanyId, testActorId);

      const snapshotAfter = await prismaService.companyVerticalRollbackSnapshot.findFirst(
        {
          where: { companyId: testCompanyId },
        },
      );
      expect(snapshotAfter).toBeNull();
    });

    it('should create audit log for rollback', async () => {
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      await migrationService.rollback(testCompanyId, testActorId);

      const rollbackAudit = await prismaService.companyVerticalChangeAudit.findFirst(
        {
          where: {
            companyId: testCompanyId,
            changeReason: 'rollback',
          },
        },
      );

      expect(rollbackAudit).toBeDefined();
      expect(rollbackAudit?.oldVertical).toBe(BusinessVertical.RETAIL);
      expect(rollbackAudit?.newVertical).toBe(BusinessVertical.GENERAL);
    });
  });

  describe('Data Cleanup and Archival', () => {
    beforeEach(async () => {
      await prismaService.organization.create({
        data: {
          id: testOrganizationId,
          name: 'Test Org',
          code: 'test-org',
          status: 'ACTIVE',
        },
      });

      await prismaService.company.create({
        data: {
          id: testCompanyId,
          organizationId: testOrganizationId,
          name: 'Test Company',
          legalName: 'Test Company LLC',
          taxId: '12345678901',
          businessVertical: BusinessVertical.RESTAURANTS,
        },
      });

      // Create test user for audit logs
      await prismaService.user.create({
        data: {
          id: testActorId,
          email: 'test-actor@example.com',
          username: 'test-actor',
          password: 'hashed-password',
          organizationId: testOrganizationId,
          role: 'ADMIN',
        },
      });
    });

    afterEach(async () => {
      await prismaService.archivedRestaurantTable.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.archivedKitchenStation.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.restaurantTable.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.kitchenStation.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.companyVerticalChangeAudit.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.companyVerticalRollbackSnapshot.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.user.delete({
        where: { id: testActorId },
      });
      await prismaService.company.delete({
        where: { id: testCompanyId },
      });
      await prismaService.organization.delete({
        where: { id: testOrganizationId },
      });
    });

    it('should archive restaurant tables when switching away from RESTAURANTS', async () => {
      // Create test restaurant tables
      await prismaService.restaurantTable.createMany({
        data: [
          {
            companyId: testCompanyId,
            organizationId: testOrganizationId,
            name: 'Table 1',
            code: 'T1',
            capacity: 4,
            status: 'AVAILABLE',
          },
          {
            companyId: testCompanyId,
            organizationId: testOrganizationId,
            name: 'Table 2',
            code: 'T2',
            capacity: 2,
            status: 'AVAILABLE',
          },
        ],
      });

      const tablesBefore = await prismaService.restaurantTable.count({
        where: { companyId: testCompanyId },
      });
      expect(tablesBefore).toBe(2);

      // Switch away from RESTAURANTS
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.RESTAURANTS,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      // Tables should be deleted
      const tablesAfter = await prismaService.restaurantTable.count({
        where: { companyId: testCompanyId },
      });
      expect(tablesAfter).toBe(0);

      // Tables should be archived
      const archivedTables = await prismaService.archivedRestaurantTable.count({
        where: { companyId: testCompanyId },
      });
      expect(archivedTables).toBe(2);

      // Check archive data integrity
      const archived = await prismaService.archivedRestaurantTable.findMany({
        where: { companyId: testCompanyId },
      });

      expect(archived[0].name).toBe('Table 1');
      expect(archived[1].name).toBe('Table 2');
      expect(archived[0].archivedReason).toContain('vertical_migration');
    });

    it('should archive kitchen stations when switching away from RESTAURANTS', async () => {
      await prismaService.kitchenStation.createMany({
        data: [
          {
            companyId: testCompanyId,
            organizationId: testOrganizationId,
            name: 'Grill',
            code: 'GRILL',
            isActive: true,
          },
          {
            companyId: testCompanyId,
            organizationId: testOrganizationId,
            name: 'Cold',
            code: 'COLD',
            isActive: true,
          },
        ],
      });

      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.RESTAURANTS,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      const stationsAfter = await prismaService.kitchenStation.count({
        where: { companyId: testCompanyId },
      });
      expect(stationsAfter).toBe(0);

      const archivedStations = await prismaService.archivedKitchenStation.count({
        where: { companyId: testCompanyId },
      });
      expect(archivedStations).toBe(2);
    });
  });

  describe('Config Cache Invalidation', () => {
    beforeEach(async () => {
      await prismaService.organization.create({
        data: {
          id: testOrganizationId,
          name: 'Test Org',
          code: 'test-org',
          status: 'ACTIVE',
        },
      });

      await prismaService.company.create({
        data: {
          id: testCompanyId,
          organizationId: testOrganizationId,
          name: 'Test Company',
          legalName: 'Test Company LLC',
          taxId: '12345678901',
          businessVertical: BusinessVertical.GENERAL,
        },
      });

      // Create test user for audit logs
      await prismaService.user.create({
        data: {
          id: testActorId,
          email: 'test-actor@example.com',
          username: 'test-actor',
          password: 'hashed-password',
          organizationId: testOrganizationId,
          role: 'ADMIN',
        },
      });
    });

    afterEach(async () => {
      await prismaService.companyVerticalChangeAudit.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.companyVerticalRollbackSnapshot.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prismaService.user.delete({
        where: { id: testActorId },
      });
      await prismaService.company.delete({
        where: { id: testCompanyId },
      });
      await prismaService.organization.delete({
        where: { id: testOrganizationId },
      });
    });

    it('should invalidate cache after migration', async () => {
      // Load config to cache
      const configBefore = await configService.getConfig(testCompanyId);
      expect(configBefore.name).toBe(BusinessVertical.GENERAL);

      // Migrate
      await migrationService.changeVertical({
        companyId: testCompanyId,
        actorId: testActorId,
        previousVertical: BusinessVertical.GENERAL,
        targetVertical: BusinessVertical.RETAIL,
        warnings: [],
      });

      // Get config again - should reflect new vertical
      const configAfter = await configService.getConfig(testCompanyId);
      expect(configAfter.name).toBe(BusinessVertical.RETAIL);

      // Verify features changed
      expect(configBefore.features.tableManagement).toBe(true);
      expect(configAfter.features.tableManagement).toBe(false);
      expect(configAfter.features.posIntegration).toBe(true);
    });
  });
});
