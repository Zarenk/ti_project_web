import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { AutomationService } from './automation/automation.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { SendMessageDto, SendTemplateDto, BulkMessageDto } from './dto/send-message.dto';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  CreateTemplateDto,
} from './dto/automation.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@ModulePermission('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly automationService: AutomationService,
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  @Post('connect')
  async connect(
    @Request() req: any,
    @Query('fresh') fresh?: string,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    // fresh=true only when user explicitly wants to re-pair (new QR)
    // Default: try reconnecting with existing auth (no QR needed if previously paired)
    const freshConnect = fresh === 'true';
    const result = await this.whatsappService.initialize(organizationId, companyId, freshConnect);

    return {
      success: true,
      message: result.qrCode
        ? 'Scan QR code to connect'
        : 'Reconnecting with saved session...',
      qrCode: result.qrCode,
    };
  }

  @Post('disconnect')
  async disconnect(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    await this.whatsappService.disconnect(organizationId, companyId);

    return {
      success: true,
      message: 'WhatsApp disconnected (session preserved)',
    };
  }

  @Post('logout')
  async logout(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    await this.whatsappService.logout(organizationId, companyId);

    return {
      success: true,
      message: 'WhatsApp unlinked. You will need to scan QR again.',
    };
  }

  @Get('status')
  async getStatus(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    const status = await this.whatsappService.getConnectionStatus(organizationId, companyId);
    const session = await this.whatsappService.getSession(organizationId, companyId);

    return {
      success: true,
      ...status,
      session: session
        ? {
            id: session.id,
            status: session.status,
            phoneNumber: session.phoneNumber,
            lastConnected: session.lastConnected,
          }
        : null,
    };
  }

  @Get('qr')
  async getQRCode(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { organizationId, companyId },
    });

    return {
      success: true,
      qrCode: session?.qrCode || null,
      status: session?.status || 'DISCONNECTED',
    };
  }

  // ============================================================================
  // MESSAGING
  // ============================================================================

  @Post('send')
  async sendMessage(@Request() req: any, @Body() dto: SendMessageDto) {
    const { organizationId, companyId } = req.tenantContext;
    const result = await this.whatsappService.sendMessage(organizationId, companyId, dto);

    return {
      success: true,
      ...result,
    };
  }

  @Post('send-template')
  async sendTemplate(@Request() req: any, @Body() dto: SendTemplateDto) {
    const { organizationId, companyId } = req.tenantContext;
    const result = await this.whatsappService.sendTemplateMessage(
      organizationId,
      companyId,
      dto,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Post('send-bulk')
  async sendBulk(@Request() req: any, @Body() dto: BulkMessageDto) {
    const { organizationId, companyId } = req.tenantContext;

    // Deduplicate recipients
    const uniqueRecipients = [...new Set(dto.recipients)];

    const results: Array<{
      recipient: string;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];

    for (const recipient of uniqueRecipients) {
      try {
        // Rate limiting is enforced inside sendMessage() — each call
        // will wait as needed to respect per-contact and global limits.
        const result = await this.whatsappService.sendMessage(organizationId, companyId, {
          to: recipient,
          content: dto.content,
          messageType: dto.messageType,
        });
        results.push({ recipient, success: true, result });
      } catch (error) {
        const errMsg = (error as Error).message;
        results.push({ recipient, success: false, error: errMsg });

        // If circuit breaker tripped, stop the batch — don't keep hammering
        if (errMsg.includes('pausado temporalmente')) {
          break;
        }
      }
    }

    return {
      success: true,
      results,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      rateLimitStats: this.whatsappService.getRateLimitStats(),
    };
  }

  @Post('invoice-send-counts')
  async getInvoiceSendCounts(
    @Request() req: any,
    @Body() body: { saleIds: number[] },
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const saleIds = body.saleIds ?? [];
    if (saleIds.length === 0) return { success: true, counts: {} };

    const rows = await this.prisma.whatsAppMessage.groupBy({
      by: ['salesId'],
      where: {
        organizationId,
        companyId,
        salesId: { in: saleIds },
        isFromMe: true,
      },
      _count: { id: true },
    });

    const counts: Record<number, number> = {};
    for (const row of rows) {
      if (row.salesId != null) {
        counts[row.salesId] = row._count.id;
      }
    }

    return { success: true, counts };
  }

  @Post('send-invoice/:saleId')
  async sendInvoice(
    @Request() req: any,
    @Param('saleId', ParseIntPipe) saleId: number,
    @Body() body: { phone?: string },
  ) {
    const { organizationId, companyId } = req.tenantContext;
    return this.automationService.sendInvoiceManual(saleId, organizationId, companyId, body?.phone);
  }

  @Get('messages')
  async getMessages(
    @Request() req: any,
    @Query('clientId', new ParseIntPipe({ optional: true })) clientId?: number,
    @Query('salesId', new ParseIntPipe({ optional: true })) salesId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const messages = await this.whatsappService.getMessages(organizationId, companyId, {
      clientId,
      salesId,
      limit,
    });

    return {
      success: true,
      messages,
      count: messages.length,
    };
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  @Post('templates')
  async createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    const { organizationId, companyId } = req.tenantContext;

    const template = await this.prisma.whatsAppTemplate.create({
      data: {
        organizationId,
        companyId,
        ...dto,
      },
    });

    return {
      success: true,
      template,
    };
  }

  @Get('templates')
  async getTemplates(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const templates = await this.prisma.whatsAppTemplate.findMany({
      where: { organizationId, companyId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      templates,
      count: templates.length,
    };
  }

  @Get('templates/:id')
  async getTemplate(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: { id },
    });

    return {
      success: true,
      template,
    };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.whatsAppTemplate.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Template deleted',
    };
  }

  // ============================================================================
  // AUTOMATIONS
  // ============================================================================

  @Post('automations')
  async createAutomation(@Request() req: any, @Body() dto: CreateAutomationDto) {
    const { organizationId, companyId } = req.tenantContext;

    const automation = await this.automationService.createAutomation(
      organizationId,
      companyId,
      dto,
    );

    return {
      success: true,
      automation,
    };
  }

  @Get('automations')
  async getAutomations(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const automations = await this.automationService.getAutomations(organizationId, companyId);

    return {
      success: true,
      automations,
      count: automations.length,
    };
  }

  @Get('automations/:id')
  async getAutomation(@Param('id', ParseIntPipe) id: number) {
    const automation = await this.prisma.whatsAppAutomation.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    return {
      success: true,
      automation,
    };
  }

  @Post('automations/:id')
  async updateAutomation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAutomationDto,
  ) {
    const automation = await this.automationService.updateAutomation(id, dto);

    return {
      success: true,
      automation,
    };
  }

  @Delete('automations/:id')
  async deleteAutomation(@Param('id', ParseIntPipe) id: number) {
    await this.automationService.deleteAutomation(id);

    return {
      success: true,
      message: 'Automation deleted',
    };
  }

  @Get('automations/:id/logs')
  async getAutomationLogs(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const logs = await this.automationService.getAutomationLogs(id, limit);

    return {
      success: true,
      logs,
      count: logs.length,
    };
  }

  // ============================================================================
  // STATS
  // ============================================================================

  @Get('stats')
  async getStats(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    const [totalMessages, sentMessages, receivedMessages, failedMessages, activeAutomations] =
      await Promise.all([
        this.prisma.whatsAppMessage.count({
          where: { organizationId, companyId },
        }),
        this.prisma.whatsAppMessage.count({
          where: { organizationId, companyId, isFromMe: true, status: 'SENT' },
        }),
        this.prisma.whatsAppMessage.count({
          where: { organizationId, companyId, isFromMe: false },
        }),
        this.prisma.whatsAppMessage.count({
          where: { organizationId, companyId, status: 'FAILED' },
        }),
        this.prisma.whatsAppAutomation.count({
          where: { organizationId, companyId, isActive: true },
        }),
      ]);

    return {
      success: true,
      stats: {
        totalMessages,
        sentMessages,
        receivedMessages,
        failedMessages,
        activeAutomations,
        rateLimit: this.whatsappService.getRateLimitStats(),
      },
    };
  }
}
