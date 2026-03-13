import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { ComplaintsNotificationService } from './complaints-notification.service';
import { getRemainingBusinessDays } from './utils/business-days';

@Injectable()
export class ComplaintsDeadlineCron {
  private readonly logger = new Logger(ComplaintsDeadlineCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: ComplaintsNotificationService,
  ) {}

  /**
   * Runs every weekday at 8:00 AM.
   * - Checks PENDING complaints approaching or past deadline.
   * - Sends alerts at day 10, 13, and 15 (deadline).
   * - Marks OVERDUE if past deadline.
   */
  @Cron('0 8 * * 1-5')
  async checkDeadlines() {
    this.logger.debug('Checking complaint deadlines...');

    try {
      const pendingComplaints = await this.prisma.complaint_book.findMany({
        where: { status: 'PENDING' },
        select: {
          id: true,
          correlativeNumber: true,
          consumerName: true,
          deadlineDate: true,
          companyId: true,
          organizationId: true,
        },
      });

      let alertsSent = 0;
      let overdueMarked = 0;

      for (const complaint of pendingComplaints) {
        const remaining = getRemainingBusinessDays(complaint.deadlineDate);

        // Mark overdue
        if (remaining <= 0) {
          await this.prisma.complaint_book.update({
            where: { id: complaint.id },
            data: { status: 'OVERDUE' },
          });
          overdueMarked++;
        }

        // Send alert at specific thresholds: 5, 2, 0 (overdue)
        const shouldAlert = remaining === 5 || remaining === 2 || remaining <= 0;
        if (!shouldAlert) continue;

        // Find admin emails for this company
        const admins = await this.prisma.organizationMembership.findMany({
          where: {
            organizationId: complaint.organizationId,
            role: { in: ['OWNER', 'ADMIN'] },
          },
          select: { user: { select: { email: true } } },
        });

        for (const admin of admins) {
          await this.notifications.sendDeadlineAlert({
            adminEmail: admin.user.email,
            correlativeNumber: complaint.correlativeNumber,
            consumerName: complaint.consumerName,
            remainingDays: remaining,
          });
          alertsSent++;
        }
      }

      if (alertsSent > 0 || overdueMarked > 0) {
        this.logger.log(
          `Deadline check: ${overdueMarked} marked overdue, ${alertsSent} alerts sent`,
        );
      }
    } catch (error) {
      this.logger.error('Deadline check failed', error);
    }
  }
}
