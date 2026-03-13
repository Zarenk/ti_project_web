import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';

@Controller('public/complaints')
@SkipTenantContextGuard()
@SkipModulePermissionsGuard()
export class ComplaintsPublicController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get('company/:slug')
  async getCompanyInfo(@Param('slug') slug: string) {
    return this.complaintsService.getCompanyForComplaint(slug);
  }

  @Post('submit')
  async submitComplaint(@Body() dto: CreateComplaintDto) {
    return this.complaintsService.submitPublic(dto);
  }

  @Get('status/:trackingCode')
  async lookupStatus(@Param('trackingCode') trackingCode: string) {
    return this.complaintsService.lookupByTrackingCode(trackingCode);
  }
}
