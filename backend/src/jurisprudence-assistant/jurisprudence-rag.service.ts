import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OpenAI } from 'openai';

export interface SearchFilters {
  organizationId: number;
  companyId: number;
  courts?: string[];
  minYear?: number;
  areas?: string[];
}

export interface Source {
  sourceId: string;
  documentId: number;
  title: string;
  court: string;
  expediente: string;
  year: number;
  section: string;
  pageNumbers: number[];
  excerpt: string;
  similarity: number;
  citedInAnswer: boolean;
}

export interface RagResponse {
  answer: string;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA' | 'NO_CONCLUYENTE';
  sources: Source[];
  metadata: {
    queryType: string;
    filters: SearchFilters;
    needsHumanReview: boolean;
  };
  tokensUsed: number;
  costUsd: number;
  responseTime: number;
}

@Injectable()
export class JurisprudenceRagService {
  private readonly logger = new Logger(JurisprudenceRagService.name);
  private readonly openai: OpenAI | null;
  private readonly CHAT_MODEL = process.env.JURISPRUDENCE_CHAT_MODEL || 'gpt-4o-mini';
  private readonly TOP_K = parseInt(process.env.JURISPRUDENCE_TOP_K || '5', 10);
  private readonly MIN_SIMILARITY = parseFloat(process.env.JURISPRUDENCE_MIN_SIMILARITY || '0.7');

