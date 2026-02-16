import { memo } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronUp } from "lucide-react"
import { QuoteBankAccountsSection } from "./quote-bank-accounts-section"
import type { QuoteConfigurationPanelProps } from "../types/quote-types"

export const QuoteConfigurationPanel = memo(function QuoteConfigurationPanel({
  meta,
  marginRate,
  validity,
  currency,
  conditions,
  taxRate,
  limitByStock,
  showImagesInPdf,
  hideSpecsInPdf,
  showAdvancedConfig,
  bankAccounts,
  isSavingBankAccounts,
  onValidityChange,
  onCurrencyChange,
  onConditionsChange,
  onTaxRateChange,
  onLimitByStockChange,
  onShowImagesInPdfChange,
  onHideSpecsInPdfChange,
  onShowAdvancedConfigChange,
  onBankAccountsChange,
  onSaveBankAccounts,
  isReadOnly,
}: QuoteConfigurationPanelProps) {
  return (
    <Collapsible>
      <Card className="border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-slate-900 dark:text-slate-100">
                Configuración
              </CardTitle>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform [[data-state=open]>&]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {meta && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200/60 bg-slate-50/70 p-2.5 dark:border-slate-800/60 dark:bg-slate-900">
                <Image
                  src={meta.company.logoUrl}
                  alt={meta.company.name}
                  width={32}
                  height={32}
                />
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {meta.company.name}
                  </p>
                  <p>{meta.company.phone}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Validez
                </label>
                <Input
                  value={validity}
                  onChange={(e) => onValidityChange(e.target.value)}
                  className="h-8 text-sm"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Moneda
                </label>
                <Input
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="h-8 text-sm"
                  disabled={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Condiciones
              </label>
              <Textarea
                value={conditions}
                onChange={(e) => onConditionsChange(e.target.value)}
                rows={2}
                className="text-sm"
                disabled={isReadOnly}
              />
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onShowAdvancedConfigChange(!showAdvancedConfig)}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800/70 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <span>Avanzado</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {showAdvancedConfig ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>
            )}

            {showAdvancedConfig && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Margen %
                    </label>
                    <div className="flex h-8 items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {Math.round(marginRate * 100)}%
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Impuesto
                    </label>
                    <Input
                      type="number"
                      value={Math.round(taxRate * 100)}
                      disabled
                      readOnly
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/80 p-2.5 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                    <input
                      id="limit-by-stock"
                      type="checkbox"
                      checked={limitByStock}
                      onChange={(e) => onLimitByStockChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="limit-by-stock" className="cursor-pointer text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Limitar por stock
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/80 p-2.5 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                    <input
                      id="show-images-in-pdf"
                      type="checkbox"
                      checked={showImagesInPdf}
                      onChange={(e) => onShowImagesInPdfChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="show-images-in-pdf" className="cursor-pointer text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Mostrar imágenes en PDF
                      </span>
                    </label>
                  </div>

                  <div className="flex items-start gap-2 rounded-lg border border-slate-200/70 bg-white/80 p-2.5 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-300">
                    <input
                      id="hide-specs-in-pdf"
                      type="checkbox"
                      checked={hideSpecsInPdf}
                      onChange={(e) => onHideSpecsInPdfChange(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor="hide-specs-in-pdf" className="cursor-pointer text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        Ocultar características
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <QuoteBankAccountsSection
              bankAccounts={bankAccounts}
              isSavingBankAccounts={isSavingBankAccounts}
              onChange={onBankAccountsChange}
              onSave={onSaveBankAccounts}
              isReadOnly={isReadOnly}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
})
