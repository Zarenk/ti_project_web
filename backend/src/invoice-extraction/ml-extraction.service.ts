import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ExtractionResultPayload } from './dto/record-invoice-sample.dto';
import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import http from 'http';
import https from 'https';
import { URL } from 'url';

interface ExtractionMetadata {
  sampleId: number;
  organizationId?: number | null;
  companyId?: number | null;
  entryId?: number | null;
}

interface ScriptPayload {
  text: string;
  metadata: ExtractionMetadata;
  sanitized: boolean;
  originalHash: string;
  redactedPdfPath?: string | null;
  redactedPdfHash?: string | null;
}

@Injectable()
export class MlExtractionService {
  private readonly logger = new Logger(MlExtractionService.name);
  private readonly scriptPath =
    process.env.ML_EXTRACTION_SCRIPT ??
    path.resolve(process.cwd(), 'backend', 'ml', 'extract_invoice_fields.py');
  private readonly pythonBin =
    process.env.ML_EXTRACTION_BIN ?? process.env.PYTHON_BIN ?? 'python';
  private readonly endpoint = process.env.ML_EXTRACTION_ENDPOINT ?? null;
  private readonly apiKey = process.env.ML_EXTRACTION_API_KEY ?? null;
  private readonly sanitize =
    process.env.ML_EXTRACTION_SANITIZE !== 'false';
  private readonly donutScript =
    process.env.DONUT_EXTRACTION_SCRIPT ??
    path.resolve(process.cwd(), 'backend', 'ml', 'donut_inference.py');
  private readonly donutBin =
    process.env.DONUT_EXTRACTION_BIN ?? process.env.PYTHON_BIN ?? 'python';
  private readonly redactionScript =
    process.env.PDF_REDACTION_SCRIPT ??
    path.resolve(process.cwd(), 'backend', 'ml', 'redact_pdf.py');
  private readonly redactionBin =
    process.env.PDF_REDACTION_BIN ?? process.env.PYTHON_BIN ?? 'python';
  private scriptWarningShown = false;
  private redactionWarningShown = false;
  private readonly complianceProviderName: string;
  private readonly complianceRegion: string | null;
  private readonly externalProviderConfigured: boolean;

  constructor() {
    this.complianceProviderName =
      process.env.ML_EXTRACTION_PROVIDER ??
      (this.endpoint ? 'external-ml' : 'python-ml-fallback');
    this.complianceRegion = process.env.ML_EXTRACTION_REGION ?? null;
    this.externalProviderConfigured =
      typeof process.env.ML_EXTRACTION_PROVIDER === 'string' &&
      process.env.ML_EXTRACTION_PROVIDER.trim().length > 0;
  }
  async extract(
    text: string,
    preview: string,
    metadata: ExtractionMetadata,
    options?: { filePath?: string },
  ): Promise<ExtractionResultPayload | null> {
    let redactedForPdf: { path: string; hash: string | null } | null = null;
    if (options?.filePath) {
      redactedForPdf = this.redactPdf(options.filePath);
      const inferencePath = redactedForPdf?.path ?? options.filePath;
      try {
        const donutResult = this.callDonutScript(inferencePath);
        if (donutResult) {
          return this.buildPayload(
            {
              status: donutResult.status ?? 'COMPLETED',
              fields: donutResult.fields ?? {},
              confidence: donutResult.confidence,
              modelVersion: donutResult.modelVersion,
              provider: 'donut-open-source',
            },
            preview,
            {
              text: text ?? '',
              metadata,
              sanitized: false,
              originalHash: crypto
                .createHash('sha256')
                .update(text ?? '')
                .digest('hex'),
              redactedPdfPath: redactedForPdf?.path ?? null,
              redactedPdfHash: redactedForPdf?.hash ?? null,
            },
            'donut-open-source',
          );
        }
      } finally {
        this.cleanupTempFile(redactedForPdf?.path);
      }
    }

    if (!text?.trim()) {
      return null;
    }

    const sanitized = this.sanitizeText(text);
    const payload: ScriptPayload = {
      text: sanitized.text,
      metadata,
      sanitized: sanitized.masked,
      originalHash: crypto.createHash('sha256').update(text).digest('hex'),
    };

    this.ensureComplianceMetadata();
    const result = this.endpoint
      ? await this.callHttpEndpoint(payload)
      : this.callPythonScript(payload);
    if (!result) {
      return null;
    }

    return this.buildPayload(result, preview, payload);
  }

