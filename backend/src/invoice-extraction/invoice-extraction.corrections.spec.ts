import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { InvoiceExtractionModule } from './invoice-extraction.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TemplateTrainingService } from './template-training.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { ConfigModule } from '@nestjs/config';

describe('Invoice corrections integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let trainingService: { recordSample: jest.Mock };

  beforeAll(async () => {
    trainingService = { recordSample: jest.fn() };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        InvoiceExtractionModule,
      ],
    })
      .overrideProvider(TemplateTrainingService)
      .useValue(trainingService)
      .overrideProvider(TenantContextService)
      .useValue({
        getContext: () => ({
          userId: 1,
          organizationId: 1,
          companyId: 1,
          allowedOrganizationIds: [],
          allowedCompanyIds: [],
          allowedOrganizationUnitIds: [],
          isGlobalSuperAdmin: true,
          isOrganizationSuperAdmin: true,
          isSuperAdmin: true,
          organizationUnitId: null,
        }),
      })
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = module.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates training log + metadata when submitting a correction', async () => {
    const sample = await prisma.invoiceSample.create({
      data: {
        organizationId: 1,
        companyId: 1,
        originalFilename: 'test.pdf',
        storagePath: '/tmp/test.pdf',
        sha256: `test-${Date.now()}-${Math.random()}`,
        extractionStatus: 'COMPLETED',
        extractionResult: {
          textPreview: 'hello',
          fields: { serie: 'F001' },
          mlMetadata: { fileHash: 'hash', source: 'donut' },
        },
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/invoice-samples/${sample.id}/corrections`)
      .send({
        templateId: 5,
        text: 'nuevo texto',
        fields: { total: '123.45' },
      })
      .expect(201);

    expect(response.body).toEqual({
      success: true,
      mlMetadata: { fileHash: 'hash', source: 'donut' },
    });
    expect(trainingService.recordSample).toHaveBeenCalledWith({
      templateId: 5,
      text: 'nuevo texto',
      organizationId: 1,
      companyId: 1,
      source: 'MANUAL',
    });

    const log = await prisma.invoiceExtractionLog.findFirst({
      where: { sampleId: sample.id, level: 'TRAINING_DATA' },
      orderBy: { id: 'desc' },
    });
    expect(log).toBeDefined();
    expect(log?.message).toContain('Corrección manual registrada');
    expect(log?.context).toMatchObject({
      templateId: 5,
      fields: { total: '123.45' },
      mlMetadata: { fileHash: 'hash', source: 'donut' },
    });
    await prisma.invoiceExtractionLog.deleteMany({
      where: { sampleId: sample.id },
    });
    await prisma.invoiceSample.delete({ where: { id: sample.id } });
  });
});
