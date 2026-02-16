import { Controller, Get, UseGuards } from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('keywords')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get()
  findAll() {
    return this.keywordsService.findAll();
  }
}
