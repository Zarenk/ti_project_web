import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const ADMIN_DATA = {
  email: 'jdzare@gmail.com',
  username: 'zarenkcin',
  password: 'chuscasas1991',
}

async function main() {
  const { email, username, password } = ADMIN_DATA

  const existing = await prisma.user.findUnique({ where: { email } })
  let passwordHash: string

  if (existing && (await bcrypt.compare(password, existing.password))) {
    passwordHash = existing.password
  } else {
    passwordHash = await bcrypt.hash(password, 12)
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      username,
      password: passwordHash,
      role: UserRole.ADMIN,
      status: 'ACTIVO',
    },
    create: {
      email,
      username,
      password: passwordHash,
      role: UserRole.ADMIN,
      status: 'ACTIVO',
    },
  })

  console.log(`Admin user ensured for ${email}`)
}

main()
  .catch((error) => {
    console.error('Error seeding admin user:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
