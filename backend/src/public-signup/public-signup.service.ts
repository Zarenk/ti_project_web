import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OrganizationMembershipRole,
  Prisma,
  SignupAttemptStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from 'src/prisma/prisma.service';
import { PublicSignupDto } from './dto/public-signup.dto';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { SubscriptionNotificationsService } from 'src/subscriptions/subscription-notifications.service';
import { SubscriptionPrometheusService } from 'src/subscriptions/subscription-prometheus.service';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const DAILY_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_DAILY_LIMIT = 3;
const IP_DAILY_LIMIT = 10;
const DEVICE_DAILY_LIMIT = 5;
const DOMAIN_DAILY_LIMIT = 25;
const BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour
const MAX_USER_AGENT_LENGTH = 255;

const DEFAULT_DISPOSABLE_DOMAINS = [
  'mailinator.com',
  'tempmail.com',
  'yopmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'trashmail.com',
  'sharklasers.com',
  'emailtemp.org',
  'dispostable.com',
];

type RateLimitContext = {
  email: string;
  domain: string;
  ip?: string;
  deviceHash?: string | null;
  userAgent?: string | null;
};

type BlockOptions = {
  blockIp?: boolean;
  blockDevice?: boolean;
  blockDomain?: boolean;
  durationMs?: number;
};

