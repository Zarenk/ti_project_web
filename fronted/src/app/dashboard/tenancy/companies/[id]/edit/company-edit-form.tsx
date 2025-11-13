"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type {
  CompanyDetail,
  SunatEnvironment,
  SunatStoredPdf,
  SunatTransmission,
  UpdateCompanyPayload,
} from "../../../tenancy.api";
import {
  getCompanySunatTransmissions,
  getSunatStoredPdfs,
  retrySunatTransmission,
  updateCompany,
  uploadCompanySunatFile,
} from "../../../tenancy.api";
import { useEffect } from "react";
import { Download, Send } from "lucide-react";
import { setTenantSelection } from "@/utils/tenant-preferences";
import { BACKEND_URL } from "@/lib/utils";

const MAX_NAME_LENGTH = 200;
const RUC_MAX_LENGTH = 11;
const NAME_FIELDS = ["name", "legalName", "sunatBusinessName"] as const;

type NameField = (typeof NAME_FIELDS)[number];
type FieldErrors = Partial<Record<keyof UpdateCompanyPayload, string | null>>;

const validateCompanyForm = (state: UpdateCompanyPayload): FieldErrors => {
  const errors: FieldErrors = {};
  const nameRegistry: Record<string, NameField> = {};

  NAME_FIELDS.forEach((field) => {
    const raw = state[field] ?? "";
    const trimmed = raw.trim();
    if (trimmed.length > MAX_NAME_LENGTH) {
      errors[field] = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
      return;
    }
    if (!trimmed) {
      return;
    }
    const normalized = trimmed.toLocaleLowerCase();
    const duplicatedField = nameRegistry[normalized];
    if (duplicatedField) {
      errors[field] = "Este nombre ya está en uso.";
      if (!errors[duplicatedField]) {
        errors[duplicatedField] = "Este nombre ya está en uso.";
      }
      return;
    }
    nameRegistry[normalized] = field;
  });

  const validateRuc = (value: string | null | undefined, field: "taxId" | "sunatRuc") => {
    const trimmed = (value ?? "").trim();
    if (!trimmed) {
      errors[field] = "El RUC es obligatorio.";
      return;
    }
    if (!/^\d{11}$/.test(trimmed)) {
      errors[field] = "El RUC debe tener 11 dígitos numéricos.";
    }
  };

  validateRuc(state.taxId, "taxId");
  validateRuc(state.sunatRuc, "sunatRuc");

  return errors;
};

const getErrorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

interface CompanyEditFormProps {
  company: CompanyDetail;
}

