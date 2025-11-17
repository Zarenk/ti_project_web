import { resolve } from 'node:path';

import { parsePipelineArgs } from '../scripts/e2e-multi-tenant-report';

describe('parsePipelineArgs', () => {
  it('returns defaults when no arguments are provided', () => {
    const result = parsePipelineArgs([]);

    expect(result.metricsPath).toBe(
      resolve(process.cwd(), 'tmp', 'multi-tenant-fixtures', 'metrics.json'),
    );
    expect(result.badgePath).toBe(
      resolve(
        process.cwd(),
        'tmp',
        'multi-tenant-fixtures',
        'coverage-badge.json',
      ),
    );
    expect(result.skipBadge).toBe(false);
    expect(result.jestArgs).toEqual([]);
    expect(result.runPhase3).toBe(false);
    expect(result.phase3Env).toEqual({});
  });

  it('parses custom metrics, badge and phase3 options', () => {
    const args = [
      '--metrics',
      './artifacts/metrics.json',
      '--badge=./artifacts/badge.json',
      '--no-badge',
      '--phase3',
      '--phase3-summary-dir=./phase3/output',
      '--phase3-dry-run=false',
      '--phase3-skip-populate',
      '--phase3-skip-validate=false',
      '--phase3-print-options',
      '--phase3-default-org-code',
      'TENANT-42',
      '--phase3-env',
      'PHASE3_ONLY_ENTITIES=store,client',
      '--phase3-env=PHASE3_CUSTOM_FLAG=value',
      '--runInBand',
      '--testNamePattern=multi-tenant',
    ];

    const result = parsePipelineArgs(args);

    expect(result.metricsPath).toBe(
      resolve(process.cwd(), 'artifacts', 'metrics.json'),
    );
    expect(result.badgePath).toBe(
      resolve(process.cwd(), 'artifacts', 'badge.json'),
    );
    expect(result.skipBadge).toBe(true);
    expect(result.jestArgs).toEqual([
      '--runInBand',
      '--testNamePattern=multi-tenant',
    ]);
    expect(result.runPhase3).toBe(true);
    expect(result.phase3Env).toEqual({
      PHASE3_SUMMARY_DIR: resolve(process.cwd(), 'phase3', 'output'),
      PHASE3_DRY_RUN: 'false',
      PHASE3_SKIP_POPULATE: 'true',
      PHASE3_SKIP_VALIDATE: 'false',
      PHASE3_PRINT_OPTIONS: 'true',
      PHASE3_DEFAULT_ORG_CODE: 'TENANT-42',
      PHASE3_ONLY_ENTITIES: 'store,client',
      PHASE3_CUSTOM_FLAG: 'value',
    });
  });

  it('fills defaults for phase3 summary directory when only --phase3 is provided', () => {
    const result = parsePipelineArgs([
      '--phase3',
      '--metrics=./out/metrics.json',
    ]);

    expect(result.runPhase3).toBe(true);
    expect(result.phase3Env.PHASE3_SUMMARY_DIR).toBe(
      resolve(process.cwd(), 'tmp', 'phase3'),
    );
  });

  it('allows disabling phase3 explicitly', () => {
    const result = parsePipelineArgs(['--phase3=false']);

    expect(result.runPhase3).toBe(false);
  });

  it('throws when phase3 env flag is invalid', () => {
    expect(() => parsePipelineArgs(['--phase3-env', 'INVALID'])).toThrow(
      '[ci-multi-tenant] phase3 env variables require KEY=VALUE format.',
    );
  });
});
