import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  computeCoverage,
  parseArgs,
  readMetrics,
} from '../scripts/report-multi-tenant-coverage';

describe('report-multi-tenant-coverage helpers', () => {
  it('computes coverage using totals fallback', () => {
    const metrics = computeCoverage(
      {
        totals: {
          organizations: 2,
          users: 5,
          clients: 0,
        },
        organizationsProcessed: 2,
      },
      3,
    );

    expect(metrics.entitiesTotal).toBe(3);
    expect(metrics.entitiesCovered).toBe(2);
    expect(metrics.coverageRatio).toBeCloseTo(2 / 3, 3);
    expect(metrics.coveragePercent).toBeCloseTo((2 / 3) * 100, 3);
    expect(metrics.organizationsProcessed).toBe(2);
  });

  it('computes coverage using explicit fields', () => {
    const metrics = computeCoverage(
      {
        entitiesTotal: 10,
        entitiesCovered: 8,
        coverageRatio: 0.8,
      },
      2,
    );

    expect(metrics.entitiesTotal).toBe(10);
    expect(metrics.entitiesCovered).toBe(8);
    expect(metrics.coverageRatio).toBe(0.8);
    expect(metrics.coveragePercent).toBe(80);
  });

  it('parses CLI arguments with shorthand', () => {
    const args = parseArgs([
      '--metrics',
      'metrics.json',
      '--decimals',
      '4',
      '--json',
    ]);

    expect(args.metricsPath).toBe('metrics.json');
    expect(args.decimals).toBe(4);
    expect(args.format).toBe('json');
  });

  it('reads metrics from disk', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'multi-tenant-metrics-'));
    const filePath = join(tmpDir, 'metrics.json');
    await writeFile(
      filePath,
      JSON.stringify({
        entitiesTotal: 4,
        entitiesCovered: 3,
      }),
      'utf8',
    );

    const metrics = await readMetrics(filePath);
    expect(metrics.entitiesTotal).toBe(4);
    expect(metrics.entitiesCovered).toBe(3);

    await rm(tmpDir, { recursive: true, force: true });
  });
});
