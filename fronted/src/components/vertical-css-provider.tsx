'use client';

import { useEffect } from 'react';
import { useVerticalConfig } from '@/hooks/use-vertical-config';
import { verticalConfigToCSSVariables } from '@/lib/vertical-css-variables';

/**
 * Provider que inyecta CSS variables dinámicas basadas en la configuración del vertical
 * Se ejecuta en el cliente y actualiza las variables CSS cuando cambia la configuración
 */
export function VerticalCSSProvider() {
  const { info } = useVerticalConfig();

  useEffect(() => {
    if (!info?.config) {
      // Limpiar variables si no hay config
      const root = document.documentElement;
      root.style.removeProperty('--vertical-primary');
      root.style.removeProperty('--vertical-primary-foreground');
      root.style.removeProperty('--vertical-theme');
      root.style.removeProperty('--vertical-layout');
      return;
    }

    const cssVariables = verticalConfigToCSSVariables(info.config);
    const root = document.documentElement;

    // Aplicar todas las variables CSS
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Actualizar data-vertical attribute
    const vertical = info.businessVertical?.toLowerCase() || 'general';
    root.setAttribute('data-vertical', vertical);

    return () => {
      // Cleanup al desmontar
      Object.keys(cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [info]);

  return null; // Este componente no renderiza nada
}
