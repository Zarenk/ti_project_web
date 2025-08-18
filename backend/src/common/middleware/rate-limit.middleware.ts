import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface Entry { count: number; timestamp: number }

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private hits = new Map<string, Entry>();
  private readonly limit = 5;
  private readonly windowMs = 60_000; // 1 minute

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip + req.path;
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