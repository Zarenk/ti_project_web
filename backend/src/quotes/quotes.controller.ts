import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
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
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { QuotesService } from './quotes.service';
import { Request } from 'express';

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

  @Post()
  async createDraft(
    @Body() body: any,
    @Req() req: Request,
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    const userId =
      (req.user as any)?.userId ??
      (req.user as any)?.id ??
      (req.user as any)?.sub ??
      null;
    return this.quotesService.createDraft(
      {
        organizationId,
        companyId,
        clientId: body?.clientId ?? null,
        clientNameSnapshot: body?.clientNameSnapshot ?? body?.clientName ?? null,
        contactSnapshot: body?.contactSnapshot ?? body?.contactName ?? null,
        currency: body?.currency ?? 'PEN',
        validity: body?.validity ?? '15 d?as',
        conditions: body?.conditions ?? null,
        taxRate: body?.taxRate ?? 0.18,
        subtotal: body?.subtotal ?? 0,
        taxAmount: body?.taxAmount ?? 0,
        marginAmount: body?.marginAmount ?? 0,
        total: body?.total ?? 0,
        items: Array.isArray(body?.items) ? body.items : [],
      },
      userId,
    );
  }

  @Put(':id')
  async updateDraft(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    const userId =
      (req.user as any)?.userId ??
      (req.user as any)?.id ??
      (req.user as any)?.sub ??
      null;
    return this.quotesService.updateDraft(Number(id), body, companyId, userId);
  }

  @Post(':id/issue')
  async issueQuote(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: Request,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    const userId =
      (req.user as any)?.userId ??
      (req.user as any)?.id ??
      (req.user as any)?.sub ??
      null;
    return this.quotesService.issueQuote(Number(id), companyId, {
      actorId: userId,
      stockValidationMode:
        body?.stockValidationMode === 'STORE'
          ? 'STORE'
          : body?.stockValidationMode === 'GLOBAL'
            ? 'GLOBAL'
            : 'NONE',
      storeId:
        typeof body?.storeId === 'number' && Number.isFinite(body.storeId)
          ? body.storeId
          : null,
    });
  }

  @Post(':id/cancel')
  async cancelQuote(
    @Param('id') id: string,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    return this.quotesService.cancelQuote(Number(id), companyId);
  }

  @Get()
  async findAll(
    @CurrentTenant('companyId') companyId: number | null,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    return this.quotesService.findAll(companyId, {
      status: status as any,
      q,
      from,
      to,
    });
  }

  @Get(':id/events')
  async findEvents(
    @Param('id') id: string,
    @CurrentTenant('companyId') companyId: number | null,
    @CurrentTenant('organizationId') organizationId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    const quoteId = Number(id);
    if (!Number.isInteger(quoteId) || quoteId < 1) {
      throw new BadRequestException('Id de cotización inválido.');
    }
    return this.quotesService.findEvents(quoteId, companyId, organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentTenant('companyId') companyId: number | null,
  ) {
    if (!companyId) {
      throw new BadRequestException('Empresa requerida.');
    }
    return this.quotesService.findOne(Number(id), companyId);
  }

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


