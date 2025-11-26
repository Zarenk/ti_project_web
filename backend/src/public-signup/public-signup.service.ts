import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, OrganizationMembershipRole, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { PublicSignupDto } from './dto/public-signup.dto';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

@Injectable()
export class PublicSignupService {
  private readonly logger = new Logger(PublicSignupService.name);
  private readonly rateLimiter = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async signup(dto: PublicSignupDto, clientIp = 'unknown') {
    await this.verifyRecaptcha(dto.recaptchaToken);
    await this.enforceRateLimit(dto.email, clientIp);
    this.ensureAllowedDomain(dto.email);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const username = await this.generateUsername(dto.fullName);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let organizationId: number;
    let companyId: number;
    let userId: number;

    try {
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
            email: dto.email.trim().toLowerCase(),
            username,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN_ORG,
            status: 'ACTIVO',
            lastOrgId: organization.id,
            lastCompanyId: company.id,
          },
        });

        await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: OrganizationMembershipRole.OWNER,
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
    } catch (error) {
      this.logger.error(`Signup transaction failed: ${error}`);
      throw error;
    }

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

    return {
      message:
        'Cuenta creada correctamente. Revisa tu correo para continuar el onboarding.',
      organizationId,
      companyId,
      userId,
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

  private ensureAllowedDomain(email: string) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      throw new BadRequestException('Correo inválido');
    }
    const blocked = ['mailinator.com', 'tempmail.com', 'yopmail.com'];
    if (blocked.includes(domain)) {
      throw new BadRequestException(
        'Por favor usa un correo corporativo o de confianza',
      );
    }
  }

  private async enforceRateLimit(email: string, ip: string) {
    const key = `${email.trim().toLowerCase()}|${ip}`;
    const now = Date.now();
    const attempts = this.rateLimiter.get(key) ?? [];
    const recent = attempts.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
    );
    if (recent.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      throw new HttpException(
        'Demasiados intentos. Intenta nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.rateLimiter.set(key, recent);
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
