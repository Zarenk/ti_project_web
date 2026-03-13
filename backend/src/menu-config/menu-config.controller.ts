import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { MenuConfigService } from './menu-config.service';
import { UpdateMenuConfigDto } from './dto/update-menu-config.dto';

@ApiTags('menu-config')
@Controller('menu-config')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
export class MenuConfigController {
  constructor(private readonly menuConfigService: MenuConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get menu configuration for current tenant' })
  async getConfig(
    @CurrentTenant('organizationId') orgId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.menuConfigService.getConfig(orgId, companyId);
  }

  @Put()
  @Roles('ADMIN', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
  @ApiOperation({ summary: 'Update menu configuration' })
  async updateConfig(
    @CurrentTenant('organizationId') orgId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Body() dto: UpdateMenuConfigDto,
  ) {
    return this.menuConfigService.updateConfig(
      orgId,
      companyId,
      dto.data,
      dto.expectedUpdatedAt,
    );
  }
}
