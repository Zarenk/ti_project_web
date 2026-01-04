import { readFileSync } from 'node:fs';

import { Prisma, PrismaClient } from '@prisma/client';

import { BusinessVertical } from '../src/types/business-vertical.enum';
import {
  isPlainObject,
  resolveBaseConfig,
  validateOverridePayload,
} from './utils/vertical-overrides';

const prisma = new PrismaClient();

interface OverrideArgs {
  orgId?: number;
  json?: string;
  file?: string;
  remove: boolean;
}

function parseArgs(argv: string[]): OverrideArgs {
  const args: OverrideArgs = { remove: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--org' || arg.startsWith('--org=')) {
      const value = arg.includes('=')
        ? arg.split('=')[1]
        : argv[index + 1];
      args.orgId = Number.parseInt(value ?? '', 10);
      if (arg === '--org') index += 1;
      continue;
    }
    if (arg === '--json' || arg.startsWith('--json=')) {
      args.json = arg.includes('=') ? arg.split('=')[1] : argv[index + 1];
      if (arg === '--json') index += 1;
      continue;
    }
    if (arg === '--file' || arg.startsWith('--file=')) {
      args.file = arg.includes('=') ? arg.split('=')[1] : argv[index + 1];
      if (arg === '--file') index += 1;
      continue;
    }
    if (arg === '--remove') {
      args.remove = true;
      continue;
    }
    console.warn(
      `[set-vertical-override] argumento desconocido ${arg}, se ignorara.`,
    );
  }

  return args;
}

function loadPayload(args: OverrideArgs) {
  if (args.remove) return null;
  if (args.file) {
    const raw = readFileSync(args.file, 'utf8');
    args.json = raw;
  }
  if (!args.json) {
    throw new Error(
      '[set-vertical-override] Debes proporcionar --json o --file.',
    );
  }
  try {
    const parsed = JSON.parse(args.json);
    if (!isPlainObject(parsed)) {
      throw new Error(
        '[set-vertical-override] El contenido debe ser un objeto JSON valido.',
      );
    }
    return parsed;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[set-vertical-override] Error al parsear JSON: ${details}`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.orgId || !Number.isFinite(args.orgId)) {
    throw new Error(
      '[set-vertical-override] Debes especificar una organizacion con --org=ID.',
    );
  }

  if (args.remove) {
    try {
      await prisma.organizationVerticalOverride.delete({
        where: { organizationId: args.orgId },
      });
      console.log(
        `[set-vertical-override] Override eliminado para la organizacion ${args.orgId}.`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        console.log(
          `[set-vertical-override] La organizacion ${args.orgId} no tenia override.`,
        );
      } else {
        throw error;
      }
    }
    await prisma.$disconnect();
    return;
  }

  const payload = loadPayload(args);
  const organization = await prisma.organization.findUnique({
    where: { id: args.orgId },
    select: { id: true, name: true, businessVertical: true },
  });
  if (!organization) {
    throw new Error(
      `[set-vertical-override] No existe la organizacion ${args.orgId}.`,
    );
  }

  const vertical = organization.businessVertical as BusinessVertical;
  const base = resolveBaseConfig(vertical);
  const issues = validateOverridePayload(base, payload!);
  if (issues.length) {
    issues.forEach((issue) =>
      console.error(`[set-vertical-override] ${issue}`),
    );
    throw new Error(
      `[set-vertical-override] Override invalido, corrige los ${issues.length} error(es).`,
    );
  }

  await prisma.organizationVerticalOverride.upsert({
    where: { organizationId: args.orgId },
    update: { configJson: payload! },
    create: { organizationId: args.orgId, configJson: payload! },
  });

  console.log(
    `[set-vertical-override] Override actualizado para org ${args.orgId} (${organization.name}).`,
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  const details = error instanceof Error ? error.message : String(error);
  console.error(`[set-vertical-override] Error: ${details}`);
  await prisma.$disconnect();
  process.exit(1);
});
