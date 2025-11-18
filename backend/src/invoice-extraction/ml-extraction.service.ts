import { Injectable, Logger } from '@nestjs/common';
import { ExtractionResultPayload } from './dto/record-invoice-sample.dto';
import { spawnSync } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import { existsSync } from 'fs';
import https from 'https';
import http from 'http';
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
}

@Injectable()
export class MlExtractionService {
  private readonly logger = new Logger(MlExtractionService.name);
  private readonly scriptPath =
    process.env.ML_EXTRACTION_SCRIPT ??
    path.resolve(
      process.cwd(),
      'backend',
      'ml',
      'extract_invoice_fields.py',
    );
  private readonly pythonBin =
    process.env.ML_EXTRACTION_BIN ??
    process.env.PYTHON_BIN ??
    'python';
  private readonly endpoint = process.env.ML_EXTRACTION_ENDPOINT ?? null;
  private readonly apiKey = process.env.ML_EXTRACTION_API_KEY ?? null;
  private readonly sanitize =
    process.env.ML_EXTRACTION_SANITIZE !== 'false';
  private scriptWarningShown = false;

  async extract(
    text: string,
    preview: string,
    metadata: ExtractionMetadata,
  ): Promise<ExtractionResultPayload | null> {
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
  ): ExtractionResultPayload {
    const fields = this.normalizeFields(result?.fields);
    const provider =
      result?.provider ??
      (this.endpoint ? 'external-ml' : 'python-ml-fallback');
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
          result?.modelVersion ??
          result?.version ??
          null,
        mlMetadata: {
          sanitized: audit.sanitized,
          hash: audit.originalHash,
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
          `Script de extracci\u00F3n ML no encontrado en ${this.scriptPath}. Configura ML_EXTRACTION_SCRIPT o desactiva la capa ML.`,
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
        `El script ML termin\u00F3 con c\u00F3digo ${proc.status}: ${proc.stderr}`,
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
        `Salida no v\u00E1lida del script ML: ${
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
      const transport = target.protocol === 'https:' ? https : http;
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body).toString(),
      };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }
      return await new Promise<any>((resolve, reject) => {
        const req = transport.request(
          target,
          {
            method: 'POST',
            headers,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 400) {
                this.logger.warn(
                  `Servicio ML respondi\u00F3 ${res.statusCode}: ${res.statusMessage}`,
                );
                return resolve(null);
              }
              const raw = Buffer.concat(chunks).toString('utf-8');
              if (!raw) {
                return resolve(null);
              }
              try {
                resolve(JSON.parse(raw));
              } catch (error) {
                this.logger.warn(
                  `Respuesta ML no es JSON v\u00E1lido: ${
                    (error as Error)?.message ?? error
                  }`,
                );
                resolve(null);
              }
            });
          },
        );
        req.on('error', (error) => reject(error));
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
