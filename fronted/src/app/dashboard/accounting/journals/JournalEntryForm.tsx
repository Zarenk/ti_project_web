"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createJournalEntry, CreateJournalEntryDto } from "./journals.api";

const journalLineSchema = z.object({
  accountCode: z.string().min(1, "Seleccione una cuenta"),
  glosa: z.string().optional(),
  debe: z.coerce.number().min(0, "El debe debe ser mayor o igual a 0"),
  haber: z.coerce.number().min(0, "El haber debe ser mayor o igual a 0"),
});

const journalEntrySchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  description: z.string().min(1, "La descripción es requerida"),
  moneda: z.enum(["PEN", "USD"]),
  tipoCambio: z.coerce.number().optional(),
  lines: z.array(journalLineSchema).min(2, "Debe tener al menos 2 líneas"),
}).refine(
  (data) => {
    const totalDebe = data.lines.reduce((sum, line) => sum + line.debe, 0);
    const totalHaber = data.lines.reduce((sum, line) => sum + line.haber, 0);
    return Math.abs(totalDebe - totalHaber) < 0.01;
  },
  {
    message: "El total del Debe debe ser igual al total del Haber",
    path: ["lines"],
  }
);

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

// Cuentas comunes - esto debería venir del Plan de Cuentas en el futuro
const commonAccounts = [
  { code: "1011", name: "Caja" },
  { code: "1041", name: "Banco – Yape/Transferencia" },
  { code: "1212", name: "Cuentas por cobrar" },
  { code: "2011", name: "Mercaderías" },
  { code: "4011", name: "IGV por pagar" },
  { code: "4212", name: "Cuentas por pagar" },
  { code: "6011", name: "Mercaderías" },
  { code: "6911", name: "Costo de ventas" },
  { code: "7011", name: "Ventas" },
];

interface JournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function JournalEntryForm({
  open,
  onOpenChange,
  onSuccess,
}: JournalEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      description: "",
      moneda: "PEN",
      tipoCambio: undefined,
      lines: [
        { accountCode: "", glosa: "", debe: 0, haber: 0 },
        { accountCode: "", glosa: "", debe: 0, haber: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const watchLines = form.watch("lines");
  const totalDebe = watchLines.reduce((sum, line) => sum + (line.debe || 0), 0);
  const totalHaber = watchLines.reduce((sum, line) => sum + (line.haber || 0), 0);
  const balanced = Math.abs(totalDebe - totalHaber) < 0.01;

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: JournalEntryFormData) => {
    setIsSubmitting(true);
    try {
      const dto: CreateJournalEntryDto = {
        date: new Date(data.date).toISOString(),
        description: data.description,
        moneda: data.moneda,
        tipoCambio: data.tipoCambio,
        lines: data.lines.map((line) => ({
          accountCode: line.accountCode,
          glosa: line.glosa || data.description,
          debe: line.debe,
          haber: line.haber,
        })),
      };

      await createJournalEntry(dto);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating journal entry:", error);
      alert("Error al crear el asiento contable");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Asiento Contable</DialogTitle>
          <DialogDescription>
            Complete los datos del asiento contable manual. Asegúrese de que el Debe y Haber estén balanceados.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información general */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PEN">PEN (S/.)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoCambio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cambio (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="3.750"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Asiento</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Pago de planilla del mes de enero 2024"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Líneas del asiento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Líneas del Asiento</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ accountCode: "", glosa: "", debe: 0, haber: 0 })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Línea
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium w-[200px]">
                          Cuenta
                        </th>
                        <th className="px-4 py-2 text-left text-sm font-medium flex-1">
                          Glosa (opcional)
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium w-[140px]">
                          Debe
                        </th>
                        <th className="px-4 py-2 text-right text-sm font-medium w-[140px]">
                          Haber
                        </th>
                        <th className="px-4 py-2 w-[60px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className="border-t">
                          <td className="px-4 py-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.accountCode`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {commonAccounts.map((account) => (
                                        <SelectItem
                                          key={account.code}
                                          value={account.code}
                                        >
                                          {account.code} - {account.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.glosa`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder="Glosa específica..."
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.debe`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="text-right"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <FormField
                              control={form.control}
                              name={`lines.${index}.haber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="text-right"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {fields.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Totales */}
                      <tr className="border-t-2 font-medium bg-muted/30">
                        <td className="px-4 py-2" colSpan={2}>
                          <span className="text-sm">Totales</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {totalDebe.toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          {totalHaber.toLocaleString("es-PE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Indicador de balance */}
              <Alert variant={balanced ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {balanced ? (
                    <span className="text-green-700 dark:text-green-400">
                      ✓ El asiento está balanceado (Debe = Haber)
                    </span>
                  ) : (
                    <span>
                      ✗ El asiento NO está balanceado. Diferencia:{" "}
                      {Math.abs(totalDebe - totalHaber).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !balanced}>
                {isSubmitting ? "Creando..." : "Crear Asiento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
