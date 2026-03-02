import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { CreateGymClassDto } from './dto/create-gym-class.dto';
import { UpdateGymClassDto } from './dto/update-gym-class.dto';
import { CreateGymScheduleDto } from './dto/create-gym-schedule.dto';
import { CreateGymBookingDto } from './dto/create-gym-booking.dto';

@Injectable()
export class GymClassService {
  private readonly logger = new Logger(GymClassService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Class CRUD ──────────────────────────────────────────────────────────

  async createClass(
    dto: CreateGymClassDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para crear una clase.',
      );
    }

    return this.prisma.gymClass.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        durationMin: dto.durationMin ?? 60,
        maxCapacity: dto.maxCapacity ?? 20,
        companyId,
        organizationId,
      },
    });
  }

  async findAllClasses(
    organizationId: number | null,
    companyId: number | null,
    query?: { search?: string; isActive?: boolean; page?: number; pageSize?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassWhereInput;

    const where: Prisma.GymClassWhereInput = { ...baseFilter };

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymClass.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              trainer: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      }),
      this.prisma.gymClass.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOneClass(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassWhereInput;

    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id, ...filter },
      include: {
        schedules: {
          include: {
            trainer: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!gymClass) {
      throw new NotFoundException('Clase no encontrada.');
    }

    return gymClass;
  }

  async updateClass(
    id: number,
    dto: UpdateGymClassDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    await this.findOneClass(id, organizationId, companyId);

    const data: Prisma.GymClassUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.durationMin !== undefined) data.durationMin = dto.durationMin;
    if (dto.maxCapacity !== undefined) data.maxCapacity = dto.maxCapacity;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.gymClass.update({
      where: { id },
      data,
    });
  }

  // ── Schedule CRUD ───────────────────────────────────────────────────────

  async createSchedule(
    dto: CreateGymScheduleDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para crear un horario.',
      );
    }

    // Verify class exists and belongs to tenant
    await this.findOneClass(dto.classId, organizationId, companyId);

    return this.prisma.gymClassSchedule.create({
      data: {
        classId: dto.classId,
        trainerId: dto.trainerId ?? null,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        companyId,
        organizationId,
      },
      include: {
        gymClass: { select: { id: true, name: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAllSchedules(
    organizationId: number | null,
    companyId: number | null,
    query?: { classId?: number; trainerId?: number; dayOfWeek?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassScheduleWhereInput;

    const where: Prisma.GymClassScheduleWhereInput = {
      ...baseFilter,
      isActive: true,
    };

    if (query?.classId) where.classId = query.classId;
    if (query?.trainerId) where.trainerId = query.trainerId;
    if (query?.dayOfWeek !== undefined) where.dayOfWeek = query.dayOfWeek;

    return this.prisma.gymClassSchedule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        gymClass: { select: { id: true, name: true, durationMin: true, maxCapacity: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async deleteSchedule(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassScheduleWhereInput;

    const schedule = await this.prisma.gymClassSchedule.findFirst({
      where: { id, ...filter },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado.');
    }

    return this.prisma.gymClassSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ── Bookings ────────────────────────────────────────────────────────────

  async createBooking(
    dto: CreateGymBookingDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para reservar un cupo.',
      );
    }

    // Verify schedule exists
    const schedule = await this.prisma.gymClassSchedule.findFirst({
      where: { id: dto.scheduleId, companyId, isActive: true },
      include: { gymClass: true },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado.');
    }

    // Check capacity
    const bookingDate = new Date(dto.bookingDate);
    const existingCount = await this.prisma.gymClassBooking.count({
      where: {
        scheduleId: dto.scheduleId,
        bookingDate,
        status: { in: ['BOOKED', 'ATTENDED'] },
      },
    });

    if (existingCount >= schedule.gymClass.maxCapacity) {
      throw new ConflictException(
        `La clase esta llena (${schedule.gymClass.maxCapacity} cupos).`,
      );
    }

    // Verify member exists
    const member = await this.prisma.gymMember.findFirst({
      where: { id: dto.memberId, companyId },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado.');
    }

    return this.prisma.gymClassBooking.create({
      data: {
        scheduleId: dto.scheduleId,
        memberId: dto.memberId,
        bookingDate,
        companyId,
        organizationId,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        schedule: {
          include: {
            gymClass: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findBookings(
    organizationId: number | null,
    companyId: number | null,
    query?: { scheduleId?: number; memberId?: number; date?: string; page?: number; pageSize?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassBookingWhereInput;

    const where: Prisma.GymClassBookingWhereInput = { ...baseFilter };

    if (query?.scheduleId) where.scheduleId = query.scheduleId;
    if (query?.memberId) where.memberId = query.memberId;
    if (query?.date) where.bookingDate = new Date(query.date);

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymClassBooking.findMany({
        where,
        orderBy: { bookingDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
          schedule: {
            include: {
              gymClass: { select: { id: true, name: true } },
              trainer: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.gymClassBooking.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async cancelBooking(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassBookingWhereInput;

    const booking = await this.prisma.gymClassBooking.findFirst({
      where: { id, ...filter },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    if (booking.status !== 'BOOKED') {
      throw new BadRequestException(
        'Solo se pueden cancelar reservas en estado BOOKED.',
      );
    }

    return this.prisma.gymClassBooking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async markAttendance(
    id: number,
    status: 'ATTENDED' | 'NO_SHOW',
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymClassBookingWhereInput;

    const booking = await this.prisma.gymClassBooking.findFirst({
      where: { id, ...filter },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada.');
    }

    return this.prisma.gymClassBooking.update({
      where: { id },
      data: { status },
    });
  }
}
