import { PrismaClient } from '@prisma/client'
import { readdirSync } from 'fs'
import { join, extname, basename } from 'path'

const prisma = new PrismaClient()

async function main() {
  const logosDir = join(__dirname, '..', 'uploads', 'brands')
  const files = readdirSync(logosDir).filter((file) => file.endsWith('.svg') || file.endsWith('.png'))

  const brands: Record<string, { svg?: string; png?: string }> = {}

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const name = basename(file, ext).toLowerCase()
    const relPath = `/uploads/brands/${file}`
    if (!brands[name]) {
      brands[name] = {}
    }
    if (ext === '.svg') {
      brands[name].svg = relPath
    } else if (ext === '.png') {
      brands[name].png = relPath
    }
  }

  for (const [name, paths] of Object.entries(brands)) {
    const insertResult = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO "Brand" ("name", "logoSvg", "logoPng")
      VALUES (${name}, ${paths.svg ?? null}, ${paths.png ?? null})
      ON CONFLICT ("name") DO UPDATE SET "logoSvg" = EXCLUDED."logoSvg", "logoPng" = EXCLUDED."logoPng"
      RETURNING "id"
    `

    const brandId = insertResult[0].id

    await prisma.$executeRaw`
      UPDATE "Product" SET "brandId" = ${brandId} WHERE LOWER("brand") = ${name}
    `
  }
}

main()
  .catch((e) => {
    console.error('Error seeding brands:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })