import type { HelpSection } from "./types"

import { generalSection } from "./sections/general"
import { inventorySection } from "./sections/inventory"
import { productsSection } from "./sections/products"
import { salesSection } from "./sections/sales"
import { entriesSection } from "./sections/entries"
import { categoriesSection } from "./sections/categories"
import { providersSection } from "./sections/providers"
import { usersSection } from "./sections/users"
import { tenancySection } from "./sections/tenancy"
import { storesSection } from "./sections/stores"
import { exchangeSection } from "./sections/exchange"
import { catalogSection } from "./sections/catalog"
import { quotesSection } from "./sections/quotes"
import { accountingSection } from "./sections/accounting"
import { cashregisterSection } from "./sections/cashregister"
import { messagesSection } from "./sections/messages"
import { ordersSection } from "./sections/orders"
import { courtesySection } from "./sections/courtesy"
import { overviewsSection } from "./sections/overviews"
import { hardwareSection } from "./sections/hardware"
import { apiIntegrationsSection } from "./sections/api-integrations"
import { reportsSection } from "./sections/reports"
import { settingsSection } from "./sections/settings"
import { publicStoreSection } from "./sections/public-store"

export const HELP_SECTIONS: HelpSection[] = [
  courtesySection,
  overviewsSection,
  generalSection,
  inventorySection,
  productsSection,
  salesSection,
  entriesSection,
  categoriesSection,
  providersSection,
  usersSection,
  tenancySection,
  storesSection,
  exchangeSection,
  catalogSection,
  quotesSection,
  accountingSection,
  cashregisterSection,
  messagesSection,
  ordersSection,
  hardwareSection,
  apiIntegrationsSection,
  reportsSection,
  settingsSection,
  publicStoreSection,
]

const ROUTE_SECTION_MAP: [string, string][] = [
  ["/dashboard/accounting/entries", "accounting"],
  ["/dashboard/accounting", "accounting"],
  ["/dashboard/inventory", "inventory"],
  ["/dashboard/products", "products"],
  ["/dashboard/brands", "products"],
  ["/dashboard/sales/salesdashboard", "sales"],
  ["/dashboard/sales/new", "sales"],
  ["/dashboard/sales", "sales"],
  ["/dashboard/entries/new", "entries"],
  ["/dashboard/entries", "entries"],
  ["/dashboard/categories", "categories"],
  ["/dashboard/providers", "providers"],
  ["/dashboard/users", "users"],
  ["/dashboard/super-users", "users"],
  ["/dashboard/history", "users"],
  ["/dashboard/tenancy", "tenancy"],
  ["/dashboard/companies", "tenancy"],
  ["/dashboard/stores", "stores"],
  ["/dashboard/exchange", "exchange"],
  ["/dashboard/catalog", "catalog"],
  ["/dashboard/quotes", "quotes"],
  ["/dashboard/cashregister", "cashregister"],
  ["/dashboard/messages", "messages"],
  ["/dashboard/orders", "orders"],
  ["/dashboard/onboarding", "general"],
  ["/dashboard/options", "settings"],
  ["/dashboard/account", "general"],
  ["/dashboard", "general"],
  ["/store", "public-store"],
  ["/cart", "public-store"],
]

export function resolveSection(pathname: string): string {
  for (const [route, sectionId] of ROUTE_SECTION_MAP) {
    if (pathname.startsWith(route)) return sectionId
  }
  return "general"
}

export function getSectionById(id: string): HelpSection | undefined {
  return HELP_SECTIONS.find((s) => s.id === id)
}

// Export all help entries from all sections as a flat array
export const allHelpEntries = HELP_SECTIONS.flatMap((section) => section.entries)

export { searchKnowledgeBase, STATIC_CONFIDENCE_THRESHOLD } from "./search"
export type { HelpEntry, HelpSection, HelpSearchResult, ChatMessage } from "./types"
