import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface Entry {
  count: number;
  timestamp: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private hits = new Map<string, Entry>();
  // In test/e2e mode, allow many more requests to avoid 429s during Cypress runs
  private readonly limit = process.env.NODE_ENV === 'test' ? 500 : 5;
  private readonly windowMs = 60_000; // 1 minute

  private getClientIp(req: Request): string {
    // Behind a reverse proxy (Railway, nginx) req.ip may be the proxy IP.
    // X-Forwarded-For contains the real client IP as the first entry.
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    return req.ip ?? '0.0.0.0';
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getClientIp(req) + req.path;
    const now = Date.now();
    const entry = this.hits.get(key);
    if (entry && now - entry.timestamp < this.windowMs) {
      if (entry.count >= this.limit) {
        return res.status(429).json({ message: 'Too many requests' });
      }
      entry.count++;
    } else {
      this.hits.set(key, { count: 1, timestamp: now });
    }
    next();
  }
}
