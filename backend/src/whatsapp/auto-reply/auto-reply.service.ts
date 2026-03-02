import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp.service';
import { HelpEmbeddingService } from '../../help/help-embedding.service';
import { AiProviderManager } from '../../help/ai-providers/ai-provider-manager';

const GREETINGS = new Set([
  'hola', 'buenas', 'hi', 'hello', 'hey', 'ola',
  'buenos dias', 'buen dia', 'buenas tardes', 'buenas noches',
  'que tal', 'como estas', 'saludos',
]);

/** Normalize text for matching: lowercase, trim, remove accents */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);

  /**
   * In-memory daily reply counts per contact.
   * Key: `orgId:compId:phone`, Value: { count, date (YYYY-MM-DD) }
   */
  private dailyReplyCounts = new Map<string, { count: number; date: string }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly embeddingService: HelpEmbeddingService,
    private readonly aiProvider: AiProviderManager,
  ) {}

  // ============================================================================
  // EVENT HANDLER — Main entry point
  // ============================================================================

  @OnEvent('whatsapp.message.received')
  async handleIncomingMessage(payload: {
    organizationId: number;
    companyId: number;
    from: string;
    content: string;
    messageType: string;
  }) {
    // Only reply to text messages
    if (payload.messageType !== 'TEXT') {
      this.logger.debug(`Skipping non-TEXT message (type: ${payload.messageType}) from ${payload.from}`);
      return;
    }
    if (!payload.content || payload.content.trim().length === 0) return;

    try {
      const config = await this.prisma.whatsAppAutoReplyConfig.findUnique({
        where: {
          organizationId_companyId: {
            organizationId: payload.organizationId,
            companyId: payload.companyId,
          },
        },
      });

      if (!config) {
        this.logger.debug(`No auto-reply config found for org=${payload.organizationId} company=${payload.companyId}`);
        return;
      }
      if (!config.isEnabled) {
        this.logger.debug(`Auto-reply disabled for org=${payload.organizationId} company=${payload.companyId}`);
        return;
      }

      // Check daily limit for this contact
      const phone = this.normalizePhone(payload.from);
      if (this.isDailyLimitReached(payload.organizationId, payload.companyId, phone, config.maxRepliesPerContactPerDay)) {
        this.logger.debug(`Daily limit reached for ${phone}, skipping auto-reply`);
        return;
      }

      // Run matching pipeline
      const result = await this.matchAndReply(
        payload.organizationId,
        payload.companyId,
        config,
        payload.content,
      );

      if (!result) return;

      // Send the reply via WhatsApp
      await this.whatsappService.sendMessage(
        payload.organizationId,
        payload.companyId,
        {
          to: phone,
          content: result.reply,
        },
      );

      // Increment daily counter
      this.incrementDailyCount(payload.organizationId, payload.companyId, phone);

      // Log the auto-reply
      await this.prisma.whatsAppAutoReplyLog.create({
        data: {
          organizationId: payload.organizationId,
          companyId: payload.companyId,
          contactPhone: phone,
          incomingMessage: payload.content.slice(0, 1000),
          replyMessage: result.reply,
          matchType: result.matchType,
          matchScore: result.matchScore,
          ruleId: result.ruleId,
        },
      });

      this.logger.log(
        `Auto-reply [${result.matchType}] to ${phone}: "${result.reply.slice(0, 60)}..."`,
      );
    } catch (error) {
      this.logger.error(
        `Auto-reply failed for ${payload.from}: ${(error as Error).message}`,
      );
    }
  }

  // ============================================================================
  // MATCHING PIPELINE
  // ============================================================================

  private async matchAndReply(
    organizationId: number,
    companyId: number,
    config: {
      id: number;
      greetingMessage: string;
      fallbackMessage: string;
      aiEnabled: boolean;
    },
    message: string,
  ): Promise<{ reply: string; matchType: string; matchScore?: number; ruleId?: number } | null> {
    const normalized = normalize(message);

    // Step 1: Greeting detection
    if (this.isGreeting(normalized)) {
      return { reply: config.greetingMessage, matchType: 'greeting' };
    }

    // Step 2: Custom rules (keyword match)
    const ruleMatch = await this.matchRules(config.id, normalized);
    if (ruleMatch) {
      return {
        reply: ruleMatch.answer,
        matchType: 'rule',
        ruleId: ruleMatch.id,
      };
    }

    // Step 3: KB embedding search
    const kbMatch = await this.searchKB(message, organizationId);
    if (kbMatch) {
      return {
        reply: kbMatch.answer,
        matchType: 'kb',
        matchScore: kbMatch.similarity,
      };
    }

    // Step 4: AI fallback
    if (config.aiEnabled) {
      const aiReply = await this.askAI(message, organizationId, companyId);
      if (aiReply) {
        return { reply: aiReply, matchType: 'ai' };
      }
    }

    // Step 5: Fallback message
    return { reply: config.fallbackMessage, matchType: 'fallback' };
  }

  // ============================================================================
  // STEP 1: GREETING DETECTION
  // ============================================================================

  private isGreeting(normalized: string): boolean {
    // Direct match
    if (GREETINGS.has(normalized)) return true;
    // Check if the message starts with a greeting word (e.g., "hola como estas")
    const firstWord = normalized.split(/\s+/)[0];
    return GREETINGS.has(firstWord);
  }

  // ============================================================================
  // STEP 2: CUSTOM RULES (KEYWORD MATCH)
  // ============================================================================

  private async matchRules(
    configId: number,
    normalized: string,
  ): Promise<{ id: number; answer: string } | null> {
    const rules = await this.prisma.whatsAppAutoReplyRule.findMany({
      where: { configId, isActive: true },
      orderBy: { priority: 'desc' },
    });

    for (const rule of rules) {
      const matched = rule.keywords.some((keyword) => {
        const normalizedKeyword = normalize(keyword);
        return normalized.includes(normalizedKeyword);
      });

      if (matched) {
        return { id: rule.id, answer: rule.answer };
      }
    }

    return null;
  }

  // ============================================================================
  // STEP 3: KB EMBEDDING SEARCH
  // ============================================================================

  private async searchKB(
    message: string,
    organizationId: number,
  ): Promise<{ answer: string; similarity: number } | null> {
    try {
      const queryEmbedding = await this.embeddingService.embedQuery(message);
      if (!queryEmbedding) return null;

      const results = this.embeddingService.searchSimilar(
        queryEmbedding,
        null, // no section filter — search all KB
        1,
        organizationId,
      );

      const best = results[0];
      if (best && best.similarity >= 0.65) {
        // Truncate answer for WhatsApp (max ~1000 chars for readability)
        const answer = best.answer.length > 1000
          ? best.answer.slice(0, 997) + '...'
          : best.answer;
        return { answer, similarity: best.similarity };
      }
    } catch (error) {
      this.logger.warn(`KB search failed: ${(error as Error).message}`);
    }

    return null;
  }

  // ============================================================================
  // STEP 4: AI FALLBACK
  // ============================================================================

  private async askAI(
    message: string,
    organizationId: number,
    companyId: number,
  ): Promise<string | null> {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, sunatBusinessName: true },
      });

      const companyName = company?.sunatBusinessName || company?.name || 'la empresa';

      const systemPrompt = [
        `Eres el asistente virtual de ${companyName} en WhatsApp.`,
        'Responde de forma breve, amigable y profesional (maximo 500 caracteres).',
        'Si no sabes la respuesta con certeza, di que un agente contactara al cliente pronto.',
        'No inventes informacion sobre productos, precios, horarios o politicas.',
        'Responde siempre en espanol.',
      ].join('\n');

      const response = await this.aiProvider.chat({
        systemPrompt,
        messages: [{ role: 'user', content: message }],
        maxTokens: 300,
      });

      if (response?.text) {
        // Truncate to 500 chars for WhatsApp brevity
        return response.text.length > 500
          ? response.text.slice(0, 497) + '...'
          : response.text;
      }
    } catch (error) {
      this.logger.warn(`AI fallback failed: ${(error as Error).message}`);
    }

    return null;
  }

  // ============================================================================
  // RATE LIMITING (Per-contact daily cap)
  // ============================================================================

  private getDailyKey(orgId: number, compId: number, phone: string): string {
    return `${orgId}:${compId}:${phone}`;
  }

  private getToday(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private isDailyLimitReached(
    orgId: number,
    compId: number,
    phone: string,
    maxReplies: number,
  ): boolean {
    const key = this.getDailyKey(orgId, compId, phone);
    const entry = this.dailyReplyCounts.get(key);
    const today = this.getToday();

    if (!entry || entry.date !== today) return false;
    return entry.count >= maxReplies;
  }

  private incrementDailyCount(orgId: number, compId: number, phone: string) {
    const key = this.getDailyKey(orgId, compId, phone);
    const today = this.getToday();
    const entry = this.dailyReplyCounts.get(key);

    if (!entry || entry.date !== today) {
      this.dailyReplyCounts.set(key, { count: 1, date: today });
    } else {
      entry.count++;
    }

    // Cleanup old entries periodically (when map grows large)
    if (this.dailyReplyCounts.size > 5000) {
      for (const [k, v] of this.dailyReplyCounts) {
        if (v.date !== today) this.dailyReplyCounts.delete(k);
      }
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private normalizePhone(jid: string): string {
    // Remove WhatsApp JID suffix (@s.whatsapp.net)
    return jid.replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');
  }
}
