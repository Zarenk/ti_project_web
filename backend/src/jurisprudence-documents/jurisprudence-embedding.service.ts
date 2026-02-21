import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';
import { JurisprudenceStructureType, JurisprudenceProcessingStatus } from '@prisma/client';

interface ChunkMetadata {
  structureType: JurisprudenceStructureType;
  section: string;
  pageNumbers: number[];
  paragraphIndex: number;
  court: string;
  expediente: string;
  year: number;
  publishDate: string;
}

interface Chunk {
  text: string;
  metadata: ChunkMetadata;
}

@Injectable()
export class JurisprudenceEmbeddingService {
  private readonly logger = new Logger(JurisprudenceEmbeddingService.name);
  private readonly openai: OpenAI | null;
  private readonly EMBEDDING_MODEL = process.env.JURISPRUDENCE_EMBEDDING_MODEL || 'text-embedding-3-small';
  private readonly EMBEDDING_VERSION = 'v1';
  private readonly CHUNK_SIZE = parseInt(process.env.JURISPRUDENCE_CHUNK_SIZE || '1000', 10);
  private readonly CHUNK_OVERLAP = parseInt(process.env.JURISPRUDENCE_CHUNK_OVERLAP || '200', 10);
  private readonly BATCH_SIZE = 100;
  private readonly RATE_LIMIT_MS = 200;

  constructor(private prisma: PrismaService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not set - embedding generation will fail');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Process a document: chunk text → generate embeddings → save
   */
  async processDocument(documentId: number) {
    this.logger.log(`Processing document ${documentId} for embeddings`);

    const document = await this.prisma.jurisprudenceDocument.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          where: { hasText: true },
          orderBy: { pageNumber: 'asc' },
        },
        sections: true,
      },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!document.pages || document.pages.length === 0) {
      this.logger.warn(`Document ${documentId} has no pages with text`);
      return;
    }

    try {
      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: { processingStatus: JurisprudenceProcessingStatus.EMBEDDING },
      });

      // Generate chunks from pages (structured by legal sections if available)
      const chunks = await this.generateChunks(document);

      this.logger.log(`Generated ${chunks.length} chunks for document ${documentId}`);

      // Generate embeddings in batches
      const embeddings = await this.generateEmbeddings(chunks);

      // Save embeddings to database
      await this.saveEmbeddings(documentId, document.organizationId, document.companyId, chunks, embeddings);

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: JurisprudenceProcessingStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Document ${documentId} processing completed: ${embeddings.length} embeddings saved`);
    } catch (error) {
      this.logger.error(`Failed to process document ${documentId}: ${(error as Error).message}`);

      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: JurisprudenceProcessingStatus.FAILED,
          failedReason: (error as Error).message,
          retryCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Generate structured chunks from document pages
   */
  private async generateChunks(document: any): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    // If sections are available, chunk by section
    if (document.sections && document.sections.length > 0) {
      for (const section of document.sections) {
        const sectionChunks = this.chunkText(section.sectionText);

        sectionChunks.forEach((chunkText, index) => {
          chunks.push({
            text: chunkText,
            metadata: {
              structureType: section.structureType,
              section: section.sectionName,
              pageNumbers: this.getPageRange(section.startPage, section.endPage),
              paragraphIndex: index,
              court: document.court,
              expediente: document.expediente,
              year: document.year,
              publishDate: document.publishDate.toISOString(),
            },
          });
        });
      }
    } else {
      // Fallback: chunk by pages
      let pageIndex = 0;
      for (const page of document.pages) {
        if (!page.rawText) continue;

        const pageChunks = this.chunkText(page.rawText);

        pageChunks.forEach((chunkText, index) => {
          chunks.push({
            text: chunkText,
            metadata: {
              structureType: JurisprudenceStructureType.OTROS,
              section: `Página ${page.pageNumber}`,
              pageNumbers: [page.pageNumber],
              paragraphIndex: index,
              court: document.court,
              expediente: document.expediente,
              year: document.year,
              publishDate: document.publishDate.toISOString(),
            },
          });
        });

        pageIndex++;
      }
    }

    return chunks;
  }

  /**
   * Chunk text into smaller pieces with overlap
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      currentChunk.push(word);
      currentLength += word.length + 1; // +1 for space

      if (currentLength >= this.CHUNK_SIZE) {
        chunks.push(currentChunk.join(' '));

        // Keep overlap words for next chunk
        const overlapWords = Math.floor(this.CHUNK_OVERLAP / (currentLength / currentChunk.length));
        currentChunk = currentChunk.slice(-overlapWords);
        currentLength = currentChunk.reduce((sum, w) => sum + w.length + 1, 0);
      }
    }

    // Add remaining words as last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Generate embeddings for chunks using OpenAI API
   */
  private async generateEmbeddings(chunks: Chunk[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - OPENAI_API_KEY is required');
    }

    const allEmbeddings: number[][] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const texts = batch.map((c) => c.text);

      this.logger.log(`Generating embeddings for batch ${i / this.BATCH_SIZE + 1}/${Math.ceil(chunks.length / this.BATCH_SIZE)}`);

      try {
        const response = await this.openai.embeddings.create({
          model: this.EMBEDDING_MODEL,
          input: texts,
        });

        const embeddings = response.data.map((item) => item.embedding);
        allEmbeddings.push(...embeddings);

        // Rate limiting
        if (i + this.BATCH_SIZE < chunks.length) {
          await this.sleep(this.RATE_LIMIT_MS);
        }
      } catch (error) {
        this.logger.error(`Failed to generate embeddings for batch: ${(error as Error).message}`);
        throw error;
      }
    }

    return allEmbeddings;
  }

  /**
   * Save embeddings to database
   */
  private async saveEmbeddings(
    documentId: number,
    organizationId: number,
    companyId: number,
    chunks: Chunk[],
    embeddings: number[][],
  ) {
    if (chunks.length !== embeddings.length) {
      throw new Error(`Chunk count (${chunks.length}) does not match embedding count (${embeddings.length})`);
    }

    // Delete existing embeddings for this document (if reprocessing)
    await this.prisma.jurisprudenceEmbedding.deleteMany({
      where: { documentId },
    });

    // Create new embeddings
    const embeddingRecords = chunks.map((chunk, index) => ({
      documentId,
      organizationId,
      companyId,
      chunkIndex: index,
      chunkText: chunk.text,
      // TODO: Convert embedding array to proper format for Bytes type
      // When pgvector is available, this should be: `[${embeddings[index].join(',')}]`
      embedding: Buffer.from(JSON.stringify(embeddings[index])), // Temporary: store as JSON in Bytes
      embeddingModel: this.EMBEDDING_MODEL,
      embeddingVersion: this.EMBEDDING_VERSION,
      metadata: chunk.metadata as any,
    }));

    await this.prisma.jurisprudenceEmbedding.createMany({
      data: embeddingRecords,
    });

    this.logger.log(`Saved ${embeddingRecords.length} embeddings for document ${documentId}`);
  }

  /**
   * Get page range array
   */
  private getPageRange(start: number, end: number): number[] {
    const range: number[] = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
