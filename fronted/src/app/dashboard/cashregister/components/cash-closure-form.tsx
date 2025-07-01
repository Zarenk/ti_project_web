"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Calculator, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { createCashClosure, createCashRegister, getActiveCashRegister } from "../cashregister.api"
import { getUserDataFromToken } from "@/lib/auth"; // o "@/utils/auth" donde lo tengas
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const formSchema = z.object({
  countedAmount: z.coerce.number().nonnegative("Debe ser un monto positivo"),
  employee: z.string().min(2, "El nombre del encargado es requerido"),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface CashClosureFormProps {
  storeId: number
  cashRegisterId: number
  userId: number
  currentBalance: number
  openingBalance: number
  totalIncome: number
  totalExpense: number
  onClosureCompleted: () => void
  reinitializeCashRegister: () => Promise<string | null>;
}

export default function CashClosureForm({
  storeId,
  cashRegisterId,
  userId,
  currentBalance,
  openingBalance,
  totalIncome,
  totalExpense,
  onClosureCompleted,
  reinitializeCashRegister,
}: CashClosureFormProps) {

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [discrepancy, setDiscrepancy] = useState<number | null>(null)
  const userData = getUserDataFromToken(); // 👈 Obtenemos los datos
  const [showOpenNewCashDialog, setShowOpenNewCashDialog] = useState(false);
  const [lastCountedAmount, setLastCountedAmount] = useState<number>(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countedAmount: 0,
      employee: "",
      notes: "",
    },
  })

  useEffect(() => {
    if (userData?.name) {
      form.setValue("employee", userData.name)
    }
  }, [userData?.name])

  const calculateDiscrepancy = (countedAmount: number) => {
    return countedAmount - currentBalance
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      const calculatedDiscrepancy = calculateDiscrepancy(values.countedAmount)
      setDiscrepancy(calculatedDiscrepancy)

      const payload = {
        cashRegisterId,
        userId: Number(userId),
        openingBalance: Number(openingBalance),
        closingBalance: Number(values.countedAmount),
        totalIncome: Number(totalIncome),
        totalExpense: Number(totalExpense),
        notes: values.notes || "",
      }

      console.log("Payload a enviar:", payload); // 👈 verifica esto
      await createCashClosure(payload)

      setLastCountedAmount(values.countedAmount); // 👈 Guarda el último contado
      toast.success("Cierre de caja registrado correctamente.")
      setShowOpenNewCashDialog(true); // 👈 Mostrar el AlertDialog
      onClosureCompleted()

      form.reset()
      setDiscrepancy(null)
    } catch (error: any) {
      const message = error?.message;
    
      if (
        typeof message === "string" &&
        message.includes("Ya se realizó un cierre de caja hoy")
      ) {
        toast.error("Ya se cerró la caja hoy. Solo se permite un cierre por día.");
      } else {
        toast.error("Error al realizar el cierre de caja.");
      }
    
      console.error("Error al registrar el cierre de caja:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="font-medium">Saldo esperado en caja</div>
          <div className="text-2xl font-bold">S/. {currentBalance.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground mt-1">Basado en todas las transacciones registradas.</div>
        </div>

        <FormField
          control={form.control}
          name="countedAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto Contabilizado (S/.)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="0.00" 
                  value={field.value} 
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const numericValue = parseFloat(inputValue || "0");
        
                    // Actualiza el valor en el formulario
                    field.onChange(inputValue);
        
                    // Calcula discrepancy automáticamente al escribir
                    if (!isNaN(numericValue)) {
                      setDiscrepancy(numericValue - currentBalance);
                    } else {
                      setDiscrepancy(null); // Si el input se borra o es inválido
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Encargado de Cierre</FormLabel>
              <FormControl>
                <Input {...field} readOnly />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles sobre el cierre (opcional)" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {discrepancy !== null && (
          <Alert variant={discrepancy === 0 ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {discrepancy === 0 ? "Caja Cuadrada" : discrepancy > 0 ? "Sobrante" : "Faltante"}
            </AlertTitle>
            <AlertDescription>
              {discrepancy === 0
                ? "El monto contabilizado coincide exactamente con el saldo esperado."
                : discrepancy > 0
                ? `Hay un sobrante de S/. ${Math.abs(discrepancy).toFixed(2)}.`
                : `Hay un faltante de S/. ${Math.abs(discrepancy).toFixed(2)}.`}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="button" 
          onClick={() => setShowConfirmDialog(true)} 
          disabled={isSubmitting} 
          className="w-full"
        >
          <Calculator className="mr-2 h-4 w-4" />
          Completar Cierre de Caja
        </Button>
      </form>

      <AlertDialog open={showOpenNewCashDialog} onOpenChange={setShowOpenNewCashDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas abrir una nueva caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una nueva caja para esta tienda con el saldo final anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await createCashRegister({
                    storeId, // 👈 asegúrate de pasar storeId como prop
                    initialBalance: lastCountedAmount, // 👈 necesitas guardar countedAmount
                    name: `Caja Principal - Tienda ${storeId} - ${Date.now()}`,
                  });
                  toast.success("Nueva caja creada exitosamente.");
                  const userName = await reinitializeCashRegister(); // 👈 ejecuta
                  if (userName) {
                    form.setValue("employee", userName); // 👈 setea empleado automáticamente
                  }
                  onClosureCompleted();
                } catch (error:any) {
                  console.error("❌ Error en createCashRegister:", error.response?.data || error.message);
                  console.error("Error creando nueva caja:", error);
                  toast.error("Error al crear la nueva caja.");
                } finally {
                  setShowOpenNewCashDialog(false);
                }
              }}
            >
              Crear Caja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cierre de caja?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción registrará el cierre y no podrá deshacerse. ¿Estás seguro de que deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                form.handleSubmit(onSubmit)(); // Ejecuta el submit
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </Form>

    
  )
}