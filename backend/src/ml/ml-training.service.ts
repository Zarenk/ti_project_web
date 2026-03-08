import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChildProcess, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { MLModelsService } from './ml-models.service';

export interface TrainingStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastDuration: number | null;
  lastResult: TrainingResult | null;
  currentStep: string | null;
  completedSteps: string[];
  totalSteps: number;
  schedule: { enabled: boolean; cron: string; nextDescription: string };
}

export interface TrainingResult {
  success: boolean;
  startedAt: string;
  completedAt: string;
  elapsedSeconds: number;
  export: Record<string, any>;
  training: Record<string, { status: string; message?: string }>;
  summary: { successful: number; failed: number; total: number };
}

@Injectable()
export class MLTrainingService {
  private readonly logger = new Logger(MLTrainingService.name);
  private readonly PYTHON_CMD: string;
  private readonly TRAINING_SCRIPT = path.join(
    process.env.ML_TRAINING_PATH || path.join(process.cwd(), 'ml', 'training'),
    'train_all.py',
  );

  private isRunning = false;
  private lastRun: Date | null = null;
  private lastDuration: number | null = null;
  private lastResult: TrainingResult | null = null;
  private currentStep: string | null = null;
  private completedSteps: string[] = [];
  private totalSteps = 5; // export + 5 models, but we track model steps
  private cronEnabled: boolean;
  private childProcess: ChildProcess | null = null;

  constructor(private readonly modelsService: MLModelsService) {
    this.cronEnabled = process.env.ML_TRAINING_CRON_ENABLED !== 'false';
    this.PYTHON_CMD = this.resolvePythonCommand();
    this.loadLastRunFromDisk();
  }

  /**
   * Finds a Python executable that has ML dependencies (pandas).
   * Problem: if a virtualenv (.venv) is active but doesn't have ML deps,
   * 'python' resolves to the venv's Python which can't run training scripts.
   * This method checks the default 'python' first, then falls back to
   * common system Python locations.
   */
  private resolvePythonCommand(): string {
    const explicit = process.env.ML_PYTHON_CMD;
    if (explicit) {
      this.logger.log(`Using explicit ML_PYTHON_CMD: ${explicit}`);
      return explicit;
    }

    const { execSync } = require('child_process');

    // Check if default 'python' has pandas
    try {
      execSync('python -c "import pandas"', { stdio: 'ignore', timeout: 10000 });
      this.logger.log('Using default python (has ML dependencies)');
      return 'python';
    } catch {
      this.logger.warn('Default python does not have pandas, searching for system Python...');
    }

    // Try common system Python paths (Windows)
    const candidates = [
      'py -3',  // Windows py launcher
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
      '/usr/bin/python3',  // Linux/Mac
    ];

    for (const candidate of candidates) {
      try {
        execSync(`${candidate} -c "import pandas"`, { stdio: 'ignore', timeout: 10000 });
        this.logger.log(`Found system Python with ML deps: ${candidate}`);
        return candidate;
      } catch {
        // Continue searching
      }
    }

    this.logger.warn('No Python with pandas found. Training will likely fail. Set ML_PYTHON_CMD env var.');
    return 'python';
  }

  /**
   * Automatic training: runs every day at 3:00 AM (Lima = 8:00 UTC).
   * Low-traffic hour, after exchange rate sync, before business hours.
   */
  @Cron('0 8 * * *') // 3:00 AM Lima (UTC-5)
  async scheduledTraining() {
    if (!this.cronEnabled) {
      this.logger.debug('ML training cron disabled (ML_TRAINING_CRON_ENABLED=false)');
      return;
    }
    this.logger.log('Starting scheduled ML training...');
    await this.runTraining();
  }

