import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  UserRole,
  AuditAction,
  User,
  OrganizationMembershipRole,
} from '@prisma/client';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { UpdateLastContextDto } from './dto/update-last-context.dto';
import { ValidateContextDto } from './dto/validate-context.dto';
import { ContextEventsGateway } from './context-events.gateway';
import { ContextThrottleService } from './context-throttle.service';
import { ContextPrometheusService } from './context-prometheus.service';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';

@Injectable()
export class UsersService {
  private static readonly MODULE_PERMISSION_KEYS = [
    'dashboard',
    'catalog',
    'store',
    'inventory',
    'sales',
    'purchases',
    'accounting',
    'marketing',
    'providers',
    'settings',
    'hidePurchaseCost',
    'hideDeleteActions',
  ] as const;

  private readonly CONTEXT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  private readonly CONTEXT_RATE_LIMIT = 10;
  private readonly CONTEXT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
  private readonly contextUpdateAttempts = new Map<number, number[]>();

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private activityService: ActivityService,
    private contextEventsGateway: ContextEventsGateway,
    private contextThrottleService: ContextThrottleService,
    private contextPrometheusService: ContextPrometheusService,
    private readonly quotaService: SubscriptionQuotaService,
  ) {}

  async validateUser(email: string, password: string, req?: Request) {
    let user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const now = new Date();

    if (user.lockUntil && user.lockUntil <= now && !user.isPermanentlyLocked) {
      user = await this.prismaService.user.update({
        where: { id: user.id },
        data: { lockUntil: null },
      });
    }

    if (user.isPermanentlyLocked) {
      throw new UnauthorizedException(
        'Tu cuenta está bloqueada. Comunícate con soporte para restaurar el acceso.',
      );
    }

    if (user.lockUntil && user.lockUntil > now) {
      const minutesRemaining = Math.ceil(
        (user.lockUntil.getTime() - now.getTime()) / 60000,
      );
      throw new UnauthorizedException(
        `Tu cuenta está temporalmente bloqueada. Intenta nuevamente en ${minutesRemaining} minuto(s).`,
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      const message = await this.handleFailedLogin(user, req);
      throw new UnauthorizedException(message);
    }

    if (
      user.failedLoginAttempts !== 0 ||
      user.lockUntil ||
      user.isPermanentlyLocked
    ) {
      user = await this.resetLoginState(user, req);
    }

    if (user.isPublicSignup && !user.emailVerifiedAt) {
      throw new UnauthorizedException({
        message:
          'Debes verificar tu correo para acceder. Revisa tu bandeja de entrada o solicita un nuevo enlace.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: user.email,
      });
    }

    const { password: _password, ...result } = user;
    return result;
  }

  private async resetLoginState(user: User, req?: Request) {
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockUntil: null,
        isPermanentlyLocked: false,
      },
    });

    await this.activityService.log(
      {
        actorId: updatedUser.id,
        actorEmail: updatedUser.email,
        entityType: 'User',
        entityId: updatedUser.id.toString(),
        action: AuditAction.OTHER,
        summary: `Se reinició el contador de intentos fallidos para ${updatedUser.email} tras un inicio de sesión exitoso`,
      },
      req,
    );

    return updatedUser;
  }

  private async handleFailedLogin(user: User, req?: Request) {
    const attempts = user.failedLoginAttempts + 1;
    const now = new Date();
    let lockUntil: Date | null = null;
    let isPermanentlyLocked = false;
    let message = 'Credenciales inválidas.';

    if (attempts >= 6) {
      isPermanentlyLocked = true;
      message =
        'Tu cuenta ha sido bloqueada por múltiples intentos fallidos. Comunícate con soporte para restaurar el acceso.';
    } else if (attempts === 5) {
      lockUntil = new Date(now.getTime() + 60 * 60 * 1000);
      message =
        'Tu cuenta se ha bloqueado por 1 hora debido a múltiples intentos fallidos.';
    } else if (attempts === 4) {
      lockUntil = new Date(now.getTime() + 10 * 60 * 1000);
      message =
        'Tu cuenta se ha bloqueado temporalmente por 10 minutos debido a intentos fallidos consecutivos.';
    } else {
      const remainingBeforeTempLock = Math.max(0, 4 - attempts);
      if (remainingBeforeTempLock > 0) {
        message = `Credenciales inválidas. Te quedan ${remainingBeforeTempLock} intento(s) antes de un bloqueo temporal.`;
      }
    }
    const updatedUser = await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockUntil,
        isPermanentlyLocked,
      },
    });

    const summary = isPermanentlyLocked
      ? `La cuenta ${updatedUser.email} se bloqueó de forma indefinida tras ${attempts} intentos fallidos.`
      : lockUntil
        ? `La cuenta ${updatedUser.email} se bloqueó hasta ${lockUntil.toISOString()} tras ${attempts} intentos fallidos.`
        : `Intento fallido ${attempts} para la cuenta ${updatedUser.email}.`;

    await this.activityService.log(
      {
        actorId: updatedUser.id,
        actorEmail: updatedUser.email,
        entityType: 'User',
        entityId: updatedUser.id.toString(),
        action: AuditAction.OTHER,
        summary,
      },
      req,
    );

    return message;
  }

  async login(user: any, req?: Request) {
    const memberships =
      await this.prismaService.organizationMembership.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
        orderBy: { createdAt: 'asc' },
      });
    const organizationIds = memberships
      .map((membership) => membership.organizationId)
      .filter(
        (id): id is number => typeof id === 'number' && Number.isFinite(id),
      );

    const fallbackOrgId =
      user.lastOrgId ?? user.organizationId ?? organizationIds[0] ?? null;

    let defaultCompanyId: number | null = user.lastCompanyId ?? null;
    if (!defaultCompanyId && fallbackOrgId) {
      const firstCompany = await this.prismaService.company.findFirst({
        where: { organizationId: fallbackOrgId },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      defaultCompanyId = firstCompany?.id ?? null;
    }

    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
      defaultOrganizationId: fallbackOrgId,
      defaultCompanyId,
      organizations: organizationIds,
      isPublicSignup: Boolean(user.isPublicSignup),
    };
    const token = this.jwtService.sign(payload);
    await this.activityService.log(
      {
        actorId: user.id,
        actorEmail: user.email,
        entityType: 'User',
        entityId: user.id.toString(),
        action: AuditAction.LOGIN,
        summary: `User ${user.email} logged in`,
      },
      req,
    );
    return {
      access_token: token,
    };
  }

  async logout(user: any) {
    await this.activityService.log({
      actorId: user.id,
      actorEmail: user.email,
      entityType: 'User',
      entityId: user.id.toString(),
      action: AuditAction.LOGOUT,
      summary: `User ${user.email} logged out`,
    });
    return { message: 'Logged out' };
  }

  async register(data: {
    email: string;
    username?: string;
    password: string;
    role: string;
    status?: string;
    organizationId?: number | null;
  }) {
    logOrganizationContext({
      service: UsersService.name,
      operation: 'register',
      organizationId: data.organizationId,
      metadata: { role: data.role },
    });
    const username = data.username || data.email.split('@')[0];

    const existingEmail = await this.prismaService.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const existingUsername = await this.prismaService.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new BadRequestException('El nombre de usuario ya está registrado');
    }

    if (data.organizationId) {
      await this.quotaService.ensureQuota(data.organizationId, 'users', 1);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    try {
      const user = await this.prismaService.user.create({
        data: {
          email: data.email,
          username,
          password: hashedPassword,
          role: data.role as UserRole,
          status: data.status ?? 'ACTIVO',
          organizationId: data.organizationId ?? null,
        },
      });

      await this.activityService.log({
        actorId: user.id,
        actorEmail: user.email,
        entityType: 'User',
        entityId: user.id.toString(),
        action: AuditAction.CREATED,
        summary: `User ${user.email} registered`,
      });
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El usuario ya existe');
      }
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }

  async publicRegister(data: {
    email: string;
    username?: string;
    password: string;
    name: string;
    image?: string | null;
    type?: string | null;
    typeNumber?: string | null;
    organizationId?: number | null;
  }) {
    logOrganizationContext({
      service: UsersService.name,
      operation: 'publicRegister',
      organizationId: data.organizationId,
    });
    const user = await this.register({
      email: data.email,
      username: data.username,
      password: data.password,
      role: 'CLIENT',
      status: 'ACTIVO',
      organizationId: data.organizationId,
    });

    try {
      logOrganizationContext({
        service: UsersService.name,
        operation: 'publicRegister.createClient',
        organizationId: data.organizationId,
        metadata: { userId: user.id },
      });
      await this.prismaService.client.create({
        data: {
          name: data.name,
          userId: user.id,
          image: data.image ?? null,
          type: data.type ?? null,
          typeNumber: data.typeNumber ?? null,
          email: data.email,
          organizationId: data.organizationId ?? null,
        },
      });
    } catch (error) {
      // Si falla la creación del cliente, eliminamos el usuario recién creado
      await this.prismaService.user.delete({ where: { id: user.id } });
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un cliente con esos datos');
      }
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException('Error al registrar el usuario');
    }

    await this.activityService.log({
      actorId: user.id,
      actorEmail: user.email,
      entityType: 'User',
      entityId: user.id.toString(),
      action: AuditAction.CREATED,
      summary: `User ${user.email} self-registered`,
    });

    return user;
  }

  async findOne(userId: number) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }, // Selecciona solo los campos necesarios
    });
  }

  async getProfile(userId: number) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        isPublicSignup: true,
        emailVerifiedAt: true,
        client: {
          select: { phone: true, image: true },
        },
      },
    });
  }

  async getCurrentUserSummary(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        organizationId: true,
        lastOrgId: true,
        lastCompanyId: true,
        lastContextUpdatedAt: true,
        lastContextHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const lastContext = await this.buildLastContextPayload(user);
    const userPermissions = await this.resolveUserModulePermissions(
      user.id,
      lastContext?.orgId ?? user.organizationId ?? null,
    );

    return {
      id: user.id,
      name: user.username,
      email: user.email,
      role: user.role,
      lastContext,
      userPermissions,
    };
  }

  async updateLastContext(
    userId: number,
    dto: UpdateLastContextDto,
    req?: Request,
  ) {
    const startedAt = Date.now();
    try {
      this.enforceContextRateLimit(userId);
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          organizationId: true,
          lastOrgId: true,
          lastCompanyId: true,
          lastContextUpdatedAt: true,
          lastContextHash: true,
        },
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const { organization } = await this.assertOrganizationAccess(
        user,
        dto.orgId,
      );
      const company = dto.companyId
        ? await this.assertCompanyBelongsToOrganization(
            dto.orgId,
            dto.companyId,
          )
        : null;

      const now = new Date();
      const contextHash = this.generateContextHash(
        user.id,
        dto.orgId,
        dto.companyId ?? null,
      );

      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          lastOrgId: dto.orgId,
          lastCompanyId: dto.companyId ?? null,
          lastContextUpdatedAt: now,
          lastContextHash: contextHash,
        },
      });

      await this.activityService.log(
        {
          actorId: user.id,
          actorEmail: user.email,
          entityType: 'User',
          entityId: user.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Actualizo el contexto a org ${dto.orgId}${
            dto.companyId ? ` / company ${dto.companyId}` : ''
          }`,
          diff: {
            before: {
              orgId: user.lastOrgId ?? null,
              companyId: user.lastCompanyId ?? null,
            },
            after: {
              orgId: dto.orgId,
              companyId: dto.companyId ?? null,
            },
          } as Prisma.JsonValue,
        },
        req,
      );

      this.contextEventsGateway.emitContextChanged(user.id, {
        orgId: dto.orgId,
        companyId: dto.companyId ?? null,
        updatedAt: now.toISOString(),
      });
      await this.trackContextPreference(
        user.id,
        dto.orgId,
        dto.companyId ?? null,
        now,
      );
      await this.logContextHistory(
        user.id,
        dto.orgId,
        dto.companyId ?? null,
        req,
        now,
      );

      const latency = Date.now() - startedAt;
      this.contextPrometheusService.recordContextUpdate('success', latency);

      return {
        orgId: dto.orgId,
        companyId: dto.companyId ?? null,
        updatedAt: now.toISOString(),
        hash: contextHash,
        organization: {
          id: organization.id,
          name: organization.name?.trim() ?? null,
        },
        company: company
          ? { id: company.id, name: company.name?.trim() ?? null }
          : null,
      };
    } catch (error) {
      const latency = Date.now() - startedAt;
      this.contextPrometheusService.recordContextUpdate('error', latency);
      throw error;
    }
  }

  async validateContext(userId: number, dto: ValidateContextDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let organization: {
      id: number;
      name: string | null;
      status: string;
    } | null = null;
    let membership: { role: OrganizationMembershipRole } | null = null;

    try {
      const result = await this.assertOrganizationAccess(user, dto.orgId);
      organization = result.organization;
      membership = result.membership;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          isValid: false,
          reason: 'ORG_NOT_FOUND',
          permissions: [],
          organization: null,
          company: null,
        };
      }
      if (error instanceof ForbiddenException) {
        return {
          isValid: false,
          reason: 'ORG_ACCESS_REVOKED',
          permissions: [],
          organization: null,
          company: null,
        };
      }
      throw error;
    }

    let companyPayload: { id: number; name: string | null } | null = null;
    if (dto.companyId) {
      try {
        const company = await this.assertCompanyBelongsToOrganization(
          dto.orgId,
          dto.companyId,
        );
        companyPayload = { id: company.id, name: company.name?.trim() ?? null };
      } catch (error) {
        if (error instanceof NotFoundException) {
          return {
            isValid: false,
            reason: 'COMPANY_NOT_FOUND',
            permissions: [],
            organization: organization
              ? {
                  id: organization.id,
                  name: organization.name?.trim() ?? null,
                }
              : null,
            company: null,
          };
        }
        if (
          error instanceof BadRequestException ||
          error instanceof ForbiddenException
        ) {
          return {
            isValid: false,
            reason: 'COMPANY_INVALID',
            permissions: [],
            organization: organization
              ? {
                  id: organization.id,
                  name: organization.name?.trim() ?? null,
                }
              : null,
            company: null,
          };
        }
        throw error;
      }
    }

    const permissions = this.resolvePermissionList(
      membership?.role ?? null,
      user.role,
    );

    return {
      isValid: true,
      reason: null,
      permissions,
      organization: {
        id: organization.id,
        name: organization.name?.trim() ?? null,
      },
      company: companyPayload,
    };
  }

  async getContextSuggestion(userId: number) {
    const preference = await this.prismaService.userContextPreference.findFirst(
      {
        where: { userId },
        orderBy: [{ lastSelectedAt: 'desc' }, { totalSelections: 'desc' }],
      },
    );

    if (!preference) {
      return { orgId: null, companyId: null };
    }

    return {
      orgId: preference.orgId,
      companyId: preference.companyId ?? null,
    };
  }

  findAll(search?: string, organizationId?: number | null) {
    const where: Prisma.UserWhereInput = {};

    if (search && search.trim().length > 0) {
      where.OR = [
        {
          username: {
            contains: search.trim(),
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          email: {
            contains: search.trim(),
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];
    }

    if (organizationId !== undefined) {
      where.organizationId = organizationId ?? null;
    }

    return this.prismaService.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, data: UpdateUserDto) {
    if (data.organizationId !== undefined) {
      logOrganizationContext({
        service: UsersService.name,
        operation: 'update',
        organizationId: data.organizationId,
        metadata: { userId: id },
      });
    }
    if (data.email) {
      const existing = await this.prismaService.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('El correo ya está registrado');
      }
    }

    if (data.username) {
      const existing = await this.prismaService.user.findUnique({
        where: { username: data.username },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          'El nombre de usuario ya está registrado',
        );
      }
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    try {
      return await this.prismaService.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException('Error al actualizar el usuario');
    }
  }

  async updateProfile(id: number, data: UpdateProfileDto) {
    const { phone, image, ...userData } = data;
    if (userData.organizationId !== undefined) {
      logOrganizationContext({
        service: UsersService.name,
        operation: 'updateProfile',
        organizationId: userData.organizationId,
        metadata: { userId: id },
      });
    }
    const updated = await this.update(id, userData);

    if (
      phone !== undefined ||
      image !== undefined ||
      updated.organizationId !== undefined
    ) {
      logOrganizationContext({
        service: UsersService.name,
        operation: 'updateProfile.syncClient',
        organizationId: updated.organizationId,
        metadata: { userId: id },
      });
      const existingClient = await this.prismaService.client.findUnique({
        where: { userId: id },
      });

      const clientData: {
        phone?: string | null;
        image?: string | null;
        name?: string;
        email?: string;
        organizationId?: number | null;
      } = {};
      if (phone !== undefined) clientData.phone = phone;
      if (image !== undefined) clientData.image = image;
      clientData.organizationId = updated.organizationId ?? null;

      if (existingClient) {
        await this.prismaService.client.update({
          where: { userId: id },
          data: clientData,
        });
      } else {
        await this.prismaService.client.create({
          data: {
            userId: id,
            name: updated.username,
            email: updated.email,
            ...clientData,
          },
        });
      }
    }

    await this.activityService.log({
      actorId: id,
      actorEmail: updated.email,
      entityType: 'User',
      entityId: id.toString(),
      action: AuditAction.UPDATED,
      summary: `User ${updated.email} updated profile`,
    });

    return updated;
  }

  async changePassword(
    id: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prismaService.user.findUnique({ where: { id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prismaService.user.update({
      where: { id },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    await this.activityService.log({
      actorId: id,
      actorEmail: user.email,
      entityType: 'User',
      entityId: id.toString(),
      action: AuditAction.UPDATED,
      summary: `User ${user.email} changed password`,
    });

    return { message: 'Password updated successfully' };
  }

  async updateUserRoleAndStatus(
    userId: number,
    dto: UpdateUserRoleDto,
    tenant: TenantContext | null,
    actor: { actorId: number | null; actorEmail: string | null },
  ) {
    if (!dto.role && !dto.status) {
      throw new BadRequestException(
        'Debes proporcionar al menos un campo para actualizar.',
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isGlobalAdmin = tenant?.isGlobalSuperAdmin ?? false;
    const isOrgAdmin = tenant?.isOrganizationSuperAdmin ?? false;

    if (!isGlobalAdmin) {
      if (!isOrgAdmin) {
        throw new ForbiddenException(
          'No cuentas con permisos para actualizar usuarios.',
        );
      }

      if (
        tenant?.organizationId == null ||
        user.organizationId !== tenant.organizationId
      ) {
        throw new ForbiddenException(
          'Solo puedes actualizar usuarios de tu organizacion.',
        );
      }

      if (dto.role === UserRole.SUPER_ADMIN_GLOBAL) {
        throw new ForbiddenException(
          'No puedes asignar el rol de super administrador global.',
        );
      }
    }

    if (
      dto.role &&
      dto.role !== UserRole.ADMIN &&
      dto.role !== UserRole.EMPLOYEE
    ) {
      throw new BadRequestException(
        'Solo se permiten los roles Administrador o Empleado.',
      );
    }

    const updatePayload: Prisma.UserUpdateInput = {};
    if (dto.role) {
      updatePayload.role = dto.role;
    }
    if (dto.status) {
      updatePayload.status = dto.status;
    }

    const updated = await this.prismaService.user.update({
      where: { id: userId },
      data: updatePayload,
    });

    await this.activityService.log(
      {
        actorId: actor.actorId ?? undefined,
        actorEmail: actor.actorEmail ?? undefined,
        entityType: 'User',
        entityId: userId.toString(),
        action: AuditAction.UPDATED,
        summary: `Actualización de rol/estado para ${updated.email}`,
        diff: {
          before: { role: user.role, status: user.status },
          after: { role: updated.role, status: updated.status },
        } as any,
      },
      undefined,
    );

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  }

  private async resolveUserModulePermissions(
    userId: number,
    organizationId: number | null,
  ): Promise<Record<string, boolean> | null> {
    if (!organizationId) {
      return null;
    }

    const membership =
      await this.prismaService.organizationMembership.findFirst({
        where: {
          userId,
          organizationId,
        },
        select: {
          modulePermissions: true,
        },
      });

    if (!membership?.modulePermissions) {
      return null;
    }

    return this.sanitizeModulePermissions(membership.modulePermissions);
  }

  private sanitizeModulePermissions(
    value: Prisma.JsonValue | null | undefined,
  ): Record<string, boolean> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const result: Record<string, boolean> = {};
    for (const key of UsersService.MODULE_PERMISSION_KEYS) {
      const entry = (value as Record<string, unknown>)[key];
      if (typeof entry === 'boolean') {
        result[key] = entry;
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  private enforceContextRateLimit(userId: number): void {
    const now = Date.now();
    const windowStart = now - this.CONTEXT_RATE_LIMIT_WINDOW_MS;
    const attempts =
      this.contextUpdateAttempts
        .get(userId)
        ?.filter((timestamp) => timestamp > windowStart) ?? [];

    if (attempts.length >= this.CONTEXT_RATE_LIMIT) {
      this.contextPrometheusService.recordRateLimitHit();
      this.contextThrottleService.recordHit(userId);
      throw new HttpException(
        'Has alcanzado el limite de cambios de contexto. Intenta nuevamente en un minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    attempts.push(now);
    this.contextUpdateAttempts.set(userId, attempts);
  }

  private generateContextHash(
    userId: number,
    orgId: number,
    companyId: number | null,
  ): string {
    return createHash('sha256')
      .update(`${userId}:${orgId}:${companyId ?? 'null'}`)
      .digest('hex');
  }

  private async buildLastContextPayload(user: {
    id: number;
    lastOrgId: number | null;
    lastCompanyId: number | null;
    lastContextUpdatedAt: Date | null;
    lastContextHash: string | null;
  }): Promise<{
    orgId: number;
    companyId: number | null;
    updatedAt: string;
    hash?: string | null;
  } | null> {
    if (!user.lastOrgId || !user.lastContextUpdatedAt) {
      return null;
    }

    if (this.isContextExpired(user.lastContextUpdatedAt)) {
      await this.expireStoredContext(user.id);
      return null;
    }

    return {
      orgId: user.lastOrgId,
      companyId: user.lastCompanyId ?? null,
      updatedAt: user.lastContextUpdatedAt.toISOString(),
      hash: user.lastContextHash ?? null,
    };
  }

  private isContextExpired(updatedAt: Date | null): boolean {
    if (!updatedAt) {
      return true;
    }
    return Date.now() - updatedAt.getTime() > this.CONTEXT_TTL_MS;
  }

  private async expireStoredContext(userId: number): Promise<void> {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        lastOrgId: null,
        lastCompanyId: null,
        lastContextUpdatedAt: null,
        lastContextHash: null,
      },
    });
  }

  private async assertOrganizationAccess(
    user: {
      id: number;
      role: UserRole;
      organizationId?: number | null;
    },
    organizationId: number,
  ): Promise<{
    organization: { id: number; name: string | null; status: string };
    membership: { role: OrganizationMembershipRole } | null;
  }> {
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, status: true },
    });

    if (!organization) {
      throw new NotFoundException('La organizacion no existe.');
    }

    const normalizedStatus = (organization.status ?? '').toUpperCase();
    if (normalizedStatus && normalizedStatus !== 'ACTIVE') {
      throw new ForbiddenException(
        'La organizacion seleccionada no esta activa.',
      );
    }

    const isGlobalAdmin = user.role === UserRole.SUPER_ADMIN_GLOBAL;
    const isOrgAdmin = user.role === UserRole.SUPER_ADMIN_ORG;

    if (isGlobalAdmin) {
      return { organization, membership: null };
    }

    if (isOrgAdmin) {
      if (
        user.organizationId !== null &&
        user.organizationId !== undefined &&
        user.organizationId !== organizationId
      ) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a esta organizacion.',
        );
      }

      const membership =
        await this.prismaService.organizationMembership.findFirst({
          where: { userId: user.id, organizationId },
          select: { role: true },
        });

      return { organization, membership };
    }

    const membership =
      await this.prismaService.organizationMembership.findFirst({
        where: { userId: user.id, organizationId },
        select: { role: true },
      });

    if (!membership) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a esta organizacion.',
      );
    }

    return { organization, membership };
  }

  private async assertCompanyBelongsToOrganization(
    organizationId: number,
    companyId: number,
  ): Promise<{ id: number; name: string | null }> {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, organizationId: true, status: true },
    });

    if (!company) {
      throw new NotFoundException('La empresa no existe.');
    }

    if (company.organizationId !== organizationId) {
      throw new BadRequestException(
        'La empresa no pertenece a la organizacion seleccionada.',
      );
    }

    const normalizedStatus = (company.status ?? '').toUpperCase();
    if (normalizedStatus && normalizedStatus !== 'ACTIVE') {
      throw new ForbiddenException('La empresa seleccionada no esta activa.');
    }

    return { id: company.id, name: company.name };
  }

  private resolvePermissionList(
    membershipRole: OrganizationMembershipRole | null,
    userRole: UserRole,
  ): string[] {
    if (
      userRole === UserRole.SUPER_ADMIN_GLOBAL ||
      userRole === UserRole.SUPER_ADMIN_ORG
    ) {
      return ['read', 'write', 'admin'];
    }

    if (!membershipRole) {
      return ['read'];
    }

    switch (membershipRole) {
      case OrganizationMembershipRole.VIEWER:
        return ['read'];
      case OrganizationMembershipRole.MEMBER:
        return ['read', 'write'];
      case OrganizationMembershipRole.ADMIN:
      case OrganizationMembershipRole.SUPER_ADMIN:
      case OrganizationMembershipRole.OWNER:
        return ['read', 'write', 'admin'];
      default:
        return ['read'];
    }
  }

  private async trackContextPreference(
    userId: number,
    orgId: number,
    companyId: number | null,
    timestamp: Date,
  ) {
    const existing = await this.prismaService.userContextPreference.findFirst({
      where: {
        userId,
        orgId,
        companyId: companyId ?? null,
      },
      select: { id: true },
    });

    if (existing) {
      await this.prismaService.userContextPreference.update({
        where: { id: existing.id },
        data: {
          totalSelections: { increment: 1 },
          lastSelectedAt: timestamp,
        },
      });
      return;
    }

    await this.prismaService.userContextPreference.create({
      data: {
        userId,
        orgId,
        companyId: companyId ?? null,
        totalSelections: 1,
        lastSelectedAt: timestamp,
      },
    });
  }

  private async logContextHistory(
    userId: number,
    orgId: number,
    companyId: number | null,
    req: Request | undefined,
    timestamp: Date,
  ) {
    const device =
      req?.headers?.['user-agent']?.toString()?.slice(0, 200) ?? null;

    await this.prismaService.userContextHistory.create({
      data: {
        userId,
        orgId,
        companyId: companyId ?? null,
        createdAt: timestamp,
        device,
      },
    });
  }

  async listContextHistory(userId: number, limitValue = 10, cursorId?: number) {
    const limit = Math.min(Math.max(limitValue || 10, 1), 50);
    const query: Prisma.UserContextHistoryFindManyArgs = {
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    };

    if (cursorId && cursorId > 0) {
      query.cursor = { id: cursorId };
      query.skip = 1;
    }

    const entries = await this.prismaService.userContextHistory.findMany(query);
    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, -1) : entries;
    const nextCursor = hasMore ? entries[entries.length - 1].id : null;

    return {
      items,
      nextCursor,
    };
  }

  async restoreFromHistory(userId: number, historyId: number, req?: Request) {
    const entry = await this.prismaService.userContextHistory.findFirst({
      where: { id: historyId, userId },
    });

    if (!entry) {
      throw new NotFoundException('Historical context not found');
    }

    return this.updateLastContext(
      userId,
      {
        orgId: entry.orgId,
        companyId: entry.companyId ?? null,
      },
      req,
    );
  }
}
