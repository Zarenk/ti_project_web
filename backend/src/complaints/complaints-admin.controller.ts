import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { Roles } from 'src/users/roles.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { ComplaintsService } from './complaints.service';
import { RespondComplaintDto } from './dto/respond-complaint.dto';
import { ComplaintFiltersDto } from './dto/complaint-filters.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
export class ComplaintsAdminController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  async findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query() filters: ComplaintFiltersDto,
  ) {
    return this.complaintsService.findAll(organizationId, companyId, filters);
  }

  @Get('stats')
  async getStats(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.complaintsService.getStats(organizationId, companyId);
  }

  @Get('export')
  async exportCsv(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query() filters: ComplaintFiltersDto,
    @Res() res: Response,
  ) {
    const csv = await this.complaintsService.exportCsv(
      organizationId,
      companyId,
      filters,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=libro-reclamaciones.csv',
    );
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  }

  @Get(':id')
  async findById(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.complaintsService.findById(organizationId, companyId, id);
  }

  @Patch(':id/respond')
  async respond(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondComplaintDto,
    @Req() req: Request,
  ) {
    return this.complaintsService.respond(
      organizationId,
      companyId,
      id,
      dto,
      req.user.userId,
    );
  }

  @Patch(':id/reclassify')
  async reclassify(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.complaintsService.reclassify(
      organizationId,
      companyId,
      id,
      req.user.userId,
    );
  }
}
