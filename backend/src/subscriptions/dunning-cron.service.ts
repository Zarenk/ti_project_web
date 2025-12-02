import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class DunningCronService {
  private readonly logger = new Logger(DunningCronService.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runDunningJob() {
    this.logger.debug('Ejecutando job de dunning de suscripciones');
    await this.subscriptionsService.applyScheduledPlanChanges();
    await this.subscriptionsService.processDueDunningInvoices();
  }
}
