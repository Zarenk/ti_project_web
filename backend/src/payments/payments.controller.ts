import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { PaymentOrchestratorService } from './payments.service';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post()
  async create(@Body() dto: CreatePaymentOrderDto) {
    const ctx = this.tenantContext.getContext();
    if (!ctx.organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    dto.organizationId = ctx.organizationId;
    dto.companyId = ctx.companyId ?? undefined;
    dto.createdBy = ctx.userId ?? undefined;
    return this.orchestrator.createPaymentOrder(dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ) {
    const ctx = this.tenantContext.getContext();
    return this.orchestrator.findAll({
      organizationId: ctx.organizationId ?? undefined,
      companyId: ctx.companyId ?? undefined,
      status,
      provider,
      from,
      to,
      page: pageRaw ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    });
  }

  // IMPORTANT: this must be BEFORE :code route
  @Get('commissions')
  async commissions(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const ctx = this.tenantContext.getContext();
    return this.orchestrator.getCommissionReport(
      ctx.organizationId!,
      ctx.companyId,
      from,
      to,
    );
  }

  @Get(':code')
  async findByCode(@Param('code') code: string) {
    const ctx = this.tenantContext.getContext();
    if (!ctx.organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    return this.orchestrator.findByCode(code, ctx.organizationId);
  }

  @Patch(':code/confirm')
  async confirmManual(@Param('code') code: string) {
    const ctx = this.tenantContext.getContext();
    if (!ctx.organizationId) {
      throw new BadRequestException('organizationId is required');
    }
    await this.orchestrator.confirmManualPayment(code, ctx.organizationId);
    return { confirmed: true };
  }
}
