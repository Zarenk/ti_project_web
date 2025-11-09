import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { plainToInstance } from 'class-transformer';
import { CreateSiteSettingDto } from './dto/create-site-setting.dto';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';
import { TenantContextService } from 'src/tenancy/tenant-context.service';

@ModulePermission('settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(
    private readonly siteSettingsService: SiteSettingsService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  private resolveTenantScope(): {
    organizationId: number | null;
    companyId: number | null;
  } {
    const context = this.tenantContextService.getContextWithFallback();
    return {
      organizationId: context.organizationId,
      companyId: context.companyId,
    };
  }

  @Get()
  async getSettings(): Promise<CreateSiteSettingDto> {
    const { organizationId, companyId } = this.resolveTenantScope();
    const settings = await this.siteSettingsService.getSettings(
      organizationId,
      companyId,
    );
    return plainToInstance(CreateSiteSettingDto, {
      settings: settings.data,
      updatedAt: settings.updatedAt.toISOString(),
      createdAt: settings.createdAt.toISOString(),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put()
  async updateSettings(
    @Body() dto: UpdateSiteSettingsDto,
  ): Promise<CreateSiteSettingDto> {
    const { organizationId, companyId } = this.resolveTenantScope();
    const settings = await this.siteSettingsService.updateSettings(
      dto,
      organizationId,
      companyId,
    );
    return plainToInstance(CreateSiteSettingDto, {
      settings: settings.data,
      updatedAt: settings.updatedAt.toISOString(),
      createdAt: settings.createdAt.toISOString(),
    });
  }
}
