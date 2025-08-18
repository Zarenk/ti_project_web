import { Body, Controller, Param, ParseIntPipe, Post, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { Roles } from 'src/users/roles.decorator';
import { AdsRbacGuard } from './ads-rbac.guard';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreateCreativeDto } from './dto/create-creative.dto';
import { PublishCampaignDto } from './dto/publish-campaign.dto';
import { ReviewCreativeDto } from './dto/review-creative.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UpdateCreativeDto } from './dto/update-creative.dto';
import { OrganizationScoped } from './organization.decorator';
import { AdsRole } from './roles.enum';

@ApiTags('ads')
@ApiBearerAuth()
@Controller('ads')
@UseGuards(JwtAuthGuard, AdsRbacGuard)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post('organizations/:organizationId/campaigns')
  @Roles(AdsRole.ADMIN, AdsRole.MARKETING)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Create campaign' })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  createCampaign(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: CreateCampaignDto,
    @Req() req: Request,
  ) {
    return this.adsService.createCampaign(req.user, { ...dto, organizationId });
  }

  @Post('dlq/:queue/requeue')
  async requeue(@Param('queue') queue: 'generate' | 'publish') {
    const requeued = await this.adsService.requeueDlq(queue);
    return { requeued };
  }

  @Patch('organizations/:organizationId/campaigns/:id')
  @Roles(AdsRole.ADMIN, AdsRole.MARKETING)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Update campaign' })
  @ApiBody({ type: UpdateCampaignDto })
  updateCampaign(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
    @Req() req: Request,
  ) {
    return this.adsService.updateCampaign(id, req.user, { ...dto, organizationId });
  }

  @Post('organizations/:organizationId/campaigns/:id/publish')
  @Roles(AdsRole.ADMIN, AdsRole.MARKETING)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Publish campaign' })
  @ApiBody({ type: PublishCampaignDto })
  publishCampaign(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishCampaignDto,
    @Req() req: Request,
  ) {
    return this.adsService.publishCampaign(id, req.user, { ...dto, organizationId });
  }

  @Post('organizations/:organizationId/campaigns/:campaignId/creatives')
  @Roles(AdsRole.ADMIN, AdsRole.MARKETING)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Create creative' })
  @ApiBody({ type: CreateCreativeDto })
  createCreative(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() dto: CreateCreativeDto,
    @Req() req: Request,
  ) {
    return this.adsService.createCreative(req.user, { ...dto, campaignId, organizationId });
  }

  @Patch('organizations/:organizationId/creatives/:id')
  @Roles(AdsRole.ADMIN, AdsRole.MARKETING)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Update creative' })
  @ApiBody({ type: UpdateCreativeDto })
  updateCreative(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCreativeDto,
    @Req() req: Request,
  ) {
    return this.adsService.updateCreative(id, req.user, { ...dto, organizationId });
  }

  @Post('organizations/:organizationId/creatives/:id/review')
  @Roles(AdsRole.REVIEWER)
  @OrganizationScoped()
  @ApiOperation({ summary: 'Review creative' })
  @ApiBody({ type: ReviewCreativeDto })
  reviewCreative(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewCreativeDto,
    @Req() req: Request,
  ) {
    return this.adsService.reviewCreative(id, req.user, { ...dto, organizationId });
  }
}