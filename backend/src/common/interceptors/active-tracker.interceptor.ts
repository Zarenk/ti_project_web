import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Global interceptor that updates `lastActiveAt` on every authenticated request.
 * Throttled: only writes to DB if last update was > 60 seconds ago (per user).
 */
@Injectable()
export class ActiveTrackerInterceptor implements NestInterceptor {
  private readonly THROTTLE_MS = 60_000; // 1 minute
  private readonly lastUpdate = new Map<number, number>();

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId: number | undefined = request?.user?.userId;

    if (!userId) return next.handle();

    const now = Date.now();
    const last = this.lastUpdate.get(userId) ?? 0;

    if (now - last > this.THROTTLE_MS) {
      this.lastUpdate.set(userId, now);
      // Fire-and-forget — don't block the request
      this.prisma.user
        .update({
          where: { id: userId },
          data: { lastActiveAt: new Date(now) },
        })
        .catch(() => {
          /* swallow — non-critical */
        });
    }

    return next.handle();
  }
}
