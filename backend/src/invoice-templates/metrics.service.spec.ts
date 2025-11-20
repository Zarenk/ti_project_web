import { Test } from '@nestjs/testing';
import { InvoiceTemplatesMetricsService } from './metrics.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InvoiceTemplatesMetricsService', () => {
  let service: InvoiceTemplatesMetricsService;
  let prisma: { invoiceSample: { count: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      invoiceSample: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        InvoiceTemplatesMetricsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(InvoiceTemplatesMetricsService);
  });

  it('filters low confidence samples with threshold', async () => {
    prisma.invoiceSample.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    prisma.invoiceSample.findMany.mockResolvedValue([
      {
        id: 1,
        providerId: 5,
        extractionResult: { mlConfidence: 0.3 },
      },
      {
        id: 2,
        providerId: 6,
        extractionResult: { mlConfidence: 0.6 },
      },
      {
        id: 3,
        providerId: 7,
        extractionResult: { mlConfidence: 0.2 },
      },
    ]);
    process.env.INVOICE_CONFIDENCE_THRESHOLD = '0.5';
    const stats = await service.getMonitoringStats();
    expect(stats.lowConfidenceSamples.map((item) => item.id)).toEqual([1, 3]);
    delete process.env.INVOICE_CONFIDENCE_THRESHOLD;
  });
});