  private sanitizeText(text: string) {
    if (!this.sanitize) {
      return { text, masked: false };
    }
    const maskedText = text.replace(/\b\d{8,}\b/g, (match) => {
      if (match.length <= 4) {
        return match;
      }
      return (
        match.slice(0, 2) +
        '*'.repeat(match.length - 4) +
        match.slice(match.length - 2)
      );
    });
    return {
      text: maskedText,
      masked: maskedText !== text,
    };
  }

  private redactPdf(filePath: string) {
    if (!existsSync(this.redactionScript)) {
      if (!this.redactionWarningShown) {
        this.logger.warn(
          `Script de redacción no encontrado en ${this.redactionScript}. Se enviarán PDFs sin enmascarar.`,
        );
        this.redactionWarningShown = true;
      }
      return null;
    }
    const tempPath = path.join(
      os.tmpdir(),
      `redacted-${Date.now()}-${path.basename(filePath)}`,
    );
    const proc = spawnSync(
      this.redactionBin,
      ['--input', filePath, '--output', tempPath],
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
    );
    if (proc.error) {
      this.logger.warn(
        `Error al redaccionar ${filePath}: ${proc.error.message}`,
      );
      return null;
    }
    if (proc.status !== 0) {
      this.logger.warn(
        `El script de redacción terminó con código ${proc.status}: ${proc.stderr}`,
      );
      return null;
    }
    const output =
      proc.stdout?.trim() && proc.stdout?.trim() !== tempPath
        ? proc.stdout?.trim()
        : tempPath;
    if (!existsSync(output)) {
      this.logger.warn(
        `El script de redacción no generó un archivo válido: ${output}`,
      );
      return null;
    }
    const hash = this.computeFileHash(output);
    return { path: output, hash };
  }

  private cleanupTempFile(filePath?: string) {
    if (!filePath) {
      return;
    }
    try {
      unlinkSync(filePath);
    } catch {
      // ignore
    }
  }

