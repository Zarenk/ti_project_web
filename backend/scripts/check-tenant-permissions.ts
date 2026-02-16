import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const organizationId = Number(process.env.CHECK_TENANT_ORG_ID ?? 1);
    const companyId = Number(process.env.CHECK_TENANT_COMPANY_ID ?? 1);

    const settings = await prisma.siteSettings.findFirst({
      where: { organizationId, companyId },
    });

    console.log(`siteSettings for org=${organizationId} company=${companyId}:`);
    if (!settings) {
      console.warn('  No record found. Please seed siteSettings first.');
      return;
    }

    const rawData = settings.data as Record<string, any>;
    console.log('  permissions:', rawData?.permissions ?? 'none');
    console.log('  raw data:', rawData);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('check-tenant-permissions script failed:', error);
  process.exit(1);
});
