import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SaleFulfilledDto } from './dto/sale-fulfilled.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('accounting/hooks/sale-fulfilled')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SaleFulfilledController {
  @Post()
  @HttpCode(202)
  handle(@Body() data: SaleFulfilledDto) {
    return { status: 'accepted' };
  }
}
