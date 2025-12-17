import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import {
  ExtractionResultPayload,
  RecordInvoiceSampleDto,
} from './dto/record-invoice-sample.dto';
import { AssignTemplateDto } from './dto/assign-template.dto';
import { SubmitCorrectionDto } from './dto/submit-correction.dto';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import {
  InvoiceTemplate,
  InvoiceSample,
  Prisma,
  InvoiceExtractionLog,
} from '@prisma/client';
import { spawnSync } from 'child_process';
import { TemplateTrainingService } from './template-training.service';
import { MlExtractionService } from './ml-extraction.service';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';

type SampleWithEntry = InvoiceSample & {
  entry?: {
    invoice?: {
      tipoComprobante?: string | null;
    } | null;
  } | null;
};

interface TemplateMatchResult {
  template: InvoiceTemplate;
  payload: ExtractionResultPayload;
  score: number;
}

const PREVIEW_LENGTH = 8000;

@Injectable()
export class InvoiceExtractionService {
  private readonly logger = new Logger(InvoiceExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly mlExtraction: MlExtractionService,
    private readonly training: TemplateTrainingService,
    private readonly quotaService: SubscriptionQuotaService,
  ) {}

  private tenantIds() {
    const ctx = this.tenant.getContext();
    return {
      organizationId: ctx.organizationId ?? null,
      companyId: ctx.companyId ?? null,
    };
  }

  async recordSample(dto: RecordInvoiceSampleDto) {
    const { organizationId, companyId } = this.tenantIds();
    if (organizationId) {
      await this.quotaService.ensureQuota(
        organizationId,
        'storage',
        dto.fileSize ?? 0,
      );
    }
    return this.prisma.invoiceSample.create({
      data: {
        organizationId,
        companyId,
        entryId: dto.entryId ?? null,
        invoiceTemplateId: dto.invoiceTemplateId ?? null,
        originalFilename: dto.originalFilename,
        storagePath: dto.storagePath,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : null,
        sha256: dto.sha256,
      },
    });
  }

  async appendLog(
    sampleId: number,
    level: string,
    message: string,
    context?: any,
  ) {
    await this.ensureSample(sampleId);
    return this.prisma.invoiceExtractionLog.create({
      data: {
        sampleId,
        level,
        message,
        context,
      },
    });
  }

  async markExtractionResult(sampleId: number, payload: ExtractionResultPayload) {
  await this.ensureSample(sampleId)

  const extractionJson: Prisma.InputJsonValue | Prisma.JsonNullValueInput =
    payload.data === null || payload.data === undefined
      ? Prisma.JsonNull
      : (payload.data as Prisma.InputJsonValue)

  return this.prisma.invoiceSample.update({
    where: { id: sampleId },
      data: {
        extractionStatus: payload.status ?? 'COMPLETED',
        extractionResult: extractionJson,
        updatedAt: new Date(),
      },
    })
  }

  async attachTemplate(sampleId: number, templateId: number | null) {
    await this.ensureSample(sampleId);
    return this.prisma.invoiceSample.update({
      where: { id: sampleId },
      data: {
        invoiceTemplateId: templateId,
      },
    });
  }

