import {
  Controller,
  Get,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { GuideService } from './guide.service';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';

@Controller('public/verify-guide')
@SkipTenantContextGuard()
@SkipModulePermissionsGuard()
export class GuidePublicController {
  constructor(private readonly guideService: GuideService) {}

  @Get()
  async searchGuide(
    @Query('ruc') ruc?: string,
    @Query('serie') serie?: string,
    @Query('correlativo') correlativo?: string,
  ) {
    if (!ruc || !serie || !correlativo) {
      throw new NotFoundException(
        'Debe proporcionar ruc, serie y correlativo para buscar.',
      );
    }

    const result = await this.guideService.findPublicGuide(
      ruc.trim(),
      serie.trim(),
      correlativo.trim(),
    );

    if (!result) {
      throw new NotFoundException('Guia de remision no encontrada.');
    }

    return result;
  }
}
