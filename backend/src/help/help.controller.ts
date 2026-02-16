import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { HelpService } from './help.service';

interface AskDto {
  question: string;
  section: string;
  route: string;
}

interface FeedbackDto {
  messageId: number;
  feedback: 'POSITIVE' | 'NEGATIVE';
}

interface ReviewCandidateDto {
  status: 'APPROVED' | 'REJECTED';
  answer?: string;
}

interface RecordSessionDto {
  query: string;
  normalizedQuery: string;
  matchFound: boolean;
  matchScore?: number;
  matchedEntryId?: string;
  userFeedback?: 'POSITIVE' | 'NEGATIVE';
  section: string;
}

interface ApproveAliasDto {
  entryId: string;
  alias: string;
}

interface ApproveEntryDto {
  question: string;
  answer: string;
  section: string;
  relatedEntries?: string[];
}

@Controller('help')
export class HelpController {
  private readonly rateLimits = new Map<number, number[]>();

  constructor(private readonly helpService: HelpService) {}

  @Get('conversation')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    // MEDIUM-TERM OPTIMIZATION #2: Pagination support
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 200) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    return this.helpService.getConversation(userId, parsedLimit, parsedOffset);
  }

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async ask(@Body() body: AskDto, @Req() req: any) {
    const { question, section, route } = body;

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      throw new BadRequestException('La pregunta es requerida (minimo 2 caracteres).');
    }

    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    this.enforceRateLimit(userId);

    return this.helpService.ask({
      question: question.trim(),
      section: section || 'general',
      route: route || '/dashboard',
      userId,
      userRole: req.user?.role,
    });
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async feedback(@Body() body: FeedbackDto, @Req() req: any) {
    const { messageId, feedback } = body;

    if (!messageId || !feedback || !['POSITIVE', 'NEGATIVE'].includes(feedback)) {
      throw new BadRequestException('messageId y feedback (POSITIVE/NEGATIVE) son requeridos.');
    }

    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    await this.helpService.recordFeedback(messageId, feedback, userId);
    return { ok: true };
  }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(@Req() req: any) {
    this.ensureSuperAdmin(req);
    return this.helpService.getAnalytics();
  }

  @Patch('admin/candidates/:id')
  @UseGuards(JwtAuthGuard)
  async reviewCandidate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReviewCandidateDto,
    @Req() req: any,
  ) {
    this.ensureSuperAdmin(req);

    const { status, answer } = body;
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      throw new BadRequestException('status (APPROVED/REJECTED) es requerido.');
    }

    const adminId = req.user?.userId ?? req.user?.sub;
    await this.helpService.reviewCandidate(id, status, adminId, answer);
    return { ok: true };
  }

  private ensureSuperAdmin(req: any) {
    const role = (req.user?.role ?? '').toString().toUpperCase();
    if (role !== 'SUPER_ADMIN_GLOBAL') {
      throw new ForbiddenException('Solo SUPER_ADMIN_GLOBAL puede acceder a esta funcionalidad.');
    }
  }

  // ========== ADAPTIVE LEARNING ENDPOINTS ==========

  @Post('learning/sessions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async recordLearningSession(@Body() body: RecordSessionDto, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    await this.helpService.recordLearningSession({
      ...body,
      userId,
      timestamp: Date.now(),
    });

    return { ok: true };
  }

  @Get('learning/sessions')
  @UseGuards(JwtAuthGuard)
  async getLearningSessions(@Req() req: any) {
    this.ensureSuperAdmin(req);
    return this.helpService.getLearningSessions(500);
  }

  @Get('learning/insights')
  @UseGuards(JwtAuthGuard)
  async getLearningInsights(@Req() req: any) {
    this.ensureSuperAdmin(req);
    return this.helpService.generateLearningInsights();
  }

  @Get('learning/suggestions')
  @UseGuards(JwtAuthGuard)
  async getLearningSuggestions(@Req() req: any) {
    this.ensureSuperAdmin(req);
    return this.helpService.getLearningSuggestions();
  }

  @Post('learning/alias/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async approveAlias(@Body() body: ApproveAliasDto, @Req() req: any) {
    this.ensureSuperAdmin(req);

    const { entryId, alias } = body;
    if (!entryId || !alias) {
      throw new BadRequestException('entryId y alias son requeridos.');
    }

    const adminId = req.user?.userId ?? req.user?.sub;
    await this.helpService.approveAlias(entryId, alias, adminId);
    return { ok: true };
  }

  @Post('learning/alias/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async rejectAlias(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.ensureSuperAdmin(req);

    const adminId = req.user?.userId ?? req.user?.sub;
    await this.helpService.rejectAlias(id, adminId);
    return { ok: true };
  }

  @Post('learning/entry/approve')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async approveEntry(@Body() body: ApproveEntryDto, @Req() req: any) {
    this.ensureSuperAdmin(req);

    const { question, answer, section, relatedEntries } = body;
    if (!question || !answer || !section) {
      throw new BadRequestException('question, answer y section son requeridos.');
    }

    const adminId = req.user?.userId ?? req.user?.sub;
    const newEntry = await this.helpService.approveNewEntry(
      question,
      answer,
      section,
      adminId,
      relatedEntries,
    );

    return { ok: true, entry: newEntry };
  }

  @Post('learning/entry/:id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async rejectEntry(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    this.ensureSuperAdmin(req);

    const adminId = req.user?.userId ?? req.user?.sub;
    await this.helpService.rejectEntry(id, adminId);
    return { ok: true };
  }

  @Post('learning/analyze')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async analyzePatternsManual(@Req() req: any) {
    this.ensureSuperAdmin(req);

    await this.helpService.analyzePatterns();
    return { ok: true, message: 'Análisis completado' };
  }

  @Get('learning/export')
  @UseGuards(JwtAuthGuard)
  async exportLearningData(@Req() req: any) {
    this.ensureSuperAdmin(req);
    return this.helpService.exportLearningData();
  }

  @Post('learning/promoted-answer')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async promoteAnswer(
    @Body() body: { entryId: string; originalAnswer: string; feedback: 'POSITIVE' | 'NEGATIVE' },
    @Req() req: any,
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    const { entryId, originalAnswer, feedback } = body;
    if (!entryId || !originalAnswer || !feedback) {
      throw new BadRequestException('entryId, originalAnswer y feedback son requeridos.');
    }

    await this.helpService.promoteAnswer(entryId, originalAnswer, feedback, userId);
    return { ok: true };
  }

  @Get('learning/promoted-answers')
  @UseGuards(JwtAuthGuard)
  async getPromotedAnswers(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');

    return this.helpService.getPromotedAnswers();
  }

  // ========== END ADAPTIVE LEARNING ENDPOINTS ==========

  /**
   * MEDIUM-TERM OPTIMIZATION #3: Flexible rate limiting
   * Burst + Sustained model:
   * - Burst: 10 requests in 10 seconds (for quick back-and-forth)
   * - Sustained: 30 requests in 5 minutes (prevents abuse)
   */
  private enforceRateLimit(userId: number) {
    const now = Date.now();

    // Rate limit windows
    const BURST_WINDOW_MS = 10_000; // 10 seconds
    const SUSTAINED_WINDOW_MS = 300_000; // 5 minutes
    const MAX_BURST = 10; // 10 requests per 10 seconds
    const MAX_SUSTAINED = 30; // 30 requests per 5 minutes

    let timestamps = this.rateLimits.get(userId) ?? [];

    // Filter timestamps within the sustained window (5 minutes)
    timestamps = timestamps.filter((t) => now - t < SUSTAINED_WINDOW_MS);

    // Check sustained limit (30 requests per 5 minutes)
    if (timestamps.length >= MAX_SUSTAINED) {
      const oldestTimestamp = timestamps[0];
      const waitTimeMs = SUSTAINED_WINDOW_MS - (now - oldestTimestamp);
      const waitTimeSec = Math.ceil(waitTimeMs / 1000);

      throw new HttpException(
        `Has alcanzado el límite de consultas (${MAX_SUSTAINED} por 5 minutos). Intenta de nuevo en ${waitTimeSec} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check burst limit (10 requests per 10 seconds)
    const burstTimestamps = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    if (burstTimestamps.length >= MAX_BURST) {
      const oldestBurstTimestamp = burstTimestamps[0];
      const waitTimeMs = BURST_WINDOW_MS - (now - oldestBurstTimestamp);
      const waitTimeSec = Math.ceil(waitTimeMs / 1000);

      throw new HttpException(
        `Demasiadas consultas rápidas. Espera ${waitTimeSec} segundos antes de continuar.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current timestamp
    timestamps.push(now);
    this.rateLimits.set(userId, timestamps);

    // Cleanup: Remove users with no recent requests (memory optimization)
    if (this.rateLimits.size > 200) {
      for (const [key, ts] of this.rateLimits) {
        const filtered = ts.filter((t) => now - t < SUSTAINED_WINDOW_MS);
        if (filtered.length === 0) this.rateLimits.delete(key);
        else this.rateLimits.set(key, filtered);
      }
    }
  }
}
