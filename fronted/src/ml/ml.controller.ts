import { Controller, Post, Body } from '@nestjs/common';
import { MLService } from './ml.service';

@Controller('ml')
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