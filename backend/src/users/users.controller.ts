import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponse } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Request as ExpressRequest } from 'express';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { TenantContextGuard } from 'src/tenancy/tenant-context.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Request() req: ExpressRequest,
  ) {
    console.log('Solicitud de login recibida:', body);
    const user = await this.usersService.validateUser(
      body.email,
      body.password,
      req,
    );
    const token = await this.usersService.login(user, req);
    console.log('Token generado:', token);
    return token;
  }

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      username?: string;
      password: string;
      role: string;
      status?: string;
      organizationId?: number | null;
    },
  ) {
    return this.usersService.register(body);
  }

  @UseGuards(JwtAuthGuard, GlobalSuperAdminGuard)
  @Post('admin/create')
  async createManagedUser(@Body() dto: CreateManagedUserDto) {
    return this.usersService.register({
      email: dto.email,
      username: dto.username,
      password: dto.password,
      role: dto.role as UserRole,
      status: dto.status ?? 'ACTIVO',
      organizationId: dto.organizationId ?? null,
    });
  }

  // Registro público de usuarios desde la web
  @Post('self-register')
  async publicRegister(
    @Body()
    body: {
      email: string;
      username?: string;
      password: string;
      name: string;
      image?: string | null;
      type?: string | null;
      typeNumber?: string | null;
      organizationId?: number | null;
    },
  ) {
    return this.usersService.publicRegister(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return this.usersService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profileid')
  async getProfileId(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);

    if (!user) {
      throw new NotFoundException(
        `No se encontró el usuario con ID ${req.user.userId}`,
      );
    }

    return { id: user.id, name: user.username }; // Devuelve solo los datos necesarios
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiResponse({ status: 200, description: 'Return all users' }) // Swagger
  findAll(
    @Query('search') search?: string,
    @CurrentTenant('organizationId') organizationId?: number | null,
  ) {
    return this.usersService.findAll(search, organizationId ?? undefined);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() updateUserDto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(@Request() req, @Body() body: UpdatePasswordDto) {
    return this.usersService.changePassword(
      req.user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @Patch(':id/manage')
  async updateUserByAdmin(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentTenant() tenant: TenantContext | null,
    @Request() req,
  ) {
    const normalizedRole = (req.user?.role ?? '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    const isGlobal =
      (tenant?.isGlobalSuperAdmin ?? false) ||
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN';
    const isOrg =
      (tenant?.isOrganizationSuperAdmin ?? false) ||
      normalizedRole === 'SUPER_ADMIN_ORG' ||
      normalizedRole === 'SUPER_ADMIN';

    if (!isGlobal && !isOrg) {
      throw new ForbiddenException(
        'Solo los super administradores pueden actualizar usuarios.',
      );
    }

    const effectiveTenant: TenantContext =
      tenant ??
      ({
        organizationId: null,
        companyId: null,
        organizationUnitId: null,
        userId: req.user?.userId ?? null,
        isGlobalSuperAdmin: isGlobal,
        isOrganizationSuperAdmin: isOrg,
        isSuperAdmin: isGlobal || isOrg,
        allowedOrganizationIds: [],
        allowedCompanyIds: [],
        allowedOrganizationUnitIds: [],
      } as TenantContext);

    return this.usersService.updateUserRoleAndStatus(
      userId,
      dto,
      effectiveTenant,
      {
        actorId: req.user?.userId ?? null,
        actorEmail: req.user?.email ?? req.user?.username ?? null,
      },
    );
  }
}