@Injectable()
export class PublicSignupService {
  private readonly logger = new Logger(PublicSignupService.name);
  private readonly disposableDomains: Set<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notifications: SubscriptionNotificationsService,
    private readonly metrics: SubscriptionPrometheusService,
  ) {
    this.disposableDomains = this.buildDisposableDomainList();
  }

  async signup(
    dto: PublicSignupDto,
    clientIp = 'unknown',
    userAgent = 'unknown',
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const domain = this.extractDomain(normalizedEmail);
    const deviceHash = this.fingerprintDevice(userAgent);

    await this.verifyRecaptcha(dto.recaptchaToken);
    this.ensureAllowedDomain(domain);

    const context: RateLimitContext = {
      email: normalizedEmail,
      domain,
      ip: clientIp,
      deviceHash,
      userAgent,
    };

    await this.ensureNotBlocked(context);
    await this.enforceRateLimit(context);

    const attempt = await this.recordAttempt(context);
    this.metrics.recordSignupStarted();

    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new ConflictException('El correo ya está registrado');
      }

      const existingOrganization = await this.prisma.organization.findFirst({
        where: {
          name: {
            equals: dto.organizationName.trim(),
            mode: 'insensitive',
          },
        },
      });
      if (existingOrganization) {
        throw new ConflictException(
          'El nombre de la organización ya está en uso. Intenta con otro.',
        );
      }

      const username = await this.generateUsername(dto.fullName);
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const verificationToken = this.generateVerificationToken();

      let organizationId: number;
      let companyId: number;
      let userId: number;

      const result = await this.prisma.$transaction(async (tx) => {
        const slug = await this.generateOrgSlug(dto.organizationName);
        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName.trim(),
            status: 'ACTIVE',
            slug,
          },
        });

        const company = await tx.company.create({
          data: {
            organizationId: organization.id,
            name: dto.companyName.trim(),
            legalName: dto.companyName.trim(),
            status: 'ACTIVE',
          },
        });

        const user = await tx.user.create({
          data: {
            email: normalizedEmail,
            username,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN_ORG,
            status: 'ACTIVO',
            lastOrgId: organization.id,
            lastCompanyId: company.id,
            isPublicSignup: true,
            emailVerificationToken: verificationToken,
            emailVerifiedAt: null,
          },
        });

        await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: OrganizationMembershipRole.SUPER_ADMIN,
          },
        });

        await this.seedDemoData(tx, organization.id, company.id);

        return {
          organizationId: organization.id,
          companyId: company.id,
          userId: user.id,
        };
      });

      organizationId = result.organizationId;
      companyId = result.companyId;
      userId = result.userId;

      const planCode =
        dto.planCode ||
        this.configService.get<string>('DEFAULT_TRIAL_PLAN_CODE') ||
        'trial';

      try {
        await this.subscriptionsService.startTrial({
          organizationId,
          planCode,
        });
      } catch (error) {
        this.logger.error(
          `Failed to start trial for org=${organizationId}: ${error}`,
        );
        // Continue even if trial setup fails; admin can fix later.
      }

      await this.sendVerificationEmailSafe({
        email: normalizedEmail,
        fullName: dto.fullName,
        organizationName: dto.organizationName.trim(),
        token: verificationToken,
      });

      await this.markAttemptStatus(attempt.id, SignupAttemptStatus.SUCCESS);
      this.metrics.recordSignupCompleted('success');

      return {
        message:
          'Cuenta creada correctamente. Revisa tu correo y confirma tu email para activar el acceso.',
        organizationId,
        companyId,
        userId,
      };
    } catch (error) {
      await this.markAttemptStatus(
        attempt.id,
        SignupAttemptStatus.FAILED,
        this.normalizeError(error),
      );
      this.metrics.recordSignupCompleted('error');
      throw error;
    }
  }

  async verifyEmail(token: string) {
    const normalized = token?.trim();
    if (!normalized) {
      throw new BadRequestException('Token de verificación inválido');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: normalized,
        isPublicSignup: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'El enlace de verificación es inválido o expiró',
      );
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'El correo ya se encuentra confirmado. Puedes iniciar sesión.',
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
      },
    });

    return {
      message: 'Tu correo fue verificado correctamente. Ya puedes iniciar sesión.',
    };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isPublicSignup) {
      throw new BadRequestException(
        'No encontramos una cuenta pendiente de verificación con ese correo.',
      );
    }

    if (user.emailVerifiedAt) {
      return {
        message: 'Esta cuenta ya fue verificada. Intenta iniciar sesión nuevamente.',
      };
    }

    const token = this.generateVerificationToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token },
    });

    const organizationName = await this.resolveOrganizationName(user.id);
    await this.sendVerificationEmailSafe({
      email: normalizedEmail,
      fullName: user.username ?? user.email,
      organizationName,
      token,
    });

    return {
      message:
        'Te enviamos un nuevo correo con el enlace de verificación. Revisa tu bandeja o carpeta de spam.',
    };
  }

  private async seedDemoData(
    tx: Prisma.TransactionClient,
    organizationId: number,
    companyId: number,
  ) {
    const category = await tx.category.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: 'Equipos Demo',
        },
      },
      update: {},
      create: {
        name: 'Equipos Demo',
        organizationId,
        companyId,
        status: 'ACTIVE',
        description: 'Categoría para que puedas explorar el sistema',
      },
    });

    await tx.product.create({
      data: {
        name: 'Laptop Demo Pro 15"',
        categoryId: category.id,
        price: 1200,
        priceSell: 1490,
        organizationId,
        companyId,
        images: ['/demo/laptop.png'],
        description:
          'Equipo de demostración preconfigurado con inventario y características listas.',
      },
    });

    await tx.store.create({
      data: {
        name: `Tienda Demo ${companyId}`,
        organizationId,
        companyId,
        status: 'ACTIVE',
        adress: 'Av. Demo 123',
        phone: '999-999-999',
      },
    });
  }

  private async sendVerificationEmailSafe(payload: {
    email: string;
    fullName?: string;
    organizationName: string;
    token: string;
  }) {
    try {
      await this.notifications.sendSignupVerification(payload);
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de verificación a ${payload.email}: ${error}`,
      );
    }
  }

  private generateVerificationToken() {
    return randomBytes(32).toString('hex');
  }

  private async resolveOrganizationName(userId: number) {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId },
      include: { organization: { select: { name: true } } },
    });
    return membership?.organization?.name ?? 'tu organización';
  }

  private async generateUsername(fullName: string) {
    const base = this.slugify(fullName) || 'demo-user';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.user.findUnique({ where: { username: candidate } })
    ) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }

  private async generateOrgSlug(name: string) {
    const base = this.slugify(name) || 'demo-org';
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.organization.findUnique({
        where: { slug: candidate },
      })
    ) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
  }

  private extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase().trim() ?? '';
  }

  private fingerprintDevice(userAgent?: string) {
    if (!userAgent) {
      return null;
    }
    return createHash('sha256')
      .update(userAgent.toLowerCase())
      .digest('hex');
  }

  private buildDisposableDomainList(): Set<string> {
    const blocked = new Set(DEFAULT_DISPOSABLE_DOMAINS);
    const extra = this.configService.get<string>('SIGNUP_BLOCKED_DOMAINS');
    if (extra) {
      extra
        .split(',')
        .map((domain) => domain.trim().toLowerCase())
        .filter(Boolean)
        .forEach((domain) => blocked.add(domain));
    }
    return blocked;
  }

  private ensureAllowedDomain(domain: string) {
    if (!domain) {
      throw new BadRequestException('Correo inválido');
    }
    if (this.disposableDomains.has(domain)) {
      throw new BadRequestException(
        'Por favor usa un correo corporativo o de confianza',
      );
    }
  }

  private async ensureNotBlocked(ctx: RateLimitContext) {
    const clauses: Prisma.SignupBlocklistWhereInput[] = [];
    if (ctx.ip) {
      clauses.push({ ip: ctx.ip });
    }
    if (ctx.deviceHash) {
      clauses.push({ deviceHash: ctx.deviceHash });
    }
    if (ctx.domain) {
      clauses.push({ domain: ctx.domain });
    }

    if (!clauses.length) {
      return;
    }

    const now = new Date();
    const blocked = await this.prisma.signupBlocklist.findFirst({
      where: {
        AND: [
          { OR: clauses },
          {
            OR: [
              { blockedUntil: null },
              { blockedUntil: { gt: now } },
            ],
          },
        ],
      },
    });

    if (blocked) {
      await this.recordAttempt({
        ...ctx,
        status: SignupAttemptStatus.BLOCKED,
        errorMessage: blocked.reason ?? 'BLOCKED_SOURCE',
      });
      throw new HttpException(
        'Detectamos actividad inusual desde este origen. Intenta nuevamente más tarde o contáctanos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async enforceRateLimit(ctx: RateLimitContext) {
    const now = Date.now();
    const windowStart = new Date(now - RATE_LIMIT_WINDOW_MS);

    const emailWindowAttempts = await this.prisma.publicSignupAttempt.count({
      where: { email: ctx.email, createdAt: { gte: windowStart } },
    });
    if (emailWindowAttempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      await this.handleRateLimitViolation(ctx, 'EMAIL_WINDOW_LIMIT');
    }

    const dayStart = new Date(now - DAILY_RATE_WINDOW_MS);

    const emailDailyAttempts = await this.prisma.publicSignupAttempt.count({
      where: { email: ctx.email, createdAt: { gte: dayStart } },
    });
    if (emailDailyAttempts >= EMAIL_DAILY_LIMIT) {
      await this.handleRateLimitViolation(ctx, 'EMAIL_DAILY_LIMIT');
    }

    if (ctx.ip) {
      const ipDailyAttempts = await this.prisma.publicSignupAttempt.count({
        where: { ip: ctx.ip, createdAt: { gte: dayStart } },
      });
      if (ipDailyAttempts >= IP_DAILY_LIMIT) {
        await this.handleRateLimitViolation(ctx, 'IP_DAILY_LIMIT', {
          blockDomain: false,
        });
      }
    }

    if (ctx.deviceHash) {
      const deviceDailyAttempts = await this.prisma.publicSignupAttempt.count({
        where: { deviceHash: ctx.deviceHash, createdAt: { gte: dayStart } },
      });
      if (deviceDailyAttempts >= DEVICE_DAILY_LIMIT) {
        await this.handleRateLimitViolation(ctx, 'DEVICE_DAILY_LIMIT', {
          blockDomain: false,
        });
      }
    }

    const domainDailyAttempts = await this.prisma.publicSignupAttempt.count({
      where: { domain: ctx.domain, createdAt: { gte: dayStart } },
    });
    if (domainDailyAttempts >= DOMAIN_DAILY_LIMIT) {
      await this.handleRateLimitViolation(ctx, 'DOMAIN_DAILY_LIMIT', {
        blockIp: false,
        blockDevice: false,
        blockDomain: true,
        durationMs: 0,
      });
    }
  }

  private async handleRateLimitViolation(
    ctx: RateLimitContext,
    reason: string,
    options: BlockOptions = {},
  ): Promise<never> {
    await this.recordAttempt({
      ...ctx,
      status: SignupAttemptStatus.BLOCKED,
      errorMessage: reason,
    });
    await this.blockSource({
      ip: options.blockIp === false ? undefined : ctx.ip,
      deviceHash:
        options.blockDevice === false ? undefined : ctx.deviceHash,
      domain: options.blockDomain ? ctx.domain : undefined,
      reason,
      durationMs: options.durationMs,
    });
    throw new HttpException(
      'Hemos detectado demasiados intentos desde este origen. Intenta nuevamente más tarde.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async blockSource(params: {
    ip?: string;
    deviceHash?: string | null;
    domain?: string;
    reason: string;
    durationMs?: number;
  }) {
    if (!params.ip && !params.deviceHash && !params.domain) {
      return;
    }
    const blockedUntil =
      params.durationMs === 0
        ? null
        : new Date(Date.now() + (params.durationMs ?? BLOCK_DURATION_MS));

    await this.prisma.signupBlocklist
      .create({
        data: {
          ip: params.ip ?? null,
          deviceHash: params.deviceHash ?? null,
          domain: params.domain ?? null,
          reason: params.reason,
          blockedUntil,
        },
      })
      .catch(() => undefined);
  }

  private async recordAttempt(
    data: RateLimitContext & {
      status?: SignupAttemptStatus;
      errorMessage?: string | null;
    },
  ) {
    return this.prisma.publicSignupAttempt.create({
      data: {
        email: data.email,
        domain: data.domain,
        ip: data.ip ?? null,
        deviceHash: data.deviceHash ?? null,
        userAgent: data.userAgent
          ? data.userAgent.slice(0, MAX_USER_AGENT_LENGTH)
          : null,
        status: data.status ?? SignupAttemptStatus.PENDING,
        errorMessage: data.errorMessage ?? null,
      },
    });
  }

  private async markAttemptStatus(
    attemptId: number,
    status: SignupAttemptStatus,
    errorMessage?: string | null,
  ) {
    await this.prisma.publicSignupAttempt
      .update({
        where: { id: attemptId },
        data: {
          status,
          errorMessage: errorMessage?.slice(0, 255) ?? null,
        },
      })
      .catch(() => undefined);
  }

  private normalizeError(error: unknown): string {
    if (error instanceof HttpException) {
      const payload = error.getResponse();
      if (typeof payload === 'string') {
        return payload;
      }
      if (
        typeof payload === 'object' &&
        payload &&
        'message' in payload &&
        typeof (payload as Record<string, unknown>).message === 'string'
      ) {
        return (payload as { message: string }).message;
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }

  private async verifyRecaptcha(token?: string) {
    const secret = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    if (!secret) {
      return;
    }
    if (!token) {
      throw new BadRequestException('Token de verificación faltante');
    }

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    const res = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        body: params,
      },
    );

    if (!res.ok) {
      throw new BadRequestException('No se pudo verificar el reCAPTCHA');
    }

    const data = (await res.json()) as {
      success: boolean;
      score?: number;
      'error-codes'?: string[];
    };

    if (!data.success || (data.score !== undefined && data.score < 0.5)) {
      throw new BadRequestException('Verificación reCAPTCHA fallida');
    }
  }
}
