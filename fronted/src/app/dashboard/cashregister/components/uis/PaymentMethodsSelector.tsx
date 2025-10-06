"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Banknote, Landmark } from "lucide-react";
import { getPaymentMethods } from "@/app/dashboard/sales/sales.api";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";

type PaymentMethod = {
  id: number;
  name: string;
};

type SelectedPayment = {
  method: string; // Para la transacción independiente no usamos ID sino nombre
  amount: number;
};

type TempPayment = SelectedPayment & { uid: string };

interface PaymentMethodsSelectorProps {
  value: SelectedPayment[];
  onChange: (payments: SelectedPayment[]) => void;
}

const generateUid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const arePaymentsEqual = (current: TempPayment[], external: SelectedPayment[]) =>
  current.length === external.length &&
  current.every((payment, index) => {
    const ext = external[index];
    return ext && payment.method === ext.method && Number(payment.amount) === Number(ext.amount);
  });

export function PaymentMethodsSelector({ value, onChange }: PaymentMethodsSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tempPayments, setTempPayments] = useState<TempPayment[]>([]);

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

  // Reemplaza tu syncAndSetPayments para encapsular la mutación local
  const syncAndSetPayments = (updater: (prev: TempPayment[]) => TempPayment[]) => {
    setTempPayments(prev => {
      const next = updater(prev);
      return next;
    });
  };

  const handleAddPayment = () => {
    if (paymentMethods.length === 0) return;

    if (tempPayments.length >= 3) {
      toast.error("Ya no puedes agregar más de 3 métodos de pago.");
      return;
    }

    const isFirstPayment = tempPayments.length === 0;
    const formAmount = Number(document.querySelector<HTMLInputElement>('input[name="amount"]')?.value || 0);

    syncAndSetPayments((prev) => {
      const usedMethods = new Set(prev.map((payment) => payment.method));
      const availableMethod = paymentMethods.find((method) => !usedMethods.has(method.name));
      const selectedMethod = availableMethod ?? paymentMethods[0];

      if (!selectedMethod) {
        return prev;
      }

      const newPayments = [
        ...prev,
        {
          uid: generateUid(),
          method: selectedMethod.name,
          amount: isFirstPayment ? formAmount : 0, // Seteamos el primer monto
        },
      ];

      return newPayments;
    });
  };

  const handleUpdatePayment = (index: number, field: keyof SelectedPayment, val: any) => {
    syncAndSetPayments((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;

      const nextValue = field === "amount" ? (val === "" ? 0 : Number(val)) : val;

      if (current[field] === nextValue) {
        return prev;
      }

      updated[index] = {
        ...current,
        [field]: nextValue,
      } as TempPayment;

      return updated;
    });
  };

  const handleRemovePayment = (index: number) => {
    syncAndSetPayments((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const getIcon = (method: string) => {
    if (method.includes("EN EFECTIVO")) return <Banknote className="w-4 h-4 mr-1" />;
    if (method.includes("TRANSFERENCIA")) return <Landmark className="w-4 h-4 mr-1" />;
    if (method.includes("PAGO CON VISA"))
      return (
        <BrandLogo src="/icons/visa.png" alt="Visa" className="w-4 h-4 mr-1" />
      );
    if (method.includes("YAPE"))
      return (
        <BrandLogo src="/icons/yape.png" alt="Yape" className="w-4 h-4 mr-1" />
      );
    if (method.includes("PLIN"))
      return (
        <BrandLogo src="/icons/plin.png" alt="Plin" className="w-4 h-4 mr-1" />
      );
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Evita animación inicial de salida/entrada y mejora reordenado */}
      <AnimatePresence initial={false}>
        {tempPayments.map((payment, index) => (
          <motion.div
            key={payment.uid}
            layout // <- ayuda a transiciones suaves al agregar/eliminar
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