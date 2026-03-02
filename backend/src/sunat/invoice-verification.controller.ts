import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SunatService } from './sunat.service';
import { SkipTenantContextGuard } from 'src/tenancy/skip-tenant-context.decorator';
import { SkipModulePermissionsGuard } from 'src/common/decorators/skip-module-permission.decorator';
import * as fs from 'fs';

@Controller('public/verify')
@SkipTenantContextGuard()
@SkipModulePermissionsGuard()
export class InvoiceVerificationController {
  constructor(private readonly sunatService: SunatService) {}

  @Get()
  async searchInvoice(
    @Query('ruc') ruc?: string,
    @Query('serie') serie?: string,
    @Query('correlativo') correlativo?: string,
  ) {
    if (!ruc || !serie || !correlativo) {
      throw new NotFoundException(
        'Debe proporcionar ruc, serie y correlativo para buscar.',
      );
    }

    const result = await this.sunatService.getPublicInvoiceBySearch(
      ruc.trim(),
      serie.trim(),
      correlativo.trim(),
    );

    if (!result) {
      throw new NotFoundException('Comprobante no encontrado.');
    }

    return result;
  }

  @Get(':code')
  async getInvoiceByCode(@Param('code') code: string) {
    const result = await this.sunatService.getPublicInvoiceByCode(code);

    if (!result) {
      throw new NotFoundException('Comprobante no encontrado.');
    }

    return result;
  }

  @Get(':code/pdf')
  async downloadPdf(@Param('code') code: string, @Res() res: Response) {
    const filePath = await this.sunatService.getPublicPdfPath(code);

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException('PDF no disponible para este comprobante.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="comprobante-${code}.pdf"`,
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