  async processSample(sampleId: number) {
    const sample = (await this.prisma.invoiceSample.findUnique({
      where: { id: sampleId },
      include: {
        entry: { include: { invoice: true } },
      },
    })) as SampleWithEntry | null;
    if (!sample) {
      throw new NotFoundException(`InvoiceSample ${sampleId} not found`);
    }

    await this.prisma.invoiceSample.update({
      where: { id: sampleId },
      data: { extractionStatus: 'PROCESSING' },
    });
    await this.appendLog(sampleId, 'INFO', 'Inicio de extracciÃ³n', {
      path: sample.storagePath,
    });

    let textData: { text: string; preview: string } | null = null;
    try {
      textData = await this.readSampleContent(sample);
    } catch (error) {
      await this.appendLog(sampleId, 'ERROR', 'Error al leer el PDF', {
        error: (error as Error)?.message ?? String(error),
      });
      await this.markExtractionResult(sampleId, { status: 'FAILED' });
      return;
    }

    const match = await this.matchTemplate(sample, textData.text, textData.preview);

    if (match) {
      await this.attachTemplate(sampleId, match.template.id);
      await this.markExtractionResult(sampleId, match.payload);
      await this.appendLog(sampleId, 'INFO', 'Plantilla detectada automáticamente', {
        templateId: match.template.id,
        templateVersion: match.template.version,
        score: match.score,
      });
      this.training
        .recordSample({
          templateId: match.template.id,
          text: textData.text,
          organizationId: sample.organizationId ?? null,
          companyId: sample.companyId ?? null,
          source: 'AUTO',
        })
        .catch((error) =>
          this.logger.warn(
            `No se pudo registrar la muestra para entrenamiento: ${
              error instanceof Error ? error.message : error
            }`,
          ),
        );
    } else {
      const fallback = await this.mlExtraction
        .extract(
          textData.text,
          textData.preview,
          {
            sampleId,
            organizationId: sample.organizationId ?? null,
            companyId: sample.companyId ?? null,
            entryId: sample.entryId ?? null,
          },
          { filePath: sample.storagePath },
        )
        .catch((error) => {
          this.logger.warn(
            `Fallo al invocar la capa ML de respaldo: ${
              error instanceof Error ? error.message : error
            }`,
          );
          return null;
        });

      if (fallback) {
        await this.markExtractionResult(sampleId, fallback);
        await this.appendLog(sampleId, 'INFO', 'Extracción completada por servicio ML de respaldo', {
          provider: fallback.data?.mlProvider ?? 'ml-fallback',
          confidence: fallback.data?.mlConfidence ?? null,
        });
      } else {
        await this.markExtractionResult(sampleId, {
          status: 'PENDING_TEMPLATE',
          data: {
            textPreview: textData.preview,
          },
        });
        await this.appendLog(
          sampleId,
          'WARN',
          'No se encontró una plantilla con coincidencias suficientes',
        );
      }
    }


    if (await this.validateEntryData(sample.entryId ?? null, sampleId)) {
      await this.recordApprovalAudit(sampleId, sample, sample.entry ?? null, {
        tipoComprobante: sample.entry?.invoice?.tipoComprobante ?? null,
      });
    }
  }

  async findByEntry(entryId: number, includeLogs = false) {
    const samples = await this.prisma.invoiceSample.findMany({
      where: { entryId },
      orderBy: { createdAt: 'desc' },
      include: includeLogs
        ? { logs: { orderBy: { createdAt: 'desc' }, take: 20 } }
        : undefined,
    });

    return samples.map((sample) => this.serializeSample(sample));
  }

