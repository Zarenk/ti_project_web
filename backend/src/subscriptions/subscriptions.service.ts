import axios from 'axios';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  BillingPaymentProvider,
  SubscriptionStatus,
  SubscriptionPlan,
  Subscription,
  SubscriptionInvoiceStatus,
  SubscriptionInvoice,
  AuditAction,
  SubscriptionInterval,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StartTrialDto } from './dto/start-trial.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ChangePlanDto, ChangePlanSelfDto } from './dto/change-plan.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { AdminComplimentaryDto } from './dto/admin-complimentary.dto';
import {
  PaymentProvider,
  CheckoutSessionResult,
} from './payment-providers/payment-provider.interface';
import { PAYMENT_PROVIDER_TOKEN } from './subscriptions.tokens';
import { TaxRateService } from './tax-rate.service';
import { Prisma } from '@prisma/client';
import { SunatService } from 'src/sunat/sunat.service';
import { ActivityService } from 'src/activity/activity.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OrganizationExportService } from './organization-export.service';
import { UpsertPaymentMethodDto } from './dto/upsert-payment-method.dto';
import { OnboardingService } from 'src/onboarding/onboarding.service';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { SubscriptionQuotaService } from './subscription-quota.service';
import { SubscriptionPrometheusService } from './subscription-prometheus.service';

const DEFAULT_TRIAL_DAYS = 14;
const BILLING_CYCLE_DAYS = 30;
const SYSTEM_AUDIT_ACTOR = 'subscriptions-service';
const DUNNING_SCHEDULE_DAYS = [1, 3, 5, 7];
type ComplimentaryActor = {
  userId: number | null;
  email: string | null;
  username: string | null;
};

type PaymentWebhookEvent = {
  provider: string;
  type: string;
  data?: Record<string, any> | null;
};