  getStatus(): TrainingStatus {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString() ?? null,
      lastDuration: this.lastDuration,
      lastResult: this.lastResult,
      currentStep: this.currentStep,
      completedSteps: [...this.completedSteps],
      totalSteps: this.totalSteps,
      schedule: {
        enabled: this.cronEnabled,
        cron: '0 8 * * *',
        nextDescription: 'Todos los dias a las 3:00 AM (hora Lima)',
      },
    };
  }

  async runTraining(steps?: string[]): Promise<TrainingResult> {
    if (this.isRunning) {
      throw new Error('Ya hay un entrenamiento en curso. Espera a que termine.');
    }

    // Verify script exists
    if (!fs.existsSync(this.TRAINING_SCRIPT)) {
      throw new Error(
        `Script de entrenamiento no encontrado: ${this.TRAINING_SCRIPT}. Verifica que los archivos de ML esten desplegados.`,
      );
    }

    this.isRunning = true;
    this.currentStep = 'Exportando datos...';
    this.completedSteps = [];
    this.totalSteps = steps?.length || 5;
    const startedAt = new Date();

    try {
      const result = await this.spawnTraining(steps);
      this.lastResult = result;
      this.lastRun = new Date();
      this.lastDuration = result.elapsedSeconds;
      this.saveLastRunToDisk();

      // Auto-reload models after successful training
      if (result.summary.successful > 0) {
        this.logger.log('Training complete, reloading models...');
        this.modelsService.reloadModels();
        this.logger.log('Models reloaded after training');
      }

      return result;
    } catch (error) {
      const errorResult: TrainingResult = {
        success: false,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        elapsedSeconds: (Date.now() - startedAt.getTime()) / 1000,
        export: {},
        training: {},
        summary: { successful: 0, failed: 0, total: 0 },
      };
      this.lastResult = errorResult;
      this.lastRun = new Date();
      this.saveLastRunToDisk();
      throw error;
    } finally {
      this.isRunning = false;
      this.currentStep = null;
      this.completedSteps = [];
    }
  }

  toggleCron(enabled: boolean): { enabled: boolean } {
    this.cronEnabled = enabled;
    this.logger.log(`ML training cron ${enabled ? 'enabled' : 'disabled'}`);
    return { enabled: this.cronEnabled };
  }

  cancelTraining(): { cancelled: boolean } {
    if (!this.isRunning || !this.childProcess) {
      return { cancelled: false };
    }

    this.logger.log('Cancelling training by user request...');
    this.childProcess.kill('SIGTERM');

    // Force kill after 5 seconds if still alive
    const pid = this.childProcess.pid;
    setTimeout(() => {
      try {
        if (pid) process.kill(pid, 0); // Check if alive
        this.childProcess?.kill('SIGKILL');
      } catch {
        // Already dead, ignore
      }
    }, 5000);

    return { cancelled: true };
  }

  private spawnTraining(steps?: string[]): Promise<TrainingResult> {
    return new Promise((resolve, reject) => {
      const args = [this.TRAINING_SCRIPT];
      if (steps?.length) {
        args.push('--steps', steps.join(','));
      }

      // Pass DB connection env vars to child process
      const env: Record<string, string> = { ...process.env } as any;
      // Map Prisma DATABASE_URL to individual vars if not set
      if (!env.DB_HOST && env.DATABASE_URL) {
        try {
          const url = new URL(env.DATABASE_URL);
          env.DB_HOST = url.hostname;
          env.DB_PORT = url.port || '5432';
          env.DB_NAME = url.pathname.replace('/', '').split('?')[0];
          env.DB_USER = url.username;
          env.DB_PASSWORD = decodeURIComponent(url.password);
        } catch {
          this.logger.warn('Could not parse DATABASE_URL for ML training');
        }
      }

      this.logger.log(`Spawning: ${this.PYTHON_CMD} ${args.join(' ')}`);

      const child = spawn(this.PYTHON_CMD, args, {
        cwd: path.dirname(this.TRAINING_SCRIPT),
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.childProcess = child;

      let stdout = '';
      let stderr = '';
      let lastEvent: any = null;

      child.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          stdout += line + '\n';
          try {
            const event = JSON.parse(line);
            lastEvent = event;

            // Update current step and completed steps for real-time progress
            if (event.event === 'step_start') {
              this.currentStep = event.label || event.step;
            } else if (event.event === 'step_done') {
              if (event.step && !this.completedSteps.includes(event.step)) {
                this.completedSteps.push(event.step);
              }
            } else if (event.event === 'phase_start') {
              this.currentStep =
                event.phase === 'export' ? 'Exportando datos...' : 'Entrenando modelos...';
            } else if (event.event === 'phase_done' && event.phase === 'export') {
              this.currentStep = 'Datos exportados, iniciando entrenamiento...';
            }
          } catch {
            // Not JSON, ignore
          }
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        // Log stderr in real-time for debugging
        for (const line of chunk.split('\n').filter(Boolean)) {
          if (line.startsWith('[DEBUG]') || line.includes('Error') || line.includes('error')) {
            this.logger.debug(`[Python] ${line.trim()}`);
          }
        }
      });

      child.on('error', (err) => {
        this.logger.error(`Failed to spawn Python: ${err.message}`);
        this.isRunning = false;
        this.childProcess = null;
        reject(
          new ServiceUnavailableException(
            'El entrenamiento ML requiere Python, que no esta disponible en este entorno. Ejecuta el entrenamiento localmente o agrega Python al servidor.',
          ),
        );
      });

      child.on('close', (code) => {
        this.childProcess = null;

        if (code !== 0 && !lastEvent) {
          this.logger.error(`Training exited with code ${code}\nstderr: ${stderr}`);
          reject(new Error(`Entrenamiento fallo con codigo ${code}: ${stderr.slice(-500)}`));
          return;
        }

        // Parse the final pipeline_done event
        if (lastEvent?.event === 'pipeline_done') {
          const result: TrainingResult = {
            success: lastEvent.summary?.failed === 0,
            startedAt: new Date(Date.now() - (lastEvent.elapsed_seconds || 0) * 1000).toISOString(),
            completedAt: new Date().toISOString(),
            elapsedSeconds: lastEvent.elapsed_seconds || 0,
            export: lastEvent.export || {},
            training: lastEvent.training || {},
            summary: lastEvent.summary || { successful: 0, failed: 0, total: 0 },
          };
          resolve(result);
        } else {
          // Partial result — try to extract what we can
          this.logger.warn(`Training ended without pipeline_done event. Code: ${code}`);
          resolve({
            success: code === 0,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            elapsedSeconds: 0,
            export: {},
            training: {},
            summary: { successful: 0, failed: 0, total: code === 0 ? 1 : 0 },
          });
        }
      });

      // Timeout: 30 minutes max
      const timeout = setTimeout(() => {
        this.logger.warn('Training timed out after 30 minutes, killing process');
        child.kill('SIGTERM');
        reject(new Error('Entrenamiento excedio el tiempo limite de 30 minutos'));
      }, 30 * 60 * 1000);

      child.on('close', () => clearTimeout(timeout));
    });
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  private get statusFilePath(): string {
    const modelsBase = process.env.ML_MODELS_PATH || path.join(process.cwd(), 'ml', 'models');
    return path.join(modelsBase, '.training-status.json');
  }

  private saveLastRunToDisk() {
    try {
      const dir = path.dirname(this.statusFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        this.statusFilePath,
        JSON.stringify({
          lastRun: this.lastRun?.toISOString(),
          lastDuration: this.lastDuration,
          lastResult: this.lastResult,
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not save training status: ${(err as Error).message}`);
    }
  }

  private loadLastRunFromDisk() {
    try {
      if (!fs.existsSync(this.statusFilePath)) return;
      const data = JSON.parse(fs.readFileSync(this.statusFilePath, 'utf-8'));
      if (data.lastRun) this.lastRun = new Date(data.lastRun);
      if (data.lastDuration) this.lastDuration = data.lastDuration;
      if (data.lastResult) this.lastResult = data.lastResult;
      this.logger.log(`Loaded training status: last run ${data.lastRun ?? 'never'}`);
    } catch {
      // Ignore
    }
  }
}
