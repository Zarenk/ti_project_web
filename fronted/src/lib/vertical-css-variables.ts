import type { VerticalConfigPayload } from '@/app/dashboard/tenancy/tenancy.api';

/**
 * Convierte la configuración de vertical a CSS variables
 */
export function verticalConfigToCSSVariables(
  config: VerticalConfigPayload | null
): Record<string, string> {
  if (!config || !config.ui) {
    return {};
  }

  const { ui } = config;
  const variables: Record<string, string> = {};

  // Primary color
  if (ui.primaryColor) {
    variables['--vertical-primary'] = ui.primaryColor;
    // Generate lighter/darker variants
    variables['--vertical-primary-foreground'] = '#ffffff';
  }

  // Theme-based variables
  if (ui.theme) {
    variables['--vertical-theme'] = ui.theme;
  }

  // Dashboard layout
  if (ui.dashboardLayout) {
    variables['--vertical-layout'] = ui.dashboardLayout;
  }

  return variables;
}

/**
 * Obtiene el data-vertical attribute basado en el nombre del vertical
 */
export function getVerticalDataAttribute(
  businessVertical: string | null | undefined
): string {
  if (!businessVertical) {
    return 'general';
  }
  return businessVertical.toLowerCase();
}
