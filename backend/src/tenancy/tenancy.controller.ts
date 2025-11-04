import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenancyService, TenantSelectionSummary } from './tenancy.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { TenancySnapshot } from './entities/tenancy.entity';
import { GlobalSuperAdminGuard } from './global-super-admin.guard';
import { AssignSuperAdminDto } from './dto/assign-super-admin.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantContextService } from './tenant-context.service';
import type { Request } from 'express';
import type { TenantContext } from './tenant-context.interface';

@Controller('tenancy')
export class TenancyController {
  constructor(
    private readonly tenancyService: TenancyService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentTenant(
    @Req() request: Request,
  ): Promise<TenantSelectionSummary> {
    try {
      const context = this.tenantContextService.getContextWithFallback();
      (request as any).tenantContext = context;
      const summary = await this.tenancyService.resolveTenantSelection(context);

      if (summary.organization || summary.company) {
        this.tenantContextService.updateContext({
          organizationId: summary.organization?.id ?? context.organizationId,
          companyId: summary.company?.id ?? context.companyId,
        });
        (request as any).tenantContext =
          this.tenantContextService.getContext();
      }

      return summary;
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }

      const fallbackContext: TenantContext = {
        organizationId: null,
        companyId: null,
        organizationUnitId: null,
        userId: null,
        isGlobalSuperAdmin: true,
        isOrganizationSuperAdmin: false,
        isSuperAdmin: true,
        allowedOrganizationIds: [],
        allowedCompanyIds: [],
        allowedOrganizationUnitIds: [],
      };

      const summary =
        await this.tenancyService.resolveTenantSelection(fallbackContext);

      if (summary.organization || summary.company) {
        this.tenantContextService.updateContext({
          organizationId: summary.organization?.id ?? null,
          companyId: summary.company?.id ?? null,
        });
        (request as any).tenantContext =
          this.tenantContextService.getContextWithFallback();
      }

      return summary;
    }
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Post()
  create(@Body() createTenancyDto: CreateTenancyDto): Promise<TenancySnapshot> {
    return this.tenancyService.create(createTenancyDto);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Get()
  findAll(): Promise<TenancySnapshot[]> {
    return this.tenancyService.findAll();
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.findOne(id);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenancyDto: UpdateTenancyDto,
  ): Promise<TenancySnapshot> {
    return this.tenancyService.update(id, updateTenancyDto);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Patch(':id/super-admin')
  assignSuperAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignSuperAdminDto,
  ): Promise<TenancySnapshot> {
    return this.tenancyService.assignSuperAdmin(id, dto.userId);
  }

  @UseGuards(GlobalSuperAdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.remove(id);
  }
}
