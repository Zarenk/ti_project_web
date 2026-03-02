import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { MembershipStatus } from './membership-states';

/**
 * Scheduled jobs for the GYM vertical.
 *
 * Each job performs bulk transitions directly via Prisma
 * (not through the state machine service) to keep cron jobs
 * self-contained and efficient for batch operations.
 */
@Injectable()
export class GymCronService {
  private readonly logger = new Logger(GymCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs every hour — checks for memberships that have passed their
   * end date and transitions ACTIVE/TRIAL/FROZEN → EXPIRED.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireMemberships(): Promise<void> {
    const now = new Date();

    try {
      const result = await this.prisma.gymMembership.updateMany({
        where: {
          status: {
            in: [
              MembershipStatus.ACTIVE,
              MembershipStatus.TRIAL,
              MembershipStatus.FROZEN,
            ] as any,
          },
          endDate: { lt: now },
        },
        data: {
          status: MembershipStatus.EXPIRED as any,
          frozenAt: null,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `[gym-cron] Expired ${result.count} membership(s)`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[gym-cron] Error expiring memberships: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Runs daily at 08:00 — identifies PAST_DUE memberships that have
   * exceeded the grace period and transitions them to CANCELLED.
   */
  @Cron('0 8 * * *')
  async processDunning(): Promise<void> {
    try {
      // Find PAST_DUE memberships past their grace period.
      // We query individually because gracePeriodDays varies per membership.
      const pastDue = await this.prisma.gymMembership.findMany({
        where: {
          status: MembershipStatus.PAST_DUE as any,
          pastDueSince: { not: null },
        },
        select: { id: true, pastDueSince: true, gracePeriodDays: true },
      });

      const now = Date.now();
      const idsToCancel = pastDue
        .filter((m) => {
          if (!m.pastDueSince) return false;
          const graceEnd =
            m.pastDueSince.getTime() + m.gracePeriodDays * 86_400_000;
          return now > graceEnd;
        })
        .map((m) => m.id);

      if (idsToCancel.length === 0) return;

      const result = await this.prisma.gymMembership.updateMany({
        where: { id: { in: idsToCancel } },
        data: {
          status: MembershipStatus.CANCELLED as any,
          pastDueSince: null,
        },
      });

      this.logger.log(
        `[gym-cron] Cancelled ${result.count} past-due membership(s) after grace period`,
      );
    } catch (error: any) {
      this.logger.error(
        `[gym-cron] Error processing dunning: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Runs daily at 06:00 — processes PENDING_CANCEL memberships whose
   * cancellation date has arrived.
   */
  @Cron('0 6 * * *')
  async processScheduledCancellations(): Promise<void> {
    const now = new Date();

    try {
      const result = await this.prisma.gymMembership.updateMany({
        where: {
          status: MembershipStatus.PENDING_CANCEL as any,
          scheduledCancelDate: { lte: now },
        },
        data: {
          status: MembershipStatus.CANCELLED as any,
          scheduledCancelDate: null,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `[gym-cron] Completed ${result.count} scheduled cancellation(s)`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[gym-cron] Error processing cancellations: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Runs daily at 07:00 — logs memberships expiring within the next 7 days.
   * (Actual notifications can be added when a notification service exists.)
   */
  @Cron('0 7 * * *')
  async sendExpirationReminders(): Promise<void> {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 86_400_000);

    try {
      const expiring = await this.prisma.gymMembership.findMany({
        where: {
          status: MembershipStatus.ACTIVE as any,
          endDate: { gte: now, lte: sevenDaysLater },
        },
        select: {
          id: true,
          endDate: true,
          member: { select: { firstName: true, lastName: true } },
        },
      });

      if (expiring.length > 0) {
        this.logger.log(
          `[gym-cron] ${expiring.length} membership(s) expiring within 7 days`,
        );
        for (const m of expiring) {
          this.logger.debug(
            `  → Membership ${m.id} (${m.member.firstName} ${m.member.lastName}) expires ${m.endDate.toISOString().slice(0, 10)}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(
        `[gym-cron] Error checking expiration reminders: ${error.message}`,
        error.stack,
      );
    }
  }
}
