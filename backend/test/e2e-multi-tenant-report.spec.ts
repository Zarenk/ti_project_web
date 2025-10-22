import { parsePipelineArgs } from '../scripts/e2e-multi-tenant-report';

describe('e2e-multi-tenant-report parser', () => {
  it('parses metrics, badge and passthrough args', () => {
    const args = parsePipelineArgs([
      '--metrics',
      'reports/metrics.json',
      '--badge',
      'reports/badge.json',
      '--no-badge',
      '--runInBand',
    ]);

    expect(args.metricsPath).toContain('reports/metrics.json');
    expect(args.badgePath).toContain('reports/badge.json');
    expect(args.skipBadge).toBe(true);
    expect(args.jestArgs).toEqual(['--runInBand']);
  });
});
