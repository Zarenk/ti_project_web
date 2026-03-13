// components/entries/ActionButtons.tsx
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "./ConfirmationDialog"
import { RefreshCcw, Save, PackagePlus, Eraser, ArrowLeft, CheckCircle } from "lucide-react"
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
  isDraftEdit?: boolean;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
}

const SpinnerIcon = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)

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
  isDraftEdit,
  onSaveDraft,
  isSavingDraft,
}: ActionButtonsProps) {
  return (
    <>
      {/* ── Mobile: fixed bottom bar with icons above text ── */}
      <div className="h-14 sm:hidden" /> {/* Spacer so content isn't hidden behind fixed bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t bg-background/95 backdrop-blur sm:hidden">
        {/* Create / Confirm */}
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          disabled={isSubmitting || isSavingDraft}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 text-primary transition-colors disabled:opacity-50"
        >
          {isSubmitting ? <SpinnerIcon /> : isDraftEdit ? <CheckCircle className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
          <span className="text-[10px] font-medium leading-tight">
            {isSubmitting ? "..." : isDraftEdit ? "Confirmar" : "Crear"}
          </span>
        </button>

        {/* Save Draft */}
        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSubmitting || isSavingDraft}
            className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 text-amber-600 transition-colors dark:text-amber-400 disabled:opacity-50"
          >
            {isSavingDraft ? <SpinnerIcon /> : <Save className="h-4 w-4" />}
            <span className="text-[10px] font-medium leading-tight">
              {isSavingDraft ? "..." : "Borrador"}
            </span>
          </button>
        )}

        {/* Currency toggle */}
        <button
          type="button"
          onClick={onCurrencyToggle}
          disabled={isSubmitting || isConvertingCurrency}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 text-blue-500 transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${isConvertingCurrency ? "animate-spin" : ""}`} />
          <span className="text-[10px] font-medium leading-tight">
            {currency === "PEN" ? "USD" : "PEN"}
          </span>
        </button>

        {/* Clear */}
        <button
          type="button"
          onClick={onClear}
          disabled={isSubmitting}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground transition-colors disabled:opacity-50"
        >
          <Eraser className="h-4 w-4" />
          <span className="text-[10px] font-medium leading-tight">Limpiar</span>
        </button>

        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[10px] font-medium leading-tight">Volver</span>
        </button>
      </div>

      {/* ── Desktop: original horizontal layout ── */}
      <div className="mt-4 hidden flex-row flex-wrap items-center justify-end gap-2 sm:flex">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="cursor-pointer gap-2 transition-colors hover:border-border hover:bg-accent hover:text-foreground"
              type="button"
              onClick={() => setIsDialogOpen(true)}
              disabled={isSubmitting || isSavingDraft}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Procesando...
                </>
              ) : (
                isDraftEdit ? "Confirmar y Registrar" : "Crear Ingreso de Productos"
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDraftEdit
              ? 'Confirma el borrador y aplica los cambios al inventario.'
              : 'Abre la confirmacion para registrar el ingreso.'}
          </TooltipContent>
        </Tooltip>

        {onSaveDraft && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="cursor-pointer gap-2 border-amber-300 bg-amber-50 text-amber-800 transition-colors hover:bg-amber-100"
                type="button"
                variant="outline"
                onClick={onSaveDraft}
                disabled={isSubmitting || isSavingDraft}
              >
                {isSavingDraft ? (
                  <>
                    <SpinnerIcon />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isDraftEdit ? 'Actualizar Borrador' : 'Guardar Borrador'}
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isDraftEdit
                ? 'Actualiza el borrador sin afectar inventario.'
                : 'Guarda como borrador para revisar antes de confirmar.'}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={onCurrencyToggle}
              disabled={isSubmitting || isConvertingCurrency}
              className="cursor-pointer gap-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(59,130,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_20px_35px_-15px_rgba(59,130,246,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <RefreshCcw
                className={`h-4 w-4 transition-transform duration-200 ${isConvertingCurrency ? "animate-spin" : ""}`}
              />
              {isConvertingCurrency
                ? "Convirtiendo..."
                : `Convertir a ${currency === "PEN" ? "USD" : "PEN"}`}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Convierte los montos entre soles y dolares.</TooltipContent>
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
      </div>

      <ConfirmationDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  )
}
