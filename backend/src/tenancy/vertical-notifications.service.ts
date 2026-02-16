import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  VerticalEventsService,
  type VerticalChangedEvent,
} from './vertical-events.service';

@Injectable()
export class VerticalNotificationsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly verticalChangedListener: (
    payload: VerticalChangedEvent,
  ) => void;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: VerticalEventsService,
  ) {
    this.verticalChangedListener = this.handleVerticalChanged.bind(this);
  }

  onModuleInit() {
    this.events.onChanged(this.verticalChangedListener);
  }

  onModuleDestroy() {
    this.events.offChanged(this.verticalChangedListener);
  }

  private async handleVerticalChanged(
    payload: VerticalChangedEvent,
  ): Promise<void> {
    try {
      const { organizationId, companyId, previousVertical, newVertical } =
        payload;

      if (!companyId || !organizationId) {
        return;
      }

      // Create notification event
      await this.prisma.monitoringAlertEvent.create({
        data: {
          organizationId,
          companyId,
          alertType: 'VERTICAL_CHANGE',
          status: 'INFO',
          severity: 'INFO',
          message: `Vertical cambiado de ${previousVertical} a ${newVertical}`,
          metadata: {
            previousVertical,
            newVertical,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Log error but don't throw to avoid breaking the vertical change process
      console.error('Error creating vertical change notification:', error);
    }
  }

  /**
   * Get recent vertical change notifications for a company
   */
  async getRecentNotifications(companyId: number, limit = 20) {
    return this.prisma.monitoringAlertEvent.findMany({
      where: {
        companyId,
        alertType: 'VERTICAL_CHANGE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        message: true,
        severity: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get recent vertical change notifications for an organization
   */
  async getOrganizationNotifications(organizationId: number, limit = 50) {
    return this.prisma.monitoringAlertEvent.findMany({
      where: {
        organizationId,
        alertType: 'VERTICAL_CHANGE',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        companyId: true,
        message: true,
        severity: true,
        metadata: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Mark notifications as read (soft delete or status update)
   */
  async markAsRead(notificationIds: number[]) {
    // For now, we'll just update metadata to mark as read
    // In a full implementation, you might add a 'read' status field
    await this.prisma.monitoringAlertEvent.updateMany({
      where: {
        id: { in: notificationIds },
      },
      data: {
        metadata: {
          read: true,
          readAt: new Date().toISOString(),
        },
      },
    });
  }
}
