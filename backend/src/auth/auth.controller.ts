import {
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      (req as any).cookies?.refresh_token || req.headers['x-refresh-token'];
    if (!token || Array.isArray(token)) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const { accessToken, refreshToken } =
      await this.authService.refreshToken(token);
    // Return both tokens in body — the frontend proxy handles cookie setting.
    // Also set cookie for direct-to-backend callers (backwards compat).
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: isProduction,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return { access_token: accessToken, refreshToken };
  }
}
