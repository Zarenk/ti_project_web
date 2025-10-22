import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type CoverageFormat = 'text' | 'json';

export type CoverageArgs = {
  metricsPath: string;
  decimals: number;
  format: CoverageFormat;
};

type FixtureMetrics = {
  generatedAt?: string;
  organizationsProcessed?: number;
  entitiesTotal?: number;
  entitiesCovered?: number;
  coverageRatio?: number;
  totals?: Record<string, number>;
};

export function parseArgs(argv: string[]): CoverageArgs {
  let metricsPath: string | undefined;
  let decimals = 2;
  let format: CoverageFormat = 'text';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--metrics' || arg === '--input') {
      metricsPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--metrics=')) {
      [, metricsPath] = arg.split('=');
      continue;
    }

    if (arg === '--decimals') {
      const value = argv[index + 1];
      if (value === undefined) {
        throw new Error('--decimals requiere un valor numérico');
      }
      decimals = parseInt(value, 10);
      if (Number.isNaN(decimals) || decimals < 0) {
        throw new Error('--decimals debe ser un entero >= 0');
      }
      index += 1;
      continue;
    }

    if (arg.startsWith('--decimals=')) {
      const [, raw] = arg.split('=');
      decimals = parseInt(raw, 10);
      if (Number.isNaN(decimals) || decimals < 0) {
        throw new Error('--decimals debe ser un entero >= 0');
      }
      continue;
    }

    if (arg === '--json') {
      format = 'json';
      continue;
    }

    if (arg === '--text') {
      format = 'text';
      continue;
    }

    if (!arg.startsWith('--')) {
      metricsPath = arg;
    }
  }

  if (!metricsPath) {
    throw new Error('Debe especificar la ruta del archivo de métricas (--metrics <ruta>).');
  }

  return { metricsPath, decimals, format };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function computeCoverage(metrics: FixtureMetrics, decimals: number) {
  const total =
    typeof metrics.entitiesTotal === 'number'
      ? metrics.entitiesTotal
      : metrics.totals
        ? Object.keys(metrics.totals).length
        : 0;
  const covered =
    typeof metrics.entitiesCovered === 'number'
      ? metrics.entitiesCovered
      : metrics.totals
        ? Object.values(metrics.totals).filter(
            (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
          ).length
        : 0;

  const ratio =
    typeof metrics.coverageRatio === 'number' && Number.isFinite(metrics.coverageRatio)
      ? metrics.coverageRatio
      : total > 0
        ? covered / total
        : 0;

  return {
    generatedAt: metrics.generatedAt ?? new Date().toISOString(),
    organizationsProcessed: metrics.organizationsProcessed ?? 0,
    entitiesTotal: total,
    entitiesCovered: covered,
    coverageRatio: round(ratio, decimals),
    coveragePercent: round(ratio * 100, decimals),
  };
}

export async function readMetrics(metricsPath: string): Promise<FixtureMetrics> {
  const resolved = resolve(process.cwd(), metricsPath);
  const raw = await readFile(resolved, 'utf8');
  return JSON.parse(raw) as FixtureMetrics;
}

async function main() {
  try {
    const { metricsPath, decimals, format } = parseArgs(process.argv.slice(2));
    const metrics = await readMetrics(metricsPath);
    const coverage = computeCoverage(metrics, decimals);

    if (format === 'json') {
      console.log(JSON.stringify(coverage, null, 2));
      return;
    }

    const badgeText = `Cobertura multi-tenant: ${coverage.entitiesCovered}/${coverage.entitiesTotal} entidades (${coverage.coveragePercent}%)`;
    console.log(badgeText);
    if (coverage.organizationsProcessed > 0) {
      console.log(
        `Organizaciones procesadas: ${coverage.organizationsProcessed}. Generado en ${coverage.generatedAt}.`,
      );
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[report-coverage] Error: ${details}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
