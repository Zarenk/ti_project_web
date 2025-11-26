import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InvoiceTemplatesAlertsService } from './alerts.service';

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class InventoryAlertsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryAlertsScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly alertsService: InvoiceTemplatesAlertsService) {}

  onModuleInit() {
    if (process.env.INVENTORY_ALERT_SCHEDULER_DISABLED === 'true') {
      this.logger.log('Inventory alerts scheduler disabled by env flag');
      return;
    }
    const intervalMs = Number(
      process.env.INVENTORY_ALERT_SCHEDULER_INTERVAL_MS ?? DEFAULT_INTERVAL_MS,
    );
    this.logger.log(
      `Starting inventory alerts scheduler (interval=${intervalMs}ms)`,
    );
    this.timer = setInterval(() => {
      void this.runCycle();
    }, intervalMs);
    void this.runCycle();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async runCycle(): Promise<void> {
    try {
      await this.alertsService.runMonitoringCycle();
    } catch (error) {
      this.logger.error('Inventory alerts scheduler failed', error);
    }
  }
}
