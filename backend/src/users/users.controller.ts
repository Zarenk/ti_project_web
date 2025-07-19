import { Controller, Post, Body, Request, UseGuards, Get, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiResponse } from '@nestjs/swagger';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    console.log('Solicitud de login recibida:', body);
    const user = await this.usersService.validateUser(body.email, body.password);
    const token = await this.usersService.login(user);
    console.log('Token generado:', token);
    return token;
  }

  @Post('register')
  async register(@Body() body: { email: string; username: string; password: string; role: string }) {
    return this.usersService.register(body);
  }

  // Registro público de usuarios desde la web
  @Post('self-register')
  async publicRegister(
    @Body()
    body: {
      email: string;
      username: string;
      password: string;
      name: string;
      image?: string | null;
      type?: string | null;
      typeNumber?: string | null;
    },
  ) {
    return this.usersService.publicRegister(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profileid')
  async getProfileId(@Request() req) {
    const user = await this.usersService.findOne(req.user.userId);
  
    if (!user) {
      throw new NotFoundException(`No se encontró el usuario con ID ${req.user.userId}`);
    }
  
    return { id: user.id, name: user.username }; // Devuelve solo los datos necesarios
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all users'}) // Swagger 
    findAll() {
      return this.usersService.findAll();
  }
}
