import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { RolesGuard } from 'src/users/roles.guard';
import { Roles } from 'src/users/roles.decorator';
import { ModulePermission } from 'src/common/decorators/module-permission.decorator';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { QuotesService } from './quotes.service';

const SALES_ALLOWED_ROLES = [
  'ADMIN',
  'EMPLOYEE',
  'SUPER_ADMIN_GLOBAL',
  'SUPER_ADMIN_ORG',
] as const;

@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(...SALES_ALLOWED_ROLES)
@ModulePermission('sales')
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post('whatsapp')
  @UseInterceptors(FileInterceptor('file'))
  async sendQuoteWhatsApp(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { phone?: string; filename?: string },
  ) {
    const phone = typeof body?.phone === 'string' ? body.phone : '';
    if (!phone) {
      throw new BadRequestException('Teléfono requerido.');
    }
    if (!file) {
      throw new BadRequestException('Archivo requerido.');
    }
    if (!file.mimetype?.includes('pdf')) {
      throw new BadRequestException('El archivo debe ser PDF.');
    }
    const filename =
      typeof body?.filename === 'string' && body.filename.length > 0
        ? body.filename
        : file.originalname || 'cotizacion.pdf';
    await this.quotesService.sendQuoteWhatsApp({
      phone,
      filename,
      file,
    });
    return { ok: true };
  }
}


