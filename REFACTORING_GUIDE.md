# Quote Page Refactoring Guide

This document provides the complete refactoring for `fronted/src/app/dashboard/quotes/page.tsx` to use the extracted components.

## Overview

The following JSX sections need to be replaced with component calls:

1. **Action Buttons** (lines ~1285-1383)
2. **Product Catalog** (lines ~1390-1728)
3. **Client Section in Aside** (lines ~1732-1835)
4. **Configuration Panel in Aside** (lines ~1838-2014)
5. **Summary Panel in Aside** (lines ~2017-2158)

## 1. Action Buttons Replacement

### Find (lines ~1285-1383):
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" ... >
    ...
  </Button>
  ...
  <DropdownMenu>
    ...
  </DropdownMenu>
</div>
```

### Replace with:
```tsx
<QuoteActionButtons
  quoteNumber={quoteNumber}
  serverQuoteStatus={serverQuoteStatus}
  hasProducts={Object.values(selection).flat().length > 0}
  hasClient={clientName.trim().length > 0}
  storeId={storeId}
  isSavingDraft={isSavingDraft}
  isIssuingQuote={isIssuingQuote}
  sendingWhatsApp={sendingWhatsApp}
  onClear={() => {
    if (Object.keys(selection).some((key) => selection[key]?.length > 0)) {
      setShowClearDialog(true);
    }
  }}
  onSaveDraft={handleSaveDraft}
  onPreviewPdf={openPdfPreview}
  onPrintPdf={openPdfPrint}
  onSendWhatsApp={handleSendWhatsApp}
  onIssueQuote={handleIssueQuote}
  isReadOnly={isReadOnlyQuote}
/>
```

## 2. Product Catalog Replacement

### Find (lines ~1390-1728):
The large `<Card>` section containing Tabs with product listings.

### Replace with:
```tsx
<QuoteProductCatalog
  tab={tab}
  catalog={catalog}
  selection={selection}
  pcCategoryFilter={pcCategoryFilter}
  pcProductFilter={pcProductFilter}
  hardwareCategoryFilter={hardwareCategoryFilter}
  hardwareProductFilter={hardwareProductFilter}
  deferredPcFilter={deferredPcFilter}
  deferredHwFilter={deferredHwFilter}
  limitByStock={limitByStock}
  onTabChange={(value) => setTab(value)}
  onPcCategoryFilterChange={setPcCategoryFilter}
  onPcProductFilterChange={setPcProductFilter}
  onHardwareCategoryFilterChange={setHardwareCategoryFilter}
  onHardwareProductFilterChange={setHardwareProductFilter}
  onProductToggle={handleProductToggle}
  isReadOnly={isReadOnlyQuote}
/>
```

## 3. Client Section Replacement

### Find (lines ~1732-1835):
The `<Collapsible>` with client selection.

###Replace with:
```tsx
<QuoteContextBar
  storeId={storeId}
  stores={stores}
  clients={clients}
  clientName={clientName}
  contactName={contactName}
  whatsAppPhone={whatsAppPhone}
  clientDocType={clientDocType}
  clientDocNumber={clientDocNumber}
  clientOpen={clientOpen}
  onStoreChange={setStoreId}
  onClientSelect={handleClientSelect}
  onClientOpenChange={setClientOpen}
  onClientNameChange={setClientName}
  onContactNameChange={setContactName}
  onWhatsAppPhoneChange={setWhatsAppPhone}
  onClientDocTypeChange={setClientDocType}
  onClientDocNumberChange={setClientDocNumber}
  onNewClientClick={() => setShowNewClientDialog(true)}
  isReadOnly={isReadOnlyQuote}
/>
```

## 4. Configuration Panel Replacement

### Find (lines ~1838-2014):
The `<Collapsible>` with configuration settings.

### Replace with:
```tsx
<QuoteConfigurationPanel
  meta={meta}
  marginRate={marginRate}
  validity={validity}
  currency={currency}
  conditions={conditions}
  taxRate={taxRate}
  limitByStock={limitByStock}
  showImagesInPdf={showImagesInPdf}
  hideSpecsInPdf={hideSpecsInPdf}
  showAdvancedConfig={showAdvancedConfig}
  bankAccounts={bankAccounts}
  isSavingBankAccounts={isSavingBankAccounts}
  onValidityChange={setValidity}
  onCurrencyChange={setCurrency}
  onConditionsChange={setConditions}
  onTaxRateChange={setTaxRate}
  onLimitByStockChange={setLimitByStock}
  onShowImagesInPdfChange={setShowImagesInPdf}
  onHideSpecsInPdfChange={setHideSpecsInPdf}
  onShowAdvancedConfigChange={setShowAdvancedConfig}
  onBankAccountsChange={setBankAccounts}
  onSaveBankAccounts={() => handleSaveBankAccounts(bankAccounts)}
  isReadOnly={isReadOnlyQuote}
/>
```

## 5. Summary Panel Replacement

### Find (lines ~2017-2158):
The `<Card>` with summary items and totals footer.

### Replace with:
```tsx
<QuoteSummaryPanel
  selection={selection}
  priceOverrides={priceOverrides}
  quantities={quantities}
  currency={currency}
  taxRate={taxRate}
  limitByStock={limitByStock}
  tab={tab}
  sectionChips={sectionChips}
  onPriceChange={handlePriceChange}
  onQuantityChange={handleQuantityChange}
  onRemoveItem={handleRemoveItem}
  isReadOnly={isReadOnlyQuote}
/>
```

## Additional Notes

### Store Selector
The store selector in the header (lines ~1259-1283) should be moved into `QuoteContextBar`. It's currently part of the header but logically belongs with the client selection context.

### Handlers Already Defined
All handlers are already defined in the main page.tsx:
- `handleClientSelect` (line ~1117)
- `handleProductToggle` (line ~1126)
- `handleRemoveItem` (line ~1167)
- `handlePriceChange` (line ~1191)
- `handleQuantityChange` (line ~1195)
- `handleSaveBankAccounts` (line ~304)

### Important
- Keep ALL business logic, handlers, state, and effects in the main page.tsx
- Only replace JSX rendering with component calls
- All functionality must be preserved exactly as-is
