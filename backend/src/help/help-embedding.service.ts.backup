import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';

interface KBStep {
  text: string;
  image?: string;
}

interface KBEntry {
  sourceId: string;
  sourceType: 'static' | 'promoted';
  section: string;
  question: string;
  answer: string;
  aliases?: string[];
  steps?: KBStep[];
}

export interface EmbeddingSearchResult {
  sourceId: string;
  sourceType: string;
  section: string;
  question: string;
  answer: string;
  similarity: number;
}

/** In-memory cache entry */
interface CachedEmbedding {
  embedding: number[];
  expiresAt: number;
}

const QUERY_CACHE_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class HelpEmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(HelpEmbeddingService.name);
  private readonly pythonBin: string;
  private readonly scriptPath: string;
  private readonly kbPath: string;
  private readonly threshold: number;
  private readonly syncIntervalMs: number;
  private readonly queryCache = new Map<string, CachedEmbedding>();

  /** In-memory embedding index loaded from DB */
  private embeddingIndex: Array<{
    sourceId: string;
    sourceType: string;
    section: string;
    question: string;
    answer: string;
    embedding: number[];
  }> = [];

  /** In-memory map of sourceId → steps (loaded from static KB JSON) */
  private stepsIndex = new Map<string, KBStep[]>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.pythonBin =
      config.get<string>('HELP_EMBEDDING_BIN') ??
      config.get<string>('PYTHON_BIN') ??
      'python';
    this.scriptPath = path.resolve(
      process.cwd(),
      config.get<string>('HELP_EMBEDDING_SCRIPT') ?? 'ml/help_embeddings.py',
    );
    this.kbPath = path.resolve(process.cwd(), 'ml/help-kb-static.json');
    this.threshold = Number(config.get<string>('HELP_EMBEDDING_THRESHOLD') ?? '0.82');
    this.syncIntervalMs = Number(
      config.get<string>('HELP_EMBEDDING_SYNC_INTERVAL_MS') ?? '21600000',
    );
  }

  async onModuleInit() {
    // Load existing embeddings into memory
    await this.loadIndex();

    // Start background sync (non-blocking)
    this.syncEmbeddings().catch((err) =>
      this.logger.warn(`Initial sync failed: ${err instanceof Error ? err.message : err}`),
    );

    // Schedule periodic re-sync
    setInterval(() => {
      this.syncEmbeddings().catch((err) =>
        this.logger.warn(`Periodic sync failed: ${err instanceof Error ? err.message : err}`),
      );
    }, this.syncIntervalMs);
  }

  /** Load all embeddings from DB into memory for fast search */
  private async loadIndex() {
    try {
      const records = await this.prisma.helpEmbedding.findMany({
        select: {
          sourceId: true,
          sourceType: true,
          section: true,
          question: true,
          answer: true,
          embedding: true,
        },
      });
      this.embeddingIndex = records;
      this.logger.log(`Loaded ${records.length} embeddings into memory index`);
    } catch (err) {
      this.logger.warn(`Failed to load embeddings: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Sync static KB + approved candidates into DB embeddings */
  async syncEmbeddings(): Promise<void> {
    if (!existsSync(this.scriptPath)) {
      this.logger.warn(`Embedding script not found: ${this.scriptPath}`);
      return;
    }

    // 1. Load static KB entries
    let staticEntries: KBEntry[] = [];
    if (existsSync(this.kbPath)) {
      try {
        const raw = readFileSync(this.kbPath, 'utf-8');
        staticEntries = JSON.parse(raw) as KBEntry[];

        // Build steps index from static entries
        this.stepsIndex.clear();
        for (const entry of staticEntries) {
          if (entry.steps && entry.steps.length > 0) {
            this.stepsIndex.set(entry.sourceId, entry.steps);
          }
        }
        if (this.stepsIndex.size > 0) {
          this.logger.log(`Loaded ${this.stepsIndex.size} step guides into steps index`);
        }
      } catch (err) {
        this.logger.warn(`Failed to read KB file: ${err instanceof Error ? err.message : err}`);
      }
    }

    // 2. Load approved candidates from DB
    const approvedCandidates = await this.prisma.helpKBCandidate.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, question: true, answer: true, section: true },
    });

    const candidateEntries: KBEntry[] = approvedCandidates.map((c) => ({
      sourceId: `candidate-${c.id}`,
      sourceType: 'promoted' as const,
      section: c.section,
      question: c.question,
      answer: c.answer,
    }));

    const allEntries = [...staticEntries, ...candidateEntries];

    // 3. Find which entries already have embeddings
    const existing = await this.prisma.helpEmbedding.findMany({
      select: { sourceType: true, sourceId: true },
    });
    const existingSet = new Set(existing.map((e) => `${e.sourceType}:${e.sourceId}`));

    const newEntries = allEntries.filter(
      (e) => !existingSet.has(`${e.sourceType}:${e.sourceId}`),
    );

    if (newEntries.length === 0) {
      this.logger.log('All embeddings are up to date');
      await this.loadIndex();
      return;
    }

    this.logger.log(`Generating embeddings for ${newEntries.length} new entries...`);

    // 4. Build texts to embed (question + aliases for better coverage)
    const texts = newEntries.map((e) => {
      const parts = [e.question];
      if (e.aliases && e.aliases.length > 0) {
        parts.push(e.aliases.join(', '));
      }
      return parts.join(' — ');
    });

    // 5. Call Python script in batch mode
    const embeddings = await this.encodeBatch(texts);
    if (!embeddings || embeddings.length !== newEntries.length) {
      this.logger.error(
        `Embedding count mismatch: expected ${newEntries.length}, got ${embeddings?.length ?? 0}`,
      );
      return;
    }

    // 6. Store in DB
    for (let i = 0; i < newEntries.length; i++) {
      const entry = newEntries[i];
      const embedding = embeddings[i];
      try {
        await this.prisma.helpEmbedding.upsert({
          where: {
            sourceType_sourceId: {
              sourceType: entry.sourceType,
              sourceId: entry.sourceId,
            },
          },
          create: {
            sourceType: entry.sourceType,
            sourceId: entry.sourceId,
            section: entry.section,
            question: entry.question,
            answer: entry.answer,
            embedding,
          },
          update: {
            question: entry.question,
            answer: entry.answer,
            embedding,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to store embedding for ${entry.sourceId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    this.logger.log(`Stored ${newEntries.length} new embeddings`);
    await this.loadIndex();
  }

  /** Generate embedding for a single query (with caching) */
  async embedQuery(text: string): Promise<number[] | null> {
    const cacheKey = text.toLowerCase().trim();
    const cached = this.queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.embedding;
    }

    const embedding = await this.encodeQuery(text);
    if (embedding && embedding.length > 0) {
      this.queryCache.set(cacheKey, {
        embedding,
        expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
      });

      // Clean cache if too large
      if (this.queryCache.size > 200) {
        const now = Date.now();
        for (const [key, val] of this.queryCache) {
          if (val.expiresAt < now) this.queryCache.delete(key);
        }
      }
    }

    return embedding;
  }

  /** Search for similar entries using cosine similarity */
  searchSimilar(
    queryEmbedding: number[],
    section: string | null,
    limit = 3,
  ): EmbeddingSearchResult[] {
    if (this.embeddingIndex.length === 0) return [];

    const results: EmbeddingSearchResult[] = [];

    for (const entry of this.embeddingIndex) {
      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);

      // Boost entries from the same section
      const boostedSimilarity =
        section && entry.section === section
          ? Math.min(similarity + 0.05, 1.0)
          : similarity;

      results.push({
        sourceId: entry.sourceId,
        sourceType: entry.sourceType,
        section: entry.section,
        question: entry.question,
        answer: entry.answer,
        similarity: boostedSimilarity,
      });
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /** Generate embedding for a single approved candidate and store it */
  async onCandidateApproved(candidate: {
    id: number;
    question: string;
    answer: string;
    section: string;
  }): Promise<void> {
    const embedding = await this.encodeQuery(candidate.question);
    if (!embedding || embedding.length === 0) return;

    const sourceId = `candidate-${candidate.id}`;
    try {
      await this.prisma.helpEmbedding.upsert({
        where: {
          sourceType_sourceId: { sourceType: 'promoted', sourceId },
        },
        create: {
          sourceType: 'promoted',
          sourceId,
          section: candidate.section,
          question: candidate.question,
          answer: candidate.answer,
          embedding,
        },
        update: {
          question: candidate.question,
          answer: candidate.answer,
          embedding,
        },
      });

      // Update in-memory index
      const existingIdx = this.embeddingIndex.findIndex(
        (e) => e.sourceType === 'promoted' && e.sourceId === sourceId,
      );
      const record = {
        sourceId,
        sourceType: 'promoted',
        section: candidate.section,
        question: candidate.question,
        answer: candidate.answer,
        embedding,
      };
      if (existingIdx >= 0) {
        this.embeddingIndex[existingIdx] = record;
      } else {
        this.embeddingIndex.push(record);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to store candidate embedding: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Get step-by-step guide for a KB entry */
  getSteps(sourceId: string): KBStep[] | undefined {
    return this.stepsIndex.get(sourceId);
  }

  /** Check if the embedding system is ready */
  get isReady(): boolean {
    return this.embeddingIndex.length > 0;
  }

  // ─── Private helpers ───────────────────────────────────────

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private encodeBatch(texts: string[]): Promise<number[][] | null> {
    return new Promise((resolve) => {
      if (!existsSync(this.scriptPath)) {
        resolve(null);
        return;
      }

      const proc = spawn(this.pythonBin, [this.scriptPath, 'encode-batch'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`encode-batch failed (code ${code}): ${stderr.slice(0, 500)}`);
          resolve(null);
          return;
        }
        try {
          const result = JSON.parse(stdout) as number[][];
          resolve(result);
        } catch {
          this.logger.error(`Failed to parse batch embeddings: ${stdout.slice(0, 200)}`);
          resolve(null);
        }
      });

      proc.on('error', (err) => {
        this.logger.error(`Failed to spawn Python for batch encoding: ${err.message}`);
        resolve(null);
      });

      proc.stdin.write(JSON.stringify(texts));
      proc.stdin.end();
    });
  }

  private encodeQuery(text: string): Promise<number[] | null> {
    return new Promise((resolve) => {
      if (!existsSync(this.scriptPath)) {
        resolve(null);
        return;
      }

      const proc = spawn(
        this.pythonBin,
        [this.scriptPath, 'encode-query', '--text', text],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`encode-query failed (code ${code}): ${stderr.slice(0, 500)}`);
          resolve(null);
          return;
        }
        try {
          const result = JSON.parse(stdout) as number[];
          resolve(result.length > 0 ? result : null);
        } catch {
          this.logger.error(`Failed to parse query embedding: ${stdout.slice(0, 200)}`);
          resolve(null);
        }
      });

      proc.on('error', (err) => {
        this.logger.error(`Failed to spawn Python for query encoding: ${err.message}`);
        resolve(null);
      });
    });
  }
}
