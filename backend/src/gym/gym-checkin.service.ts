import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { acquireLock } from 'src/common/locking/pessimistic-lock';
import { CreateGymCheckinDto } from './dto/create-gym-checkin.dto';
import { MembershipStatus } from './membership-states';
import { GYM_AUDIT_EVENTS } from './gym-audit-events';

/** Statuses that allow check-in */
const CHECKIN_ALLOWED_STATUSES: string[] = [
  MembershipStatus.ACTIVE,
  MembershipStatus.TRIAL,
];

/** Minimum minutes between two check-ins for the same member */
const DOUBLE_CHECKIN_WINDOW_MINUTES = 30;

@Injectable()
export class GymCheckinService {
  private readonly logger = new Logger(GymCheckinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Registers a check-in for a member.
   * Uses pessimistic locking to prevent double check-ins.
   */
  async checkin(
    dto: CreateGymCheckinDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para registrar check-in.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the member row to prevent concurrent check-ins
      const locked = await acquireLock(
        tx,
        'GymMember',
        dto.memberId,
        companyId,
      );
      if (!locked) {
        throw new NotFoundException('Miembro no encontrado.');
      }

      // 2. Verify the member has an active/trial membership
      const membership = dto.membershipId
        ? await tx.gymMembership.findFirst({
            where: {
              id: dto.membershipId,
              memberId: dto.memberId,
              companyId,
              status: { in: CHECKIN_ALLOWED_STATUSES as any },
            },
          })
        : await tx.gymMembership.findFirst({
            where: {
              memberId: dto.memberId,
              companyId,
              status: { in: CHECKIN_ALLOWED_STATUSES as any },
            },
            orderBy: { endDate: 'desc' },
          });

      if (!membership) {
        throw new BadRequestException(
          'El miembro no tiene una membresia activa.',
        );
      }

      // 3. Check for double check-in within the window
      const windowStart = new Date(
        Date.now() - DOUBLE_CHECKIN_WINDOW_MINUTES * 60 * 1000,
      );
      const recentCheckin = await tx.gymCheckin.findFirst({
        where: {
          memberId: dto.memberId,
          companyId,
          checkinAt: { gte: windowStart },
          checkoutAt: null,
        },
      });

      if (recentCheckin) {
        throw new ConflictException(
          `El miembro ya tiene un check-in activo (${DOUBLE_CHECKIN_WINDOW_MINUTES} min de ventana).`,
        );
      }

      // 4. Create the check-in record
      const checkin = await tx.gymCheckin.create({
        data: {
          memberId: dto.memberId,
          membershipId: membership.id,
          method: dto.method ?? 'MANUAL',
          companyId,
          organizationId,
        },
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      this.logger.log(
        `Check-in ${checkin.id} for member ${dto.memberId} (method: ${checkin.method})`,
      );

      // Audit log (fire-and-forget, outside transaction)
      const memberName = checkin.member
        ? `${checkin.member.firstName} ${checkin.member.lastName}`
        : `ID ${dto.memberId}`;
      const evt = GYM_AUDIT_EVENTS.CHECKIN;
      this.activityService.log({
        action: evt.action,
        entityType: evt.entityType,
        entityId: String(checkin.id),
        summary: evt.summary(memberName),
        organizationId,
        companyId,
      });

      return checkin;
    });
  }

  /**
   * Registers a checkout (end of visit).
   */
  async checkout(
    checkinId: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymCheckinWhereInput;

    const checkin = await this.prisma.gymCheckin.findFirst({
      where: { id: checkinId, ...filter },
    });

    if (!checkin) {
      throw new NotFoundException('Check-in no encontrado.');
    }

    if (checkin.checkoutAt) {
      throw new BadRequestException('Este check-in ya tiene checkout.');
    }

    return this.prisma.gymCheckin.update({
      where: { id: checkinId },
      data: { checkoutAt: new Date() },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * List check-ins with filters.
   */
  async findAll(
    organizationId: number | null,
    companyId: number | null,
    query?: {
      memberId?: number;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymCheckinWhereInput;

    const where: Prisma.GymCheckinWhereInput = { ...baseFilter };

    if (query?.memberId) {
      where.memberId = query.memberId;
    }

    if (query?.from || query?.to) {
      where.checkinAt = {};
      if (query.from) where.checkinAt.gte = new Date(query.from);
      if (query.to) where.checkinAt.lte = new Date(query.to);
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymCheckin.findMany({
        where,
        orderBy: { checkinAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
          membership: { select: { id: true, planName: true, status: true } },
        },
      }),
      this.prisma.gymCheckin.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Get today's active check-ins (no checkout yet).
   */
  async getActiveCheckins(
    organizationId: number | null,
    companyId: number | null,
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymCheckinWhereInput;

    return this.prisma.gymCheckin.findMany({
      where: {
        ...filter,
        checkinAt: { gte: today },
        checkoutAt: null,
      },
      orderBy: { checkinAt: 'desc' },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, photo: true } },
        membership: { select: { id: true, planName: true } },
      },
    });
  }
}
