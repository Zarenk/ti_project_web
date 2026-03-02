import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { acquireLock } from 'src/common/locking/pessimistic-lock';
import { CreateGymMembershipDto } from './dto/create-gym-membership.dto';
import {
  membershipStateMachine,
  MembershipStatus,
  MembershipEvent,
} from './membership-states';
import { GYM_AUDIT_EVENTS } from './gym-audit-events';

@Injectable()
export class GymMembershipService {
  private readonly logger = new Logger(GymMembershipService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    dto: CreateGymMembershipDto,
    organizationId: number | null,
    companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException(
        'Se requiere companyId para crear una membresia.',
      );
    }

    // Verify member exists and belongs to this tenant
    const member = await this.prisma.gymMember.findFirst({
      where: { id: dto.memberId, companyId },
    });
    if (!member) {
      throw new NotFoundException('Miembro no encontrado.');
    }

    return this.prisma.gymMembership.create({
      data: {
        memberId: dto.memberId,
        planName: dto.planName,
        status: MembershipStatus.PROSPECT,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        price: dto.price,
        maxFreezes: dto.maxFreezes ?? 0,
        gracePeriodDays: dto.gracePeriodDays ?? 7,
        companyId,
        organizationId,
      },
      include: { member: true },
    });
  }

  async findAll(
    organizationId: number | null,
    companyId: number | null,
    query?: { memberId?: number; status?: string; page?: number; pageSize?: number },
  ) {
    const baseFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.GymMembershipWhereInput;

    const where: Prisma.GymMembershipWhereInput = { ...baseFilter };

    if (query?.memberId) {
      where.memberId = query.memberId;
    }
    if (query?.status) {
      where.status = query.status as any;
    }

    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      this.prisma.gymMembership.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.gymMembership.count({ where }),
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
    ) as Prisma.GymMembershipWhereInput;

    const membership = await this.prisma.gymMembership.findFirst({
      where: { id, ...filter },
      include: { member: true },
    });

    if (!membership) {
      throw new NotFoundException('Membresia no encontrada.');
    }

    return membership;
  }

  /**
   * Applies a state machine event to a membership.
   * Uses pessimistic locking to prevent race conditions on state transitions.
   */
  async applyEvent(
    id: number,
    event: string,
    organizationId: number | null,
    companyId: number | null,
  ) {
    // Pre-validate that membership exists and belongs to tenant
    const membership = await this.findOne(id, organizationId, companyId);
    const memberName = membership.member
      ? `${membership.member.firstName} ${membership.member.lastName}`
      : `ID ${membership.memberId}`;

    if (!companyId) {
      throw new BadRequestException('Se requiere companyId para transiciones.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock the membership row to prevent concurrent transitions
      const locked = await acquireLock(tx, 'GymMembership', id, companyId);
      if (!locked) {
        throw new NotFoundException('Membresia no encontrada.');
      }

      // Re-read inside the transaction to get latest status
      const current = await tx.gymMembership.findUnique({
        where: { id },
        include: { member: true },
      });
      if (!current) {
        throw new NotFoundException('Membresia no encontrada.');
      }

      const currentStatus = current.status as MembershipStatus;
      const membershipEvent = event as MembershipEvent;

      // Validate the transition
      if (!membershipStateMachine.canTransition(currentStatus, membershipEvent)) {
        const validEvents = membershipStateMachine.getValidEvents(currentStatus);
        throw new BadRequestException(
          `No se puede aplicar "${event}" desde el estado "${currentStatus}". ` +
            `Eventos validos: ${validEvents.join(', ') || 'ninguno'}.`,
        );
      }

      const newStatus = membershipStateMachine.transition(
        currentStatus,
        membershipEvent,
      );

      // Build side-effect data based on the event
      const data: Prisma.GymMembershipUpdateInput = {
        status: newStatus as any,
      };

      switch (membershipEvent) {
        case MembershipEvent.FREEZE:
          if (current.freezesUsed >= current.maxFreezes) {
            throw new BadRequestException(
              `Se alcanzo el limite de congelaciones (${current.maxFreezes}).`,
            );
          }
          data.frozenAt = new Date();
          data.freezesUsed = current.freezesUsed + 1;
          break;

        case MembershipEvent.UNFREEZE:
          data.frozenAt = null;
          break;

        case MembershipEvent.PAYMENT_FAILED:
          data.pastDueSince = new Date();
          break;

        case MembershipEvent.PAYMENT_SUCCESS:
          data.pastDueSince = null;
          break;

        case MembershipEvent.REQUEST_CANCEL:
          data.scheduledCancelDate = current.endDate;
          break;

        case MembershipEvent.REVOKE_CANCEL:
          data.scheduledCancelDate = null;
          break;

        case MembershipEvent.CONFIRM_CANCEL:
          data.scheduledCancelDate = null;
          break;
      }

      const updated = await tx.gymMembership.update({
        where: { id },
        data,
        include: { member: true },
      });

      this.logger.log(
        `Membership ${id} transitioned: ${currentStatus} -> ${newStatus} (event: ${event})`,
      );

      // Audit log
      const evt = GYM_AUDIT_EVENTS.MEMBERSHIP_STATE_CHANGE;
      this.activityService.log({
        action: evt.action,
        entityType: evt.entityType,
        entityId: String(id),
        summary: evt.summary(memberName, currentStatus, newStatus),
        organizationId,
        companyId,
      });

      return {
        ...updated,
        previousStatus: currentStatus,
        appliedEvent: event,
      };
    });
  }

  /**
   * Returns valid events for a membership's current state.
   */
  async getValidEvents(
    id: number,
    organizationId: number | null,
    companyId: number | null,
  ) {
    const membership = await this.findOne(id, organizationId, companyId);
    const currentStatus = membership.status as MembershipStatus;
    const validEvents = membershipStateMachine.getValidEvents(currentStatus);

    return {
      membershipId: id,
      currentStatus,
      validEvents,
    };
  }
}
