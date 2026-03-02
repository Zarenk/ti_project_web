import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { CreateGymMemberDto } from './dto/create-gym-member.dto';
import { UpdateGymMemberDto } from './dto/update-gym-member.dto';
import {
  encryptSensitiveFields,
  decryptSensitiveFields,
} from './sensitive-data.policy';
import { GYM_AUDIT_EVENTS } from './gym-audit-events';

@Injectable()
export class GymMemberService {
  private readonly logger = new Logger(GymMemberService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    dto: CreateGymMemberDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para registrar un miembro.',
      );
    }

    const encrypted = encryptSensitiveFields({
      medicalConditions: dto.medicalConditions ?? null,
      injuries: dto.injuries ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? null,
    });

    const member = await this.prisma.gymMember.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        dni: dto.dni ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        medicalConditions: encrypted.medicalConditions,
        injuries: encrypted.injuries,
        emergencyContactName: dto.emergencyContactName ?? null,
        emergencyContactPhone: encrypted.emergencyContactPhone,
        photo: dto.photo ?? null,
        notes: dto.notes ?? null,
        companyId,
        organizationId,
      },
    });

    const evt = GYM_AUDIT_EVENTS.MEMBER_CREATED;
    this.activityService.log({
      action: evt.action,
      entityType: evt.entityType,
      entityId: String(member.id),
      summary: evt.summary(`${member.firstName} ${member.lastName}`),
      organizationId,
      companyId,
    });

    return member;
  }

  async findAll(
    organizationId: number | null,
    companyId: number | null,
    query?: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymMemberWhereInput;

    const where: Prisma.GymMemberWhereInput = { ...baseFilter };

    if (query?.status) {
      where.status = query.status as any;
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { dni: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymMember.findMany({
        where,
        orderBy: { lastName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: {
            where: { status: { in: ['ACTIVE', 'TRIAL', 'FROZEN'] } },
            orderBy: { endDate: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.gymMember.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymMemberWhereInput;

    const member = await this.prisma.gymMember.findFirst({
      where: { id, ...filter },
      include: {
        memberships: { orderBy: { createdAt: 'desc' } },
        checkins: { orderBy: { checkinAt: 'desc' }, take: 10 },
      },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado.');
    }

    return decryptSensitiveFields(member);
  }

  async update(
    id: number,
    dto: UpdateGymMemberDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    // Verify the member exists and belongs to the tenant
    await this.findOne(id, organizationId, companyId);

    const data: Prisma.GymMemberUpdateInput = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.dni !== undefined) data.dni = dto.dni;
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    }
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.emergencyContactName !== undefined) {
      data.emergencyContactName = dto.emergencyContactName;
    }

    // Encrypt sensitive fields if provided
    const encrypted = encryptSensitiveFields({
      medicalConditions: dto.medicalConditions ?? null,
      injuries: dto.injuries ?? null,
      emergencyContactPhone: dto.emergencyContactPhone ?? null,
    });

    if (dto.medicalConditions !== undefined) {
      data.medicalConditions = encrypted.medicalConditions;
    }
    if (dto.injuries !== undefined) {
      data.injuries = encrypted.injuries;
    }
    if (dto.emergencyContactPhone !== undefined) {
      data.emergencyContactPhone = encrypted.emergencyContactPhone;
    }

    const updated = await this.prisma.gymMember.update({
      where: { id },
      data,
    });

    const evt = GYM_AUDIT_EVENTS.MEMBER_UPDATED;
    this.activityService.log({
      action: evt.action,
      entityType: evt.entityType,
      entityId: String(id),
      summary: evt.summary(`${updated.firstName} ${updated.lastName}`),
      organizationId,
      companyId,
    });

    return updated;
  }

  async remove(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    await this.findOne(id, organizationId, companyId);

    // Soft delete: mark as INACTIVE instead of hard delete
    return this.prisma.gymMember.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }
}
