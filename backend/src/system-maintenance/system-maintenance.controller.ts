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
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const backup = await this.systemMaintenanceService.generateBackup();

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
  async purge(): Promise<{
    deletedCounts: Record<string, number>;
    finishedAt: string;
  }> {
    return this.systemMaintenanceService.purgeNonUserData();
  }
}
