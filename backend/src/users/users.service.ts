import { Injectable, UnauthorizedException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService, private jwtService: JwtService) {}

  async validateUser(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Credenciales inválidas');
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    const token = this.jwtService.sign(payload);
    return {
      access_token: token,
    };
  }

  async register(data: { email: string; username: string; password: string; role: string }) {
    const existingEmail = await this.prismaService.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const existingUsername = await this.prismaService.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      throw new BadRequestException('El nombre de usuario ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    try {
      return await this.prismaService.user.create({
        data: {
          email: data.email,
          username: data.username,
          password: hashedPassword,
          role: data.role as UserRole,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('El usuario ya existe');
      }
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }

  async findOne(userId: number) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true }, // Selecciona solo los campos necesarios
    });
  }

  findAll() {
    return this.prismaService.user.findMany()
  }
}