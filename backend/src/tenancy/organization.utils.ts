import { BadRequestException } from '@nestjs/common';

/**
 * Resolves the organizationId to be used in an operation ensuring that all provided
 * references belong to the same tenant. When multiple values are available (explicit
 * payload, store association, cached entity, etc.) every defined value must match or
 * a BadRequestException will be thrown with the provided message.
 */
export function resolveOrganizationId({
  provided,
  fallbacks = [],
  mismatchError,
}: {
  provided?: number | null;
  fallbacks?: Array<number | null | undefined>;
  mismatchError: string;
}): number | null {
  const definedValues = [provided, ...fallbacks].filter(
    (value): value is number => value !== undefined && value !== null,
  );

  if (definedValues.length === 0) {
    return null;
  }

  const [first, ...rest] = definedValues;
  if (rest.some((value) => value !== first)) {
    throw new BadRequestException(mismatchError);
  }

  return first;
}

/**
 * Helper used to compose Prisma filters based on an optional organizationId.
 * Undefined values are ignored (keeping backwards compatibility) while null
 * values are propagated to allow querying legacy rows.
 */
export function resolveCompanyId({
  provided,
  fallbacks = [],
  mismatchError,
}: {
  provided?: number | null;
  fallbacks?: Array<number | null | undefined>;
  mismatchError: string;
}): number | null {
  const definedValues = [provided, ...fallbacks].filter(
    (value): value is number => value !== undefined && value !== null,
  );

  if (definedValues.length === 0) {
    return null;
  }

  const [first, ...rest] = definedValues;
  if (rest.some((value) => value !== first)) {
    throw new BadRequestException(mismatchError);
  }

  return first;
}

/**
 * Helper used to compose Prisma filters based on optional tenant identifiers.
 * Undefined values are ignored (keeping backwards compatibility) while null
 * values are propagated to allow querying legacy rows.
 */
export function buildOrganizationFilter(
  organizationId?: number | null,
  companyId?: number | null,
) {
  const filter: Record<string, number | null> = {};

  if (organizationId !== undefined) {
    filter.organizationId = organizationId;
  }

  if (companyId !== undefined) {
    filter.companyId = companyId;
  }

  return filter;
}
