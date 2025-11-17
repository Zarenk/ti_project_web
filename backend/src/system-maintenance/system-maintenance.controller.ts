import {
  Controller,
  Post,
  Res,
  StreamableFile,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { ModulePermissionsGuard } from 'src/common/guards/module-permissions.guard';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { SystemMaintenanceService } from './system-maintenance.service';

@ApiTags('system-maintenance')
@UseGuards(JwtAuthGuard, ModulePermissionsGuard)
@ModulePermission('settings')
@SetMetadata('module', 'settings')
@Controller()
export class SystemMaintenanceController {
  constructor(
    private readonly systemMaintenanceService: SystemMaintenanceService,
  ) {}

  @Post('system/backups')
  @ApiOperation({ summary: 'Generate a downloadable backup of the database' })
  async generateBackup(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const backup = await this.systemMaintenanceService.generateBackup({
      organizationId: organizationId ?? undefined,
      companyId: companyId ?? undefined,
    });

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${backup.filename}"`,
    );
    res.setHeader('Content-Type', backup.contentType);

    return new StreamableFile(backup.stream, {
      type: backup.contentType,
      disposition: `attachment; filename="${backup.filename}"`,
    });
  }

  @Post('system/purge')
  @ApiOperation({
    summary:
      'Purge transactional data while keeping user and configuration records intact',
  })
  async purge(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ): Promise<{
    deletedCounts: Record<string, number>;
    finishedAt: string;
  }> {
    return this.systemMaintenanceService.purgeNonUserData({
      organizationId: organizationId ?? undefined,
      companyId: companyId ?? undefined,
    });
  }
}
