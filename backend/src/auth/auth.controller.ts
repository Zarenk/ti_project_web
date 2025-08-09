import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token =
      (req as any).cookies?.refresh_token || req.headers['x-refresh-token'];
    if (!token || Array.isArray(token)) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const { accessToken, refreshToken } = await this.authService.refreshToken(
      token,
    );
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    return { access_token: accessToken };
  }
}