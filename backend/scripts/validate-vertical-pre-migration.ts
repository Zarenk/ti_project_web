import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumnExists(): Promise<boolean> {
  const result = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'Organization'
        AND column_name = 'businessVertical'
    ) as "exists";`;

  return result[0]?.exists ?? false;
}

async function countOrganizations(where?: { status?: string }) {
  const result = await prisma.organization.aggregate({
    _count: { _all: true },
    where,
  });

  return result._count._all;
}

async function main() {
  console.log('🔍 Validando pre-migración de verticales...\n');

  const columnExists = await checkColumnExists();
  if (columnExists) {
    throw new Error('❌ La columna "businessVertical" ya existe en Organization.');
  }
  console.log('✅ Columna businessVertical no existe (listo para migrar)');

  const totalOrgs = await countOrganizations();
  console.log(`✅ Organizaciones totales: ${totalOrgs}`);

  const activeOrgs = await countOrganizations({ status: 'ACTIVE' });
  console.log(`✅ Organizaciones activas: ${activeOrgs}`);

  console.log('\n📦 Recuerda generar un backup completo antes de aplicar la migración.');
  console.log('   Sugerencia: pg_dump o snapshot del entorno correspondiente.\n');

  console.log('✨ Validación completada. Puedes continuar con la migración.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
