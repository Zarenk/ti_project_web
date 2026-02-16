import { readFileSync } from 'node:fs';

import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { ensureOrgIds, parseOrgArgs } from './utils/subscription-migration-helpers';

loadEnv();

const prisma = new PrismaClient();

interface LegacyOptions {
  planCode: string;
  graceUntil?: string;
  graceDays?: number;
  legacyQuotas?: Record<string, number>;
}

function coerceRecord(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return {};
}

function parseLegacyQuotas(input?: string): Record<string, number> | undefined {
  if (!input) return undefined;
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo parsear legacyQuotas: ${details}`);
  }
  return undefined;
}

function loadQuotasFromFile(path?: string): Record<string, number> | undefined {
  if (!path) return undefined;
  try {
    const raw = readFileSync(path, 'utf8');
    return parseLegacyQuotas(raw);
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo leer el archivo de quotas ${path}: ${details}`);
  }
}

function parseArgs(argv: string[]): { orgIds: number[]; options: LegacyOptions } {
  const { orgIds, rest } = parseOrgArgs(argv);
  let planCode = 'legacy';
  let graceUntil: string | undefined;
  let graceDays: number | undefined;
  let quotas: Record<string, number> | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--plan' || arg === '--plan-code') {
      planCode = rest[index + 1] ?? planCode;
      index += 1;
      continue;
    }

    if (arg.startsWith('--plan=') || arg.startsWith('--plan-code=')) {
      const [, value] = arg.split('=');
      if (value) planCode = value;
      continue;
    }

    if (arg === '--grace-until') {
      graceUntil = rest[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--grace-until=')) {
      const [, value] = arg.split('=');
      graceUntil = value;
      continue;
    }

    if (arg === '--grace-days') {
      graceDays = Number.parseInt(rest[index + 1] ?? '', 10);
      index += 1;
      continue;
    }

    if (arg.startsWith('--grace-days=')) {
      const [, value] = arg.split('=');
      graceDays = Number.parseInt(value ?? '', 10);
      continue;
    }

    if (arg === '--legacy-quotas') {
      quotas = parseLegacyQuotas(rest[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--legacy-quotas=')) {
      const [, value] = arg.split('=');
      quotas = parseLegacyQuotas(value);
      continue;
    }

    if (arg === '--legacy-quotas-file') {
      quotas = loadQuotasFromFile(rest[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith('--legacy-quotas-file=')) {
      const [, value] = arg.split('=');
      quotas = loadQuotasFromFile(value);
      continue;
    }

    console.warn(`[assign-legacy-plan] Argumento desconocido ${arg}, se ignorara.`);
  }

  return {
    orgIds,
    options: {
      planCode,
      graceUntil,
      graceDays,
      legacyQuotas: quotas,
    },
  };
}

function resolveGraceUntil(options: LegacyOptions): string | undefined {
  if (options.graceUntil) {
    return new Date(options.graceUntil).toISOString();
  }
  if (options.graceDays && Number.isFinite(options.graceDays)) {
    const graced = new Date();
    graced.setDate(graced.getDate() + options.graceDays);
    return graced.toISOString();
  }
  return undefined;
}

async function assignLegacyPlan(orgId: number, options: LegacyOptions): Promise<void> {
  const legacyPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: options.planCode },
  });
  if (!legacyPlan) {
    throw new Error(`No se encontro el plan ${options.planCode}`);
  }

  const now = new Date();
  const graceUntil = resolveGraceUntil(options);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
  });

  const baseMetadata = coerceRecord(subscription?.metadata ?? {});
  const updatedMetadata: Record<string, any> = {
    ...baseMetadata,
    legacyAssignedAt: baseMetadata.legacyAssignedAt ?? now.toISOString(),
  };

  if (graceUntil) {
    updatedMetadata.legacyGraceUntil = graceUntil;
  }
  if (options.legacyQuotas) {
    updatedMetadata.legacyQuotas = options.legacyQuotas;
  }
  if (updatedMetadata.pendingPlanChange) {
    updatedMetadata.pendingPlanChange = null;
  }
  if (updatedMetadata.graceLimits) {
    updatedMetadata.graceLimits = null;
  }

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: legacyPlan.id,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: updatedMetadata,
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        organizationId: orgId,
        planId: legacyPlan.id,
        status: SubscriptionStatus.ACTIVE,
        metadata: updatedMetadata,
      },
    });
  }
}

async function main(): Promise<void> {
  try {
    const { orgIds, options } = parseArgs(process.argv.slice(2));
    ensureOrgIds(orgIds);

    let failures = 0;
    for (const orgId of orgIds) {
      try {
        await assignLegacyPlan(orgId, options);
        console.info(`[assign-legacy-plan] organizacion ${orgId} migrada a ${options.planCode}.`);
      } catch (error) {
        failures += 1;
        const details = error instanceof Error ? error.message : String(error);
        console.error(`[assign-legacy-plan] Error con la organizacion ${orgId}: ${details}`);
      }
    }

    await prisma.$disconnect();
    if (failures) {
      process.exit(1);
    }
  } catch (error) {
    await prisma.$disconnect();
    const details = error instanceof Error ? error.message : String(error);
    console.error(`[assign-legacy-plan] Error fatal: ${details}`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}
