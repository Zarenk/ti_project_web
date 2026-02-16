import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MLService } from './ml.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('ml')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class MLController {
  constructor(private readonly mlService: MLService) {}

  @Post('predict')
  async predict(@Body('text') text: string) {
    if (!text) {
      throw new Error('El texto de entrada es obligatorio.');
    }
    return this.mlService.predict(text);
  }
}
