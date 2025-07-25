import { Injectable, UnauthorizedException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

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

  async publicRegister(data: { email: string; username: string; password: string; name: string; image?: string | null; type?: string | null; typeNumber?: string | null }) {
    const user = await this.register({
      email: data.email,
      username: data.username,
      password: data.password,
      role: 'CLIENT',
    });

    try {
      await this.prismaService.client.create({
        data: {
          name: data.name,
          userId: user.id,
          image: data.image ?? null,
          type: data.type ?? null,
          typeNumber: data.typeNumber ?? null,
          email: data.email,
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
      },
    });
  }

  findAll() {
    return this.prismaService.user.findMany()
  }

  async update(id: number, data: UpdateUserDto) {
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
}