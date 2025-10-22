import { generatePhase3Report } from '../scripts/phase3-report';

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
    expect(report.populate?.entitiesWithUpdates).toEqual(['client', 'sales', 'store']);
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
    expect(report.populate?.entitiesWithUpdates).toEqual(['client', 'sales', 'store']);
    expect(report.validate).toBeUndefined();
  });

  it('throws when no summaries are provided', () => {
    expect(() => generatePhase3Report({})).toThrow(
      '[phase3:report] No populate or validate summaries were provided.',
    );
  });
});
