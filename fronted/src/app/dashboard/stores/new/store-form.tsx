"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Check } from "lucide-react";
import { resolveImageUrl } from "@/lib/images";
import { useTenantSelection } from "@/context/tenant-selection-context";

import { createStore, updateStore, uploadStoreImage } from "../stores.api";

const normalizeStoreImagePath = (input?: string): string => {
  const raw = input?.trim() ?? "";
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/uploads") || raw.startsWith("uploads/")) return raw;
  if (/^\d{1,3}(\.\d{1,3}){3}\//.test(raw)) {
    return `http://${raw}`;
  }
  const uploadsIndex = raw.indexOf("/uploads");
  if (uploadsIndex >= 0) {
    const relative = raw.slice(uploadsIndex);
    return relative.startsWith("/") ? relative : `/${relative}`;
  }
  return raw;
};

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
  image: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) return true;
      if (value.startsWith("/uploads") || value.startsWith("uploads/")) return true;
      if (/^\d{1,3}(\.\d{1,3}){3}\//.test(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, "La imagen debe ser una URL valida"),
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
  image: normalizeStoreImagePath(store?.image ?? ""),
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
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: defaultValues(store),
  });

  const { handleSubmit, register, setValue, formState, reset, watch } = form;

  const emptyFormValues = useMemo(
    () => ({
      name: "",
      description: "",
      ruc: "",
      phone: "",
      adress: "",
      email: "",
      website: "",
      status: "Activo" as StoreFormValues["status"],
      image: "",
    }),
    [],
  );

  useEffect(() => {
    reset(defaultValues(store));
    setNameError(null);
  }, [store, reset, version]);

  const statusValue = watch("status") ?? "Activo";
  const watchedName = watch("name");
  const watchedRuc = watch("ruc");
  const watchedDescription = watch("description");
  const watchedPhone = watch("phone");
  const watchedAdress = watch("adress");
  const watchedEmail = watch("email");
  const watchedWebsite = watch("website");
  const watchedImage = watch("image");

  const normalizedRuc = (watchedRuc ?? "").replace(/\D/g, "");
  const hasName = Boolean(watchedName?.trim());
  const hasRuc = normalizedRuc.length === 11;
  const hasDescription = Boolean(watchedDescription?.trim());
  const hasPhone = Boolean(watchedPhone?.trim());
  const hasAdress = Boolean(watchedAdress?.trim());
  const hasEmail = Boolean(watchedEmail?.trim());
  const hasWebsite = Boolean(watchedWebsite?.trim());
  const hasImage = Boolean(watchedImage?.trim());
  const imagePreview = normalizeStoreImagePath(watchedImage?.trim() ?? "");

  const renderOptionalChip = (filled: boolean) => (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : "border-border/60 bg-muted/30 text-muted-foreground"
      }`}
    >
      {filled ? <Check className="h-3 w-3" /> : null}
      {filled ? "Listo" : "Opcional"}
    </span>
  );

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImageUploading(true);
      const response = await uploadStoreImage(file);
      if (response?.url) {
        const normalized = normalizeStoreImagePath(response.url);
        setValue("image", normalized, { shouldValidate: true });
        toast.success("Imagen cargada correctamente.");
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error);
      toast.error("No se pudo subir la imagen.");
    } finally {
      setIsImageUploading(false);
      event.target.value = "";
    }
  };

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
    <div className="container mx-auto grid w-full max-w-2xl sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-none">
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-6">
          <div className="flex flex-col lg:col-span-2">
            <Label className="py-3">
              Nombre de la tienda
              <span
                className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasName
                    ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                }`}
              >
                {hasName ? <Check className="mr-1 h-3 w-3" /> : null}
                {hasName ? "Listo" : "Requerido"}
              </span>
            </Label>
            <Input {...register("name")} maxLength={50} />
            {formState.errors.name && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.name.message}
              </p>
            )}
            {nameError && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-2">
            <Label className="py-3">
              RUC
              <span
                className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasRuc
                    ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
                }`}
              >
                {hasRuc ? <Check className="mr-1 h-3 w-3" /> : null}
                {hasRuc ? "Listo" : "Requerido"}
              </span>
            </Label>
            <Input
              {...register("ruc")}
              maxLength={11}
              onInput={(event) => {
                const input = event.target as HTMLInputElement;
                input.value = input.value.replace(/\D/g, "").slice(0, 11);
              }}
            />
            {formState.errors.ruc && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.ruc.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Descripcion
              {renderOptionalChip(hasDescription)}
            </Label>
            <Input {...register("description")} />
            {formState.errors.description && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Telefono
              {renderOptionalChip(hasPhone)}
            </Label>
            <Input {...register("phone")} />
            {formState.errors.phone && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Direccion
              {renderOptionalChip(hasAdress)}
            </Label>
            <Input {...register("adress")} />
            {formState.errors.adress && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.adress.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Selecciona un estado:
              {renderOptionalChip(Boolean(statusValue))}
            </Label>
            <Select
              value={statusValue}
              onValueChange={(value) => setValue("status", value as "Activo" | "Inactivo")}
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el estado de la tienda</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Correo
              {renderOptionalChip(hasEmail)}
            </Label>
            <Input {...register("email")} />
            {formState.errors.email && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Sitio web
              {renderOptionalChip(hasWebsite)}
            </Label>
            <Input {...register("website")} />
            {formState.errors.website && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.website.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-2">
            <Label className="py-3">
              Imagen
              {renderOptionalChip(hasImage)}
            </Label>
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Input
                  placeholder="URL o ruta relativa /uploads"
                  maxLength={200}
                  {...register("image")}
                />
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isImageUploading}
                        className="cursor-pointer"
                        onChange={handleImageFile}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">Selecciona el archivo de imagen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar una URL externa o subir un archivo (se almacenara en /uploads).
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {imagePreview ? (
                    <img
                      src={resolveImageUrl(imagePreview)}
                      alt="Vista previa de tienda"
                      className="h-24 w-24 rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded border text-xs text-muted-foreground">
                      Sin vista previa
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer sm:self-end"
                    onClick={() => setValue("image", "", { shouldValidate: true })}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            {formState.errors.image && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formState.errors.image.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 lg:flex-row lg:items-center lg:justify-end">
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() => router.back()}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() => {
              reset(emptyFormValues);
              setNameError(null);
            }}
          >
            Limpiar
          </Button>
          <Button
            className="w-full cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600 lg:w-auto lg:min-w-[160px]"
            disabled={submitting}
          >
            {submitting ? "Guardando..." : storeId ? "Actualizar Tienda" : "Crear Tienda"}
          </Button>
        </div>
      </form>
    </div>
  );
}
