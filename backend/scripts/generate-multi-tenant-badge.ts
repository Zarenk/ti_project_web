import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  computeCoverage,
  parseArgs as parseCoverageArgs,
  readMetrics,
} from './report-multi-tenant-coverage';

export type BadgeArgs = {
  metricsPath: string;
  outputPath: string;
  label: string;
  decimals: number;
  color?: string;
};

export function parseBadgeArgs(argv: string[]): BadgeArgs {
  let outputPath: string | undefined;
  let label = 'Multi-Tenant Coverage';
  let color: string | undefined;
  const passthrough: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--output') {
      outputPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      [, outputPath] = arg.split('=');
      continue;
    }

    if (arg === '--label') {
      label = argv[index + 1] ?? label;
      index += 1;
      continue;
    }

    if (arg.startsWith('--label=')) {
      [, label] = arg.split('=');
      continue;
    }

    if (arg === '--color') {
      color = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--color=')) {
      [, color] = arg.split('=');
      continue;
    }

    passthrough.push(arg);
  }

  const coverageArgs = parseCoverageArgs(passthrough);
  const finalOutput =
    outputPath ??
    resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'coverage-badge.json');

  return {
    metricsPath: coverageArgs.metricsPath,
    decimals: coverageArgs.decimals,
    label,
    color,
    outputPath: finalOutput,
  };
}

export function pickColor(percent: number, override?: string): string {
  if (override) {
    return override;
  }

  if (percent >= 90) {
    return 'brightgreen';
  }
  if (percent >= 75) {
    return 'green';
  }
  if (percent >= 60) {
    return 'yellowgreen';
  }
  if (percent >= 40) {
    return 'yellow';
  }
  if (percent >= 20) {
    return 'orange';
  }
  return 'red';
}

async function main(): Promise<void> {
  try {
    const { metricsPath, outputPath, label, decimals, color } = parseBadgeArgs(
      process.argv.slice(2),
    );
    const metrics = await readMetrics(metricsPath);
    const coverage = computeCoverage(metrics, decimals);
    const pickedColor = pickColor(coverage.coveragePercent, color);

    const badge = {
      schemaVersion: 1,
      label,
      message: `${coverage.coveragePercent}%`,
      color: pickedColor,
    };

    await writeFile(outputPath, JSON.stringify(badge, null, 2), 'utf8');
    console.log(
      `[coverage-badge] Badge generated at ${outputPath} with value ${badge.message}.`,
    );
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[coverage-badge] Error: ${details}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
