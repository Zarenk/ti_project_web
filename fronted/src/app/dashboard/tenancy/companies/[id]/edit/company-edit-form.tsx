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

import type { CompanyDetail, SunatEnvironment, SunatTransmission, UpdateCompanyPayload } from "../../../tenancy.api";
import { getCompanySunatTransmissions, retrySunatTransmission, updateCompany, uploadCompanySunatFile } from "../../../tenancy.api";
import { useEffect } from "react";
import { Send } from "lucide-react";
import { setTenantSelection } from "@/utils/tenant-preferences";

interface CompanyEditFormProps {
  company: CompanyDetail;
}

export function CompanyEditForm({
  company,
}: CompanyEditFormProps): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formState, setFormState] = useState<UpdateCompanyPayload>({
    name: company.name,
    legalName: company.legalName ?? "",
    taxId: company.taxId ?? "",
    status: company.status ?? "ACTIVE",
    sunatEnvironment: (company.sunatEnvironment ?? "BETA") as SunatEnvironment,
    sunatRuc: company.sunatRuc ?? "",
    sunatSolUserBeta: company.sunatSolUserBeta ?? "",
    sunatSolPasswordBeta: company.sunatSolPasswordBeta ?? "",
    sunatSolUserProd: company.sunatSolUserProd ?? "",
    sunatSolPasswordProd: company.sunatSolPasswordProd ?? "",
  });
  const [sunatPaths, setSunatPaths] = useState({
    betaCert: company.sunatCertPathBeta ?? null,
    betaKey: company.sunatKeyPathBeta ?? null,
    prodCert: company.sunatCertPathProd ?? null,
    prodKey: company.sunatKeyPathProd ?? null,
  });
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [sunatLogs, setSunatLogs] = useState<SunatTransmission[]>([]);
  const [sunatLogsLoading, setSunatLogsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);

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

  const handleChange = (field: keyof UpdateCompanyPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const environmentValue = (formState.sunatEnvironment ?? "BETA") as SunatEnvironment;

  const handleEnvironmentChange = (value: SunatEnvironment) => {
    setFormState((prev) => ({
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
      } catch (error: any) {
        toast.error(error?.message ?? "No se pudo subir el archivo.");
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
    } catch (error: any) {
      toast.error(error?.message || "No se pudo reintentar el envío.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        await updateCompany(company.id, {
          name: formState.name,
          status: formState.status,
          sunatEnvironment: environmentValue,
          legalName: sanitize(formState.legalName),
          taxId: sanitize(formState.taxId),
          sunatRuc: sanitize(formState.sunatRuc),
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
      } catch (error: any) {
        toast.error(
          error?.message ?? "No se pudo actualizar la empresa. Inténtalo nuevamente.",
        );
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
          <section className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="company-name">Nombre comercial</Label>
              <Input
                id="company-name"
                value={formState.name ?? ""}
                onChange={handleChange("name")}
                required
                placeholder="Mi Empresa S.A."
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-legal-name">Razón social</Label>
              <Input
                id="company-legal-name"
                value={formState.legalName ?? ""}
                onChange={handleChange("legalName")}
                placeholder="Mi Empresa Sociedad Anónima"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="company-tax-id">RUC / NIT</Label>
              <Input
                id="company-tax-id"
                value={formState.taxId ?? ""}
                onChange={handleChange("taxId")}
                placeholder="Ingrese el número de identificación fiscal"
                disabled={isPending}
              />
            </div>
          </section>

          <Separator />

          <section className="grid gap-2">
            <Label htmlFor="company-status">Estado</Label>
            <Input
              id="company-status"
              value={formState.status ?? ""}
              onChange={handleChange("status")}
              placeholder="ACTIVE"
              disabled={isPending}
            />
          </section>

          <Separator />

          <section className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="sunat-ruc">RUC utilizado para SUNAT</Label>
                <Input
                  id="sunat-ruc"
                  value={formState.sunatRuc ?? ""}
                  onChange={handleChange("sunatRuc")}
                  placeholder="20123456789"
                  disabled={isPending}
                />
              </div>
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
                      onChange={handleChange("sunatSolUserBeta")}
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
                      onChange={handleChange("sunatSolPasswordBeta")}
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
                      onChange={handleChange("sunatSolUserProd")}
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
                      onChange={handleChange("sunatSolPasswordProd")}
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
