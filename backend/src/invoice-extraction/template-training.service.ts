import { Injectable, Logger } from '@nestjs/common';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

type SampleSource = 'AUTO' | 'MANUAL';

interface TrainingSample {
  templateId: number;
  text: string;
  organizationId: number | null;
  companyId: number | null;
  source: SampleSource;
  createdAt: string;
}

interface TrainingMeta {
  lastTrainingCount: number;
  lastTrainingAt: number;
}

@Injectable()
export class TemplateTrainingService {
  private readonly logger = new Logger(TemplateTrainingService.name);
  private readonly datasetPath = path.resolve(
    process.cwd(),
    'backend',
    'ml',
    'template-training-data.json',
  );
  private readonly metaPath = path.resolve(
    process.cwd(),
    'backend',
    'ml',
    'template-training-meta.json',
  );
  private readonly scriptPath = path.resolve(
    process.cwd(),
    'backend',
    'ml',
    'train_template_classifier.py',
  );
  private readonly minInterval =
    Number(process.env.TEMPLATE_TRAIN_INTERVAL_MS ?? 1000 * 60 * 30);
  private readonly minSamples =
    Number(process.env.TEMPLATE_TRAIN_MIN_SAMPLES ?? 20);
  private isTraining = false;
  private metaCache: TrainingMeta | null = null;

  async recordSample(params: {
    templateId: number;
    text: string;
    organizationId?: number | null;
    companyId?: number | null;
    source?: SampleSource;
  }) {
    const { templateId, text, organizationId, companyId, source } = params;
    const normalized = text?.trim();
    if (!normalized) {
      return;
    }
    const count = await this.appendSample({
      templateId,
      text: normalized,
      organizationId: organizationId ?? null,
      companyId: companyId ?? null,
      source: source ?? 'AUTO',
      createdAt: new Date().toISOString(),
    });
    this.maybeScheduleRetrain(count).catch((error) =>
      this.logger.warn(
        `Fallo al evaluar el reentrenamiento autom\u00E1tico: ${
          error instanceof Error ? error.message : error
        }`,
      ),
    );
  }

  private async appendSample(sample: TrainingSample) {
    let data: TrainingSample[] = [];
    try {
      const raw = await fs.readFile(this.datasetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        data = parsed;
      }
    } catch {
      data = [];
    }
    data.push(sample);
    await fs.mkdir(path.dirname(this.datasetPath), { recursive: true });
    await fs.writeFile(this.datasetPath, JSON.stringify(data, null, 2), 'utf-8');
    return data.length;
  }

  private async maybeScheduleRetrain(currentDatasetSize?: number) {
    if (this.isTraining) {
      return;
    }
    if (!existsSync(this.scriptPath)) {
      this.logger.warn(
        `Script de entrenamiento no encontrado en ${this.scriptPath}`,
      );
      return;
    }

    const datasetSize =
      currentDatasetSize ?? (await this.getDatasetSize());
    const meta = await this.getMeta();
    const pending = datasetSize - meta.lastTrainingCount;
    if (pending < this.minSamples) {
      return;
    }
    const now = Date.now();
    if (now - meta.lastTrainingAt < this.minInterval) {
      return;
    }

    this.isTraining = true;
    const pythonBin = process.env.PYTHON_BIN ?? 'python';
    const proc = spawn(pythonBin, [this.scriptPath], {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    proc.on('close', async (code) => {
      this.isTraining = false;
      if (code !== 0) {
        this.logger.warn(
          `train_template_classifier.py termin\u00F3 con c\u00F3digo ${code}`,
        );
        return;
      }
      const latestSize = await this.getDatasetSize();
      await this.saveMeta({
        lastTrainingCount: latestSize,
        lastTrainingAt: Date.now(),
      });
      this.logger.log('Entrenamiento del clasificador completado.');
    });
    proc.on('error', (err) => {
      this.isTraining = false;
      this.logger.warn(
        `No se pudo ejecutar el reentrenamiento autom\u00E1tico: ${err.message}`,
      );
    });
  }

  private async getDatasetSize() {
    try {
      const raw = await fs.readFile(this.datasetPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  private async getMeta(): Promise<TrainingMeta> {
    if (this.metaCache) {
      return this.metaCache;
    }
    try {
      const raw = await fs.readFile(this.metaPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.lastTrainingCount === 'number' &&
        typeof parsed?.lastTrainingAt === 'number'
      ) {
        this.metaCache = parsed as TrainingMeta;
        return this.metaCache;
      }
    } catch {
      // ignore
    }
    this.metaCache = { lastTrainingCount: 0, lastTrainingAt: 0 };
    return this.metaCache;
  }

  private async saveMeta(meta: TrainingMeta) {
    this.metaCache = meta;
    await fs.mkdir(path.dirname(this.metaPath), { recursive: true });
    await fs.writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}
