import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPrometheusService } from './subscription-prometheus.service';

@Injectable()
export class DunningCronService {
  private readonly logger = new Logger(DunningCronService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly metrics: SubscriptionPrometheusService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runDunningJob() {
    this.logger.debug('Ejecutando job de dunning de suscripciones');
    try {
      await this.subscriptionsService.applyScheduledPlanChanges();
      await this.subscriptionsService.processDueDunningInvoices();
      this.metrics.recordDunningJobRun('success');
    } catch (error) {
      this.logger.error('Fallo la ejecucion del job de dunning', error);
      this.metrics.recordDunningJobRun('error');
      throw error;
    }
  }
}
