import { VerticalScriptContext } from './index';

/**
 * Sets up project templates for the SERVICES vertical
 * - Creates default project templates for service-based businesses
 * - Idempotent: Skips if templates already exist
 */
export async function setupProjectTemplates(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[setup_project_templates] Missing prisma or companyId, skipping',
    );
    return;
  }

  // Note: ProjectTemplate model doesn't exist yet in the schema
  // For now, we'll set up service categories that can act as project types

  // Check if service categories already exist
  const existingCategories = await prisma.category.count({
    where: { companyId },
  });

  if (existingCategories > 0) {
    console.log(
      `[setup_project_templates] Company ${companyId} already has ${existingCategories} categories, skipping`,
    );
    return;
  }

  // Create default service/project categories
  const defaultServiceCategories = [
    {
      name: 'Consultoría',
      description: 'Servicios de consultoría profesional',
    },
    { name: 'Desarrollo', description: 'Desarrollo de software y tecnología' },
    { name: 'Diseño', description: 'Servicios de diseño gráfico y multimedia' },
    {
      name: 'Mantenimiento',
      description: 'Servicios de mantenimiento y soporte',
    },
    { name: 'Capacitación', description: 'Cursos y capacitaciones' },
    { name: 'Otros Servicios', description: 'Servicios varios' },
  ];

  await prisma.category.createMany({
    data: defaultServiceCategories.map((cat) => ({
      ...cat,
      companyId,
      status: 'Activo',
    })),
    skipDuplicates: true,
  });

  console.log(
    `[setup_project_templates] Created ${defaultServiceCategories.length} service categories for company ${companyId}`,
  );

  // Future: When ProjectTemplate model exists, create actual project templates with:
  // - Default milestones
  // - Standard deliverables
  // - Typical billing structures
  // - Resource allocation templates
}

/**
 * Cleanup handler for SERVICES vertical
 * - SERVICES uses shared models (projects, products), no vertical-specific cleanup needed
 * - This is a no-op function for consistency
 */
export async function cleanupServicesData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { companyId } = ctx;

  console.log(
    `[cleanup_services_data] No specific data to clean for SERVICES vertical (company ${companyId})`,
  );

  // Future: When ProjectTemplate model exists, we may need to archive/delete templates here
}
