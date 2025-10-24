import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  NotFoundException,
  Patch,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponse } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Request as ExpressRequest } from 'express';

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

  @Get()
  @ApiResponse({ status: 200, description: 'Return all users' }) // Swagger
  findAll(@Query('search') search?: string) {
    return this.usersService.findAll(search);
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
}
