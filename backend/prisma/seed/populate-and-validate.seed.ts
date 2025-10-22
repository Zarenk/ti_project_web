import { PrismaClient } from '@prisma/client';
import {
  POPULATE_ENTITY_KEYS,
  type PopulateEntityKey,
  type PopulateOptions,
  populateMissingOrganizationIds,
  isPopulateEntityKey,
} from './populate-organization-ids.seed';
import {
  type ValidationOptions,
  validateOrganizationIds,
} from './validate-organization-ids.seed';

type Logger = Pick<typeof console, 'info' | 'warn' | 'error'>;

type PopulateAndValidateOptions = {
  prisma?: PrismaClient;
  logger?: Logger;
  populate?: Omit<PopulateOptions, 'prisma' | 'logger'>;
  validate?: Omit<ValidationOptions, 'prisma' | 'logger'>;
  skipPopulate?: boolean;
  skipValidate?: boolean;
};

type PopulateAndValidateResult = {
  populateSummary?: Awaited<ReturnType<typeof populateMissingOrganizationIds>>;
  validateSummary?: Awaited<ReturnType<typeof validateOrganizationIds>>;
};

const POPULATE_SUMMARY_FILENAME = 'populate-summary.json';
const VALIDATE_SUMMARY_FILENAME = 'validate-summary.json';

function cloneEntityArray(value: PopulateEntityKey[] | undefined) {
  return value ? [...value] : undefined;
}

function normalizeDirectoryPath(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');

  if (trimmed.length === 0 && path.length > 0) {
    return path[0] === '\\' ? '\\' : '/';
  }

  return trimmed;
}

function buildSummaryPath(directory: string, filename: string): string {
  if (!directory) {
    return filename;
  }

  if (directory === '/' || directory === '\\') {
    return `${directory}${filename}`;
  }

  return `${directory}/${filename}`;
}

