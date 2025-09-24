"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Transaction } from "../types/cash-register"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createIndependentTransaction, getActiveCashRegister } from "../cashregister.api"; // 👈 Importar nueva función
import { getUserDataFromToken } from "@/lib/auth";
import { getUserProfileId } from "../../users/users.api"
import { PaymentMethodsSelector } from "./uis/PaymentMethodsSelector"
import { toast } from "sonner"


const formSchema = z.object({
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.coerce.number().positive("El monto debe ser positivo"), // Convierte automáticamente a número
  employee: z.string(),
  clientName: z.string().optional(),
  clientDocument: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>

interface CashTransferFormProps {
  onTransfer?: (transaction: Transaction) => void
  currentBalance: number
  storeId: number | null; // Agregar storeId como prop
  refreshData: () => void
}

export default function CashTransferForm({ onTransfer, currentBalance, storeId, refreshData }: CashTransferFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [employeeName, setEmployeeName] = useState('');
  const [cashRegisterId, setCashRegisterId] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<{ method: string; amount: number }[]>([]);
  const [userId, setUserId] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "deposit",
      amount: 0,
      employee: "",
      clientName: "",
      clientDocument: "",
      notes: "",
    },
  })

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const profile = await getUserProfileId();
        setEmployeeName(profile.name); // Establece el nombre del usuario logueado
      } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        setEmployeeName(''); // Asegúrate de manejar el estado en caso de error
      }
    }
  
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (storeId !== null) {
      async function fetchCashRegister() {
        try {
          const cashRegister = await getActiveCashRegister(storeId!);
          if (cashRegister && cashRegister.id !== undefined) {
            setCashRegisterId(cashRegister.id);
          } else {
            setCashRegisterId(null);
          }
        } catch (error) {
          console.error('Error al obtener la caja activa:', error);
          setCashRegisterId(null);
        }
      }
  
      fetchCashRegister();
      } else {
      setCashRegisterId(null);
    }
  }, [storeId]);

  useEffect(() => {
    getUserDataFromToken().then((u) => setUserId(u?.id ?? null));
  }, []);

  const onSubmit = async (values: FormValues) => {

    setIsSubmitting(true);

    // Verificar que el monto sea mayor a 0
    if (values.amount <= 0) {
      toast.error("El monto debe ser mayor a 0.");
      setIsSubmitting(false);
      return;
    }

    if (values.type === "withdrawal" && values.amount > currentBalance) {
      toast.error("El monto del retiro no puede ser mayor al saldo actual.");
      setIsSubmitting(false);
      return;
    }

    // 1️⃣ Validar que ningún método de pago tenga monto 0
    if (paymentMethods.some((method) => method.amount <= 0)) {
      toast.error("Cada método de pago debe tener un monto mayor a 0.");
      setIsSubmitting(false);
      return;
    }

    // 2️⃣ Validar que no haya métodos de pago repetidos
    const methodNames = paymentMethods.map((m) => m.method);
    const uniqueMethodNames = new Set(methodNames);

    if (methodNames.length !== uniqueMethodNames.size) {
      toast.error("No puedes repetir el mismo método de pago.");
      setIsSubmitting(false);
      return;
    }

    // Verificar que la suma de métodos de pago coincida con amount
    const totalPaymentMethods = paymentMethods.reduce((sum, method) => sum + Number(method.amount), 0);

    if (totalPaymentMethods !== values.amount) {
      toast.error("La suma de los métodos de pago no coincide con el monto total.");
      setIsSubmitting(false);
      return;
    }
  
    try {

      if (!userId || !employeeName) {
        toast.error("Sesión inválida. Por favor, vuelve a iniciar sesión.");
        setIsSubmitting(false);
        return;
      }

      if (!cashRegisterId) {
        toast.error("No hay una caja activa para esta tienda.");
        setIsSubmitting(false);
        return;
      }
      
      const type = values.type === "deposit" ? "INCOME" : "EXPENSE";

      const payload = {
        cashRegisterId,
        userId,
        type: type as "INCOME" | "EXPENSE",
        amount: values.amount,
        employee: employeeName,
        description: values.notes || "", // evitar undefined
        clientName: values.clientName || undefined,
        clientDocument: values.clientDocument || undefined,
        clientDocumentType: values.clientDocument ? "DNI" : undefined,
        paymentMethods: paymentMethods,
      };

      console.log("Payload preparado para enviar:", payload);
      await createIndependentTransaction(payload);
      toast.success("Transacción registrada exitosamente!");
  
      form.reset({
        type: form.getValues("type"),
        amount: 0,
        employee: "",
        clientName: "",
        clientDocument: "",
        notes: "",
      });

      refreshData(); // 👈

      setPaymentMethods([]); // 🔥 Limpiamos también los métodos de pago

    } catch (error: any) {
      console.error("Error al registrar la transacción:", error.message || error);
    }
  
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Transaccion</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1 sm:flex-row sm:space-x-4 sm:space-y-0"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="deposit" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center">
                      <ArrowDown className="mr-2 h-4 w-4 text-green-500" />
                      Ingreso
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="withdrawal" />
                    </FormControl>
                    <FormLabel className="font-normal flex items-center">
                      <ArrowUp className="mr-2 h-4 w-4 text-red-500" />
                      Retiro
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto (S/.)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormDescription>Ingrese la cantidad del monto</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="employee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Encargado</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del encargado" value={employeeName || ''} readOnly />
                </FormControl>
                <FormDescription>Quien esta manejando esta transaccion</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientDocument"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documento del Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Documento del cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="paymentMethods"
            render={() => (
              <FormItem>
                <FormLabel>Métodos de Pago</FormLabel>
                <PaymentMethodsSelector
                  value={paymentMethods}
                  onChange={(updated) => setPaymentMethods(updated)}
                />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles adicionales de la transacion..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {cashRegisterId === null && (
          <p className="text-sm text-red-500">No hay una caja activa para esta tienda.</p>
        )}
        <Button type="submit" disabled={isSubmitting || cashRegisterId === null} className="w-full">
          <ArrowDownUp className="mr-2 h-4 w-4" />
          Guardar Transaccion
        </Button>
      </form>
    </Form>
  )
}
