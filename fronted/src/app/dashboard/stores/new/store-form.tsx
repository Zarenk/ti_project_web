"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenantSelection } from "@/context/tenant-selection-context";

import { createStore, updateStore } from "../stores.api";

const storeSchema = z.object({
  name: z
    .string({ required_error: "Se requiere el nombre de la tienda" })
    .min(3, "El nombre de la tienda debe tener al menos 3 caracteres")
    .max(50, "El nombre de la tienda no puede tener mas de 50 caracteres")
    .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, numeros y espacios"),
  description: z.string().optional().or(z.literal("")),
  ruc: z
    .string({ required_error: "Se requiere el RUC" })
    .length(11, "El RUC debe tener exactamente 11 digitos")
    .regex(/^\d{11}$/, "El RUC solo puede contener numeros"),
  phone: z.string().optional().or(z.literal("")),
  adress: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  image: z.string().url("La imagen debe ser una URL valida").optional().or(z.literal("")),
  status: z.enum(["Activo", "Inactivo"]).optional(),
});

type StoreFormValues = z.infer<typeof storeSchema>;

const defaultValues = (store: any | null): StoreFormValues => ({
  name: store?.name ?? "",
  description: store?.description ?? "",
  ruc: store?.ruc ?? "",
  phone: store?.phone ?? "",
  adress: store?.adress ?? "",
  email: store?.email ?? "",
  website: store?.website ?? "",
  status: store?.status ?? "Activo",
  image: store?.image ?? "",
});

type StoreFormProps = {
  store: any | null;
  storeId: string | null;
};

export default function StoreForm({ store, storeId }: StoreFormProps): React.ReactElement {
  const router = useRouter();
  const { version } = useTenantSelection();
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: defaultValues(store),
  });

  const { handleSubmit, register, setValue, formState, reset, watch } = form;

  useEffect(() => {
    reset(defaultValues(store));
    setNameError(null);
  }, [store, reset, version]);

  const statusValue = watch("status") ?? "Activo";

  const onSubmit = handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      setNameError(null);

      if (storeId) {
        await updateStore(storeId, { ...data });
        toast.success("Tienda actualizada correctamente.");
      } else {
        await createStore({ ...data });
        toast.success("Tienda creada correctamente.");
      }

      router.push("/dashboard/stores");
      router.refresh();
    } catch (error: any) {
      const backendMessage: string | undefined =
        error?.response?.data?.message ?? error?.message ?? undefined;

      if (
        error?.response?.status === 409 ||
        (backendMessage && backendMessage.toLowerCase().includes("ya existe"))
      ) {
        setNameError(
          backendMessage ?? "El nombre de la tienda ya existe. Ingresa un nombre diferente.",
        );
        return;
      }

      const message =
        backendMessage ?? "Ocurrio un error al guardar la tienda. Intenta nuevamente.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="container mx-auto grid max-w-lg sm:max-w-md md:max-w-lg lg:max-w-xl">
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <div className="flex flex-col">
          <Label className="py-3">Nombre de la tienda</Label>
          <Input {...register("name")} maxLength={50} />
          {formState.errors.name && (
            <p className="text-sm text-red-500">{formState.errors.name.message}</p>
          )}
          {nameError && <p className="text-sm text-red-500">{nameError}</p>}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Descripcion</Label>
          <Input {...register("description")} />
          {formState.errors.description && (
            <p className="text-sm text-red-500">{formState.errors.description.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">RUC</Label>
          <Input {...register("ruc")} maxLength={11} />
          {formState.errors.ruc && (
            <p className="text-sm text-red-500">{formState.errors.ruc.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Telefono</Label>
          <Input {...register("phone")} />
          {formState.errors.phone && (
            <p className="text-sm text-red-500">{formState.errors.phone.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Direccion</Label>
          <Input {...register("adress")} />
          {formState.errors.adress && (
            <p className="text-sm text-red-500">{formState.errors.adress.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Correo</Label>
          <Input {...register("email")} />
          {formState.errors.email && (
            <p className="text-sm text-red-500">{formState.errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Sitio web</Label>
          <Input {...register("website")} />
          {formState.errors.website && (
            <p className="text-sm text-red-500">{formState.errors.website.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <Label className="py-3">Estado</Label>
          <Select
            value={statusValue}
            onValueChange={(value) => setValue("status", value as "Activo" | "Inactivo")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <Label className="py-3">URL de imagen</Label>
          <Input {...register("image")} />
          {formState.errors.image && (
            <p className="text-sm text-red-500">{formState.errors.image.message}</p>
          )}
        </div>

        <Button className="mt-4" disabled={submitting}>
          {submitting ? "Guardando..." : storeId ? "Actualizar Tienda" : "Crear Tienda"}
        </Button>
      </form>
    </div>
  );
}
