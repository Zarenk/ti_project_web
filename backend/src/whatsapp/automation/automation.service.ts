import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp.service';
import { CreateAutomationDto, UpdateAutomationDto } from '../dto/automation.dto';
import { resolveBackendPath } from '../../utils/path-utils';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  // Deduplication: prevent same event+entity from triggering multiple sends
  // Key: "event:entityId" → timestamp of last execution
  private readonly deduplicationWindow = new Map<string, number>();
  private static readonly DEDUP_WINDOW_MS = 60_000; // 1 minute dedup window

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
  ) {}

  /**
   * Check if this event has already been processed recently (deduplication).
   * Returns true if the event should be SKIPPED.
   */
  private isDuplicate(eventName: string, entityId: number): boolean {
    const key = `${eventName}:${entityId}`;
    const now = Date.now();
    const lastExec = this.deduplicationWindow.get(key);

    if (lastExec && now - lastExec < AutomationService.DEDUP_WINDOW_MS) {
      this.logger.warn(`Dedup: skipping duplicate ${key} (last exec ${Math.round((now - lastExec) / 1000)}s ago)`);
      return true;
    }

    this.deduplicationWindow.set(key, now);

    // Housekeep every 50 entries
    if (this.deduplicationWindow.size > 200) {
      for (const [k, ts] of this.deduplicationWindow) {
        if (now - ts > AutomationService.DEDUP_WINDOW_MS) this.deduplicationWindow.delete(k);
      }
    }

    return false;
  }

  // ============================================================================
  // CRUD Automations
  // ============================================================================

  async createAutomation(
    organizationId: number,
    companyId: number,
    dto: CreateAutomationDto,
  ) {
    const session = await this.whatsappService.getSession(organizationId, companyId);
    if (!session) {
      throw new Error('WhatsApp session not found');
    }

    return this.prisma.whatsAppAutomation.create({
      data: {
        sessionId: session.id,
        organizationId,
        companyId,
        ...dto,
      },
    });
  }

  async updateAutomation(id: number, dto: UpdateAutomationDto) {
    return this.prisma.whatsAppAutomation.update({
      where: { id },
      data: dto,
    });
  }

  async deleteAutomation(id: number) {
    return this.prisma.whatsAppAutomation.delete({
      where: { id },
    });
  }

  async getAutomations(organizationId: number, companyId: number) {
    return this.prisma.whatsAppAutomation.findMany({
      where: { organizationId, companyId },
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAutomationLogs(automationId: number, limit: number = 50) {
    return this.prisma.whatsAppAutomationLog.findMany({
      where: { automationId },
      orderBy: { executedAt: 'desc' },
      take: limit,
    });
  }

  // ============================================================================
  // EVENT HANDLERS - Trigger automations on business events
  // ============================================================================

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  // NOTE: The following events (sale.created, payment.overdue, inventory.low-stock,
  // quote.created) are NOT currently emitted anywhere in the codebase.
  // They are wired up for future use. The handlers include deduplication and
  // rate limiting via the WhatsApp service to prevent bans.
  // ============================================================================

  @OnEvent('sale.created')
  async handleSaleCreated(payload: {
    saleId: number;
    organizationId: number;
    companyId: number;
  }) {
    try {
      // Dedup: skip if this exact sale was already processed recently
      if (this.isDuplicate('sale.created', payload.saleId)) return;

      await this.executeAutomations('sale.created', payload);

      // Get sale details
      const sale = await this.prisma.sales.findUnique({
        where: { id: payload.saleId },
        include: {
          client: true,
          salesDetails: true,
        },
      });

      if (!sale || !sale.client?.phone) {
        this.logger.warn(`Sale #${payload.saleId} has no client phone, skipping notification`);
        return;
      }

      // Get product names for the sale details
      const productNames = await Promise.all(
        sale.salesDetails.map(async (d) => {
          const product = await this.prisma.product.findUnique({
            where: { id: d.productId },
            select: { name: true },
          });
          return `- ${product?.name || 'Producto'} (x${d.quantity})`;
        })
      );

      const products = productNames.join('\n');

      const message = [
        `Pedido Confirmado`,
        '',
        `Hola ${sale.client.name},`,
        '',
        `Tu pedido #${sale.id} ha sido confirmado.`,
        '',
        `Productos:`,
        products,
        '',
        `Total: S/ ${sale.total.toFixed(2)}`,
        '',
        `Gracias por tu compra.`,
      ].join('\n');

      await this.whatsappService.sendMessage(payload.organizationId, payload.companyId, {
        to: sale.client.phone,
        content: message,
        clientId: sale.clientId,
        salesId: sale.id,
      });

      this.logger.log(`Order confirmation sent for sale #${sale.id}`);
    } catch (error) {
      this.logger.error(`Error handling sale.created event`, error);
    }
  }

  @OnEvent('payment.overdue')
  async handlePaymentOverdue(payload: {
    invoiceId: number;
    organizationId: number;
    companyId: number;
  }) {
    try {
      if (this.isDuplicate('payment.overdue', payload.invoiceId)) return;

      await this.executeAutomations('payment.overdue', payload);

      const invoice = await this.prisma.invoiceSales.findUnique({
        where: { id: payload.invoiceId },
        include: {
          sales: {
            include: {
              client: true,
            },
          },
        },
      });

      if (!invoice || !invoice.sales.client?.phone) {
        this.logger.warn(`Invoice #${payload.invoiceId} has no client phone`);
        return;
      }

      const message = [
        `Recordatorio de Pago`,
        '',
        `Hola ${invoice.sales.client.name},`,
        '',
        `Tu factura #${invoice.serie}-${invoice.nroCorrelativo} esta vencida.`,
        '',
        `Monto: S/ ${invoice.total}`,
        `Vencimiento: ${invoice.fechaEmision?.toLocaleDateString('es-PE')}`,
        '',
        `Por favor, procede con el pago a la brevedad.`,
      ].join('\n');

      await this.whatsappService.sendMessage(payload.organizationId, payload.companyId, {
        to: invoice.sales.client.phone,
        content: message,
        clientId: invoice.sales.clientId,
        invoiceId: invoice.id,
      });

      this.logger.log(`Payment reminder sent for invoice #${invoice.id}`);
    } catch (error) {
      this.logger.error(`Error handling payment.overdue event`, error);
    }
  }

  @OnEvent('inventory.low-stock')
  async handleLowStock(payload: {
    productId: number;
    currentStock: number;
    minStock: number;
    organizationId: number;
    companyId: number;
  }) {
    try {
      if (this.isDuplicate('inventory.low-stock', payload.productId)) return;

      await this.executeAutomations('inventory.low-stock', payload);

      const product = await this.prisma.product.findUnique({
        where: { id: payload.productId },
      });

      if (!product) return;

      // Get admin phone from environment or organization settings
      const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
      if (!adminPhone) {
        this.logger.warn('No admin phone configured for low stock alerts');
        return;
      }

      const message = [
        `Alerta de Stock Bajo`,
        '',
        `Producto: ${product.name}`,
        `Stock actual: ${payload.currentStock} unidades`,
        `Stock minimo: ${payload.minStock}`,
        '',
        `Se recomienda reabastecer pronto.`,
      ].join('\n');

      await this.whatsappService.sendMessage(payload.organizationId, payload.companyId, {
        to: adminPhone,
        content: message,
      });

      this.logger.log(`Low stock alert sent for product #${product.id}`);
    } catch (error) {
      this.logger.error(`Error handling inventory.low-stock event`, error);
    }
  }

  @OnEvent('quote.created')
  async handleQuoteCreated(payload: {
    quoteId: number;
    organizationId: number;
    companyId: number;
  }) {
    try {
      if (this.isDuplicate('quote.created', payload.quoteId)) return;

      await this.executeAutomations('quote.created', payload);

      const quote = await this.prisma.quote.findUnique({
        where: { id: payload.quoteId },
        include: {
          client: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!quote || !quote.client?.phone) return;

      const items = quote.items
        .map((item) => `- ${item.product?.name || item.name}: S/ ${item.unitPrice.toFixed(2)}`)
        .join('\n');

      const message = [
        `Nueva Cotizacion`,
        '',
        `Hola ${quote.client.name},`,
        '',
        `Hemos generado la cotizacion ${quote.quoteNumber || `#${quote.id}`}`,
        '',
        `Productos:`,
        items,
        '',
        `Subtotal: S/ ${quote.subtotal.toFixed(2)}`,
        `IGV: S/ ${quote.taxAmount.toFixed(2)}`,
        `Total: S/ ${quote.total.toFixed(2)}`,
        '',
        `Valida hasta: ${new Date(quote.validity).toLocaleDateString('es-PE')}`,
      ].join('\n');

      await this.whatsappService.sendMessage(payload.organizationId, payload.companyId, {
        to: quote.client.phone,
        content: message,
        clientId: quote.clientId!,
      });

      this.logger.log(`Quote notification sent for quote #${quote.id}`);
    } catch (error) {
      this.logger.error(`Error handling quote.created event`, error);
    }
  }

  @OnEvent('sale.sunat-accepted')
  async handleSunatAccepted(payload: {
    saleId: number;
    organizationId: number;
    companyId: number;
    documentType: string;
    serie: string;
    correlativo: string;
  }) {
    try {
      // Dedup: skip if this sale was already processed recently
      if (this.isDuplicate('sale.sunat-accepted', payload.saleId)) return;

      await this.executeAutomations('sale.sunat-accepted', payload);

      // Check company.whatsappAutoSendInvoice
      const company = await this.prisma.company.findUnique({
        where: { id: payload.companyId },
        select: { whatsappAutoSendInvoice: true, name: true, sunatRuc: true },
      });
      if (!company?.whatsappAutoSendInvoice) return;

      // Check WhatsApp session is CONNECTED
      const session = await this.prisma.whatsAppSession.findFirst({
        where: {
          organizationId: payload.organizationId,
          companyId: payload.companyId,
          status: 'CONNECTED',
        },
      });
      if (!session) return;

      // Get sale with client phone
      const sale = await this.prisma.sales.findUnique({
        where: { id: payload.saleId },
        include: { client: { select: { id: true, name: true, phone: true } } },
      });
      if (!sale?.client?.phone) return;

      // Try to find the PDF on disk
      const pdf = company.sunatRuc
        ? await this.findInvoicePdf(
            payload.companyId,
            company.sunatRuc,
            payload.documentType,
            payload.serie,
            payload.correlativo,
          )
        : null;

      const message = this.buildInvoiceMessage(
        sale.client.name ?? 'Cliente',
        payload.documentType,
        payload.serie,
        payload.correlativo,
        Number(sale.total),
        company.name,
        !!pdf,
      );

      if (pdf) {
        await this.whatsappService.sendDocument(
          payload.organizationId,
          payload.companyId,
          {
            to: sale.client.phone,
            document: pdf.buffer,
            fileName: pdf.fileName,
            caption: message,
            clientId: sale.client.id,
            salesId: sale.id,
          },
        );
      } else {
        await this.whatsappService.sendMessage(
          payload.organizationId,
          payload.companyId,
          {
            to: sale.client.phone,
            content: message,
            clientId: sale.client.id,
            salesId: sale.id,
          },
        );
      }

      this.logger.log(`Invoice sent via WhatsApp for sale #${sale.id} to ${sale.client.phone} (PDF: ${!!pdf})`);
    } catch (error) {
      this.logger.error(`Failed to send invoice WhatsApp for sale #${payload.saleId}`, error);
    }
  }

  // ============================================================================
  // MANUAL INVOICE SEND
  // ============================================================================

  async sendInvoiceManual(
    saleId: number,
    organizationId: number,
    companyId: number,
    phone?: string,
  ) {
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        sunatTransmissions: {
          where: { status: 'ACCEPTED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!sale) {
      throw new Error(`Venta #${saleId} no encontrada`);
    }

    // Use provided phone, or fall back to client phone
    const targetPhone = phone || sale.client?.phone;
    if (!targetPhone) {
      throw new Error('No se proporcionó un número de teléfono');
    }

    const transmission = sale.sunatTransmissions[0];
    if (!transmission) {
      throw new Error('La venta no tiene un comprobante aceptado por SUNAT');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, sunatRuc: true },
    });

    // Try to find the PDF on disk
    const pdf = company?.sunatRuc
      ? await this.findInvoicePdf(
          companyId,
          company.sunatRuc,
          transmission.documentType,
          transmission.serie ?? '',
          transmission.correlativo ?? '',
        )
      : null;

    const message = this.buildInvoiceMessage(
      sale.client?.name ?? 'Cliente',
      transmission.documentType,
      transmission.serie ?? '',
      transmission.correlativo ?? '',
      Number(sale.total),
      company?.name ?? '',
      !!pdf,
    );

    if (pdf) {
      // Send PDF document with caption
      await this.whatsappService.sendDocument(organizationId, companyId, {
        to: targetPhone,
        document: pdf.buffer,
        fileName: pdf.fileName,
        caption: message,
        clientId: sale.client?.id,
        salesId: sale.id,
      });
    } else {
      // Fallback: send text-only message
      await this.whatsappService.sendMessage(organizationId, companyId, {
        to: targetPhone,
        content: message,
        clientId: sale.client?.id,
        salesId: sale.id,
      });
    }

    this.logger.log(`Manual invoice WhatsApp sent for sale #${sale.id} to ${targetPhone} (PDF: ${!!pdf})`);
    return { success: true, message: pdf ? 'Comprobante con PDF enviado por WhatsApp' : 'Comprobante enviado por WhatsApp (sin PDF)' };
  }

  private buildInvoiceMessage(
    clientName: string,
    documentType: string,
    serie: string,
    correlativo: string,
    total: number,
    companyName: string,
    hasPdf: boolean,
  ): string {
    const tipoDoc = documentType === '01' ? 'Factura' : 'Boleta';
    const lines = [
      `Hola ${clientName},`,
      '',
      `Su ${tipoDoc} ${serie}-${correlativo} por S/ ${total.toFixed(2)} ha sido emitida y aceptada por SUNAT.`,
    ];
    if (hasPdf) {
      // PDF is attached as document — no need to say "adjuntamos"
    } else {
      lines.push('');
      lines.push('Puede solicitar el comprobante electronico en nuestro establecimiento.');
    }
    lines.push('', companyName, 'Gracias por su preferencia.');
    return lines.join('\n');
  }

  /**
   * Find the PDF file for a SUNAT comprobante on disk.
   * Returns { buffer, fileName } or null if not found.
   */
  private async findInvoicePdf(
    companyId: number,
    companyRuc: string,
    documentType: string,
    serie: string,
    correlativo: string,
  ): Promise<{ buffer: Buffer; fileName: string } | null> {
    const typeCode = documentType === '01' ? '01' : '03';
    const tipo = documentType === '01' ? 'factura' : 'boleta';
    const fileName = `${companyRuc}-${typeCode}-${serie}-${correlativo}.pdf`;

    try {
      // 1. Check SunatStoredPdf record for tenant-aware path
      const record = await this.prisma.sunatStoredPdf.findFirst({
        where: { companyId, filename: fileName },
      });

      if (record?.relativePath) {
        const filePath = resolveBackendPath(record.relativePath);
        const buffer = await fs.readFile(filePath);
        this.logger.log(`Found PDF via SunatStoredPdf: ${filePath}`);
        return { buffer, fileName };
      }
    } catch {
      // Record not found or file missing — try fallback
    }

    // 2. Fallback: standard path
    try {
      const filePath = path.join(resolveBackendPath('comprobantes', 'pdf', tipo), fileName);
      const buffer = await fs.readFile(filePath);
      this.logger.log(`Found PDF via standard path: ${filePath}`);
      return { buffer, fileName };
    } catch {
      // Not found
    }

    this.logger.warn(`PDF not found for ${fileName}`);
    return null;
  }

  // ============================================================================
  // GENERIC AUTOMATION EXECUTOR
  // ============================================================================

  private async executeAutomations(eventName: string, payload: any) {
    try {
      const automations = await this.prisma.whatsAppAutomation.findMany({
        where: {
          triggerEvent: eventName,
          isActive: true,
          organizationId: payload.organizationId,
          companyId: payload.companyId,
        },
        include: {
          template: true,
        },
      });

      if (automations.length === 0) return;

      // Limit: max 5 automations per event to prevent cascade
      const safeAutomations = automations.slice(0, 5);
      if (automations.length > 5) {
        this.logger.warn(`Event ${eventName} has ${automations.length} automations — only executing first 5`);
      }

      for (const automation of safeAutomations) {
        try {
          // Check if filters match
          if (automation.triggerFilters && !this.matchFilters(payload, automation.triggerFilters as any)) {
            continue;
          }

          // Delay if configured (capped at 60 minutes to prevent indefinite setTimeout)
          if (automation.delayMinutes > 0) {
            const delayMs = Math.min(automation.delayMinutes, 60) * 60_000;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // Limit: max 10 recipients per automation
          const safeRecipients = automation.recipients.slice(0, 10);
          if (automation.recipients.length > 10) {
            this.logger.warn(`Automation #${automation.id} has ${automation.recipients.length} recipients — capping at 10`);
          }

          // Send messages to recipients
          // Rate limiting is enforced inside sendMessage()
          for (const recipient of safeRecipients) {
            let phone = recipient;

            // Resolve special recipients
            if (recipient === 'client' && payload.clientId) {
              const client = await this.prisma.client.findUnique({
                where: { id: payload.clientId },
              });
              if (client?.phone) phone = client.phone;
            } else if (recipient === 'admin') {
              phone = process.env.ADMIN_WHATSAPP_PHONE || '';
            }

            if (!phone || phone === 'client' || phone === 'admin') {
              this.logger.warn(`Could not resolve recipient: ${recipient}`);
              continue;
            }

            // Get message content
            let content = '';
            if (automation.template) {
              content = this.whatsappService.renderTemplate(automation.template.content, payload);
            } else {
              content = `Event triggered: ${eventName}`;
            }

            try {
              // sendMessage enforces rate limits (per-contact cooldown, global throttle, circuit breaker)
              await this.whatsappService.sendMessage(
                automation.organizationId,
                automation.companyId,
                {
                  to: phone,
                  content,
                },
              );

              // Log successful execution
              await this.prisma.whatsAppAutomationLog.create({
                data: {
                  automationId: automation.id,
                  triggeredBy: eventName,
                  payload: payload as any,
                  recipient: phone,
                  messageSent: true,
                },
              });
            } catch (sendError) {
              const errMsg = (sendError as Error).message;
              this.logger.error(`Automation #${automation.id}: failed to send to ${phone}: ${errMsg}`);

              await this.prisma.whatsAppAutomationLog.create({
                data: {
                  automationId: automation.id,
                  triggeredBy: eventName,
                  payload: payload as any,
                  recipient: phone,
                  messageSent: false,
                  errorMessage: errMsg,
                },
              });

              // If circuit breaker tripped, abort remaining recipients
              if (errMsg.includes('pausado temporalmente')) {
                this.logger.warn(`Circuit breaker active — aborting remaining recipients for automation #${automation.id}`);
                break;
              }
            }
          }

          // Update automation stats
          await this.prisma.whatsAppAutomation.update({
            where: { id: automation.id },
            data: {
              lastTriggered: new Date(),
              triggerCount: { increment: 1 },
            },
          });
        } catch (error) {
          this.logger.error(`Error executing automation #${automation.id}`, error);

          // Log failed execution
          await this.prisma.whatsAppAutomationLog.create({
            data: {
              automationId: automation.id,
              triggeredBy: eventName,
              payload: payload as any,
              recipient: automation.recipients.join(', '),
              messageSent: false,
              errorMessage: (error as Error).message,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error executing automations for event ${eventName}`, error);
    }
  }

  private matchFilters(payload: any, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (payload[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
