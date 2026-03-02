"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BACKEND_URL, cn } from "@/lib/utils";

import type { CompanyDetail, UpdateCompanyPayload } from "../../../tenancy.api";
import { uploadCompanyLogo, updateCompany } from "../../../tenancy.api";
import {
  LOGO_MAX_FILE_SIZE,
  MAX_NAME_LENGTH,
  RUC_MAX_LENGTH,
  type FieldErrors,
} from "./use-company-form";

interface CompanyGeneralTabProps {
  company: CompanyDetail;
  formState: UpdateCompanyPayload;
  fieldErrors: FieldErrors;
  isPending: boolean;
  setFormState: React.Dispatch<React.SetStateAction<UpdateCompanyPayload>>;
  handleBasicChange: (field: keyof UpdateCompanyPayload) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLimitedTextChange: (field: "name" | "legalName" | "sunatBusinessName") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRucChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputValidationClass: (field: keyof UpdateCompanyPayload) => string | undefined;
}

export function CompanyGeneralTab({
  company,
  formState,
  fieldErrors,
  isPending,
  setFormState,
  handleBasicChange,
  handleLimitedTextChange,
  handleRucChange,
  inputValidationClass,
}: CompanyGeneralTabProps) {
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedLogoUrl = useMemo(() => {
    const path = (formState.logoUrl ?? company.logoUrl ?? "").trim();
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.replace(/^\/+/, "");
    return `${BACKEND_URL.replace(/\/$/, "")}/${normalized}`;
  }, [company.logoUrl, formState.logoUrl]);

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("El logo debe ser una imagen PNG o JPG.");
      event.target.value = "";
      return;
    }
    if (file.size > LOGO_MAX_FILE_SIZE) {
      toast.error("El logo no debe superar los 2 MB.");
      event.target.value = "";
      return;
    }

    setLogoUploading(true);
    try {
      const updated = await uploadCompanyLogo(company.id, file);
      setFormState((prev) => ({ ...prev, logoUrl: updated.logoUrl ?? "" }));
      toast.success("Logo actualizado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el logo.";
      toast.error(message);
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (logoUploading) return;
    setLogoUploading(true);
    try {
      await updateCompany(company.id, { logoUrl: null });
      setFormState((prev) => ({ ...prev, logoUrl: null }));
      toast.success("Logo eliminado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el logo.";
      toast.error(message);
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Datos de identidad ─────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Nombre comercial</Label>
          <Input
            id="company-name"
            value={formState.name ?? ""}
            onChange={handleLimitedTextChange("name")}
            maxLength={MAX_NAME_LENGTH}
            aria-invalid={Boolean(fieldErrors.name)}
            className={cn(inputValidationClass("name"))}
            required
            placeholder="Mi Empresa S.A."
            disabled={isPending}
          />
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-legal-name">Razón social</Label>
          <Input
            id="company-legal-name"
            value={formState.legalName ?? ""}
            onChange={handleLimitedTextChange("legalName")}
            maxLength={MAX_NAME_LENGTH}
            aria-invalid={Boolean(fieldErrors.legalName)}
            className={cn(inputValidationClass("legalName"))}
            placeholder="Mi Empresa Sociedad Anónima"
            disabled={isPending}
          />
          {fieldErrors.legalName && (
            <p className="text-xs text-destructive">{fieldErrors.legalName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-tax-id">RUC / NIT</Label>
          <Input
            id="company-tax-id"
            value={formState.taxId ?? ""}
            onChange={handleRucChange}
            inputMode="numeric"
            maxLength={RUC_MAX_LENGTH}
            aria-invalid={Boolean(fieldErrors.taxId)}
            className={cn(inputValidationClass("taxId"))}
            placeholder="Ingrese el número de identificación fiscal"
            disabled={isPending}
          />
          {fieldErrors.taxId ? (
            <p className="text-xs text-destructive">{fieldErrors.taxId}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Debe contener 11 dígitos numéricos.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company-status">Estado</Label>
          <Input
            id="company-status"
            value={formState.status ?? ""}
            onChange={handleBasicChange("status")}
            placeholder="ACTIVE"
            disabled={isPending}
          />
        </div>
      </div>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <div className="mb-3 space-y-1">
          <Label className="text-sm font-medium">Logo de la empresa</Label>
          <p className="text-xs text-muted-foreground">
            PNG o JPG, máximo 2 MB. Se usa en comprobantes y reportes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed bg-muted/30 transition-colors hover:bg-muted/50">
            {resolvedLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedLogoUrl}
                alt="Logo de la empresa"
                className="h-full w-full rounded-lg object-contain"
              />
            ) : (
              <span className="px-2 text-center text-xs text-muted-foreground">
                Sin logo
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleLogoFileChange}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {logoUploading
                  ? "Procesando..."
                  : resolvedLogoUrl
                    ? "Actualizar logo"
                    : "Subir logo"}
              </Button>
              {resolvedLogoUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="cursor-pointer"
                  disabled={logoUploading}
                  onClick={handleRemoveLogo}
                >
                  Quitar logo
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}