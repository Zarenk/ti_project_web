import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private prismaService: PrismaService,
  ) {}

  async refreshToken(token: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Refresh token rotation: verify the incoming token matches the stored hash.
    // If it doesn't match, someone may be reusing an old (rotated-out) token —
    // this is a signal of potential theft, so we invalidate ALL tokens.
    const incomingHash = createHash('sha256').update(token).digest('hex');
    if (user.refreshTokenHash && user.refreshTokenHash !== incomingHash) {
      // Potential token theft — invalidate everything
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { tokenVersion: { increment: 1 }, refreshTokenHash: null },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions invalidated.',
      );
    }

    // Build full payload for the new access token (fetch fresh memberships)
    const memberships =
      await this.prismaService.organizationMembership.findMany({
        where: { userId: user.id },
        select: { organizationId: true },
        orderBy: { createdAt: 'asc' },
      });
    const organizationIds = memberships
      .map((m) => m.organizationId)
      .filter(
        (id): id is number => typeof id === 'number' && Number.isFinite(id),
      );

    const fallbackOrgId =
      user.lastOrgId ?? user.organizationId ?? organizationIds[0] ?? null;

    const accessToken = this.jwtService.sign(
      {
        username: user.username,
        sub: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
        defaultOrganizationId: fallbackOrgId,
        defaultCompanyId: user.lastCompanyId ?? null,
        organizations: organizationIds,
        isPublicSignup: Boolean(user.isPublicSignup),
      },
      { expiresIn: '3h' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, tokenVersion: user.tokenVersion },
      { expiresIn: '7d' },
    );

    // Rotate: store the new refresh token hash, invalidating the old one
    const newHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newHash },
    });

    return { accessToken, refreshToken };
  }
}
