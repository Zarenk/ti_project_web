import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type QuoteWhatsAppPayload = {
  phone: string;
  filename: string;
  file: Express.Multer.File;
};

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(private readonly configService: ConfigService) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned;
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
    const blob = new Blob([payload.file.buffer], { type: mime });
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
}




