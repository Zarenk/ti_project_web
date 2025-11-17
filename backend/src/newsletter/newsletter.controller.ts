import { Body, Controller, Post } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { IsEmail } from 'class-validator';

class NewsletterDto {
  @IsEmail()
  email!: string;
}

@Controller()
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('newsletter')
  async subscribe(@Body() dto: NewsletterDto) {
    await this.newsletterService.create(dto.email);
    return { ok: true };
  }
}
