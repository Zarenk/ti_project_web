import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTableExists(tableName: string) {
  const result = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = ${tableName}
    ) AS "exists";`;
  return result[0]?.exists ?? false;
}

async function checkIndexExists(indexName: string) {
  const result = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = ${indexName}
    ) AS "exists";`;
  return result[0]?.exists ?? false;
}

async function checkEnumExists(enumName: string) {
  const result = await prisma.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = ${enumName}
    ) AS "exists";`;
  return result[0]?.exists ?? false;
}

async function main() {
  console.log('🔎 Validando post-migración de verticales...\n');

  const enumExists = await checkEnumExists('BusinessVertical');
  if (!enumExists) {
    throw new Error('❌ Enum BusinessVertical no existe en la base de datos.');
  }
  console.log('✅ Enum BusinessVertical creado.');

  const organizationCounts = await prisma.$queryRaw<
    Array<{ business_vertical: string; total: bigint }>
  >`SELECT "businessVertical" AS business_vertical, COUNT(*)::bigint AS total
     FROM "Organization"
     GROUP BY 1`;
  console.log('✅ Distribución de verticales:');
  organizationCounts.forEach((row) => {
    console.log(`   - ${row.business_vertical}: ${Number(row.total)}`);
  });

  const indexExists = await checkIndexExists('Organization_businessVertical_idx');
  if (!indexExists) {
    throw new Error('❌ Índice Organization_businessVertical_idx no se encuentra.');
  }
  console.log('✅ Índice Organization_businessVertical_idx creado.');

  const auditTable = await checkTableExists('VerticalChangeAudit');
  const snapshotTable = await checkTableExists('VerticalRollbackSnapshot');
  if (!auditTable || !snapshotTable) {
    throw new Error('❌ Tablas VerticalChangeAudit/VerticalRollbackSnapshot no existen.');
  }
  console.log('✅ Tablas VerticalChangeAudit y VerticalRollbackSnapshot creadas.');

  console.log('\n✨ Validación post-migración completada.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
