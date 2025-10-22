import { mkdir } from 'node:fs/promises';

import { config as loadEnv } from 'dotenv';

import { populateAndValidate } from '../prisma/seed/populate-and-validate.seed';
import { buildPhase3OptionsFromEnv } from './phase3-config';

loadEnv();

async function main(): Promise<void> {
  const {
    options = { skipPopulate: false, skipValidate: false },
    availableEntities,
    dryRun,
    resolvedSummaryDir,
    printOptions,
  } = buildPhase3OptionsFromEnv();

  await mkdir(resolvedSummaryDir, { recursive: true });

  console.info(
    `[phase3] Starting populate-and-validate (skipPopulate=${options.skipPopulate} skipValidate=${options.skipValidate} dryRun=${dryRun}).`,
  );
  console.info(
    `[phase3] Output summaries will be stored under ${resolvedSummaryDir}.`,
  );
  console.info(
    `[phase3] Entities available: ${availableEntities.join(', ')}.`,
  );

  if (printOptions) {
    console.info('[phase3] Effective options:', JSON.stringify(options, null, 2));
  }

  const result = await populateAndValidate(options);

  if (result.populateSummary) {
    const summary = result.populateSummary;
    console.info(
      `[phase3] Populate summary -> defaultOrganizationId=${summary.defaultOrganizationId} updated=${summary.overall.updated} planned=${summary.overall.planned}.`,
    );
    if (summary.summaryFilePath) {
      console.info(
        `[phase3] Populate summary written to ${summary.summaryFilePath}.`,
      );
    }
  } else {
    console.info('[phase3] Population step skipped.');
  }

  if (result.validateSummary) {
    const summary = result.validateSummary;
    const processedEntities = Object.keys(summary.processed ?? {}).length;
    console.info(
      `[phase3] Validate summary -> processed=${processedEntities} missing=${summary.hasMissing ? summary.missingEntities.join(', ') : 'none'} mismatched=${summary.hasMismatched ? summary.mismatchedEntities.join(', ') : 'none'}.`,
    );
    if (summary.summaryFilePath) {
      console.info(
        `[phase3] Validation summary written to ${summary.summaryFilePath}.`,
      );
    }
    if (summary.hasMissing || summary.hasMismatched) {
      console.warn(
        '[phase3] Validation detected missing or mismatched organizationId entries. Review summary for details.',
      );
    }
  } else {
    console.info('[phase3] Validation step skipped.');
  }
}

main().catch((error) => {
  console.error('[phase3] Failed to execute populate-and-validate run.', error);
  process.exit(1);
});
