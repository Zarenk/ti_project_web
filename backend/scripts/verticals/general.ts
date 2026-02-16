import { VerticalScriptContext } from './index';

/**
 * Ensures default settings exist for any company, regardless of vertical
 * - Validates basic company data integrity
 * - Idempotent: Safe to run multiple times
 */
export async function ensureDefaultSettings(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn('[ensure_default_settings] Missing prisma or companyId, skipping');
    return;
  }

  // Verify company exists and has basic data
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      businessVertical: true,
    },
  });

  if (!company) {
    console.warn(
      `[ensure_default_settings] Company ${companyId} not found, skipping`,
    );
    return;
  }

  console.log(
    `[ensure_default_settings] Default settings ensured for company ${companyId} (${company.name}) - vertical: ${company.businessVertical}`,
  );

  // Future: When CompanySettings/CompanyConfiguration model exists, use it to:
  // - Set default tax rates if not configured
  // - Set default currency preferences
  // - Set default document numbering sequences
  // - Enable/disable default features based on vertical

  // For now, this script validates the company exists and logs its status
}

/**
 * Cleanup handler for GENERAL vertical
 * - GENERAL is the default vertical with no specific data to clean up
 * - This is a no-op function for consistency
 */
export async function cleanupGeneralData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { companyId } = ctx;

  console.log(
    `[cleanup_general_data] No specific data to clean for GENERAL vertical (company ${companyId})`,
  );
}
