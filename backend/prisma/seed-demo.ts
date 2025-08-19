import { PrismaClient, PublishAdapter, TemplateVersion } from '@prisma/client'

// This seed inserts demo data using upserts so it can be executed multiple
// times without creating duplicate records.

const prisma = new PrismaClient()

async function main() {
  const org = await prisma.org.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Demo Org' },
  })

  const campaign = await prisma.campaign.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, orgId: org.id, name: 'Demo Campaign' },
  })

  const templateV1 = await prisma.template.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, campaignId: campaign.id, version: TemplateVersion.V1, name: 'Template v1' },
  })

  const templateV2 = await prisma.template.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, campaignId: campaign.id, version: TemplateVersion.V2, name: 'Template v2' },
  })

  const creative1 = await prisma.creative.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      campaignId: campaign.id,
      templateId: templateV1.id,
      name: 'Creative 1',
      data: { text: 'Hello V1' },
    },
  })

  const creative2 = await prisma.creative.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      campaignId: campaign.id,
      templateId: templateV2.id,
      name: 'Creative 2',
      data: { text: 'Hello V2' },
    },
  })

  const run = await prisma.run.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, campaignId: campaign.id, name: 'Initial Run' },
  })

  const asset = await prisma.asset.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      runId: run.id,
      creativeId: creative1.id,
      uri: 'https://example.com/asset.png',
    },
  })

  const target = await prisma.publishTarget.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      orgId: org.id,
      name: 'Local Stub',
      adapter: PublishAdapter.LOCAL_STUB,
      config: { basePath: '/tmp' },
    },
  })

  await prisma.publishTargetLog.upsert({
    where: { id: 1 },
    update: {
      publishTargetId: target.id,
      assetId: asset.id,
      status: 'SUCCESS',
      message: 'Republished',
      runId: run.id,
    },
    create: {
      id: 1,
      publishTargetId: target.id,
      assetId: asset.id,
      status: 'SUCCESS',
      message: 'Published via LocalStubAdapter',
      runId: run.id,
    },
  })

  console.log('Demo seed completed') 
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })