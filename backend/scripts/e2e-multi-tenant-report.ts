import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export type PipelineArgs = {
  metricsPath: string;
  badgePath?: string;
  skipBadge?: boolean;
  jestArgs: string[];
};

export function parsePipelineArgs(argv: string[]): PipelineArgs {
  let metricsPath: string | undefined;
  let badgePath: string | undefined;
  let skipBadge = false;
  const jestArgs: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--metrics') {
      metricsPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--metrics=')) {
      [, metricsPath] = arg.split('=');
      continue;
    }

    if (arg === '--badge') {
      badgePath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--badge=')) {
      [, badgePath] = arg.split('=');
      continue;
    }

    if (arg === '--no-badge') {
      skipBadge = true;
      continue;
    }

    jestArgs.push(arg);
  }

  const resolvedMetrics =
    metricsPath ??
    resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'metrics.json');
  const resolvedBadge =
    badgePath ??
    resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'coverage-badge.json');

  return {
    metricsPath: resolvedMetrics,
    badgePath: resolvedBadge,
    skipBadge,
    jestArgs,
  };
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

async function main(): Promise<void> {
  try {
    const { metricsPath, badgePath, skipBadge, jestArgs } = parsePipelineArgs(
      process.argv.slice(2),
    );

    await runCommand('npm', [
      'run',
      'test:e2e:metrics',
      '--',
      '--metrics',
      metricsPath,
      ...jestArgs,
    ]);

    await runCommand('npm', [
      'run',
      'report:multi-tenant-coverage',
      '--',
      '--metrics',
      metricsPath,
      '--json',
    ]);

    if (!skipBadge && badgePath) {
      await runCommand('npm', [
        'run',
        'badge:multi-tenant-coverage',
        '--',
        '--metrics',
        metricsPath,
        '--output',
        badgePath,
      ]);
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[ci-multi-tenant] Error: ${details}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
