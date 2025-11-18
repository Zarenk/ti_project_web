import { PrismaClient, Prisma } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

const projectRoot = path.resolve(__dirname, '..', '..');
const samplesDir = path.resolve(projectRoot, 'storage', 'invoice-samples');

const ORG_SLUG_OVERRIDES: Record<string, string> = {
  ecoterra: 'TESTING ORGANIZATION',
};

interface SampleFile {
  orgSlug: string;
  providerSlug: string;
  documentType: string;
  filename: string;
  absPath: string;
  relPath: string;
}

interface TemplateGroup {
  orgSlug: string;
  providerSlug: string;
  documentType: string;
  files: SampleFile[];
}

async function exists(dir: string) {
  try {
    await fs.access(dir);
    return true;
  } catch {
    return false;
  }
}

async function listDirectories(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory());
}

async function listFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile());
}

async function discoverSamples(): Promise<TemplateGroup[]> {
  const groups: TemplateGroup[] = [];
  if (!(await exists(samplesDir))) {
    console.warn(`Samples directory not found: ${samplesDir}`);
    return groups;
  }

  const orgDirs = await listDirectories(samplesDir);
  for (const orgDir of orgDirs) {
    const orgSlug = orgDir.name;
    const orgPath = path.join(samplesDir, orgSlug);
    const providerDirs = await listDirectories(orgPath);

    for (const providerDir of providerDirs) {
      const providerSlug = providerDir.name;
      const providerPath = path.join(orgPath, providerSlug);
      const documentTypeDirs = await listDirectories(providerPath);

      for (const documentDir of documentTypeDirs) {
        const documentType = documentDir.name;
        const documentPath = path.join(providerPath, documentType);
        const files = await listFiles(documentPath);

        const pdfFiles = files.filter((file) =>
          file.name.toLowerCase().endsWith('.pdf'),
        );
        if (pdfFiles.length === 0) {
          continue;
        }

        const record: TemplateGroup = {
          orgSlug,
          providerSlug,
          documentType,
          files: pdfFiles.map((file) => {
            const absPath = path.join(documentPath, file.name);
            const relPath = path.relative(samplesDir, absPath);
            return {
              orgSlug,
              providerSlug,
              documentType,
              filename: file.name,
              absPath,
              relPath,
            };
          }),
        };

        groups.push(record);
      }
    }
  }

  return groups;
}

async function computeChecksum(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

async function importGroup(group: TemplateGroup) {
  const primaryOrgArgs: Prisma.OrganizationFindFirstArgs = {
    where: {
      OR: [
        { slug: group.orgSlug },
        {
          name: {
            equals: group.orgSlug.replace(/-/g, ' '),
            mode: 'insensitive',
          },
        },
      ],
    },
  };

  let organization = await prisma.organization.findFirst(primaryOrgArgs);

  if (!organization) {
    const override = ORG_SLUG_OVERRIDES[group.orgSlug];
    if (override) {
      organization = await prisma.organization.findFirst({
        where: {
          OR: [{ slug: override }, { name: override }],
        },
      });
    }
  }

  if (!organization) {
    console.warn(
      `Skipping ${group.orgSlug}/${group.providerSlug}/${group.documentType} - organization not found.`,
    );
    return { created: 0, updated: 0, skipped: group.files.length };
  }

  // Optional: resolve provider by name similar to slug
  const provider = await prisma.provider.findFirst({
    where: {
      organizationId: organization.id,
      name: {
        equals: group.providerSlug.replace(/-/g, ' '),
        mode: 'insensitive',
      },
    },
    select: { id: true, name: true },
  });

  group.files.sort((a, b) => a.filename.localeCompare(b.filename));

  let version = 1;
  let created = 0;
  let updated = 0;

  for (const file of group.files) {
    const checksum = await computeChecksum(file.absPath);
    const relPathPosix = file.relPath.split(path.sep).join('/');

    const existing = await prisma.invoiceTemplate.findFirst({
      where: {
        documentType: group.documentType,
        version,
        organizationId: organization.id,
        providerId: provider?.id ?? null,
      },
    });

    const data = {
      documentType: group.documentType,
      version,
      priority: 100,
      isActive: true,
      checksum,
      sampleFilename: relPathPosix,
      providerName: provider?.name ?? group.providerSlug,
      notes: `Auto-imported from storage (${file.filename}).`,
      organization: { connect: { id: organization.id } },
      provider: provider ? { connect: { id: provider.id } } : undefined,
    };

    if (existing) {
      await prisma.invoiceTemplate.update({
        where: { id: existing.id },
        data: {
          checksum,
          sampleFilename: relPathPosix,
          providerName: provider?.name ?? group.providerSlug,
          notes: `Auto-import updated on ${new Date().toISOString()}`,
        },
      });
      updated++;
    } else {
      await prisma.invoiceTemplate.create({ data });
      created++;
    }

    version++;
  }

  return { created, updated, skipped: 0 };
}

async function main() {
  const groups = await discoverSamples();
  if (groups.length === 0) {
    console.log('No PDF samples found.');
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const group of groups) {
    const stats = await importGroup(group);
    totalCreated += stats.created;
    totalUpdated += stats.updated;
    totalSkipped += stats.skipped;
  }

  console.log(
    `Invoice template import completed. Created: ${totalCreated}, Updated: ${totalUpdated}, Skipped: ${totalSkipped}.`,
  );
}

main()
  .catch((error) => {
    console.error('Error importing invoice templates from samples:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
