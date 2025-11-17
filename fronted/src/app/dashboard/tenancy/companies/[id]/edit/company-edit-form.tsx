"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  uploadCompanyLogo,
} from "../../../tenancy.api";
import { Download, Send } from "lucide-react";
import { setTenantSelection } from "@/utils/tenant-preferences";
import { BACKEND_URL, cn } from "@/lib/utils";

const MAX_NAME_LENGTH = 200;
const RUC_MAX_LENGTH = 11;
const NAME_FIELDS = ["name", "legalName", "sunatBusinessName"] as const;
const LOGS_PAGE_SIZE = 5;
const PDF_PAGE_SIZE = 10;
const LOGO_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const DEFAULT_PRIMARY_COLOR = "#0B2B66";
const DEFAULT_SECONDARY_COLOR = "#0F3B8C";

type NameField = (typeof NAME_FIELDS)[number];
type FieldErrors = Partial<Record<keyof UpdateCompanyPayload, string | null>>;

const validateCompanyForm = (state: UpdateCompanyPayload): FieldErrors => {
  const errors: FieldErrors = {};

  NAME_FIELDS.forEach((field) => {
    const raw = state[field] ?? "";
    const trimmed = raw.trim();
    if (trimmed.length > MAX_NAME_LENGTH) {
      errors[field] = `Máximo ${MAX_NAME_LENGTH} caracteres.`;
    }
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

  const validateColor = (rawValue: string | null | undefined, field: "primaryColor" | "secondaryColor") => {
    if (rawValue == null || rawValue.trim().length === 0) {
      return;
    }
    const normalized = rawValue.trim().startsWith("#") ? rawValue.trim() : `#${rawValue.trim()}`;
    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (!hexRegex.test(normalized)) {
      errors[field] = "Usa un color HEX válido (ej. #123ABC).";
    }
  };

  validateColor(state.primaryColor ?? null, "primaryColor");
  validateColor(state.secondaryColor ?? null, "secondaryColor");

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
    logoUrl: company.logoUrl ?? "",
    primaryColor: company.primaryColor ?? "",
    secondaryColor: company.secondaryColor ?? "",
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
  const [sunatLogQuery, setSunatLogQuery] = useState("");
  const [sunatLogStatusFilter, setSunatLogStatusFilter] = useState<"ALL" | string>("ALL");
  const [sunatLogEnvironmentFilter, setSunatLogEnvironmentFilter] = useState<"ALL" | SunatEnvironment>("ALL");
  const [sunatLogPage, setSunatLogPage] = useState(1);
  const [sunatPdfQuery, setSunatPdfQuery] = useState("");
  const [sunatPdfTypeFilter, setSunatPdfTypeFilter] = useState("ALL");
  const [sunatPdfPage, setSunatPdfPage] = useState(1);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const availableLogStatuses = useMemo(() => {
    const unique = new Set<string>();
    for (const log of sunatLogs) {
      if (log.status) {
        unique.add(log.status);
      }
    }
    return Array.from(unique).sort();
  }, [sunatLogs]);
  const availablePdfTypes = useMemo(() => {
    const unique = new Set<string>();
    for (const pdf of sunatPdfs) {
      if (pdf.type) {
        unique.add(pdf.type);
      }
    }
    return Array.from(unique).sort();
  }, [sunatPdfs]);
  const resolvedLogoUrl = useMemo(() => {
    const path = (formState.logoUrl ?? company.logoUrl ?? "").trim();
    if (!path) {
      return null;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const normalized = path.replace(/^\/+/, '');
    return `${BACKEND_URL.replace(/\/$/, "")}/${normalized}`;
  }, [company.logoUrl, formState.logoUrl]);
  const filteredSunatLogs = useMemo(() => {
    const query = sunatLogQuery.trim().toLowerCase();
    return sunatLogs.filter((log) => {
      const matchesQuery =
        !query ||
        [log.documentType, log.serie, log.correlativo, log.ticket, log.status, log.zipFilePath]
          .filter(Boolean)
          .some((value) => value!.toString().toLowerCase().includes(query));
      const matchesStatus = sunatLogStatusFilter === "ALL" || log.status === sunatLogStatusFilter;
      const matchesEnvironment =
        sunatLogEnvironmentFilter === "ALL" || log.environment === sunatLogEnvironmentFilter;
      return matchesQuery && matchesStatus && matchesEnvironment;
    });
  }, [sunatLogEnvironmentFilter, sunatLogQuery, sunatLogStatusFilter, sunatLogs]);
  const totalLogPages = Math.max(1, Math.ceil(filteredSunatLogs.length / LOGS_PAGE_SIZE) || 1);
  const paginatedSunatLogs = useMemo(
    () =>
      filteredSunatLogs.slice(
        (sunatLogPage - 1) * LOGS_PAGE_SIZE,
        (sunatLogPage - 1) * LOGS_PAGE_SIZE + LOGS_PAGE_SIZE,
      ),
    [filteredSunatLogs, sunatLogPage],
  );
  const filteredSunatPdfs = useMemo(() => {
    const query = sunatPdfQuery.trim().toLowerCase();
    return sunatPdfs.filter((pdf) => {
      const matchesQuery =
        !query ||
        [pdf.type, pdf.filename]
          .filter(Boolean)
          .some((value) => value!.toString().toLowerCase().includes(query));
      const matchesType = sunatPdfTypeFilter === "ALL" || pdf.type === sunatPdfTypeFilter;
      return matchesQuery && matchesType;
    });
  }, [sunatPdfQuery, sunatPdfTypeFilter, sunatPdfs]);
  const totalPdfPages = Math.max(1, Math.ceil(filteredSunatPdfs.length / PDF_PAGE_SIZE) || 1);
  const paginatedSunatPdfs = useMemo(
    () =>
      filteredSunatPdfs.slice(
        (sunatPdfPage - 1) * PDF_PAGE_SIZE,
        (sunatPdfPage - 1) * PDF_PAGE_SIZE + PDF_PAGE_SIZE,
      ),
    [filteredSunatPdfs, sunatPdfPage],
  );

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
  useEffect(() => {
    setSunatLogPage(1);
  }, [sunatLogEnvironmentFilter, sunatLogQuery, sunatLogStatusFilter]);
  useEffect(() => {
    if (sunatLogPage > totalLogPages) {
      setSunatLogPage(totalLogPages);
    }
  }, [sunatLogPage, totalLogPages]);
  useEffect(() => {
    setSunatPdfPage(1);
  }, [sunatPdfQuery, sunatPdfTypeFilter]);
  useEffect(() => {
    if (sunatPdfPage > totalPdfPages) {
      setSunatPdfPage(totalPdfPages);
    }
  }, [sunatPdfPage, totalPdfPages]);

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

  const inputValidationClass = (field: keyof UpdateCompanyPayload) =>
    fieldErrors[field] ? "border-destructive focus-visible:ring-destructive" : undefined;

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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
      setFormState((prev) => ({
        ...prev,
        logoUrl: updated.logoUrl ?? "",
      }));
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
    if (logoUploading) {
      return;
    }
    setLogoUploading(true);
    try {
      await updateCompany(company.id, { logoUrl: null });
      setFormState((prev) => ({
        ...prev,
        logoUrl: null,
      }));
      toast.success("Logo eliminado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el logo.";
      toast.error(message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleColorPickerChange =
    (field: "primaryColor" | "secondaryColor") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      updateFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleColorTextChange =
    (field: "primaryColor" | "secondaryColor") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFormState((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleClearColor =
    (field: "primaryColor" | "secondaryColor") => () => {
      updateFormState((prev) => ({
        ...prev,
        [field]: null,
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
          logoUrl: sanitize(formState.logoUrl),
          primaryColor: sanitize(formState.primaryColor),
          secondaryColor: sanitize(formState.secondaryColor),
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
                className={cn(inputValidationClass("name"))}
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
                className={cn(inputValidationClass("legalName"))}
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
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label>Colores del comprobante</Label>
              <p className="text-xs text-muted-foreground">
                Personaliza los colores de las bandas y encabezados del comprobante electrónico.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Color primario</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primary-color"
                    type="color"
                    className="h-10 w-10 cursor-pointer rounded border border-input"
                    value={formState.primaryColor && /^#[0-9A-Fa-f]+$/.test(formState.primaryColor) ? formState.primaryColor : DEFAULT_PRIMARY_COLOR}
                    onChange={handleColorPickerChange("primaryColor")}
                    disabled={isPending}
                  />
                  <Input
                    value={formState.primaryColor ?? ""}
                    onChange={handleColorTextChange("primaryColor")}
                    placeholder="#0B2B66"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleClearColor("primaryColor")}
                    disabled={isPending}
                  >
                    Restablecer
                  </Button>
                </div>
                {fieldErrors.primaryColor ? (
                  <p className="text-xs text-destructive">{fieldErrors.primaryColor}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Color secundario</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="secondary-color"
                    type="color"
                    className="h-10 w-10 cursor-pointer rounded border border-input"
                    value={formState.secondaryColor && /^#[0-9A-Fa-f]+$/.test(formState.secondaryColor) ? formState.secondaryColor : DEFAULT_SECONDARY_COLOR}
                    onChange={handleColorPickerChange("secondaryColor")}
                    disabled={isPending}
                  />
                  <Input
                    value={formState.secondaryColor ?? ""}
                    onChange={handleColorTextChange("secondaryColor")}
                    placeholder="#0F3B8C"
                    disabled={isPending}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleClearColor("secondaryColor")}
                    disabled={isPending}
                  >
                    Restablecer
                  </Button>
                </div>
                {fieldErrors.secondaryColor ? (
                  <p className="text-xs text-destructive">{fieldErrors.secondaryColor}</p>
                ) : null}
              </div>
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

          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label>Logo de la empresa</Label>
              <p className="text-xs text-muted-foreground">
                Usa un archivo en formato PNG o JPG (máximo 2 MB) para personalizar los comprobantes y reportes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed bg-muted/30">
                {resolvedLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedLogoUrl}
                    alt="Logo de la empresa"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-2">
                    Sin logo
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
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
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading
                      ? "Procesando..."
                      : resolvedLogoUrl
                        ? "Actualizar logo"
                        : "Subir logo"}
                  </Button>
                  {resolvedLogoUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={logoUploading}
                      onClick={handleRemoveLogo}
                    >
                      Quitar logo
                    </Button>
                  ) : null}
                </div>
                <span>Formatos admitidos: PNG o JPG. Tamaño máximo: 2 MB.</span>
              </div>
            </div>
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

            <div className="space-y-1.5">
              <Label htmlFor="sunat-business-name">Nombre de la empresa en comprobante</Label>
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
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-muted/40 px-4 py-3 text-sm dark:border-slate-800">
                <Input
                  value={sunatLogQuery}
                  onChange={(event) => setSunatLogQuery(event.target.value)}
                  placeholder="Buscar por serie, ticket o documento"
                  className="w-full flex-1 min-w-[180px]"
                />
                <Select value={sunatLogStatusFilter} onValueChange={(value) => setSunatLogStatusFilter(value as "ALL" | string)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los estados</SelectItem>
                    {availableLogStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={sunatLogEnvironmentFilter}
                  onValueChange={(value) =>
                    setSunatLogEnvironmentFilter(value as "ALL" | SunatEnvironment)
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Ambiente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos los ambientes</SelectItem>
                    <SelectItem value="BETA">Beta</SelectItem>
                    <SelectItem value="PROD">Producción</SelectItem>
                  </SelectContent>
                </Select>
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredSunatLogs.length} registros
                </span>
              </div>
              {sunatLogsLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Cargando envíos...</div>
              ) : filteredSunatLogs.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  {sunatLogs.length === 0
                    ? "Aún no se registran envíos SUNAT para esta empresa."
                    : "No se encontraron envíos con los filtros seleccionados."}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedSunatLogs.map((log) => (
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
                          {log.zipFilePath ? (
                            <span>ZIP: {log.zipFilePath.split(/[/\\]/).pop()}</span>
                          ) : null}
                          {log.errorMessage ? (
                            <span className="text-red-600 dark:text-red-400">
                              Error: {log.errorMessage}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-muted-foreground dark:border-slate-800">
                    <span>
                      Página {sunatLogPage} de {totalLogPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={sunatLogPage === 1}
                        onClick={() => setSunatLogPage((prev) => Math.max(1, prev - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={sunatLogPage >= totalLogPages}
                        onClick={() => setSunatLogPage((prev) => Math.min(totalLogPages, prev + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </>
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
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-muted/40 px-4 py-3 text-sm dark:border-slate-800">
              <Input
                value={sunatPdfQuery}
                onChange={(event) => setSunatPdfQuery(event.target.value)}
                placeholder="Buscar por nombre de archivo"
                className="w-full flex-1 min-w-[180px]"
              />
              <Select value={sunatPdfTypeFilter} onValueChange={setSunatPdfTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de comprobante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {availablePdfTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ml-auto text-xs text-muted-foreground">
                {filteredSunatPdfs.length} archivos
              </span>
            </div>
            {sunatPdfsLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Cargando PDFs...</div>
            ) : filteredSunatPdfs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                {sunatPdfs.length === 0
                  ? "Aún no se registran PDFs para esta empresa."
                  : "No se encontraron PDFs con los filtros seleccionados."}
              </div>
            ) : (
              <>
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
                      {paginatedSunatPdfs.map((pdf) => {
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-muted-foreground dark:border-slate-800">
                  <span>
                    Página {sunatPdfPage} de {totalPdfPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sunatPdfPage === 1}
                      onClick={() => setSunatPdfPage((prev) => Math.max(1, prev - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sunatPdfPage >= totalPdfPages}
                      onClick={() => setSunatPdfPage((prev) => Math.min(totalPdfPages, prev + 1))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </>
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
