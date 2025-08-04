import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { exportCatalogPdf } from './pdfExport';
import { exportCatalogExcel } from './excelExport';

@Controller('catalog/export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogExportController {
  @Get()
  @Roles('ADMIN')
  async export(
    @Query('format') format: string,
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    const { format: _format, ...filters } = query;
    if (format === 'pdf') {
      const buffer = await exportCatalogPdf(filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="catalog.pdf"');
      res.send(buffer);
    } else if (format === 'excel') {
      const buffer = await exportCatalogExcel(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="catalog.xlsx"');
      res.send(buffer);
    } else {
      res.status(400).send('Formato no soportado');
    }
  }
}