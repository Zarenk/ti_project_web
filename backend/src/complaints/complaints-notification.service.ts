import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class ComplaintsNotificationService {
  private readonly logger = new Logger(ComplaintsNotificationService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn(
        'SMTP no configurado. Los emails del libro de reclamaciones no se enviarán.',
      );
      this.transporter = null;
    }

    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') || 'noreply@sistema.com';
  }

  /**
   * Email al consumidor confirmando recepción del reclamo.
   */
  async sendComplaintReceived(payload: {
    recipientEmail: string;
    consumerName: string;
    correlativeNumber: string;
    trackingCode: string;
    providerName: string;
    createdAt: Date;
    deadlineDate: Date;
  }) {
    if (!this.transporter) return;

    const formattedDate = payload.createdAt.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const deadlineFormatted = payload.deadlineDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.recipientEmail,
        subject: `Reclamo recibido — Nº ${payload.correlativeNumber}`,
        html: `
          <h2>Libro de Reclamaciones</h2>
          <p>Estimado(a) <strong>${payload.consumerName}</strong>,</p>
          <p>Su reclamo ha sido registrado correctamente con los siguientes datos:</p>
          <table style="border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:4px 12px;font-weight:bold;">Nº Correlativo:</td><td style="padding:4px 12px;">${payload.correlativeNumber}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Código de seguimiento:</td><td style="padding:4px 12px;"><strong>${payload.trackingCode}</strong></td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Proveedor:</td><td style="padding:4px 12px;">${payload.providerName}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Fecha de registro:</td><td style="padding:4px 12px;">${formattedDate}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Fecha límite de respuesta:</td><td style="padding:4px 12px;">${deadlineFormatted}</td></tr>
          </table>
          <p>El proveedor tiene un plazo máximo de <strong>15 días hábiles</strong> improrrogables para dar respuesta a su reclamo (DS 101-2022-PCM).</p>
          <p>Puede consultar el estado de su reclamo usando su código de seguimiento: <strong>${payload.trackingCode}</strong></p>
          <hr/>
          <p style="font-size:12px;color:#666;">
            La formulación del reclamo no impide acudir a otras vías de solución de controversias
            ni es requisito previo para interponer una denuncia ante el INDECOPI.
          </p>
        `,
      });

      this.logger.log(
        `Complaint confirmation email sent to ${payload.recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Failed to send complaint confirmation email', error);
    }
  }

  /**
   * Email al consumidor con la respuesta del proveedor.
   */
  async sendComplaintResponse(payload: {
    recipientEmail: string;
    consumerName: string;
    correlativeNumber: string;
    providerName: string;
    responseText: string;
    responseDate: Date;
  }) {
    if (!this.transporter) return;

    const dateFormatted = payload.responseDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.recipientEmail,
        subject: `Respuesta a su reclamo Nº ${payload.correlativeNumber}`,
        html: `
          <h2>Respuesta a su Reclamo</h2>
          <p>Estimado(a) <strong>${payload.consumerName}</strong>,</p>
          <p>El proveedor <strong>${payload.providerName}</strong> ha respondido a su reclamo Nº <strong>${payload.correlativeNumber}</strong>:</p>
          <div style="background:#f5f5f5;padding:16px;border-left:4px solid #333;margin:16px 0;">
            <p style="white-space:pre-wrap;">${payload.responseText}</p>
          </div>
          <p><strong>Fecha de respuesta:</strong> ${dateFormatted}</p>
          <hr/>
          <p style="font-size:12px;color:#666;">
            Si no está conforme con la respuesta, puede interponer una denuncia ante el INDECOPI.
          </p>
        `,
      });

      this.logger.log(
        `Complaint response email sent to ${payload.recipientEmail}`,
      );
    } catch (error) {
      this.logger.error('Failed to send complaint response email', error);
    }
  }

  /**
   * Email de alerta interna al admin cuando un deadline se acerca.
   */
  async sendDeadlineAlert(payload: {
    adminEmail: string;
    correlativeNumber: string;
    consumerName: string;
    remainingDays: number;
  }) {
    if (!this.transporter) return;

    const urgency =
      payload.remainingDays <= 0
        ? '🔴 VENCIDO'
        : payload.remainingDays <= 3
          ? '🟡 URGENTE'
          : '⚠️ Atención';

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: payload.adminEmail,
        subject: `${urgency} — Reclamo Nº ${payload.correlativeNumber} (${payload.remainingDays <= 0 ? 'VENCIDO' : `${payload.remainingDays} días restantes`})`,
        html: `
          <h2>Alerta de Libro de Reclamaciones</h2>
          <p>El reclamo <strong>Nº ${payload.correlativeNumber}</strong> de <strong>${payload.consumerName}</strong>
          ${payload.remainingDays <= 0 ? 'ha <strong style="color:red;">VENCIDO</strong> sin respuesta.' : `tiene <strong>${payload.remainingDays} días hábiles</strong> restantes para ser respondido.`}</p>
          <p>Según DS 101-2022-PCM, el plazo de 15 días hábiles es <strong>improrrogable</strong>. El incumplimiento puede resultar en sanciones de INDECOPI.</p>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send deadline alert email', error);
    }
  }
}
