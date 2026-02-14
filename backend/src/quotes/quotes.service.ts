import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { handlePrismaError } from 'src/common/errors/prisma-error.handler';

type QuoteWhatsAppPayload = {
  phone: string;
  filename: string;
  file: Express.Multer.File;
};

type QuoteStatus = 'DRAFT' | 'ISSUED' | 'CANCELLED';
type QuoteItemType = 'PRODUCT' | 'SERVICE' | 'WARRANTY';
type QuoteItemCategory = 'PC' | 'LAPTOP' | 'HARDWARE' | 'SERVICE' | 'WARRANTY';
type QuoteStockValidationMode = 'STORE' | 'GLOBAL' | 'NONE';

type QuoteItemInput = {
  productId?: number | null;
  name: string;
  description?: string | null;
  specs?: string[] | null;
  unitPrice: number;
  costPrice?: number | null;
  quantity: number;
  type?: QuoteItemType;
  category?: QuoteItemCategory;
};

type QuoteDraftInput = {
  organizationId?: number | null;
  companyId?: number | null;
  clientId?: number | null;
  clientNameSnapshot?: string | null;
  contactSnapshot?: string | null;
  currency: string;
  validity: string;
  conditions?: string | null;
  taxRate?: number | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  marginAmount?: number | null;
  total?: number | null;
  items?: QuoteItemInput[];
};

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned;
  }

  private validateQuoteItems(items: QuoteItemInput[]) {
    items.forEach((item, index) => {
      const row = index + 1;
      if (!item?.name || !item.name.trim()) {
        throw new BadRequestException(`El item ${row} no tiene nombre.`);
      }
      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new BadRequestException(
          `El item ${row} tiene precio inválido.`,
        );
      }
      if (!Number.isFinite(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(
          `El item ${row} tiene cantidad inválida.`,
        );
      }
    });
  }

  private async logQuoteEvent(input: {
    eventCode: 'DRAFT_SAVED' | 'ISSUE_ATTEMPT' | 'ISSUED' | 'ISSUE_FAILED';
    quoteId: number;
    actorId?: number | null;
    organizationId?: number | null;
    companyId?: number | null;
    summary: string;
    diff?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId ?? undefined,
          entityType: 'Quote',
          entityId: String(input.quoteId),
          action: AuditAction.OTHER,
          summary: input.summary,
          diff: {
            eventCode: input.eventCode,
            ...input.diff,
          },
          organizationId: input.organizationId ?? undefined,
          companyId: input.companyId ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar auditoría de quote (${input.eventCode}): ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }

  private async validateStockForIssue(
    tx: any,
    quote: {
      id: number;
      items: Array<{
        productId: number | null;
        quantity: number;
        type: QuoteItemType;
        name: string;
      }>;
    },
    companyId: number,
    mode: QuoteStockValidationMode,
    storeId: number | null,
  ) {
    const grouped = new Map<number, { required: number; names: Set<string> }>();
    quote.items.forEach((item) => {
      if (item.type !== 'PRODUCT') return;
      if (!item.productId) return;
      const current = grouped.get(item.productId) ?? {
        required: 0,
        names: new Set<string>(),
      };
      current.required += item.quantity;
      if (item.name) current.names.add(item.name);
      grouped.set(item.productId, current);
    });

    if (!grouped.size) return;
    if (mode === 'NONE') return;
    if (mode === 'STORE' && !storeId) {
      throw new BadRequestException(
        'Debes seleccionar una tienda para validar stock por tienda.',
      );
    }

    for (const [productId, payload] of grouped.entries()) {
      let available = 0;
      if (mode === 'STORE') {
        const record = await tx.storeOnInventory.findFirst({
          where: {
            storeId: storeId!,
            inventory: {
              productId,
            },
            store: {
              companyId,
            },
          },
          select: {
            stock: true,
          },
        });
        available = record?.stock ?? 0;
      } else {
        const aggregate = await tx.storeOnInventory.aggregate({
          where: {
            inventory: {
              productId,
            },
            store: {
              companyId,
            },
          },
          _sum: {
            stock: true,
          },
        });
        available = aggregate._sum.stock ?? 0;
      }

      if (available < payload.required) {
        const itemName = Array.from(payload.names)[0] || `producto ${productId}`;
        throw new BadRequestException(
          `Stock insuficiente para ${itemName}. Requerido: ${payload.required}, disponible: ${available}.`,
        );
      }
    }
  }

  async sendQuoteWhatsApp(payload: QuoteWhatsAppPayload) {
    const token = this.configService.get<string>('WHATSAPP_TOKEN');
    const phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );

    if (!token || !phoneNumberId) {
      throw new BadRequestException('WhatsApp no configurado.');
    }

    const cleanedPhone = this.normalizePhone(payload.phone);
    if (!cleanedPhone) {
      throw new BadRequestException('Teléfono inválido.');
    }

    const mediaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/media`;
    const messageUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    const formData = new FormData();
    const mime = payload.file.mimetype || 'application/pdf';
    const buffer = payload.file.buffer;
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: mime });
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mime);
    formData.append('file', blob, payload.filename);

    const uploadRes = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || !uploadData?.id) {
      const message =
        uploadData?.error?.message ||
        'No se pudo subir el PDF a WhatsApp.';
      this.logger.error(`WhatsApp upload failed: ${message}`);
      throw new BadRequestException(message);
    }

    const messageRes = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanedPhone,
        type: 'document',
        document: {
          id: uploadData.id,
          filename: payload.filename,
          caption: 'Cotización',
        },
      }),
    });

    const messageData = await messageRes.json().catch(() => ({}));
    if (!messageRes.ok) {
      const message =
        messageData?.error?.message ||
        'No se pudo enviar la cotización por WhatsApp.';
      this.logger.error(`WhatsApp send failed: ${message}`);
      throw new BadRequestException(message);
    }

    return messageData;
  }


  async createDraft(input: QuoteDraftInput, createdById?: number | null) {
    try {
      if (!input.companyId) {
        throw new BadRequestException('Empresa requerida.');
      }
      const items = input.items ?? [];
      this.validateQuoteItems(items);
      const quote = await this.prisma.quote.create({
        data: {
          organizationId: input.organizationId ?? null,
          companyId: input.companyId ?? null,
          clientId: input.clientId ?? null,
          clientNameSnapshot: input.clientNameSnapshot ?? null,
          contactSnapshot: input.contactSnapshot ?? null,
          currency: input.currency,
          validity: input.validity,
          conditions: input.conditions ?? null,
          taxRate: input.taxRate ?? 0.18,
          subtotal: input.subtotal ?? 0,
          taxAmount: input.taxAmount ?? 0,
          marginAmount: input.marginAmount ?? 0,
          total: input.total ?? 0,
          createdById: createdById ?? null,
          items: {
            create: items.map((item) => ({
              productId: item.productId ?? null,
              name: item.name,
              description: item.description ?? null,
              specs: item.specs ?? [],
              unitPrice: item.unitPrice,
              costPrice: item.costPrice ?? null,
              quantity: item.quantity,
              lineTotal: item.unitPrice * item.quantity,
              type: item.type ?? 'PRODUCT',
              category: item.category ?? 'HARDWARE',
            })),
          },
        },
        include: { items: true },
      });
      await this.logQuoteEvent({
        eventCode: 'DRAFT_SAVED',
        quoteId: quote.id,
        actorId: createdById ?? null,
        organizationId: input.organizationId ?? quote.organizationId ?? null,
        companyId: input.companyId ?? quote.companyId ?? null,
        summary: `Borrador de cotización guardado (${quote.id}).`,
        diff: {
          items: quote.items.length,
        },
      });
      return quote;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateDraft(
    id: number,
    input: Partial<QuoteDraftInput>,
    companyId: number,
    actorId?: number | null,
  ) {
    try {
      const quote = await this.prisma.quote.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!quote) throw new NotFoundException('Cotizaci?n no encontrada.');
      if (quote.status !== 'DRAFT') {
        throw new BadRequestException('Solo se pueden editar borradores.');
      }
      const items = input.items;
      if (items) {
        this.validateQuoteItems(items);
      }
      const updated = await this.prisma.$transaction(async (tx) => {
        if (items) {
          await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        }
        return tx.quote.update({
          where: { id },
          data: {
            clientId: input.clientId ?? undefined,
            clientNameSnapshot: input.clientNameSnapshot ?? undefined,
            contactSnapshot: input.contactSnapshot ?? undefined,
            currency: input.currency ?? undefined,
            validity: input.validity ?? undefined,
            conditions: input.conditions ?? undefined,
            taxRate: input.taxRate ?? undefined,
            subtotal: input.subtotal ?? undefined,
            taxAmount: input.taxAmount ?? undefined,
            marginAmount: input.marginAmount ?? undefined,
            total: input.total ?? undefined,
            items: items
              ? {
                  create: items.map((item) => ({
                    productId: item.productId ?? null,
                    name: item.name,
                    description: item.description ?? null,
                    specs: item.specs ?? [],
                    unitPrice: item.unitPrice,
                    costPrice: item.costPrice ?? null,
                    quantity: item.quantity,
                    lineTotal: item.unitPrice * item.quantity,
                    type: item.type ?? 'PRODUCT',
                    category: item.category ?? 'HARDWARE',
                  })),
                }
              : undefined,
          },
          include: { items: true },
        });
      });
      await this.logQuoteEvent({
        eventCode: 'DRAFT_SAVED',
        quoteId: updated.id,
        actorId: actorId ?? null,
        organizationId: updated.organizationId ?? null,
        companyId: updated.companyId ?? null,
        summary: `Borrador de cotización actualizado (${updated.id}).`,
        diff: {
          items: updated.items.length,
        },
      });
      return updated;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async issueQuote(
    id: number,
    companyId: number,
    options?: {
      stockValidationMode?: QuoteStockValidationMode;
      storeId?: number | null;
      actorId?: number | null;
    },
  ) {
    const mode =
      options?.stockValidationMode === 'STORE'
        ? 'STORE'
        : options?.stockValidationMode === 'GLOBAL'
          ? 'GLOBAL'
          : 'NONE';
    await this.logQuoteEvent({
      eventCode: 'ISSUE_ATTEMPT',
      quoteId: id,
      actorId: options?.actorId ?? null,
      companyId,
      summary: `Intento de emisión de cotización (${id}).`,
      diff: {
        stockValidationMode: mode,
        storeId: options?.storeId ?? null,
      },
    });

    try {
      const issued = await this.prisma.$transaction(async (tx) => {
      const lockRows = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id
        FROM "Quote"
        WHERE id = ${id} AND "companyId" = ${companyId}
        FOR UPDATE
      `;
      if (!lockRows.length) {
        throw new NotFoundException('Cotizaci?n no encontrada.');
      }

      const quote = await tx.quote.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!quote) throw new NotFoundException('Cotizaci?n no encontrada.');
      if (quote.status === 'ISSUED') {
        return quote;
      }
      if (quote.status === 'CANCELLED') {
        throw new BadRequestException('La cotizaci?n está cancelada.');
      }
      if (!quote.items.length) {
        throw new BadRequestException('La cotizaci?n no tiene ?tems.');
      }
      await this.validateStockForIssue(tx, quote as any, companyId, mode, options?.storeId ?? null);
      const year = new Date().getFullYear();
      const seq = await tx.quoteSequence.upsert({
        where: {
          companyId_year: { companyId, year },
        },
        update: {
          current: { increment: 1 },
        },
        create: {
          companyId,
          year,
          current: 1,
        },
      });
      const padded = String(seq.current).padStart(6, '0');
      const quoteNumber = `COT-${year}-${padded}`;
      const subtotal = quote.subtotal ?? 0;
      const taxAmount = quote.taxAmount ?? 0;
      const marginAmount = quote.marginAmount ?? 0;
      const total = quote.total ?? subtotal + taxAmount;

      return tx.quote.update({
        where: { id },
        data: {
          status: 'ISSUED' as QuoteStatus,
          quoteNumber,
          quoteYear: year,
          quoteSequence: seq.current,
          issuedAt: new Date(),
          subtotal,
          taxAmount,
          marginAmount,
          total,
        },
        include: { items: true },
      });
    });
      await this.logQuoteEvent({
        eventCode: 'ISSUED',
        quoteId: issued.id,
        actorId: options?.actorId ?? null,
        organizationId: issued.organizationId ?? null,
        companyId: issued.companyId ?? null,
        summary: `Cotización emitida (${issued.quoteNumber ?? issued.id}).`,
        diff: {
          quoteNumber: issued.quoteNumber,
          stockValidationMode: mode,
          storeId: options?.storeId ?? null,
        },
      });
      return issued;
    } catch (error) {
      await this.logQuoteEvent({
        eventCode: 'ISSUE_FAILED',
        quoteId: id,
        actorId: options?.actorId ?? null,
        companyId,
        summary: `Falló emisión de cotización (${id}).`,
        diff: {
          stockValidationMode: mode,
          storeId: options?.storeId ?? null,
          error:
            error instanceof Error ? error.message : 'error desconocido',
        },
      });
      throw error;
    }
  }

  async cancelQuote(id: number, companyId: number) {
    try {
      const quote = await this.prisma.quote.findFirst({
        where: { id, companyId },
      });
      if (!quote) throw new NotFoundException('Cotizaci?n no encontrada.');
      if (quote.status === 'CANCELLED') return quote;
      return this.prisma.quote.update({
        where: { id },
        data: {
          status: 'CANCELLED' as QuoteStatus,
          cancelledAt: new Date(),
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(companyId: number, filters: { status?: QuoteStatus; q?: string; from?: string; to?: string }) {
    try {
      const where: any = { companyId };
      if (filters.status) where.status = filters.status;
      if (filters.q) {
        where.OR = [
          { quoteNumber: { contains: filters.q, mode: 'insensitive' } },
          { clientNameSnapshot: { contains: filters.q, mode: 'insensitive' } },
        ];
      }
      if (filters.from || filters.to) {
        where.createdAt = {};
        if (filters.from) where.createdAt.gte = new Date(filters.from);
        if (filters.to) where.createdAt.lte = new Date(filters.to);
      }
      const quotes = await this.prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          createdAt: true,
          issuedAt: true,
          currency: true,
          total: true,
          clientNameSnapshot: true,
        },
      });

      const quoteIds = quotes.map((quote) => quote.id);
      if (!quoteIds.length) return quotes;

      const logs = await this.prisma.auditLog.findMany({
        where: {
          companyId,
          entityType: 'Quote',
          entityId: { in: quoteIds.map((id) => String(id)) },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          entityId: true,
          createdAt: true,
          diff: true,
        },
      });

      const latestEventByQuoteId = new Map<
        number,
        { lastEventCode: string | null; lastEventAt: Date | null }
      >();
      for (const log of logs) {
        const quoteId = Number(log.entityId);
        if (!Number.isFinite(quoteId) || latestEventByQuoteId.has(quoteId)) {
          continue;
        }
        const rawDiff =
          log.diff && typeof log.diff === 'object'
            ? (log.diff as Record<string, unknown>)
            : null;
        const eventCode =
          rawDiff && typeof rawDiff.eventCode === 'string'
            ? rawDiff.eventCode
            : null;
        latestEventByQuoteId.set(quoteId, {
          lastEventCode: eventCode,
          lastEventAt: log.createdAt ?? null,
        });
      }

      return quotes.map((quote) => {
        const eventMeta =
          latestEventByQuoteId.get(quote.id) ?? {
            lastEventCode: null,
            lastEventAt: null,
          };
        return {
          ...quote,
          ...eventMeta,
        };
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findOne(id: number, companyId: number) {
    try {
      const quote = await this.prisma.quote.findFirst({
        where: { id, companyId },
        include: { items: true },
      });
      if (!quote) throw new NotFoundException('Cotizaci?n no encontrada.');
      return quote;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findEvents(
    id: number,
    companyId: number,
    organizationId?: number | null,
  ) {
    try {
      const quote = await this.prisma.quote.findFirst({
        where: { id, companyId },
        select: { id: true, organizationId: true },
      });
      if (!quote) throw new NotFoundException('Cotizaci?n no encontrada.');
      if (
        organizationId &&
        quote.organizationId &&
        quote.organizationId !== organizationId
      ) {
        throw new NotFoundException('Cotizaci?n no encontrada.');
      }

      const logsWhere: {
        entityType: string;
        entityId: string;
        companyId: number;
        organizationId?: number;
      } = {
        entityType: 'Quote',
        entityId: String(id),
        companyId,
      };

      if (quote.organizationId) {
        logsWhere.organizationId = quote.organizationId;
      }

      const rows = await this.prisma.auditLog.findMany({
        where: logsWhere,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          actorId: true,
          actorEmail: true,
          action: true,
          summary: true,
          diff: true,
        },
      });

      return rows.map((row) => {
        const rawDiff =
          row.diff && typeof row.diff === 'object'
            ? (row.diff as Record<string, unknown>)
            : null;
        const eventCode =
          rawDiff && typeof rawDiff.eventCode === 'string'
            ? rawDiff.eventCode
            : null;
        return {
          id: row.id,
          createdAt: row.createdAt,
          actorId: row.actorId ?? null,
          actorEmail: row.actorEmail ?? null,
          action: row.action,
          eventCode,
          summary: row.summary ?? null,
          diff: rawDiff,
        };
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }
}




