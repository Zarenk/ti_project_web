import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { OrganizationExportService } from './organization-export.service'
import { SubscriptionsService } from './subscriptions.service'

@Injectable()
export class OrganizationExportCronService {
  private readonly logger = new Logger(OrganizationExportCronService.name)

  constructor(
    private readonly exportService: OrganizationExportService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async runExports() {
    this.logger.debug('Checking pending organization exports...')
    await this.exportService.processPendingExports()
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async cleanupArchived() {
    this.logger.debug('Running cleanup for cancelled organizations...')
    await this.exportService.cleanupCancelledOrganizations()
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async ensureCancellationPrep() {
    this.logger.debug('Checking scheduled cancellations for pre-cleanup...')
    await this.subscriptionsService.preparePendingCancellations()
  }
}
