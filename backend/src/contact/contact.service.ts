import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendContactEmail(data: ContactDto) {
    const text = `Nombre: ${data.nombre}\nEmail: ${data.email}\nTel\u00E9fono: ${data.telefono ?? ''}\n\n${data.mensaje}`;
    try {
      await this.transporter.sendMail({
        from: `\"Web Contact\" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL,
        subject: `Contacto: ${data.asunto}`,
        text,
      });
    } catch (err) {
      console.error('Error sending contact email:', err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}