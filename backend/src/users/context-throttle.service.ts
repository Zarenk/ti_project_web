import { Injectable } from '@nestjs/common';

type ThrottleHit = {
  userId: number;
  timestamp: number;
};

@Injectable()
export class ContextThrottleService {
  private readonly WINDOW_MS = 60 * 60 * 1000;
  private readonly hits = new Map<number, number[]>();
  private totalHits = 0;

  recordHit(userId: number) {
    const now = Date.now();
    const existing = this.hits.get(userId) ?? [];
    existing.push(now);
    this.hits.set(userId, existing);
    this.totalHits += 1;
  }

  getSummary() {
    const cutoff = Date.now() - this.WINDOW_MS;
    const perUser: Array<{ userId: number; hits: number }> = [];

    for (const [userId, timestamps] of this.hits.entries()) {
      const recent = timestamps.filter((ts) => ts >= cutoff);
      if (recent.length === 0) {
        this.hits.delete(userId);
        continue;
      }
      this.hits.set(userId, recent);
      perUser.push({ userId, hits: recent.length });
    }

    perUser.sort((a, b) => b.hits - a.hits);

    const lastHourHits = perUser.reduce((sum, item) => sum + item.hits, 0);

    return {
      totalHits: this.totalHits,
      lastHourHits,
      topUsers: perUser.slice(0, 5),
    };
  }
}
