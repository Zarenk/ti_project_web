// components/entries/ActionButtons.tsx
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "./ConfirmationDialog"
import { RefreshCcw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ActionButtonsProps {
  setIsDialogOpen: (value: boolean) => void;
  isDialogOpen: boolean;
  onSubmit: () => void;
  form: any;
  onClear: () => void;
  setSelectedProducts: Function;
  setCurrentProduct: Function;
  setQuantity: Function;
  setValueProduct: Function;
  setValueProvider: Function;
  setValueStore: Function;
  setSelectedDate: Function;
  setCurrency: Function;
  setOpen: Function;
  setOpenProvider: Function;
  setPdfFile: Function;
  setPdfGuiaFile: Function;
  router: any;
  isSubmitting: boolean;
  onCurrencyToggle: () => void;
  currency: 'USD' | 'PEN';
  isConvertingCurrency: boolean;
}

export function ActionButtons({
  setIsDialogOpen,
  isDialogOpen,
  onSubmit,
  form,
  onClear,
  setSelectedProducts,
  setCurrentProduct,
  setQuantity,
  setValueProduct,
  setValueProvider,
  setValueStore,
  setSelectedDate,
  setCurrency,
  setOpen,
  setOpenProvider,
  setPdfFile,
  setPdfGuiaFile,
  router,
  isSubmitting,
  onCurrencyToggle,
  currency,
  isConvertingCurrency,
}: ActionButtonsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex cursor-pointer items-center gap-2 transition-colors hover:border-border hover:bg-accent hover:text-foreground"
            type="button"
            onClick={() => setIsDialogOpen(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Procesando...
              </>
            ) : (
              "Crear Ingreso de Productos"
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Abre la confirmaciÃ³n para registrar el ingreso.</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onCurrencyToggle}
            disabled={isSubmitting || isConvertingCurrency}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(59,130,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_20px_35px_-15px_rgba(59,130,246,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw
              className={`h-4 w-4 transition-transform duration-200 ${isConvertingCurrency ? "animate-spin" : ""}`}
            />
            {isConvertingCurrency
              ? "Convirtiendo..."
              : `Convertir a ${currency === "PEN" ? "USD" : "PEN"}`}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Convierte los montos entre soles y dÃ³lares.</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={onClear}
            disabled={isSubmitting}
            className="cursor-pointer transition-colors hover:border-border hover:bg-accent hover:text-foreground"
          >
            Limpiar
          </Button>
        </TooltipTrigger>
        <TooltipContent>Restablece todos los campos del formulario.</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="cursor-pointer transition-colors hover:border-border hover:bg-accent hover:text-foreground"
          >
            Volver
          </Button>
        </TooltipTrigger>
        <TooltipContent>Regresa a la pantalla anterior sin guardar cambios.</TooltipContent>
      </Tooltip>

      <ConfirmationDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

