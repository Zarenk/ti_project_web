import { Controller, Get, Param } from '@nestjs/common';
import { OrderTrackingService } from './ordertracking.service';

@Controller('orders')
export class OrderTrackingController {
  constructor(private readonly orderTrackingService: OrderTrackingService) {}

  @Get(':code/tracking')
  getTracking(@Param('code') code: string) {
    return this.orderTrackingService.findByOrderCode(code.trim());
  }
}