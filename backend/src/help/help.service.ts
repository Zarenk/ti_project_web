import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import type { HelpMessageSource, HelpFeedback } from '@prisma/client';
import { HelpEmbeddingService } from './help-embedding.service';

export interface AskParams {
  question: string;
  section: string;
  route: string;
  userId: number;
  userRole?: string;
}

export interface HelpStep {
  text: string;
  image?: string;
}

export interface AskResult {
  messageId: number;
  answer: string;
  source: 'static' | 'ai' | 'promoted';
  steps?: HelpStep[];
}

export interface ConversationMessage {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  source: HelpMessageSource | null;
  section: string | null;
  feedback: HelpFeedback | null;
  createdAt: Date;
}

export interface AnalyticsResult {
  queries7d: number;
  queries30d: number;
  kbPercent: number;
  satisfactionPercent: number;
  topUnanswered: Array<{ question: string; count: number; section: string }>;
  topNegative: Array<{ question: string; answer: string; negCount: number; section: string }>;
  candidates: Array<{
    id: number;
    question: string;
    answer: string;
    section: string;
    positiveVotes: number;
    negativeVotes: number;
    createdAt: Date;
  }>;
}

// Section context used to build the AI prompt
const SECTION_DESCRIPTIONS: Record<string, string> = {
  inventory:
    'Inventario: ver stock actual, filtrar por categoria/marca, alertas de stock bajo, exportar a PDF/Excel, trasladar productos entre tiendas.',
  products:
    'Productos: crear/editar productos, subir imagenes, gestionar marcas, precios, especificaciones tecnicas, galeria de productos.',
  sales:
    'Ventas: realizar ventas, historial, descuentos, metodos de pago, reportes de ventas, resumen diario.',
  entries:
    'Ingresos: registrar compras/ingresos de mercaderia, importar desde factura PDF, borradores, seleccionar proveedor.',
  categories: 'Categorias: crear/editar/eliminar categorias, asignar productos.',
  providers:
    'Proveedores: agregar/editar proveedores, datos de contacto, historial de compras.',
  users:
    'Usuarios: crear cuentas, asignar roles y permisos, cambiar contrasena, desactivar usuarios, sesiones activas.',
  tenancy:
    'Organizaciones: crear organizaciones, gestionar empresas, cambiar vertical de negocio, compatibilidad, esquema de productos.',
  stores:
    'Tiendas/Sucursales: crear tiendas, asignar usuarios, establecer tienda principal, direccion.',
  exchange: 'Tipo de Cambio: ver tasa actual, actualizar, historial.',
  catalog:
    'Catalogo: exportar catalogo, personalizar portada, seleccionar productos, compartir enlace.',
  quotes:
    'Cotizaciones: crear cotizacion, agregar productos, margenes, generar PDF, enviar a cliente.',
  accounting:
    'Contabilidad: plan de cuentas, diarios, asientos contables, libro mayor, balance de comprobacion.',
  cashregister:
    'Caja: abrir/cerrar caja, arqueo, movimientos, balance diario.',
  messages:
    'Mensajes: ver conversaciones con clientes, responder, filtrar pendientes.',
  orders:
    'Pedidos: ver pedidos, estados, procesar, cancelar, timeline de seguimiento.',
  general:
    'Panel general: navegacion, perfil, modo oscuro, notificaciones, roles del sistema.',
};

const MAX_CONTEXT_MESSAGES = 10;
const MAX_CONTENT_LENGTH = 200;
const PROMOTION_THRESHOLD = 3;

/** Patterns that indicate a casual/social message rather than a system question */
const CASUAL_PATTERNS = [
  /^(hola|hey|hi|hello|buenas|saludos|holi|ey|que tal|buenos dias|buenas tardes|buenas noches)\b/,
  /^(como estas|como te va|como andas|todo bien|que tal estas|como te encuentras)/,
  /^(gracias|muchas gracias|te agradezco|mil gracias|thanks)/,
  /^(adios|chau|bye|hasta luego|nos vemos|chao|hasta pronto)/,
  /^(ok|vale|listo|entendido|de acuerdo|dale|okey|okay|si|ya)\s*[!.]*$/,
  /^(quien eres|que eres|como te llamas|eres un robot|eres humano|eres una ia)/,
  /^(que puedes hacer|para que sirves|en que me ayudas|como me puedes ayudar)/,
  /^(cuentame|dime algo|hazme reir|chiste)/,
  /^(eres genial|buen trabajo|excelente|increible|eres el mejor|muy bien|perfecto)\s*[!.]*$/,
  /^(necesito ayuda|ayudame|help|ayuda|me ayudas|una consulta|tengo una duda)/,
];

