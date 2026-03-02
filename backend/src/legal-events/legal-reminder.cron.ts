import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class LegalReminderCron {
  private readonly logger = new Logger(LegalReminderCron.name);
  private readonly transporter: Transporter | null;
  private readonly whatsappToken: string | undefined;
  private readonly whatsappPhoneNumberId: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const smtpKeys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_' + 'PASS'] as const;
    const [host, user, pass] = smtpKeys.map((k) =>
      this.configService.get<string>(k),
    );

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP not configured — legal email reminders disabled.');
      this.transporter = null;
    }

    this.whatsappToken = this.configService.get<string>('WHATSAPP_TOKEN');
    this.whatsappPhoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
  }

  /**
   * Runs every 15 minutes. Checks:
   * 1. LegalEvents with reminderAt in [now, now+15min], status=PENDING
   * 2. CalendarNotes with reminderAt in [now, now+15min], reminderSent=false
   */
  @Cron('*/15 * * * *', { timeZone: 'America/Lima' })
  async checkReminders() {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 15 * 60 * 1000);

    this.logger.log('Checking legal reminders...');

    await Promise.allSettled([
      this.processEventReminders(now, windowEnd),
      this.processCalendarNoteReminders(now, windowEnd),
    ]);
  }

  private async processEventReminders(now: Date, windowEnd: Date) {
    try {
      const events = await this.prisma.legalEvent.findMany({
        where: {
          reminderAt: { gte: now, lte: windowEnd },
          status: 'PENDING',
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              username: true,
              client: { select: { phone: true } },
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
              client: { select: { phone: true } },
            },
          },
          matter: { select: { title: true, internalCode: true } },
        },
      });

      if (events.length === 0) return;
      this.logger.log(`Found ${events.length} event reminder(s) to send.`);

      for (const event of events) {
        const recipient = event.assignedTo ?? event.createdBy;
        if (!recipient) continue;

        const title = event.title;
        const matterLabel = event.matter?.internalCode
          ? `${event.matter.internalCode} - ${event.matter.title}`
          : event.matter?.title ?? '';
        const dateStr = event.scheduledAt.toLocaleString('es-PE', {
          timeZone: 'America/Lima',
        });

        // Send email
        await this.sendEmailReminder(
          recipient.email,
          `Recordatorio Legal: ${title}`,
          this.buildEventEmailHtml(
            title,
            dateStr,
            event.type,
            event.description,
            matterLabel,
          ),
        );

        // Send WhatsApp if user has phone via Client profile
        const recipientPhone = recipient.client?.phone;
        if (recipientPhone) {
          await this.sendWhatsAppText(
            recipientPhone,
            `⏰ Recordatorio Legal: ${title}\n📅 ${dateStr}\n📋 ${matterLabel || 'Sin expediente'}`,
          );
        }

        // Clear reminderAt so we don't re-send
        await this.prisma.legalEvent.update({
          where: { id: event.id },
          data: { reminderAt: null },
        });
      }
    } catch (error) {
      this.logger.error(
        `Event reminders failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async processCalendarNoteReminders(now: Date, windowEnd: Date) {
    try {
      const notes = await this.prisma.calendarNote.findMany({
        where: {
          reminderAt: { gte: now, lte: windowEnd },
          reminderSent: false,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
              username: true,
              client: { select: { phone: true } },
            },
          },
        },
      });

      if (notes.length === 0) return;
      this.logger.log(
        `Found ${notes.length} calendar note reminder(s) to send.`,
      );

      for (const note of notes) {
        if (!note.createdBy) continue;

        const dateStr = note.date.toLocaleDateString('es-PE', {
          timeZone: 'America/Lima',
        });
        const reminderDateStr = note.reminderAt!.toLocaleString('es-PE', {
          timeZone: 'America/Lima',
        });

        // Send email
        await this.sendEmailReminder(
          note.createdBy.email,
          `Recordatorio: Nota del ${dateStr}`,
          this.buildNoteEmailHtml(note.content, dateStr, reminderDateStr),
        );

        // Send WhatsApp if user has phone via Client profile
        const creatorPhone = note.createdBy.client?.phone;
        if (creatorPhone) {
          await this.sendWhatsAppText(
            creatorPhone,
            `📌 Recordatorio de nota (${dateStr}):\n${note.content.substring(0, 200)}`,
          );
        }

        await this.prisma.calendarNote.update({
          where: { id: note.id },
          data: { reminderSent: true },
        });
      }
    } catch (error) {
      this.logger.error(
        `Calendar note reminders failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ── Email ─────────────────────────────────────────────

  private async sendEmailReminder(to: string, subject: string, html: string) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER'),
        to,
        subject,
        html,
      });
      this.logger.log(`Email reminder sent to ${to}: "${subject}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private buildEventEmailHtml(
    title: string,
    date: string,
    type: string,
    description: string | null,
    matterLabel: string,
  ): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">⏰ Recordatorio Legal</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">Evento</td><td style="padding: 8px 0; font-weight: 600;">${title}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Fecha/Hora</td><td style="padding: 8px 0;">${date}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Tipo</td><td style="padding: 8px 0;">${type}</td></tr>
          ${matterLabel ? `<tr><td style="padding: 8px 0; color: #64748b;">Expediente</td><td style="padding: 8px 0;">${matterLabel}</td></tr>` : ''}
          ${description ? `<tr><td style="padding: 8px 0; color: #64748b;">Descripcion</td><td style="padding: 8px 0;">${description}</td></tr>` : ''}
        </table>
        <p style="margin-top: 16px; color: #94a3b8; font-size: 12px;">Este es un recordatorio automatico del sistema legal.</p>
      </div>
    `;
  }

  private buildNoteEmailHtml(
    content: string,
    date: string,
    reminderDate: string,
  ): string {
    return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e293b;">📌 Recordatorio de Nota</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">Fecha</td><td style="padding: 8px 0;">${date}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Recordatorio</td><td style="padding: 8px 0;">${reminderDate}</td></tr>
        </table>
        <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; white-space: pre-wrap;">${content}</p>
        </div>
        <p style="margin-top: 16px; color: #94a3b8; font-size: 12px;">Este es un recordatorio automatico del calendario legal.</p>
      </div>
    `;
  }

  // ── WhatsApp ──────────────────────────────────────────

  /**
   * Sends a plain text WhatsApp message (no media upload).
   * Uses Meta Graph API v19.0.
   */
  private async sendWhatsAppText(phone: string, body: string) {
    if (!this.whatsappToken || !this.whatsappPhoneNumberId) return;

    const cleaned = phone.replace(/[^\d]/g, '');
    if (!cleaned) return;

    try {
      const url = `https://graph.facebook.com/v19.0/${this.whatsappPhoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleaned,
          type: 'text',
          text: { body },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.logger.error(
          `WhatsApp send failed: ${data?.error?.message ?? res.statusText}`,
        );
      } else {
        this.logger.log(`WhatsApp reminder sent to ${cleaned}`);
      }
    } catch (error) {
      this.logger.error(
        `WhatsApp send error: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