export async function populateAndValidate(
  options: PopulateAndValidateOptions = {},
): Promise<PopulateAndValidateResult> {
  const prisma = options.prisma ?? new PrismaClient();
  const logger = options.logger ?? console;
  const shouldDisconnect = !options.prisma;

  const populateOptions = options.populate ?? {};
  const validateOptions = options.validate ?? {};

  if (
    populateOptions.onlyEntities &&
    !validateOptions.onlyEntities &&
    populateOptions.onlyEntities.length > 0
  ) {
    validateOptions.onlyEntities = cloneEntityArray(populateOptions.onlyEntities);
  }

  if (
    populateOptions.skipEntities &&
    !validateOptions.skipEntities &&
    populateOptions.skipEntities.length > 0
  ) {
    validateOptions.skipEntities = cloneEntityArray(populateOptions.skipEntities);
  }

  try {
    const result: PopulateAndValidateResult = {};

    if (!options.skipPopulate) {
      result.populateSummary = await populateMissingOrganizationIds({
        ...populateOptions,
        prisma,
        logger,
      });
    } else {
      logger.info('[populate-org:combo] Population skipped by configuration.');
    }

    if (!options.skipValidate) {
      result.validateSummary = await validateOrganizationIds({
        ...validateOptions,
        prisma,
        logger,
      });
    } else {
      logger.info('[populate-org:combo] Validation skipped by configuration.');
    }

    return result;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

type CliPopulateOptions = Omit<PopulateOptions, 'prisma' | 'logger'>;
type CliValidateOptions = Omit<ValidationOptions, 'prisma' | 'logger'>;

type ParsedCliOptions = {
  populateOptions: CliPopulateOptions;
  validateOptions: CliValidateOptions;
  skipPopulate: boolean;
  skipValidate: boolean;
};

function parseListArgument(flag: string, value: string | undefined): PopulateEntityKey[] {
  if (!value) {
    throw new Error(`[populate-org:combo] Missing value for ${flag}.`);
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!items.length) {
    throw new Error(`[populate-org:combo] ${flag} requires at least one entity.`);
  }

  const unique = Array.from(new Set(items));
  const entities: PopulateEntityKey[] = [];

  for (const item of unique) {
    if (!isPopulateEntityKey(item)) {
      throw new Error(`[populate-org:combo] Unknown entity provided for ${flag}: ${item}`);
    }
    entities.push(item);
  }

  return entities;
}

function parseNumericArgument(flag: string, value: string | undefined): number {
  if (!value) {
    throw new Error(`[populate-org:combo] Missing value for ${flag}.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`[populate-org:combo] ${flag} must be a positive number.`);
  }

  return parsed;
}

function parsePositiveIntegerArgument(flag: string, value: string | undefined): number {
  const parsed = parseNumericArgument(flag, value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`[populate-org:combo] ${flag} must be an integer value.`);
  }
  return parsed;
}

function parseStringArgument(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`[populate-org:combo] Missing value for ${flag}.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`[populate-org:combo] ${flag} cannot be empty.`);
  }

  return trimmed;
}

type ParsedBooleanFlag = { value: boolean; consumed: number };

function parseBooleanFlag(flag: string, raw: string | undefined): ParsedBooleanFlag {
  if (!raw || raw.startsWith('--')) {
    return { value: true, consumed: 0 };
  }

  const normalized = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return { value: true, consumed: 1 };
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return { value: false, consumed: 1 };
  }

  throw new Error(`[populate-org:combo] Invalid boolean value for ${flag}: ${raw}`);
}

export function parsePopulateAndValidateCliArgs(argv: string[]): ParsedCliOptions {
  const populateOptions: CliPopulateOptions = {};
  const validateOptions: CliValidateOptions = {};
  let skipPopulate = false;
  let skipValidate = false;
  let summaryDir: string | undefined;
  let sharedOnlyEntities: PopulateEntityKey[] | undefined;
  let sharedSkipEntities: PopulateEntityKey[] | undefined;
  let sharedSummaryStdout: boolean | undefined;
  let sharedMismatchSampleSize: number | undefined;

  const mergeSharedEntities = (
    current: PopulateEntityKey[] | undefined,
    incoming: PopulateEntityKey[],
  ): PopulateEntityKey[] => {
    if (!current || current.length === 0) {
      return incoming;
    }
    const next = new Set(current);
    for (const entity of incoming) {
      next.add(entity);
    }
    return Array.from(next);
  };

  const nextValue = (args: string[], index: number): [string | undefined, number] => {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      return [undefined, index];
    }
    return [value, index + 1];
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--skip-populate' || arg === '--skipPopulate') {
      skipPopulate = true;
      continue;
    }

    if (arg === '--skip-validate' || arg === '--skipValidate') {
      skipValidate = true;
      continue;
    }

    if (arg.startsWith('--populate-dry-run=')) {
      const [flag, raw] = arg.split('=');
      populateOptions.dryRun = parseBooleanFlag(flag, raw).value;
      continue;
    }

    if (arg === '--populate-dry-run' || arg === '--populateDryRun') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      populateOptions.dryRun = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--populate-chunk-size=')) {
      const [, raw] = arg.split('=');
      populateOptions.chunkSize = parseNumericArgument('--populate-chunk-size', raw);
      continue;
    }

    if (arg === '--populate-chunk-size' || arg === '--populateChunkSize') {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.chunkSize = parseNumericArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--populate-only=')) {
      const [, raw] = arg.split('=');
      populateOptions.onlyEntities = parseListArgument('--populate-only', raw);
      continue;
    }

    if (arg === '--populate-only' || arg === '--populateOnly') {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.onlyEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--populate-skip=')) {
      const [, raw] = arg.split('=');
      populateOptions.skipEntities = parseListArgument('--populate-skip', raw);
      continue;
    }

    if (arg === '--populate-skip' || arg === '--populateSkip') {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.skipEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (
      arg.startsWith('--populate-default-org-code=') ||
      arg.startsWith('--populate-default-organization-code=')
    ) {
      const [flag, raw] = arg.split('=');
      populateOptions.defaultOrganizationCode = parseStringArgument(flag, raw);
      continue;
    }

    if (
      arg === '--populate-default-org-code' ||
      arg === '--populate-default-organization-code' ||
      arg === '--populateDefaultOrgCode'
    ) {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.defaultOrganizationCode = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (
      arg.startsWith('--populate-overrides-path=') ||
      arg.startsWith('--populate-overridesPath=')
    ) {
      const [flag, raw] = arg.split('=');
      populateOptions.overridesPath = parseStringArgument(flag, raw);
      continue;
    }

    if (
      arg === '--populate-overrides-path' ||
      arg === '--populateOverridesPath'
    ) {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.overridesPath = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--populate-summary-path=')) {
      const [flag, raw] = arg.split('=');
      populateOptions.summaryPath = parseStringArgument(flag, raw);
      continue;
    }

    if (arg === '--populate-summary-path' || arg === '--populateSummaryPath') {
      const [value, nextIndex] = nextValue(argv, index);
      populateOptions.summaryPath = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--populate-summary-stdout=')) {
      const [flag, raw] = arg.split('=');
      populateOptions.summaryStdout = parseBooleanFlag(flag, raw).value;
      continue;
    }

    if (arg === '--populate-summary-stdout' || arg === '--populateSummaryStdout') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      populateOptions.summaryStdout = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--validate-only=')) {
      const [, raw] = arg.split('=');
      validateOptions.onlyEntities = parseListArgument('--validate-only', raw);
      continue;
    }

    if (arg === '--validate-only' || arg === '--validateOnly') {
      const [value, nextIndex] = nextValue(argv, index);
      validateOptions.onlyEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--validate-skip=')) {
      const [, raw] = arg.split('=');
      validateOptions.skipEntities = parseListArgument('--validate-skip', raw);
      continue;
    }

    if (arg === '--validate-skip' || arg === '--validateSkip') {
      const [value, nextIndex] = nextValue(argv, index);
      validateOptions.skipEntities = parseListArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--validate-summary-path=')) {
      const [flag, raw] = arg.split('=');
      validateOptions.summaryPath = parseStringArgument(flag, raw);
      continue;
    }

    if (arg === '--validate-summary-path' || arg === '--validateSummaryPath') {
      const [value, nextIndex] = nextValue(argv, index);
      validateOptions.summaryPath = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--validate-summary-stdout=')) {
      const [flag, raw] = arg.split('=');
      validateOptions.summaryStdout = parseBooleanFlag(flag, raw).value;
      continue;
    }

    if (arg === '--validate-summary-stdout' || arg === '--validateSummaryStdout') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      validateOptions.summaryStdout = value;
      index += consumed;
      continue;
    }

    if (arg.startsWith('--validate-fail-on-missing=')) {
      const [flag, raw] = arg.split('=');
      validateOptions.failOnMissing = parseBooleanFlag(flag, raw).value;
      continue;
    }

    if (arg === '--validate-fail-on-missing' || arg === '--validateFailOnMissing') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      validateOptions.failOnMissing = value;
      index += consumed;
      continue;
    }

    if (
      arg.startsWith('--validate-mismatch-sample-size=') ||
      arg.startsWith('--validateMismatchSampleSize=')
    ) {
      const [flag, raw] = arg.split('=');
      validateOptions.mismatchSampleSize = parsePositiveIntegerArgument(flag, raw);
      continue;
    }

    if (
      arg === '--validate-mismatch-sample-size' ||
      arg === '--validateMismatchSampleSize'
    ) {
      const [value, nextIndex] = nextValue(argv, index);
      validateOptions.mismatchSampleSize = parsePositiveIntegerArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--only=')) {
      const [, raw] = arg.split('=');
      const parsed = parseListArgument('--only', raw);
      sharedOnlyEntities = mergeSharedEntities(sharedOnlyEntities, parsed);
      continue;
    }

    if (arg === '--only' || arg === '--onlyEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      const parsed = parseListArgument(arg, value);
      sharedOnlyEntities = mergeSharedEntities(sharedOnlyEntities, parsed);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--skip=')) {
      const [, raw] = arg.split('=');
      const parsed = parseListArgument('--skip', raw);
      sharedSkipEntities = mergeSharedEntities(sharedSkipEntities, parsed);
      continue;
    }

    if (arg === '--skip' || arg === '--skipEntities') {
      const [value, nextIndex] = nextValue(argv, index);
      const parsed = parseListArgument(arg, value);
      sharedSkipEntities = mergeSharedEntities(sharedSkipEntities, parsed);
      index = nextIndex;
      continue;
    }

    if (
      arg.startsWith('--mismatch-sample-size=') ||
      arg.startsWith('--mismatchSampleSize=')
    ) {
      const [flag, raw] = arg.split('=');
      sharedMismatchSampleSize = parsePositiveIntegerArgument(flag, raw);
      continue;
    }

    if (arg === '--mismatch-sample-size' || arg === '--mismatchSampleSize') {
      const [value, nextIndex] = nextValue(argv, index);
      sharedMismatchSampleSize = parsePositiveIntegerArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (
      arg.startsWith('--overrides-path=') ||
      arg.startsWith('--overridesPath=')
    ) {
      const [flag, raw] = arg.split('=');
      if (!populateOptions.overridesPath) {
        populateOptions.overridesPath = parseStringArgument(flag, raw);
      }
      continue;
    }

    if (
      arg === '--overrides-path' ||
      arg === '--overridesPath' ||
      arg === '--overridesFile'
    ) {
      const [value, nextIndex] = nextValue(argv, index);
      if (!populateOptions.overridesPath) {
        populateOptions.overridesPath = parseStringArgument(arg, value);
      }
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--summary-dir=')) {
      const [flag, raw] = arg.split('=');
      summaryDir = parseStringArgument(flag, raw);
      continue;
    }

    if (arg === '--summary-dir' || arg === '--summaryDir') {
      const [value, nextIndex] = nextValue(argv, index);
      summaryDir = parseStringArgument(arg, value);
      index = nextIndex;
      continue;
    }

    if (arg.startsWith('--summary-stdout=')) {
      const [flag, raw] = arg.split('=');
      sharedSummaryStdout = parseBooleanFlag(flag, raw).value;
      continue;
    }

    if (arg === '--summary-stdout' || arg === '--summaryStdout') {
      const { consumed, value } = parseBooleanFlag(arg, argv[index + 1]);
      sharedSummaryStdout = value;
      index += consumed;
      continue;
    }

    if (arg.trim().length > 0) {
      throw new Error(`[populate-org:combo] Unknown argument: ${arg}`);
    }
  }

  if (summaryDir) {

    const normalizedDir = normalizeDirectoryPath(summaryDir);

    if (!populateOptions.summaryPath) {
      populateOptions.summaryPath = buildSummaryPath(
        normalizedDir,
        POPULATE_SUMMARY_FILENAME,
      );
    }

    if (!validateOptions.summaryPath) {
      validateOptions.summaryPath = buildSummaryPath(
        normalizedDir,
        VALIDATE_SUMMARY_FILENAME,
      );
    }
  }

  if (sharedOnlyEntities && sharedOnlyEntities.length > 0) {
    if (!populateOptions.onlyEntities) {
      populateOptions.onlyEntities = cloneEntityArray(sharedOnlyEntities);
    }

    if (!validateOptions.onlyEntities) {
      validateOptions.onlyEntities = cloneEntityArray(sharedOnlyEntities);
    }
  }

  if (sharedSkipEntities && sharedSkipEntities.length > 0) {
    if (!populateOptions.skipEntities) {
      populateOptions.skipEntities = cloneEntityArray(sharedSkipEntities);
    }

    if (!validateOptions.skipEntities) {
      validateOptions.skipEntities = cloneEntityArray(sharedSkipEntities);
    }
  }

  if (
    populateOptions.onlyEntities &&
    !validateOptions.onlyEntities &&
    populateOptions.onlyEntities.length > 0
  ) {
    validateOptions.onlyEntities = cloneEntityArray(populateOptions.onlyEntities);
  }

  if (
    populateOptions.skipEntities &&
    !validateOptions.skipEntities &&
    populateOptions.skipEntities.length > 0
  ) {
    validateOptions.skipEntities = cloneEntityArray(populateOptions.skipEntities);
  }

  if (typeof sharedSummaryStdout === 'boolean') {
    if (typeof populateOptions.summaryStdout !== 'boolean') {
      populateOptions.summaryStdout = sharedSummaryStdout;
    }

    if (typeof validateOptions.summaryStdout !== 'boolean') {
      validateOptions.summaryStdout = sharedSummaryStdout;
    }
  }

  if (
    typeof sharedMismatchSampleSize === 'number' &&
    typeof validateOptions.mismatchSampleSize !== 'number'
  ) {
    validateOptions.mismatchSampleSize = sharedMismatchSampleSize;
  }

  return { populateOptions, validateOptions, skipPopulate, skipValidate };
}

