import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

type RunnerOptions = {
  metricsPath: string;
  stdout: boolean;
  jestArgs: string[];
};

function parseRunnerArgs(argv: string[]): RunnerOptions {
  let metricsPath: string | undefined;
  let stdout = true;
  const passthrough: string[] = [];

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

    if (arg === '--no-stdout') {
      stdout = false;
      continue;
    }

    passthrough.push(arg);
  }

  const finalMetricsPath =
    metricsPath ??
    resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'metrics.json');

  return {
    metricsPath: finalMetricsPath,
    stdout,
    jestArgs: passthrough,
  };
}

async function ensureDirectory(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function main(): Promise<void> {
  const { metricsPath, stdout, jestArgs } = parseRunnerArgs(process.argv.slice(2));
  await ensureDirectory(metricsPath);

  const env = {
    ...process.env,
    MULTI_TENANT_FIXTURES_METRICS_PATH: metricsPath,
  };

  if (stdout) {
    env.MULTI_TENANT_FIXTURES_METRICS_STDOUT = 'true';
  }

  const isWindows = process.platform === 'win32';
  const executable = isWindows ? 'npx.cmd' : 'npx';

  const child = spawn(
    executable,
    ['jest', '--config', './test/jest-e2e.json', ...jestArgs],
    {
      stdio: 'inherit',
      env,
    },
  );

  child.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}

if (require.main === module) {
  void main();
}
