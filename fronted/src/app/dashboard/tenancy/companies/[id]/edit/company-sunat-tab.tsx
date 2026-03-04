"use client";

import { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, MessageCircle, ShieldCheck, XCircle } from "lucide-react";

import type { CompanyDetail, SunatEnvironment, UpdateCompanyPayload } from "../../../tenancy.api";
import { uploadCompanySunatFile } from "../../../tenancy.api";
import {
  MAX_NAME_LENGTH,
  RUC_MAX_LENGTH,
  type FieldErrors,
  getErrorMessage,
} from "./use-company-form";

interface CompanySunatTabProps {
  company: CompanyDetail;
  formState: UpdateCompanyPayload;
  fieldErrors: FieldErrors;
  isPending: boolean;
  handleBasicChange: (field: keyof UpdateCompanyPayload) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLimitedTextChange: (field: "name" | "legalName" | "sunatBusinessName") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRucChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEnvironmentChange: (value: SunatEnvironment) => void;
  inputValidationClass: (field: keyof UpdateCompanyPayload) => string | undefined;
  updateFormState?: (updater: (prev: UpdateCompanyPayload) => UpdateCompanyPayload) => void;
  onCertificateUploaded?: () => void;
}

export function CompanySunatTab({
  company,
  formState,
  fieldErrors,
  isPending,
  handleBasicChange,
  handleLimitedTextChange,
  handleRucChange,
  handleEnvironmentChange,
  inputValidationClass,
  updateFormState,
  onCertificateUploaded,
}: CompanySunatTabProps) {
  const [sunatPaths, setSunatPaths] = useState({
    betaCert: company.sunatCertPathBeta ?? null,
    betaKey: company.sunatKeyPathBeta ?? null,
    prodCert: company.sunatCertPathProd ?? null,
    prodKey: company.sunatKeyPathProd ?? null,
  });
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  // Track which files were just uploaded for animation
  const [justUploaded, setJustUploaded] = useState<Set<string>>(new Set());
  const uploadTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      uploadTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const environmentValue = (formState.sunatEnvironment ?? "BETA") as SunatEnvironment;

  const fileLabel = (value?: string | null) => {
    if (!value) return "Sin archivo";
    const parts = value.split(/[/\\]/);
    return parts[parts.length - 1] || value;
  };

  const handleSunatUpload = (env: "beta" | "prod", type: "cert" | "key") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "cert" ? ".crt,.cer,.pem" : ".key,.pem";
    input.onchange = async (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setUploadingTarget(`${env}-${type}`);
      try {
        const updated = await uploadCompanySunatFile(company.id, { env, type, file });
        setSunatPaths({
          betaCert: updated.sunatCertPathBeta ?? null,
          betaKey: updated.sunatKeyPathBeta ?? null,
          prodCert: updated.sunatCertPathProd ?? null,
          prodKey: updated.sunatKeyPathProd ?? null,
        });

        // Trigger success animation
        const key = `${env}-${type}`;
        setJustUploaded((prev) => new Set(prev).add(key));
        const existing = uploadTimers.current.get(key);
        if (existing) clearTimeout(existing);
        uploadTimers.current.set(
          key,
          setTimeout(() => {
            setJustUploaded((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
            uploadTimers.current.delete(key);
          }, 3000),
        );

        toast.success("Archivo SUNAT actualizado correctamente.");
        onCertificateUploaded?.();
      } catch (error: unknown) {
        const msg = getErrorMessage(error);
        toast.error(msg ?? "No se pudo subir el archivo.");
      } finally {
        setUploadingTarget(null);
        target.value = "";
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* ── Ambiente ──────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Ambiente SUNAT activo</Label>
          <Select
            value={environmentValue}
            onValueChange={(v) => handleEnvironmentChange(v as SunatEnvironment)}
            disabled={isPending}
          >
            <SelectTrigger className="cursor-pointer w-full">
              <SelectValue placeholder="Selecciona un ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BETA" className="cursor-pointer">BETA (Pruebas)</SelectItem>
              <SelectItem value="PROD" className="cursor-pointer">PROD (Producción)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sunat-ruc">RUC utilizado para SUNAT</Label>
          <Input
            id="sunat-ruc"
            value={formState.sunatRuc ?? ""}
            onChange={handleRucChange}
            inputMode="numeric"
            maxLength={RUC_MAX_LENGTH}
            aria-invalid={Boolean(fieldErrors.sunatRuc)}
            className={cn(inputValidationClass("sunatRuc"))}
            placeholder="20123456789"
            disabled={isPending}
          />
          {fieldErrors.sunatRuc ? (
            <p className="text-xs text-destructive">{fieldErrors.sunatRuc}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Se sincroniza automáticamente con el RUC principal.</p>
          )}
        </div>
      </div>

      {environmentValue === "PROD" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2 dark:bg-amber-950/20 dark:border-amber-700 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Modo Produccion activo
            </p>
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc pl-6 space-y-1">
            <li>Los comprobantes enviados seran validos ante la SUNAT</li>
            <li>Verifica las credenciales SOL de produccion</li>
            <li>Revisa series y correlativos en la pestana &quot;Comprobantes&quot;</li>
            <li>El certificado digital debe ser el de produccion</li>
          </ul>
        </div>
      )}

      {/* ── Datos del comprobante ─────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sunat-business-name">Nombre en comprobante</Label>
          <Input
            id="sunat-business-name"
            value={formState.sunatBusinessName ?? ""}
            onChange={handleLimitedTextChange("sunatBusinessName")}
            maxLength={MAX_NAME_LENGTH}
            aria-invalid={Boolean(fieldErrors.sunatBusinessName)}
            className={cn(inputValidationClass("sunatBusinessName"))}
            placeholder="Ej. Tecnología Informática EIRL"
            disabled={isPending}
          />
          {fieldErrors.sunatBusinessName && (
            <p className="text-xs text-destructive">{fieldErrors.sunatBusinessName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sunat-address">Dirección fiscal</Label>
          <Input
            id="sunat-address"
            value={formState.sunatAddress ?? ""}
            onChange={handleBasicChange("sunatAddress")}
            placeholder="Av. Principal 123 - Distrito"
            disabled={isPending}
          />
        </div>

        <div className="space-y-1.5 lg:col-span-2 lg:max-w-sm">
          <Label htmlFor="sunat-phone">Teléfono</Label>
          <Input
            id="sunat-phone"
            value={formState.sunatPhone ?? ""}
            onChange={handleBasicChange("sunatPhone")}
            placeholder="+51 999 999 999"
            disabled={isPending}
          />
        </div>
      </div>

      {/* ── WhatsApp auto-envío ──────────────────────────── */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 dark:bg-emerald-950/10 dark:border-emerald-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="min-w-0">
              <Label htmlFor="whatsappAutoSendInvoice" className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 cursor-pointer">
                Envio automatico por WhatsApp
              </Label>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Envia comprobantes aceptados por SUNAT automaticamente al cliente por WhatsApp
              </p>
            </div>
          </div>
          <Switch
            id="whatsappAutoSendInvoice"
            checked={(formState as Record<string, unknown>).whatsappAutoSendInvoice === true}
            onCheckedChange={(checked) => {
              updateFormState?.((prev) => ({ ...prev, whatsappAutoSendInvoice: checked }));
            }}
            disabled={isPending}
            className="cursor-pointer flex-shrink-0"
          />
        </div>
        {(formState as Record<string, unknown>).whatsappAutoSendInvoice === true && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 pl-6">
            Requiere una sesion de WhatsApp conectada y que el cliente tenga telefono registrado.
          </p>
        )}
      </div>

      {/* ── Credenciales BETA + PROD ─────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["beta", "prod"] as const).map((env) => {
          const isBeta = env === "beta";
          const userField = isBeta ? "sunatSolUserBeta" : "sunatSolUserProd";
          const passField = isBeta ? "sunatSolPasswordBeta" : "sunatSolPasswordProd";
          const certPath = isBeta ? sunatPaths.betaCert : sunatPaths.prodCert;
          const keyPath = isBeta ? sunatPaths.betaKey : sunatPaths.prodKey;
          const certJustUploaded = justUploaded.has(`${env}-cert`);
          const keyJustUploaded = justUploaded.has(`${env}-key`);

          return (
            <div
              key={env}
              className="rounded-lg border border-slate-200 p-4 space-y-3 transition-shadow hover:shadow-md dark:border-slate-700"
            >
              <div>
                <p className="text-sm font-semibold">
                  {isBeta ? "Credenciales BETA (Pruebas)" : "Credenciales PRODUCCIÓN"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBeta
                    ? "Usadas para enviar comprobantes al entorno e-beta de SUNAT."
                    : "Se utilizan para el envío oficial a la SUNAT."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`sunat-${env}-user`}>Usuario SOL</Label>
                  <Input
                    id={`sunat-${env}-user`}
                    value={(formState as Record<string, unknown>)[userField] as string ?? ""}
                    onChange={handleBasicChange(userField as keyof UpdateCompanyPayload)}
                    placeholder={isBeta ? "MODDATOS" : "EMPRESA1"}
                    disabled={isPending}
                    aria-invalid={Boolean(fieldErrors[userField as keyof typeof fieldErrors])}
                    className={cn(fieldErrors[userField as keyof typeof fieldErrors] && "border-destructive focus-visible:ring-destructive")}
                  />
                  {fieldErrors[userField as keyof typeof fieldErrors] && (
                    <p className="text-xs text-destructive">{fieldErrors[userField as keyof typeof fieldErrors]}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`sunat-${env}-password`}>Clave SOL</Label>
                  <div className="relative group">
                    <Input
                      id={`sunat-${env}-password`}
                      type={showPassword[env] ? "text" : "password"}
                      value={(formState as Record<string, unknown>)[passField] as string ?? ""}
                      onChange={handleBasicChange(passField as keyof UpdateCompanyPayload)}
                      placeholder="********"
                      disabled={isPending}
                      aria-invalid={Boolean(fieldErrors[passField as keyof typeof fieldErrors])}
                      className={cn("pr-9", fieldErrors[passField as keyof typeof fieldErrors] && "border-destructive focus-visible:ring-destructive")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-0 top-0 h-full px-2.5 flex items-center justify-center cursor-pointer text-muted-foreground/60 hover:text-foreground transition-colors duration-200"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          [env]: !prev[env],
                        }))
                      }
                      aria-label={showPassword[env] ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      <span className="relative h-4 w-4">
                        <Eye
                          className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-200",
                            showPassword[env]
                              ? "opacity-0 scale-75 rotate-12"
                              : "opacity-100 scale-100 rotate-0"
                          )}
                        />
                        <EyeOff
                          className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-200",
                            showPassword[env]
                              ? "opacity-100 scale-100 rotate-0"
                              : "opacity-0 scale-75 -rotate-12"
                          )}
                        />
                      </span>
                    </button>
                  </div>
                  {fieldErrors[passField as keyof typeof fieldErrors] && (
                    <p className="text-xs text-destructive">{fieldErrors[passField as keyof typeof fieldErrors]}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Certificate */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificado</p>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 transition-all duration-500",
                      certJustUploaded && "bg-emerald-100 dark:bg-emerald-950/30",
                    )}
                  >
                    {certPath ? (
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 transition-all duration-300",
                          certJustUploaded
                            ? "text-emerald-500 scale-125"
                            : "text-emerald-600",
                        )}
                      />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <p className={cn(
                      "text-sm font-medium truncate transition-colors duration-300",
                      certJustUploaded && "text-emerald-700 dark:text-emerald-300",
                    )}>
                      {certJustUploaded ? "Subido correctamente" : fileLabel(certPath)}
                    </p>
                  </div>
                  {certPath && certJustUploaded && (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <ShieldCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Certificado listo</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer w-full"
                    disabled={isPending || uploadingTarget === `${env}-cert`}
                    onClick={() => handleSunatUpload(env, "cert")}
                  >
                    {uploadingTarget === `${env}-cert` ? "Subiendo..." : "Subir certificado"}
                  </Button>
                </div>

                {/* Private key */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Clave privada</p>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 transition-all duration-500",
                      keyJustUploaded && "bg-emerald-100 dark:bg-emerald-950/30",
                    )}
                  >
                    {keyPath ? (
                      <CheckCircle2
                        className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 transition-all duration-300",
                          keyJustUploaded
                            ? "text-emerald-500 scale-125"
                            : "text-emerald-600",
                        )}
                      />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <p className={cn(
                      "text-sm font-medium truncate transition-colors duration-300",
                      keyJustUploaded && "text-emerald-700 dark:text-emerald-300",
                    )}>
                      {keyJustUploaded ? "Subida correctamente" : fileLabel(keyPath)}
                    </p>
                  </div>
                  {keyPath && keyJustUploaded && (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
                      <ShieldCheck className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">Clave lista</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer w-full"
                    disabled={isPending || uploadingTarget === `${env}-key`}
                    onClick={() => handleSunatUpload(env, "key")}
                  >
                    {uploadingTarget === `${env}-key` ? "Subiendo..." : "Subir clave"}
                  </Button>
                </div>
              </div>

              {/* Advertencia de archivos faltantes en PROD */}
              {!isBeta && environmentValue === "PROD" && (!certPath || !keyPath) && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                  {!certPath && !keyPath
                    ? "Falta el certificado y la clave privada de producción."
                    : !certPath
                      ? "Falta el certificado de producción."
                      : "Falta la clave privada de producción."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
