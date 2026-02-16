import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseOrgId(args: string[]) {
  const arg = args.find((value) => value.startsWith('--org='));
  if (!arg) return null;
  const [, rawId] = arg.split('=');
  const orgId = Number(rawId);
  return Number.isFinite(orgId) ? orgId : null;
}

function parseKeep(args: string[]) {
  const arg = args.find((value) => value.startsWith('--keep='));
  if (!arg) return new Set<string>();
  const [, rawList] = arg.split('=');
  return new Set(
    rawList
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item) => item.length > 0),
  );
}

async function main() {
  const orgId = parseOrgId(process.argv.slice(2));
  if (!orgId) {
    throw new Error('Uso: npx ts-node scripts/assign-brands-to-organization.ts --org=ID');
  }
  const keepSet = parseKeep(process.argv.slice(2));

  const brands = await prisma.brand.findMany({
    where: { organizationId: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  if (brands.length === 0) {
    console.log('[assign-brands] No hay marcas sin organizacion.');
    return;
  }

  let updated = 0;
  for (const brand of brands) {
    if (keepSet.size > 0 && !keepSet.has(brand.name)) {
      continue;
    }
    const conflict = await prisma.brand.findFirst({
      where: { organizationId: orgId, name: brand.name },
      select: { id: true },
    });
    if (conflict) {
      console.log(
        `[assign-brands] Omitida "${brand.name}" (ya existe en org ${orgId}).`,
      );
      continue;
    }
    await prisma.brand.update({
      where: { id: brand.id },
      data: { organizationId: orgId },
    });
    updated += 1;
  }

  console.log(
    `[assign-brands] Asignadas ${updated} marca(s) a la organizacion ${orgId}.`,
  );
}

main()
  .catch((error) => {
    console.error('[assign-brands] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
