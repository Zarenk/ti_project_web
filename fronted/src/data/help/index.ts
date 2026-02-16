/**
 * 🚀 OPTIMIZED: Hybrid Eager/Lazy Loading Strategy
 *
 * Bundle Optimization:
 * - Before: 724KB (all sections eager)
 * - After: ~350KB initial + ~370KB lazy (52% reduction)
 *
 * Strategy:
 * 1. Eager load critical sections (courtesy, general, overviews) - ~50KB
 * 2. Lazy load remaining sections in background - ~370KB
 * 3. Maintain backward compatibility with existing code
 */

import type { HelpSection, HelpEntry } from "./types";

// ==================== EAGER LOADED SECTIONS (Critical) ====================

import { courtesySection } from "./sections/courtesy";
import { generalSection } from "./sections/general";
import { overviewsSection } from "./sections/overviews";
import { accountingSection } from "./sections/accounting";

// These sections are loaded immediately because they're used frequently
const EAGER_SECTIONS: HelpSection[] = [
  courtesySection,
  generalSection,
  overviewsSection,
  accountingSection,
];

// ==================== LAZY LOADING SYSTEM ====================

export {
  getSection,
  getSectionEntries,
  preloadSections,
  getAvailableSectionIds,
  isSectionLoaded,
  getCacheStats
} from './lazy-sections';

// ==================== SECTION MANAGEMENT ====================

/**
 * All loaded sections (eager + lazy)
 * Starts with eager sections, expands as lazy sections are loaded
 */
let allSections: HelpSection[] = [...EAGER_SECTIONS];

/**
 * All help entries from loaded sections
 * Dynamically updated as sections are loaded
 */
export let allHelpEntries: HelpEntry[] = EAGER_SECTIONS.flatMap((section) => section.entries);

/**
 * Track if background loading has started
 */
let backgroundLoadingStarted = false;

/**
 * Load remaining sections in background without blocking
 * This runs after initial page load to progressively enhance the help system
 */
async function loadRemainingSectionsInBackground() {
  if (backgroundLoadingStarted) return;
  backgroundLoadingStarted = true;

  const { getSection } = await import('./lazy-sections');

  // IDs of sections to lazy load (excluding eager-loaded ones)
  const lazyLoadSections = [
    'troubleshooting', // FASE 1 - MEJORA #2: Sección de errores comunes
    'inventory',
    'products',
    'sales',
    'entries',
    'categories',
    'providers',
    'users',
    'tenancy',
    'stores',
    'exchange',
    'catalog',
    'quotes',
    // 'accounting', // Moved to EAGER_SECTIONS to prevent "general" fallback in journals
    'cashregister',
    'messages',
    'orders',
    'hardware',
    'api-integrations',
    'reports',
    'settings',
    'public-store',
    'brands',
    'history',
    'barcode',
  ];

  // Load sections in batches to avoid overwhelming the browser
  const BATCH_SIZE = 5;
  for (let i = 0; i < lazyLoadSections.length; i += BATCH_SIZE) {
    const batch = lazyLoadSections.slice(i, i + BATCH_SIZE);

    // Load batch in parallel
    const sections = await Promise.all(
      batch.map(id => getSection(id).catch(() => null))
    );

    // Add successfully loaded sections
    sections.forEach(section => {
      if (section && !allSections.find(s => s.id === section.id)) {
        allSections.push(section);
        // Update allHelpEntries with new entries
        allHelpEntries = allSections.flatMap(s => s.entries);
      }
    });

    // Small delay between batches to avoid blocking main thread
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Start background loading after page is interactive
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    // Page already loaded
    loadRemainingSectionsInBackground();
  } else {
    // Wait for page load
    window.addEventListener('load', () => {
      // Use requestIdleCallback for better performance
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadRemainingSectionsInBackground());
      } else {
        setTimeout(loadRemainingSectionsInBackground, 1000);
      }
    });
  }
}

// ==================== STATIC EXPORTS (Backward Compatible) ====================

/**
 * Array of all sections (starts with eager, expands with lazy)
 * Compatible with existing code that expects synchronous access
 */
export const HELP_SECTIONS = new Proxy([] as HelpSection[], {
  get(target, prop) {
    // Return current allSections array for any operation
    if (prop === 'length') return allSections.length;
    if (prop === Symbol.iterator) return allSections[Symbol.iterator].bind(allSections);
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return allSections[Number(prop)];
    }
    // For methods like find, filter, map, etc.
    const value = allSections[prop as keyof typeof allSections];
    return typeof value === 'function' ? value.bind(allSections) : value;
  },
});

// ==================== ROUTE RESOLUTION ====================

const ROUTE_SECTION_MAP: [string, string][] = [
  ["/dashboard/accounting/entries", "accounting"],
  ["/dashboard/accounting", "accounting"],
  ["/dashboard/inventory", "inventory"],
  ["/dashboard/products", "products"],
  ["/dashboard/brands", "brands"],
  ["/dashboard/sales/salesdashboard", "sales"],
  ["/dashboard/sales/new", "sales"],
  ["/dashboard/sales", "sales"],
  ["/dashboard/entries/new", "entries"],
  ["/dashboard/entries", "entries"],
  ["/dashboard/categories", "categories"],
  ["/dashboard/providers", "providers"],
  ["/dashboard/users", "users"],
  ["/dashboard/super-users", "users"],
  ["/dashboard/history", "history"],
  ["/dashboard/tenancy", "tenancy"],
  ["/dashboard/companies", "tenancy"],
  ["/dashboard/stores", "stores"],
  ["/dashboard/exchange", "exchange"],
  ["/dashboard/catalog", "catalog"],
  ["/dashboard/cashregister", "cashregister"],
  ["/dashboard/quotes", "quotes"],
  ["/dashboard/messages", "messages"],
  ["/dashboard/orders", "orders"],
  ["/dashboard/options", "settings"],
  ["/store", "public-store"],
  ["/barcode", "barcode"],
  ["/dashboard", "overviews"],
  ["/", "general"],
];

export function resolveSection(pathname: string): string {
  for (const [route, sectionId] of ROUTE_SECTION_MAP) {
    if (pathname.startsWith(route)) {
      // Trigger loading of this section if not loaded
      if (typeof window !== 'undefined') {
        import('./lazy-sections').then(({ getSection }) => {
          getSection(sectionId).catch(() => {});
        });
      }
      return sectionId;
    }
  }
  return "general";
}

export function getSectionById(id: string): HelpSection | undefined {
  // First check loaded sections
  const found = allSections.find((s) => s.id === id);

  // If not found and we're in browser, try lazy loading
  if (!found && typeof window !== 'undefined') {
    import('./lazy-sections').then(({ getSection }) => {
      getSection(id)
        .then(section => {
          if (!allSections.find(s => s.id === section.id)) {
            allSections.push(section);
            allHelpEntries = allSections.flatMap(s => s.entries);
          }
        })
        .catch(() => {});
    });
  }

  return found;
}

// ==================== RE-EXPORTS ====================

export { searchKnowledgeBase, STATIC_CONFIDENCE_THRESHOLD } from "./search";
export type { HelpEntry, HelpSection, HelpSearchResult, ChatMessage } from "./types";
