import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { CreateCompanyDto } from './dto/create-company.dto';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from './tenant-context.decorator';
import { TenantContext } from './tenant-context.interface';
import { CompanySnapshot } from './entities/tenancy.entity';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.createCompany(dto, context);
  }
}
