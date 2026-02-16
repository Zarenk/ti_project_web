import { BusinessVertical } from '../../src/types/business-vertical.enum';
import {
  VERTICAL_REGISTRY,
  VerticalConfig,
} from '../../src/config/verticals.config';

export type JsonRecord = Record<string, any>;

export function isPlainObject(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null),
  );
}

export function resolveBaseConfig(vertical?: BusinessVertical): VerticalConfig {
  if (vertical && VERTICAL_REGISTRY[vertical]) {
    return VERTICAL_REGISTRY[vertical];
  }
  return VERTICAL_REGISTRY[BusinessVertical.GENERAL];
}

function validateFeatureOverrides(
  base: VerticalConfig,
  override: JsonRecord,
): string[] {
  const errors: string[] = [];
  if (!override.features) {
    return errors;
  }
  if (!isPlainObject(override.features)) {
    errors.push('`features` debe ser un objeto { key: boolean }.');
    return errors;
  }

  Object.keys(override.features).forEach((key) => {
    if (!(key in base.features)) {
      errors.push(`feature desconocida "${key}".`);
    }
  });
  return errors;
}

function validateUiOverrides(
  override: JsonRecord,
): string[] {
  if (!override.ui) return [];
  if (!isPlainObject(override.ui)) {
    return ['`ui` debe ser un objeto.'];
  }

  const allowed = new Set([
    'theme',
    'dashboardLayout',
    'primaryColor',
    'templates',
    'customMenuItems',
  ]);
  const errors: string[] = [];
  Object.keys(override.ui).forEach((key) => {
    if (!allowed.has(key)) {
      errors.push(`Propiedad ui.${key} no es soportada.`);
    }
  });
  if (override.ui.templates && !isPlainObject(override.ui.templates)) {
    errors.push('`ui.templates` debe ser un objeto con strings.');
  }
  if (
    override.ui.customMenuItems &&
    !Array.isArray(override.ui.customMenuItems)
  ) {
    errors.push('`ui.customMenuItems` debe ser un arreglo.');
  }
  return errors;
}

export function validateOverridePayload(
  base: VerticalConfig,
  payload: JsonRecord,
): string[] {
  const errors: string[] = [];
  errors.push(...validateFeatureOverrides(base, payload));
  errors.push(...validateUiOverrides(payload));
  if (payload.fiscal && !isPlainObject(payload.fiscal)) {
    errors.push('`fiscal` debe ser un objeto.');
  }
  return errors;
}
