import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import path from 'path'

type SeedPrismaClient = PrismaClient & Record<string, any>

const prisma = new PrismaClient() as SeedPrismaClient

export type SeedOrganizationUnit = {
  code?: string
  name: string
  status?: string
  parentCode?: string
}

export type SeedOrganization = {
  code: string
  name: string
  status?: string
  units?: SeedOrganizationUnit[]
}

type SeedCliOptions = {
  onlyOrganizations?: string[]
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

function ensureValue(arg: string, value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`[organizations-seed] Missing value for ${arg}`)
  }
  return value
}

function normalizeCodes(codes: string[]): string[] {
  const unique: string[] = []
  for (const raw of codes) {
    const code = raw.trim()
    if (!code) {
      continue
    }
    if (!unique.includes(code)) {
      unique.push(code)
    }
  }
  return unique
}

export function parseSeedCliArgs(argv: string[]): SeedCliOptions {
  const collected: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg.startsWith('--org=')) {
      const [, rawValue] = arg.split('=')
      const ensured = ensureValue('--org', rawValue)
      collected.push(...ensured.split(','))
      continue
    }

    if (arg === '--org') {
      const nextValue = ensureValue(arg, argv[index + 1])
      collected.push(...nextValue.split(','))
      index += 1
      continue
    }

    if (arg.startsWith('--organization=')) {
      const [, rawValue] = arg.split('=')
      const ensured = ensureValue('--organization', rawValue)
      collected.push(...ensured.split(','))
      continue
    }

    if (arg === '--organization') {
      const nextValue = ensureValue(arg, argv[index + 1])
      collected.push(...nextValue.split(','))
      index += 1
    }
  }

  const codes = normalizeCodes(collected)
  return codes.length ? { onlyOrganizations: codes } : {}
}

export function filterSeedOrganizations(
  organizations: SeedOrganization[],
  onlyOrganizations: string[] | undefined,
): SeedOrganization[] {
  if (!onlyOrganizations?.length) {
    return organizations
  }

  const requested = new Set(onlyOrganizations)
  const missing: string[] = []
  const filtered = organizations.filter((organization) => {
    if (requested.has(organization.code)) {
      requested.delete(organization.code)
      return true
    }
    return false
  })

  if (requested.size > 0) {
    missing.push(...requested)
  }

  if (missing.length) {
    throw new Error(
      `[organizations-seed] Unknown organization code(s): ${missing.join(', ')}`,
    )
  }

  return filtered
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
  const cliOptions = parseSeedCliArgs(process.argv.slice(2))
  const seedPath = resolveSeedPath()
  const organizations = await loadSeedFile(seedPath)

  if (!organizations.length) {
    console.log('No organizations provided in seed file. Nothing to do.')
    return
  }

  const selectedOrganizations = filterSeedOrganizations(
    organizations,
    cliOptions.onlyOrganizations,
  )

  if (!selectedOrganizations.length) {
    console.log('No organizations matched the provided filters. Nothing to do.')
    return
  }

  if (cliOptions.onlyOrganizations?.length) {
    console.log(
      `Processing ${selectedOrganizations.length} organization(s): ${cliOptions.onlyOrganizations.join(', ')}`,
    )
  }

  for (const org of selectedOrganizations) {
    await upsertOrganization(org)
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Error seeding organizations:', error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}

export { main as runOrganizationsSeed }