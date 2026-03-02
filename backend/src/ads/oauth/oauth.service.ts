import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { SocialPlatform } from '@prisma/client';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// ── Constants ──────────────────────────────────────────────────────────────

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';
const META_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_USER_URL = 'https://open.tiktokapis.com/v2/user/info/';

// Facebook scopes for page posting + Instagram
const META_SCOPES = [
  'pages_manage_posts',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

const TIKTOK_SCOPES = 'user.info.basic,video.publish';

// ── Types ──────────────────────────────────────────────────────────────────

interface StatePayload {
  platform: string;
  organizationId: number;
  nonce: string;
}

export interface OAuthResult {
  socialAccountId: number;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  private readonly metaAppId: string;
  private readonly metaAppSecret: string;
  private readonly tiktokClientKey: string;
  private readonly tiktokClientSecret: string;
  private readonly redirectBaseUrl: string;
  private readonly jwtSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.metaAppId = this.config.get<string>('META_APP_ID', '');
    this.metaAppSecret = this.config.get<string>('META_APP_SECRET', '');
    this.tiktokClientKey = this.config.get<string>('TIKTOK_CLIENT_KEY', '');
    this.tiktokClientSecret = this.config.get<string>('TIKTOK_CLIENT_SECRET', '');
    this.redirectBaseUrl = this.config.get<string>(
      'OAUTH_REDIRECT_BASE_URL',
      'http://localhost:3000',
    );
    this.jwtSecret = this.config.get<string>('JWT_SECRET', 'fallback-secret');
  }

  // ── Authorization URL ──────────────────────────────────────────────────

  getAuthorizationUrl(
    platform: SocialPlatform,
    organizationId: number,
  ): { url: string; state: string } {
    const state = this.createStateToken(platform, organizationId);
    const redirectUri = `${this.redirectBaseUrl}/api/ads/oauth/callback`;

    switch (platform) {
      case 'FACEBOOK':
      case 'INSTAGRAM': {
        if (!this.metaAppId) {
          throw new BadRequestException(
            'META_APP_ID not configured. Create a Meta App at developers.facebook.com',
          );
        }
        const params = new URLSearchParams({
          client_id: this.metaAppId,
          redirect_uri: redirectUri,
          scope: META_SCOPES,
          response_type: 'code',
          state,
        });
        return { url: `${META_AUTH_URL}?${params}`, state };
      }

      case 'TIKTOK': {
        if (!this.tiktokClientKey) {
          throw new BadRequestException(
            'TIKTOK_CLIENT_KEY not configured. Create a TikTok App at developers.tiktok.com',
          );
        }
        const params = new URLSearchParams({
          client_key: this.tiktokClientKey,
          redirect_uri: redirectUri,
          scope: TIKTOK_SCOPES,
          response_type: 'code',
          state,
        });
        return { url: `${TIKTOK_AUTH_URL}?${params}`, state };
      }

      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  // ── Code Exchange ──────────────────────────────────────────────────────

  async exchangeCode(
    platform: SocialPlatform,
    code: string,
    state: string,
    organizationId: number,
  ): Promise<OAuthResult> {
    // Validate state token
    const payload = this.verifyStateToken(state);
    if (payload.organizationId !== organizationId) {
      throw new UnauthorizedException('State token organization mismatch');
    }

    const redirectUri = `${this.redirectBaseUrl}/api/ads/oauth/callback`;

    switch (platform) {
      case 'FACEBOOK':
        return this.exchangeMetaCode(code, redirectUri, organizationId, 'FACEBOOK');
      case 'INSTAGRAM':
        return this.exchangeMetaCode(code, redirectUri, organizationId, 'INSTAGRAM');
      case 'TIKTOK':
        return this.exchangeTikTokCode(code, redirectUri, organizationId);
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  // ── Token Refresh ──────────────────────────────────────────────────────

  async refreshToken(socialAccountId: number): Promise<boolean> {
    const account = await this.prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });

    if (!account || !account.isActive) {
      return false;
    }

    try {
      switch (account.platform) {
        case 'FACEBOOK':
        case 'INSTAGRAM':
          return this.refreshMetaToken(account.id, account.accessToken);
        case 'TIKTOK':
          return this.refreshTikTokToken(account.id, account.refreshToken);
        default:
          return false;
      }
    } catch (err) {
      this.logger.error(`Token refresh failed for account ${socialAccountId}: ${err}`);
      return false;
    }
  }

  // ── Check if platform is configured ────────────────────────────────────

  isPlatformConfigured(platform: SocialPlatform): boolean {
    switch (platform) {
      case 'FACEBOOK':
      case 'INSTAGRAM':
        return !!this.metaAppId && !!this.metaAppSecret;
      case 'TIKTOK':
        return !!this.tiktokClientKey && !!this.tiktokClientSecret;
      default:
        return false;
    }
  }

  // ── Private: Meta (Facebook + Instagram) ───────────────────────────────

  private async exchangeMetaCode(
    code: string,
    redirectUri: string,
    organizationId: number,
    targetPlatform: 'FACEBOOK' | 'INSTAGRAM',
  ): Promise<OAuthResult> {
    // Step 1: Exchange code for short-lived user token
    const tokenParams = new URLSearchParams({
      client_id: this.metaAppId,
      client_secret: this.metaAppSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?${tokenParams}`,
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      this.logger.error(`Meta token exchange error: ${JSON.stringify(tokenData.error)}`);
      throw new BadRequestException(
        tokenData.error.message || 'Failed to exchange code with Meta',
      );
    }

    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived token (~60 days)
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.metaAppId,
      client_secret: this.metaAppSecret,
      fb_exchange_token: shortLivedToken,
    });

    const longLivedRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?${longLivedParams}`,
    );
    const longLivedData = await longLivedRes.json();

    const userAccessToken = longLivedData.access_token || shortLivedToken;
    const expiresIn = longLivedData.expires_in || 5184000; // default 60 days

    // Step 3: Get user's pages
    const pagesRes = await fetch(
      `${META_GRAPH_URL}/me/accounts?access_token=${userAccessToken}`,
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new BadRequestException(
        'No Facebook Pages found. You need a Facebook Page to publish.',
      );
    }

    // Use the first page (could let user select in the future)
    const page = pagesData.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    if (targetPlatform === 'INSTAGRAM') {
      // Step 4 (Instagram): Get Instagram Business Account linked to page
      const igRes = await fetch(
        `${META_GRAPH_URL}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
      );
      const igData = await igRes.json();

      if (!igData.instagram_business_account?.id) {
        throw new BadRequestException(
          'No Instagram Business Account linked to this Facebook Page. ' +
            'Link your Instagram Business account in Facebook Page Settings.',
        );
      }

      const igUserId = igData.instagram_business_account.id;

      // Get Instagram username
      const igInfoRes = await fetch(
        `${META_GRAPH_URL}/${igUserId}?fields=username,name&access_token=${pageAccessToken}`,
      );
      const igInfo = await igInfoRes.json();

      const account = await this.upsertSocialAccount({
        organizationId,
        platform: 'INSTAGRAM',
        accountId: igUserId,
        accountName: igInfo.username ? `@${igInfo.username}` : pageName,
        accessToken: pageAccessToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        metadata: { pageId, pageName, igUserId, username: igInfo.username },
      });

      return {
        socialAccountId: account.id,
        platform: 'INSTAGRAM',
        accountName: account.accountName,
        accountId: account.accountId,
      };
    }

    // Facebook: save page token
    const account = await this.upsertSocialAccount({
      organizationId,
      platform: 'FACEBOOK',
      accountId: pageId,
      accountName: pageName,
      accessToken: pageAccessToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      metadata: { pageId, pageName },
    });

    return {
      socialAccountId: account.id,
      platform: 'FACEBOOK',
      accountName: account.accountName,
      accountId: account.accountId,
    };
  }

  private async refreshMetaToken(
    accountId: number,
    currentToken: string,
  ): Promise<boolean> {
    // Facebook page tokens obtained via long-lived user tokens don't expire
    // if the user token was long-lived. But just in case, attempt refresh.
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.metaAppId,
      client_secret: this.metaAppSecret,
      fb_exchange_token: currentToken,
    });

    const res = await fetch(`${META_GRAPH_URL}/oauth/access_token?${params}`);
    const data = await res.json();

    if (data.access_token) {
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: data.access_token,
          tokenExpiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : undefined,
        },
      });
      return true;
    }

    return false;
  }

  // ── Private: TikTok ────────────────────────────────────────────────────

  private async exchangeTikTokCode(
    code: string,
    redirectUri: string,
    organizationId: number,
  ): Promise<OAuthResult> {
    // Step 1: Exchange code for tokens
    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.tiktokClientKey,
        client_secret: this.tiktokClientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.data?.access_token) {
      this.logger.error(`TikTok token exchange error: ${JSON.stringify(tokenData)}`);
      throw new BadRequestException(
        tokenData.error_description ||
          tokenData.message ||
          'Failed to exchange code with TikTok',
      );
    }

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      open_id: openId,
    } = tokenData.data;

    // Step 2: Get user info
    const userRes = await fetch(
      `${TIKTOK_USER_URL}?fields=display_name,avatar_url`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const userData = await userRes.json();
    const displayName =
      userData.data?.user?.display_name || `TikTok User ${openId.slice(0, 8)}`;

    const account = await this.upsertSocialAccount({
      organizationId,
      platform: 'TIKTOK',
      accountId: openId,
      accountName: displayName,
      accessToken,
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      metadata: { openId, displayName, avatarUrl: userData.data?.user?.avatar_url },
    });

    return {
      socialAccountId: account.id,
      platform: 'TIKTOK',
      accountName: account.accountName,
      accountId: account.accountId,
    };
  }

  private async refreshTikTokToken(
    accountId: number,
    refreshToken: string | null,
  ): Promise<boolean> {
    if (!refreshToken) return false;

    const res = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: this.tiktokClientKey,
        client_secret: this.tiktokClientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await res.json();

    if (data.data?.access_token) {
      await this.prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: data.data.access_token,
          refreshToken: data.data.refresh_token || refreshToken,
          tokenExpiresAt: data.data.expires_in
            ? new Date(Date.now() + data.data.expires_in * 1000)
            : undefined,
        },
      });
      return true;
    }

    return false;
  }

  // ── Private: Helpers ───────────────────────────────────────────────────

  private createStateToken(
    platform: SocialPlatform | string,
    organizationId: number,
  ): string {
    const payload: StatePayload = {
      platform: String(platform),
      organizationId,
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '10m' });
  }

  private verifyStateToken(state: string): StatePayload {
    try {
      return jwt.verify(state, this.jwtSecret) as StatePayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired OAuth state token');
    }
  }

  private async upsertSocialAccount(data: {
    organizationId: number;
    platform: SocialPlatform;
    accountId: string;
    accountName: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    metadata?: Record<string, any>;
  }) {
    return this.prisma.socialAccount.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId: data.organizationId,
          platform: data.platform,
          accountId: data.accountId,
        },
      },
      update: {
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        metadata: data.metadata,
        isActive: true,
      },
      create: {
        organizationId: data.organizationId,
        platform: data.platform,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        metadata: data.metadata,
      },
    });
  }
}
