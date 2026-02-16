import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { ensureOrgIds, parseOrgArgs } from './utils/subscription-migration-helpers';

loadEnv();

const prisma = new PrismaClient();

interface ScheduleOptions {
  planCode: string;
  scheduledFor?: string;
}

function parseScheduleArgs(argv: string[]): { orgIds: number[]; options: ScheduleOptions } {
  const { orgIds, rest } = parseOrgArgs(argv);
  let planCode: string | undefined;
  let scheduledFor: string | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--plan' || arg === '--plan-code') {
      planCode = rest[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--plan=') || arg.startsWith('--plan-code=')) {
      const [, value] = arg.split('=');
      planCode = value;
      continue;
    }

    if (arg === '--date' || arg === '--effective-at') {
      scheduledFor = rest[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--date=') || arg.startsWith('--effective-at=')) {
      const [, value] = arg.split('=');
      scheduledFor = value;
      continue;
    }

    console.warn(`[schedule-migration] Argumento desconocido ${arg}, se ignorara.`);
  }

  if (!planCode) {
    throw new Error('Debes indicar el plan destino con --plan');
  }

  return {
    orgIds,
    options: { planCode, scheduledFor },
  };
}

function resolveScheduleDate(subscriptionEnd?: Date | null, explicit?: string): string {
  if (explicit) {
    return new Date(explicit).toISOString();
  }
  if (subscriptionEnd) {
    return subscriptionEnd.toISOString();
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 30);
  return fallback.toISOString();
}

async function scheduleMigration(orgId: number, options: ScheduleOptions): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });
  if (!subscription) {
    throw new Error(`No se encontro suscripcion para la organizacion ${orgId}`);
  }

  const targetPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: options.planCode },
  });
  if (!targetPlan) {
    throw new Error(`No existe el plan ${options.planCode}`);
  }

  const scheduledFor = resolveScheduleDate(
    subscription.currentPeriodEnd,
    options.scheduledFor,
  );

  const metadata =
    subscription.metadata && typeof subscription.metadata === 'object'
      ? (subscription.metadata as Record<string, any>)
      : {};

  metadata.pendingPlanChange = {
    planId: targetPlan.id,
    planCode: targetPlan.code,
    planName: targetPlan.name,
    requestedAt: new Date().toISOString(),
    scheduledFor,
  };

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { metadata },
  });

  return scheduledFor;
}

async function main(): Promise<void> {
  try {
    const { orgIds, options } = parseScheduleArgs(process.argv.slice(2));
    ensureOrgIds(orgIds);

    let failures = 0;
    for (const orgId of orgIds) {
      try {
        const scheduledFor = await scheduleMigration(orgId, options);
        console.info(
          `[schedule-migration] organizacion ${orgId} migrara a ${options.planCode} el ${scheduledFor}.`,
        );
      } catch (error) {
        failures += 1;
        const details = error instanceof Error ? error.message : String(error);
        console.error(`[schedule-migration] Error con la organizacion ${orgId}: ${details}`);
      }
    }

    await prisma.$disconnect();
    if (failures) {
      process.exit(1);
    }
  } catch (error) {
    await prisma.$disconnect();
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[schedule-migration] Error fatal: ${details}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
