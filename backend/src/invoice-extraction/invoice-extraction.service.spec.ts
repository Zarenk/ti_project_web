import { InvoiceExtractionService } from './invoice-extraction.service';
import { TemplateTrainingService } from './template-training.service';
import { MlExtractionService } from './ml-extraction.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';

describe('InvoiceExtractionService corrections', () => {
  let service: InvoiceExtractionService;
  let prismaMock: {
    invoiceSample: { findUnique: jest.Mock };
    invoiceExtractionLog: { create: jest.Mock };
  };
  let tenantContext: { getContext: jest.Mock };
  let trainingService: { recordSample: jest.Mock };
  let sample: any;
  let quotaService: { ensureQuota: jest.Mock };

  const createSample = () => ({
    id: 123,
    organizationId: 10,
    companyId: 20,
    invoiceTemplateId: 99,
    entryId: 333,
    originalFilename: 'doc.pdf',
    storagePath: '/tmp/doc.pdf',
    mimeType: 'application/pdf',
    fileSize: null,
    sha256: null,
    extractionResult: {
      textPreview: 'existing text',
      fields: { foo: 'bar' },
      mlMetadata: {
        fileHash: 'abc123',
        source: 'donut',
      },
    },
    extractionStatus: 'COMPLETED',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    sample = createSample();
    prismaMock = {
      invoiceSample: {
        findUnique: jest.fn(({ select }) =>
          select ? { id: sample.id } : sample,
        ),
      },
      invoiceExtractionLog: { create: jest.fn() },
    };
    trainingService = {
      recordSample: jest.fn(),
    };
    tenantContext = {
      getContext: jest.fn().mockReturnValue({
        userId: 555,
        organizationId: 10,
        companyId: 20,
        isGlobalSuperAdmin: true,
        isOrganizationSuperAdmin: true,
        isSuperAdmin: true,
        allowedOrganizationIds: [],
        allowedCompanyIds: [],
        allowedOrganizationUnitIds: [],
      }),
    };

    quotaService = {
      ensureQuota: jest.fn().mockResolvedValue(undefined),
    };

    service = new InvoiceExtractionService(
      prismaMock as any,
      tenantContext as any,
      {} as MlExtractionService,
      trainingService as any,
      quotaService as any,
    );

    jest
      .spyOn(service, 'appendLog')
      .mockResolvedValue({} as any);
  });

  it('records manual text when provided and logs training', async () => {
    const dto = {
      templateId: 55,
      text: '  manual text   ',
      fields: { foo: 'override' },
    };

    const result = await service.recordCorrection(sample.id, dto);

    expect(trainingService.recordSample).toHaveBeenCalledWith({
      templateId: 55,
      text: 'manual text',
      organizationId: sample.organizationId,
      companyId: sample.companyId,
      source: 'MANUAL',
    });
    expect(service.appendLog).toHaveBeenCalledWith(
      sample.id,
      'TRAINING_DATA',
      'Corrección manual registrada',
      expect.objectContaining({
        templateId: 55,
        fields: dto.fields,
        mlMetadata: sample.extractionResult.mlMetadata,
      }),
    );
    expect(result).toEqual({
      success: true,
      mlMetadata: sample.extractionResult.mlMetadata,
    });
  });

  it('falls back to extraction fields when no text is supplied', async () => {
    sample.extractionResult.fields = { foo: 'new value' };
    sample.extractionResult.textPreview = undefined;
    const dto = {
      fields: { foo: 'new value' },
    };

    const result = await service.recordCorrection(sample.id, dto);

    expect(trainingService.recordSample).toHaveBeenCalledWith({
      templateId: sample.invoiceTemplateId ?? 0,
      text: JSON.stringify(sample.extractionResult.fields),
      organizationId: sample.organizationId,
      companyId: sample.companyId,
      source: 'MANUAL',
    });
    expect(service.appendLog).toHaveBeenCalledWith(
      sample.id,
      'TRAINING_DATA',
      'Corrección manual registrada',
      expect.objectContaining({
        templateId: sample.invoiceTemplateId ?? 0,
        fields: dto.fields,
        mlMetadata: sample.extractionResult.mlMetadata,
      }),
    );
    expect(result).toEqual({
      success: true,
      mlMetadata: sample.extractionResult.mlMetadata,
    });
  });
});
