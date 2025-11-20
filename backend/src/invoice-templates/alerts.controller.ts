import { Controller, Get } from '@nestjs/common';
import { InvoiceTemplatesAlertsService } from './alerts.service';

@Controller('invoice-templates')
export class InvoiceTemplatesAlertsController {
  constructor(private readonly alertsService: InvoiceTemplatesAlertsService) {}

  @Get('alerts')
  getAlerts() {
    return this.alertsService.getAlerts();
  }
}
