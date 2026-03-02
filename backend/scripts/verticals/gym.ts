import { VerticalScriptContext } from './index';

/**
 * Sets up default data for the GYM vertical
 * - Creates default membership categories
 * - Idempotent: Skips if categories already exist
 */
export async function setupGymDefaults(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[setup_gym_defaults] Missing prisma or companyId, skipping',
    );
    return;
  }

  const existingCategories = await prisma.category.count({
    where: { companyId },
  });

  if (existingCategories > 0) {
    console.log(
      `[setup_gym_defaults] Company ${companyId} already has ${existingCategories} categories, skipping`,
    );
    return;
  }

  const defaultGymCategories = [
    { name: 'Membresías', description: 'Planes de membresía del gimnasio' },
    {
      name: 'Clases Grupales',
      description: 'Clases grupales y actividades',
    },
    {
      name: 'Entrenamiento Personal',
      description: 'Sesiones de entrenamiento personalizado',
    },
    {
      name: 'Suplementos',
      description: 'Suplementos deportivos y nutricionales',
    },
    {
      name: 'Accesorios',
      description: 'Accesorios y merchandising del gimnasio',
    },
  ];

  await prisma.category.createMany({
    data: defaultGymCategories.map((cat) => ({
      ...cat,
      companyId,
      status: 'Activo',
    })),
    skipDuplicates: true,
  });

  console.log(
    `[setup_gym_defaults] Created ${defaultGymCategories.length} gym categories for company ${companyId}`,
  );
}

/**
 * Creates default gym classes for the GYM vertical
 * - Creates common class types (Yoga, Spinning, CrossFit, etc.)
 * - Idempotent: Skips if classes already exist
 */
export async function setupGymClasses(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId, organizationId } = ctx;

  if (!prisma || !companyId) {
    console.warn(
      '[setup_gym_classes] Missing prisma or companyId, skipping',
    );
    return;
  }

  const existing = await prisma.gymClass.count({
    where: { companyId },
  });

  if (existing > 0) {
    console.log(
      `[setup_gym_classes] Company ${companyId} already has ${existing} classes, skipping`,
    );
    return;
  }

  const defaultClasses = [
    {
      name: 'Yoga',
      description: 'Clase de yoga para flexibilidad y relajación',
      category: 'Relajación',
      durationMin: 60,
      maxCapacity: 20,
    },
    {
      name: 'Spinning',
      description: 'Clase de ciclismo indoor de alta intensidad',
      category: 'Cardio',
      durationMin: 45,
      maxCapacity: 25,
    },
    {
      name: 'CrossFit',
      description: 'Entrenamiento funcional de alta intensidad',
      category: 'Fuerza',
      durationMin: 60,
      maxCapacity: 15,
    },
    {
      name: 'Zumba',
      description: 'Clase de baile y fitness con música latina',
      category: 'Cardio',
      durationMin: 50,
      maxCapacity: 30,
    },
    {
      name: 'Pilates',
      description: 'Ejercicios de control corporal y postura',
      category: 'Relajación',
      durationMin: 55,
      maxCapacity: 15,
    },
    {
      name: 'Boxeo Fitness',
      description: 'Entrenamiento de boxeo con enfoque en fitness',
      category: 'Cardio',
      durationMin: 45,
      maxCapacity: 20,
    },
    {
      name: 'Musculación Guiada',
      description: 'Sesión guiada de entrenamiento con pesas',
      category: 'Fuerza',
      durationMin: 60,
      maxCapacity: 12,
    },
    {
      name: 'Stretching',
      description: 'Sesión de estiramiento y movilidad',
      category: 'Relajación',
      durationMin: 30,
      maxCapacity: 25,
    },
  ];

  await prisma.gymClass.createMany({
    data: defaultClasses.map((cls) => ({
      ...cls,
      companyId,
      organizationId: organizationId ?? null,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  console.log(
    `[setup_gym_classes] Created ${defaultClasses.length} default classes for company ${companyId}`,
  );
}

/**
 * Cleanup handler for GYM vertical
 * Archives gym-specific data when switching away from GYM vertical.
 */
export async function cleanupGymData(
  ctx: VerticalScriptContext,
): Promise<void> {
  const { prisma, companyId } = ctx;

  if (!prisma || !companyId) {
    console.log(
      `[cleanup_gym_data] Missing prisma or companyId, skipping`,
    );
    return;
  }

  // Deactivate classes and schedules (soft approach, no data loss)
  await prisma.gymClass.updateMany({
    where: { companyId },
    data: { isActive: false },
  });

  await prisma.gymClassSchedule.updateMany({
    where: { companyId },
    data: { isActive: false },
  });

  // Mark members as inactive
  await prisma.gymMember.updateMany({
    where: { companyId },
    data: { status: 'INACTIVE' },
  });

  console.log(
    `[cleanup_gym_data] Deactivated gym data for company ${companyId}`,
  );
}