  private computeFileHash(filePath: string) {
    try {
      const buffer = readFileSync(filePath);
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (error) {
      this.logger.warn(
        `No se pudo calcular hash para ${filePath}: ${
          (error as Error)?.message ?? error
        }`,
      );
      return null;
    }
  }

  private ensureComplianceMetadata() {
    if (!this.endpoint) {
      return;
    }
    if (!this.externalProviderConfigured) {
      throw new InternalServerErrorException(
        'Cuando se configura un endpoint externo ML debes definir ML_EXTRACTION_PROVIDER para documentar el acuerdo de tratamiento.',
      );
    }
    if (!this.complianceRegion) {
      this.logger.warn(
        'Recomendado definir ML_EXTRACTION_REGION para registrar la ubicación del servicio ML.',
      );
    }
  }

  private normalizeFields(input: unknown) {
    if (!input || typeof input !== 'object') {
      return {};
    }
    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(
      input as Record<string, unknown>,
    )) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number'
      ) {
        fields[key] = value;
      } else {
        fields[key] = value ? String(value) : null;
      }
    }
    return fields;
  }

  private buildPayload(
    result: any,
    preview: string,
    audit: ScriptPayload,
    providerOverride?: string,
  ): ExtractionResultPayload {
    if (result?.status && result.status !== 'COMPLETED') {
      this.logger.warn('ML inference returned non-COMPLETED status', {
        status: result.status,
        modelVersion: result?.modelVersion,
        provider: providerOverride ?? result?.provider,
        debug: result?.debug,
        response: result,
      });
    }
    const fields = this.normalizeFields(result?.fields);
    const provider =
      providerOverride ??
      result?.provider ??
      (this.endpoint ? this.complianceProviderName : 'python-ml-fallback');
    const payload: ExtractionResultPayload = {
      status: result?.status ?? 'COMPLETED',
      data: {
        textPreview: preview,
        fields,
        mlProvider: provider,
        mlConfidence:
          typeof result?.confidence === 'number'
            ? result.confidence
            : null,
        mlModelVersion:
          result?.modelVersion ?? result?.version ?? null,
        mlCompliance: {
          provider: this.complianceProviderName,
          region: this.complianceRegion,
          endpoint: this.endpoint,
        },
        mlMetadata: {
          sanitized: audit.sanitized,
          hash: audit.originalHash,
          redactedFilePath: audit.redactedPdfPath ?? null,
          redactedFileHash: audit.redactedPdfHash ?? null,
          source: provider,
        },
      },
    };
    if (result?.debug) {
      payload.data = {
        ...payload.data,
        mlDebug: result.debug,
      };
    }
    return payload;
  }

  private callPythonScript(payload: ScriptPayload) {
    if (!existsSync(this.scriptPath)) {
      if (!this.scriptWarningShown) {
        this.logger.warn(
          `Script de extracción ML no encontrado en ${this.scriptPath}. Configura ML_EXTRACTION_SCRIPT o desactiva la capa ML.`,
        );
        this.scriptWarningShown = true;
      }
      return null;
    }
    const proc = spawnSync(this.pythonBin, [this.scriptPath], {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (proc.error) {
      this.logger.warn(
        `Error al ejecutar ${this.scriptPath}: ${proc.error.message}`,
      );
      return null;
    }
    if (proc.status !== 0) {
      this.logger.warn(
        `El script ML terminó con código ${proc.status}: ${proc.stderr}`,
      );
      return null;
    }
    const stdout = proc.stdout?.trim();
    if (!stdout) {
      return null;
    }
    try {
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.warn(
        `Salida no válida del script ML: ${
          (error as Error)?.message ?? error
        }`,
      );
      return null;
    }
  }

  private callDonutScript(filePath: string) {
    if (!existsSync(this.donutScript)) {
      return null;
    }
    const proc = spawnSync(this.donutBin, [this.donutScript, '--input', filePath], {
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    });
    if (proc.error) {
      this.logger.warn(
        `Error al ejecutar ${this.donutScript}: ${proc.error.message}`,
      );
      return null;
    }
    if (proc.status !== 0) {
      this.logger.warn(
        `El script Donut terminó con código ${proc.status}: ${proc.stderr}`,
      );
      return null;
    }
    const stdout = proc.stdout?.trim();
    if (!stdout) {
      return null;
    }
    try {
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.warn(
        `Salida no válida del script Donut: ${
          (error as Error)?.message ?? error
        }`,
      );
      return null;
    }
  }

  private async callHttpEndpoint(payload: ScriptPayload) {
    if (!this.endpoint) {
      return null;
    }
    try {
      const target = new URL(this.endpoint);
      const transport = target.protocol === "https:" ? https : http;
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body).toString(),
      };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return await new Promise<any>((resolve, reject) => {
        const req = transport.request(
          target,
          {
            method: "POST",
            headers,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 400) {
                this.logger.warn(
                  `Servicio ML respondió ${res.statusCode}: ${res.statusMessage}`,
                );
                return resolve(null);
              }
              const raw = Buffer.concat(chunks).toString("utf-8");
              if (!raw) {
                return resolve(null);
              }
              try {
                resolve(JSON.parse(raw));
              } catch (error) {
                this.logger.warn(
                  `Respuesta ML no es JSON válido: ${
                    (error as Error)?.message ?? error
                  }`,
                );
                resolve(null);
              }
            });
          },
        );
        req.on("error", (error) => reject(error));
        req.write(body);
        req.end();
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo llamar al servicio ML (${this.endpoint}): ${
          (error as Error)?.message ?? error
        }`,
      );
      return null;
    }
  }
}
