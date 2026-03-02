import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
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

@Injectable()
export class LegalEventsService {
  private readonly logger = new Logger(LegalEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verticalConfig: VerticalConfigService,
  ) {}

  private async ensureLegalFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) return;
    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.projectTracking === false) {
      throw new ForbiddenException(
        'El modulo legal no esta habilitado para esta empresa.',
      );
    }
  }

  private matterTenantFilter(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    return buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.LegalMatterWhereInput;
  }

  // ── Events ──────────────────────────────────────────

  async findAllEvents(
    organizationId?: number | null,
    companyId?: number | null,
    filters?: { status?: string; from?: string; to?: string },
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const where: Prisma.LegalEventWhereInput = {
      matter: this.matterTenantFilter(organizationId, companyId),
    };

    if (filters?.status) {
      where.status = filters.status as any;
    }
    if (filters?.from || filters?.to) {
      where.scheduledAt = {};
      if (filters?.from) where.scheduledAt.gte = new Date(filters.from);
      if (filters?.to) where.scheduledAt.lte = new Date(filters.to);
    }

    return this.prisma.legalEvent.findMany({
      where,
      include: {
        matter: { select: { id: true, title: true, internalCode: true } },
        assignedTo: { select: { id: true, username: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async createEvent(
    dto: CreateLegalEventDto,
    organizationId?: number | null,
    companyId?: number | null,
    createdById?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const matter = await this.prisma.legalMatter.findFirst({
      where: { id: dto.matterId, ...this.matterTenantFilter(organizationId, companyId) },
    });
    if (!matter) throw new NotFoundException('Expediente no encontrado.');

    const event = await this.prisma.legalEvent.create({
      data: {
        matterId: dto.matterId,
        title: dto.title,
        type: (dto.type as any) ?? 'OTRO',
        description: dto.description ?? null,
        location: dto.location ?? null,
        scheduledAt: new Date(dto.scheduledAt),
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        assignedToId: dto.assignedToId ?? null,
        createdById: createdById ?? null,
      },
      include: {
        assignedTo: { select: { id: true, username: true } },
      },
    });

    // Update matter nextDeadline if this event is sooner
    if (
      !matter.nextDeadline ||
      new Date(dto.scheduledAt) < matter.nextDeadline
    ) {
      await this.prisma.legalMatter.update({
        where: { id: dto.matterId },
        data: { nextDeadline: new Date(dto.scheduledAt) },
      });
    }

    return event;
  }

  async updateEvent(
    id: number,
    dto: UpdateLegalEventDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalEvent.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Evento no encontrado.');

    const data: Prisma.LegalEventUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.status !== undefined) data.status = dto.status as any;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.scheduledAt !== undefined)
      data.scheduledAt = new Date(dto.scheduledAt);
    if (dto.endAt !== undefined)
      data.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.reminderAt !== undefined)
      data.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    return this.prisma.legalEvent.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, username: true } },
      },
    });
  }

  async deleteEvent(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalEvent.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Evento no encontrado.');

    await this.prisma.legalEvent.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ── Notes ───────────────────────────────────────────

  async createNote(
    dto: CreateLegalNoteDto,
    organizationId?: number | null,
    companyId?: number | null,
    createdById?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const matter = await this.prisma.legalMatter.findFirst({
      where: { id: dto.matterId, ...this.matterTenantFilter(organizationId, companyId) },
    });
    if (!matter) throw new NotFoundException('Expediente no encontrado.');

    return this.prisma.legalNote.create({
      data: {
        matterId: dto.matterId,
        content: dto.content,
        isPrivate: dto.isPrivate ?? false,
        createdById: createdById ?? null,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async updateNote(
    id: number,
    dto: UpdateLegalNoteDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalNote.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Nota no encontrada.');

    const data: Prisma.LegalNoteUpdateInput = {};
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.isPrivate !== undefined) data.isPrivate = dto.isPrivate;

    return this.prisma.legalNote.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async deleteNote(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalNote.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Nota no encontrada.');

    await this.prisma.legalNote.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ── Time Entries ────────────────────────────────────

  async createTimeEntry(
    dto: CreateLegalTimeEntryDto,
    organizationId?: number | null,
    companyId?: number | null,
    userId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const matter = await this.prisma.legalMatter.findFirst({
      where: { id: dto.matterId, ...this.matterTenantFilter(organizationId, companyId) },
    });
    if (!matter) throw new NotFoundException('Expediente no encontrado.');

    const resolvedUserId = userId;
    if (!resolvedUserId) {
      throw new NotFoundException('Usuario no identificado.');
    }

    const amount =
      dto.rate && dto.hours ? dto.rate * dto.hours : null;

    return this.prisma.legalTimeEntry.create({
      data: {
        matterId: dto.matterId,
        userId: resolvedUserId,
        description: dto.description,
        hours: dto.hours,
        rate: dto.rate ?? null,
        amount,
        billable: dto.billable ?? true,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });
  }

  async updateTimeEntry(
    id: number,
    dto: UpdateLegalTimeEntryDto,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalTimeEntry.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Registro de horas no encontrado.');

    const data: Prisma.LegalTimeEntryUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.hours !== undefined) data.hours = dto.hours;
    if (dto.rate !== undefined) data.rate = dto.rate;
    if (dto.billable !== undefined) data.billable = dto.billable;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    // Recalculate amount
    const hours = dto.hours ?? existing.hours;
    const rate = dto.rate !== undefined ? dto.rate : existing.rate;
    data.amount = rate && hours ? Number(rate) * hours : null;

    return this.prisma.legalTimeEntry.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, username: true } },
      },
    });
  }

  async deleteTimeEntry(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    await this.ensureLegalFeatureEnabled(companyId);

    const existing = await this.prisma.legalTimeEntry.findFirst({
      where: {
        id,
        matter: this.matterTenantFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Registro de horas no encontrado.');

    await this.prisma.legalTimeEntry.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ── Calendar Notes (independent, not tied to matters) ─

  async findCalendarNotes(
    organizationId?: number | null,
    companyId?: number | null,
    userId?: number | null,
    from?: string,
    to?: string,
  ) {
    const where: Prisma.CalendarNoteWhereInput = {
      ...buildOrganizationFilter(organizationId, companyId),
      OR: [
        { isPrivate: false },
        { isPrivate: true, createdById: userId ?? -1 },
      ],
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    return this.prisma.calendarNote.findMany({
      where,
      include: {
        createdBy: { select: { id: true, username: true } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCalendarNote(
    dto: CreateCalendarNoteDto,
    organizationId?: number | null,
    companyId?: number | null,
    createdById?: number | null,
  ) {
    return this.prisma.calendarNote.create({
      data: {
        organizationId: organizationId ?? null,
        companyId: companyId ?? null,
        date: new Date(dto.date),
        content: dto.content,
        color: dto.color ?? null,
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        isPrivate: dto.isPrivate ?? false,
        createdById: createdById ?? null,
      },
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async updateCalendarNote(
    id: number,
    dto: UpdateCalendarNoteDto,
    organizationId?: number | null,
    companyId?: number | null,
    userId?: number | null,
  ) {
    const existing = await this.prisma.calendarNote.findFirst({
      where: {
        id,
        ...buildOrganizationFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Nota de calendario no encontrada.');

    if (existing.createdById !== userId) {
      throw new ForbiddenException('Solo el creador puede editar esta nota.');
    }

    const data: Prisma.CalendarNoteUpdateInput = {};
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.isPrivate !== undefined) data.isPrivate = dto.isPrivate;
    if (dto.reminderAt !== undefined) {
      data.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
      if (!dto.reminderAt) data.reminderSent = false;
    }

    return this.prisma.calendarNote.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async deleteCalendarNote(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
    userId?: number | null,
  ) {
    const existing = await this.prisma.calendarNote.findFirst({
      where: {
        id,
        ...buildOrganizationFilter(organizationId, companyId),
      },
    });
    if (!existing) throw new NotFoundException('Nota de calendario no encontrada.');

    if (existing.createdById !== userId) {
      throw new ForbiddenException('Solo el creador puede eliminar esta nota.');
    }

    await this.prisma.calendarNote.delete({ where: { id } });
    return { deleted: true, id };
  }
}
