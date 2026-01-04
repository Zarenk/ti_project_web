import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isJsonObject(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function main() {
  console.log('Validando overrides de verticales...\n');
  const overrides = await prisma.organizationVerticalOverride.findMany({
    include: {
      organization: { select: { name: true } },
    },
  });

  if (!overrides.length) {
    console.log('No hay overrides registrados.');
    return;
  }

  let invalidCount = 0;
  overrides.forEach((override) => {
    if (!isJsonObject(override.configJson)) {
      invalidCount += 1;
      console.error(
        `Override invalido para organización ${override.organizationId}` +
          ` (${override.organization?.name ?? 'sin nombre'}).`,
      );
    }
  });

  if (invalidCount === 0) {
    console.log('Todos los overrides tienen JSON valido.');
  } else {
    throw new Error(`Se encontraron ${invalidCount} overrides invalidos.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