@Injectable()
export class HelpService {
  private readonly logger = new Logger(HelpService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly embeddingService: HelpEmbeddingService,
  ) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!this.apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY not configured. AI help fallback will be unavailable.',
      );
    }
  }

  /** Check if a message is casual/social rather than a system question */
  private isCasualMessage(text: string): boolean {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    return CASUAL_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  /** Normalize a question for deduplication */
  private normalizeQuestion(q: string): string {
    return q
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Get or create the user's active conversation */
  private async getOrCreateConversation(userId: number) {
    let conversation = await this.prisma.helpConversation.findFirst({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.helpConversation.create({
        data: { userId },
      });
    }

    return conversation;
  }

  /** Load full conversation history */
  async getConversation(userId: number): Promise<ConversationMessage[]> {
    const conversation = await this.prisma.helpConversation.findFirst({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) return [];

    const messages = await this.prisma.helpMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        source: true,
        section: true,
        feedback: true,
        createdAt: true,
      },
    });

    return messages;
  }

  /** Main ask method — persists messages and uses conversation context */
  async ask(params: AskParams): Promise<AskResult> {
    const conversation = await this.getOrCreateConversation(params.userId);

    // Persist user message
    await this.prisma.helpMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: params.question,
        section: params.section,
        route: params.route,
      },
    });

    await this.prisma.helpConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 1. Semantic search via embeddings (if available)
    let bestEmbeddingResult: { answer: string; sourceType: string; sourceId: string; similarity: number } | null = null;
    let embeddingContext: Array<{ question: string; answer: string; similarity: number }> = [];

    if (this.embeddingService.isReady) {
      const queryEmbedding = await this.embeddingService.embedQuery(params.question);
      if (queryEmbedding) {
        const results = this.embeddingService.searchSimilar(
          queryEmbedding,
          params.section,
          3,
        );
        const best = results[0];

        if (best) {
          this.logger.debug(
            `Embedding search: "${params.question}" → best="${best.question}" similarity=${best.similarity.toFixed(3)}`,
          );

          // Adaptive threshold: casual messages use lower threshold
          const baseThreshold = Number(this.config.get<string>('HELP_EMBEDDING_THRESHOLD')) || 0.65;
          const isCasual = this.isCasualMessage(params.question);
          const threshold = isCasual ? Math.min(baseThreshold, 0.50) : baseThreshold;

          if (best.similarity >= threshold) {
            const source: HelpMessageSource = best.sourceType === 'promoted' ? 'PROMOTED' : 'STATIC';
            const steps = this.embeddingService.getSteps(best.sourceId);
            const assistantMsg = await this.prisma.helpMessage.create({
              data: {
                conversationId: conversation.id,
                role: 'ASSISTANT',
                content: best.answer,
                source,
                section: params.section,
                route: params.route,
                score: best.similarity,
              },
            });
            return {
              messageId: assistantMsg.id,
              answer: best.answer,
              source: best.sourceType === 'promoted' ? 'promoted' : 'static',
              steps,
            };
          }

          // Save for potential best-effort fallback (no AI key)
          if (best.similarity >= 0.40) {
            bestEmbeddingResult = { answer: best.answer, sourceType: best.sourceType, sourceId: best.sourceId, similarity: best.similarity };
          }

          // Save top results as RAG context for AI (any similarity > 0.30)
          embeddingContext = results
            .filter((r) => r.similarity >= 0.30)
            .map((r) => ({ question: r.question, answer: r.answer, similarity: r.similarity }));
        }
      }
    }

    // 2. Fallback: exact match on approved candidates (when embeddings unavailable)
    if (!this.embeddingService.isReady) {
      const questionNorm = this.normalizeQuestion(params.question);
      const candidate = await this.prisma.helpKBCandidate.findFirst({
        where: { questionNorm, section: params.section, status: 'APPROVED' },
      });
      if (candidate) {
        const assistantMsg = await this.prisma.helpMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: candidate.answer,
            source: 'PROMOTED',
            section: params.section,
            route: params.route,
            score: 1.0,
          },
        });
        return { messageId: assistantMsg.id, answer: candidate.answer, source: 'promoted' };
      }
    }

    // 3. If AI is not available, use best-effort: partial match or section-aware fallback
    if (!this.apiKey) {
      // 3a. Partial embedding match (similarity 0.40+)
      if (bestEmbeddingResult) {
        const source: HelpMessageSource = bestEmbeddingResult.sourceType === 'promoted' ? 'PROMOTED' : 'STATIC';
        const steps = this.embeddingService.getSteps(bestEmbeddingResult.sourceId);
        const assistantMsg = await this.prisma.helpMessage.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: bestEmbeddingResult.answer,
            source,
            section: params.section,
            route: params.route,
            score: bestEmbeddingResult.similarity,
          },
        });
        return {
          messageId: assistantMsg.id,
          answer: bestEmbeddingResult.answer,
          source: bestEmbeddingResult.sourceType === 'promoted' ? 'promoted' : 'static',
          steps,
        };
      }

      // 3b. Section-aware fallback: use section description as context
      const sectionDesc = SECTION_DESCRIPTIONS[params.section];
      const fallbackAnswer = sectionDesc
        ? `Estoy en proceso de aprendizaje y aun no tengo una respuesta exacta para eso. Pero puedo ayudarte con lo que se de esta seccion:\n\n${sectionDesc}\n\nIntenta preguntar algo mas especifico sobre estas funcionalidades, o reformula tu pregunta.`
        : 'No tengo una respuesta para eso todavia. Intenta preguntar sobre una funcionalidad especifica del sistema, por ejemplo: "como registro una venta" o "como agrego un producto".';

      const assistantMsg = await this.prisma.helpMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: fallbackAnswer,
          source: 'STATIC',
          section: params.section,
          route: params.route,
        },
      });
      return { messageId: assistantMsg.id, answer: fallbackAnswer, source: 'static' };
    }

    // 4. RAG: Call AI with conversation context + retrieved embedding context
    const answer = await this.callAI(params, conversation.id, embeddingContext);
    const source: HelpMessageSource = 'AI';

    const assistantMsg = await this.prisma.helpMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: answer,
        source,
        section: params.section,
        route: params.route,
      },
    });

    return { messageId: assistantMsg.id, answer, source: 'ai' };
  }

  /** Call Anthropic API with conversation history + RAG context */
  private async callAI(
    params: AskParams,
    conversationId: number,
    embeddingContext: Array<{ question: string; answer: string; similarity: number }> = [],
  ): Promise<string> {
    if (!this.apiKey) {
      return 'El asistente de IA no esta configurado en este momento. Intenta reformular tu pregunta.';
    }

    const sectionDesc =
      SECTION_DESCRIPTIONS[params.section] ?? SECTION_DESCRIPTIONS.general;

    // Load recent conversation history for context
    const recentMessages = await this.prisma.helpMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONTEXT_MESSAGES + 1, // +1 because the current user message is already saved
      select: { role: true, content: true },
    });

    // Reverse to chronological order and exclude the current message (already in params.question)
    const history = recentMessages.reverse().slice(0, -1);

    // Load approved candidates for this section as extra knowledge
    const approvedKB = await this.prisma.helpKBCandidate.findMany({
      where: { section: params.section, status: 'APPROVED' },
      take: 10,
      select: { question: true, answer: true },
    });

    const kbBlock = approvedKB.length > 0
      ? `\n\nRespuestas verificadas para esta seccion:\n${approvedKB.map((k) => `P: ${k.question}\nR: ${k.answer}`).join('\n\n')}`
      : '';

    const isCasual = this.isCasualMessage(params.question);

    const personalityBlock = `Eres el asistente virtual de ADSLab, una plataforma de gestion empresarial.
Tu personalidad: eres amigable, cercano y profesional. Usas un tono calido pero conciso. Puedes responder saludos, agradecimientos y charla casual de forma breve y natural antes de ofrecer tu ayuda con el sistema.`;

    // Build RAG context block from embedding search results
    const ragBlock = embeddingContext.length > 0
      ? `\n\nInformacion relevante encontrada en la base de conocimiento (usa esto como contexto principal para tu respuesta, adapta y complementa segun la pregunta del usuario):
${embeddingContext.map((r) => `P: ${r.question}\nR: ${r.answer}\n(relevancia: ${Math.round(r.similarity * 100)}%)`).join('\n\n')}`
      : '';

    const systemPrompt = isCasual
      ? `${personalityBlock}

El usuario te ha enviado un mensaje casual o de cortesia. Responde de forma amigable y natural, y luego ofrecele brevemente tu ayuda con el sistema.

Contexto: el usuario esta en la seccion "${params.section}" del sistema.
Rol del usuario: ${params.userRole ?? 'no especificado'}

Reglas:
- Responde de forma breve (maximo 2-3 oraciones)
- Se calido y cercano
- Termina ofreciendo ayuda con el sistema de forma natural
- Responde en espanol
- No uses markdown complejo`
      : `${personalityBlock}

Tu funcion principal es ayudar con las funcionalidades del sistema. Si la pregunta no es sobre la plataforma y no es un saludo o cortesia, indica amablemente que tu especialidad es el sistema ADSLab y ofrece ayudar con eso.

El usuario esta actualmente en la seccion: ${params.section}
Ruta: ${params.route}
Rol del usuario: ${params.userRole ?? 'no especificado'}

Funcionalidades disponibles en esta seccion:
${sectionDesc}${kbBlock}${ragBlock}

Reglas:
- Si hay informacion relevante de la base de conocimiento, usala como base para tu respuesta. Adapta el lenguaje y complementa con detalles utiles.
- Si la informacion encontrada responde directamente la pregunta, basate en ella sin inventar pasos adicionales.
- Si la informacion es parcialmente relevante, usala como contexto y complementa con lo que sepas de la seccion.
- Responde de forma concisa (maximo 150 palabras), en espanol, usa lenguaje simple.
- Si mencionas un boton o accion, indica donde encontrarlo en la interfaz.
- No uses markdown complejo, solo texto plano con negritas (**texto**) si es necesario.`;

    // Build messages array with history
    const aiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const msg of history) {
      const role = msg.role === 'USER' ? 'user' : 'assistant';
      const content = msg.content.length > MAX_CONTENT_LENGTH
        ? msg.content.slice(0, MAX_CONTENT_LENGTH) + '...'
        : msg.content;
      aiMessages.push({ role, content });
    }
    aiMessages.push({ role: 'user', content: params.question });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          messages: aiMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Anthropic API error: ${response.status} ${errorText}`);
        throw new Error('AI service unavailable');
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text: string }>;
      };

      return (
        data.content?.find((c) => c.type === 'text')?.text ??
        'No pude generar una respuesta.'
      );
    } catch (error) {
      this.logger.error('Failed to call AI service', error);
      return 'No se pudo consultar el asistente de IA en este momento. Intenta de nuevo mas tarde.';
    }
  }

  /** Record feedback and trigger candidate promotion if threshold met */
  async recordFeedback(
    messageId: number,
    feedback: 'POSITIVE' | 'NEGATIVE',
    userId: number,
  ): Promise<void> {
    const message = await this.prisma.helpMessage.findUnique({
      where: { id: messageId },
      select: { id: true, role: true, content: true, source: true, section: true, createdAt: true, conversationId: true, conversation: { select: { userId: true } } },
    });

    if (!message || message.role !== 'ASSISTANT') return;
    if (message.conversation.userId !== userId) return;

    await this.prisma.helpMessage.update({
      where: { id: messageId },
      data: { feedback },
    });

    // Auto-promotion logic: only for AI-sourced messages with positive feedback
    if (feedback === 'POSITIVE' && message.source === 'AI' && message.section) {
      // Find the user question (previous message in the conversation)
      const userQuestion = await this.prisma.helpMessage.findFirst({
        where: {
          conversationId: message.conversationId,
          role: 'USER',
          createdAt: { lt: message.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      });

      if (userQuestion) {
        const questionNorm = this.normalizeQuestion(userQuestion.content);

        // Count total positive feedbacks for this normalized question in this section
        const positiveCount = await this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM "HelpMessage" hm
           JOIN "HelpMessage" hq ON hq."conversationId" = hm."conversationId"
             AND hq."role" = 'USER'
             AND hq."createdAt" < hm."createdAt"
           WHERE hm."role" = 'ASSISTANT'
             AND hm."source" = 'AI'
             AND hm."feedback" = 'POSITIVE'
             AND hm."section" = $1
             AND LOWER(TRIM(hq."content")) = $2`,
          message.section,
          userQuestion.content.toLowerCase().trim(),
        );

        const count = Number(positiveCount[0]?.count ?? 0);

        if (count >= PROMOTION_THRESHOLD) {
          // Upsert candidate
          await this.prisma.helpKBCandidate.upsert({
            where: {
              questionNorm_section: {
                questionNorm,
                section: message.section,
              },
            },
            create: {
              question: userQuestion.content,
              questionNorm,
              answer: message.content,
              section: message.section,
              positiveVotes: count,
              status: 'PENDING',
            },
            update: {
              positiveVotes: count,
            },
          });
        }
      }
    }
  }

  /** Get analytics data for SUPER_ADMIN */
  async getAnalytics(): Promise<AnalyticsResult> {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [queries7d, queries30d, totalBySource, feedbackStats] = await Promise.all([
      this.prisma.helpMessage.count({ where: { role: 'USER', createdAt: { gte: d7 } } }),
      this.prisma.helpMessage.count({ where: { role: 'USER', createdAt: { gte: d30 } } }),
      this.prisma.helpMessage.groupBy({
        by: ['source'],
        where: { role: 'ASSISTANT', createdAt: { gte: d30 } },
        _count: { id: true },
      }),
      this.prisma.helpMessage.groupBy({
        by: ['feedback'],
        where: { role: 'ASSISTANT', feedback: { not: null }, createdAt: { gte: d30 } },
        _count: { id: true },
      }),
    ]);

    // Calculate KB percent
    const staticCount = totalBySource.find((s) => s.source === 'STATIC')?._count.id ?? 0;
    const promotedCount = totalBySource.find((s) => s.source === 'PROMOTED')?._count.id ?? 0;
    const totalResponses = totalBySource.reduce((sum, s) => sum + s._count.id, 0);
    const kbPercent = totalResponses > 0 ? Math.round(((staticCount + promotedCount) / totalResponses) * 100) : 0;

    // Satisfaction
    const positiveTotal = feedbackStats.find((f) => f.feedback === 'POSITIVE')?._count.id ?? 0;
    const totalFeedback = feedbackStats.reduce((sum, f) => sum + f._count.id, 0);
    const satisfactionPercent = totalFeedback > 0 ? Math.round((positiveTotal / totalFeedback) * 100) : 0;

    // Top unanswered (AI fallback questions)
    const topUnanswered = await this.prisma.$queryRaw<Array<{ question: string; count: bigint; section: string }>>`
      SELECT hq."content" as question, COUNT(*) as count, hm."section" as section
      FROM "HelpMessage" hm
      JOIN "HelpMessage" hq ON hq."conversationId" = hm."conversationId"
        AND hq."role" = 'USER'
        AND hq."createdAt" < hm."createdAt"
      WHERE hm."role" = 'ASSISTANT'
        AND hm."source" = 'AI'
        AND hm."createdAt" >= ${d30}
      GROUP BY hq."content", hm."section"
      ORDER BY count DESC
      LIMIT 10
    `;

    // Top negative feedback
    const topNegative = await this.prisma.$queryRaw<Array<{ question: string; answer: string; neg_count: bigint; section: string }>>`
      SELECT hq."content" as question, hm."content" as answer, COUNT(*) as neg_count, hm."section" as section
      FROM "HelpMessage" hm
      JOIN "HelpMessage" hq ON hq."conversationId" = hm."conversationId"
        AND hq."role" = 'USER'
        AND hq."createdAt" < hm."createdAt"
      WHERE hm."role" = 'ASSISTANT'
        AND hm."feedback" = 'NEGATIVE'
        AND hm."createdAt" >= ${d30}
      GROUP BY hq."content", hm."content", hm."section"
      ORDER BY neg_count DESC
      LIMIT 10
    `;

    // Pending candidates
    const candidates = await this.prisma.helpKBCandidate.findMany({
      where: { status: 'PENDING' },
      orderBy: { positiveVotes: 'desc' },
      select: {
        id: true,
        question: true,
        answer: true,
        section: true,
        positiveVotes: true,
        negativeVotes: true,
        createdAt: true,
      },
    });

    return {
      queries7d,
      queries30d,
      kbPercent,
      satisfactionPercent,
      topUnanswered: topUnanswered.map((r) => ({ ...r, count: Number(r.count) })),
      topNegative: topNegative.map((r) => ({ question: r.question, answer: r.answer, negCount: Number(r.neg_count), section: r.section })),
      candidates,
    };
  }

  /** Review a KB candidate (SUPER_ADMIN only) */
  async reviewCandidate(
    candidateId: number,
    status: 'APPROVED' | 'REJECTED',
    adminId: number,
    editedAnswer?: string,
  ): Promise<void> {
    const candidate = await this.prisma.helpKBCandidate.update({
      where: { id: candidateId },
      data: {
        status,
        approvedById: adminId,
        reviewedAt: new Date(),
        ...(editedAnswer ? { answer: editedAnswer } : {}),
      },
    });

    // Auto-generate embedding when approved
    if (status === 'APPROVED') {
      this.embeddingService.onCandidateApproved({
        id: candidateId,
        question: candidate.question,
        answer: editedAnswer ?? candidate.answer,
        section: candidate.section,
      }).catch((err) =>
        this.logger.warn(
          `Failed to generate embedding for candidate ${candidateId}: ${err instanceof Error ? err.message : err}`,
        ),
      );
    }
  }
}
