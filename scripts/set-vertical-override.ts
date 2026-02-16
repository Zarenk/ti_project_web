import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const result: { org?: number; json?: string } = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--org' || arg === '--organization') {
      result.org = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith('--org=')) {
      result.org = Number(arg.split('=')[1]);
      continue;
    }
    if (arg === '--json') {
      result.json = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--json=')) {
      result.json = arg.split('=')[1];
    }
  }
  return result;
}

async function main() {
  const { org, json } = parseArgs();
  if (!org || !Number.isFinite(org)) {
    throw new Error('Debes especificar un ID de organización con --org');
  }
  if (!json) {
    throw new Error('Debes proporcionar el JSON con --json');
  }

  const parsed = JSON.parse(json);

  await prisma.organizationVerticalOverride.upsert({
    where: { organizationId: org },
    update: { configJson: parsed },
    create: {
      organizationId: org,
      configJson: parsed,
    },
  });

  console.log(`Override actualizado para la organización ${org}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