export function CompanyEditForm({
  company,
}: CompanyEditFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const createInitialFormState = (): UpdateCompanyPayload => ({
    name: company.name,
    legalName: company.legalName ?? "",
    taxId: company.taxId ?? "",
    status: company.status ?? "ACTIVE",
    sunatEnvironment: (company.sunatEnvironment ?? "BETA") as SunatEnvironment,
    sunatRuc: company.sunatRuc ?? "",
    sunatBusinessName: company.sunatBusinessName ?? "",
    sunatAddress: company.sunatAddress ?? "",
    sunatPhone: company.sunatPhone ?? "",
    sunatSolUserBeta: company.sunatSolUserBeta ?? "",
    sunatSolPasswordBeta: company.sunatSolPasswordBeta ?? "",
    sunatSolUserProd: company.sunatSolUserProd ?? "",
    sunatSolPasswordProd: company.sunatSolPasswordProd ?? "",
  });

  const [formState, setFormState] = useState<UpdateCompanyPayload>(createInitialFormState);
  const [sunatPaths, setSunatPaths] = useState({
    betaCert: company.sunatCertPathBeta ?? null,
    betaKey: company.sunatKeyPathBeta ?? null,
    prodCert: company.sunatCertPathProd ?? null,
    prodKey: company.sunatKeyPathProd ?? null,
  });
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [sunatLogs, setSunatLogs] = useState<SunatTransmission[]>([]);
  const [sunatLogsLoading, setSunatLogsLoading] = useState(true);
  const [sunatPdfs, setSunatPdfs] = useState<SunatStoredPdf[]>([]);
  const [sunatPdfsLoading, setSunatPdfsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(() => validateCompanyForm(createInitialFormState()));

  const updateFormState = useCallback(
    (updater: (prev: UpdateCompanyPayload) => UpdateCompanyPayload) => {
      setFormState((prev) => {
        const nextState = updater(prev);
        setFieldErrors(validateCompanyForm(nextState));
        return nextState;
      });
    },
    [],
  );

  const fetchSunatLogs = useCallback(async () => {
    setSunatLogsLoading(true);
    try {
      const data = await getCompanySunatTransmissions(company.id);
      setSunatLogs(data);
    } catch (error) {
      console.error("No se pudieron cargar los envíos SUNAT", error);
      toast.error("No se pudieron cargar los envíos SUNAT");
      setSunatLogs([]);
    } finally {
      setSunatLogsLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    setSunatLogsLoading(true);
    fetchSunatLogs();
  }, [fetchSunatLogs]);

  const fetchSunatPdfs = useCallback(async () => {
    setSunatPdfsLoading(true);
    try {
      const list = await getSunatStoredPdfs();
      setSunatPdfs(list.filter((item) => item.companyId === company.id));
    } catch (error) {
      console.error("No se pudieron cargar los PDF almacenados", error);
      toast.error("No se pudieron cargar los PDF almacenados");
      setSunatPdfs([]);
    } finally {
      setSunatPdfsLoading(false);
    }
  }, [company.id]);

  useEffect(() => {
    fetchSunatPdfs();
  }, [fetchSunatPdfs]);

  const handleBasicChange =
    (field: keyof UpdateCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleLimitedTextChange =
    (field: NameField) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const limited = event.target.value.slice(0, MAX_NAME_LENGTH);
      updateFormState((prev) => ({
        ...prev,
        [field]: limited,
      }));
    };

  const handleRucChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, RUC_MAX_LENGTH);
    updateFormState((prev) => ({
      ...prev,
      taxId: digits,
      sunatRuc: digits,
    }));
  };

  const environmentValue = (formState.sunatEnvironment ?? "BETA") as SunatEnvironment;

  const handleEnvironmentChange = (value: SunatEnvironment) => {
    updateFormState((prev) => ({
      ...prev,
      sunatEnvironment: value,
    }));
  };

  const sanitize = (value?: string | null) => {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  };

  const fileLabel = (value?: string | null) => {
    if (!value) {
      return "Sin archivo";
    }
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
      if (!file) {
        return;
      }
      setUploadingTarget(`${env}-${type}`);
      try {
        const updated = await uploadCompanySunatFile(company.id, {
          env,
          type,
          file,
        });
        setSunatPaths({
          betaCert: updated.sunatCertPathBeta ?? null,
          betaKey: updated.sunatKeyPathBeta ?? null,
          prodCert: updated.sunatCertPathProd ?? null,
          prodKey: updated.sunatKeyPathProd ?? null,
        });
        toast.success("Archivo SUNAT actualizado correctamente.");
        fetchSunatLogs();
        fetchSunatPdfs();
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        toast.error(message ?? "No se pudo subir el archivo.");
      } finally {
        setUploadingTarget(null);
        target.value = "";
      }
    };
    input.click();
  };

  const handleRetry = async (transmissionId: number) => {
    setRetryingId(transmissionId);
    try {
      await retrySunatTransmission(transmissionId);
      toast.success("Reintento iniciado.");
      fetchSunatLogs();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      toast.error(message || "No se pudo reintentar el envío.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissionErrors = validateCompanyForm(formState);
    setFieldErrors(submissionErrors);
    const hasErrors = Object.values(submissionErrors).some((value) => Boolean(value));
    if (hasErrors) {
      toast.error("Corrige los campos marcados antes de guardar.");
      return;
    }
    startTransition(async () => {
      try {
        await updateCompany(company.id, {
          name: formState.name,
          status: formState.status,
          sunatEnvironment: environmentValue,
          legalName: sanitize(formState.legalName),
          taxId: sanitize(formState.taxId),
          sunatRuc: sanitize(formState.sunatRuc),
          sunatBusinessName: sanitize(formState.sunatBusinessName),
          sunatAddress: sanitize(formState.sunatAddress),
          sunatPhone: sanitize(formState.sunatPhone),
          sunatSolUserBeta: sanitize(formState.sunatSolUserBeta),
          sunatSolPasswordBeta: sanitize(formState.sunatSolPasswordBeta),
          sunatSolUserProd: sanitize(formState.sunatSolUserProd),
          sunatSolPasswordProd: sanitize(formState.sunatSolPasswordProd),
        });
        await setTenantSelection({
          orgId: company.organization.id,
          companyId: company.id,
        });
        toast.success("Empresa actualizada correctamente.");
        router.push("/dashboard/tenancy/companies");
        router.refresh();
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        toast.error(message ?? "No se pudo actualizar la empresa. Inténtalo nuevamente.");
      }
    });
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Editar empresa
        </CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Los cambios afectarán únicamente a la organización{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {company.organization.name}
          </span>
          .
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <section className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Nombre comercial</Label>
              <Input
                id="company-name"
                value={formState.name ?? ""}
                onChange={handleLimitedTextChange("name")}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={Boolean(fieldErrors.name)}
                required
                placeholder="Mi Empresa S.A."
                disabled={isPending}
              />
              {fieldErrors.name ? (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-legal-name">Razón social</Label>
              <Input
                id="company-legal-name"
                value={formState.legalName ?? ""}
                onChange={handleLimitedTextChange("legalName")}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={Boolean(fieldErrors.legalName)}
                placeholder="Mi Empresa Sociedad Anónima"
                disabled={isPending}
              />
              {fieldErrors.legalName ? (
                <p className="text-xs text-destructive">{fieldErrors.legalName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-tax-id">RUC / NIT</Label>
              <Input
                id="company-tax-id"
                value={formState.taxId ?? ""}
                onChange={handleRucChange}
                inputMode="numeric"
                pattern="\\d{11}"
                maxLength={RUC_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.taxId)}
                placeholder="Ingrese el número de identificación fiscal"
                disabled={isPending}
              />
              {fieldErrors.taxId ? (
                <p className="text-xs text-destructive">{fieldErrors.taxId}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Debe contener 11 dígitos numéricos.</p>
              )}
            </div>
          </section>

          <Separator />

          <section className="space-y-1.5">
            <Label htmlFor="company-status">Estado</Label>
            <Input
              id="company-status"
              value={formState.status ?? ""}
              onChange={handleBasicChange("status")}
              placeholder="ACTIVE"
              disabled={isPending}
            />
          </section>

          <Separator />

          <section className="space-y-5">
            <div className="space-y-1.5">
              <Label>Ambiente SUNAT activo</Label>
              <Select
                value={environmentValue}
                onValueChange={(value) => handleEnvironmentChange(value as SunatEnvironment)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BETA">BETA (Pruebas)</SelectItem>
                  <SelectItem value="PROD">PROD (Producción)</SelectItem>
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
                pattern="\\d{11}"
                maxLength={RUC_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.sunatRuc)}
                placeholder="20123456789"
                disabled={isPending}
              />
              {fieldErrors.sunatRuc ? (
                <p className="text-xs text-destructive">{fieldErrors.sunatRuc}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Se sincroniza automáticamente con el RUC principal.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sunat-business-name">Nombre de la empresa en comprobante</Label>
              <Input
                id="sunat-business-name"
                value={formState.sunatBusinessName ?? ""}
                onChange={handleLimitedTextChange("sunatBusinessName")}
                maxLength={MAX_NAME_LENGTH}
                aria-invalid={Boolean(fieldErrors.sunatBusinessName)}
                placeholder="Ej. Tecnología Informática EIRL"
                disabled={isPending}
              />
              {fieldErrors.sunatBusinessName ? (
                <p className="text-xs text-destructive">{fieldErrors.sunatBusinessName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sunat-address">Dirección fiscal para comprobante</Label>
              <Input
                id="sunat-address"
                value={formState.sunatAddress ?? ""}
                onChange={handleBasicChange("sunatAddress")}
                placeholder="Av. Principal 123 - Distrito"
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sunat-phone">Teléfono</Label>
              <Input
                id="sunat-phone"
                value={formState.sunatPhone ?? ""}
                onChange={handleBasicChange("sunatPhone")}
                placeholder="+51 999 999 999"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Credenciales BETA (Pruebas)</p>
                  <p className="text-xs text-muted-foreground">
                    Usadas para enviar comprobantes al entorno e-beta de SUNAT.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="sunat-beta-user">Usuario SOL</Label>
                    <Input
                      id="sunat-beta-user"
                      value={formState.sunatSolUserBeta ?? ""}
                      onChange={handleBasicChange("sunatSolUserBeta")}
                      placeholder="MODDATOS"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sunat-beta-password">Clave SOL</Label>
                    <Input
                      id="sunat-beta-password"
                      type="password"
                      value={formState.sunatSolPasswordBeta ?? ""}
                      onChange={handleBasicChange("sunatSolPasswordBeta")}
                      placeholder="********"
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificado</p>
                    <p className="text-sm font-medium truncate">{fileLabel(sunatPaths.betaCert)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || uploadingTarget === "beta-cert"}
                      onClick={() => handleSunatUpload("beta", "cert")}
                    >
                      {uploadingTarget === "beta-cert" ? "Subiendo..." : "Subir certificado"}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Clave privada</p>
                    <p className="text-sm font-medium truncate">{fileLabel(sunatPaths.betaKey)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || uploadingTarget === "beta-key"}
                      onClick={() => handleSunatUpload("beta", "key")}
                    >
                      {uploadingTarget === "beta-key" ? "Subiendo..." : "Subir clave"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Credenciales PRODUCCIÓN</p>
                  <p className="text-xs text-muted-foreground">
                    Se utilizan para el envío oficial a la SUNAT.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="sunat-prod-user">Usuario SOL</Label>
                    <Input
                      id="sunat-prod-user"
                      value={formState.sunatSolUserProd ?? ""}
                      onChange={handleBasicChange("sunatSolUserProd")}
                      placeholder="EMPRESA1"
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="sunat-prod-password">Clave SOL</Label>
                    <Input
                      id="sunat-prod-password"
                      type="password"
                      value={formState.sunatSolPasswordProd ?? ""}
                      onChange={handleBasicChange("sunatSolPasswordProd")}
                      placeholder="********"
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Certificado</p>
                    <p className="text-sm font-medium truncate">{fileLabel(sunatPaths.prodCert)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || uploadingTarget === "prod-cert"}
                      onClick={() => handleSunatUpload("prod", "cert")}
                    >
                      {uploadingTarget === "prod-cert" ? "Subiendo..." : "Subir certificado"}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Clave privada</p>
                    <p className="text-sm font-medium truncate">{fileLabel(sunatPaths.prodKey)}</p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending || uploadingTarget === "prod-key"}
                      onClick={() => handleSunatUpload("prod", "key")}
                    >
                      {uploadingTarget === "prod-key" ? "Subiendo..." : "Subir clave"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <Separator />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold">Envios SUNAT</p>
                <p className="text-xs text-muted-foreground">
                  Historial de envíos electrónicos realizados para esta empresa.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              {sunatLogsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando envíos...</div>
              ) : sunatLogs.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Aún no se registran envíos SUNAT para esta empresa.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sunatLogs.map((log) => (
                    <div key={log.id} className="p-4 flex flex-col gap-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-semibold">
                            {log.documentType?.toUpperCase()}{" "}
                            {(log.serie ?? "----") + "-" + (log.correlativo ?? "----")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("es-PE", { hour12: false })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {renderSunatStatusBadge(log.status)}
                          {log.status !== "SENT" && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={retryingId === log.id}
                              onClick={() => handleRetry(log.id)}
                            >
                              {retryingId === log.id ? "Reintentando..." : "Reintentar"}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Ambiente:{" "}
                          <span className="font-medium">
                            {log.environment === "PROD" ? "Producción" : "Beta"}
                          </span>
                        </span>
                        {log.ticket ? <span>Ticket: {log.ticket}</span> : null}
                        {log.zipFilePath ? <span>ZIP: {log.zipFilePath.split(/[/\\]/).pop()}</span> : null}
                        {log.errorMessage ? (
                          <span className="text-red-600 dark:text-red-400">
                            Error: {log.errorMessage}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">PDF almacenados</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">Archivos PDF registrados para los comprobantes de esta empresa.</p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700">
            {sunatPdfsLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Cargando PDFs...</div>
            ) : sunatPdfs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Aún no se registran PDFs para esta empresa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Archivo</th>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sunatPdfs.map((pdf) => {
                      const downloadUrl = `${BACKEND_URL}/api/sunat/pdf/${encodeURIComponent(pdf.type)}/${encodeURIComponent(pdf.filename)}`;
                      return (
                        <tr key={pdf.id}>
                          <td className="px-3 py-2 capitalize">{pdf.type}</td>
                          <td className="px-3 py-2 break-all">{pdf.filename}</td>
                          <td className="px-3 py-2">
                            {new Date(pdf.createdAt).toLocaleString("es-PE", { hour12: false })}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button asChild variant="outline" size="sm">
                              <a href={downloadUrl} target="_blank" rel="noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                Descargar
                              </a>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/tenancy/companies")}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
  const renderSunatStatusBadge = (status: string) => {
    const normalized = status.toUpperCase();
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    if (normalized === "SENT") {
      return <span className={`${base} bg-emerald-100 text-emerald-800`}>ENVIADO</span>;
    }
    if (normalized === "FAILED") {
      return <span className={`${base} bg-red-100 text-red-800`}>FALLIDO</span>;
    }
    if (normalized === "SENDING") {
      return <span className={`${base} bg-blue-100 text-blue-800`}>ENVIANDO</span>;
    }
    return <span className={`${base} bg-slate-100 text-slate-800`}>{normalized}</span>;
  };
