import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const accessToken = this.jwtService.sign(
        { username: payload.username, sub: payload.sub, role: payload.role },
        { expiresIn: '1h' },
      );
      const refreshToken = this.jwtService.sign(
        { username: payload.username, sub: payload.sub, role: payload.role },
        { expiresIn: '7d' },
      );
      return { accessToken, refreshToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}