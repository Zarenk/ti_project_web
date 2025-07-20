import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const storeId = parseInt(process.env.DEFAULT_WEB_STORE_ID ?? '1', 10)
  await prisma.store.upsert({
    where: { id: storeId },
    update: {},
    create: {
      id: storeId,
      name: 'WEB POS',
      description: 'Canal de ventas online',
      status: 'ACTIVE',
    },
  })
  console.log(`Default web store ensured with ID ${storeId}`)
}

main()
  .catch((e) => {
    console.error('Error creating default store:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })