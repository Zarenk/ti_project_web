import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SimpleCookieMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const cookies: Record<string, string> = {};
    const header = req.headers.cookie;
    if (header) {
      header.split(';').forEach((cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) {
          cookies[name] = decodeURIComponent(rest.join('='));
        }
      });
    }
    (req as any).cookies = Object.assign({}, (req as any).cookies, cookies);
    next();
  }
}