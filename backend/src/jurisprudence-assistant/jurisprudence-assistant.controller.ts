import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { JurisprudenceRagService } from './jurisprudence-rag.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { TenantRequiredGuard } from '../common/guards/tenant-required.guard';
import { Roles } from '../users/roles.decorator';
import { ModulePermission } from '../common/decorators/module-permission.decorator';
import { UserRole } from '@prisma/client';
import { QueryDto, UpdateQueryFeedbackDto } from './dto/query.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('jurisprudence-assistant')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@ModulePermission('legal')
export class JurisprudenceAssistantController {
  constructor(
    private readonly ragService: JurisprudenceRagService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /jurisprudence-assistant/query
   * Main RAG query endpoint
   */
  @Post('query')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async query(@Body() dto: QueryDto, @Req() req: any) {
    const { organizationId, companyId } = req.tenantContext;
    const userId = req.user?.userId;

    const result = await this.ragService.query(
      organizationId,
      companyId,
      userId,
      dto.query,
      dto.legalMatterId,
      {
        courts: dto.courts,
        minYear: dto.minYear,
        areas: dto.areas,
      },
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * GET /jurisprudence-assistant/queries
   * Get query history
   */
  @Get('queries')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async getQueries(
    @Req() req: any,
    @Query('legalMatterId', new ParseIntPipe({ optional: true })) legalMatterId?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const { organizationId, companyId } = req.tenantContext;
    const userId = req.user?.userId;

    const queries = await this.ragService.getQueryHistory(
      organizationId,
      companyId,
      userId,
      legalMatterId,
      limit,
    );

    return {
      success: true,
      queries,
      count: queries.length,
    };
  }

  /**
   * PATCH /jurisprudence-assistant/queries/:id/feedback
   * Update user feedback for a query
   */
  @Patch('queries/:id/feedback')
  @Roles(
    UserRole.ADMIN,
    UserRole.EMPLOYEE,
    UserRole.SUPER_ADMIN_GLOBAL,
    UserRole.SUPER_ADMIN_ORG,
  )
  async updateFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQueryFeedbackDto,
    @Req() req: any,
  ) {
    const { organizationId } = req.tenantContext;

    // Verify query belongs to organization
    const query = await this.prisma.jurisprudenceQuery.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!query) {
      return {
        success: false,
        error: 'Query not found',
      };
    }

    // Update feedback
    const updated = await this.prisma.jurisprudenceQuery.update({
      where: { id },
      data: {
        userFeedback: dto as any,
      },
    });

    return {
      success: true,
      query: updated,
    };
  }
}
