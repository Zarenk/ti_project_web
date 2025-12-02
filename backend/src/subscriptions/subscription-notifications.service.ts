import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import nodemailer, { Transporter } from 'nodemailer';

interface TrialWarningPayload {
  organizationId: number;
  daysLeft: number;
  trialEndsAt: Date;
  planName?: string | null;
}

interface TrialExpiredPayload {
  organizationId: number;
  trialEndedAt: Date;
  planName?: string | null;
}

interface SignupWelcomePayload {
  email: string;
  fullName?: string | null;
  organizationName: string;
}

interface SignupVerificationPayload {
  email: string;
  fullName?: string | null;
  organizationName: string;
  token: string;
}

@Injectable()
export class SubscriptionNotificationsService {
  private readonly logger = new Logger(
    SubscriptionNotificationsService.name,
  );
  private readonly transporter: Transporter | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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
        'SMTP credentials not configured. Subscription emails will be skipped.',
      );
      this.transporter = null;
    }
  }

  async sendTrialWarning(payload: TrialWarningPayload) {
    const recipients = await this.getRecipients(payload.organizationId);
    if (!this.canSend(recipients)) return;

    const subject = `Tu periodo de prueba finaliza en ${payload.daysLeft} día(s)`;
    const formattedDate = payload.trialEndsAt.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const body = [
      `Hola 👋,`,
      ``,
      `Tu organización tiene aún ${payload.daysLeft} día(s) de prueba.`,
      `Fecha de expiración: ${formattedDate}.`,
      payload.planName
        ? `Plan actual: ${payload.planName}.`
        : undefined,
      ``,
      `Activa un plan para evitar la suspensión automática.`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendEmail(recipients, subject, body);
  }

  async sendTrialExpired(payload: TrialExpiredPayload) {
    const recipients = await this.getRecipients(payload.organizationId);
    if (!this.canSend(recipients)) return;

    const subject = 'Tu periodo de prueba ha finalizado';
    const formattedDate = payload.trialEndedAt.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const body = [
      `Hola 👋,`,
      ``,
      `El periodo de prueba terminó el ${formattedDate}.`,
      payload.planName
        ? `Plan de referencia: ${payload.planName}.`
        : undefined,
      ``,
      `Ingresa al panel de facturación para activar un plan y reanudar el acceso.`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.sendEmail(recipients, subject, body);
  }

  private async getRecipients(organizationId: number) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId,
        role: { in: ['OWNER', 'SUPER_ADMIN'] },
      },
      include: { user: true },
    });

    return memberships
      .map((membership) => membership.user?.email)
      .filter((email): email is string => Boolean(email));
  }

  private canSend(recipients: string[]) {
    if (!this.transporter) {
      this.logger.warn('Skipping email send - transporter not configured');
      return false;
    }
    if (!recipients.length) {
      this.logger.warn('Skipping email send - no recipients found');
      return false;
    }
    return true;
  }

  private async sendEmail(recipients: string[], subject: string, text: string) {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER'),
        to: recipients.join(','),
        subject,
        text,
      });
      this.logger.log(`Sent subscription email "${subject}" to ${recipients}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(
        `Failed to send subscription email "${subject}": ${message}`,
      );
    }
  }

  async sendSignupWelcome(payload: SignupWelcomePayload) {
    const recipients = payload.email ? [payload.email] : [];
    if (!this.canSend(recipients)) return;
    const loginUrl = this.resolvePortalLoginUrl();
    const greeting = payload.fullName
      ? `Hola ${payload.fullName.split(' ')[0]},`
      : 'Hola,';
    const body = [
      greeting,
      '',
      `Ya está listo el entorno demo para ${payload.organizationName}.`,
      'Ingresa con tu correo y la contraseña que registraste durante el proceso de alta.',
      '',
      `Portal: ${loginUrl}`,
      '',
      'Si no solicitaste esta cuenta puedes ignorar este mensaje.',
    ].join('\n');
    await this.sendEmail(
      recipients,
      'Tu entorno demo está listo',
      body,
    );
  }

  async sendSignupVerification(payload: SignupVerificationPayload) {
    const recipients = payload.email ? [payload.email] : [];
    if (!this.canSend(recipients)) return;
    const verifyUrl = this.resolvePortalVerificationUrl(payload.token);
    const greeting = payload.fullName
      ? `Hola ${payload.fullName.split(' ')[0]},`
      : 'Hola,';
    const body = [
      greeting,
      '',
      `Para activar el acceso a ${payload.organizationName}, confirma tu correo con el siguiente enlace:`,
      verifyUrl,
      '',
      'Si no solicitaste esta cuenta puedes ignorar este mensaje.',
    ].join('\n');

    await this.sendEmail(
      recipients,
      'Confirma tu correo para activar tu demo',
      body,
    );
  }

  private resolvePortalLoginUrl() {
    const explicit = this.configService.get<string>('PORTAL_LOGIN_URL');
    if (explicit) {
      return explicit;
    }
    const base = this.configService.get<string>('PUBLIC_URL');
    if (base) {
      return `${base.replace(/\/$/, '')}/portal/login`;
    }
    return 'https://app.facturacloud.pe/portal/login';
  }

  private resolvePortalVerificationUrl(token: string) {
    const explicit = this.configService.get<string>('PORTAL_VERIFICATION_URL');
    const base = (
      explicit ??
      this.configService.get<string>('PUBLIC_URL')?.replace(/\/$/, '') ??
      'https://app.facturacloud.pe'
    ).replace(/\/$/, '');
    const url = explicit ? base : `${base}/portal/verify`;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
