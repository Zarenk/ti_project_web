import { PrismaClient, BusinessVertical } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating products to placeholder extra_attributes...');

  const organizations = await prisma.organization.findMany({
    select: { id: true, businessVertical: true },
  });

  for (const org of organizations) {
    if (org.businessVertical !== BusinessVertical.RETAIL) {
      continue;
    }

    const products = await prisma.product.findMany({
      where: {
        organizationId: org.id,
        extraAttributes: null,
      },
      select: { id: true },
    });

    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          extraAttributes: {
            size: null,
            color: null,
            sku_variant: null,
          },
          isVerticalMigrated: false,
        },
      });
    }
  }

  console.log('Migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
