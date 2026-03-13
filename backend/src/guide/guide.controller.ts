import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Res,
  StreamableFile,
  InternalServerErrorException,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { GuideService } from './guide.service';
import { CreateGuideDto } from './dto/create-guide.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { SubscriptionStatusGuard } from 'src/common/guards/subscription-status.guard';
import { RequiresActiveSubscription } from 'src/common/decorators/requires-subscription.decorator';

@Controller('guide')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@ModulePermission('inventory')
export class GuideController {
  constructor(private readonly guideService: GuideService) {}

  @Post()
  @UseGuards(SubscriptionStatusGuard)
  @RequiresActiveSubscription('guides', { maxGraceTier: null })
  async generarGuia(
    @Body() dto: CreateGuideDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.guideService.generarGuia(dto, organizationId, companyId);
  }

  @Post('validate')
  async validarGuia(
    @Body() dto: CreateGuideDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.guideService.validateGuide(dto, companyId, organizationId);
  }

  @Get('shipping-guides')
  findAll(@CurrentTenant('organizationId') organizationId: number | null) {
    return this.guideService.findAllShippingGuides(organizationId);
  }

  @Get(':id/status')
  getStatus(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.guideService.getGuideStatus(Number(id), organizationId);
  }

  @Post(':id/refresh-status')
  refreshStatus(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.guideService.refreshGuideStatus(
      Number(id),
      organizationId,
      companyId,
    );
  }

  @Delete(':id')
  deleteGuide(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    return this.guideService.deleteGuide(Number(id), organizationId);
  }

  @Patch(':id/void')
  voidGuide(
    @Param('id') id: string,
    @CurrentTenant('organizationId') organizationId: number | null,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const userId: number = req.user?.userId ?? req.user?.sub ?? 0;
    return this.guideService.voidGuide(Number(id), organizationId, body?.reason, userId);
  }

  @Get(':id/files/:type')
  async downloadFile(
    @Param('id') id: string,
    @Param('type') type: 'xml' | 'zip' | 'cdr',
    @CurrentTenant('organizationId') organizationId: number | null,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.guideService.getGuideFilePath(
      Number(id),
      type,
      organizationId,
    );
    if (type === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
    } else {
      res.setHeader('Content-Type', 'application/zip');
    }
    return new StreamableFile(createReadStream(filePath));
  }
}
