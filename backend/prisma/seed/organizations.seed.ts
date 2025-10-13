import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient()

type SeedOrganizationUnit = {
  code?: string
  name: string
  status?: string
  parentCode?: string
}

type SeedOrganization = {
  code: string
  name: string
  status?: string
  units?: SeedOrganizationUnit[]
}

function resolveSeedPath(): string {
  const provided = process.env.ORGANIZATION_SEED_PATH
  if (provided) {
    return provided
  }
  return path.join(__dirname, '../data/organizations.json')
}

function mapKey(unit: SeedOrganizationUnit): string {
  return unit.code ?? unit.name
}

async function loadSeedFile(seedPath: string): Promise<SeedOrganization[]> {
  let raw: string
  try {
    raw = await readFile(seedPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      throw new Error(`Organization seed file not found at ${seedPath}`)
    }
    throw error
  }
  const data = JSON.parse(raw) as unknown
  if (!Array.isArray(data)) {
    throw new Error('Organization seed file must contain an array of organizations')
  }
  return data.map((org) => {
    if (!org || typeof org !== 'object') {
      throw new Error('Organization seed entries must be objects')
    }
    const { code, name, status, units } = org as SeedOrganization
    if (!code || !name) {
      throw new Error('Organization seed entries must include code and name')
    }
    if (units && !Array.isArray(units)) {
      throw new Error(`Units for organization ${code} must be an array`)
    }
    return {
      code,
      name,
      status,
      units: units?.map((unit) => {
        if (!unit || typeof unit !== 'object') {
          throw new Error(`Invalid unit entry for organization ${code}`)
        }
        const { code: unitCode, name: unitName, status: unitStatus, parentCode } = unit
        if (!unitName) {
          throw new Error(`Organization unit entries for organization ${code} must include name`)
        }
        return {
          code: unitCode,
          name: unitName,
          status: unitStatus,
          parentCode,
        }
      }),
    }
  })
}

async function upsertOrganization(org: SeedOrganization) {
  const organization = await prisma.organization.upsert({
    where: { code: org.code },
    update: {
      name: org.name,
      status: org.status ?? 'ACTIVE',
    },
    create: {
      code: org.code,
      name: org.name,
      status: org.status ?? 'ACTIVE',
    },
  })

  if (!org.units?.length) {
    console.log(`Organization ${org.code} ensured (no units provided)`)
    return
  }

  const existingUnits = await prisma.organizationUnit.findMany({
    where: { organizationId: organization.id },
  })

  const resolvedUnits = new Map<string, number>()
  for (const unit of existingUnits) {
    if (unit.code) {
      resolvedUnits.set(unit.code, unit.id)
    }
    resolvedUnits.set(unit.name, unit.id)
  }

  const pendingUnits = [...org.units]
  while (pendingUnits.length > 0) {
    const before = pendingUnits.length
    for (let index = 0; index < pendingUnits.length; ) {
      const unit = pendingUnits[index]
      const parentId = unit.parentCode ? resolvedUnits.get(unit.parentCode) : null
      if (unit.parentCode && parentId === undefined) {
        index += 1
        continue
      }

      const uniqueWhere = unit.code
        ? { organizationId_code: { organizationId: organization.id, code: unit.code } }
        : { organizationId_name: { organizationId: organization.id, name: unit.name } }

      const savedUnit = await prisma.organizationUnit.upsert({
        where: uniqueWhere,
        update: {
          name: unit.name,
          status: unit.status ?? 'ACTIVE',
          parentUnitId: parentId ?? null,
        },
        create: {
          organizationId: organization.id,
          code: unit.code ?? null,
          name: unit.name,
          status: unit.status ?? 'ACTIVE',
          parentUnitId: parentId ?? null,
        },
      })

      resolvedUnits.set(mapKey(unit), savedUnit.id)
      pendingUnits.splice(index, 1)
    }

    if (pendingUnits.length === before) {
      const unresolved = pendingUnits.map((unit) => mapKey(unit)).join(', ')
      throw new Error(
        `Unable to resolve parent hierarchy for organization ${org.code}. Remaining units: ${unresolved}`,
      )
    }
  }

  console.log(`Organization ${org.code} ensured with ${org.units.length} unit(s)`)
}

async function main() {
  const seedPath = resolveSeedPath()
  const organizations = await loadSeedFile(seedPath)
  if (!organizations.length) {
    console.log('No organizations provided in seed file. Nothing to do.')
    return
  }

  for (const org of organizations) {
    await upsertOrganization(org)
  }
}

main()
  .catch((error) => {
    console.error('Error seeding organizations:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })