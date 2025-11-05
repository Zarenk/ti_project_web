import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CreateCompanyDto } from './dto/create-company.dto';
import { TenancyService } from './tenancy.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from './tenant-context.decorator';
import { TenantContext } from './tenant-context.interface';
import { CompanySnapshot, TenancySnapshot } from './entities/tenancy.entity';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseGuards(JwtAuthGuard, TenantContextGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @Get()
  list(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<TenancySnapshot[]> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.listCompanies(context);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<
    CompanySnapshot & {
      organization: { id: number; name: string; code: string | null; status: string };
    }
  > {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.getCompanyById(id, context);
  }

  @Post()
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.createCompany(dto, context);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyDto,
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<CompanySnapshot> {
    const context = tenant ?? this.tenantContextService.getContext();
    return this.tenancyService.updateCompany(id, dto, context);
  }
}
