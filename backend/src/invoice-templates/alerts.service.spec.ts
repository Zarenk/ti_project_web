import { Test } from '@nestjs/testing';
import { InvoiceTemplatesAlertsService } from './alerts.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InvoiceTemplatesAlertsService', () => {
  let service: InvoiceTemplatesAlertsService;
  let prisma: {
    invoiceExtractionLog: {
      findMany: jest.Mock;
    };
    invoiceTemplate: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      invoiceExtractionLog: {
        findMany: jest.fn(),
      },
      invoiceTemplate: {
        findMany: jest.fn(),
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

  it('returns recent error logs and review due templates', async () => {
    prisma.invoiceExtractionLog.findMany.mockResolvedValue([
      {
        id: 99,
        sampleId: 1,
        level: 'ERROR',
        message: 'donut-fail',
        createdAt: new Date('2025-01-01'),
        sample: {
          template: { documentType: 'FACTURA_ELECTRONICA' },
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

    const alerts = await service.getAlerts();

    expect(alerts.failureAlerts).toHaveLength(1);
    expect(alerts.failureAlerts[0].message).toBe('donut-fail');
    expect(alerts.reviewDueTemplates[0].id).toBe(5);
    delete process.env.INVOICE_REVIEW_DAYS;
  });
});
