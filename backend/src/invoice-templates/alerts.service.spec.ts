import { Test } from '@nestjs/testing';
import { InvoiceTemplatesAlertsService } from './alerts.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InvoiceTemplatesAlertsService', () => {
  let service: InvoiceTemplatesAlertsService;
  let prisma: {
    invoiceTemplate: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    monitoringAlertEvent: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    monitoringAlert: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      invoiceTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      monitoringAlertEvent: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      monitoringAlert: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        InvoiceTemplatesAlertsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(InvoiceTemplatesAlertsService);
  });

  it('returns recent events and templates pending review', async () => {
    prisma.monitoringAlertEvent.findMany.mockResolvedValue([
      {
        id: 99,
        alertType: 'PROVIDER_FAILURE',
        status: 'ACTIVE',
        severity: 'WARN',
        message: 'donut-fail',
        metadata: { providerName: 'Proveedor A' },
        createdAt: new Date('2025-01-01'),
        alert: {
          providerName: 'Proveedor A',
          entityType: null,
          entityId: null,
        },
      },
    ]);
    prisma.invoiceTemplate.findMany.mockResolvedValue([
      {
        id: 5,
        documentType: 'FACTURA_ELECTRONICA',
        providerName: 'Proveedor A',
        updatedAt: new Date('2024-01-01'),
      },
    ]);
    process.env.INVOICE_REVIEW_DAYS = '0';

    const alerts = await service.getAlerts(null, null);

    expect(alerts.failureAlerts).toHaveLength(1);
    expect(alerts.reviewDueTemplates).toHaveLength(1);
    expect(alerts.recentEvents).toHaveLength(1);
    delete process.env.INVOICE_REVIEW_DAYS;
  });

  it('marks template as reviewed and resolves alerts', async () => {
    prisma.invoiceTemplate.findUnique.mockResolvedValue({
      id: 10,
      organizationId: 1,
      companyId: 1,
      documentType: 'FACTURA',
      providerName: 'Proveedor Demo',
    });
    prisma.invoiceTemplate.update.mockResolvedValue({
      id: 10,
      updatedAt: new Date(),
    });
    prisma.monitoringAlert.findMany.mockResolvedValue([
      {
        id: 30,
        organizationId: 1,
        companyId: 1,
      },
    ]);
    const resolvedAt = new Date();
    prisma.monitoringAlert.update.mockResolvedValue({
      id: 30,
      organizationId: 1,
      companyId: 1,
      resolvedAt,
    });

    await service.markTemplateReviewed({
      templateId: 10,
      organizationId: 1,
      companyId: 1,
      userId: 7,
    });

    expect(prisma.invoiceTemplate.update).toHaveBeenCalled();
    expect(prisma.monitoringAlert.update).toHaveBeenCalled();
    expect(prisma.monitoringAlertEvent.create).toHaveBeenCalled();
  });
});
