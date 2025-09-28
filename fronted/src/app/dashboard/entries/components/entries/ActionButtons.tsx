// components/entries/ActionButtons.tsx
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "./ConfirmationDialog"
import { RefreshCcw } from "lucide-react"

interface ActionButtonsProps {
  setIsDialogOpen: (value: boolean) => void;
  isDialogOpen: boolean;
  onSubmit: () => void;
  form: any;
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
  isSubmitting: boolean; // Agregado aquí
  onCurrencyToggle: () => void;
  currency: 'USD' | 'PEN';
  isConvertingCurrency: boolean;
}

export function ActionButtons({
  setIsDialogOpen,
  isDialogOpen,
  onSubmit,
  form,
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
      <Button
        className="flex items-center gap-2"
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={isSubmitting}
        title="Abre la confirmación para registrar el ingreso de productos"
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

      <Button
        type="button"
        onClick={onCurrencyToggle}
        disabled={isSubmitting || isConvertingCurrency}
        className="flex items-center justify-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(59,130,246,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_35px_-15px_rgba(59,130,246,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        title="Convierte los montos entre soles y dólares"
      >
        <RefreshCcw
          className={`h-4 w-4 transition-transform duration-200 ${isConvertingCurrency ? 'animate-spin' : ''}`}
        />
        {isConvertingCurrency
          ? 'Convirtiendo...'
          : `Convertir a ${currency === 'PEN' ? 'USD' : 'PEN'}`}
      </Button>

      <Button
        type="button"
        onClick={() => {
          form.reset({
            name: "",
            description: "",
            price: 1,
            priceSell: 1,
            quantity: 1,
            category_name: "",
            provider_name: "",
            provider_adress: "",
            provider_documentNumber: "",
            store_name: "",
            store_adress: "",
            entry_description: "",
            ruc: "",
            fecha_emision_comprobante: "",
            comprobante: "",
            serie: "",
            nroCorrelativo: "",
            total_comprobante: "",
            tipo_moneda: "Soles (PEN)",
          });
          setSelectedProducts([]);
          setCurrentProduct(null);
          setQuantity(1);
          setValueProduct("");
          setValueProvider("");
          setValueStore("");
          const today = new Date();
          setSelectedDate(today);
          form.setValue("entry_date", today);
          setCurrency("PEN");
          form.setValue("tipo_moneda", "Soles (PEN)");
          setOpen(false);
          setOpenProvider(false);
          setPdfFile(null);
          setPdfGuiaFile(null);
        }}
        disabled={isSubmitting}
        title="Restablece todos los campos del formulario"
      >
        Limpiar
      </Button>

      <Button
        type="button"
        onClick={() => router.back()}
        disabled={isSubmitting}
        title="Regresa a la pantalla anterior sin guardar cambios"
      >
        Volver
      </Button>

      {/* Diálogo de confirmación */}
      <ConfirmationDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}