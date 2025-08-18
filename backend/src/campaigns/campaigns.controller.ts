import { Controller, Post, Body, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
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