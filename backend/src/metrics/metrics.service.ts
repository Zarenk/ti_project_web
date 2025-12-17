import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
  register as globalRegister,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private registry = new Registry();
  public providerRequests: Counter<string>;
  public requestDuration: Histogram<string>;
  public campaignCost: Gauge<string>;
  public moderationHits: Counter<string>;
  public retryCounter: Counter<string>;
  public dlqDepth: Gauge<string>;

  constructor() {
    this.registry = globalRegister;
    collectDefaultMetrics({ register: this.registry });

    this.providerRequests = new Counter({
      name: 'provider_requests_total',
      help: 'Total provider requests by status',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.requestDuration = new Histogram({
      name: 'request_latency_ms',
      help: 'Request latency in milliseconds',
      buckets: [50, 100, 300, 500, 1000, 5000],
      registers: [this.registry],
    });

    this.campaignCost = new Gauge({
      name: 'campaign_cost_total',
      help: 'Cost per campaign',
      labelNames: ['campaign'],
      registers: [this.registry],
    });

    this.moderationHits = new Counter({
      name: 'moderation_hits_total',
      help: 'Content moderation hits per provider',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.retryCounter = new Counter({
      name: 'retry_total',
      help: 'Retry attempts per provider',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.dlqDepth = new Gauge({
      name: 'dlq_depth',
      help: 'Depth of the dead letter queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  recordProviderResult(provider: string, status: 'success' | 'error') {
    this.providerRequests.inc({ provider, status });
  }

  recordCampaignCost(campaign: string, cost: number) {
    this.campaignCost.labels(campaign).set(cost);
  }

  recordModerationHit(provider: string) {
    this.moderationHits.inc({ provider });
  }

  recordRetry(provider: string) {
    this.retryCounter.inc({ provider });
  }

  recordDlqDepth(queue: string, depth: number) {
    this.dlqDepth.labels(queue).set(depth);
  }
}
