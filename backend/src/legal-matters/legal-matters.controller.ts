import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { LegalMattersService } from './legal-matters.service';
import {
  CreateLegalMatterDto,
  CreateLegalMatterPartyDto,
  UpdateLegalMatterPartyDto,
} from './dto/create-legal-matter.dto';
import { UpdateLegalMatterDto } from './dto/update-legal-matter.dto';

const LEGAL_ALLOWED_ROLES = [
  'ADMIN',
  'EMPLOYEE',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
];

@Controller('legal-matters')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(...LEGAL_ALLOWED_ROLES)
@ModulePermission('legal')
export class LegalMattersController {
  constructor(private readonly service: LegalMattersService) {}

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('status') status?: string,
    @Query('area') area?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      organizationId ?? undefined,
      companyId ?? undefined,
      {
        status: status?.trim().toUpperCase() || undefined,
        area: area?.trim().toUpperCase() || undefined,
        assignedToId: assignedToId ? Number(assignedToId) : undefined,
        clientId: clientId ? Number(clientId) : undefined,
        search: search?.trim() || undefined,
      },
    );
  }

  @Get('stats')
  getStats(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.getStats(
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.findOne(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Post()
  create(
    @Body() dto: CreateLegalMatterDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.create(
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalMatterDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.update(
      id,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.remove(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // ── Parties ──────────────────────────────────────────

  @Post(':matterId/parties')
  addParty(
    @Param('matterId', ParseIntPipe) matterId: number,
    @Body() dto: CreateLegalMatterPartyDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.addParty(
      matterId,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Patch(':matterId/parties/:partyId')
  updateParty(
    @Param('matterId', ParseIntPipe) matterId: number,
    @Param('partyId', ParseIntPipe) partyId: number,
    @Body() dto: UpdateLegalMatterPartyDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateParty(
      matterId,
      partyId,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete(':matterId/parties/:partyId')
  removeParty(
    @Param('matterId', ParseIntPipe) matterId: number,
    @Param('partyId', ParseIntPipe) partyId: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.removeParty(
      matterId,
      partyId,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }
}
