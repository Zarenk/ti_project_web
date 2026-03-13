import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HelpEmbeddingService } from './help-embedding.service';

export interface ArbiterStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastDuration: number | null;
  currentStep: string | null;
  completedSteps: string[];
  totalSteps: number;
  processedCount: number;
  autoApprovedCount: number;
  autoRejectedCount: number;
  degradedCount: number;
}

// Quality score weights
const W_SATISFACTION = 0.40;
const W_VOLUME = 0.25;
const W_RECENCY = 0.15;
const W_DEPTH = 0.15;
const W_LATENCY = 0.05;

// Thresholds
const AUTO_APPROVE_THRESHOLD = 0.80;
const AUTO_REJECT_THRESHOLD = 0.30;
const MIN_VOTES_FOR_APPROVE = 3;
const MIN_NEGATIVE_FOR_REJECT = 2;
const MIN_AGE_HOURS = 24;

// Monitoring
const MONITOR_DAYS = 14;
const DEGRADATION_RATIO = 0.60;
const MIN_INTERACTIONS_FOR_DEGRADATION = 5;

// Daily cron interval: 24 hours
const CRON_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class HelpArbiterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HelpArbiterService.name);

  // Progress tracking (in-memory)
  private isRunning = false;
  private aborted = false;
  private lastRun: Date | null = null;
  private lastDuration: number | null = null;
  private currentStep: string | null = null;
  private completedSteps: string[] = [];
  private readonly totalSteps = 4;
  private processedCount = 0;
  private autoApprovedCount = 0;
  private autoRejectedCount = 0;
  private degradedCount = 0;

  private cronTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: HelpEmbeddingService,
  ) {}

  onModuleInit() {
    // Schedule daily run at 3:00 AM Lima (UTC-5 = 08:00 UTC)
    this.scheduleDailyCron();
  }

  onModuleDestroy() {
    if (this.cronTimer) {
      clearInterval(this.cronTimer);
      this.cronTimer = null;
    }
  }

  private scheduleDailyCron() {
    // Calculate ms until next 08:00 UTC (3 AM Lima)
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(8, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const msUntilFirst = next.getTime() - now.getTime();

    setTimeout(() => {
      this.scheduledArbiter();
      // Then every 24h
      this.cronTimer = setInterval(() => this.scheduledArbiter(), CRON_INTERVAL_MS);
    }, msUntilFirst);

    this.logger.log(`[arbiter] Scheduled daily run at 08:00 UTC (3 AM Lima). Next in ${Math.round(msUntilFirst / 60000)} min`);
  }

  private async scheduledArbiter() {
    if (this.isRunning) return;
    try {
      await this.runFull();
    } catch (err) {
      this.logger.error(`[arbiter] Scheduled run failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ========== PUBLIC API ==========

  async runFull(): Promise<void> {
    if (this.isRunning) throw new Error('Arbiter already running');
    this.isRunning = true;
    this.aborted = false;
    this.currentStep = 'Iniciando análisis...';
    this.completedSteps = [];
    this.processedCount = 0;
    this.autoApprovedCount = 0;
    this.autoRejectedCount = 0;
    this.degradedCount = 0;
    const start = Date.now();

    try {
      // Step 1: Score all PENDING candidates
      this.currentStep = 'Calculando quality scores...';
      await this.scoreAllPending();
      if (this.aborted) return;
      this.completedSteps.push('scoring');

      // Step 2: Auto-approve high-score candidates
      this.currentStep = 'Auto-aprobando candidatos de alta calidad...';
      await this.autoApprove();
      if (this.aborted) return;
      this.completedSteps.push('auto_approve');

      // Step 3: Auto-reject low-score candidates
      this.currentStep = 'Auto-rechazando candidatos de baja calidad...';
      await this.autoReject();
      if (this.aborted) return;
      this.completedSteps.push('auto_reject');

      // Step 4: Monitor promoted answers
      this.currentStep = 'Monitoreando respuestas promovidas...';
      await this.monitorPromotedAnswers();
      this.completedSteps.push('monitor');

      this.currentStep = null;
      this.lastRun = new Date();
      this.lastDuration = Math.round((Date.now() - start) / 1000);
      this.logger.log(
        `[arbiter] Processed ${this.processedCount} candidates: ${this.autoApprovedCount} auto-approved, ${this.autoRejectedCount} auto-rejected, ${this.degradedCount} degraded`,
      );
    } catch (error) {
      this.logger.error(
        `[arbiter] Failed: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.currentStep = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    } finally {
      this.isRunning = false;
    }
  }

  abort(): void {
    this.aborted = true;
    this.currentStep = 'Deteniendo...';
  }

  getStatus(): ArbiterStatus {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString() ?? null,
      lastDuration: this.lastDuration,
      currentStep: this.currentStep,
      completedSteps: [...this.completedSteps],
      totalSteps: this.totalSteps,
      processedCount: this.processedCount,
      autoApprovedCount: this.autoApprovedCount,
      autoRejectedCount: this.autoRejectedCount,
      degradedCount: this.degradedCount,
    };
  }

  /** Recalculate score for a specific candidate (on-demand, non-blocking) */
  async recalculateScore(candidateId: number): Promise<void> {
    const candidate = await this.prisma.helpKBCandidate.findUnique({
      where: { id: candidateId },
    });
    if (!candidate || candidate.status !== 'PENDING') return;

    const score = await this.calculateQualityScore(candidate);
    await this.prisma.helpKBCandidate.update({
      where: { id: candidateId },
      data: {
        qualityScore: score.total,
        scoreFactors: score.factors as any,
        scoredAt: new Date(),
      },
    });
  }

  /** Override arbiter decision manually */
  async overrideDecision(
    candidateId: number,
    decision: 'APPROVED' | 'REJECTED',
    adminId: number,
  ): Promise<void> {
    const newStatus = decision;

    const candidate = await this.prisma.helpKBCandidate.update({
      where: { id: candidateId },
      data: {
        status: newStatus,
        arbiterDecision: 'MANUAL',
        approvedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // Generate embedding if approved
    if (decision === 'APPROVED') {
      this.embeddingService
        .onCandidateApproved({
          id: candidateId,
          question: candidate.question,
          answer: candidate.answer,
          section: candidate.section,
        })
        .catch((err) =>
          this.logger.warn(
            `[arbiter] Embedding failed for override ${candidateId}: ${err instanceof Error ? err.message : err}`,
          ),
        );
    }
  }

  // ========== INTERNAL METHODS ==========

  private async scoreAllPending(): Promise<void> {
    const minAge = new Date(Date.now() - MIN_AGE_HOURS * 60 * 60 * 1000);
    const candidates = await this.prisma.helpKBCandidate.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: minAge },
      },
    });

    for (const candidate of candidates) {
      if (this.aborted) return;

      const score = await this.calculateQualityScore(candidate);
      await this.prisma.helpKBCandidate.update({
        where: { id: candidate.id },
        data: {
          qualityScore: score.total,
          scoreFactors: score.factors as any,
          scoredAt: new Date(),
        },
      });

      this.processedCount++;
    }
  }

  private async autoApprove(): Promise<void> {
    const candidates = await this.prisma.helpKBCandidate.findMany({
      where: {
        status: 'PENDING',
        qualityScore: { gte: AUTO_APPROVE_THRESHOLD },
        positiveVotes: { gte: MIN_VOTES_FOR_APPROVE },
      },
    });

    for (const candidate of candidates) {
      if (this.aborted) return;

      await this.prisma.helpKBCandidate.update({
        where: { id: candidate.id },
        data: {
          status: 'APPROVED',
          arbiterDecision: 'AUTO_APPROVED',
          reviewedAt: new Date(),
        },
      });

      // Generate embedding
      this.embeddingService
        .onCandidateApproved({
          id: candidate.id,
          question: candidate.question,
          answer: candidate.answer,
          section: candidate.section,
        })
        .catch((err) =>
          this.logger.warn(
            `[arbiter] Embedding failed for ${candidate.id}: ${err instanceof Error ? err.message : err}`,
          ),
        );

      this.autoApprovedCount++;
    }
  }

  private async autoReject(): Promise<void> {
    const candidates = await this.prisma.helpKBCandidate.findMany({
      where: {
        status: 'PENDING',
        qualityScore: { lt: AUTO_REJECT_THRESHOLD },
        negativeVotes: { gte: MIN_NEGATIVE_FOR_REJECT },
      },
    });

    for (const candidate of candidates) {
      if (this.aborted) return;

      await this.prisma.helpKBCandidate.update({
        where: { id: candidate.id },
        data: {
          status: 'REJECTED',
          arbiterDecision: 'AUTO_REJECTED',
          reviewedAt: new Date(),
        },
      });

      this.autoRejectedCount++;
    }
  }

  async monitorPromotedAnswers(): Promise<void> {
    const since = new Date(Date.now() - MONITOR_DAYS * 24 * 60 * 60 * 1000);

    // Get promoted messages with feedback from last 14 days
    const feedbackData = await this.prisma.$queryRaw<
      Array<{ section: string; content: string; feedback: string; cnt: bigint }>
    >`
      SELECT hm."section", hm."content", hm."feedback"::text, COUNT(*) as cnt
      FROM "HelpMessage" hm
      WHERE hm."source" = 'PROMOTED'
        AND hm."feedback" IS NOT NULL
        AND hm."createdAt" >= ${since}
      GROUP BY hm."section", hm."content", hm."feedback"
    `;

    // Group by section+content
    const groupMap = new Map<string, { positive: number; negative: number }>();
    for (const row of feedbackData) {
      const key = `${row.section}|||${row.content}`;
      const entry = groupMap.get(key) ?? { positive: 0, negative: 0 };
      if (row.feedback === 'POSITIVE') entry.positive += Number(row.cnt);
      else if (row.feedback === 'NEGATIVE') entry.negative += Number(row.cnt);
      groupMap.set(key, entry);
    }

    for (const [key, stats] of groupMap) {
      if (this.aborted) return;

      const total = stats.positive + stats.negative;
      if (total < MIN_INTERACTIONS_FOR_DEGRADATION) continue;

      const negativeRatio = stats.negative / total;
      if (negativeRatio <= DEGRADATION_RATIO) continue;

      const [section] = key.split('|||');

      // Find the candidate that produced this promoted answer
      // Match by section and look for candidates that were approved
      const candidate = await this.prisma.helpKBCandidate.findFirst({
        where: {
          section,
          status: 'APPROVED',
          arbiterDecision: { not: 'DEGRADED' },
        },
        orderBy: { reviewedAt: 'desc' },
      });

      if (candidate) {
        await this.prisma.helpKBCandidate.update({
          where: { id: candidate.id },
          data: { arbiterDecision: 'DEGRADED' },
        });
        this.degradedCount++;
        this.logger.warn(
          `[arbiter] Degraded candidate ${candidate.id} (section: ${section}, negRatio: ${(negativeRatio * 100).toFixed(0)}%)`,
        );
      }
    }
  }

  // ========== QUALITY SCORE CALCULATION ==========

  private async calculateQualityScore(candidate: {
    id: number;
    positiveVotes: number;
    negativeVotes: number;
    questionNorm: string;
    section: string;
    answer: string;
    createdAt: Date;
  }): Promise<{ total: number; factors: Record<string, number> }> {
    // Factor 1: Satisfaction ratio
    const totalVotes = candidate.positiveVotes + candidate.negativeVotes;
    let satisfaction: number;
    if (totalVotes === 0) {
      satisfaction = 0.5; // neutral if no votes
    } else if (candidate.negativeVotes === 0 && candidate.positiveVotes >= 3) {
      satisfaction = 1.0;
    } else {
      satisfaction = candidate.positiveVotes / totalVotes;
    }

    // Factor 2: Volume — how many times this question was asked
    const volumeCount = await this.prisma.helpLearningSession.count({
      where: {
        queryNorm: candidate.questionNorm,
        ...(candidate.section ? { section: candidate.section } : {}),
      },
    });
    const volume = Math.min(1, volumeCount / 20);

    // Factor 3: Recency boost
    const daysSinceCreation =
      (Date.now() - candidate.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const recency = Math.max(0, 1 - daysSinceCreation / 30);

    // Factor 4: Depth — answer length quality
    const answerLen = candidate.answer.length;
    let depth: number;
    if (answerLen < 50) {
      depth = answerLen / 200; // penalty for very short
    } else {
      depth = Math.min(1, answerLen / 200);
    }

    // Factor 5: Latency — average response time for this section
    const perfLogs = await this.prisma.helpPerformanceLog.aggregate({
      where: { section: candidate.section },
      _avg: { durationMs: true },
    });
    const avgLatency = perfLogs._avg.durationMs ?? 2500;
    const latency = Math.max(0, 1 - avgLatency / 5000);

    const total =
      W_SATISFACTION * satisfaction +
      W_VOLUME * volume +
      W_RECENCY * recency +
      W_DEPTH * depth +
      W_LATENCY * latency;

    const factors = {
      satisfaction: Math.round(satisfaction * 100) / 100,
      volume: Math.round(volume * 100) / 100,
      recency: Math.round(recency * 100) / 100,
      depth: Math.round(depth * 100) / 100,
      latency: Math.round(latency * 100) / 100,
    };

    return { total: Math.round(total * 100) / 100, factors };
  }
}
