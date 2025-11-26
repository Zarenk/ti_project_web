import { Body, Controller, Get, Post } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Post('trial')
  startTrial(@Body() dto: StartTrialDto) {
    return this.subscriptionsService.startTrial(dto);
  }

  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.subscriptionsService.createCheckoutSession(dto);
  }
}
