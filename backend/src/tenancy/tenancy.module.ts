import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { GlobalSuperAdminGuard } from './global-super-admin.guard';
import { CompaniesController } from './companies.controller';

@Module({
  controllers: [TenancyController, CompaniesController],
  providers: [
    TenancyService,
    PrismaService,
    TenantContextService,
    TenantContextGuard,
    GlobalSuperAdminGuard,
  ],
  exports: [
    TenantContextService,
    TenantContextGuard,
    TenancyService,
    GlobalSuperAdminGuard,
  ],
})
export class TenancyModule {}