  async findLogs(sampleId: number) {
    await this.ensureSample(sampleId);
    return this.prisma.invoiceExtractionLog.findMany({
      where: { sampleId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignTemplate(sampleId: number, dto: AssignTemplateDto) {
    const sample = await this.prisma.invoiceSample.findUnique({
      where: { id: sampleId },
      include: { entry: { include: { invoice: true } } },
    });
    if (!sample) {
      throw new NotFoundException(`InvoiceSample ${sampleId} not found`);
    }

    const template = await this.prisma.invoiceTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) {
      throw new NotFoundException(
        `InvoiceTemplate ${dto.templateId} not found`,
      );
    }

    await this.attachTemplate(sampleId, template.id);
    await this.appendLog(sampleId, 'INFO', 'Plantilla asignada manualmente', {
      templateId: template.id,
    });

    let parsedContent: { text: string; preview: string } | null = null;
    try {
      parsedContent = await this.readSampleContent(sample);
    } catch (error) {
      if (dto.reprocess !== false) {
        await this.appendLog(
          sampleId,
          'ERROR',
          'Error al reprocesar tras asignación manual',
          { error: (error as Error)?.message ?? String(error) },
        );
      } else {
        this.logger.warn(
          `No se pudo leer la muestra ${sampleId} para registrar entrenamiento: ${
            (error as Error)?.message ?? String(error)
          }`,
        );
      }
    }

    if (parsedContent?.text) {
      this.training
        .recordSample({
          templateId: template.id,
          text: parsedContent.text,
          organizationId: sample.organizationId ?? null,
          companyId: sample.companyId ?? null,
          source: 'MANUAL',
        })
        .catch((error) =>
          this.logger.warn(
            `No se pudo registrar la muestra manual para entrenamiento: ${
              error instanceof Error ? error.message : error
            }`,
          ),
        );
    }

    if (dto.reprocess === false) {
      return this.prisma.invoiceSample.findUnique({ where: { id: sampleId } });
    }

    if (parsedContent) {
      const fields = this.extractFields(parsedContent.text, template);
      const payload = this.buildExtractionPayload(
        template,
        parsedContent.preview,
        fields,
        undefined,
        true,
      );
      await this.markExtractionResult(sampleId, payload);
      await this.appendLog(
        sampleId,
        'INFO',
        'Extracción reprocesada con plantilla manual',
      );
    }

      if (await this.validateEntryData(sample.entryId ?? null, sampleId)) {
        await this.recordApprovalAudit(
          sampleId,
          sample,
          sample.entry ?? null,
          sample.entry?.invoice ?? null,
        );
      }
    return this.prisma.invoiceSample.findUnique({ where: { id: sampleId } });
  }
  private async matchTemplate(
    sample: SampleWithEntry,
    text: string,
    preview: string,
  ): Promise<TemplateMatchResult | null> {
    const candidates = await this.fetchTemplates(sample);
    if (!candidates.length) {
      return null;
    }

    const pythonMatch = this.predictTemplateWithPython(text, candidates);
    if (pythonMatch) {
      const fields = this.extractFields(text, pythonMatch.template);
      const payload = this.buildExtractionPayload(
        pythonMatch.template,
        preview,
        fields,
        pythonMatch.score,
      );
      return {
        template: pythonMatch.template,
        payload,
        score: pythonMatch.score,
      };
    }

    let best: {
      template: InvoiceTemplate;
      score: number;
      fields: Record<string, string | null>;
    } | null = null;

    for (const template of candidates) {
      const evaluation = this.evaluateTemplate(text, template);
      if (!evaluation) continue;
      if (!best || evaluation.score > best.score) {
        best = {
          template,
          score: evaluation.score,
          fields: evaluation.fields,
        };
      }
    }

    if (!best) {
      return null;
    }

    const payload = this.buildExtractionPayload(
      best.template,
      preview,
      best.fields,
      best.score,
    );

    return {
      template: best.template,
      payload,
      score: best.score,
    };
  }

  private async fetchTemplates(sample: SampleWithEntry) {
    const where: Prisma.InvoiceTemplateWhereInput = {
      isActive: true,
      organizationId: sample.organizationId ?? null,
    };

    if (sample.companyId !== null) {
      where.OR = [{ companyId: sample.companyId }, { companyId: null }];
    } else {
      where.companyId = null;
    }

    const documentType = sample.entry?.invoice?.tipoComprobante ?? null;
    if (documentType) {
      where.documentType = documentType;
    }

    return this.prisma.invoiceTemplate.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  private evaluateTemplate(text: string, template: InvoiceTemplate) {
    const rules = this.normalizeRegexRules(template.regexRules);
    if (rules.length === 0) {
      return null;
    }

    let score = 0;
    for (const rule of rules) {
      if (rule.regex.test(text)) {
        score++;
      }
    }

    const minScore = Math.max(1, Math.ceil(rules.length * 0.6));
    if (score < minScore) {
      return null;
    }

    const fields = this.extractFields(text, template);
    return { score, fields };
  }

  private normalizeRegexRules(input: unknown) {
    const values: Array<{ pattern: string; flags?: string }> = [];
    if (!input) {
      return [];
    }

    if (Array.isArray(input)) {
      for (const item of input) {
        const descriptor = this.resolvePattern(item);
        if (descriptor) values.push(descriptor);
      }
    } else if (typeof input === 'object') {
      for (const item of Object.values(
        input as Record<string, unknown>,
      )) {
        const descriptor = this.resolvePattern(item);
        if (descriptor) values.push(descriptor);
      }
    }
    return values.map((descriptor) => ({
      regex: new RegExp(descriptor.pattern, descriptor.flags ?? 'i'),
    }));
  }

  private extractFields(text: string, template: InvoiceTemplate) {
    const fields: Record<string, string | null> = {};
    const mappings = template.fieldMappings;

    if (!mappings || typeof mappings !== 'object') {
      return fields;
    }

    for (const [field, rawConfig] of Object.entries(
      mappings as Record<string, any>,
    )) {
      const descriptor = this.resolvePattern(
        rawConfig?.pattern ?? rawConfig?.regex ?? rawConfig,
      );
      if (!descriptor) {
        fields[field] = null;
        continue;
      }

      const flags = descriptor.flags ?? 'i';
      const regex = new RegExp(descriptor.pattern, flags);
      const group =
        typeof rawConfig?.group === 'number'
          ? rawConfig.group
          : typeof rawConfig?.captureGroup === 'number'
          ? rawConfig.captureGroup
          : 1;

      const match = regex.exec(text);
      fields[field] = match?.[group] ?? null;
    }

    return fields;
  }

  private resolvePattern(input: unknown) {
    if (typeof input === 'string') {
      return { pattern: input, flags: 'i' };
    }

    if (input && typeof input === 'object') {
      const record = input as Record<string, unknown>;
      const pattern =
        typeof record.pattern === 'string'
          ? record.pattern
          : typeof record.regex === 'string'
          ? record.regex
          : null;
      if (!pattern) {
        return null;
      }
      const flags =
        typeof record.flags === 'string'
          ? record.flags
          : typeof record.options === 'string'
          ? record.options
          : 'i';
      return { pattern, flags };
    }

    return null;
  }

  private buildExtractionPayload(
    template: InvoiceTemplate,
    preview: string,
    fields: Record<string, string | null>,
    score?: number,
    manualAssignment = false,
  ): ExtractionResultPayload {
    return {
      status: 'COMPLETED',
      data: {
        textPreview: preview,
        templateId: template.id,
        templateVersion: template.version,
        fields,
        score,
        manualAssignment,
      },
    };
  }

  private predictTemplateWithPython(
    text: string,
    candidates: InvoiceTemplate[],
  ) {
    if (!text.trim() || candidates.length === 0) {
      return null;
    }

    const modelPath =
      process.env.TEMPLATE_CLASSIFIER_MODEL ??
      path.resolve(process.cwd(), 'backend', 'ml', 'template_classifier.joblib');
    if (!existsSync(modelPath)) {
      this.logger.debug(
        `Modelo de clasificador no encontrado en ${modelPath}. Ejecuta train_template_classifier.py.`,
      );
      return null;
    }

    const scriptPath = path.resolve(
      process.cwd(),
      'backend',
      'ml',
      'predict_template.py',
    );
    if (!existsSync(scriptPath)) {
      this.logger.warn(
        `Script predict_template.py no encontrado en ${scriptPath}.`,
      );
      return null;
    }

    const pythonBin = process.env.PYTHON_BIN ?? 'python';
    const args = [
      scriptPath,
      '--model',
      modelPath,
      '--text',
      text,
    ];
    candidates.forEach((template) => {
      args.push('--candidate', template.id.toString());
    });

    const result = spawnSync(pythonBin, args, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      this.logger.warn(
        `Error al ejecutar el clasificador Python: ${result.error.message}`,
      );
      return null;
    }
    if (result.status !== 0) {
      this.logger.warn(
        `predict_template.py saliÃ³ con cÃ³digo ${result.status}: ${result.stderr}`,
      );
      return null;
    }

    const stdout = result.stdout.trim();
    if (!stdout) {
      return null;
    }

    try {
      const payload = JSON.parse(stdout) as {
        templateId?: number;
        score?: number;
      };
      if (!payload?.templateId) {
        return null;
      }
      const template = candidates.find(
        (item) => item.id === payload.templateId,
      );
      if (!template) {
        return null;
      }
      return {
        template,
        score: payload.score ?? 0,
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo parsear la salida del clasificador Python: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return null;
    }
  }

  private async readSampleContent(sample: InvoiceSample) {
    const absolutePath = path.isAbsolute(sample.storagePath)
      ? sample.storagePath
      : path.resolve(process.cwd(), sample.storagePath);

    const buffer = await fs.readFile(absolutePath);
    let extractedText = '';
    const looksLikePdf =
      sample.mimeType?.toLowerCase().includes('pdf') ||
      sample.storagePath.toLowerCase().endsWith('.pdf');

    if (looksLikePdf) {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text ?? '';
    } else {
      extractedText = buffer.toString('utf8');
    }

    return {
      text: extractedText,
      preview: extractedText.slice(0, PREVIEW_LENGTH),
    };
  }

  private async ensureSample(sampleId: number) {
    const sample = await this.prisma.invoiceSample.findUnique({
      where: { id: sampleId },
      select: { id: true },
    });
    if (!sample) {
      throw new NotFoundException(`InvoiceSample ${sampleId} not found`);
    }
    return sample;
  }

  private async validateEntryData(
    entryId: number | null,
    sampleId: number,
  ) {
    if (!entryId) {
      await this.appendLog(
        sampleId,
        'WARN',
        'No se puede validar: la muestra no estÃ¡ asociada a una entrada',
      );
      return;
    }

    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId },
      include: { details: true, invoice: true },
    });

    if (!entry) {
      await this.appendLog(
        sampleId,
        'WARN',
        `No se encontrÃ³ la entrada ${entryId} para validaciones`,
      );
      return;
    }

    const detailsTotal = entry.details.reduce((sum, detail) => {
      const lineTotal = Number(detail.price ?? 0) * Number(detail.quantity ?? 0);
      return sum + lineTotal;
    }, 0);

    const invoiceTotal =
      entry.invoice && typeof entry.invoice.total === 'number'
        ? entry.invoice.total
        : null;
    const recordedTotal = entry.totalGross ? Number(entry.totalGross) : null;

    const issues: string[] = [];

    if (
      invoiceTotal !== null &&
      Math.abs(invoiceTotal - detailsTotal) > 0.01
    ) {
      issues.push(
        `El total del comprobante (${invoiceTotal.toFixed(
          2,
        )}) no coincide con el detalle (${detailsTotal.toFixed(2)})`,
      );
    }

    if (
      recordedTotal !== null &&
      Math.abs(recordedTotal - detailsTotal) > 0.01
    ) {
      issues.push(
        `El total registrado (${recordedTotal.toFixed(
          2,
        )}) no coincide con el detalle (${detailsTotal.toFixed(2)})`,
      );
    }

    const invoice = entry.invoice;
    if (invoice) {
      const requiredFields: Array<[string, string | null | undefined]> = [
        ['serie', invoice.serie],
        ['nroCorrelativo', invoice.nroCorrelativo],
        ['tipoComprobante', invoice.tipoComprobante],
        ['tipoMoneda', invoice.tipoMoneda],
      ];

      for (const [label, value] of requiredFields) {
        if (!value || String(value).trim() === '') {
          issues.push(`El campo de factura ${label} esta¡ vacio`);
        }
      }
    } else {
      issues.push('No existe factura asociada a la entrada');
    }

    if (issues.length > 0) {
      await this.appendLog(sampleId, 'WARN', 'Validaciones SUNAT/contables', {
        issues,
      });
      return false;
    }
    await this.appendLog(
      sampleId,
      'INFO',
      'Validaciones SUNAT/contables completadas',
      {
        detailsTotal: detailsTotal.toFixed(2),
        invoiceTotal: invoiceTotal?.toFixed(2) ?? null,
        recordedTotal: recordedTotal?.toFixed(2) ?? null,
      },
    );
    return true;
  }

  async recordCorrection(sampleId: number, dto: SubmitCorrectionDto) {
    await this.ensureSample(sampleId);
    const sample = await this.prisma.invoiceSample.findUnique({
      where: { id: sampleId },
    });
    if (!sample) {
      throw new NotFoundException(`InvoiceSample ${sampleId} not found`);
    }

    const fallbackFields =
      sample.extractionResult?.['fields'] &&
      typeof sample.extractionResult?.['fields'] === 'object'
        ? JSON.stringify(sample.extractionResult?.['fields'])
        : '';

    const mlMetadata =
      typeof sample.extractionResult === 'object' &&
      sample.extractionResult !== null
        ? (sample.extractionResult as any).mlMetadata ?? null
        : null;

    const text =
      dto.text?.trim() ??
      sample.extractionResult?.['textPreview'] ??
      fallbackFields;

    if (text) {
      await this.training.recordSample({
        templateId: dto.templateId ?? sample.invoiceTemplateId ?? 0,
        text,
        organizationId: sample.organizationId ?? null,
        companyId: sample.companyId ?? null,
        source: 'MANUAL',
      });
    }

    await this.appendLog(sampleId, 'TRAINING_DATA', 'Corrección manual registrada', {
      templateId: dto.templateId ?? sample.invoiceTemplateId ?? null,
      fields: dto.fields,
      mlMetadata,
    });

    return { success: true, mlMetadata };
  }

  private async recordApprovalAudit(
    sampleId: number,
    sample: InvoiceSample,
    entry: SampleWithEntry['entry'] | null,
    invoice: { tipoComprobante?: string | null } | null,
  ) {
    const ctx = this.tenant.getContext();
    await this.appendLog(sampleId, 'AUDIT', 'Extracción aprobada', {
      userId: ctx.userId,
      entryId: sample.entryId,
      templateId: sample.invoiceTemplateId,
      mlProvider:
        typeof sample.extractionResult === 'object' &&
        sample.extractionResult !== null &&
        'mlMetadata' in sample.extractionResult
          ? (sample.extractionResult as any).mlMetadata?.source ?? null
          : null,
      invoiceType: invoice?.tipoComprobante ?? null,
      organizationId: ctx.organizationId,
      companyId: ctx.companyId,
    });
  }

  private serializeSample(
    sample: InvoiceSample & {
      logs?: InvoiceExtractionLog[];
    },
  ) {
    return {
      ...sample,
      fileSize:
        sample.fileSize === null
          ? null
          : typeof sample.fileSize === 'bigint'
          ? Number(sample.fileSize)
          : sample.fileSize,
    };
  }
}


