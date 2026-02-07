import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

type CacheEntry = {
  orgId: number;
  companyId: number | null;
  expiresAt: number;
};

@Injectable()
export class TenantSlugResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantSlugResolverMiddleware.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 5 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const orgHeader = req.headers['x-org-id'];
    const companyHeader = req.headers['x-company-id'];
    const slugHeader = req.headers['x-tenant-slug'];

    if (orgHeader || companyHeader || !slugHeader || Array.isArray(slugHeader)) {
      return next();
    }

    const slug = slugHeader.toString().trim().toLowerCase();
    if (!slug) {
      return next();
    }

    const cached = this.cache.get(slug);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      req.headers['x-org-id'] = String(cached.orgId);
      if (cached.companyId) {
        req.headers['x-company-id'] = String(cached.companyId);
      }
      return next();
    }

    try {
      const organization = await this.prisma.organization.findFirst({
        where: { slug },
        select: { id: true },
      });

      if (!organization) {
        return next();
      }

      const companies = await this.prisma.company.findMany({
        where: { organizationId: organization.id },
        select: { id: true, status: true },
        orderBy: { id: 'asc' },
      });

      const active = companies.find(
        (c) => (c.status ?? '').toUpperCase() === 'ACTIVE',
      );
      const companyId = active?.id ?? companies[0]?.id ?? null;

      req.headers['x-org-id'] = String(organization.id);
      if (companyId) {
        req.headers['x-company-id'] = String(companyId);
      }

      this.cache.set(slug, {
        orgId: organization.id,
        companyId,
        expiresAt: now + this.ttlMs,
      });
    } catch (error) {
      this.logger.debug(
        `Failed to resolve tenant slug ${slug}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return next();
  }
}
