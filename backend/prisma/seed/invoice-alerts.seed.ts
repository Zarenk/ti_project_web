import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.findFirst({
    include: { companies: { take: 1 } },
  });
  if (!organization) {
    throw new Error('No organizations available to seed invoice alerts.');
  }

  let company = organization.companies[0];
  if (!company) {
    company = await prisma.company.create({
      data: {
        organizationId: organization.id,
        name: `Seed Company ${organization.id}`,
        legalName: `Seed Company ${organization.id}`,
      },
    });
  }

  const seedFilename = 'seed-invoice-alerts.pdf';
  let template = await prisma.invoiceTemplate.findFirst({
    where: { sampleFilename: seedFilename, organizationId: organization.id },
  });

  if (!template) {
    template = await prisma.invoiceTemplate.create({
      data: {
        organizationId: organization.id,
        companyId: company.id,
        providerName: 'Proveedor Seed',
        documentType: 'FACTURA_SEED',
        version: 1,
        priority: 100,
        isActive: true,
        sampleFilename: seedFilename,
        notes: 'Plantilla de ejemplo creada por seed:invoice-alerts',
      },
    });
  }

  const identifier = `${template.organizationId ?? 'none'}:${
    template.companyId ?? 'none'
  }:TEMPLATE_REVIEW:${template.providerName ?? 'seed'}:template:${template.id}`;

  const alert = await prisma.monitoringAlert.upsert({
    where: { identifier },
    update: {
      status: 'ACTIVE',
      failureCount: 1,
      lastFailureAt: new Date(),
      metadata: {
        documentType: template.documentType,
        providerName: template.providerName,
        lastUpdatedAt: template.updatedAt,
      },
    },
    create: {
      organizationId: template.organizationId,
      companyId: template.companyId,
      alertType: 'TEMPLATE_REVIEW',
      providerName: template.providerName,
      entityType: 'template',
      entityId: template.id,
      status: 'ACTIVE',
      failureCount: 1,
      lastFailureAt: new Date(),
      identifier,
      metadata: {
        documentType: template.documentType,
        providerName: template.providerName,
        lastUpdatedAt: template.updatedAt,
      },
    },
  });

  await prisma.monitoringAlertEvent.create({
    data: {
      alertId: alert.id,
      organizationId: alert.organizationId ?? organization.id,
      companyId: alert.companyId ?? company.id,
      alertType: 'TEMPLATE_REVIEW',
      status: 'ACTIVE',
      severity: 'WARN',
      message: 'Seed: plantilla requiere revisión manual',
      metadata: {
        templateId: template.id,
        providerName: template.providerName,
      },
    },
  });

  console.log('Seeded invoice alerts sample:', {
    organizationId: organization.id,
    companyId: company.id,
    templateId: template.id,
    alertId: alert.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
