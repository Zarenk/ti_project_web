import type { PrismaClient } from '@prisma/client';
import {
  POPULATE_ENTITY_KEYS,
  populateMissingOrganizationIds,
} from './populate-organization-ids.seed';
import { validateOrganizationIds } from './validate-organization-ids.seed';
import {
  parsePopulateAndValidateCliArgs,
  populateAndValidate,
} from './populate-and-validate.seed';

jest.mock('./populate-organization-ids.seed', () => {
  const actual = jest.requireActual('./populate-organization-ids.seed');
  return {
    ...actual,
    populateMissingOrganizationIds: jest.fn(),
  };
});

jest.mock('./validate-organization-ids.seed', () => {
  const actual = jest.requireActual('./validate-organization-ids.seed');
  return {
    ...actual,
    validateOrganizationIds: jest.fn(),
  };
});

type MockedPopulate = jest.MockedFunction<typeof populateMissingOrganizationIds>;
type MockedValidate = jest.MockedFunction<typeof validateOrganizationIds>;

const mockPopulate = populateMissingOrganizationIds as MockedPopulate;
const mockValidate = validateOrganizationIds as MockedValidate;

const defaultPopulateSummary = () => ({
  defaultOrganizationId: 1,
  defaultOrganizationCode: 'TENANT',
  defaultOrganizationCreated: false,
  processed: POPULATE_ENTITY_KEYS.reduce(
    (accumulator, key) => {
      accumulator[key] = {
        planned: 0,
        updated: 0,
        reasons: {},
        durationMs: 0,
        chunks: 0,
      };
      return accumulator;
    },
    {} as Record<(typeof POPULATE_ENTITY_KEYS)[number], any>,
  ),
  generatedAt: new Date().toISOString(),
  overall: { planned: 0, updated: 0, reasons: {}, durationMs: 0, chunks: 0 },
});

const defaultValidateSummary = () => ({
  processed: {},
  generatedAt: new Date().toISOString(),
  missingEntities: [],
  mismatchedEntities: [],
  hasMissing: false,
  hasMismatched: false,
});

describe('populateAndValidate', () => {
  beforeEach(() => {
    mockPopulate.mockReset();
    mockValidate.mockReset();
  });

  it('runs population and validation sharing prisma and logger', async () => {
    const prisma = { $disconnect: jest.fn() } as unknown as PrismaClient;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    mockPopulate.mockResolvedValue(defaultPopulateSummary());
    mockValidate.mockResolvedValue(defaultValidateSummary());

    const options = {
      populate: {
        dryRun: true,
        onlyEntities: ['store', 'client'],
        summaryStdout: true,
      } as any,
      validate: {
        summaryStdout: true,
      } as any,
    };

    const result = await populateAndValidate({
      prisma,
      logger,
      populate: options.populate,
      validate: options.validate,
    });

    expect(mockPopulate).toHaveBeenCalledWith({
      ...options.populate,
      prisma,
      logger,
    });
    expect(mockValidate).toHaveBeenCalledWith({
      ...options.validate,
      prisma,
      logger,
      onlyEntities: ['store', 'client'],
    });
    expect(result.populateSummary).toBeDefined();
    expect(result.validateSummary).toBeDefined();
    expect(prisma.$disconnect).not.toHaveBeenCalled();
  });

  it('skips population or validation when configured', async () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    mockPopulate.mockResolvedValue(defaultPopulateSummary());
    mockValidate.mockResolvedValue(defaultValidateSummary());

    const result = await populateAndValidate({
      logger,
      skipPopulate: true,
      validate: { failOnMissing: true } as any,
    });

    expect(mockPopulate).not.toHaveBeenCalled();
    expect(mockValidate).toHaveBeenCalledWith(
      expect.objectContaining({ logger, failOnMissing: true }),
    );
    expect(result.populateSummary).toBeUndefined();
    expect(result.validateSummary).toBeDefined();
  });
});

describe('parsePopulateAndValidateCliArgs', () => {
  it('parses populate and validate options and propagates defaults', () => {
    const options = parsePopulateAndValidateCliArgs([
      '--populate-only=store,client',
      '--populate-chunk-size=10',
      '--populate-dry-run',
      '--populate-summary-stdout=false',
      '--validate-summary-stdout',
      '--summary-dir=./reports/run1',
    ]);

    expect(options.populateOptions.onlyEntities).toEqual(['store', 'client']);
    expect(options.populateOptions.chunkSize).toBe(10);
    expect(options.populateOptions.dryRun).toBe(true);
    expect(options.populateOptions.summaryStdout).toBe(false);
    expect(options.populateOptions.summaryPath).toBe('./reports/run1/populate-summary.json');
    expect(options.validateOptions.summaryStdout).toBe(true);
    expect(options.validateOptions.summaryPath).toBe('./reports/run1/validate-summary.json');
    expect(options.validateOptions.onlyEntities).toEqual(['store', 'client']);
    expect(options.skipPopulate).toBe(false);
    expect(options.skipValidate).toBe(false);
  });

  it('allows toggling skip flags and explicit boolean values', () => {
    const options = parsePopulateAndValidateCliArgs([
      '--skip-populate',
      '--skip-validate',
      '--populate-summary-stdout=false',
      '--validate-fail-on-missing=no',
    ]);

    expect(options.skipPopulate).toBe(true);
    expect(options.skipValidate).toBe(true);
    expect(options.populateOptions.summaryStdout).toBe(false);
    expect(options.validateOptions.failOnMissing).toBe(false);
  });

  it('applies shared only/skip filters when provided', () => {
    const options = parsePopulateAndValidateCliArgs([
      '--only=store,client',
      '--skip=sales,transfer',
    ]);

    expect(options.populateOptions.onlyEntities).toEqual(['store', 'client']);
    expect(options.validateOptions.onlyEntities).toEqual(['store', 'client']);
    expect(options.populateOptions.skipEntities).toEqual(['sales', 'transfer']);
    expect(options.validateOptions.skipEntities).toEqual(['sales', 'transfer']);
  });

  it('prefers specific populate filters over shared ones', () => {
    const options = parsePopulateAndValidateCliArgs([
      '--only=store,client',
      '--populate-only=inventory',
    ]);

    expect(options.populateOptions.onlyEntities).toEqual(['inventory']);
    expect(options.validateOptions.onlyEntities).toEqual(['store', 'client']);
  });

  it('applies shared summary stdout flag when provided', () => {
    const options = parsePopulateAndValidateCliArgs(['--summary-stdout=false']);

    expect(options.populateOptions.summaryStdout).toBe(false);
    expect(options.validateOptions.summaryStdout).toBe(false);
  });

  it('allows overriding shared summary stdout with specific flags', () => {
    const options = parsePopulateAndValidateCliArgs([
      '--summary-stdout=true',
      '--validate-summary-stdout=false',
    ]);

    expect(options.populateOptions.summaryStdout).toBe(true);
    expect(options.validateOptions.summaryStdout).toBe(false);
  });

  it('throws on unknown arguments', () => {
    expect(() => parsePopulateAndValidateCliArgs(['--unknown-flag'])).toThrow(
      /Unknown argument/,
    );
  });
});