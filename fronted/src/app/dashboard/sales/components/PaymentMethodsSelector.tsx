import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { getPaymentMethods } from "../sales.api";
import { X, Banknote, Landmark } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner"; // Asegúrate de importar sonner
import { BrandLogo } from "@/components/BrandLogo";

type SelectedPayment = {
  paymentMethodId: number | null;
  amount: number;
  currency: string;
};

type TempPayment = SelectedPayment & {
  uid: string;
};

type PaymentMethod = {
  id: number;
  name: string;
};

export function PaymentMethodsModal({
  value,
  onChange,
  selectedProducts,
  forceOpen, // <-- NUEVO
}: {
  value: SelectedPayment[];
  onChange: (payments: SelectedPayment[]) => void;
  selectedProducts: { id: number; name: string; price: number; quantity: number }[];
  forceOpen?: boolean; // <-- NUEVO (opcional)
}) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tempPayments, setTempPayments] = useState<TempPayment[]>([]); // <-- Ahora manejamos pagos temporales
  const [open, setOpen] = useState(false);

  const generateUid = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const defaultPaymentMethods: PaymentMethod[] = [
    { id: -1, name: "EN EFECTIVO" },
    { id: -2, name: "TRANSFERENCIA" },
    { id: -3, name: "PAGO CON VISA" },
    { id: -4, name: "YAPE" },
    { id: -5, name: "PLIN" },
    { id: -6, name: "OTRO MEDIO DE PAGO" },
  ];

  // Escuchar cambios en forceOpen
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  useEffect(() => {
    async function fetchMethods() {
      const methodsFromBackend = await getPaymentMethods();
  
      // Unir los métodos por nombre ÚNICO
      const combined = [...defaultPaymentMethods, ...methodsFromBackend];
  
      // Crear un objeto para eliminar duplicados por "name"
      const uniqueMethodsMap = new Map<string, PaymentMethod>();
  
      for (const method of combined) {
        if (!uniqueMethodsMap.has(method.name)) {
          uniqueMethodsMap.set(method.name, method);
        }
      }
  
      const uniqueMethods = Array.from(uniqueMethodsMap.values());
  
      setPaymentMethods(uniqueMethods);
    }
    fetchMethods();
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTempPayments(
        value.map((payment) => ({
          ...payment,
          uid: generateUid(),
        })),
      ); // Cuando abres, copia lo que había
    }
  };

  const handleAddPayment = () => {
    setTempPayments((prev) => {
      if (prev.length >= 3) {
        toast.warning("Solo se pueden agregar hasta 3 métodos de pago.");
        return prev;
      }

      const newPayments = [...prev];
      const firstPaymentMethod = paymentMethods[0]; // <-- El primer método disponible

      if (newPayments.length === 0) {
        const total = selectedProducts.reduce((sum, product) => {
          const subtotal = (product.price || 0) * (product.quantity || 0);
          return sum + subtotal;
        }, 0);

        newPayments.push({
          uid: generateUid(),
          paymentMethodId: firstPaymentMethod ? firstPaymentMethod.id : null, // Asignamos automáticamente
          amount: Number(total.toFixed(2)),
          currency: "PEN",
        });
      } else {
        newPayments.push({
          uid: generateUid(),
          paymentMethodId: firstPaymentMethod ? firstPaymentMethod.id : null, // También en los siguientes
          amount: 0,
          currency: "PEN",
        });
      }

      return newPayments;
    });
  };

  const handleUpdatePayment = <K extends keyof SelectedPayment>(
    index: number,
    field: K,
    value: SelectedPayment[K]
  ) => {
    const updated = [...tempPayments];
    updated[index] = { ...updated[index], [field]: value };
    setTempPayments(updated);
  };

  const handleRemovePayment = (index: number) => {
    setTempPayments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = () => {
    onChange(tempPayments.map(({ uid, ...payment }) => payment)); // Ahora sí guarda en el componente padre
    setOpen(false);
    toast.success("Los métodos han sido guardados correctamente"); // Mostrar toast
  };

  const getIcon = (name: string) => {
    if (name.includes("EFECTIVO")) return <Banknote className="w-4 h-4 mr-2" />;
    if (name.includes("TRANSFERENCIA")) return <Landmark className="w-4 h-4 mr-2" />;
    if (name.includes("VISA"))
      return (
        <BrandLogo src="/icons/visa.png" alt="Visa" className="w-4 h-4 mr-2" />
      );
    if (name.includes("YAPE"))
      return (
        <BrandLogo src="/icons/yape.png" alt="Yape" className="w-4 h-4 mr-2" />
      );
    if (name.includes("PLIN"))
      return (
        <BrandLogo src="/icons/plin.png" alt="Plin" className="w-4 h-4 mr-2" />
      );
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
          Métodos de Pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecciona Métodos de Pago</DialogTitle>
          <DialogDescription>
            No se olvide guardar los métodos de pago agregados...
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
            <AnimatePresence initial={false} mode="sync">
              {tempPayments.map((payment, index) => (
                <motion.div
                  key={payment.uid}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex flex-col sm:flex-row gap-2 sm:items-center"
                >
                  {/* --- SOLO PARA PANTALLAS PEQUEÑAS --- */}
                  <div className="flex sm:hidden gap-2">
                    <Select
                      value={payment.paymentMethodId !== null ? payment.paymentMethodId.toString() : ""}
                      onValueChange={(value:any) => handleUpdatePayment(index, "paymentMethodId", Number(value))}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.id.toString()}>
                            <div className="flex items-center">
                              {getIcon(method.name)}
                              {method.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <input
                      type="number"
                      placeholder="Monto"
                      step="0.01"
                      min={0.0}
                      max={99999999.99}
                      value={payment.amount === 0 ? "" : payment.amount.toString()}
                      onChange={(e) => {
                        const val = e.target.value;
                        const parsed = parseFloat(val);
                        handleUpdatePayment(index, "amount", val === "" || isNaN(parsed) ? 0 : parsed);
                      }}
                      className="border rounded px-2 py-1 w-[100px]"
                    />
                    </div>

                    {/* --- SOLO PARA PANTALLAS MEDIANAS EN ADELANTE --- */}
                    <div className="hidden sm:flex gap-2 items-center">
                      <Select
                        value={payment.paymentMethodId !== null ? payment.paymentMethodId.toString() : ""}
                        onValueChange={(value:any) => handleUpdatePayment(index, "paymentMethodId", Number(value))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id.toString()}>
                              <div className="flex items-center">
                                {getIcon(method.name)}
                                {method.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <input
                        type="number"
                        placeholder="Monto"
                        step="0.01"
                        min={0.0}
                        max={99999999.99}
                        value={payment.amount === 0 ? "" : payment.amount.toString()}
                        onChange={(e) => {
                          const val = e.target.value;
                          const parsed = parseFloat(val);
                          handleUpdatePayment(index, "amount", val === "" || isNaN(parsed) ? 0 : parsed);
                        }}
                        className="border rounded px-2 py-1 w-[100px]"
                      />
                      </div>

                {/* Común para todas las pantallas */}
                  <Select
                    value={payment.currency ?? ""}
                    onValueChange={(value:any) => handleUpdatePayment(index, "currency", value)}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEN">PEN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePayment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <Button variant="outline" onClick={handleAddPayment} className="mt-2">
            + Agregar Método de Pago
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Guardar Métodos</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
