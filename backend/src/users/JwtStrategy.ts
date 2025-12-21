import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          return (req as any)?.cookies?.token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revoked');
    }
    let organizationIds: number[] = [];
    if (Array.isArray(payload.organizations) && payload.organizations.length) {
      organizationIds = payload.organizations
        .map((value: unknown) =>
          typeof value === 'number' ? value : Number.parseInt(`${value}`, 10),
        )
        .filter((id: number) => Number.isFinite(id));
    } else {
      const memberships =
        await this.prismaService.organizationMembership.findMany({
          where: { userId: payload.sub },
          select: { organizationId: true },
          orderBy: { createdAt: 'asc' },
        });
      organizationIds = memberships
        .map((membership) => membership.organizationId)
        .filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id),
        );
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      defaultOrganizationId:
        payload.defaultOrganizationId ??
        user.lastOrgId ??
        user.organizationId ??
        null,
      defaultCompanyId: payload.defaultCompanyId ?? user.lastCompanyId ?? null,
      organizations: organizationIds,
      isPublicSignup: Boolean(
        payload.isPublicSignup ?? user.isPublicSignup ?? false,
      ),
    };
  }
}
