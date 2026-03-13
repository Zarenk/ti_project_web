import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface PaginationParams {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}

@Injectable()
export class AdminSignupsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard stats: today signups, pending verification, active trials, expiring soon */
  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const [
      signupsToday,
      signupsYesterday,
      signupsThisWeek,
      successToday,
      failedToday,
      blockedToday,
      pendingVerification,
      activeTrials,
      expiringTrials,
      totalOrgsFromSignup,
      activeBlocklistEntries,
    ] = await Promise.all([
      // Signups today
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Signups yesterday (for comparison)
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      // Signups this week
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: weekAgo } },
      }),
      // Successful today
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: todayStart }, status: 'SUCCESS' },
      }),
      // Failed today
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: todayStart }, status: 'FAILED' },
      }),
      // Blocked today
      this.prisma.publicSignupAttempt.count({
        where: { createdAt: { gte: todayStart }, status: 'BLOCKED' },
      }),
      // Users pending email verification
      this.prisma.user.count({
        where: {
          isPublicSignup: true,
          emailVerifiedAt: null,
          emailVerificationToken: { not: null },
        },
      }),
      // Active trials
      this.prisma.subscription.count({
        where: { status: 'TRIAL' },
      }),
      // Trials expiring in 3 days
      this.prisma.subscription.count({
        where: {
          status: 'TRIAL',
          trialEndsAt: { lte: threeDaysFromNow, gte: new Date() },
        },
      }),
      // Total orgs created from public signup
      this.prisma.user.count({
        where: { isPublicSignup: true },
      }),
      // Active blocklist entries
      this.prisma.signupBlocklist.count({
        where: {
          OR: [
            { blockedUntil: null },
            { blockedUntil: { gte: new Date() } },
          ],
        },
      }),
    ]);

    return {
      signupsToday,
      signupsYesterday,
      signupsThisWeek,
      successToday,
      failedToday,
      blockedToday,
      pendingVerification,
      activeTrials,
      expiringTrials,
      totalOrgsFromSignup,
      activeBlocklistEntries,
    };
  }

  /** Paginated signup attempts with optional filters */
  async listAttempts(params: PaginationParams) {
    const { page, limit, status, search } = params;
    const where: Prisma.PublicSignupAttemptWhereInput = {};

    if (status && status !== 'ALL') {
      where.status = status as any;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.publicSignupAttempt.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.publicSignupAttempt.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Organizations currently in trial */
  async listTrials(params: PaginationParams) {
    const { page, limit, search } = params;
    const where: Prisma.SubscriptionWhereInput = { status: 'TRIAL' };

    if (search) {
      where.organization = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { trialEndsAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              createdAt: true,
              users: {
                where: { isPublicSignup: true },
                select: {
                  id: true,
                  email: true,
                  username: true,
                  emailVerifiedAt: true,
                  createdAt: true,
                },
                take: 1,
              },
              companies: {
                select: {
                  id: true,
                  name: true,
                  businessVertical: true,
                },
                take: 3,
              },
            },
          },
          plan: {
            select: { code: true, name: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Paginated blocklist entries */
  async listBlocklist(params: Omit<PaginationParams, 'status' | 'search'>) {
    const { page, limit } = params;
    const [items, total] = await Promise.all([
      this.prisma.signupBlocklist.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.signupBlocklist.count(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Remove a blocklist entry */
  async removeBlocklistEntry(id: number) {
    const entry = await this.prisma.signupBlocklist.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Entrada de bloqueo no encontrada');
    await this.prisma.signupBlocklist.delete({ where: { id } });
    return { success: true };
  }

  /** Manually verify a user's email */
  async manualVerifyEmail(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.isPublicSignup) {
      throw new BadRequestException('Este usuario no fue registrado por signup público');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('El email ya está verificado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return { success: true, message: 'Email verificado manualmente' };
  }

  /** Extend an organization's trial period */
  async extendTrial(orgId: number, days: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: orgId },
    });
    if (!sub) throw new NotFoundException('Suscripción no encontrada');
    if (sub.status !== 'TRIAL') {
      throw new BadRequestException('La organización no está en período de prueba');
    }

    const currentEnd = sub.trialEndsAt ?? new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + days);

    await this.prisma.subscription.update({
      where: { organizationId: orgId },
      data: { trialEndsAt: newEnd },
    });

    return { success: true, newTrialEndsAt: newEnd };
  }
}
