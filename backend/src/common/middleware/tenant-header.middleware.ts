import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const TENANT_HEADER_NAMES = ['x-org-id', 'x-company-id', 'x-org-unit-id'] as const;
type TenantHeaderName = (typeof TENANT_HEADER_NAMES)[number];

const sanitizeHeader = (
  value: string | string[] | undefined,
): string | undefined => {
  if (!value) {
    return undefined;
  }

  const header = Array.isArray(value) ? value[0] : value;
  const numeric = header.replace(/\D+/g, '');
  return numeric || undefined;
};

@Injectable()
export class TenantHeaderSanitizerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantHeaderSanitizerMiddleware.name);

  private sanitizeAndAssign(
    req: Request,
    headerName: TenantHeaderName,
  ): string | undefined {
    const original = req.headers[headerName];
    const sanitized = sanitizeHeader(original as string | string[] | undefined);

    if (sanitized) {
      req.headers[headerName] = sanitized;
      if (
        typeof original === 'string' &&
        original.trim() === sanitized.trim()
      ) {
        return undefined;
      }
      return `${headerName}:${original ?? '??'}→${sanitized}`;
    }

    if (original) {
      delete req.headers[headerName];
      return `${headerName}:${original}→(removed)`;
    }

    return undefined;
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const changes: string[] = [];
    for (const headerName of TENANT_HEADER_NAMES) {
      const result = this.sanitizeAndAssign(req, headerName);
      if (result) {
        changes.push(result);
      }
    }

    if (changes.length > 0) {
      this.logger.debug(
        `[tenant-sanitize] ${req.method} ${req.originalUrl} ${changes.join(' ')}`,
      );
    }

    next();
  }
}