if (require.main === module) {
  try {
    const cliOptions = parsePopulateAndValidateCliArgs(process.argv.slice(2));
    populateAndValidate({
      populate: cliOptions.populateOptions,
      validate: cliOptions.validateOptions,
      skipPopulate: cliOptions.skipPopulate,
      skipValidate: cliOptions.skipValidate,
    })
      .then((result) => {
        if (result.populateSummary) {
          const summary = result.populateSummary;
          console.info(
            `[populate-org:combo] populate -> defaultOrganizationId=${summary.defaultOrganizationId} updated=${summary.overall.updated}.`,
          );
        }

        if (result.validateSummary) {
          const summary = result.validateSummary;
          const processedCount = Object.keys(summary.processed ?? {}).length;
          const missingDescription = summary.hasMissing
            ? summary.missingEntities.join(', ')
            : 'none';
          const mismatchedDescription = summary.hasMismatched
            ? summary.mismatchedEntities.join(', ')
            : 'none';

          console.info(
            `[populate-org:combo] validate -> entities=${processedCount} missing=${missingDescription} mismatched=${mismatchedDescription}.`,
          );
        }
      })
      .catch((error) => {
        console.error('[populate-org:combo] Execution failed.', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('[populate-org:combo] Failed to parse CLI arguments.', error);
    process.exit(1);
  }
}
