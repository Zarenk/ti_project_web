import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private prismaService: PrismaService,
  ) {}

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const accessToken = this.jwtService.sign(
        {
          username: payload.username,
          sub: payload.sub,
          role: payload.role,
          tokenVersion: user.tokenVersion,
        },
        { expiresIn: '2h' },
      );
      const refreshToken = this.jwtService.sign(
        {
          username: payload.username,
          sub: payload.sub,
          role: payload.role,
          tokenVersion: user.tokenVersion,
        },
        { expiresIn: '7d' },
      );
      return { accessToken, refreshToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
