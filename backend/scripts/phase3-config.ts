import path from 'node:path';

import type { PopulateEntityKey } from '../prisma/seed/populate-organization-ids.seed';
import {
  isPopulateEntityKey,
  POPULATE_ENTITY_KEYS,
} from '../prisma/seed/populate-organization-ids.seed';
import { populateAndValidate } from '../prisma/seed/populate-and-validate.seed';

type PopulateAndValidateOptions = Parameters<typeof populateAndValidate>[0];

type Phase3ConfigParams = {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
};

export type Phase3Config = {
  options: PopulateAndValidateOptions;
  resolvedSummaryDir: string;
  availableEntities: readonly PopulateEntityKey[];
  dryRun: boolean;
  printOptions: boolean;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'y', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'n', 'off']);
const DEFAULT_SUMMARY_DIR = path.join('tmp', 'phase3');
const POPULATE_SUMMARY_FILENAME = 'populate-summary.json';
const VALIDATE_SUMMARY_FILENAME = 'validate-summary.json';

function readStringEnv(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const raw = env[name];
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBooleanEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: boolean,
): boolean {
  const raw = readStringEnv(env, name);
  if (raw === undefined) {
    return defaultValue;
  }
  const normalized = raw.toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return true;
  }
  if (FALSE_VALUES.has(normalized)) {
    return false;
  }
  throw new Error(`[phase3] Invalid boolean value for ${name}: ${raw}`);
}

function readPositiveNumberEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number | undefined,
): number | undefined {
  const raw = readStringEnv(env, name);
  if (raw === undefined) {
    return defaultValue;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[phase3] ${name} must be a positive number.`);
  }
  return parsed;
}

function readPositiveIntegerEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  defaultValue: number | undefined,
): number | undefined {
  const parsed = readPositiveNumberEnv(env, name, defaultValue);
  if (parsed === undefined) {
    return undefined;
  }
  if (!Number.isInteger(parsed)) {
    throw new Error(`[phase3] ${name} must be an integer value.`);
  }
  return parsed;
}

function readEntityListEnv(
  env: NodeJS.ProcessEnv,
  name: string,
): PopulateEntityKey[] | undefined {
  const raw = readStringEnv(env, name);
  if (raw === undefined) {
    return undefined;
  }

  const entities = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!entities.length) {
    return undefined;
  }

  const unique = new Set<PopulateEntityKey>();
  for (const item of entities) {
    if (!isPopulateEntityKey(item)) {
      throw new Error(`[phase3] Invalid entity in ${name}: ${item}`);
    }
    unique.add(item);
  }

  return Array.from(unique);
}

function mergeEntitySelections(
  base: PopulateEntityKey[] | undefined,
  extra: PopulateEntityKey[] | undefined,
): PopulateEntityKey[] | undefined {
  if (!base && !extra) {
    return undefined;
  }
  const merged = new Set<PopulateEntityKey>();
  for (const collection of [base, extra]) {
    if (!collection) {
      continue;
    }
    for (const entity of collection) {
      merged.add(entity);
    }
  }
  return Array.from(merged);
}

function resolveSummaryPath(directory: string, filename: string): string {
  return path.join(directory, filename);
}

export function buildPhase3OptionsFromEnv(
  params: Phase3ConfigParams = {},
): Phase3Config {
  const env = params.env ?? process.env;
  const cwd = params.cwd ?? process.cwd();

  const skipPopulate = readBooleanEnv(env, 'PHASE3_SKIP_POPULATE', false);
  const skipValidate = readBooleanEnv(env, 'PHASE3_SKIP_VALIDATE', false);
  const dryRun = readBooleanEnv(env, 'PHASE3_DRY_RUN', true);
  const summaryStdout = readBooleanEnv(env, 'PHASE3_SUMMARY_STDOUT', true);
  const summaryDirEnv = readStringEnv(env, 'PHASE3_SUMMARY_DIR');
  const printOptions = readBooleanEnv(env, 'PHASE3_PRINT_OPTIONS', false);
  const resolvedSummaryDir = path.resolve(
    cwd,
    summaryDirEnv ?? DEFAULT_SUMMARY_DIR,
  );
  const defaultOrganizationCode = readStringEnv(
    env,
    'PHASE3_DEFAULT_ORG_CODE',
  );
  const populateOnly = readEntityListEnv(env, 'PHASE3_POPULATE_ONLY_ENTITIES');
  const populateSkip = readEntityListEnv(env, 'PHASE3_POPULATE_SKIP_ENTITIES');
  const sharedOnly = readEntityListEnv(env, 'PHASE3_ONLY_ENTITIES');
  const sharedSkip = readEntityListEnv(env, 'PHASE3_SKIP_ENTITIES');
  const overridesPath = readStringEnv(env, 'PHASE3_OVERRIDES_PATH');
  const mismatchSampleSize = readPositiveIntegerEnv(
    env,
    'PHASE3_VALIDATE_MISMATCH_SAMPLE_SIZE',
    undefined,
  );
  const populateChunkSize = readPositiveIntegerEnv(
    env,
    'PHASE3_POPULATE_CHUNK_SIZE',
    undefined,
  );

  const populateOnlyEntities = mergeEntitySelections(sharedOnly, populateOnly);
  const populateSkipEntities = mergeEntitySelections(sharedSkip, populateSkip);

  const populateSummaryPath = resolveSummaryPath(
    resolvedSummaryDir,
    POPULATE_SUMMARY_FILENAME,
  );
  const validateSummaryPath = resolveSummaryPath(
    resolvedSummaryDir,
    VALIDATE_SUMMARY_FILENAME,
  );

  const options: PopulateAndValidateOptions = {
    skipPopulate,
    skipValidate,
    populate: {
      dryRun,
      chunkSize: populateChunkSize,
      summaryStdout,
      summaryPath: populateSummaryPath,
      defaultOrganizationCode,
      onlyEntities: populateOnlyEntities,
      skipEntities: populateSkipEntities,
      overridesPath,
    },
    validate: {
      summaryStdout,
      summaryPath: validateSummaryPath,
      failOnMissing: readBooleanEnv(env, 'PHASE3_VALIDATE_FAIL_ON_MISSING', true),
      mismatchSampleSize,
      onlyEntities: mergeEntitySelections(
        sharedOnly,
        readEntityListEnv(env, 'PHASE3_VALIDATE_ONLY_ENTITIES'),
      ),
      skipEntities: mergeEntitySelections(
        sharedSkip,
        readEntityListEnv(env, 'PHASE3_VALIDATE_SKIP_ENTITIES'),
      ),
    },
  };

  return {
    options,
    resolvedSummaryDir,
    availableEntities: POPULATE_ENTITY_KEYS,
    dryRun: options.populate?.dryRun ?? true,
    printOptions,
  };
}
