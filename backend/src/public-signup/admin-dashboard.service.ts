import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Global Overview ──────────────────────────────────────────────────────────

  async getGlobalOverview() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsersLast7d,
      totalCompanies,
      trialSubs,
      activeSubs,
      pastDueSubs,
      canceledSubs,
      newOrgsThisMonth,
      newUsersThisMonth,
      verticalBreakdown,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { lastActiveAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.company.count(),
      this.prisma.subscription.count({ where: { status: 'TRIAL' } }),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      this.prisma.subscription.count({ where: { status: 'CANCELED' } }),
      this.prisma.organization.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.company.groupBy({
        by: ['businessVertical'],
        _count: { id: true },
      }),
    ]);

    return {
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsersLast7d,
      totalCompanies,
      subscriptions: { trial: trialSubs, active: activeSubs, pastDue: pastDueSubs, canceled: canceledSubs },
      newOrgsThisMonth,
      newUsersThisMonth,
      verticalBreakdown: verticalBreakdown.map((v) => ({
        vertical: v.businessVertical,
        count: v._count.id,
      })),
    };
  }

  // ── SUNAT & Facturación ──────────────────────────────────────────────────────

  async getSunatOverview() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalTransmissions,
      pendingTransmissions,
      acceptedToday,
      rejectedToday,
      failedToday,
      failedLast7d,
      statusBreakdown,
      recentFailed,
      creditNotesTotal,
      creditNotesThisMonth,
    ] = await Promise.all([
      this.prisma.sunatTransmission.count(),
      this.prisma.sunatTransmission.count({
        where: { status: { in: ['PENDING', 'SENDING', 'SENT'] } },
      }),
      this.prisma.sunatTransmission.count({
        where: { status: 'ACCEPTED', createdAt: { gte: todayStart } },
      }),
      this.prisma.sunatTransmission.count({
        where: { status: 'REJECTED', createdAt: { gte: todayStart } },
      }),
      this.prisma.sunatTransmission.count({
        where: { status: 'FAILED', createdAt: { gte: todayStart } },
      }),
      this.prisma.sunatTransmission.count({
        where: { status: 'FAILED', createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.sunatTransmission.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.sunatTransmission.findMany({
        where: { status: { in: ['FAILED', 'REJECTED'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          documentType: true,
          serie: true,
          correlativo: true,
          errorMessage: true,
          cdrCode: true,
          cdrDescription: true,
          retryCount: true,
          createdAt: true,
          company: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.creditNote.count(),
      this.prisma.creditNote.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
    ]);

    return {
      totalTransmissions,
      pendingTransmissions,
      acceptedToday,
      rejectedToday,
      failedToday,
      failedLast7d,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      recentFailed,
      creditNotes: { total: creditNotesTotal, thisMonth: creditNotesThisMonth },
    };
  }

  // ── Seguridad & Auditoría ────────────────────────────────────────────────────

  async getSecurityOverview() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      loginsToday,
      failedLoginsToday,
      lockedUsers,
      recentAuditActions,
      destructiveActionsToday,
      auditByAction7d,
      recentLogins,
    ] = await Promise.all([
      this.prisma.auditLog.count({
        where: { action: 'LOGIN', createdAt: { gte: todayStart } },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          createdAt: { gte: todayStart },
          summary: { contains: 'fail', mode: 'insensitive' },
        },
      }),
      this.prisma.user.count({
        where: {
          OR: [
            { isPermanentlyLocked: true },
            { lockUntil: { gte: now } },
          ],
        },
      }),
      this.prisma.auditLog.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.auditLog.count({
        where: { action: 'DELETED', createdAt: { gte: todayStart } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
      this.prisma.auditLog.findMany({
        where: { action: { in: ['LOGIN', 'LOGOUT'] } },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          actorEmail: true,
          action: true,
          ip: true,
          userAgent: true,
          summary: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      loginsToday,
      failedLoginsToday,
      lockedUsers,
      recentAuditActions,
      destructiveActionsToday,
      auditByAction7d: auditByAction7d.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
      recentLogins,
    };
  }

  async getAuditLog(params: {
    page: number;
    limit: number;
    action?: string;
    search?: string;
    entityType?: string;
  }) {
    const { page, limit, action, search, entityType } = params;
    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }
    if (entityType && entityType !== 'ALL') {
      where.entityType = entityType;
    }
    if (search) {
      where.OR = [
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorId: true,
          actorEmail: true,
          entityType: true,
          entityId: true,
          action: true,
          summary: true,
          diff: true,
          ip: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Salud Financiera ─────────────────────────────────────────────────────────

  async getFinancialHealth() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalSalesAllTime,
      salesToday,
      salesThisMonth,
      salesLastMonth,
      paidInvoices,
      pendingInvoices,
      failedInvoices,
      mrrData,
      delinquentOrgs,
      recentSubscriptionInvoices,
    ] = await Promise.all([
      this.prisma.sales.count({ where: { status: 'ACTIVE' } }),
      this.prisma.sales.count({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        },
      }),
      this.prisma.sales.aggregate({
        where: { status: 'ACTIVE', createdAt: { gte: thisMonthStart } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.sales.aggregate({
        where: { status: 'ACTIVE', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: 'FAILED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // MRR = sum of active subscription plan prices
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: { select: { price: true, interval: true } } },
      }),
      // Delinquent orgs (PAST_DUE subscriptions)
      this.prisma.subscription.findMany({
        where: { status: 'PAST_DUE' },
        select: {
          id: true,
          pastDueSince: true,
          organization: { select: { id: true, name: true } },
          plan: { select: { name: true, price: true } },
        },
        orderBy: { pastDueSince: 'asc' },
        take: 10,
      }),
      // Recent subscription invoices
      this.prisma.subscriptionInvoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          dueDate: true,
          paidAt: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Calculate MRR from active subscriptions
    const mrr = mrrData.reduce((acc, sub) => {
      const price = Number(sub.plan.price);
      return acc + (sub.plan.interval === 'YEARLY' ? price / 12 : price);
    }, 0);

    return {
      totalSalesAllTime,
      salesToday,
      salesThisMonth: {
        count: salesThisMonth._count.id,
        total: salesThisMonth._sum.total ?? 0,
      },
      salesLastMonth: {
        count: salesLastMonth._count.id,
        total: salesLastMonth._sum.total ?? 0,
      },
      platformInvoices: {
        paid: { count: paidInvoices._count.id, total: Number(paidInvoices._sum.amount ?? 0) },
        pending: { count: pendingInvoices._count.id, total: Number(pendingInvoices._sum.amount ?? 0) },
        failed: { count: failedInvoices._count.id, total: Number(failedInvoices._sum.amount ?? 0) },
      },
      mrr: Math.round(mrr * 100) / 100,
      delinquentOrgs,
      recentSubscriptionInvoices,
    };
  }

  // ── Inventario & Ventas Cross-Org ────────────────────────────────────────────

  async getSalesInventoryOverview() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalInventoryItems,
      lowStockCount,
      totalEntries,
      entriesToday,
      salesBySource,
      topOrgsBySales,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.inventory.count(),
      this.prisma.storeOnInventory.count({
        where: {
          stock: { lte: 5 },
          inventory: { product: { status: 'ACTIVE' } },
        },
      }),
      this.prisma.entry.count(),
      this.prisma.entry.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.sales.groupBy({
        by: ['source'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
        _sum: { total: true },
      }),
      this.prisma.sales.groupBy({
        by: ['organizationId'],
        where: { status: 'ACTIVE', organizationId: { not: null } },
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    // Resolve org names for top orgs
    const orgIds = topOrgsBySales
      .map((o) => o.organizationId)
      .filter((id): id is number => id !== null);
    const orgs = orgIds.length
      ? await this.prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true },
        })
      : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    return {
      totalProducts,
      totalInventoryItems,
      lowStockCount,
      totalEntries,
      entriesToday,
      salesBySource: salesBySource.map((s) => ({
        source: s.source,
        count: s._count.id,
        total: s._sum.total ?? 0,
      })),
      topOrgsBySales: topOrgsBySales.map((o) => ({
        organizationId: o.organizationId,
        organizationName: orgMap.get(o.organizationId!) ?? 'Desconocida',
        salesCount: o._count.id,
        salesTotal: o._sum.total ?? 0,
      })),
    };
  }

  // ── WhatsApp Overview ────────────────────────────────────────────────────────

  async getWhatsappOverview() {
    const [
      totalSessions,
      connectedSessions,
      disconnectedSessions,
      totalMessages,
      totalAutomations,
      sessionDetails,
    ] = await Promise.all([
      this.prisma.whatsAppSession.count(),
      this.prisma.whatsAppSession.count({ where: { status: 'CONNECTED' } }),
      this.prisma.whatsAppSession.count({ where: { status: 'DISCONNECTED' } }),
      this.prisma.whatsAppMessage.count(),
      this.prisma.whatsAppAutomation.count({ where: { isActive: true } }),
      this.prisma.whatsAppSession.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          phoneNumber: true,
          status: true,
          lastConnected: true,
          isActive: true,
          updatedAt: true,
          organization: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      totalSessions,
      connectedSessions,
      disconnectedSessions,
      totalMessages,
      totalAutomations,
      sessionDetails,
    };
  }

  // ── Plans & Subscriptions Detail ─────────────────────────────────────────────

  async getPlansOverview() {
    const [plans, subscriptionsByPlan] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
          currency: true,
          interval: true,
          trialDays: true,
          _count: { select: { subscriptions: true } },
        },
        orderBy: { price: 'asc' },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId', 'status'],
        _count: { id: true },
      }),
    ]);

    // Build plan-level subscription breakdown
    const planMap = new Map<number, { status: string; count: number }[]>();
    for (const row of subscriptionsByPlan) {
      if (!planMap.has(row.planId)) planMap.set(row.planId, []);
      planMap.get(row.planId)!.push({ status: row.status, count: row._count.id });
    }

    return {
      plans: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: Number(p.price),
        currency: p.currency,
        interval: p.interval,
        trialDays: p.trialDays,
        totalSubscriptions: p._count.subscriptions,
        statusBreakdown: planMap.get(p.id) ?? [],
      })),
    };
  }
}
