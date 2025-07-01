"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Banknote, Landmark } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getPaymentMethods } from "@/app/dashboard/sales/sales.api";
import { toast } from "sonner";

type PaymentMethod = {
  id: number;
  name: string;
};

type SelectedPayment = {
  method: string; // Para la transacción independiente no usamos ID sino nombre
  amount: number;
};

interface PaymentMethodsSelectorProps {
  value: SelectedPayment[];
  onChange: (payments: SelectedPayment[]) => void;
}

export function PaymentMethodsSelector({ value, onChange }: PaymentMethodsSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tempPayments, setTempPayments] = useState<SelectedPayment[]>([]);

  const defaultPaymentMethods: PaymentMethod[] = [
    { id: -1, name: "EN EFECTIVO" },
    { id: -2, name: "TRANSFERENCIA" },
    { id: -3, name: "PAGO CON VISA" },
    { id: -4, name: "YAPE" },
    { id: -5, name: "PLIN" },
    { id: -6, name: "OTRO MEDIO DE PAGO" },
  ];

  useEffect(() => {
    async function fetchMethods() {
      const methodsFromBackend = await getPaymentMethods();
      const combined = [...defaultPaymentMethods, ...methodsFromBackend];

      const uniqueMethodsMap = new Map<string, PaymentMethod>();
      for (const method of combined) {
        if (!uniqueMethodsMap.has(method.name)) {
          uniqueMethodsMap.set(method.name, method);
        }
      }
      setPaymentMethods(Array.from(uniqueMethodsMap.values()));
    }
    fetchMethods();
  }, []);

  useEffect(() => {
    setTempPayments(value);
  }, [value]);

  const handleAddPayment = () => {
    if (paymentMethods.length === 0) return;
  
    if (tempPayments.length >= 3) {
      toast.error("Ya no puedes agregar más de 3 métodos de pago.");
      return;
    }
  
    const isFirstPayment = tempPayments.length === 0;
    const formAmount = Number(document.querySelector<HTMLInputElement>('input[name="amount"]')?.value || 0);
  
    const newPayments = [
      ...tempPayments,
      {
        method: paymentMethods[0].name || "EFECTIVO",
        amount: isFirstPayment ? formAmount : 0, // 👈 Seteamos el primer monto
      },
    ];
  
    setTempPayments(newPayments);
    onChange(newPayments); // 👈 🔥 Esto actualiza inmediatamente en el padre también
  };

  const handleUpdatePayment = (index: number, field: keyof SelectedPayment, val: any) => {
    const updated = [...tempPayments];
    updated[index] = {
      ...updated[index],
      [field]: val, // Aseguramos que el campo sea dinámico y válido
    } as SelectedPayment; // Type assertion para garantizar el tipo
    setTempPayments(updated);
    onChange(updated);
  };

  const handleRemovePayment = (index: number) => {
    const updated = [...tempPayments];
    updated.splice(index, 1);
    setTempPayments(updated);
    onChange(updated);
  };

  const getIcon = (method: string) => {
    if (method.includes("EN EFECTIVO")) return <Banknote className="w-4 h-4 mr-1" />;
    if (method.includes("TRANSFERENCIA")) return <Landmark className="w-4 h-4 mr-1" />;
    if (method.includes("PAGO CON VISA")) return <img src="/icons/visa.png" alt="Visa" className="w-4 h-4 mr-1" />;
    if (method.includes("YAPE")) return <img src="/icons/yape.png" alt="Yape" className="w-4 h-4 mr-1" />;
    if (method.includes("PLIN")) return <img src="/icons/plin.png" alt="Plin" className="w-4 h-4 mr-1" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {tempPayments.map((payment, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: 20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <Select
              value={payment.method}
              onValueChange={(val) => handleUpdatePayment(index, "method", val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.name} value={method.name}>
                    <div className="flex items-center">
                      {getIcon(method.name)}
                      {method.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
                type="number"
                placeholder="Monto"
                value={payment.amount ?? 0}
                step="0.01"
                min="0"
                onChange={(e) =>
                    handleUpdatePayment(
                    index,
                    "amount",
                    e.target.value === "" ? 0 : Number(e.target.value)
                    )
                }
                className="w-[100px]"
            />

            <Button
              type="button"
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

      <Button type="button" variant="outline" onClick={handleAddPayment} className="w-full">
        + Agregar método de pago
      </Button>
    </div>
  );
}