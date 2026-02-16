const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Verificar cuentas para organizationId 5
  const accounts = await prisma.account.findMany({
    where: { organizationId: 5 },
    select: { id: true, code: true, name: true, organizationId: true },
    orderBy: { code: 'asc' }
  });
  
  console.log(`\nCuentas encontradas para organizationId=5: ${accounts.length}`);
  accounts.forEach(acc => {
    console.log(`  ${acc.code} - ${acc.name}`);
  });
  
  // Verificar organizaciones
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true }
  });
  console.log(`\nOrganizaciones en la BD:`);
  orgs.forEach(org => {
    console.log(`  ID ${org.id}: ${org.name}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
