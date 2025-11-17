import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

interface ContactDto {
  nombre: string;
  email: string;
  telefono?: string;
  asunto: string;
  mensaje: string;
}

@Injectable()
export class ContactService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendContactEmail(data: ContactDto) {
    const text = `Nombre: ${data.nombre}\nEmail: ${data.email}\nTel\u00E9fono: ${data.telefono ?? ''}\n\n${data.mensaje}`;
    try {
      await this.transporter.sendMail({
        from: `\"Web Contact\" <${this.configService.get<string>('SMTP_USER')}>`,
        to: this.configService.get<string>('CONTACT_EMAIL'),
        subject: `Contacto: ${data.asunto}`,
        text,
      });
    } catch (err) {
      console.error('Error sending contact email:', err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