  constructor(private prisma: PrismaService) {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not set - RAG queries will fail');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Process a query using RAG with mandatory citations
   */
  async query(
    organizationId: number,
    companyId: number,
    userId: number,
    queryText: string,
    legalMatterId?: number,
    filters?: Partial<SearchFilters>,
  ): Promise<RagResponse> {
    const startTime = Date.now();
    this.logger.log(`Processing query for org ${organizationId}: "${queryText.substring(0, 50)}..."`);

    // Get organization config
    const config = await this.prisma.jurisprudenceConfig.findUnique({
      where: { organizationId },
    });

    if (!config || !config.ragEnabled) {
      throw new Error('RAG is not enabled for this organization');
    }

    // Build filters
    const searchFilters: SearchFilters = {
      organizationId,
      companyId,
      courts: filters?.courts || (config.courtsEnabled as string[]),
      minYear: filters?.minYear || config.minYear,
      areas: filters?.areas,
    };

    // Generate query embedding
    const queryEmbedding = await this.generateQueryEmbedding(queryText);

    // Vector search with pre-filtering
    const chunks = await this.searchWithFilters(queryEmbedding, searchFilters, this.TOP_K);

    if (chunks.length === 0) {
      this.logger.warn(`No relevant documents found for query: "${queryText}"`);

      const responseTime = Date.now() - startTime;
      return {
        answer: 'No se encontraron documentos de jurisprudencia relevantes para su consulta. Intente reformular la pregunta o ampliar los filtros de búsqueda.',
        confidence: 'NO_CONCLUYENTE',
        sources: [],
        metadata: {
          queryType: 'no_results',
          filters: searchFilters,
          needsHumanReview: true,
        },
        tokensUsed: 0,
        costUsd: 0,
        responseTime,
      };
    }

    // Build context with complete metadata
    const context = this.buildContext(chunks);

    // Generate answer with GPT-4
    const { answer, usage } = await this.generateAnswer(queryText, context);

    // Determine confidence and validate citations
    const confidence = this.determineConfidence(answer, chunks);
    const hasValidCitations = this.validateCitations(answer, chunks);

    // Build sources array
    const sources = this.buildSources(chunks, answer);

    const responseTime = Date.now() - startTime;
    const tokensUsed = usage.total_tokens;
    const costUsd = this.calculateCost(usage.prompt_tokens, usage.completion_tokens);

    // Save query to database
    await this.saveQuery({
      organizationId,
      companyId,
      userId,
      legalMatterId,
      query: queryText,
      answer,
      confidence,
      hasValidCitations,
      needsHumanReview: confidence === 'BAJA' || confidence === 'NO_CONCLUYENTE' || !hasValidCitations,
      documentsUsed: sources,
      tokensUsed,
      costUsd,
      responseTime,
    });

    return {
      answer,
      confidence,
      sources,
      metadata: {
        queryType: this.detectQueryType(queryText),
        filters: searchFilters,
        needsHumanReview: confidence === 'BAJA' || confidence === 'NO_CONCLUYENTE' || !hasValidCitations,
      },
      tokensUsed,
      costUsd,
      responseTime,
    };
  }

  /**
   * Generate embedding for query
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - OPENAI_API_KEY is required');
    }

    const response = await this.openai.embeddings.create({
      model: process.env.JURISPRUDENCE_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: query,
    });

    return response.data[0].embedding;
  }

  /**
   * Vector search with pre-filtering
   * TODO: When pgvector is installed, use native vector search
   * For now, using simple similarity calculation with JSON embeddings
   */
  private async searchWithFilters(
    queryEmbedding: number[],
    filters: SearchFilters,
    topK: number,
  ): Promise<any[]> {
    this.logger.log('Performing vector search (temporary JSON-based implementation)');

    // Fetch all embeddings for the organization
    // TODO: Add proper WHERE filters when pgvector is available
    const embeddings = await this.prisma.jurisprudenceEmbedding.findMany({
      where: {
        organizationId: filters.organizationId,
        companyId: filters.companyId,
      },
      include: {
        document: true,
      },
      take: 500, // Temporary limit
    });

    // Calculate cosine similarity for each embedding
    const withSimilarity = embeddings
      .filter((e) => {
        // Filter by document criteria
        if (!e.document) return false;
        if (e.document.processingStatus !== 'COMPLETED') return false;
        if (e.document.deletedAt) return false;
        if (filters.minYear && e.document.year < filters.minYear) return false;
        if (filters.courts?.length && !filters.courts.includes(e.document.court)) return false;
        return true;
      })
      .map((embedding) => {
        // Parse embedding from Bytes (temporary until pgvector)
        const embeddingVector = JSON.parse(embedding.embedding.toString());
        const similarity = this.cosineSimilarity(queryEmbedding, embeddingVector);

        return {
          ...embedding,
          similarity,
        };
      })
      .filter((e) => e.similarity >= this.MIN_SIMILARITY)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    this.logger.log(`Found ${withSimilarity.length} relevant chunks (min similarity: ${this.MIN_SIMILARITY})`);

    return withSimilarity;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Build context from chunks with metadata
   */
  private buildContext(chunks: any[]): string {
    return chunks
      .map((chunk, index) => {
        const metadata = chunk.metadata as any;
        return `[FUENTE ${index + 1}]
Documento: ${chunk.document.title}
Expediente: ${chunk.document.expediente}
Corte: ${chunk.document.court}
Año: ${chunk.document.year}
Sección: ${metadata.structureType} - ${metadata.section}
Páginas: ${metadata.pageNumbers.join(', ')}

${chunk.chunkText}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Generate answer using GPT-4 with strict citation requirements
   */
  private async generateAnswer(query: string, context: string) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - OPENAI_API_KEY is required');
    }

    const systemPrompt = `Eres un asistente legal especializado en jurisprudencia peruana.

REGLAS ESTRICTAS:
1. Usa SOLO información del contexto proporcionado
2. CITA OBLIGATORIA: Cada afirmación DEBE incluir [FUENTE X, pág. Y] donde X es el número de fuente y Y son las páginas
3. Si la evidencia es insuficiente → Responde "NO CONCLUYENTE: [razón específica]"
4. NO inventes precedentes ni interpretes más allá del texto literal
5. Distingue entre ratio decidendi (fundamento de la decisión) y obiter dicta (comentarios adicionales)
6. Si hay precedentes contradictorios, menciónalos todos con sus citas

FORMATO DE RESPUESTA:
- Respuesta directa y concisa con citas inline después de cada afirmación
- Lista numerada de fuentes consultadas al final
- Nivel de confianza al inicio: [CONFIANZA: ALTA/MEDIA/BAJA/NO_CONCLUYENTE]

EJEMPLO:
[CONFIANZA: ALTA]

Según la Casación N° 1234-2020-Lima, el plazo de prescripción para delitos de robo es de 6 años [FUENTE 1, págs. 5-6]. Este criterio ha sido ratificado en casos posteriores [FUENTE 2, pág. 12].

Fuentes consultadas:
1. Casación N° 1234-2020-Lima (Corte Suprema, 2020)
2. Expediente N° 5678-2021 (Corte Superior de Lima, 2021)`;

    const response = await this.openai.chat.completions.create({
      model: this.CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `CONTEXTO:\n\n${context}\n\nPREGUNTA: ${query}` },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 2000,
    });

    const answer = response.choices[0].message.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    return { answer, usage };
  }

  /**
   * Determine confidence level based on answer content
   */
  private determineConfidence(answer: string, chunks: any[]): 'ALTA' | 'MEDIA' | 'BAJA' | 'NO_CONCLUYENTE' {
    // Check if answer explicitly states "NO CONCLUYENTE"
    if (/NO\s+CONCLUYENTE/i.test(answer)) {
      return 'NO_CONCLUYENTE';
    }

    // Check if answer has explicit confidence marker
    const confidenceMatch = answer.match(/\[CONFIANZA:\s*(ALTA|MEDIA|BAJA|NO_CONCLUYENTE)\]/i);
    if (confidenceMatch) {
      return confidenceMatch[1].toUpperCase() as any;
    }

    // Heuristic: count citations
    const citationCount = (answer.match(/\[FUENTE\s+\d+/g) || []).length;

    if (citationCount >= 3 && chunks.length >= 3) {
      return 'ALTA';
    } else if (citationCount >= 2 && chunks.length >= 2) {
      return 'MEDIA';
    } else if (citationCount >= 1) {
      return 'BAJA';
    }

    return 'NO_CONCLUYENTE';
  }

  /**
   * Validate that answer has proper citation format
   */
  private validateCitations(answer: string, chunks: any[]): boolean {
    // Check for citation format [FUENTE X, pág. Y]
    const citationPattern = /\[FUENTE\s+\d+,\s*págs?\.\s*\d+(-\d+)?\]/gi;
    const citations = answer.match(citationPattern);

    if (!citations || citations.length === 0) {
      this.logger.warn('Answer has no valid citations');
      return false;
    }

    // Validate that cited sources exist
    const validSourceNumbers = new Set(chunks.map((_, index) => index + 1));
    for (const citation of citations) {
      const sourceMatch = citation.match(/FUENTE\s+(\d+)/i);
      if (sourceMatch) {
        const sourceNum = parseInt(sourceMatch[1], 10);
        if (!validSourceNumbers.has(sourceNum)) {
          this.logger.warn(`Invalid source number in citation: ${citation}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Build sources array for response
   */
  private buildSources(chunks: any[], answer: string): Source[] {
    return chunks.map((chunk, index) => {
      const metadata = chunk.metadata as any;
      const sourceId = `[FUENTE ${index + 1}]`;

      // Check if this source was cited in the answer
      const citedInAnswer = answer.includes(sourceId);

      return {
        sourceId,
        documentId: chunk.documentId,
        title: chunk.document.title,
        court: chunk.document.court,
        expediente: chunk.document.expediente,
        year: chunk.document.year,
        section: `${metadata.structureType} - ${metadata.section}`,
        pageNumbers: metadata.pageNumbers,
        excerpt: chunk.chunkText.substring(0, 300) + '...',
        similarity: chunk.similarity,
        citedInAnswer,
      };
    });
  }

  /**
   * Detect query type (heuristic)
   */
  private detectQueryType(query: string): string {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('plazo') || lowerQuery.includes('prescripción')) {
      return 'plazo';
    } else if (lowerQuery.includes('precedente') || lowerQuery.includes('jurisprudencia')) {
      return 'precedente';
    } else if (lowerQuery.includes('procedimiento') || lowerQuery.includes('trámite')) {
      return 'procedimiento';
    }

    return 'general';
  }

  /**
   * Calculate cost based on tokens
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    // GPT-4o-mini pricing (as of 2026)
    const INPUT_COST = 0.15 / 1_000_000; // $0.15 per 1M tokens
    const OUTPUT_COST = 0.60 / 1_000_000; // $0.60 per 1M tokens

    return promptTokens * INPUT_COST + completionTokens * OUTPUT_COST;
  }

  /**
   * Save query to database
   */
  private async saveQuery(data: {
    organizationId: number;
    companyId: number;
    userId: number;
    legalMatterId?: number;
    query: string;
    answer: string;
    confidence: string;
    hasValidCitations: boolean;
    needsHumanReview: boolean;
    documentsUsed: Source[];
    tokensUsed: number;
    costUsd: number;
    responseTime: number;
  }) {
    await this.prisma.jurisprudenceQuery.create({
      data: {
        organizationId: data.organizationId,
        companyId: data.companyId,
        userId: data.userId,
        legalMatterId: data.legalMatterId,
        query: data.query,
        answer: data.answer,
        confidence: data.confidence,
        hasValidCitations: data.hasValidCitations,
        needsHumanReview: data.needsHumanReview,
        documentsUsed: data.documentsUsed as any,
        tokensUsed: data.tokensUsed,
        costUsd: data.costUsd,
        responseTime: data.responseTime,
      },
    });

    this.logger.log(`Query saved: ${data.tokensUsed} tokens, $${data.costUsd.toFixed(6)}, ${data.responseTime}ms`);
  }

  /**
   * Get query history for a user or legal matter
   */
  async getQueryHistory(
    organizationId: number,
    companyId: number,
    userId?: number,
    legalMatterId?: number,
    limit: number = 50,
  ) {
    return this.prisma.jurisprudenceQuery.findMany({
      where: {
        organizationId,
        companyId,
        userId,
        legalMatterId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        legalMatter: {
          select: {
            id: true,
            title: true,
            internalCode: true,
          },
        },
      },
    });
  }
}
