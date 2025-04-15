import { Controller, Post, Body, Request, UseGuards, Get } from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get()
  @ApiResponse({status: 200, description: 'Return all users'}) // Swagger 
    findAll() {
      return this.usersService.findAll();
  }
}
