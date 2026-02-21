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
import { LegalEventsService } from './legal-events.service';
import {
  CreateLegalEventDto,
  UpdateLegalEventDto,
  CreateLegalNoteDto,
  UpdateLegalNoteDto,
  CreateLegalTimeEntryDto,
  UpdateLegalTimeEntryDto,
} from './dto/create-legal-event.dto';
import {
  CreateCalendarNoteDto,
  UpdateCalendarNoteDto,
} from './dto/create-calendar-note.dto';

const LEGAL_ALLOWED_ROLES = [
  'ADMIN',
  'EMPLOYEE',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
];

@Controller('legal-events')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(...LEGAL_ALLOWED_ROLES)
@ModulePermission('legal')
export class LegalEventsController {
  constructor(private readonly service: LegalEventsService) {}

  // ── Events ──────────────────────────────────────────

  @Get()
  findAll(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAllEvents(
      organizationId ?? undefined,
      companyId ?? undefined,
      {
        status: status?.trim().toUpperCase() || undefined,
        from: from?.trim() || undefined,
        to: to?.trim() || undefined,
      },
    );
  }

  @Post()
  createEvent(
    @Body() dto: CreateLegalEventDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.createEvent(
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Patch(':id')
  updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalEventDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateEvent(
      id,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete(':id')
  deleteEvent(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.deleteEvent(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // ── Notes ───────────────────────────────────────────

  @Post('notes')
  createNote(
    @Body() dto: CreateLegalNoteDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.createNote(
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Patch('notes/:id')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalNoteDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateNote(
      id,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete('notes/:id')
  deleteNote(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.deleteNote(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // ── Time Entries ────────────────────────────────────

  @Post('time-entries')
  createTimeEntry(
    @Body() dto: CreateLegalTimeEntryDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.createTimeEntry(
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Patch('time-entries/:id')
  updateTimeEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLegalTimeEntryDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.updateTimeEntry(
      id,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  @Delete('time-entries/:id')
  deleteTimeEntry(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    return this.service.deleteTimeEntry(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
    );
  }

  // ── Calendar Notes (independent, not tied to matters) ─

  @Get('calendar-notes')
  findCalendarNotes(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findCalendarNotes(
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
      from?.trim() || undefined,
      to?.trim() || undefined,
    );
  }

  @Post('calendar-notes')
  createCalendarNote(
    @Body() dto: CreateCalendarNoteDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.createCalendarNote(
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Patch('calendar-notes/:id')
  updateCalendarNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarNoteDto,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.updateCalendarNote(
      id,
      dto,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }

  @Delete('calendar-notes/:id')
  deleteCalendarNote(
    @Param('id', ParseIntPipe) id: number,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Request() req: { user?: { userId?: number } },
  ) {
    return this.service.deleteCalendarNote(
      id,
      organizationId ?? undefined,
      companyId ?? undefined,
      req.user?.userId ?? null,
    );
  }
}
