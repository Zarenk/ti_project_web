import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { populateAndValidate } from '../prisma/seed/populate-and-validate.seed';
import { buildPhase3OptionsFromEnv } from './phase3-config';
import { generatePhase3Report } from './phase3-report';

type StagingCliOptions = {
  summaryDir?: string;
  optionsPath?: string;
  reportPath?: string;
  skipRun?: boolean;
  skipTests?: boolean;
  jestPattern?: string;
  summaryStdout?: boolean;
};

function parseStagingCliArgs(argv: string[]): StagingCliOptions {
  const options: StagingCliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--summary-dir') {
      options.summaryDir = argv[++index];
      continue;
    }
    if (arg.startsWith('--summary-dir=')) {
      const [, value] = arg.split('=');
      options.summaryDir = value;
      continue;
    }
    if (arg === '--options-path') {
      options.optionsPath = argv[++index];
      continue;
    }
    if (arg.startsWith('--options-path=')) {
      const [, value] = arg.split('=');
      options.optionsPath = value;
      continue;
    }
    if (arg === '--report-path') {
      options.reportPath = argv[++index];
      continue;
    }
    if (arg.startsWith('--report-path=')) {
      const [, value] = arg.split('=');
      options.reportPath = value;
      continue;
    }
    if (arg === '--skip-run') {
      options.skipRun = true;
      continue;
    }
    if (arg === '--skip-tests') {
      options.skipTests = true;
      continue;
    }
    if (arg === '--jest-pattern') {
      options.jestPattern = argv[++index];
      continue;
    }
    if (arg.startsWith('--jest-pattern=')) {
      const [, value] = arg.split('=');
      options.jestPattern = value;
      continue;
    }
    if (arg === '--summary-stdout' || arg === '--summaryStdout') {
      options.summaryStdout = true;
      continue;
    }
    if (arg.startsWith('--summary-stdout=')) {
      const [, value] = arg.split('=');
      options.summaryStdout = value.toLowerCase() === 'true';
      continue;
    }
  }

  return options;
}

async function runJest(pattern: string): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      'npm',
      ['test', '--', pattern],
      {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: process.env,
      },
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`jest ${pattern} failed with exit code ${code}`));
      }
    });
  });
}

async function main(): Promise<void> {
  try {
    const cli = parseStagingCliArgs(process.argv.slice(2));
    const cwd = process.cwd();
    const summaryDir = resolve(cwd, cli.summaryDir ?? 'tmp/phase3/staging');
    const optionsPath = resolve(cwd, cli.optionsPath ?? 'tmp/phase3/staging/options.json');
    const reportPath = resolve(cwd, cli.reportPath ?? 'tmp/phase3/staging/report.json');
    const shouldPrintSummary =
      typeof cli.summaryStdout === 'boolean' ? cli.summaryStdout : false;

    const envForRun = {
      ...process.env,
      PHASE3_SUMMARY_DIR: summaryDir,
      PHASE3_OPTIONS_PATH: optionsPath,
    };

    const config = buildPhase3OptionsFromEnv({ env: envForRun, cwd });
    const populateOptions = config.options;

    await mkdir(summaryDir, { recursive: true });

    const populateSummaryPath = resolve(summaryDir, 'populate-summary.json');
    const validateSummaryPath = resolve(summaryDir, 'validate-summary.json');

    if (!cli.skipRun) {
      console.info('[phase3:staging] Starting populate-and-validate run.');
      const result = await populateAndValidate(populateOptions);
      if (result.populateSummary) {
        await writeFile(
          populateSummaryPath,
          JSON.stringify(result.populateSummary, null, 2),
          'utf8',
        );
      }

      if (result.validateSummary) {
        await writeFile(
          validateSummaryPath,
          JSON.stringify(result.validateSummary, null, 2),
          'utf8',
        );
      }

      await writeFile(optionsPath, JSON.stringify(populateOptions, null, 2), 'utf8');
      console.info(
        `[phase3:staging] populate/validate completed. Options stored at ${optionsPath}.`,
      );
    } else {
      console.info('[phase3:staging] Skipping populate-and-validate run.');
    }

    const loadSummary = async (path: string) => {
      try {
        const content = await readFile(path, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        const details = error as NodeJS.ErrnoException;
        if (details?.code === 'ENOENT') {
          return undefined;
        }
        throw error;
      }
    };

    const populateSummaryContent = await loadSummary(populateSummaryPath);
    const validateSummaryContent = await loadSummary(validateSummaryPath);

    if (!populateSummaryContent && !validateSummaryContent) {
      throw new Error(
        '[phase3:staging] No populate/validate summaries encontrados. Ejecute sin `--skip-run` o apunte `--summary-dir` a un directorio existente.',
      );
    }

    const report = generatePhase3Report({
      populate: populateSummaryContent,
      validate: validateSummaryContent,
      populatePath: populateSummaryContent ? populateSummaryPath : undefined,
      validatePath: validateSummaryContent ? validateSummaryPath : undefined,
    });

    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

    if (shouldPrintSummary) {
      console.info('[phase3:staging] Report:', JSON.stringify(report, null, 2));
    } else {
      console.info(`[phase3:staging] Report stored at ${reportPath}.`);
    }

    console.info(`[phase3:staging] populate summaries available at ${populateSummaryPath}.`);
    console.info(`[phase3:staging] validate summaries available at ${validateSummaryPath}.`);

    if (!cli.skipTests) {
      const jestPattern =
        cli.jestPattern ??
        'populate-organization-ids.seed.spec.ts validate-organization-ids.seed.spec.ts phase3-report.spec.ts';
      console.info(`[phase3:staging] Running tests: ${jestPattern}`);
      await runJest(jestPattern);
    } else {
      console.info('[phase3:staging] Tests skipped.');
    }
  } catch (error) {
    const details = error instanceof Error ? error : new Error(String(error));
    console.error('[phase3:staging] Failed to complete staging run.', details);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
