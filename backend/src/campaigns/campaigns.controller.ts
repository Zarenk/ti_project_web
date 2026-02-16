import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() dto: any) {
    return this.campaignsService.create(dto);
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body() body: { publishAt: string }) {
    return this.campaignsService.schedule(+id, body.publishAt);
  }
}
