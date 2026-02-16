import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    where: { organizationId: 5 },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' }
  });
  
  console.log(`\nCuentas para organizationId=5: ${accounts.length}`);
  if (accounts.length > 0) {
    accounts.forEach(acc => console.log(`  ${acc.code} - ${acc.name}`));
  } else {
    console.log('  ❌ NO HAY CUENTAS CONTABLES');
  }
  
  const neededCodes = ['1011', '7011', '4011', '6911', '2011'];
  const missing = neededCodes.filter(code => 
    !accounts.find(acc => acc.code === code)
  );
  
  if (missing.length > 0) {
    console.log(`\n❌ Cuentas faltantes: ${missing.join(', ')}`);
  } else {
    console.log('\n✅ Todas las cuentas necesarias existen');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