type BillingCompanySnapshot = {
  id: number;
  organizationId: number;
  name: string;
  taxId: string | null;
  sunatRuc: string | null;
  sunatEnvironment: string;
  sunatSolUserBeta: string | null;
  sunatSolPasswordBeta: string | null;
  sunatCertPathBeta: string | null;
  sunatKeyPathBeta: string | null;
  sunatSolUserProd: string | null;
  sunatSolPasswordProd: string | null;
  sunatCertPathProd: string | null;
  sunatKeyPathProd: string | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN)
    private readonly paymentProvider: PaymentProvider,
    private readonly taxRateService: TaxRateService,
    private readonly sunatService: SunatService,
    private readonly activityService: ActivityService,
    private readonly configService: ConfigService,
    private readonly onboardingService: OnboardingService,
    private readonly exportService: OrganizationExportService,
    private readonly mercadoPagoWebhookService: MercadoPagoWebhookService,
    private readonly notifications: SubscriptionNotificationsService,
    private readonly quotaService: SubscriptionQuotaService,
    private readonly metrics: SubscriptionPrometheusService,
  ) {
    void this.taxRateService.upsertDefaultRate();
  }
  private readonly logger = new Logger(SubscriptionsService.name);

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: [{ price: 'asc' }, { name: 'asc' }],
    });
  }

  async startTrial(dto: StartTrialDto) {
    const plan = await this.ensurePlan(dto.planCode);
    await this.ensureOrganization(dto.organizationId);

    const now = new Date();
    const trialEndsAt = this.resolveTrialEnd(plan, dto.trialEndsAt);
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
    });
    const metadataBase = this.coerceJsonRecord(
      existingSubscription?.metadata ?? {},
    );

    const upsertedSubscription = await this.prisma.subscription.upsert({
      where: { organizationId: dto.organizationId },
      create: {
        organizationId: dto.organizationId,
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        metadata: { createdVia: 'manual_trial' },
      },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: {
          ...metadataBase,
          trialRefreshedAt: now.toISOString(),
        },
      },
      include: { plan: true },
    });

    await this.logAuditEvent({
      action: existingSubscription ? AuditAction.UPDATED : AuditAction.CREATED,
      entityType: 'subscription',
      entityId: upsertedSubscription.id.toString(),
      summary: existingSubscription
        ? `Trial refrescado para la organización ${dto.organizationId} con el plan ${plan.code}`
        : `Trial iniciado para la organización ${dto.organizationId} con el plan ${plan.code}`,
      diff: {
        organizationId: dto.organizationId,
        planId: plan.id,
        status: upsertedSubscription.status,
        trialEndsAt: upsertedSubscription.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd:
          upsertedSubscription.currentPeriodEnd?.toISOString() ?? null,
      },
    });

    this.metrics.recordTrialActivated(plan.code);

    return upsertedSubscription;
  }

  async createCheckoutSession(dto: CreateCheckoutDto) {
    const plan = await this.ensurePlan(dto.planCode);
    await this.ensureOrganization(dto.organizationId);

    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
    });

    const currency = dto.currency ?? plan.currency;
    const checkoutResult = await this.paymentProvider.createCheckoutSession({
      organizationId: dto.organizationId,
      planCode: plan.code,
      amount: plan.price.toString(),
      currency,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      metadata: {
        subscriptionId: existingSubscription?.id ?? null,
        organizationId: dto.organizationId,
      },
    });

    const metadata = {
      ...this.coerceJsonRecord(existingSubscription?.metadata ?? {}),
      pendingCheckout: {
        sessionId: checkoutResult.sessionId,
        planCode: plan.code,
        requestedAt: new Date().toISOString(),
        successUrl: dto.successUrl,
        cancelUrl: dto.cancelUrl,
        currency,
      },
    };

    let subscription: Subscription;
    if (existingSubscription) {
      subscription = await this.prisma.subscription.update({
        where: { organizationId: dto.organizationId },
        data: {
          planId: plan.id,
          metadata,
        },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          organizationId: dto.organizationId,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          metadata,
        },
      });
    }

    await this.logAuditEvent({
      action: existingSubscription ? AuditAction.UPDATED : AuditAction.CREATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: `Checkout iniciado para el plan ${plan.code} (session ${checkoutResult.sessionId})`,
      diff: {
        organizationId: dto.organizationId,
        planId: plan.id,
        previousPlanId: existingSubscription?.planId ?? null,
        amount: plan.price.toString(),
        currency,
        checkoutSessionId: checkoutResult.sessionId,
      },
    });

    return {
      ...checkoutResult,
      currency,
      amount: plan.price.toString(),
      subscriptionId: subscription.id,
      planId: plan.id,
    };
  }

  async requestPlanChange(dto: ChangePlanDto) {
    this.logger.debug(
      `Plan change requested org=${dto.organizationId} plan=${dto.planCode} successUrl=${dto.successUrl} cancelUrl=${dto.cancelUrl} immediate=${dto.effectiveImmediately}`,
    );
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException(
        'No existe una suscripción para la organización indicada',
      );
    }

    const targetPlan = await this.ensurePlan(dto.planCode);
    if (subscription.planId === targetPlan.id) {
      throw new BadRequestException('Ya estás utilizando este plan');
    }

    const metadata = this.coerceJsonRecord(subscription.metadata);
    const currentPrice = new Prisma.Decimal(subscription.plan.price ?? 0);
    const targetPrice = new Prisma.Decimal(targetPlan.price ?? 0);
    const isTrial = subscription.status === SubscriptionStatus.TRIAL;
    const isUpgradeOrEqual = targetPrice.greaterThanOrEqualTo(currentPrice);
    const shouldChargeNow = isTrial || isUpgradeOrEqual;
    const effectiveImmediately = dto.effectiveImmediately ?? shouldChargeNow;
    if (effectiveImmediately) {
      const checkoutOptions =
        dto.successUrl && dto.cancelUrl
          ? {
              successUrl: dto.successUrl,
              cancelUrl: dto.cancelUrl,
            }
          : undefined;
      const immediateResult = await this.applyImmediatePlanChange(
        subscription,
        targetPlan,
        metadata,
        checkoutOptions,
      );
      return {
        effectiveImmediately: true,
        planCode: targetPlan.code,
        planName: targetPlan.name,
        checkoutUrl: immediateResult.checkoutSession?.checkoutUrl ?? null,
        sessionId: immediateResult.checkoutSession?.sessionId ?? null,
        invoiceId: immediateResult.invoiceId ?? null,
      };
    }

    const scheduledFor =
      subscription.currentPeriodEnd?.toISOString() ??
      this.calculateNextPeriodEnd(new Date(), targetPlan).toISOString();

    metadata.pendingPlanChange = {
      planId: targetPlan.id,
      planCode: targetPlan.code,
      planName: targetPlan.name,
      requestedAt: new Date().toISOString(),
      scheduledFor,
    };

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { metadata },
    });

    return {
      effectiveImmediately: false,
      scheduledFor,
      planCode: targetPlan.code,
      planName: targetPlan.name,
    };
  }

  async requestPlanChangeForUser(userId: number, dto: ChangePlanSelfDto) {
    const organizationId = await this.resolveUserOrganizationIdOrThrow(userId);
    return this.requestPlanChange({
      organizationId,
      planCode: dto.planCode,
      effectiveImmediately: dto.effectiveImmediately,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  async grantComplimentarySubscription(
    organizationId: number,
    dto: AdminComplimentaryDto,
    actor: ComplimentaryActor,
  ) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException('organizationId invalido');
    }

    const plan = await this.ensurePlan(dto.planCode);
    await this.ensureOrganization(organizationId);

    const now = new Date();
    const endsAt = this.addMonths(now, dto.durationMonths);
    const existing = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const metadataBase = this.coerceJsonRecord(existing?.metadata ?? {});
    const history = Array.isArray(metadataBase.complimentaryHistory)
      ? [...metadataBase.complimentaryHistory]
      : [];
    const grantEntry = {
      grantedAt: now.toISOString(),
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMonths: dto.durationMonths,
      planCode: plan.code,
      planId: plan.id,
      reason: dto.reason ?? null,
      grantedBy: {
        userId: actor.userId ?? null,
        email: actor.email ?? null,
        username: actor.username ?? null,
      },
    };

    const metadata: Record<string, any> = {
      ...metadataBase,
      complimentary: {
        ...grantEntry,
        active: true,
      },
      complimentaryHistory: [...history, grantEntry],
    };
    delete metadata.pendingCheckout;
    delete metadata.pendingPlanChange;
    delete metadata.cancellationRequest;

    const subscription = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: endsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: metadata as Prisma.InputJsonObject,
      },
      update: {
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: endsAt,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });

    await this.logAuditEvent({
      action: existing ? AuditAction.UPDATED : AuditAction.CREATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: `Membresia sin pago activada (${dto.durationMonths} meses) para la organizacion ${organizationId}`,
      diff: {
        organizationId,
        planId: plan.id,
        planCode: plan.code,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now.toISOString(),
        endsAt: endsAt.toISOString(),
        durationMonths: dto.durationMonths,
        reason: dto.reason ?? null,
        grantedBy: grantEntry.grantedBy,
      },
    });

    try {
      await this.quotaService.clearGraceLimits(subscription.id);
    } catch (error) {
      this.logger.warn(
        `No se pudieron limpiar las restricciones de gracia para la suscripcion ${subscription.id}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }

    return {
      subscriptionId: subscription.id,
      organizationId,
      planCode: plan.code,
      currentPeriodEnd: endsAt,
      complimentary: grantEntry,
    };
  }

  async requestCancellation(dto: CancelSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: dto.organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No existe una suscripción para la organización indicada',
      );
    }

    const metadata = this.coerceJsonRecord(subscription.metadata);
    metadata.cancellationRequest = {
      reasonCategory: dto.reasonCategory ?? null,
      customReason: dto.customReason ?? null,
      requestedAt: new Date().toISOString(),
      cancelImmediately: dto.cancelImmediately ?? false,
    };

    if (dto.cancelImmediately) {
      await this.applyImmediateCancellation(subscription, metadata);
      return {
        cancelImmediately: true,
        status: 'CANCELED',
      };
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        metadata,
      },
    });

    try {
      await this.queueOrganizationExport(subscription.organizationId);
    } catch (error) {
      this.logger.warn(
        `No se pudo programar la exportacion previa para la cancelacion solicitada por la organizacion ${subscription.organizationId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: 'Cancelacion programada por el usuario',
      diff: {
        organizationId: subscription.organizationId,
        cancelImmediately: false,
        reason: metadata.cancellationRequest,
      },
    });

    return {
      cancelImmediately: false,
      status: 'SCHEDULED',
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  async listInvoices(organizationId: number) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException(
        'Debes especificar una organización válida.',
      );
    }

    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: { plan: true },
        },
        paymentMethod: true,
      },
    });

    return invoices.map((invoice) => {
      const metadata = this.coerceJsonRecord(invoice.metadata);
      const pdfFilename =
        metadata.pdfFilename ??
        metadata.sunatPdfFilename ??
        metadata.filename ??
        null;
      return {
        id: invoice.id,
        code: invoice.providerInvoiceId ?? `INV-${invoice.id}`,
        amount: this.decimalToString(invoice.amount),
        currency: invoice.currency,
        status: invoice.status,
        billingPeriodStart: invoice.billingPeriodStart,
        billingPeriodEnd: invoice.billingPeriodEnd,
        createdAt: invoice.createdAt,
        planName: invoice.subscription?.plan?.name ?? null,
        paymentMethod: invoice.paymentMethod
          ? {
              brand: invoice.paymentMethod.brand,
              last4: invoice.paymentMethod.last4,
            }
          : null,
        pdfAvailable: Boolean(pdfFilename),
        pdfFilename,
        canRetry:
          invoice.status !== SubscriptionInvoiceStatus.PAID &&
          invoice.status !== SubscriptionInvoiceStatus.VOID,
      };
    });
  }

  async retryInvoice(organizationId: number, invoiceId: number) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Invoice no encontrada');
    }
    if (invoice.status === SubscriptionInvoiceStatus.PAID) {
      throw new BadRequestException(
        'Esta factura ya fue pagada y no puede reintentarse.',
      );
    }

    const metadata = this.coerceJsonRecord(invoice.metadata);
    await this.dispatchDunningAttempt(
      invoice as SubscriptionInvoice & {
        subscription: Subscription & { plan: SubscriptionPlan };
      },
      metadata,
    );

    return { ok: true };
  }

  async getInvoicePdf(organizationId: number, invoiceId: number) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundException('Invoice no encontrada');
    }
    const metadata = this.coerceJsonRecord(invoice.metadata);
    const filename =
      metadata.pdfFilename ??
      metadata.sunatPdfFilename ??
      metadata.filename ??
      null;
    if (!filename) {
      throw new NotFoundException('Esta factura no tiene PDF disponible');
    }
    const docType = this.resolvePdfDocumentType(metadata.pdfType);

    const record = await this.prisma.sunatStoredPdf.findFirst({
      where: {
        organizationId,
        companyId: invoice.companyId,
        filename,
        type: docType,
      },
    });

    if (!record) {
      throw new NotFoundException(
        'El PDF asociado no se encontró en el sistema',
      );
    }

    const path = this.sunatService.getComprobantePdfPath(
      docType,
      record.filename,
      record.relativePath,
    );

    return {
      path,
      filename: record.filename,
    };
  }

  async listOrganizationExports(organizationId: number) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException('organizationId invalido');
    }
    const exports = await this.exportService.listExports(organizationId);
    return exports.map((item) => ({
      id: item.id,
      status: item.status,
      cleanupStatus: item.cleanupStatus,
      requestedAt: item.requestedAt,
      completedAt: item.completedAt,
      expiresAt: item.expiresAt,
      errorMessage: item.errorMessage ?? null,
      fileReady: Boolean(item.filePath),
    }));
  }

  async requestOrganizationExport(
    organizationId: number,
    requestedBy?: number,
  ) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException('organizationId invalido');
    }
    return this.exportService.requestExport(
      organizationId,
      requestedBy ?? null,
    );
  }

  async downloadOrganizationExport(organizationId: number, exportId: number) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException('organizationId invalido');
    }
    if (!Number.isFinite(exportId) || exportId <= 0) {
      throw new BadRequestException('exportId invalido');
    }
    return this.exportService.getExportFile(organizationId, exportId);
  }

  async listPaymentMethods(organizationId: number) {
    if (!Number.isFinite(organizationId) || organizationId <= 0) {
      throw new BadRequestException('organizationId inválido');
    }
    return this.prisma.billingPaymentMethod.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async upsertPaymentMethod(dto: UpsertPaymentMethodDto) {
    let normalizedDto = dto;
    if (
      dto.provider === BillingPaymentProvider.MERCADOPAGO &&
      dto.tokenized
    ) {
      normalizedDto = await this.materializeMercadoPagoPaymentMethod(dto);
    }

    return this.prisma.$transaction(async (tx) => {
      const uniqueWhere = {
        organizationId_externalId: {
          organizationId: normalizedDto.organizationId,
          externalId: normalizedDto.externalId,
        },
      };

      const existingMethod = await tx.billingPaymentMethod.findUnique({
        where: uniqueWhere,
      });
      const hasCustomerPatch = normalizedDto.billingCustomerId !== undefined;
      const metadataForStorage = hasCustomerPatch
        ? {
            ...this.coerceJsonRecord(existingMethod?.metadata),
            billingCustomerId: normalizedDto.billingCustomerId ?? null,
          }
        : null;

      const record = await tx.billingPaymentMethod.upsert({
        where: uniqueWhere,
        create: {
          organizationId: normalizedDto.organizationId,
          provider: normalizedDto.provider,
          externalId: normalizedDto.externalId,
          brand: normalizedDto.brand ?? null,
          last4: normalizedDto.last4 ?? null,
          expMonth: normalizedDto.expMonth ?? null,
          expYear: normalizedDto.expYear ?? null,
          country: normalizedDto.country ?? null,
          status: 'ACTIVE',
          isDefault: normalizedDto.isDefault ?? false,
          ...(metadataForStorage ? { metadata: metadataForStorage } : {}),
        },
        update: {
          provider: normalizedDto.provider,
          brand: normalizedDto.brand ?? null,
          last4: normalizedDto.last4 ?? null,
          expMonth: normalizedDto.expMonth ?? null,
          expYear: normalizedDto.expYear ?? null,
          country: normalizedDto.country ?? null,
          status: 'ACTIVE',
          ...(normalizedDto.isDefault !== undefined
            ? { isDefault: normalizedDto.isDefault }
            : {}),
          ...(metadataForStorage ? { metadata: metadataForStorage } : {}),
        },
      });

      const hasDefault =
        (await tx.billingPaymentMethod.count({
          where: {
            organizationId: normalizedDto.organizationId,
            isDefault: true,
          },
        })) > 0;

      const shouldSetDefault =
        normalizedDto.isDefault === true ||
        (!hasDefault && normalizedDto.isDefault !== false);

      if (shouldSetDefault) {
        await this.setDefaultPaymentMethodForOrg(
          tx,
          normalizedDto.organizationId,
          record.id,
          normalizedDto.billingCustomerId ?? null,
        );
      } else if (normalizedDto.billingCustomerId) {
        await tx.subscription.updateMany({
          where: { organizationId: normalizedDto.organizationId },
          data: { billingCustomerId: normalizedDto.billingCustomerId },
        });
      }

      return record;
    });
  }

  async removePaymentMethod(organizationId: number, methodId: number) {
    const method = await this.prisma.billingPaymentMethod.findFirst({
      where: { id: methodId, organizationId },
    });
    if (!method) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    await this.prisma.billingPaymentMethod.delete({
      where: { id: methodId },
    });

    if (method.isDefault) {
      const next = await this.prisma.billingPaymentMethod.findFirst({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await this.setDefaultPaymentMethodForOrg(
          this.prisma,
          organizationId,
          next.id,
          this.extractPaymentMethodCustomerId(next.metadata),
        );
      } else {
        await this.setDefaultPaymentMethodForOrg(
          this.prisma,
          organizationId,
          null,
          null,
        );
      }
    }

    return { removed: true };
  }

  async markDefaultPaymentMethod(organizationId: number, methodId: number) {
    const method = await this.prisma.billingPaymentMethod.findFirst({
      where: { id: methodId, organizationId },
    });
    if (!method) {
      throw new NotFoundException('Método de pago no encontrado');
    }

    await this.setDefaultPaymentMethodForOrg(
      this.prisma,
      organizationId,
      method.id,
      this.extractPaymentMethodCustomerId(method.metadata),
    );

    return { ok: true };
  }

  private async materializeMercadoPagoPaymentMethod(
    dto: UpsertPaymentMethodDto,
  ): Promise<UpsertPaymentMethodDto> {
    const accessToken =
      this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new BadRequestException(
        'Mercado Pago no esta configurado para tokenizar tarjetas',
      );
    }

    const customerId = await this.ensureMercadoPagoCustomer(
      dto.organizationId,
      dto.billingCustomerId,
      {
        email: dto.cardholderEmail,
        name: dto.cardholderName,
        identificationType: dto.identificationType,
        identificationNumber: dto.identificationNumber,
      },
      accessToken,
    );

    try {
      const response = await axios.post(
        `https://api.mercadopago.com/v1/customers/${customerId}/cards`,
        { token: dto.externalId },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const card = response.data;
      if (!card?.id) {
        throw new Error('Mercado Pago no devolvio un identificador de tarjeta');
      }

      return {
        ...dto,
        tokenized: false,
        externalId: card.id,
        brand:
          card.payment_method?.id ??
          card.payment_method?.name ??
          dto.brand ??
          null,
        last4: card.last_four_digits ?? dto.last4 ?? null,
        expMonth: card.expiration_month ?? dto.expMonth ?? null,
        expYear: card.expiration_year ?? dto.expYear ?? null,
        country:
          card.cardholder?.identification?.type ?? dto.country ?? null,
        billingCustomerId: customerId,
      };
    } catch (error) {
      const details =
        axios.isAxiosError(error) && error.response?.data
          ? ` Detalle: ${JSON.stringify(error.response.data)}`
          : '';
      this.logger.error(
        `No se pudo registrar la tarjeta tokenizada en Mercado Pago para la organizacion ${dto.organizationId}${details}`,
      );
      throw new BadRequestException(
        'Mercado Pago rechazo la tokenizacion de la tarjeta.',
      );
    }
  }

  private async ensureMercadoPagoCustomer(
    organizationId: number,
    providedCustomerId: string | null | undefined,
    holder: {
      email?: string | null;
      name?: string | null;
      identificationType?: string | null;
      identificationNumber?: string | null;
    },
    accessToken: string,
  ): Promise<string> {
    if (providedCustomerId) {
      return providedCustomerId;
    }
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      select: { billingCustomerId: true },
    });
    if (subscription?.billingCustomerId) {
      return subscription.billingCustomerId;
    }

    const membership = await this.prisma.organizationMembership.findFirst({
      where: { organizationId },
      include: {
        user: { select: { email: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const email =
      holder.email?.trim() ||
      membership?.user?.email ||
      `org-${organizationId}@example.invalid`;
    const name =
      holder.name?.trim() ||
      membership?.user?.username ||
      `Org ${organizationId}`;

    const payload: Record<string, unknown> = {
      email,
      first_name: name,
      description: `Org ${organizationId}`,
    };
    if (
      holder.identificationType?.trim() &&
      holder.identificationNumber?.trim()
    ) {
      payload.identification = {
        type: holder.identificationType,
        number: holder.identificationNumber,
      };
    }

    const response = await axios.post(
      'https://api.mercadopago.com/v1/customers',
      payload,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    const customerId = response.data?.id;
    if (!customerId) {
      throw new BadRequestException(
        'Mercado Pago no devolvio un identificador de cliente',
      );
    }

    await this.prisma.subscription.updateMany({
      where: { organizationId },
      data: { billingCustomerId: customerId },
    });
    return customerId;
  }

  async finalizeCheckoutSession(sessionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        metadata: {
          path: ['pendingCheckout', 'sessionId'],
          equals: sessionId,
        },
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      this.logger.warn(`Checkout session ${sessionId} not found`);
      throw new NotFoundException(
        `No se encontró suscripción asociada a la sesión ${sessionId}`,
      );
    }

    const wasTrial = subscription.status === SubscriptionStatus.TRIAL;
    const plan = subscription.plan;
    const now = new Date();
    const periodEnd = this.calculateNextPeriodEnd(now, plan);
    const metadata = this.coerceJsonRecord(subscription.metadata);
    delete metadata.pendingCheckout;

    const billingCompany = await this.getBillingCompanySnapshot(
      subscription.organizationId,
    );

    let createdInvoice: SubscriptionInvoice | null = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
          cancelAtPeriodEnd: false,
          metadata,
        },
      });

      const price = new Prisma.Decimal(plan.price);
      const taxInfo = await this.taxRateService.getRateForOrganization(
        subscription.organizationId,
      );
      const taxRateDecimal = new Prisma.Decimal(taxInfo.rate ?? 0);
      const taxAmount = price.mul(taxRateDecimal);
      const totalAmount = price.add(taxAmount);

      createdInvoice = await tx.subscriptionInvoice.create({
        data: {
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId,
          companyId: billingCompany.id,
          status: SubscriptionInvoiceStatus.PAID,
          subtotal: price,
          taxRate: taxRateDecimal,
          taxAmount,
          amount: totalAmount,
          currency: plan.currency,
          billingPeriodStart: now,
          billingPeriodEnd: periodEnd,
          paidAt: now,
          metadata: {
            provider: 'mock',
            sessionId,
            taxCountry: taxInfo.countryCode ?? null,
            taxRegion: taxInfo.regionCode ?? null,
          },
        },
      });
    });

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: `Suscripción activada mediante la sesión ${sessionId}`,
      diff: {
        organizationId: subscription.organizationId,
        planId: plan.id,
        previousStatus: subscription.status,
        newStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: periodEnd.toISOString(),
      },
    });

    this.logger.log(
      `Subscription ${subscription.id} activated via session ${sessionId}`,
    );

    if (createdInvoice) {
      const invoiceForSunat: SubscriptionInvoice = createdInvoice;
      const invoiceMetadata = this.coerceJsonRecord(
        invoiceForSunat.metadata ?? {},
      );
      await this.logAuditEvent({
        action: AuditAction.CREATED,
        entityType: 'subscription_invoice',
        entityId: invoiceForSunat.id.toString(),
        summary: `Invoice de suscripción emitida por ${invoiceForSunat.amount.toString()} ${invoiceForSunat.currency}`,
        diff: {
          subscriptionId: subscription.id,
          organizationId: subscription.organizationId,
          amount: invoiceForSunat.amount.toString(),
          subtotal: invoiceForSunat.subtotal.toString(),
          taxRate: invoiceForSunat.taxRate.toString(),
          taxAmount: invoiceForSunat.taxAmount.toString(),
          taxCountry: invoiceMetadata.taxCountry ?? null,
          taxRegion: invoiceMetadata.taxRegion ?? null,
        },
      });
      try {
        await this.emitSunatForSubscriptionInvoice({
          invoice: invoiceForSunat,
          plan,
          company: billingCompany,
          organizationId: subscription.organizationId,
        });
      } catch (error) {
        this.logger.error(
          `No se pudo emitir comprobante SUNAT para la invoice ${invoiceForSunat.id}: ${
            (error as Error)?.message ?? 'error desconocido'
          }`,
        );
      }
    }

    await this.autoExportAndCleanupDemoData(
      subscription.organizationId,
      'activation',
    );

    if (wasTrial) {
      this.metrics.recordTrialConverted(plan.code);
    }

    return {
      subscriptionId: subscription.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
    };
  }

  async handleWebhookEvent(
    event: PaymentWebhookEvent,
    headers?: Record<string, string>,
  ) {
    let normalized: PaymentWebhookEvent | null;
    try {
      normalized = await this.normalizeWebhookEvent(event, headers);
    } catch (error) {
      this.metrics.recordWebhookEvent(
        (event.provider ?? 'unknown').toLowerCase(),
        event.type ?? 'unknown',
        'failed',
      );
      throw error;
    }

    if (!normalized) {
      this.metrics.recordWebhookEvent(
        (event.provider ?? 'unknown').toLowerCase(),
        event.type ?? 'ignored',
        'success',
      );
      return { received: true, ignored: true };
    }

    try {
      const result = await this.dispatchWebhookEvent(normalized);
      this.metrics.recordWebhookEvent(
        normalized.provider,
        normalized.type,
        'success',
      );
      return result;
    } catch (error) {
      this.metrics.recordWebhookEvent(
        normalized.provider,
        normalized.type,
        'failed',
      );
      throw error;
    }
  }
  private async normalizeWebhookEvent(
    event: PaymentWebhookEvent,
    headers?: Record<string, string>,
  ): Promise<PaymentWebhookEvent | null> {
    const provider = (event.provider ?? '').toLowerCase();
    if (provider === 'mercadopago') {
      this.verifyMercadoPagoSignature(headers);
      const normalized = await this.mercadoPagoWebhookService.normalizeEvent({
        provider: 'mercadopago',
        type: event.type,
        data: event.data ?? {},
      });
      return normalized;
    }

    const fallbackProvider = provider || event.provider || 'unknown';
    const normalizedType = event.type ?? 'unknown';
    return {
      provider: fallbackProvider,
      type: normalizedType,
      data: event.data ?? {},
    };
  }

  private async dispatchWebhookEvent(event: PaymentWebhookEvent) {
    const payload = event.data ?? {};
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionId = payload.sessionId ?? payload.id;
        if (!sessionId) {
          throw new BadRequestException(
            'El evento no incluye un sessionId para completar el checkout',
          );
        }
        return this.finalizeCheckoutSession(String(sessionId));
      }
      case 'invoice.payment_succeeded':
      case 'invoice.paid': {
        await this.applyInvoicePayment(payload);
        return { received: true };
      }
      case 'invoice.payment_failed': {
        await this.applyInvoiceFailure(payload);
        return { received: true };
      }
      case 'payment.created':
      case 'payment.updated': {
        await this.upsertPaymentMethodFromWebhook(payload);
        return { received: true };
      }
      default:
        this.logger.warn(
          `Webhook ${event.provider}:${event.type} ignorado (sin manejador)`,
        );
        return { received: true, ignored: true };
    }
  }

  async getSummaryForUser(
    userId: number,
    options?: { organizationId?: number; role?: string | null },
  ) {
    const normalizedRole = options?.role
      ? `${options.role}`.toUpperCase()
      : null;

    let organizationId: number | null = null;
    if (
      typeof options?.organizationId === 'number' &&
      Number.isFinite(options.organizationId)
    ) {
      if (options.organizationId <= 0) {
        throw new BadRequestException(
          'Debes especificar una organizacion valida.',
        );
      }

      if (normalizedRole !== 'SUPER_ADMIN_GLOBAL') {
        const membership = await this.prisma.organizationMembership.findFirst({
          where: { userId, organizationId: options.organizationId },
          select: { organizationId: true },
        });
        if (!membership) {
          throw new BadRequestException(
            'No tienes acceso a la organizacion solicitada.',
          );
        }
      }

      organizationId = options.organizationId;
    } else {
      organizationId = await this.resolveUserOrganizationId(userId);
    }

    if (!organizationId) {
      return this.buildFallbackSummary();
    }

    const [
      subscription,
      organization,
      company,
      memberships,
      usersCount,
      invoicesCount,
      lastPaidInvoice,
    ] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true, defaultPaymentMethod: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.company.findFirst({
        where: { organizationId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, legalName: true },
      }),
      this.prisma.organizationMembership.findMany({
        where: { organizationId },
        include: {
          user: {
            select: {
              email: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.organizationMembership.count({ where: { organizationId } }),
      this.prisma.subscriptionInvoice.count({ where: { organizationId } }),
      this.prisma.subscriptionInvoice.findFirst({
        where: {
          organizationId,
          status: SubscriptionInvoiceStatus.PAID,
        },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    let quotaSummary: Awaited<
      ReturnType<
        SubscriptionQuotaService['getSummaryByOrganization']
      >
    > | null = null;
    if (subscription) {
      try {
        quotaSummary =
          await this.quotaService.getSummaryByOrganization(organizationId);
      } catch (error) {
        this.logger.warn(
          `No se pudo obtener el resumen de consumo para la organizacion ${organizationId}: ${
            (error as Error)?.message ?? error
          }`,
        );
      }
    }

    const orgInfo = organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug ?? null,
        }
      : null;
    const companyInfo = company
      ? {
          id: company.id,
          name: company.name,
          legalName: company.legalName ?? null,
        }
      : null;
    const primaryContact = this.pickPrimaryContact(memberships);

    if (!subscription) {
      return this.buildFallbackSummary({
        usersCount,
        invoicesCount,
        organization: orgInfo ?? undefined,
        company: companyInfo ?? undefined,
        primaryContact,
      });
    }

    const now = Date.now();
    const trialEndsAt = subscription.trialEndsAt?.getTime() ?? null;
    const daysLeft =
      subscription.status === SubscriptionStatus.TRIAL && trialEndsAt
        ? Math.max(Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)), 0)
        : null;

    const rawQuotas = this.coerceJsonRecord(subscription.plan?.quotas);
    const subscriptionMetadata = this.coerceJsonRecord(subscription.metadata);
    const legacyGraceUntilMeta =
      typeof subscriptionMetadata.legacyGraceUntil === 'string'
        ? subscriptionMetadata.legacyGraceUntil
        : null;
    const graceLimits =
      subscriptionMetadata.graceLimits?.active &&
      subscriptionMetadata.graceLimits?.quotas
        ? {
            ...subscriptionMetadata.graceLimits,
            quotas: this.coerceJsonRecord(
              subscriptionMetadata.graceLimits.quotas,
            ),
          }
        : null;
    const quotas = graceLimits
      ? { ...rawQuotas, ...graceLimits.quotas }
      : rawQuotas;
    const normalizedQuotas = quotaSummary?.quotas ?? quotas;
    const legacyInfo = {
      isLegacy:
        quotaSummary?.legacy?.isLegacy ??
        (subscription.plan?.code ?? '').toLowerCase() === 'legacy',
      graceUntil: quotaSummary?.legacy?.graceUntil ?? legacyGraceUntilMeta,
    };
    const usage = quotaSummary?.usage ?? {
      users: usersCount,
      invoices: invoicesCount,
      storageMB: 0,
    };

    const complimentaryMeta = this.normalizeComplimentary(
      subscriptionMetadata?.complimentary ?? null,
    );

    return {
      organization: orgInfo,
      company: companyInfo,
      plan: {
        name: subscription.plan?.name ?? 'Plan actual',
        code: subscription.plan?.code ?? subscription.id.toString(),
        status: subscription.status,
        price: this.decimalToString(subscription.plan?.price),
        currency: subscription.plan?.currency ?? 'PEN',
        interval: subscription.plan?.interval ?? SubscriptionInterval.MONTHLY,
        features: this.coerceJsonRecord(subscription.plan?.features),
        isLegacy: legacyInfo.isLegacy,
        legacyGraceUntil: legacyInfo.graceUntil,
        restrictions: graceLimits
          ? {
              reason: graceLimits.reason ?? 'past_due',
              activatedAt: graceLimits.activatedAt ?? null,
            }
          : null,
      },
      trial: {
        isTrial: subscription.status === SubscriptionStatus.TRIAL,
        daysLeft,
        endsAt: subscription.trialEndsAt?.toISOString() ?? null,
      },
      billing: {
        currentPeriodStart:
          subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt?.toISOString() ?? null,
        lastInvoicePaidAt: lastPaidInvoice?.paidAt?.toISOString() ?? null,
        nextDueDate:
          subscription.currentPeriodEnd?.toISOString() ??
          lastPaidInvoice?.dueDate?.toISOString() ??
          null,
      },
      complimentary: complimentaryMeta,
      contacts: {
        primary: primaryContact,
      },
      quotas: {
        users: normalizedQuotas.users ?? null,
        invoices: normalizedQuotas.invoices ?? null,
        storageMB: normalizedQuotas.storageMB ?? null,
      },
      usage,
    };
  }

  private normalizeComplimentary(value: unknown) {
    const raw = this.coerceJsonRecord(value ?? {});
    if (!raw || Object.keys(raw).length === 0) {
      return null;
    }
    return {
      isActive: Boolean(raw.active),
      startsAt: typeof raw.startsAt === 'string' ? raw.startsAt : null,
      endsAt: typeof raw.endsAt === 'string' ? raw.endsAt : null,
      grantedAt: typeof raw.grantedAt === 'string' ? raw.grantedAt : null,
      durationMonths:
        typeof raw.durationMonths === 'number' ? raw.durationMonths : null,
      planCode: typeof raw.planCode === 'string' ? raw.planCode : null,
      reason: typeof raw.reason === 'string' ? raw.reason : null,
      grantedBy:
        raw.grantedBy && typeof raw.grantedBy === 'object'
          ? {
              userId:
                typeof (raw.grantedBy as Record<string, unknown>).userId ===
                'number'
                  ? (raw.grantedBy as Record<string, unknown>).userId
                  : null,
              email:
                typeof (raw.grantedBy as Record<string, unknown>).email ===
                'string'
                  ? (raw.grantedBy as Record<string, unknown>).email
                  : null,
              username:
                typeof (raw.grantedBy as Record<string, unknown>).username ===
                'string'
                  ? (raw.grantedBy as Record<string, unknown>).username
                  : null,
            }
          : null,
    };
  }

  private addMonths(date: Date, months: number) {
    const value = new Date(date);
    value.setMonth(value.getMonth() + months);
    return value;
  }

  private async resolveUserOrganizationId(userId: number) {
    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastOrgId: true, organizationId: true },
    });
    if (userRecord?.lastOrgId) return userRecord.lastOrgId;
    if (userRecord?.organizationId) return userRecord.organizationId;

    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: 'asc' },
    });
    return membership?.organizationId ?? null;
  }

  private async resolveUserOrganizationIdOrThrow(userId: number) {
    const organizationId = await this.resolveUserOrganizationId(userId);
    if (!organizationId) {
      throw new BadRequestException(
        'No se encontró una organización asociada al usuario.',
      );
    }
    return organizationId;
  }

  private pickPrimaryContact(
    memberships: Array<{
      role: string;
      user: { username: string | null; email: string };
    }>,
  ) {
    if (!memberships.length) return null;
    const priority = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MEMBER', 'VIEWER'];
    const selected =
      memberships.find((membership) => priority.includes(membership.role)) ??
      memberships[0];

    return {
      name: selected.user.username ?? selected.user.email,
      email: selected.user.email,
    };
  }

  private async ensurePlan(code: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan ${code} no disponible`);
    }
    return plan;
  }

  private async ensureOrganization(id: number) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) {
      throw new BadRequestException(
        `La organización ${id} no existe o está inactiva`,
      );
    }
  }

  private resolveTrialEnd(
    plan: SubscriptionPlan,
    requested?: string,
  ): Date | null {
    if (!requested && !plan.trialDays) {
      return null;
    }

    if (requested) {
      return new Date(requested);
    }

    const days = plan.trialDays ?? DEFAULT_TRIAL_DAYS;
    const base = new Date();
    base.setDate(base.getDate() + days);
    return base;
  }

  private coerceJsonRecord(value: unknown): Record<string, any> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    return {};
  }

  private calculateNextPeriodEnd(start: Date, plan: SubscriptionPlan): Date {
    const result = new Date(start);
    if (plan.interval === 'YEARLY') {
      result.setFullYear(result.getFullYear() + 1);
      return result;
    }
    result.setDate(result.getDate() + BILLING_CYCLE_DAYS);
    return result;
  }

  private async emitSunatForSubscriptionInvoice(params: {
    invoice: SubscriptionInvoice;
    plan: SubscriptionPlan;
    company: BillingCompanySnapshot;
    organizationId: number;
  }) {
    const { invoice, plan, company, organizationId } = params;

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, code: true },
    });

    const rucEmisor =
      company.sunatRuc?.trim() ??
      company.taxId?.trim() ??
      organization?.code ??
      null;

    if (!rucEmisor) {
      throw new BadRequestException(
        'La empresa emisora no tiene RUC configurado para SUNAT.',
      );
    }

    const serie = `SU${String(company.id % 100).padStart(2, '0')}`;
    const correlativo = invoice.id.toString().padStart(8, '0');
    const issueDate =
      invoice.billingPeriodStart?.toISOString().slice(0, 10) ??
      new Date().toISOString().slice(0, 10);

    const subtotal = Number(invoice.subtotal ?? invoice.amount ?? 0);
    const igv = Number(invoice.taxAmount ?? 0);
    const total = Number(invoice.amount ?? 0);

    const documentData = {
      serie,
      correlativo,
      fechaEmision: issueDate,
      tipoMoneda: invoice.currency ?? 'PEN',
      total,
      emisor: {
        ruc: rucEmisor,
        razonSocial: company.name ?? 'Factura Cloud',
      },
      cliente: {
        ruc: organization?.code ?? '00000000000',
        razonSocial: organization?.name ?? 'Cliente Suscripción',
      },
      items: [
        {
          descripcion: `Suscripción ${plan.name}`,
          cantidad: 1,
          precioUnitario: subtotal,
          subTotal: subtotal,
          igv,
          total,
        },
      ],
    };

    await this.sunatService.sendDocument({
      companyId: company.id,
      documentType: 'invoice',
      documentData,
      subscriptionInvoiceId: invoice.id,
    });
  }

  private buildFallbackSummary(params?: {
    usersCount?: number;
    invoicesCount?: number;
    organization?: { id: number; name: string | null; slug: string | null };
    company?: { id: number; name: string | null; legalName: string | null };
    primaryContact?: { name: string; email: string } | null;
  }) {
    return {
      organization: params?.organization ?? null,
      company: params?.company ?? null,
      plan: {
        name: 'Plan demo',
        code: 'trial',
        status: SubscriptionStatus.TRIAL,
        price: null,
        currency: 'PEN',
        interval: SubscriptionInterval.MONTHLY,
        features: {},
        isLegacy: false,
        legacyGraceUntil: null,
        restrictions: null,
      },
      trial: {
        isTrial: true,
        daysLeft: DEFAULT_TRIAL_DAYS,
        endsAt: null,
      },
      billing: {
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        lastInvoicePaidAt: null,
        nextDueDate: null,
      },
      contacts: {
        primary: params?.primaryContact ?? null,
      },
      quotas: {
        users: null,
        invoices: null,
        storageMB: null,
      },
      usage: {
        users: params?.usersCount ?? 1,
        invoices: params?.invoicesCount ?? 0,
        storageMB: 0,
      },
    };
  }

  async applyScheduledPlanChanges() {
    const nowIso = new Date().toISOString();
    const now = new Date();
    const [planChanges, cancellations] = await Promise.all([
      this.prisma.subscription.findMany({
        where: {
          metadata: {
            path: ['pendingPlanChange', 'scheduledFor'],
            lte: nowIso,
          },
        },
        include: { plan: true },
      }),
      this.prisma.subscription.findMany({
        where: {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: {
            not: null,
            lte: now,
          },
        },
        include: { plan: true },
      }),
    ]);

    for (const subscription of planChanges) {
      const metadata = this.coerceJsonRecord(subscription.metadata);
      const pending = metadata.pendingPlanChange;
      if (!pending) {
        continue;
      }

      let targetPlan: SubscriptionPlan | null = null;
      if (pending.planId) {
        targetPlan = await this.prisma.subscriptionPlan.findUnique({
          where: { id: Number(pending.planId) },
        });
      }
      if (!targetPlan && pending.planCode) {
        try {
          targetPlan = await this.ensurePlan(String(pending.planCode));
        } catch {
          targetPlan = null;
        }
      }

      if (!targetPlan) {
        this.logger.warn(
          `No se pudo resolver el plan pendiente para la organización ${subscription.organizationId}`,
        );
        metadata.pendingPlanChange = null;
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { metadata },
        });
        continue;
      }

      await this.applyScheduledPlanChange(subscription, targetPlan, metadata);
    }
    for (const subscription of cancellations) {
      const metadata = this.coerceJsonRecord(subscription.metadata);
      await this.applyScheduledCancellation(subscription, metadata);
    }
  }

  async processDueDunningInvoices() {
    const now = new Date();
    const invoices = await this.prisma.subscriptionInvoice.findMany({
      where: { status: SubscriptionInvoiceStatus.FAILED },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    for (const invoice of invoices) {
      const metadata = this.coerceJsonRecord(invoice.metadata);
      const dunning = metadata.dunning;
      if (!dunning?.nextAttemptAt) {
        continue;
      }
      const nextAttemptDate = new Date(dunning.nextAttemptAt);
      if (Number.isNaN(nextAttemptDate.getTime())) {
        continue;
      }
      if (nextAttemptDate > now) {
        continue;
      }
      await this.dispatchDunningAttempt(invoice, metadata);
    }
  }

  private async logAuditEvent(entry: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    summary: string;
    diff?: Prisma.JsonValue;
  }) {
    try {
      await this.activityService.log({
        ...entry,
        actorEmail: SYSTEM_AUDIT_ACTOR,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar el log de auditoría (${entry.action} ${entry.entityType}): ${
          (error as Error)?.message ?? 'error desconocido'
        }`,
      );
    }
  }

  private async applyInvoicePayment(payload: Record<string, any>) {
    const invoice = await this.resolveInvoiceFromPayload(payload);
    if (!invoice) {
      this.logger.warn(
        `No se encontr�� la invoice del evento de pago: ${JSON.stringify(payload)}`,
      );
      return;
    }
    if (invoice.status === SubscriptionInvoiceStatus.PAID) {
      return;
    }
    const now = new Date();
    const metadata = this.coerceJsonRecord(invoice.metadata);
    metadata.lastWebhookPayload = payload;
    metadata.dunning = null;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: SubscriptionInvoiceStatus.PAID,
          paidAt: now,
          metadata,
        },
      });

      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: invoice.billingPeriodStart ?? now,
          currentPeriodEnd:
            invoice.billingPeriodEnd ??
            this.calculateNextPeriodEnd(
              invoice.billingPeriodStart ?? now,
              invoice.subscription.plan,
            ),
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });
    });

    await this.clearGraceRestrictions(invoice.subscriptionId);
    await this.autoExportAndCleanupDemoData(
      invoice.organizationId,
      'activation',
    );
  }

  private async applyInvoiceFailure(payload: Record<string, any>) {
    const invoice = await this.resolveInvoiceFromPayload(payload);
    if (!invoice) {
      this.logger.warn(
        `No se encontr�� la invoice del evento de fallo: ${JSON.stringify(payload)}`,
      );
      return;
    }
    const now = new Date();
    const metadata = this.coerceJsonRecord(invoice.metadata);
    const nextState = this.buildNextDunningState(metadata.dunning, now);
    metadata.dunning = nextState;
    metadata.lastWebhookPayload = payload;

    await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: SubscriptionInvoiceStatus.FAILED,
          metadata,
        },
      });
      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: {
          status: SubscriptionStatus.PAST_DUE,
        },
      });
    });

    await this.notifyInvoiceFailure(invoice, nextState);
    await this.applyGraceRestrictions(invoice.subscriptionId);

    if (nextState.exhausted) {
      this.logger.warn(
        `Dunning agotado para la invoice ${invoice.id} de la organizacion ${invoice.organizationId}`,
      );
      await this.handleExhaustedDunning(invoice, nextState);
    }
  }

  private async resolveInvoiceFromPayload(
    payload: Record<string, any>,
  ): Promise<
    | (SubscriptionInvoice & {
        subscription: Subscription & { plan: SubscriptionPlan };
      })
    | null
  > {
    const invoiceId = this.normalizeNumber(
      payload.invoiceId ?? payload.id ?? payload.data?.invoiceId,
    );
    if (invoiceId) {
      return this.prisma.subscriptionInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          subscription: { include: { plan: true } },
        },
      });
    }

    const providerInvoiceId =
      typeof payload.providerInvoiceId === 'string'
        ? payload.providerInvoiceId
        : typeof payload.externalReference === 'string'
          ? payload.externalReference
          : typeof payload.id === 'string'
            ? payload.id
            : null;

    if (providerInvoiceId) {
      return this.prisma.subscriptionInvoice.findFirst({
        where: { providerInvoiceId },
        include: {
          subscription: { include: { plan: true } },
        },
      });
    }

    return null;
  }

  private buildNextDunningState(
    existing: Record<string, any> | undefined,
    now: Date,
  ) {
    const failures = Number(existing?.failures ?? 0) + 1;
    const scheduleIndex = failures - 1;
    const delay =
      scheduleIndex >= 0 && scheduleIndex < DUNNING_SCHEDULE_DAYS.length
        ? DUNNING_SCHEDULE_DAYS[scheduleIndex]
        : null;
    return {
      ...(existing ?? {}),
      failures,
      lastFailureAt: now.toISOString(),
      nextAttemptAt: delay ? this.addDays(now, delay).toISOString() : null,
      exhausted: !delay,
    };
  }

  private async dispatchDunningAttempt(
    invoice: SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    },
    metadata: Record<string, any>,
  ) {
    const dunning = metadata.dunning ?? {};
    const attempts = Number(dunning.attempts ?? 0) + 1;
    const { successUrl, cancelUrl } = this.resolveBillingRetryUrls(
      invoice.subscription.organizationId,
      invoice.id,
    );
    try {
      const session = await this.paymentProvider.createCheckoutSession({
        organizationId: invoice.subscription.organizationId,
        planCode: invoice.subscription.plan.code,
        amount: this.decimalToString(invoice.amount),
        currency: invoice.currency ?? invoice.subscription.plan.currency,
        successUrl,
        cancelUrl,
        metadata: {
          invoiceId: invoice.id,
          retryAttempt: attempts,
        },
      });
      dunning.attempts = attempts;
      dunning.lastAttemptAt = new Date().toISOString();
      dunning.nextAttemptAt = null;
      dunning.pendingSessionId = session.sessionId;
      dunning.checkoutUrl = session.checkoutUrl;
      metadata.dunning = dunning;
      await this.prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { metadata },
      });
      this.logger.log(
        `Dunning attempt ${attempts} generado para invoice ${invoice.id}`,
      );
      await this.notifyDunningScheduled(invoice, attempts, session.checkoutUrl);
      this.metrics.recordDunningAttempt('success');
    } catch (error) {
      dunning.lastAttemptAt = new Date().toISOString();
      metadata.dunning = dunning;
      await this.prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { metadata },
      });
      this.logger.error(
        `Fallo al crear sesi��n de checkout para invoice ${invoice.id}: ${
          (error as Error)?.message ?? error
        }`,
      );
      this.metrics.recordDunningAttempt('failed');
    }
  }

  private verifyMercadoPagoSignature(headers?: Record<string, string>) {
    const secretKey = this.configService.get<string>(
      'MERCADOPAGO_WEBHOOK_SECRET',
    );
    if (!secretKey) {
      return;
    }

    const signatureHeader =
      headers?.['x-signature'] ?? headers?.['X-Signature'];
    const userId = headers?.['x-user-id'] ?? headers?.['X-User-Id'];
    const resource =
      headers?.['x-topic'] ??
      headers?.['x-resource-id'] ??
      headers?.['X-Topic'] ??
      headers?.['X-Resource-Id'];

    if (!signatureHeader || !userId || !resource) {
      throw new BadRequestException(
        'Encabezados faltantes para verificar firma',
      );
    }

    const [algo, receivedSignature] = signatureHeader.split(',');
    if (!algo || !receivedSignature) {
      throw new BadRequestException('Formato de firma inválido');
    }

    const signatureValue = receivedSignature.split('=')[1];
    if (!signatureValue) {
      throw new BadRequestException('Valor de firma inválido');
    }

    const payload = `id:${resource};user_id:${userId}`;
    const hmac = crypto.createHmac(algo.toLowerCase(), secretKey);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== signatureValue) {
      throw new BadRequestException('Firma inválida para el webhook recibido');
    }
  }

  private async upsertPaymentMethodFromWebhook(payload: Record<string, any>) {
    const metadata = this.coerceJsonRecord(
      payload.metadata ?? payload.data?.metadata ?? {},
    );
    const organizationId = this.normalizeNumber(
      metadata.organizationId ??
        payload.organizationId ??
        payload.data?.organizationId ??
        payload?.body?.organizationId,
    );
    if (!organizationId) {
      this.logger.warn(
        `Webhook de pago sin organizationId: ${JSON.stringify(payload)}`,
      );
      return;
    }

    const externalIdRaw =
      payload.card?.id ??
      payload.payment_method_id ??
      payload.payment_method?.id ??
      payload.id;
    if (!externalIdRaw) {
      this.logger.warn(
        `Webhook de pago sin identificador de método para org ${organizationId}`,
      );
      return;
    }
    const externalId = String(externalIdRaw);
    await this.upsertPaymentMethod({
      organizationId,
      provider: BillingPaymentProvider.MERCADOPAGO,
      externalId,
      brand:
        payload.card?.brand ??
        payload.payment_method?.type ??
        payload.card?.first_six_digits ??
        undefined,
      last4: payload.card?.last_four_digits ?? undefined,
      expMonth:
        this.normalizeNumber(payload.card?.expiration_month) ?? undefined,
      expYear: this.normalizeNumber(payload.card?.expiration_year) ?? undefined,
      country: payload.card?.cardholder?.identification?.type ?? undefined,
      isDefault: true,
      billingCustomerId: payload.payer?.id
        ? String(payload.payer.id)
        : undefined,
    });
  }

  private async applyScheduledPlanChange(
    subscription: Subscription & { plan: SubscriptionPlan },
    targetPlan: SubscriptionPlan,
    metadata: Record<string, any>,
  ) {
    const now = new Date();
    const billingCompany = await this.getBillingCompanySnapshot(
      subscription.organizationId,
    );
    const taxInfo = await this.taxRateService.getRateForOrganization(
      subscription.organizationId,
    );
    const taxRateDecimal = new Prisma.Decimal(taxInfo.rate ?? 0);
    const price = new Prisma.Decimal(targetPlan.price ?? 0);
    const taxAmount = price.mul(taxRateDecimal);
    const totalAmount = price.add(taxAmount);
    const periodEnd = this.calculateNextPeriodEnd(now, targetPlan);

    await this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        companyId: billingCompany.id,
        status: SubscriptionInvoiceStatus.PENDING,
        amount: totalAmount,
        subtotal: price,
        taxRate: taxRateDecimal,
        taxAmount,
        currency: targetPlan.currency,
        billingPeriodStart: now,
        billingPeriodEnd: periodEnd,
        metadata: {
          reason: 'plan_change_cycle',
          planCode: targetPlan.code,
        },
      },
    });

    metadata.pendingPlanChange = null;
    metadata.lastPlanChangeAt = now.toISOString();

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: targetPlan.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata,
      },
    });

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: `Se aplicó el cambio de plan programado a ${targetPlan.code}`,
      diff: {
        organizationId: subscription.organizationId,
        previousPlanId: subscription.planId,
        newPlanId: targetPlan.id,
      },
    });
  }

  private async applyScheduledCancellation(
    subscription: Subscription & { plan: SubscriptionPlan },
    metadata: Record<string, any>,
  ) {
    metadata.cancellationRequest = null;
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
        metadata,
      },
    });
    this.metrics.recordSubscriptionCanceled('scheduled');

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: 'Suscripción cancelada al final del periodo',
      diff: {
        organizationId: subscription.organizationId,
        planId: subscription.planId,
      },
    });
    await this.autoExportAndCleanupDemoData(
      subscription.organizationId,
      'cancellation',
    );
  }

  private async applyImmediatePlanChange(
    subscription: Subscription & { plan: SubscriptionPlan },
    targetPlan: SubscriptionPlan,
    metadata?: Record<string, any>,
    checkoutOptions?: { successUrl?: string; cancelUrl?: string },
  ) {
    const meta = metadata ?? this.coerceJsonRecord(subscription.metadata);
    const now = new Date();
    const periodEnd =
      subscription.currentPeriodEnd ??
      this.calculateNextPeriodEnd(now, targetPlan);
    const periodStart = subscription.currentPeriodStart ?? now;
    const totalDays = Math.max(this.diffInDays(periodEnd, periodStart), 1);
    const remainingDays = Math.max(this.diffInDays(periodEnd, now), 0);

    const ratio =
      totalDays === 0
        ? new Prisma.Decimal(0)
        : new Prisma.Decimal(remainingDays).div(totalDays);

    const oldPrice = new Prisma.Decimal(subscription.plan.price ?? 0);
    const newPrice = new Prisma.Decimal(targetPlan.price ?? 0);
    const delta = newPrice.mul(ratio).minus(oldPrice.mul(ratio));

    let checkoutSession: CheckoutSessionResult | null = null;
    let invoiceId: number | null = null;

    if (delta.toNumber() > 0.01) {
      const planChangeInvoice = await this.createPlanChangeInvoice(
        subscription,
        targetPlan,
        delta,
        'plan_change_immediate',
        periodEnd,
      );
      invoiceId = planChangeInvoice.id;
      checkoutSession = await this.launchInvoiceCheckoutSession(
        planChangeInvoice,
        checkoutOptions,
      );
    } else if (delta.toNumber() < -0.01) {
      meta.planChangeCredit = {
        amount: delta.neg().toString(),
        updatedAt: now.toISOString(),
      };
    }

    meta.pendingPlanChange = null;
    meta.lastPlanChangeAt = now.toISOString();

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: targetPlan.id,
        metadata: meta,
      },
    });

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: `Cambio inmediato al plan ${targetPlan.code}`,
      diff: {
        organizationId: subscription.organizationId,
        previousPlanId: subscription.planId,
        newPlanId: targetPlan.id,
        delta: delta.toString(),
      },
    });

    return {
      invoiceId,
      checkoutSession,
    };
  }

  private async createPlanChangeInvoice(
    subscription: Subscription & { plan: SubscriptionPlan },
    targetPlan: SubscriptionPlan,
    amount: Prisma.Decimal,
    reason: string,
    billingPeriodEnd: Date,
  ): Promise<
    SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    }
  > {
    const billingCompany = await this.getBillingCompanySnapshot(
      subscription.organizationId,
    );
    const taxInfo = await this.taxRateService.getRateForOrganization(
      subscription.organizationId,
    );
    const taxRateDecimal = new Prisma.Decimal(taxInfo.rate ?? 0);
    const taxAmount = amount.mul(taxRateDecimal);
    const totalAmount = amount.add(taxAmount);
    const now = new Date();

    return this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId: subscription.id,
        organizationId: subscription.organizationId,
        companyId: billingCompany.id,
        status: SubscriptionInvoiceStatus.PENDING,
        amount: totalAmount,
        subtotal: amount,
        taxRate: taxRateDecimal,
        taxAmount,
        currency: targetPlan.currency,
        billingPeriodStart: now,
        billingPeriodEnd,
        metadata: {
          reason,
          planCode: targetPlan.code,
        },
      },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
  }

  private async launchInvoiceCheckoutSession(
    invoice: SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    },
    checkoutOptions?: { successUrl?: string; cancelUrl?: string },
  ) {
    const resolvedUrls =
      checkoutOptions?.successUrl && checkoutOptions?.cancelUrl
        ? {
            successUrl: checkoutOptions.successUrl,
            cancelUrl: checkoutOptions.cancelUrl,
          }
        : this.resolveBillingRetryUrls(
            invoice.subscription.organizationId,
            invoice.id,
          );
    const successUrl = resolvedUrls.successUrl;
    const cancelUrl = resolvedUrls.cancelUrl;
    this.logger.debug(
      `Launching checkout session invoice=${invoice.id} successUrl=${successUrl} cancelUrl=${cancelUrl}`,
    );

    const session = await this.paymentProvider.createCheckoutSession({
      organizationId: invoice.subscription.organizationId,
      planCode: invoice.subscription.plan.code,
      amount: this.decimalToString(invoice.amount),
      currency: invoice.currency ?? invoice.subscription.plan.currency,
      successUrl,
      cancelUrl,
      metadata: {
        invoiceId: invoice.id,
        reason:
          this.coerceJsonRecord(invoice.metadata).reason ??
          'plan_change_immediate',
      },
    });

    const metadata = this.coerceJsonRecord(invoice.metadata);
    metadata.pendingCheckout = {
      provider: session.provider,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      createdAt: new Date().toISOString(),
    };

    await this.prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { metadata },
    });

    return session;
  }

  private async getBillingCompanySnapshot(
    organizationId: number,
  ): Promise<BillingCompanySnapshot> {
    const billingCompany = (await this.prisma.company.findFirst({
      where: { organizationId },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        organizationId: true,
        name: true,
        taxId: true,
        sunatRuc: true,
        sunatEnvironment: true,
        sunatSolUserBeta: true,
        sunatSolPasswordBeta: true,
        sunatCertPathBeta: true,
        sunatKeyPathBeta: true,
        sunatSolUserProd: true,
        sunatSolPasswordProd: true,
        sunatCertPathProd: true,
        sunatKeyPathProd: true,
      },
    })) as BillingCompanySnapshot | null;

    if (!billingCompany) {
      throw new BadRequestException(
        'No existe una empresa configurada para emitir comprobantes de esta organización.',
      );
    }

    return billingCompany;
  }

  private async applyImmediateCancellation(
    subscription: Subscription & { plan: SubscriptionPlan },
    metadata: Record<string, any>,
  ) {
    metadata.cancellationRequest = metadata.cancellationRequest ?? {};
    metadata.cancellationRequest.processedAt = new Date().toISOString();
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
        metadata,
      },
    });

    this.metrics.recordSubscriptionCanceled('immediate');

    await this.logAuditEvent({
      action: AuditAction.UPDATED,
      entityType: 'subscription',
      entityId: subscription.id.toString(),
      summary: 'Suscripción cancelada de inmediato',
      diff: {
        organizationId: subscription.organizationId,
        planId: subscription.planId,
        reason: metadata.cancellationRequest,
      },
    });
    await this.autoExportAndCleanupDemoData(
      subscription.organizationId,
      'cancellation',
    );
  }

  private async queueOrganizationExport(organizationId: number) {
    try {
      await this.exportService.requestExport(organizationId, null);
    } catch (error) {
      this.logger.error(
        `No se pudo programar la exportacion de datos para la organizacion ${organizationId}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  private async notifyInvoiceFailure(
    invoice: SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    },
    nextState: Record<string, any>,
  ) {
    try {
      await this.notifications.sendInvoicePaymentFailed({
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        planName: invoice.subscription.plan?.name,
        amount: this.decimalToString(invoice.amount),
        currency:
          invoice.currency ?? invoice.subscription.plan.currency ?? 'PEN',
        nextAttemptAt: nextState?.nextAttemptAt
          ? new Date(nextState.nextAttemptAt)
          : null,
      });
      if (nextState?.exhausted) {
        await this.notifications.sendInvoiceDunningFinalNotice({
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
        });
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la notificacion de dunning para la invoice ${invoice.id}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  private async handleExhaustedDunning(
    invoice: SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    },
    dunningState: Record<string, any>,
  ) {
    const nowIso = new Date().toISOString();
    const subscriptionMetadata = this.coerceJsonRecord(
      invoice.subscription.metadata,
    );
    subscriptionMetadata.dunning = {
      ...(subscriptionMetadata.dunning ?? {}),
      exhaustedAt: nowIso,
      failures: dunningState.failures ?? subscriptionMetadata.dunning?.failures,
    };
    if (!subscriptionMetadata.cancellationRequest) {
      subscriptionMetadata.cancellationRequest = {
        reasonCategory: 'dunning_exhausted',
        customReason: null,
        requestedAt: nowIso,
        cancelImmediately: false,
        preCleanupPreparedAt: null,
      };
    }

    this.metrics.recordDunningAttempt('retry_exhausted');

    await this.prisma.subscription.update({
      where: { id: invoice.subscriptionId },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        cancelAtPeriodEnd: true,
        metadata: subscriptionMetadata,
      },
    });

    await this.applyGraceRestrictions(invoice.subscriptionId);
  }

  private async notifyDunningScheduled(
    invoice: SubscriptionInvoice & {
      subscription: Subscription & { plan: SubscriptionPlan };
    },
    attempt: number,
    checkoutUrl?: string | null,
  ) {
    try {
      await this.notifications.sendInvoiceDunningScheduled({
        organizationId: invoice.organizationId,
        invoiceId: invoice.id,
        attempt,
        checkoutUrl: checkoutUrl ?? undefined,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la notificacion del intento de dunning para la invoice ${invoice.id}: ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  private async autoExportAndCleanupDemoData(
    organizationId: number,
    trigger: 'activation' | 'cancellation',
  ) {
    try {
      await this.queueOrganizationExport(organizationId);
    } catch (error) {
      this.logger.warn(
        `No se pudo programar la exportacion previa para la organizacion ${organizationId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
    try {
      const progress =
        await this.onboardingService.getProgressForOrganization(organizationId);
      if (progress.demoStatus !== 'SEEDED') {
        return;
      }
      await this.onboardingService.clearDemoDataForOrganization(
        organizationId,
        trigger === 'activation'
          ? 'auto-clear-on-activation'
          : 'auto-clear-on-cancellation',
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo limpiar datos demo para la organizacion ${organizationId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async applyGraceRestrictions(subscriptionId: number) {
    try {
      await this.quotaService.activateGraceLimits(subscriptionId);
    } catch (error) {
      this.logger.warn(
        `No se pudieron aplicar restricciones de gracia para la suscripcion ${subscriptionId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  private async clearGraceRestrictions(subscriptionId: number) {
    try {
      await this.quotaService.clearGraceLimits(subscriptionId);
    } catch (error) {
      this.logger.warn(
        `No se pudieron limpiar restricciones de gracia para la suscripcion ${subscriptionId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  async preparePendingCancellations() {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        cancelAtPeriodEnd: true,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.TRIAL,
          ],
        },
      },
      select: {
        id: true,
        organizationId: true,
        metadata: true,
      },
    });

    for (const subscription of subscriptions) {
      const metadata = this.coerceJsonRecord(subscription.metadata);
      const request = metadata.cancellationRequest;
      if (!request || request.preCleanupPreparedAt) {
        continue;
      }
      await this.autoExportAndCleanupDemoData(
        subscription.organizationId,
        'cancellation',
      );
      request.preCleanupPreparedAt = new Date().toISOString();
      metadata.cancellationRequest = request;
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { metadata },
      });
    }
  }

  private async setDefaultPaymentMethodForOrg(
    client: PrismaService | Prisma.TransactionClient,
    organizationId: number,
    methodId: number | null,
    billingCustomerId?: string | null,
  ) {
    if (methodId) {
      await client.billingPaymentMethod.update({
        where: { id: methodId },
        data: { isDefault: true },
      });
      await client.billingPaymentMethod.updateMany({
        where: { organizationId, NOT: { id: methodId } },
        data: { isDefault: false },
      });
    } else {
      await client.billingPaymentMethod.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    const normalizedCustomerId =
      typeof billingCustomerId === 'string' && billingCustomerId.length > 0
        ? billingCustomerId
        : null;

    await client.subscription.updateMany({
      where: { organizationId },
      data: {
        defaultPaymentMethodId: methodId,
        billingCustomerId: normalizedCustomerId,
      },
    });
  }

  private extractPaymentMethodCustomerId(
    metadata: Prisma.JsonValue | null | undefined,
  ): string | null {
    const record = this.coerceJsonRecord(metadata ?? {});
    const value = record.billingCustomerId;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  }

  private diffInDays(target: Date, base: Date) {
    const diff = target.getTime() - base.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private resolveBillingRetryUrls(organizationId: number, invoiceId: number) {
    const base =
      this.configService.get<string>('PORTAL_BILLING_URL') ??
      this.configService.get<string>('PUBLIC_URL') ??
      'https://app.facturacloud.pe';
    const normalized = base.replace(/\/$/, '');
    const params = new URLSearchParams({
      org: String(organizationId),
      invoice: String(invoiceId),
    }).toString();
    return {
      successUrl: `${normalized}/portal/billing/success?${params}`,
      cancelUrl: `${normalized}/portal/billing/error?${params}`,
    };
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private normalizeNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private decimalToString(value: Prisma.Decimal | number | null | undefined) {
    if (value == null) {
      return '0';
    }
    if (value instanceof Prisma.Decimal) {
      return value.toFixed(2);
    }
    return Number(value).toFixed(2);
  }

  private resolvePdfDocumentType(input: unknown): 'boleta' | 'factura' {
    if (typeof input === 'string') {
      const normalized = input.toLowerCase();
      if (normalized.includes('boleta') || normalized === '03') {
        return 'boleta';
      }
      if (
        normalized.includes('factura') ||
        normalized === 'invoice' ||
        normalized === '01'
      ) {
        return 'factura';
      }
    }
    return 'factura';
  }
}
