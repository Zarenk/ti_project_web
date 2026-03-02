import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../users/jwt-auth.guard';
import { RolesGuard } from '../../users/roles.guard';
import { TenantRequiredGuard } from '../../common/guards/tenant-required.guard';
import { Roles } from '../../users/roles.decorator';
import { ModulePermission } from '../../common/decorators/module-permission.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateAutoReplyConfigDto,
  CreateAutoReplyRuleDto,
  UpdateAutoReplyRuleDto,
} from './dto/auto-reply.dto';

@Controller('whatsapp/auto-reply')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles('ADMIN', 'EMPLOYEE', 'SUPER_ADMIN_GLOBAL', 'SUPER_ADMIN_ORG')
@ModulePermission('whatsapp')
export class AutoReplyController {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // CONFIG
  // ============================================================================

  @Get('config')
  async getConfig(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    let config = await this.prisma.whatsAppAutoReplyConfig.findUnique({
      where: {
        organizationId_companyId: { organizationId, companyId },
      },
    });

    // Auto-create default config if none exists
    if (!config) {
      config = await this.prisma.whatsAppAutoReplyConfig.create({
        data: { organizationId, companyId },
      });
    }

    return { success: true, config };
  }

  @Put('config')
  async updateConfig(
    @Request() req: any,
    @Body() dto: UpdateAutoReplyConfigDto,
  ) {
    const { organizationId, companyId } = req.tenantContext;

    const config = await this.prisma.whatsAppAutoReplyConfig.upsert({
      where: {
        organizationId_companyId: { organizationId, companyId },
      },
      create: {
        organizationId,
        companyId,
        ...dto,
      },
      update: dto,
    });

    return { success: true, config };
  }

  // ============================================================================
  // RULES
  // ============================================================================

  @Get('rules')
  async getRules(@Request() req: any) {
    const { organizationId, companyId } = req.tenantContext;

    // Ensure config exists
    const config = await this.prisma.whatsAppAutoReplyConfig.findUnique({
      where: {
        organizationId_companyId: { organizationId, companyId },
      },
    });

    if (!config) {
      return { success: true, rules: [], count: 0 };
    }

    const rules = await this.prisma.whatsAppAutoReplyRule.findMany({
      where: { configId: config.id },
      orderBy: { priority: 'desc' },
    });

    return { success: true, rules, count: rules.length };
  }

  @Post('rules')
  async createRule(@Request() req: any, @Body() dto: CreateAutoReplyRuleDto) {
    const { organizationId, companyId } = req.tenantContext;

    // Ensure config exists (upsert)
    let config = await this.prisma.whatsAppAutoReplyConfig.findUnique({
      where: {
        organizationId_companyId: { organizationId, companyId },
      },
    });

    if (!config) {
      config = await this.prisma.whatsAppAutoReplyConfig.create({
        data: { organizationId, companyId },
      });
    }

    const rule = await this.prisma.whatsAppAutoReplyRule.create({
      data: {
        configId: config.id,
        keywords: dto.keywords,
        answer: dto.answer,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return { success: true, rule };
  }

  @Put('rules/:id')
  async updateRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAutoReplyRuleDto,
  ) {
    const rule = await this.prisma.whatsAppAutoReplyRule.update({
      where: { id },
      data: {
        ...(dto.keywords !== undefined && { keywords: dto.keywords }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return { success: true, rule };
  }

  @Delete('rules/:id')
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.whatsAppAutoReplyRule.delete({
      where: { id },
    });

    return { success: true, message: 'Rule deleted' };
  }

  // ============================================================================
  // LOGS
  // ============================================================================

  @Get('logs')
  async getLogs(
    @Request() req: any,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const take = Math.min(limit || 50, 200);
    const skip = offset || 0;

    const [logs, total] = await Promise.all([
      this.prisma.whatsAppAutoReplyLog.findMany({
        where: { organizationId, companyId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.whatsAppAutoReplyLog.count({
        where: { organizationId, companyId },
      }),
    ]);

    return {
      success: true,
      logs,
      total,
      count: logs.length,
    };
  }
}
