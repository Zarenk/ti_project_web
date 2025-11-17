import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';

type EntitySummary = {
  planned: number;
  updated: number;
  reasons: Record<string, number>;
  durationMs: number;
  chunks: number;
};

type PopulateSummary = {
  defaultOrganizationId: number;
  defaultOrganizationCode: string;
  defaultOrganizationCreated: boolean;
  processed: Record<string, EntitySummary>;
  generatedAt: string;
  summaryFilePath?: string;
  overall: EntitySummary;
};

type ValidationEntitySummary = {
  total: number;
  missing: number;
  present: number;
  mismatched: number;
  mismatchSample: string[];
};

type ValidationSummary = {
  processed: Record<string, ValidationEntitySummary>;
  generatedAt: string;
  missingEntities: string[];
  mismatchedEntities: string[];
  hasMissing: boolean;
  hasMismatched: boolean;
  mismatchSampleSize: number;
  summaryFilePath?: string;
};

type Phase3ReportInput = {
  populate?: PopulateSummary;
  validate?: ValidationSummary;
  populatePath?: string;
  validatePath?: string;
};

export type Phase3Report = {
  generatedAt: string;
  sources: {
    populatePath?: string;
    validatePath?: string;
  };
  populate?: {
    defaultOrganizationId: number;
    defaultOrganizationCode: string;
    defaultOrganizationCreated: boolean;
    updatedRecords: number;
    plannedRecords: number;
    entitiesWithUpdates: string[];
    summaryGeneratedAt: string;
  };
  validate?: {
    hasMissing: boolean;
    hasMismatched: boolean;
    missingEntities: string[];
    mismatchedEntities: string[];
    summaryGeneratedAt: string;
    mismatchSampleSize: number;
  };
  totals: {
    populatedEntities: number;
    populatedRecords: number;
    plannedRecords: number;
    missingEntities: string[];
    mismatchedEntities: string[];
    hasMissing: boolean;
    hasMismatched: boolean;
  };
  warnings: string[];
};

export function generatePhase3Report(input: Phase3ReportInput): Phase3Report {
  if (!input.populate && !input.validate) {
    throw new Error('[phase3:report] No populate or validate summaries were provided.');
  }

  const populate = input.populate;
  const validate = input.validate;

  const entitiesWithUpdates = populate
    ? Object.entries(populate.processed ?? {})
        .filter(([, summary]) => summary.updated > 0)
        .map(([entity]) => entity)
        .sort()
    : [];

  const totals = {
    populatedEntities: entitiesWithUpdates.length,
    populatedRecords: populate?.overall?.updated ?? 0,
    plannedRecords: populate?.overall?.planned ?? 0,
    missingEntities: validate?.missingEntities ?? [],
    mismatchedEntities: validate?.mismatchedEntities ?? [],
    hasMissing: validate?.hasMissing ?? false,
    hasMismatched: validate?.hasMismatched ?? false,
  };

  const warnings: string[] = [];
  if (totals.hasMissing) {
    warnings.push(
      `[phase3:report] Validation detected missing organizationId in: ${totals.missingEntities.join(
        ', ',
      )}.`,
    );
  }
  if (totals.hasMismatched) {
    warnings.push(
      `[phase3:report] Validation detected mismatched organizationId in: ${totals.mismatchedEntities.join(
        ', ',
      )}.`,
    );
  }

  const report: Phase3Report = {
    generatedAt: new Date().toISOString(),
    sources: {
      populatePath: input.populatePath,
      validatePath: input.validatePath,
    },
    totals,
    warnings,
  };

  if (populate) {
    report.populate = {
      defaultOrganizationId: populate.defaultOrganizationId,
      defaultOrganizationCode: populate.defaultOrganizationCode,
      defaultOrganizationCreated: populate.defaultOrganizationCreated,
      updatedRecords: populate.overall?.updated ?? 0,
      plannedRecords: populate.overall?.planned ?? 0,
      entitiesWithUpdates,
      summaryGeneratedAt: populate.generatedAt,
    };
  }

  if (validate) {
    report.validate = {
      hasMissing: validate.hasMissing,
      hasMismatched: validate.hasMismatched,
      missingEntities: validate.missingEntities,
      mismatchedEntities: validate.mismatchedEntities,
      summaryGeneratedAt: validate.generatedAt,
      mismatchSampleSize: validate.mismatchSampleSize,
    };
  }

  return report;
}

export type Phase3ReportCliOptions = {
  populatePath?: string;
  validatePath?: string;
  directory?: string;
  outputPath?: string;
  summaryStdout?: boolean;
};

