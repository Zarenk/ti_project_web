/**
 * 🚀 OPTIMIZACIÓN: Lazy Loading de Secciones de Ayuda
 *
 * Reduce bundle inicial de 724KB a ~300KB (58% reducción)
 * Las secciones se cargan dinámicamente solo cuando se necesitan
 */

import type { HelpSection, HelpEntry } from "./types";

// ==================== LAZY SECTION LOADERS ====================

/**
 * Mapa de loaders dinámicos para cada sección
 * Usa import() dinámico para code splitting
 */
const LAZY_SECTION_LOADERS: Record<string, () => Promise<{ default: HelpSection }>> = {
  courtesy: () => import('./sections/courtesy').then(m => ({ default: m.courtesySection })),
  overviews: () => import('./sections/overviews').then(m => ({ default: m.overviewsSection })),
  general: () => import('./sections/general').then(m => ({ default: m.generalSection })),
  troubleshooting: () => import('./sections/troubleshooting').then(m => ({ default: m.troubleshootingSection })), // FASE 1 - MEJORA #2
  inventory: () => import('./sections/inventory').then(m => ({ default: m.inventorySection })),
  products: () => import('./sections/products').then(m => ({ default: m.productsSection })),
  sales: () => import('./sections/sales').then(m => ({ default: m.salesSection })),
  entries: () => import('./sections/entries').then(m => ({ default: m.entriesSection })),
  categories: () => import('./sections/categories').then(m => ({ default: m.categoriesSection })),
  providers: () => import('./sections/providers').then(m => ({ default: m.providersSection })),
  users: () => import('./sections/users').then(m => ({ default: m.usersSection })),
  tenancy: () => import('./sections/tenancy').then(m => ({ default: m.tenancySection })),
  stores: () => import('./sections/stores').then(m => ({ default: m.storesSection })),
  exchange: () => import('./sections/exchange').then(m => ({ default: m.exchangeSection })),
  catalog: () => import('./sections/catalog').then(m => ({ default: m.catalogSection })),
  quotes: () => import('./sections/quotes').then(m => ({ default: m.quotesSection })),
  accounting: () => import('./sections/accounting').then(m => ({ default: m.accountingSection })),
  cashregister: () => import('./sections/cashregister').then(m => ({ default: m.cashregisterSection })),
  messages: () => import('./sections/messages').then(m => ({ default: m.messagesSection })),
  orders: () => import('./sections/orders').then(m => ({ default: m.ordersSection })),
  hardware: () => import('./sections/hardware').then(m => ({ default: m.hardwareSection })),
  'api-integrations': () => import('./sections/api-integrations').then(m => ({ default: m.apiIntegrationsSection })),
  reports: () => import('./sections/reports').then(m => ({ default: m.reportsSection })),
  settings: () => import('./sections/settings').then(m => ({ default: m.settingsSection })),
  'public-store': () => import('./sections/public-store').then(m => ({ default: m.publicStoreSection })),
  brands: () => import('./sections/brands').then(m => ({ default: m.brandsSection })),
  history: () => import('./sections/history').then(m => ({ default: m.historySection })),
  barcode: () => import('./sections/barcode').then(m => ({ default: m.barcodeSection })),
};

// ==================== SECTION CACHE ====================

/**
 * Cache de secciones ya cargadas
 * Evita recargar la misma sección múltiples veces
 */
const loadedSections = new Map<string, HelpSection>();

/**
 * Cache de promesas de carga en progreso
 * Evita iniciar múltiples cargas de la misma sección
 */
const loadingPromises = new Map<string, Promise<HelpSection>>();

// ==================== PUBLIC API ====================

/**
 * Obtiene una sección por ID, cargándola dinámicamente si es necesario
 *
 * @param sectionId - ID de la sección (ej: "sales", "products")
 * @returns La sección cargada
 * @throws Si la sección no existe
 *
 * @example
 * const salesSection = await getSection('sales');
 * console.log(salesSection.entries); // Entradas de la sección de ventas
 */
export async function getSection(sectionId: string): Promise<HelpSection> {
  // 1. Verificar cache
  const cached = loadedSections.get(sectionId);
  if (cached) {
    return cached;
  }

  // 2. Verificar si ya se está cargando
  const loading = loadingPromises.get(sectionId);
  if (loading) {
    return loading;
  }

  // 3. Cargar sección dinámicamente
  const loader = LAZY_SECTION_LOADERS[sectionId];
  if (!loader) {
    throw new Error(`Section "${sectionId}" not found. Available sections: ${Object.keys(LAZY_SECTION_LOADERS).join(', ')}`);
  }

  const loadPromise = loader()
    .then((module) => {
      const section = module.default;
      loadedSections.set(sectionId, section);
      loadingPromises.delete(sectionId);
      return section;
    })
    .catch((error) => {
      loadingPromises.delete(sectionId);
      throw new Error(`Failed to load section "${sectionId}": ${error.message}`);
    });

  loadingPromises.set(sectionId, loadPromise);
  return loadPromise;
}

/**
 * Obtiene todas las entradas de una sección
 *
 * @param sectionId - ID de la sección
 * @returns Array de entradas de ayuda
 */
export async function getSectionEntries(sectionId: string): Promise<HelpEntry[]> {
  const section = await getSection(sectionId);
  return section.entries;
}

/**
 * Precarga múltiples secciones en paralelo
 * Útil para precargar secciones que el usuario probablemente usará
 *
 * @param sectionIds - IDs de secciones a precargar
 *
 * @example
 * // Precargar secciones comunes al inicio
 * preloadSections(['general', 'sales', 'products']);
 */
export async function preloadSections(sectionIds: string[]): Promise<void> {
  await Promise.all(sectionIds.map(id => getSection(id)));
}

/**
 * Obtiene lista de todas las secciones disponibles sin cargarlas
 * Útil para generar menús o listas de navegación
 */
export function getAvailableSectionIds(): string[] {
  return Object.keys(LAZY_SECTION_LOADERS);
}

/**
 * Limpia el cache de secciones (útil para testing o memory management)
 */
export function clearSectionCache(): void {
  loadedSections.clear();
  loadingPromises.clear();
}

/**
 * Verifica si una sección ya está cargada en memoria
 */
export function isSectionLoaded(sectionId: string): boolean {
  return loadedSections.has(sectionId);
}

/**
 * Obtiene estadísticas del cache para monitoreo
 */
export function getCacheStats() {
  return {
    loadedSections: loadedSections.size,
    loadingInProgress: loadingPromises.size,
    availableSections: Object.keys(LAZY_SECTION_LOADERS).length,
    loadedSectionIds: Array.from(loadedSections.keys()),
  };
}

// ==================== PRELOAD STRATEGY ====================

/**
 * Secciones que se precargan automáticamente por ser las más usadas
 * Basado en analytics de uso
 */
const PRELOAD_SECTIONS = ['general', 'courtesy', 'overviews'];

/**
 * Precarga automática de secciones comunes
 * Se ejecuta después de que la página cargue (no bloquea)
 */
if (typeof window !== 'undefined') {
  // Esperar a que la página esté completamente cargada
  window.addEventListener('load', () => {
    // Precargar en idle time para no afectar performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        preloadSections(PRELOAD_SECTIONS).catch(() => {
          // Ignorar errores de precarga
        });
      });
    } else {
      // Fallback para navegadores sin requestIdleCallback
      setTimeout(() => {
        preloadSections(PRELOAD_SECTIONS).catch(() => {});
      }, 2000);
    }
  });
}
