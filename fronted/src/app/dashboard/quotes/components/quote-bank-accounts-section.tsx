import { memo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Landmark, Plus, X } from "lucide-react"
import type { BankAccount } from "../quotes.api"
import type { QuoteBankAccountsSectionProps } from "../types/quote-types"

export const QuoteBankAccountsSection = memo(function QuoteBankAccountsSection({
  bankAccounts,
  isSavingBankAccounts,
  onChange,
  onSave,
  isReadOnly,
}: QuoteBankAccountsSectionProps) {
  const handleAddAccount = () => {
    onChange([
      ...bankAccounts,
      { bankName: "", accountHolderName: "", accountNumber: "", cci: "" },
    ])
  }

  const handleRemoveAccount = (index: number) => {
    onChange(bankAccounts.filter((_, i) => i !== index))
  }

  const handleAccountChange = (
    index: number,
    field: keyof BankAccount,
    value: string
  ) => {
    onChange(
      bankAccounts.map((account, i) =>
        i === index ? { ...account, [field]: value } : account
      )
    )
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Landmark className="mr-1 inline h-3.5 w-3.5" />
          Cuentas bancarias
        </label>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddAccount}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Agregar cuenta"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {bankAccounts.map((account, idx) => (
        <div
          key={idx}
          className="group relative space-y-1 rounded-lg border border-slate-200/70 bg-white/80 p-2 transition-all duration-200 dark:border-slate-800 dark:bg-slate-950/40"
        >
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => handleRemoveAccount(idx)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-rose-100 text-rose-600 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-rose-900/40 dark:text-rose-300"
              aria-label="Eliminar cuenta"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <Input
            value={account.bankName}
            onChange={(e) => handleAccountChange(idx, "bankName", e.target.value)}
            placeholder="Banco (ej. BCP, BBVA)"
            className="h-7 text-xs"
            disabled={isReadOnly}
          />

          <Input
            value={account.accountHolderName || ""}
            onChange={(e) =>
              handleAccountChange(idx, "accountHolderName", e.target.value)
            }
            placeholder="Titular de la cuenta"
            className="h-7 text-xs"
            disabled={isReadOnly}
          />

          <Input
            value={account.accountNumber}
            onChange={(e) =>
              handleAccountChange(idx, "accountNumber", e.target.value)
            }
            placeholder="N° de cuenta"
            className="h-7 text-xs"
            disabled={isReadOnly}
          />

          <Input
            value={account.cci ?? ""}
            onChange={(e) => handleAccountChange(idx, "cci", e.target.value)}
            placeholder="CCI (opcional)"
            className="h-7 text-xs"
            disabled={isReadOnly}
          />
        </div>
      ))}

      {bankAccounts.length > 0 && !isReadOnly && (
        <Button
          variant="outline"
          size="sm"
          className="w-full cursor-pointer text-xs"
          onClick={onSave}
          disabled={isSavingBankAccounts}
        >
          {isSavingBankAccounts ? "Guardando..." : "Guardar cuentas"}
        </Button>
      )}
    </div>
  )
})
