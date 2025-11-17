import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

export type PipelineArgs = {
  metricsPath: string;
  badgePath?: string;
  skipBadge?: boolean;
  jestArgs: string[];
  runPhase3: boolean;
  phase3Env: Record<string, string>;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);

export function parsePipelineArgs(argv: string[]): PipelineArgs {
  let metricsPath: string | undefined;
  let badgePath: string | undefined;
  let skipBadge = false;
  let runPhase3 = false;
  const phase3Env: Record<string, string> = {};
  let phase3SummaryExplicit = false;
  const jestArgs: string[] = [];

  const nextValue = (flag: string, args: string[], index: number): [string, number] => {
    const value = args[index + 1];
    if (!value) {
      throw new Error(`[ci-multi-tenant] Missing value for ${flag}.`);
    }
    return [value, index + 1];
  };

  const parseBooleanValue = (flag: string, raw: string | undefined): boolean => {
    if (raw === undefined) {
      return true;
    }
    const normalized = raw.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) {
      return true;
    }
    if (FALSE_VALUES.has(normalized)) {
      return false;
    }
    throw new Error(`[ci-multi-tenant] Invalid boolean value for ${flag}: ${raw}`);
  };

  const assignPhase3Env = (entry: string) => {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
      throw new Error('[ci-multi-tenant] phase3 env variables require KEY=VALUE format.');
    }
    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key || !value) {
      throw new Error('[ci-multi-tenant] phase3 env variables require KEY=VALUE format.');
    }
    phase3Env[key] = value;
    runPhase3 = true;
  };

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

    if (arg === '--phase3' || arg.startsWith('--phase3=')) {
      const [, raw] = arg.split('=');
      runPhase3 = parseBooleanValue('--phase3', raw);
      continue;
    }

    if (arg === '--phase3-summary-dir') {
      const [value, nextIndex] = nextValue(arg, argv, index);
      phase3Env.PHASE3_SUMMARY_DIR = resolve(process.cwd(), value);
      phase3SummaryExplicit = true;
      runPhase3 = true;
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--phase3-summary-dir=')) {
      const [, raw] = arg.split('=');
      phase3Env.PHASE3_SUMMARY_DIR = resolve(process.cwd(), raw);
      phase3SummaryExplicit = true;
      runPhase3 = true;
      continue;
    }

    if (arg.startsWith('--phase3-dry-run=')) {
      const [, raw] = arg.split('=');
      const boolValue = parseBooleanValue('--phase3-dry-run', raw);
      phase3Env.PHASE3_DRY_RUN = boolValue ? 'true' : 'false';
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-dry-run') {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        const boolValue = parseBooleanValue('--phase3-dry-run', next);
        phase3Env.PHASE3_DRY_RUN = boolValue ? 'true' : 'false';
        index += 1;
      } else {
        phase3Env.PHASE3_DRY_RUN = 'true';
      }
      runPhase3 = true;
      continue;
    }

    if (arg.startsWith('--phase3-skip-populate=')) {
      const [, raw] = arg.split('=');
      const boolValue = parseBooleanValue('--phase3-skip-populate', raw);
      phase3Env.PHASE3_SKIP_POPULATE = boolValue ? 'true' : 'false';
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-skip-populate') {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        const boolValue = parseBooleanValue('--phase3-skip-populate', next);
        phase3Env.PHASE3_SKIP_POPULATE = boolValue ? 'true' : 'false';
        index += 1;
      } else {
        phase3Env.PHASE3_SKIP_POPULATE = 'true';
      }
      runPhase3 = true;
      continue;
    }

    if (arg.startsWith('--phase3-skip-validate=')) {
      const [, raw] = arg.split('=');
      const boolValue = parseBooleanValue('--phase3-skip-validate', raw);
      phase3Env.PHASE3_SKIP_VALIDATE = boolValue ? 'true' : 'false';
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-skip-validate') {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        const boolValue = parseBooleanValue('--phase3-skip-validate', next);
        phase3Env.PHASE3_SKIP_VALIDATE = boolValue ? 'true' : 'false';
        index += 1;
      } else {
        phase3Env.PHASE3_SKIP_VALIDATE = 'true';
      }
      runPhase3 = true;
      continue;
    }

    if (arg.startsWith('--phase3-print-options=')) {
      const [, raw] = arg.split('=');
      const boolValue = parseBooleanValue('--phase3-print-options', raw);
      phase3Env.PHASE3_PRINT_OPTIONS = boolValue ? 'true' : 'false';
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-print-options') {
      const next = argv[index + 1];
      if (next && !next.startsWith('--')) {
        const boolValue = parseBooleanValue('--phase3-print-options', next);
        phase3Env.PHASE3_PRINT_OPTIONS = boolValue ? 'true' : 'false';
        index += 1;
      } else {
        phase3Env.PHASE3_PRINT_OPTIONS = 'true';
      }
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-default-org-code') {
      const [value, nextIndex] = nextValue(arg, argv, index);
      phase3Env.PHASE3_DEFAULT_ORG_CODE = value;
      runPhase3 = true;
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--phase3-env=')) {
      const raw = arg.slice('--phase3-env='.length);
      assignPhase3Env(raw);
      continue;
    }

    if (arg.startsWith('--phase3-default-org-code=')) {
      const [, raw] = arg.split('=');
      phase3Env.PHASE3_DEFAULT_ORG_CODE = raw;
      runPhase3 = true;
      continue;
    }

    if (arg === '--phase3-env') {
      const [value, nextIndex] = nextValue(arg, argv, index);
      assignPhase3Env(value);
      index = nextIndex;
      continue;
    }

    jestArgs.push(arg);
  }

  const resolvedMetrics = metricsPath
    ? resolve(process.cwd(), metricsPath)
    : resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'metrics.json');
  const resolvedBadge = badgePath
    ? resolve(process.cwd(), badgePath)
    : resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'coverage-badge.json');

  if (runPhase3 && !phase3SummaryExplicit) {
    phase3Env.PHASE3_SUMMARY_DIR = resolve(process.cwd(), 'tmp', 'phase3');
  }

  return {
    metricsPath: resolvedMetrics,
    badgePath: resolvedBadge,
    skipBadge,
    jestArgs,
    runPhase3,
    phase3Env,
  };
}

function runCommand(
  command: string,
  args: string[],
  options?: { env?: NodeJS.ProcessEnv },
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        ...(options?.env ?? {}),
      },
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
    const { metricsPath, badgePath, skipBadge, jestArgs, runPhase3, phase3Env } =
      parsePipelineArgs(process.argv.slice(2));

    if (runPhase3) {
      console.info('[ci-multi-tenant] Executing phase3:run prior to E2E suite.');
      await runCommand('npm', ['run', 'phase3:run'], { env: phase3Env });
    }

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
