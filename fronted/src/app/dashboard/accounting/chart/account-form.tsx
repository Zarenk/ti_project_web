"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Account, AccountType, createAccount, updateAccount } from "./accounts.api";
import { Wallet, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  accountType: z.enum(["ACTIVO", "PASIVO", "PATRIMONIO", "INGRESO", "GASTO"], {
    required_error: "Selecciona el tipo de cuenta",
  }),
  parentId: z.string().optional(),
});

export type AccountFormValues = z.infer<typeof schema>;

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Account & { id?: string };
  onCreate?: (account: Account) => void;
  onUpdate?: (account: Account) => void;
  existingAccounts?: Account[];
}

const accountTypeOptions: Array<{
  value: AccountType;
  label: string;
  description: string;
  icon: typeof Wallet;
  color: string;
  bgColor: string;
}> = [
  {
    value: "ACTIVO",
    label: "Lo que tienes",
    description: "Recursos, dinero disponible, inventario",
    icon: Wallet,
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
  {
    value: "PASIVO",
    label: "Lo que debes",
    description: "Deudas, préstamos, obligaciones",
    icon: TrendingDown,
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
  {
    value: "PATRIMONIO",
    label: "Tu capital",
    description: "Capital propio, aportes del dueño",
    icon: DollarSign,
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    value: "INGRESO",
    label: "Dinero que entra",
    description: "Ventas, servicios, ingresos",
    icon: TrendingUp,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  {
    value: "GASTO",
    label: "Dinero que sale",
    description: "Compras, gastos operativos",
    icon: TrendingDown,
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
  },
];

export function AccountForm({
  open,
  onOpenChange,
  defaultValues,
  onCreate,
  onUpdate,
  existingAccounts = [],
}: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? {
          code: defaultValues.code,
          name: defaultValues.name,
          accountType: defaultValues.accountType,
          parentId: defaultValues.parentId ?? undefined,
        }
      : { code: "", name: "", accountType: undefined, parentId: undefined },
  });

  // Flatten accounts for parent selection
  const flattenedAccounts = (accs: Account[]): Account[] => {
    return accs.flatMap((acc) => [acc, ...(acc.children ? flattenedAccounts(acc.children) : [])]);
  };

  const allAccounts = flattenedAccounts(existingAccounts);

  const handleSubmit: SubmitHandler<AccountFormValues> = async (values) => {
    try {
      if (defaultValues?.id) {
        const updated = await updateAccount(defaultValues.id, values);
        onUpdate?.(updated);
      } else {
        const created = await createAccount(values);
        onCreate?.(created);
        form.reset();
      }
      onOpenChange(false);
    } catch (errors: any) {
      Object.entries(errors).forEach(([key, message]) =>
        form.setError(key as keyof AccountFormValues, { message: String(message) })
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {defaultValues?.id ? "Editar cuenta" : "Nueva cuenta contable"}
          </DialogTitle>
          <DialogDescription>
            {defaultValues?.id
              ? "Modifica los datos de la cuenta contable"
              : "Agrega una nueva cuenta a tu plan contable"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Account Type Selection */}
            <FormField<AccountFormValues>
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">Tipo de cuenta</FormLabel>
                  <FormDescription>Selecciona qué representa esta cuenta</FormDescription>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"
                    >
                      {accountTypeOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <div key={option.value}>
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={option.value}
                              className={cn(
                                "flex flex-col gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all",
                                "hover:shadow-sm",
                                "peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:shadow-md",
                                option.bgColor
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={cn("w-5 h-5", option.color)} />
                                <span className={cn("font-semibold", option.color)}>
                                  {option.label}
                                </span>
                              </div>
                              <span className="text-xs text-slate-600">{option.description}</span>
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Code */}
              <FormField<AccountFormValues>
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código PCGE</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ej: 10, 70, 60"
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Código según PCGE (Plan Contable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parent Account */}
              <FormField<AccountFormValues>
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta padre (opcional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value ?? "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin cuenta padre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin cuenta padre</SelectItem>
                        {allAccounts
                          .filter((acc) => acc.id !== defaultValues?.id)
                          .map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <span className="font-mono text-xs mr-2">{acc.code}</span>
                              {acc.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Organiza cuentas en jerarquía
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Name */}
            <FormField<AccountFormValues>
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la cuenta</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Caja y Bancos, Ventas, Compras y Gastos"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Nombre descriptivo para identificar fácilmente la cuenta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {defaultValues?.id ? "Guardar cambios" : "Crear cuenta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}