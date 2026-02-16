import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { GlobalSuperAdminGuard } from './global-super-admin.guard';
import { CompaniesController } from './companies.controller';
import { VerticalConfigService } from './vertical-config.service';
import { VerticalCompatibilityService } from './vertical-compatibility.service';
import { CompanyVerticalController } from './company-vertical.controller';
import { VerticalMigrationService } from './vertical-migration.service';
import { VerticalEventsService } from './vertical-events.service';
import { VerticalSnapshotCleanupService } from './vertical-snapshot-cleanup.service';
import { VerticalNotificationsService } from './vertical-notifications.service';
import { VerticalWebhooksService } from './vertical-webhooks.service';

@Module({
  controllers: [TenancyController, CompaniesController, CompanyVerticalController],
  providers: [
    TenancyService,
    PrismaService,
    TenantContextService,
    TenantContextGuard,
    GlobalSuperAdminGuard,
    VerticalConfigService,
    VerticalCompatibilityService,
    VerticalMigrationService,
    VerticalEventsService,
    VerticalSnapshotCleanupService,
    VerticalNotificationsService,
    VerticalWebhooksService,
  ],
  exports: [
    TenantContextService,
    TenantContextGuard,
    TenancyService,
    GlobalSuperAdminGuard,
    VerticalConfigService,
    VerticalCompatibilityService,
    VerticalMigrationService,
    VerticalEventsService,
  ],
})
export class TenancyModule {}
