import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole, AuditAction, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';

@Injectable()
export class UsersService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private activityService: ActivityService,
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
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - now.getTime()) / 60000);
      throw new UnauthorizedException(
        `Tu cuenta está temporalmente bloqueada. Intenta nuevamente en ${minutesRemaining} minuto(s).`,
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      const message = await this.handleFailedLogin(user, req);
      throw new UnauthorizedException(message);
    }

    if (user.failedLoginAttempts !== 0 || user.lockUntil || user.isPermanentlyLocked) {
      user = await this.resetLoginState(user, req);
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
      message = 'Tu cuenta se ha bloqueado por 1 hora debido a múltiples intentos fallidos.';
    } else if (attempts === 4) {
      lockUntil = new Date(now.getTime() + 10 * 60 * 1000);
      message = 'Tu cuenta se ha bloqueado temporalmente por 10 minutos debido a intentos fallidos consecutivos.';
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
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
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

    const existingEmail = await this.prismaService.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const existingUsername = await this.prismaService.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new BadRequestException('El nombre de usuario ya está registrado');
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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
        client: {
          select: { phone: true, image: true },
        },
      },
    });
  }

  findAll() {
    return this.prismaService.user.findMany()
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
        throw new BadRequestException('El nombre de usuario ya está registrado');
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

    if (phone !== undefined || image !== undefined || updated.organizationId !== undefined) {
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

  async changePassword(id: number, currentPassword: string, newPassword: string) {
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
}