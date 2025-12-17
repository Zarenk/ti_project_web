import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityService } from 'src/activity/activity.service';
import { OnboardingService } from 'src/onboarding/onboarding.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SunatService } from 'src/sunat/sunat.service';
import { TaxRateService } from './tax-rate.service';
import { OrganizationExportService } from './organization-export.service';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentProvider } from './payment-providers/payment-provider.interface';
import { MercadoPagoWebhookService } from './mercado-pago-webhook.service';
import { SubscriptionNotificationsService } from './subscription-notifications.service';
import { BillingPaymentProvider, SubscriptionStatus } from '@prisma/client';
import { SubscriptionQuotaService } from './subscription-quota.service';
import { SubscriptionPrometheusService } from './subscription-prometheus.service';

describe('SubscriptionsService – demo data cleanup automation', () => {
  let service: SubscriptionsService;
  const prisma = {} as PrismaService;
  const paymentProvider = {} as PaymentProvider;
  const taxRateService = { upsertDefaultRate: jest.fn() } as unknown as TaxRateService;
  const sunatService = {} as SunatService;
  const activityService = { log: jest.fn() } as unknown as ActivityService;
  const configService = { get: jest.fn() } as unknown as ConfigService;
  const onboardingService = {
    getProgressForOrganization: jest.fn(),
    clearDemoDataForOrganization: jest.fn(),
  } as unknown as OnboardingService;
  const exportService = {
    requestExport: jest.fn(),
  } as unknown as OrganizationExportService;
  const mpWebhookService = {
    normalizeEvent: jest.fn(),
  } as unknown as MercadoPagoWebhookService;
  const notifications = {
    sendInvoicePaymentFailed: jest.fn(),
    sendInvoiceDunningScheduled: jest.fn(),
    sendInvoiceDunningFinalNotice: jest.fn(),
  } as unknown as SubscriptionNotificationsService;
  const quotaService = {
    activateGraceLimits: jest.fn(),
    clearGraceLimits: jest.fn(),
  } as unknown as SubscriptionQuotaService;

  const metrics = {
    recordSignupStarted: jest.fn(),
    recordSignupCompleted: jest.fn(),
    recordTrialActivated: jest.fn(),
    recordTrialConverted: jest.fn(),
    recordSubscriptionCanceled: jest.fn(),
    recordWebhookEvent: jest.fn(),
    recordDunningAttempt: jest.fn(),
    recordDunningJobRun: jest.fn(),
  } as unknown as SubscriptionPrometheusService;

  const seedService = () => {
    service = new SubscriptionsService(
      prisma,
      paymentProvider,
      taxRateService,
      sunatService,
      activityService,
      configService,
      onboardingService,
      exportService,
      mpWebhookService,
      notifications,
      quotaService,
      metrics,
    );
    // reemplazamos el logger para poder inspeccionar advertencias
    (service as any).logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).subscription = {
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    };
    (prisma as any).subscriptionInvoice = {
      update: jest.fn(),
    };
    (prisma as any).billingPaymentMethod = {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    };
    (prisma as any).$transaction = jest
      .fn()
      .mockImplementation((cb: (client: typeof prisma) => any) => cb(prisma));
    (paymentProvider as any).createCheckoutSession = jest
      .fn()
      .mockResolvedValue({
        sessionId: 'sess_test',
        checkoutUrl: 'https://checkout.test',
      });
    seedService();
  });

  const callHelper = async (
    organizationId: number,
    trigger: 'activation' | 'cancellation',
  ) => {
    await (service as any).autoExportAndCleanupDemoData(organizationId, trigger);
  };

  it('solicita exportación y limpia datos demo al activar plan', async () => {
    (onboardingService.getProgressForOrganization as jest.Mock).mockResolvedValue({
      demoStatus: 'SEEDED',
    });

    await callHelper(101, 'activation');

    expect(exportService.requestExport).toHaveBeenCalledWith(101, null);
    expect(
      onboardingService.clearDemoDataForOrganization,
    ).toHaveBeenCalledWith(101, 'auto-clear-on-activation');
  });

  it('omite limpieza cuando la demo ya fue limpiada pero exporta para el backup', async () => {
    (onboardingService.getProgressForOrganization as jest.Mock).mockResolvedValue({
      demoStatus: 'NONE',
    });

    await callHelper(55, 'cancellation');

    expect(exportService.requestExport).toHaveBeenCalledWith(55, null);
    expect(
      onboardingService.clearDemoDataForOrganization,
    ).not.toHaveBeenCalled();
  });

  it('registra advertencia cuando falla la consulta de progreso', async () => {
    (onboardingService.getProgressForOrganization as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );

    await callHelper(77, 'activation');

    expect((service as any).logger.warn).toHaveBeenCalled();
    expect(exportService.requestExport).toHaveBeenCalledWith(77, null);
    expect(
      onboardingService.clearDemoDataForOrganization,
    ).not.toHaveBeenCalled();
  });

  it('prepara cancelacion cuando el dunning se agota', async () => {
    const invoice: any = {
      id: 500,
      organizationId: 77,
      subscriptionId: 12,
      subscription: {
        id: 12,
        organizationId: 77,
        metadata: {},
        plan: {
          id: 1,
          code: 'TRIAL',
          name: 'Trial',
          price: 0,
          currency: 'PEN',
        },
      },
    };
    const dunningState = { failures: 4 };

    await (service as any).handleExhaustedDunning(invoice, dunningState);

    expect((prisma as any).subscription.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        cancelAtPeriodEnd: true,
        metadata: expect.objectContaining({
          dunning: expect.objectContaining({
            exhaustedAt: expect.any(String),
            failures: 4,
          }),
          cancellationRequest: expect.objectContaining({
            reasonCategory: 'dunning_exhausted',
            cancelImmediately: false,
          }),
        }),
      },
    });
    expect(quotaService.activateGraceLimits).toHaveBeenCalledWith(12);
    expect(metrics.recordDunningAttempt).toHaveBeenCalledWith('retry_exhausted');
  });

  describe('persistencia de metodos de pago', () => {
    const baseDto = {
      organizationId: 44,
      provider: 'MERCADOPAGO' as BillingPaymentProvider,
      externalId: 'card_abc',
      brand: 'Visa',
      last4: '1111',
      expMonth: 1,
      expYear: 2027,
      country: 'PE',
    };

    beforeEach(() => {
      (prisma as any).billingPaymentMethod.upsert.mockImplementation(
        async (args: any) => ({
          id: 900,
          organizationId: args.create.organizationId,
          isDefault: args.create.isDefault,
        }),
      );
      (prisma as any).billingPaymentMethod.count.mockResolvedValue(0);
      (prisma as any).billingPaymentMethod.findUnique.mockResolvedValue(null);
    });

    it('sincroniza billingCustomerId cuando la UI guarda un metodo por defecto', async () => {
      await service.upsertPaymentMethod({
        ...baseDto,
        isDefault: true,
        billingCustomerId: 'cus_sync_ui',
      });

      const callArgs =
        (prisma as any).billingPaymentMethod.upsert.mock.calls[0][0];
      expect(callArgs.create.metadata.billingCustomerId).toBe('cus_sync_ui');
      expect((prisma as any).subscription.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 44 },
        data: {
          defaultPaymentMethodId: 900,
          billingCustomerId: 'cus_sync_ui',
        },
      });
    });

    it('propaga billingCustomerId del metodo seleccionado al marcarlo como predeterminado', async () => {
      (prisma as any).billingPaymentMethod.findFirst.mockResolvedValue({
        id: 42,
        organizationId: 9,
        metadata: { billingCustomerId: 'cus_existing' },
      });

      await service.markDefaultPaymentMethod(9, 42);

      expect((prisma as any).subscription.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 9 },
        data: {
          defaultPaymentMethodId: 42,
          billingCustomerId: 'cus_existing',
        },
      });
    });

    it('limpia billingCustomerId cuando se elimina el metodo predeterminado', async () => {
      const findFirstMock = (prisma as any).billingPaymentMethod.findFirst;
      findFirstMock
        .mockResolvedValueOnce({
          id: 55,
          organizationId: 11,
          isDefault: true,
          metadata: { billingCustomerId: 'cus_to_remove' },
        })
        .mockResolvedValueOnce(null);

      (prisma as any).billingPaymentMethod.delete.mockResolvedValue({});

      await service.removePaymentMethod(11, 55);

      expect((prisma as any).subscription.updateMany).toHaveBeenCalledWith({
        where: { organizationId: 11 },
        data: {
          defaultPaymentMethodId: null,
          billingCustomerId: null,
        },
      });
    });
  });

  describe('instrumentaci¢n de m‚tricas', () => {
    it('registra evento fallido al procesar un webhook', async () => {
      const normalizedEvent = {
        provider: 'mercadopago',
        type: 'invoice.paid',
      } as any;
      const normalizeSpy = jest
        .spyOn<any, any>(service as any, 'normalizeWebhookEvent')
        .mockResolvedValue(normalizedEvent);
      const dispatchSpy = jest
        .spyOn<any, any>(service as any, 'dispatchWebhookEvent')
        .mockRejectedValue(new Error('fail'));

      await expect(
        service.handleWebhookEvent({ provider: 'mercadopago', type: 'invoice.paid' }),
      ).rejects.toThrow('fail');

      expect(metrics.recordWebhookEvent).toHaveBeenCalledWith(
        'mercadopago',
        'invoice.paid',
        'failed',
      );

      normalizeSpy.mockRestore();
      dispatchSpy.mockRestore();
    });

    it('marca intento de dunning fallido cuando el checkout no se crea', async () => {
      (paymentProvider as any).createCheckoutSession.mockRejectedValue(
        new Error('mp down'),
      );
      const invoice: any = {
        id: 80,
        amount: 46.5,
        currency: 'PEN',
        subscription: {
          organizationId: 99,
          plan: { code: 'GROWTH', currency: 'PEN' },
        },
      };
      const metadata = {};

      await (service as any).dispatchDunningAttempt(invoice, metadata);

      expect(metrics.recordDunningAttempt).toHaveBeenCalledWith('failed');
    });
  });

  describe('preparePendingCancellations', () => {
    it('programa limpieza previa y marca metadata', async () => {
      const cleanupSpy = jest
        .spyOn<any, any>(service as any, 'autoExportAndCleanupDemoData')
        .mockResolvedValue(undefined);
      (prisma as any).subscription.findMany.mockResolvedValue([
        {
          id: 31,
          organizationId: 404,
          metadata: {
            cancellationRequest: {
              reasonCategory: 'test',
              preCleanupPreparedAt: null,
            },
          },
        },
      ]);
      (prisma as any).subscription.update.mockResolvedValue({});

      await service.preparePendingCancellations();

      expect(cleanupSpy).toHaveBeenCalledWith(404, 'cancellation');
      expect((prisma as any).subscription.update).toHaveBeenCalledWith({
        where: { id: 31 },
        data: {
          metadata: expect.objectContaining({
            cancellationRequest: expect.objectContaining({
              preCleanupPreparedAt: expect.any(String),
            }),
          }),
        },
      });
      cleanupSpy.mockRestore();
    });
  });
});
