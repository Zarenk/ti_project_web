import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed minimal accounting accounts for organizations
 * Creates 3 essential accounts: Cash & Banks, Sales, Purchases & Expenses
 */
export async function seedMinimalAccounts() {
  console.log('🌱 Seeding minimal accounting accounts...');

  // Get all organizations that don't have accounts yet
  const organizations = await prisma.organization.findMany({
    where: {
      status: 'ACTIVE',
      accounts: {
        none: {},
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (organizations.length === 0) {
    console.log('✅ All organizations already have accounting accounts');
    return;
  }

  const minimalAccounts = [
    {
      code: '10',
      name: 'Caja y Bancos',
      accountType: 'ACTIVO' as const,
      level: 1,
      isPosting: true,
    },
    {
      code: '70',
      name: 'Ventas',
      accountType: 'INGRESO' as const,
      level: 1,
      isPosting: true,
    },
    {
      code: '60',
      name: 'Compras y Gastos',
      accountType: 'GASTO' as const,
      level: 1,
      isPosting: true,
    },
  ];

  let totalCreated = 0;

  for (const org of organizations) {
    console.log(`  Creating accounts for organization: ${org.name} (ID: ${org.id})`);

    for (const accountData of minimalAccounts) {
      try {
        await prisma.account.create({
          data: {
            ...accountData,
            organizationId: org.id,
          },
        });
        totalCreated++;
      } catch (error) {
        console.warn(
          `    ⚠️  Account ${accountData.code} already exists for org ${org.id}, skipping...`,
        );
      }
    }
  }

  console.log(
    `✅ Created ${totalCreated} accounts for ${organizations.length} organizations`,
  );
}

// Run if executed directly
if (require.main === module) {
  seedMinimalAccounts()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
