import { VerticalScriptContext } from './index';

/**
 * Cleanup handler for COMPUTERS vertical
 * - COMPUTERS uses shared product/inventory models, no vertical-specific cleanup needed
 * - This is a no-op function for consistency
 */
export async function cleanupComputersData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { companyId } = ctx;

  console.log(
    `[cleanup_computers_data] No specific data to clean for COMPUTERS vertical (company ${companyId})`,
  );

  // Future: If we add computer-specific models (e.g., PC builds, component compatibility),
  // we would archive and delete them here
}
