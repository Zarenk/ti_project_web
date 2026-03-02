import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';

@Injectable()
export class GymAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private orgFilter(organizationId?: number | null, companyId?: number | null) {
    return buildOrganizationFilter(organizationId, companyId);
  }

  /**
   * KPI cards: members, active memberships, today check-ins, today classes
   */
  async getOverview(organizationId?: number | null, companyId?: number | null) {
    const where = this.orgFilter(organizationId, companyId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 86_400_000);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      activeMembers,
      prevMonthMembers,
      activeMemberships,
      todayCheckins,
      prevMonthCheckins,
      todaySchedules,
      activeTrainers,
    ] = await Promise.all([
      this.prisma.gymMember.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      this.prisma.gymMember.count({
        where: {
          ...where,
          status: 'ACTIVE',
          createdAt: { lt: startOfMonth },
        },
      }),
      this.prisma.gymMembership.count({
        where: { ...where, status: 'ACTIVE' },
      }),
      this.prisma.gymCheckin.count({
        where: {
          ...where,
          checkinAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      this.prisma.gymCheckin.count({
        where: {
          ...where,
          checkinAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),
      this.prisma.gymClassSchedule.count({
        where: {
          ...where,
          isActive: true,
          dayOfWeek: now.getDay(),
        },
      }),
      this.prisma.gymTrainer.count({
        where: { ...where, status: 'ACTIVE' },
      }),
    ]);

    const memberGrowth =
      prevMonthMembers > 0
        ? ((activeMembers - prevMonthMembers) / prevMonthMembers) * 100
        : null;

    const daysInMonth = now.getDate();
    const daysInPrevMonth = endOfPrevMonth.getDate();
    const avgCheckinsPrev =
      daysInPrevMonth > 0 ? prevMonthCheckins / daysInPrevMonth : 0;
    const avgCheckinsCurr = daysInMonth > 0 ? todayCheckins : 0;
    const checkinGrowth =
      avgCheckinsPrev > 0
        ? ((avgCheckinsCurr - avgCheckinsPrev) / avgCheckinsPrev) * 100
        : null;

    return {
      activeMembers,
      memberGrowth,
      activeMemberships,
      todayCheckins,
      checkinGrowth,
      todayClasses: todaySchedules,
      activeTrainers,
    };
  }

  /**
   * Membership status distribution (for pie/donut chart)
   */
  async getMembershipDistribution(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);

    const result = await this.prisma.gymMembership.groupBy({
      by: ['status'],
      _count: { id: true },
      where,
    });

    return result.map((r) => ({
      status: r.status,
      count: r._count.id,
    }));
  }

  /**
   * Daily check-in trend for the last N days (for line chart)
   */
  async getCheckinTrend(
    days: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);
    const now = new Date();
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - days,
    );

    const checkins = await this.prisma.gymCheckin.findMany({
      where: {
        ...where,
        checkinAt: { gte: startDate },
      },
      select: { checkinAt: true },
      orderBy: { checkinAt: 'asc' },
    });

    const byDate: Record<string, number> = {};
    for (let d = 0; d <= days; d++) {
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + d,
      );
      const key = date.toISOString().split('T')[0];
      byDate[key] = 0;
    }

    for (const c of checkins) {
      const key = new Date(c.checkinAt).toISOString().split('T')[0];
      if (byDate[key] !== undefined) {
        byDate[key]++;
      }
    }

    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  }

  /**
   * Popular classes by booking count (for bar chart)
   */
  async getPopularClasses(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);

    const result = await this.prisma.gymClassBooking.groupBy({
      by: ['scheduleId'],
      _count: { id: true },
      where: { ...where, status: { not: 'CANCELLED' } },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    if (result.length === 0) return [];

    const scheduleIds = result.map((r) => r.scheduleId);
    const schedules = await this.prisma.gymClassSchedule.findMany({
      where: { id: { in: scheduleIds } },
      include: { gymClass: { select: { name: true, category: true } } },
    });

    const scheduleMap = new Map(schedules.map((s) => [s.id, s]));

    return result.map((r) => {
      const schedule = scheduleMap.get(r.scheduleId);
      return {
        className: schedule?.gymClass?.name ?? 'Desconocida',
        category: schedule?.gymClass?.category ?? null,
        bookings: r._count.id,
      };
    });
  }

  /**
   * Checkins by hour of day (for bar chart showing peak hours)
   */
  async getCheckinsByHour(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);
    const now = new Date();
    const thirtyDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 30,
    );

    const checkins = await this.prisma.gymCheckin.findMany({
      where: {
        ...where,
        checkinAt: { gte: thirtyDaysAgo },
      },
      select: { checkinAt: true },
    });

    const hourCounts = new Array(24).fill(0);
    for (const c of checkins) {
      const hour = new Date(c.checkinAt).getHours();
      hourCounts[hour]++;
    }

    return hourCounts.map((count, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count,
    }));
  }

  /**
   * New members per month for the last 6 months
   */
  async getNewMembersMonthly(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);
    const now = new Date();

    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const count = await this.prisma.gymMember.count({
        where: {
          ...where,
          createdAt: { gte: start, lte: end },
        },
      });

      const monthLabel = start.toLocaleDateString('es-PE', {
        month: 'short',
        year: '2-digit',
      });
      months.push({ month: monthLabel, count });
    }

    return months;
  }

  /**
   * Revenue summary from memberships
   */
  async getRevenueSummary(
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    const where = this.orgFilter(organizationId, companyId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [currentMonth, previousMonth, total] = await Promise.all([
      this.prisma.gymMembership.aggregate({
        _sum: { price: true },
        where: {
          ...where,
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.gymMembership.aggregate({
        _sum: { price: true },
        where: {
          ...where,
          createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        },
      }),
      this.prisma.gymMembership.aggregate({
        _sum: { price: true },
        where,
      }),
    ]);

    const curr = currentMonth._sum.price ?? 0;
    const prev = previousMonth._sum.price ?? 0;
    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : null;

    return {
      currentMonth: curr,
      previousMonth: prev,
      growth,
      total: total._sum.price ?? 0,
    };
  }
}
