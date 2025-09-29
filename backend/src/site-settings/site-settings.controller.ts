import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';

import { plainToInstance } from 'class-transformer';
import { CreateSiteSettingDto } from './dto/create-site-setting.dto';
import { UpdateSiteSettingsDto } from './dto/update-site-setting.dto';

@Controller('site-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  async getSettings(): Promise<CreateSiteSettingDto> {
    const settings = await this.siteSettingsService.getSettings();
    return plainToInstance(CreateSiteSettingDto, {
      settings: settings.data,
      updatedAt: settings.updatedAt.toISOString(),
      createdAt: settings.createdAt.toISOString(),
    });
  }

  @Put()
  async updateSettings(@Body() dto: UpdateSiteSettingsDto): Promise<CreateSiteSettingDto> {
    const settings = await this.siteSettingsService.updateSettings(dto);
    return plainToInstance(CreateSiteSettingDto, {
      settings: settings.data,
      updatedAt: settings.updatedAt.toISOString(),
      createdAt: settings.createdAt.toISOString(),
    });
  }
}