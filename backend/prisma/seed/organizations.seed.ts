import { PrismaClient } from '@prisma/client'
import { mkdir, readFile, writeFile } from 'fs/promises'
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
  summaryPath?: string
}

export type OrganizationSeedAction = 'created' | 'updated'

export type OrganizationSeedResult = {
  code: string
  action: OrganizationSeedAction
  unitsCreated: number
  unitsUpdated: number
  unitsEnsured: number
}

export type OrganizationSeedSummary = {
  processedAt: string
  totalOrganizations: number
  totalCreated: number
  totalUpdated: number
  totalUnitsCreated: number
  totalUnitsUpdated: number
  organizations: OrganizationSeedResult[]
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
  const options: SeedCliOptions = {}

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
      continue
    }

    if (arg.startsWith('--summary-path=')) {
      const [, rawValue] = arg.split('=')
      const summaryPath = ensureValue('--summary-path', rawValue).trim()
      options.summaryPath = summaryPath
      continue
    }

    if (arg === '--summary-path') {
      const nextValue = ensureValue(arg, argv[index + 1]).trim()
      options.summaryPath = nextValue
      index += 1
      continue
    }

    if (arg.startsWith('--summaryPath=')) {
      const [, rawValue] = arg.split('=')
      const summaryPath = ensureValue('--summaryPath', rawValue).trim()
      options.summaryPath = summaryPath
      continue
    }

    if (arg === '--summaryPath') {
      const nextValue = ensureValue(arg, argv[index + 1]).trim()
      options.summaryPath = nextValue
      index += 1
    }
  }

  const codes = normalizeCodes(collected)
  if (codes.length) {
    options.onlyOrganizations = codes
  }

  return options
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

function buildUnitIdentifiers(unit: SeedOrganizationUnit): string[] {
  const identifiers = [`name:${unit.name}`]
  if (unit.code) {
    identifiers.unshift(`code:${unit.code}`)
  }
  return identifiers
}

async function upsertOrganization(org: SeedOrganization): Promise<OrganizationSeedResult> {
  const existingOrganization = await prisma.organization.findUnique({
    where: { code: org.code },
  })
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
    return {
      code: org.code,
      action: existingOrganization ? 'updated' : 'created',
      unitsCreated: 0,
      unitsUpdated: 0,
      unitsEnsured: 0,
    }
  }

  const existingUnits = await prisma.organizationUnit.findMany({
    where: { organizationId: organization.id },
  })

  const existingUnitIdentifiers = new Set<string>()
  for (const unit of existingUnits) {
    if (unit.code) {
      existingUnitIdentifiers.add(`code:${unit.code}`)
    }
    existingUnitIdentifiers.add(`name:${unit.name}`)
  }

  const resolvedUnits = new Map<string, number>()
  for (const unit of existingUnits) {
    if (unit.code) {
      resolvedUnits.set(unit.code, unit.id)
    }
    resolvedUnits.set(unit.name, unit.id)
  }

  const pendingUnits = [...org.units]
  let createdUnits = 0
  let updatedUnits = 0
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

      const identifiers = buildUnitIdentifiers(unit)
      const existedPreviously = identifiers.some((identifier) =>
        existingUnitIdentifiers.has(identifier),
      )

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
      identifiers.forEach((identifier) => existingUnitIdentifiers.add(identifier))
      if (existedPreviously) {
        updatedUnits += 1
      } else {
        createdUnits += 1
      }
      pendingUnits.splice(index, 1)
    }

    if (pendingUnits.length === before) {
      const unresolved = pendingUnits.map((unit) => mapKey(unit)).join(', ')
      throw new Error(
        `Unable to resolve parent hierarchy for organization ${org.code}. Remaining units: ${unresolved}`,
      )
    }
  }

  console.log(
    `Organization ${org.code} ensured with ${org.units.length} unit(s) (created=${createdUnits}, updated=${updatedUnits})`,
  )

  return {
    code: org.code,
    action: existingOrganization ? 'updated' : 'created',
    unitsCreated: createdUnits,
    unitsUpdated: updatedUnits,
    unitsEnsured: org.units.length,
  }
}

export function buildSeedSummary(
  organizations: OrganizationSeedResult[],
): OrganizationSeedSummary {
  const totalOrganizations = organizations.length
  const summary = organizations.reduce(
    (accumulator, organization) => {
      if (organization.action === 'created') {
        accumulator.totalCreated += 1
      } else {
        accumulator.totalUpdated += 1
      }
      accumulator.totalUnitsCreated += organization.unitsCreated
      accumulator.totalUnitsUpdated += organization.unitsUpdated
      return accumulator
    },
    {
      totalOrganizations,
      totalCreated: 0,
      totalUpdated: 0,
      totalUnitsCreated: 0,
      totalUnitsUpdated: 0,
    },
  )

  return {
    processedAt: new Date().toISOString(),
    totalOrganizations: summary.totalOrganizations,
    totalCreated: summary.totalCreated,
    totalUpdated: summary.totalUpdated,
    totalUnitsCreated: summary.totalUnitsCreated,
    totalUnitsUpdated: summary.totalUnitsUpdated,
    organizations,
  }
}

export async function persistSeedSummary(
  summaryPath: string,
  summary: OrganizationSeedSummary,
): Promise<boolean> {
  try {
    await mkdir(path.dirname(summaryPath), { recursive: true })
    await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
    console.log(`[organizations-seed] Summary written to ${summaryPath}`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(
      `[organizations-seed] Failed to write summary file at ${summaryPath}: ${message}`,
    )
    return false
  }
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

  const organizationResults: OrganizationSeedResult[] = []
  for (const org of selectedOrganizations) {
    const result = await upsertOrganization(org)
    organizationResults.push(result)
  }

  const summary = buildSeedSummary(organizationResults)
  console.log(
    `[organizations-seed] Completed. organizations=${summary.totalOrganizations}, created=${summary.totalCreated}, updated=${summary.totalUpdated}, unitsCreated=${summary.totalUnitsCreated}, unitsUpdated=${summary.totalUnitsUpdated}`,
  )

  if (cliOptions.summaryPath) {
    await persistSeedSummary(cliOptions.summaryPath, summary)
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