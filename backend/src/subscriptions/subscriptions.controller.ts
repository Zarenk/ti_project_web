import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { ChangePlanDto, ChangePlanSelfDto } from './dto/change-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { UpsertPaymentMethodDto } from './dto/upsert-payment-method.dto';
import { ManagePaymentMethodDto } from './dto/manage-payment-method.dto';
import { ManageInvoiceDto } from './dto/manage-invoice.dto';
import { RequestExportDto } from './dto/request-export.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Post('trial')
  startTrial(@Body() dto: StartTrialDto) {
    return this.subscriptionsService.startTrial(dto);
  }

  @Post('checkout')
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.subscriptionsService.createCheckoutSession(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-plan')
  changePlan(@Body() dto: ChangePlanDto) {
    return this.subscriptionsService.requestPlanChange(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/change-plan')
  changePlanForCurrentUser(
    @Body() dto: ChangePlanSelfDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.subscriptionsService.requestPlanChangeForUser(
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancelSubscription(@Body() dto: CancelSubscriptionDto) {
    return this.subscriptionsService.requestCancellation(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payment-methods')
  listPaymentMethods(@Query('organizationId') organizationId: string) {
    const orgId = Number(organizationId);
    return this.subscriptionsService.listPaymentMethods(orgId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payment-methods')
  upsertPaymentMethod(@Body() dto: UpsertPaymentMethodDto) {
    return this.subscriptionsService.upsertPaymentMethod(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('payment-methods/:id')
  removePaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManagePaymentMethodDto,
  ) {
    return this.subscriptionsService.removePaymentMethod(dto.organizationId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payment-methods/:id/default')
  setDefaultPaymentMethod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManagePaymentMethodDto,
  ) {
    return this.subscriptionsService.markDefaultPaymentMethod(
      dto.organizationId,
      id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices')
  listInvoices(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.subscriptionsService.listInvoices(organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invoices/:id/retry')
  retryInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManageInvoiceDto,
  ) {
    return this.subscriptionsService.retryInvoice(dto.organizationId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/:id/pdf')
  async downloadInvoicePdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Res() res: Response,
  ) {
    const pdf = await this.subscriptionsService.getInvoicePdf(
      organizationId,
      id,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=\"${pdf.filename}\"`,
    );
    return res.sendFile(pdf.path);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/summary')
  getMySummary(@Request() req: { user: { userId: number } }) {
    return this.subscriptionsService.getSummaryForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('exports')
  listExports(@Query('organizationId', ParseIntPipe) organizationId: number) {
    return this.subscriptionsService.listOrganizationExports(organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('exports')
  requestExport(
    @Body() dto: RequestExportDto,
    @Request() req: { user: { userId: number } },
  ) {
    return this.subscriptionsService.requestOrganizationExport(
      dto.organizationId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('exports/:id/download')
  async downloadExport(
    @Param('id', ParseIntPipe) id: number,
    @Query('organizationId', ParseIntPipe) organizationId: number,
    @Res() res: Response,
  ) {
    const file = await this.subscriptionsService.downloadOrganizationExport(
      organizationId,
      id,
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=\"${file.filename}\"`,
    );
    return res.sendFile(file.path);
  }
}
