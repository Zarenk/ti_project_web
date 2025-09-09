// components/entries/ActionButtons.tsx
import { Button } from "@/components/ui/button"
import { ConfirmationDialog } from "./ConfirmationDialog"

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
}: ActionButtonsProps) {

  return (
    <>
      <Button
        className="mt-4 flex items-center gap-2"
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
      >
        Limpiar
      </Button>

      <Button type="button" onClick={() => router.back()} disabled={isSubmitting}>
        Volver
      </Button>

      {/* Diálogo de confirmación */}
      <ConfirmationDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
}