export function parsePhase3ReportCliArgs(argv: string[]): Phase3ReportCliOptions {
  const options: Phase3ReportCliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dir' || arg === '--directory') {
      options.directory = argv[++index];
      continue;
    }
    if (arg.startsWith('--dir=') || arg.startsWith('--directory=')) {
      const [, value] = arg.split('=');
      options.directory = value;
      continue;
    }
    if (arg === '--populate') {
      options.populatePath = argv[++index];
      continue;
    }
    if (arg.startsWith('--populate=')) {
      const [, value] = arg.split('=');
      options.populatePath = value;
      continue;
    }
    if (arg === '--validate') {
      options.validatePath = argv[++index];
      continue;
    }
    if (arg.startsWith('--validate=')) {
      const [, value] = arg.split('=');
      options.validatePath = value;
      continue;
    }
    if (arg === '--output') {
      options.outputPath = argv[++index];
      continue;
    }
    if (arg.startsWith('--output=')) {
      const [, value] = arg.split('=');
      options.outputPath = value;
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

function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`[phase3:report] Invalid boolean value: ${value}`);
}

function normalizePath(cwd: string, target: string): string {
  return isAbsolute(target) ? target : resolve(cwd, target);
}

export type Phase3ReportResolvedOptions = {
  directory: string;
  populatePath: string;
  validatePath: string;
  outputPath?: string;
  summaryStdout: boolean;
};

export function resolvePhase3ReportOptions(
  cli: Phase3ReportCliOptions,
  env: NodeJS.ProcessEnv,
  cwd: string,
): Phase3ReportResolvedOptions {
  const directory = normalizePath(
    cwd,
    cli.directory ?? env.PHASE3_REPORT_DIR ?? 'tmp/phase3',
  );
  const populatePath = cli.populatePath
    ? normalizePath(cwd, cli.populatePath)
    : env.PHASE3_REPORT_POPULATE
    ? normalizePath(cwd, env.PHASE3_REPORT_POPULATE)
    : resolve(directory, 'populate-summary.json');

  const validatePath = cli.validatePath
    ? normalizePath(cwd, cli.validatePath)
    : env.PHASE3_REPORT_VALIDATE
    ? normalizePath(cwd, env.PHASE3_REPORT_VALIDATE)
    : resolve(directory, 'validate-summary.json');

  const outputRaw = cli.outputPath ?? env.PHASE3_REPORT_OUTPUT ?? env.PHASE3_OPTIONS_PATH;
  const outputPath = outputRaw ? normalizePath(cwd, outputRaw) : undefined;

  const summaryStdout = cli.summaryStdout ?? parseEnvBoolean(env.PHASE3_REPORT_STDOUT, true);

  return {
    directory,
    populatePath,
    validatePath,
    outputPath,
    summaryStdout,
  };
}

async function readSummary(path: string | undefined): Promise<unknown | undefined> {
  if (!path) {
    return undefined;
  }

  try {
    const content = await readFile(path, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    const details = error as NodeJS.ErrnoException;
    if (details?.code === 'ENOENT') {
      return undefined;
    }
    const message = details instanceof Error ? details.message : String(details);
    throw new Error(`[phase3:report] Failed to load summary at ${path}: ${message}`);
  }
}

async function persistReport(path: string, report: Phase3Report) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(report, null, 2), 'utf8');
}

async function main(): Promise<void> {
  try {
    const cli = parsePhase3ReportCliArgs(process.argv.slice(2));
    const resolved = resolvePhase3ReportOptions(cli, process.env, process.cwd());

    const populate = await readSummary(resolved.populatePath);
    const validate = await readSummary(resolved.validatePath);

    const report = generatePhase3Report({
      populate: populate as PopulateSummary | undefined,
      validate: validate as ValidationSummary | undefined,
      populatePath: populate ? resolved.populatePath : undefined,
      validatePath: validate ? resolved.validatePath : undefined,
    });

    if (resolved.summaryStdout) {
      console.info('[phase3:report] Summary:', JSON.stringify(report, null, 2));
    } else {
      console.info(
        `[phase3:report] Populated ${report.totals.populatedRecords} records across ${report.totals.populatedEntities} entities.`,
      );
    }

    if (resolved.outputPath) {
      await persistReport(resolved.outputPath, report);
      console.info(`[phase3:report] Report written to ${resolved.outputPath}.`);
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error('[phase3:report] Failed to generate report.', details);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}
