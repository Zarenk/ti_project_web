import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureBrandForOrg(
  brand: { id: number; name: string; logoSvg: string | null; logoPng: string | null },
  orgId: number,
  keywordNames: string[],
) {
  const existing = await prisma.brand.findFirst({
    where: { organizationId: orgId, name: brand.name },
  });

  const target = existing
    ? existing
    : await prisma.brand.create({
        data: {
          name: brand.name,
          logoSvg: brand.logoSvg,
          logoPng: brand.logoPng,
          organizationId: orgId,
        },
      });

  for (const keywordName of keywordNames) {
    const keywordExists = await prisma.keyword.findFirst({
      where: { brandId: target.id, name: keywordName },
      select: { id: true },
    });
    if (!keywordExists) {
      await prisma.keyword.create({
        data: { name: keywordName, brandId: target.id },
      });
    }
  }

  return target;
}

async function main() {
  const brands = await prisma.brand.findMany({
    where: { organizationId: null },
    select: {
      id: true,
      name: true,
      logoSvg: true,
      logoPng: true,
    },
  });

  for (const brand of brands) {
    const orgIds = await prisma.product.findMany({
      where: { brandId: brand.id, organizationId: { not: null } },
      distinct: ['organizationId'],
      select: { organizationId: true },
    });

    const resolvedOrgIds = orgIds
      .map((row) => row.organizationId)
      .filter((value): value is number => typeof value === 'number');

    if (resolvedOrgIds.length === 0) {
      console.log(
        `[brands-backfill] Brand "${brand.name}" sin organizacion (sin productos).`,
      );
      continue;
    }

    const keywordRows = await prisma.keyword.findMany({
      where: { brandId: brand.id },
      select: { name: true },
    });
    const keywordNames = keywordRows.map((row) => row.name);

    for (const orgId of resolvedOrgIds) {
      const target = await ensureBrandForOrg(brand, orgId, keywordNames);

      if (target.id !== brand.id) {
        await prisma.product.updateMany({
          where: { brandId: brand.id, organizationId: orgId },
          data: { brandId: target.id },
        });
      }
    }

    const remaining = await prisma.product.count({
      where: { brandId: brand.id },
    });

    if (remaining === 0) {
      await prisma.keyword.deleteMany({ where: { brandId: brand.id } });
      await prisma.brand.delete({ where: { id: brand.id } });
      console.log(
        `[brands-backfill] Brand "${brand.name}" eliminada (sin productos).`,
      );
    } else {
      const primaryOrgId = resolvedOrgIds[0];
      const conflict = await prisma.brand.findFirst({
        where: {
          organizationId: primaryOrgId,
          name: brand.name,
          NOT: { id: brand.id },
        },
        select: { id: true },
      });

      if (!conflict) {
        await prisma.brand.update({
          where: { id: brand.id },
          data: { organizationId: primaryOrgId },
        });
        console.log(
          `[brands-backfill] Brand "${brand.name}" asignada a organizacion ${primaryOrgId}.`,
        );
      } else {
        console.log(
          `[brands-backfill] Conflicto al asignar "${brand.name}" a org ${primaryOrgId}, revisa manualmente.`,
        );
      }
    }
  }
}

main()
  .then(() => {
    console.log('[brands-backfill] Done.');
  })
  .catch((error) => {
    console.error('[brands-backfill] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
