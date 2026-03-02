import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { SocialPlatform } from '@prisma/client';
import { OAuthService } from './oauth.service';

@ApiTags('ads-oauth')
@ApiBearerAuth()
@Controller('ads/oauth')
@UseGuards(JwtAuthGuard)
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Generate OAuth authorization URL for a platform.
   * Frontend opens this URL in a popup.
   */
  @Get('authorize')
  authorize(
    @Query('platform') platform: string,
    @CurrentTenant('organizationId') organizationId: number,
  ) {
    const normalizedPlatform = this.normalizePlatform(platform);
    const { url, state } = this.oauthService.getAuthorizationUrl(
      normalizedPlatform,
      organizationId,
    );
    return { url, state };
  }

  /**
   * Exchange OAuth code for tokens and save social account.
   * Called by the frontend callback route after platform redirects back.
   */
  @Post('exchange')
  async exchange(
    @Body() body: { platform: string; code: string; state: string },
    @CurrentTenant('organizationId') organizationId: number,
  ) {
    if (!body.code || !body.state || !body.platform) {
      throw new BadRequestException('Missing code, state, or platform');
    }

    const platform = this.normalizePlatform(body.platform);
    return this.oauthService.exchangeCode(
      platform,
      body.code,
      body.state,
      organizationId,
    );
  }

  /**
   * Refresh an expired token for a social account.
   */
  @Post('refresh/:id')
  async refresh(
    @Param('id', ParseIntPipe) id: number,
  ) {
    const success = await this.oauthService.refreshToken(id);
    return { success };
  }

  /**
   * Check which platforms have OAuth configured (env vars present).
   */
  @Get('platforms')
  platforms() {
    return {
      FACEBOOK: this.oauthService.isPlatformConfigured('FACEBOOK'),
      INSTAGRAM: this.oauthService.isPlatformConfigured('INSTAGRAM'),
      TIKTOK: this.oauthService.isPlatformConfigured('TIKTOK'),
    };
  }

  private normalizePlatform(platform: string): SocialPlatform {
    const upper = (platform || '').toUpperCase() as SocialPlatform;
    if (!['FACEBOOK', 'INSTAGRAM', 'TIKTOK'].includes(upper)) {
      throw new BadRequestException(
        `Invalid platform "${platform}". Must be FACEBOOK, INSTAGRAM, or TIKTOK`,
      );
    }
    return upper;
  }
}
