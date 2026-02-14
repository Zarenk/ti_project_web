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

@Controller('help')
export class HelpController {
  private readonly rateLimits = new Map<number, number[]>();

  constructor(private readonly helpService: HelpService) {}

  @Get('conversation')
  @UseGuards(JwtAuthGuard)
  async getConversation(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new BadRequestException('Usuario no identificado.');
    return this.helpService.getConversation(userId);
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

  private enforceRateLimit(userId: number) {
    const now = Date.now();
    const windowMs = 60_000;
    const maxRequests = 5;

    let timestamps = this.rateLimits.get(userId) ?? [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      throw new HttpException(
        'Has alcanzado el limite de consultas al asistente. Intenta de nuevo en un minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.rateLimits.set(userId, timestamps);

    if (this.rateLimits.size > 200) {
      for (const [key, ts] of this.rateLimits) {
        const filtered = ts.filter((t) => now - t < windowMs);
        if (filtered.length === 0) this.rateLimits.delete(key);
        else this.rateLimits.set(key, filtered);
      }
    }
  }
}
