import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

interface SendQuoteEmailParams {
  to: string;
  subject: string;
  message?: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  fromName?: string;
}

@Injectable()
export class QuotesEmailService {
  private readonly logger = new Logger(QuotesEmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string | null;

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
      this.fromAddress = user;
    } else {
      this.logger.warn(
        'SMTP credentials not configured. Quote emails will be skipped.',
      );
      this.transporter = null;
      this.fromAddress = null;
    }
  }

  async sendQuoteEmail(params: SendQuoteEmailParams): Promise<void> {
    if (!this.transporter || !this.fromAddress) {
      throw new BadRequestException(
        'El servidor de correo no está configurado. Configura las variables SMTP_HOST, SMTP_USER y SMTP_PASS.',
      );
    }

    const from = params.fromName
      ? `"${params.fromName}" <${this.fromAddress}>`
      : this.fromAddress;

    const htmlBody = params.message
      ? params.message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>')
      : '';

    await this.transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text: params.message || '',
      html: htmlBody
        ? `<div style="font-family:sans-serif;font-size:14px;color:#333;">${htmlBody}</div>`
        : undefined,
      attachments: [
        {
          filename: params.pdfFilename,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(`Quote email sent to ${params.to}`);
  }
}
