import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPaymentMethods } from "../sales.api";
import { X, Banknote, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";

type SelectedPayment = {
  paymentMethodId: number | null;
  amount: number;
  currency: string;
};

type TempPayment = SelectedPayment & { uid: string; };
type PaymentMethod = { id: number; name: string; };

export function PaymentMethodsModal({
  value,
  onChange,
  selectedProducts,
  forceOpen,
}: {
  value: SelectedPayment[];
  onChange: (payments: SelectedPayment[]) => void;
  selectedProducts: { id: number; name: string; price: number; quantity: number }[];
  forceOpen?: boolean;
}) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tempPayments, setTempPayments] = useState<TempPayment[]>([]);
  const [open, setOpen] = useState(false);

  // refs
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastAddedUidRef = useRef<string | null>(null);

  const generateUid = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
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

  // Abrir forzado
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  // Cargar métodos y unificar por nombre
  useEffect(() => {
    (async () => {
      try {
        const methodsFromBackend = (await getPaymentMethods()) ?? [];
        const combined = [...defaultPaymentMethods, ...methodsFromBackend];
        const unique = Array.from(
          new Map(combined.map(m => [m.name, m])).values()
        );
        setPaymentMethods(unique);
      } catch {
        setPaymentMethods(defaultPaymentMethods);
        toast.error("No se pudieron cargar los métodos de pago. Usando lista local.");
      }
    })();
  }, []);

  // Copiar valor existente al abrir
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setTempPayments((value ?? []).map(p => ({ ...p, uid: generateUid() })));
    }
  };

  // Auto-scroll al ítem recién agregado
  useEffect(() => {
  const uid = lastAddedUidRef.current;
  if (!uid) return;

  const list = listRef.current;
  const el = itemRefs.current[uid];

  const run = () => {
    if (!list || !el) return;
    // Solo si la lista realmente desborda
    const hasOverflow = list.scrollHeight > list.clientHeight + 2;
    if (hasOverflow) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    lastAddedUidRef.current = null;
  };

  // Espera un frame para que Framer/DOM asienten el layout del nuevo ítem
  const id = requestAnimationFrame(() => {
    // micro-delay por si hay imágenes/logos o Selects montando
    setTimeout(run, 0);
  });

  return () => cancelAnimationFrame(id);
  }, [tempPayments.length]);

  const totalProductos = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + (p.price || 0) * (p.quantity || 0), 0),
    [selectedProducts]
  );

  const handleAddPayment = () => {
    setTempPayments(prev => {
      if (prev.length >= 3) {
        toast.warning("Solo se pueden agregar hasta 3 métodos de pago.");
        return prev;
      }
      if (!paymentMethods.length) {
        toast.info("Cargando métodos de pago… intenta nuevamente en un momento.");
        return prev;
      }

      const first = paymentMethods[0];
      const uid = generateUid();
      lastAddedUidRef.current = uid;

      const next: TempPayment = prev.length === 0
        ? {
            uid,
            paymentMethodId: first?.id ?? null,
            amount: Number(totalProductos.toFixed(2)),
            currency: "PEN",
          }
        : {
            uid,
            paymentMethodId: first?.id ?? null,
            amount: 0,
            currency: "PEN",
          };

      return [...prev, next];
    });
  };

  const handleUpdatePayment = <K extends keyof SelectedPayment>(index: number, field: K, val: SelectedPayment[K]) => {
    setTempPayments(prev => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: val };
      return clone;
    });
  };

  const handleRemovePayment = (index: number) => {
    setTempPayments(prev => {
      const uid = prev[index]?.uid;
      if (uid) delete itemRefs.current[uid];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = () => {
    const hasInvalidAmount = tempPayments.some(payment => !payment.amount || payment.amount <= 0);
    if (tempPayments.length > 0 && hasInvalidAmount) {
      toast.error("Debe agregar un monto o eliminar el método de pago.");
      return;
    }
    onChange(tempPayments.map(({ uid, ...p }) => p));
    setOpen(false);
    toast.success("Los métodos han sido guardados correctamente");
  };

  const getIcon = (name: string) => {
    if (name.includes("EFECTIVO")) return <Banknote className="w-4 h-4 mr-2" />;
    if (name.includes("TRANSFERENCIA")) return <Landmark className="w-4 h-4 mr-2" />;
    if (name.includes("VISA")) return <BrandLogo src="/icons/visa.png" alt="Visa" className="w-4 h-4 mr-2" />;
    if (name.includes("YAPE")) return <BrandLogo src="/icons/yape.png" alt="Yape" className="w-4 h-4 mr-2" />;
    if (name.includes("PLIN")) return <BrandLogo src="/icons/plin.png" alt="Plin" className="w-4 h-4 mr-2" />;
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
          <DialogDescription>No se olvide guardar los métodos de pago agregados…</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            ref={listRef}
            className="space-y-2 max-h-[55vh] overflow-y-auto pr-2 pb-16"
          >
            {tempPayments.map((payment, index) => (
              <motion.div
                key={payment.uid}
                ref={(el) => { itemRefs.current[payment.uid] = el; }}
                layout
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="min-h-[44px] rounded-md"
              >
                {/* Layout ÚNICO y responsivo (sin duplicar árbol) */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
                  <Select
                    value={payment.paymentMethodId !== null ? String(payment.paymentMethodId) : ""}
                    onValueChange={(val: string) => handleUpdatePayment(index, "paymentMethodId", Number(val))}
                  >
                    <SelectTrigger className="w-[160px] sm:w-[200px]">
                      <SelectValue placeholder="Método" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={String(method.id)}>
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
                    min={0}
                    max={99999999.99}
                    value={payment.amount === 0 ? "" : String(payment.amount)}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parsed = parseFloat(val);
                      handleUpdatePayment(index, "amount", val === "" || Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    className="border rounded px-2 py-1 w-[110px]"
                  />

                  <Select
                    value={payment.currency ?? ""}
                    onValueChange={(val: string) => handleUpdatePayment(index, "currency", val)}
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
                    className="text-red-500 hover:text-red-700 ml-auto"
                    title="Quitar método"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleAddPayment}
            className="mt-2"
            disabled={tempPayments.length >= 3 || paymentMethods.length === 0}
            title={
              paymentMethods.length === 0
                ? "Cargando métodos de pago…"
                : tempPayments.length >= 3
                ? "Máximo 3 métodos"
                : ""
            }
          >
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