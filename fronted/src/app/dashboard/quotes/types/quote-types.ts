import type {
  QuoteCatalog,
  QuoteCategoryKey,
  QuoteClient,
  QuoteOption,
  BankAccount,
  QuoteDetail,
  getQuoteMeta,
} from "../quotes.api"

// ============================================================================
// Core Types
// ============================================================================

export type StoreOption = {
  id: number
  name: string
}

export type SelectionMap = Record<string, QuoteOption[]>

export type QuoteDraft = {
  version: 1
  updatedAt: string
  quoteNumber: string
  serverQuoteId?: number | null
  serverQuoteStatus?: "DRAFT" | "ISSUED" | "CANCELLED" | null
  tab: QuoteCategoryKey
  selection: SelectionMap
  priceOverrides: Record<string, number>
  quantities: Record<string, number>
  clientName: string
  contactName: string
  whatsAppPhone: string
  clientDocType?: string
  clientDocNumber?: string
  limitByStock: boolean
  validity: string
  currency: string
  conditions: string
  storeId: number | null
  taxRate: number
}

// ============================================================================
// Component Props
// ============================================================================

export type QuoteContextBarProps = {
  storeId: number | null
  stores: StoreOption[]
  clients: QuoteClient[]
  clientName: string
  contactName: string
  whatsAppPhone: string
  clientDocType: string
  clientDocNumber: string
  clientOpen: boolean
  onStoreChange: (storeId: number | null) => void
  onClientSelect: (client: QuoteClient) => void
  onClientOpenChange: (open: boolean) => void
  onClientNameChange: (name: string) => void
  onContactNameChange: (name: string) => void
  onWhatsAppPhoneChange: (phone: string) => void
  onClientDocTypeChange: (type: string) => void
  onClientDocNumberChange: (number: string) => void
  onNewClientClick: () => void
  isReadOnly: boolean
}

export type QuoteProductCatalogProps = {
  tab: QuoteCategoryKey
  catalog: QuoteCatalog | null
  selection: SelectionMap
  pcCategoryFilter: string
  pcProductFilter: string
  hardwareCategoryFilter: string
  hardwareProductFilter: string
  deferredPcFilter: string
  deferredHwFilter: string
  limitByStock: boolean
  onTabChange: (tab: QuoteCategoryKey) => void
  onPcCategoryFilterChange: (category: string) => void
  onPcProductFilterChange: (filter: string) => void
  onHardwareCategoryFilterChange: (category: string) => void
  onHardwareProductFilterChange: (filter: string) => void
  onProductToggle: (item: QuoteOption) => void
  isReadOnly: boolean
}

export type QuoteSummaryPanelProps = {
  selection: SelectionMap
  priceOverrides: Record<string, number>
  quantities: Record<string, number>
  currency: string
  taxRate: number
  limitByStock: boolean
  tab: QuoteCategoryKey
  sectionChips: Array<{ id: string; label: string; count: number }>
  onPriceChange: (itemId: number, price: number) => void
  onQuantityChange: (itemId: number, quantity: number) => void
  onRemoveItem: (item: QuoteOption) => void
  isReadOnly: boolean
}

export type QuoteConfigurationPanelProps = {
  meta: Awaited<ReturnType<typeof getQuoteMeta>> | null
  marginRate: number
  validity: string
  currency: string
  conditions: string
  taxRate: number
  limitByStock: boolean
  showImagesInPdf: boolean
  hideSpecsInPdf: boolean
  showAdvancedConfig: boolean
  bankAccounts: BankAccount[]
  isSavingBankAccounts: boolean
  onValidityChange: (validity: string) => void
  onCurrencyChange: (currency: string) => void
  onConditionsChange: (conditions: string) => void
  onTaxRateChange: (rate: number) => void
  onLimitByStockChange: (limit: boolean) => void
  onShowImagesInPdfChange: (show: boolean) => void
  onHideSpecsInPdfChange: (hide: boolean) => void
  onShowAdvancedConfigChange: (show: boolean) => void
  onBankAccountsChange: (accounts: BankAccount[]) => void
  onSaveBankAccounts: () => void
  isReadOnly: boolean
}

export type QuoteActionButtonsProps = {
  quoteNumber: string
  serverQuoteStatus: QuoteDetail["status"] | null
  hasProducts: boolean
  hasClient: boolean
  storeId: number | null
  isSavingDraft: boolean
  isIssuingQuote: boolean
  sendingWhatsApp: boolean
  onClear: () => void
  onSaveDraft: () => void
  onPreviewPdf: () => void
  onPrintPdf: () => void
  onSendWhatsApp: () => void
  onIssueQuote: () => void
  isReadOnly: boolean
}

export type QuoteBankAccountsSectionProps = {
  bankAccounts: BankAccount[]
  isSavingBankAccounts: boolean
  onChange: (accounts: BankAccount[]) => void
  onSave: () => void
  isReadOnly: boolean
}

// ============================================================================
// Constants
// ============================================================================

export const TAB_LABELS: Record<QuoteCategoryKey, string> = {
  pc: "PC",
  laptops: "Laptops",
  hardware: "Otros",
}

// ============================================================================
// Helper Functions
// ============================================================================

export function isQuantityEditable(item?: QuoteOption): boolean {
  if (!item) return false
  return item.componentType !== "service" && item.componentType !== "warranty"
}

export function isServiceOrWarranty(item?: QuoteOption): boolean {
  return item?.componentType === "service" || item?.componentType === "warranty"
}

export function getStockLimit(
  item?: QuoteOption,
  limitByStock?: boolean
): number | null {
  if (!limitByStock) return null
  if (!item) return null
  if (typeof item.stock !== "number") return null
  return item.stock > 0 ? item.stock : 0
}

export function normalizeFilterText(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase()
}
