import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Global rate limiter for all authenticated API routes.
 * 200 requests per minute per IP — generous enough for normal usage
 * but blocks automated abuse, credential stuffing, scraping.
 *
 * The stricter per-route limiters (auth: 5/min, campaigns: 5/min)
 * still apply on top of this global one.
 */
@Injectable()
export class GlobalRateLimitMiddleware {
  private readonly windowMs = 60_000;
  private readonly maxRequests =
    process.env.NODE_ENV === 'test' ? 2000 : 200;
  private readonly buckets = new Map<string, Bucket>();

  // Periodic cleanup to prevent memory leak from stale IPs
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 5 * 60_000; // 5 minutes

  use(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();

    // Cleanup stale buckets periodically
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    const ip = this.getClientIp(req);
    const bucket = this.buckets.get(ip);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(ip, { count: 1, resetAt: now + this.windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > this.maxRequests) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
      return res.status(429).json({
        message: 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.',
      });
    }

    res.setHeader('X-RateLimit-Limit', String(this.maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(this.maxRequests - bucket.count),
    );
    return next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].toString();
    }
    return req.ip ?? '0.0.0.0';
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
