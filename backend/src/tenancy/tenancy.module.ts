import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';

@Module({
  controllers: [TenancyController],
  providers: [
    TenancyService,
    PrismaService,
    TenantContextService,
    TenantContextGuard,
  ],
  exports: [TenantContextService, TenantContextGuard, TenancyService],
})
export class TenancyModule {}
