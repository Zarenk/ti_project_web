import path from 'node:path';

import { POPULATE_ENTITY_KEYS } from '../prisma/seed/populate-organization-ids.seed';
import { buildPhase3OptionsFromEnv } from '../scripts/phase3-config';

describe('buildPhase3OptionsFromEnv', () => {
  it('returns defaults when no environment variables are provided', () => {
    const cwd = path.join(process.cwd(), 'phase3-defaults');
    const config = buildPhase3OptionsFromEnv({ env: {}, cwd });

    const options = config.options!;
    expect(options.skipPopulate).toBe(false);
    expect(options.skipValidate).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(options.populate?.summaryStdout).toBe(true);
    expect(options.validate?.summaryStdout).toBe(true);
    expect(options.populate?.defaultOrganizationCode).toBeUndefined();
    expect(options.populate?.onlyEntities).toBeUndefined();
    expect(options.populate?.skipEntities).toBeUndefined();
    expect(options.validate?.onlyEntities).toBeUndefined();
    expect(options.validate?.skipEntities).toBeUndefined();
    expect(config.resolvedSummaryDir).toBe(
      path.resolve(cwd, 'tmp', 'phase3'),
    );
    expect(config.printOptions).toBe(false);
    expect(options.populate?.summaryPath).toBe(
      path.join(config.resolvedSummaryDir, 'populate-summary.json'),
    );
    expect(options.validate?.summaryPath).toBe(
      path.join(config.resolvedSummaryDir, 'validate-summary.json'),
    );
    expect(config.availableEntities).toEqual(POPULATE_ENTITY_KEYS);
  });

  it('honours overrides from environment variables', () => {
    const env: NodeJS.ProcessEnv = {
      PHASE3_SKIP_POPULATE: 'true',
      PHASE3_SKIP_VALIDATE: '1',
      PHASE3_DRY_RUN: 'false',
      PHASE3_SUMMARY_STDOUT: 'no',
      PHASE3_SUMMARY_DIR: 'artifacts/reports',
      PHASE3_DEFAULT_ORG_CODE: 'TENANT-X',
      PHASE3_POPULATE_CHUNK_SIZE: '50',
      PHASE3_ONLY_ENTITIES: 'store,client',
      PHASE3_POPULATE_SKIP_ENTITIES: 'transfer',
      PHASE3_POPULATE_ONLY_ENTITIES: 'store',
      PHASE3_VALIDATE_SKIP_ENTITIES: 'sales',
      PHASE3_VALIDATE_ONLY_ENTITIES: 'client',
      PHASE3_OVERRIDES_PATH: './overrides.json',
      PHASE3_VALIDATE_FAIL_ON_MISSING: 'false',
      PHASE3_VALIDATE_MISMATCH_SAMPLE_SIZE: '7',
      PHASE3_PRINT_OPTIONS: 'true',
    };

    const cwd = path.join(process.cwd(), 'phase3-overrides');
    const config = buildPhase3OptionsFromEnv({
      env,
      cwd,
    });

    const options = config.options!;
    expect(options.skipPopulate).toBe(true);
    expect(options.skipValidate).toBe(true);
    expect(config.dryRun).toBe(false);
    expect(options.populate?.summaryStdout).toBe(false);
    expect(options.validate?.summaryStdout).toBe(false);
    expect(options.populate?.defaultOrganizationCode).toBe('TENANT-X');
    expect(options.populate?.chunkSize).toBe(50);
    expect(options.populate?.overridesPath).toBe('./overrides.json');
    expect(options.validate?.failOnMissing).toBe(false);
    expect(options.validate?.mismatchSampleSize).toBe(7);

    expect(config.resolvedSummaryDir).toBe(
      path.resolve(cwd, 'artifacts', 'reports'),
    );
    expect(options.populate?.summaryPath).toBe(
      path.join(config.resolvedSummaryDir, 'populate-summary.json'),
    );
    expect(options.validate?.summaryPath).toBe(
      path.join(config.resolvedSummaryDir, 'validate-summary.json'),
    );

    expect(options.populate?.onlyEntities).toEqual(['store', 'client']);
    expect(options.populate?.skipEntities).toEqual(['transfer']);
    expect(options.validate?.onlyEntities).toEqual(['store', 'client']);
    expect(options.validate?.skipEntities).toEqual(['sales']);
    expect(config.printOptions).toBe(true);
  });

  it('throws when invalid entities are supplied', () => {
    const env: NodeJS.ProcessEnv = {
      PHASE3_ONLY_ENTITIES: 'invalid-entity',
    };

    expect(() =>
      buildPhase3OptionsFromEnv({ env, cwd: process.cwd() }),
    ).toThrow('[phase3] Invalid entity in PHASE3_ONLY_ENTITIES: invalid-entity');
  });
});
