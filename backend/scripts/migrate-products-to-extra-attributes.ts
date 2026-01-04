import { readFileSync } from 'node:fs';

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationArgs {
  orgId?: number;
  companyId?: number;
  placeholder: Prisma.InputJsonValue;
  batchSize: number;
  markMigrated: boolean;
}

function parseJsonPlaceholder(input?: string): Prisma.InputJsonValue {
  if (!input) {
    return { size: null, color: null };
  }

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object') {
      return parsed as Prisma.InputJsonValue;
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[migrate-products-to-extra-attributes] No se pudo parsear placeholder: ${details}`,
    );
  }

  throw new Error(
    '[migrate-products-to-extra-attributes] El placeholder debe ser un objeto JSON.',
  );
}

function parseArgs(argv: string[]): MigrationArgs {
  let orgId: number | undefined;
  let companyId: number | undefined;
  let placeholder: Prisma.InputJsonValue | undefined;
  let placeholderFile: string | undefined;
  let batchSize = 50;
  let markMigrated = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--org' || arg.startsWith('--org=')) {
      const value = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      orgId = Number.parseInt(value ?? '', 10);
      if (arg === '--org') index += 1;
      continue;
    }

    if (arg === '--company' || arg.startsWith('--company=')) {
      const value = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      companyId = Number.parseInt(value ?? '', 10);
      if (arg === '--company') index += 1;
      continue;
    }

    if (arg === '--placeholder' || arg.startsWith('--placeholder=')) {
      const value = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      placeholder = parseJsonPlaceholder(value);
      if (arg === '--placeholder') index += 1;
      continue;
    }

    if (arg === '--placeholder-file' || arg.startsWith('--placeholder-file=')) {
      placeholderFile = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      if (arg === '--placeholder-file') index += 1;
      continue;
    }

    if (arg === '--batch' || arg.startsWith('--batch=')) {
      const value = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      batchSize = Number.parseInt(value ?? '50', 10);
      if (arg === '--batch') index += 1;
      continue;
    }

    if (arg === '--mark-migrated') {
      markMigrated = true;
      continue;
    }

    console.warn(
      `[migrate-products-to-extra-attributes] argumento no reconocido ${arg}, se ignorara.`,
    );
  }

  if (placeholderFile) {
    const fileContents = readFileSync(placeholderFile, 'utf8');
    placeholder = parseJsonPlaceholder(fileContents);
  }

  return {
    orgId: Number.isFinite(orgId) ? orgId : undefined,
    companyId: Number.isFinite(companyId) ? companyId : undefined,
    placeholder: placeholder ?? { size: null, color: null },
    batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 50,
    markMigrated,
  };
}

async function migrateBatch(
  args: MigrationArgs,
  cursor?: number,
): Promise<{ lastId?: number; processed: number }> {
  const where: Prisma.ProductWhereInput = {
    ...(args.orgId ? { organizationId: args.orgId } : {}),
    ...(args.companyId ? { companyId: args.companyId } : {}),
    OR: [
      { extraAttributes: { equals: Prisma.JsonNull } },
      { extraAttributes: { equals: Prisma.DbNull } },
    ],
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { id: 'asc' },
    take: args.batchSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: { id: true },
  });

  if (!products.length) {
    return { processed: 0 };
  }

  await prisma.$transaction(
    products.map((product) =>
      prisma.product.update({
        where: { id: product.id },
        data: {
          extraAttributes: args.placeholder,
          ...(args.markMigrated ? { isVerticalMigrated: true } : {}),
        },
      }),
    ),
  );

  const lastId = products[products.length - 1]?.id;
  return { lastId, processed: products.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log('[migrate-products-to-extra-attributes] Iniciando script...');
  console.log(
    `   filtros -> orgId=${args.orgId ?? 'todos'}, companyId=${
      args.companyId ?? 'todos'
    }, batch=${args.batchSize}`,
  );

  let cursor: number | undefined;
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { processed, lastId } = await migrateBatch(args, cursor);
    if (!processed) break;
    total += processed;
    cursor = lastId;
    console.log(
      `[migrate-products-to-extra-attributes] productos actualizados (acumulado=${total})`,
    );
  }

  console.log(
    `[migrate-products-to-extra-attributes] Finalizado. Productos actualizados: ${total}.`,
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  const details = error instanceof Error ? error.message : String(error);
  console.error(
    `[migrate-products-to-extra-attributes] Error inesperado: ${details}`,
  );
  await prisma.$disconnect();
  process.exit(1);
});
