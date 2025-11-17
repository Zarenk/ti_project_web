import path from 'node:path';

import {
  generatePhase3Report,
  resolvePhase3ReportOptions,
  type Phase3ReportCliOptions,
} from '../scripts/phase3-report';

describe('generatePhase3Report', () => {
  const populateSummary = {
    defaultOrganizationId: 101,
    defaultOrganizationCode: 'tenant-alpha',
    defaultOrganizationCreated: false,
    generatedAt: '2024-06-05T10:00:00.000Z',
    overall: {
      planned: 12,
      updated: 10,
      reasons: { 'inherit:store': 8, 'fallback:default-organization': 2 },
      durationMs: 1200,
      chunks: 3,
    },
    processed: {
      store: {
        planned: 5,
        updated: 4,
        reasons: { 'inherit:store': 4 },
        durationMs: 400,
        chunks: 1,
      },
      client: {
        planned: 4,
        updated: 3,
        reasons: { 'inherit:user': 2, 'fallback:default-organization': 1 },
        durationMs: 500,
        chunks: 1,
      },
      sales: {
        planned: 3,
        updated: 3,
        reasons: { 'inherit:store': 2, 'inherit:user': 1 },
        durationMs: 300,
        chunks: 1,
      },
    },
  };

  const validateSummary = {
    generatedAt: '2024-06-05T10:05:00.000Z',
    missingEntities: ['client'],
    mismatchedEntities: ['sales'],
    hasMissing: true,
    hasMismatched: true,
    mismatchSampleSize: 5,
    processed: {
      client: {
        total: 10,
        missing: 1,
        present: 9,
        mismatched: 0,
        mismatchSample: [],
      },
      sales: {
        total: 12,
        missing: 0,
        present: 12,
        mismatched: 1,
        mismatchSample: ['sale#42'],
      },
    },
  };

  it('aggregates populate and validate summaries', () => {
    const report = generatePhase3Report({
      populate: populateSummary,
      validate: validateSummary,
      populatePath: '/tmp/populate-summary.json',
      validatePath: '/tmp/validate-summary.json',
    });

    expect(report.totals.populatedRecords).toBe(10);
    expect(report.totals.plannedRecords).toBe(12);
    expect(report.totals.populatedEntities).toBe(3);
    expect(report.populate?.entitiesWithUpdates).toEqual([
      'client',
      'sales',
      'store',
    ]);
    expect(report.validate?.missingEntities).toEqual(['client']);
    expect(report.validate?.mismatchedEntities).toEqual(['sales']);
    expect(report.warnings.length).toBe(2);
    expect(report.sources.populatePath).toBe('/tmp/populate-summary.json');
    expect(report.sources.validatePath).toBe('/tmp/validate-summary.json');
  });

  it('handles populate-only summaries without warnings', () => {
    const report = generatePhase3Report({
      populate: populateSummary,
    });

    expect(report.totals.hasMissing).toBe(false);
    expect(report.totals.hasMismatched).toBe(false);
    expect(report.warnings).toEqual([]);
    expect(report.populate?.entitiesWithUpdates).toEqual([
      'client',
      'sales',
      'store',
    ]);
    expect(report.validate).toBeUndefined();
  });

  it('throws when no summaries are provided', () => {
    expect(() => generatePhase3Report({})).toThrow(
      '[phase3:report] No populate or validate summaries were provided.',
    );
  });
});

describe('resolvePhase3ReportOptions', () => {
  const cwd = path.resolve('repo');

  it('uses CLI overrides when provided', () => {
    const cli: Phase3ReportCliOptions = {
      directory: './custom',
      populatePath: './input/populate.json',
      validatePath: './input/validate.json',
      outputPath: './out/report.json',
      summaryStdout: false,
    };

    const resolved = resolvePhase3ReportOptions(cli, {}, cwd);

    expect(resolved.directory).toBe(path.resolve(cwd, 'custom'));
    expect(resolved.populatePath).toBe(
      path.resolve(cwd, 'input', 'populate.json'),
    );
    expect(resolved.validatePath).toBe(
      path.resolve(cwd, 'input', 'validate.json'),
    );
    expect(resolved.outputPath).toBe(path.resolve(cwd, 'out', 'report.json'));
    expect(resolved.summaryStdout).toBe(false);
  });

  it('falls back to environment variables and defaults', () => {
    const env: NodeJS.ProcessEnv = {
      PHASE3_REPORT_DIR: './env-dir',
      PHASE3_REPORT_POPULATE: './env/populate.json',
      PHASE3_REPORT_VALIDATE: './env/validate.json',
      PHASE3_REPORT_OUTPUT: './env/report.json',
      PHASE3_REPORT_STDOUT: 'false',
    };

    const resolved = resolvePhase3ReportOptions({}, env, cwd);

    expect(resolved.directory).toBe(path.resolve(cwd, 'env-dir'));
    expect(resolved.populatePath).toBe(
      path.resolve(cwd, 'env', 'populate.json'),
    );
    expect(resolved.validatePath).toBe(
      path.resolve(cwd, 'env', 'validate.json'),
    );
    expect(resolved.outputPath).toBe(path.resolve(cwd, 'env', 'report.json'));
    expect(resolved.summaryStdout).toBe(false);
  });

  it('defaults to tmp/phase3 when no paths provided', () => {
    const resolved = resolvePhase3ReportOptions({}, {}, cwd);

    expect(resolved.directory).toBe(path.resolve(cwd, 'tmp', 'phase3'));
    expect(resolved.populatePath).toBe(
      path.resolve(cwd, 'tmp', 'phase3', 'populate-summary.json'),
    );
    expect(resolved.validatePath).toBe(
      path.resolve(cwd, 'tmp', 'phase3', 'validate-summary.json'),
    );
    expect(resolved.outputPath).toBeUndefined();
    expect(resolved.summaryStdout).toBe(true);
  });

  it('uses PHASE3_OPTIONS_PATH as output alias', () => {
    const env: NodeJS.ProcessEnv = {
      PHASE3_OPTIONS_PATH: './env/options.json',
      PHASE3_REPORT_STDOUT: 'no',
    };

    const resolved = resolvePhase3ReportOptions({}, env, cwd);

    expect(resolved.outputPath).toBe(path.resolve(cwd, 'env', 'options.json'));
    expect(resolved.summaryStdout).toBe(false);
  });
});
