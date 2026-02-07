import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class PublicRateLimitMiddleware {
  private readonly windowMs = 60_000;
  private readonly maxRequests = 120;
  private readonly buckets = new Map<string, Bucket>();

  use(req: Request, res: Response, next: NextFunction) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.toString() ||
      req.ip ||
      'unknown';
    const key = `${ip}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > this.maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        message: 'Demasiadas solicitudes, intenta nuevamente en unos segundos.',
      });
    }

    return next();
  }
}
