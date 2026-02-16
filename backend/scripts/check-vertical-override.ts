import { PrismaClient } from '@prisma/client';

import { BusinessVertical } from '../src/types/business-vertical.enum';
import {
  JsonRecord,
  isPlainObject,
  resolveBaseConfig,
  validateOverridePayload,
} from './utils/vertical-overrides';

const prisma = new PrismaClient();

async function main() {
  console.log('[check-vertical-override] Revisando overrides...');
  const overrides = await prisma.organizationVerticalOverride.findMany({
    include: {
      organization: { select: { id: true, name: true, businessVertical: true } },
    },
  });

  if (!overrides.length) {
    console.log('[check-vertical-override] No se encontraron overrides.');
    await prisma.$disconnect();
    return;
  }

  let totalErrors = 0;

  overrides.forEach((override) => {
    const organization = override.organization;
    const vertical =
      (organization.businessVertical as BusinessVertical) ||
      BusinessVertical.GENERAL;
    const baseConfig = resolveBaseConfig(vertical);

    if (!isPlainObject(override.configJson)) {
      totalErrors += 1;
      console.error(
        `[check-vertical-override] Org ${organization.id} (${organization.name}) tiene JSON invalido.`,
      );
      return;
    }

    const issues = validateOverridePayload(
      baseConfig,
      override.configJson as JsonRecord,
    );
    if (issues.length) {
      totalErrors += issues.length;
      console.error(
        `[check-vertical-override] Org ${organization.id} (${organization.name}) con ${issues.length} problema(s):`,
      );
      issues.forEach((issue) => console.error(`   - ${issue}`));
    } else {
      console.log(
        `[check-vertical-override] Org ${organization.id} (${organization.name}) OK.`,
      );
    }
  });

  await prisma.$disconnect();
  if (totalErrors) {
    console.error(
      `[check-vertical-override] Se encontraron ${totalErrors} problema(s).`,
    );
    process.exit(1);
  } else {
    console.log('[check-vertical-override] Todos los overrides son validos.');
  }
}

main().catch(async (error) => {
  const details = error instanceof Error ? error.message : String(error);
  console.error(`[check-vertical-override] Error inesperado: ${details}`);
  await prisma.$disconnect();
  process.exit(1);
});
