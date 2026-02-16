import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { VerticalConfigService } from './vertical-config.service';
import { VerticalCompatibilityService } from './vertical-compatibility.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { VerticalMigrationService } from './vertical-migration.service';
import { CompanyVerticalController } from './company-vertical.controller';

describe('CompanyVerticalController', () => {
  let controller: CompanyVerticalController;
  let prisma: any;
  let tenantContext: any;
  let configService: any;
  let compatibility: any;
  let migrationService: any;

  const setupModule = async () => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    tenantContext = {
      getContextWithFallback: jest.fn().mockReturnValue({
        organizationId: 1,
        isGlobalSuperAdmin: true,
        isOrganizationSuperAdmin: false,
        userId: 99,
      }),
    };

    configService = {
      getConfig: jest.fn().mockResolvedValue({ name: 'demo' }),
      invalidate: jest.fn(),
      invalidateCache: jest.fn(),
    };

    compatibility = {
      check: jest.fn().mockResolvedValue({
        isCompatible: true,
        errors: [],
        warnings: [],
      }),
    };

    migrationService = {
      changeVertical: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(BusinessVertical.GENERAL),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CompanyVerticalController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenantContext },
        { provide: VerticalConfigService, useValue: configService },
        {
          provide: VerticalCompatibilityService,
          useValue: compatibility,
        },
        { provide: VerticalMigrationService, useValue: migrationService },
      ],
    }).compile();

    controller = await moduleRef.resolve(CompanyVerticalController);
  };

  beforeEach(async () => {
    await setupModule();
  });

  it('returns the current config for a company', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 1,
      organizationId: 77,
      businessVertical: BusinessVertical.GENERAL,
      productSchemaEnforced: false,
    });
    prisma.product.count.mockResolvedValueOnce(0).mockResolvedValue(0);

    const result = await controller.getVertical(1);

    expect(result).toMatchObject({
      companyId: 1,
      organizationId: 77,
      businessVertical: BusinessVertical.GENERAL,
      productSchemaEnforced: false,
      config: { name: 'demo' },
    });
    expect(configService.getConfig).toHaveBeenCalledWith(1);
  });

  it('updates the vertical and records snapshot/audit entries', async () => {
    prisma.company.findUnique.mockResolvedValue({
      organizationId: 77,
      businessVertical: BusinessVertical.GENERAL,
      productSchemaEnforced: false,
    });

    const result = await controller.updateVertical(1, {
      vertical: BusinessVertical.RETAIL,
      force: false,
      reason: 'poc-test',
    });

    expect(result).toMatchObject({
      companyId: 1,
      organizationId: 77,
      businessVertical: BusinessVertical.RETAIL,
    });
    expect(compatibility.check).toHaveBeenCalledWith(
      1,
      BusinessVertical.GENERAL,
      BusinessVertical.RETAIL,
    );
    expect(migrationService.changeVertical).toHaveBeenCalledWith({
      companyId: 1,
      actorId: 99,
      previousVertical: BusinessVertical.GENERAL,
      targetVertical: BusinessVertical.RETAIL,
      warnings: [],
      reason: 'poc-test',
    });
  });

  it('requires force flag when compatibility has warnings', async () => {
    prisma.company.findUnique.mockResolvedValue({
      organizationId: 77,
      businessVertical: BusinessVertical.GENERAL,
    });
    compatibility.check.mockResolvedValue({
      isCompatible: true,
      errors: [],
      warnings: ['warning'],
    });

    await expect(
      controller.updateVertical(1, {
        vertical: BusinessVertical.RETAIL,
        force: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await controller.updateVertical(1, {
      vertical: BusinessVertical.RETAIL,
      force: true,
    });

    expect(migrationService.changeVertical).toHaveBeenCalledTimes(1);
  });

  it('rolls back using the most recent snapshot', async () => {
    prisma.company.findUnique.mockResolvedValue({
      organizationId: 77,
      businessVertical: BusinessVertical.RETAIL,
    });
    const result = await controller.rollback(1);

    expect(result).toEqual({
      companyId: 1,
      organizationId: 77,
      businessVertical: BusinessVertical.GENERAL,
    });
    expect(migrationService.rollback).toHaveBeenCalledWith(1, 99);
  });
});
