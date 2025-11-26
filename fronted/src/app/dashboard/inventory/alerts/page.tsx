"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTenantSelection } from "@/context/tenant-selection-context";
import {
  getInventoryAlerts,
  getInventoryMetrics,
  getInventoryAlertSummary,
  reviewTemplateAlert,
  type InventoryAlertSummary,
  type InventoryAlertsPayload,
} from "../inventory.api";

interface InventoryMetrics {
  totalProcessed: number;
  failedExtractions: number;
  averageConfidence: number | null;
  lowConfidenceSamples: Array<{ id: number; providerId?: number | null; mlConfidence: number }>;
}

export default function InventoryAlertsPage() {
  const { selection, version, loading: tenantLoading } = useTenantSelection();
  const tenantReady = !tenantLoading && !!selection.orgId && !!selection.companyId;
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  );

  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlertsPayload | null>(null);
  const [summary, setSummary] = useState<InventoryAlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerIssue, setHeaderIssue] = useState<string | null>(null);
  const [reviewingTemplateId, setReviewingTemplateId] = useState<number | null>(null);

  const fetchAlertsData = useCallback(async () => {
    if (!tenantReady || !selection.orgId || !selection.companyId) {
      setError("Selecciona un tenant para consultar alertas.");
      return;
    }

    setLoading(true);
    setError(null);
    setHeaderIssue(null);

    try {
      const [metricsResponse, alertsResponse, summaryResponse] = await Promise.all([
        getInventoryMetrics({ organizationId: selection.orgId, companyId: selection.companyId }),
        getInventoryAlerts({ organizationId: selection.orgId, companyId: selection.companyId }),
        getInventoryAlertSummary({ organizationId: selection.orgId, companyId: selection.companyId }),
      ]);

      setMetrics(metricsResponse);
      setAlerts(alertsResponse);
      setSummary(summaryResponse);
    } catch (err: any) {
      const message = err?.message || "No se pudieron cargar las alertas.";
      setError(message);
      if (message.includes("Validation failed")) {
        setHeaderIssue(
          "No se pudo validar el tenant (x-org-id/x-company-id). Revisa la seleccion o las cabeceras.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tenantReady, selection.orgId, selection.companyId]);

  useEffect(() => {
    if (!tenantReady) {
      return;
    }
    void fetchAlertsData();
  }, [tenantReady, selectionKey, fetchAlertsData]);

  const handleTemplateReview = useCallback(
    async (templateId: number) => {
      try {
        setError(null);
        setReviewingTemplateId(templateId);
        await reviewTemplateAlert(templateId);
        await fetchAlertsData();
      } catch (err: any) {
        const message = err?.message || "No se pudo marcar la plantilla como revisada.";
        setError(message);
      } finally {
        setReviewingTemplateId(null);
      }
    },
    [fetchAlertsData],
  );

  return (
    <section className="py-4 sm:py-6">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Alertas de inventario</h1>
            <p className="text-sm text-muted-foreground">
              Revisa metricas de extraccion y plantillas que necesitan atencion.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="outline">
              <Link href="/dashboard/inventory">
                <ArrowLeft className="mr-2 size-4" />
                Volver a inventario
              </Link>
            </Button>
            <Button
              type="button"
              className="inline-flex items-center gap-2"
              onClick={() => fetchAlertsData()}
              disabled={loading || !tenantReady}
            >
              <RefreshCw className="size-4" />
              Actualizar
            </Button>
          </div>
        </div>

        {headerIssue && (
          <div className="mb-4 rounded border border-destructive/60 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {headerIssue}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-destructive/60 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
            Cargando informacion de alertas...
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {metrics && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase text-muted-foreground">Facturas procesadas</p>
                  <p className="text-3xl font-semibold">{metrics.totalProcessed.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Fallos: {(metrics.failedExtractions / Math.max(metrics.totalProcessed, 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase text-muted-foreground">Confianza promedio</p>
                  <p className="text-3xl font-semibold">
                    {metrics.averageConfidence !== null ? `${(metrics.averageConfidence * 100).toFixed(1)}%` : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.lowConfidenceSamples.length} muestras <span className="text-xs text-destructive">baja confianza</span>
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <p className="text-xs uppercase text-muted-foreground">Alertas</p>
                  {metrics.lowConfidenceSamples.length > 0 ? (
                    <ul className="text-xs space-y-1">
                      {metrics.lowConfidenceSamples.slice(0, 3).map((sample) => (
                        <li key={sample.id}>
                          <span className="font-semibold text-destructive">Muestra #{sample.id}</span> ({sample.mlConfidence.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin alertas</p>
                  )}
                </div>
              </div>
            )}

            {summary && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase text-muted-foreground">Fallos por proveedor</p>
                    <span className="text-xs text-muted-foreground">{summary.providersOverThreshold.length} proveedores</span>
                  </div>
                  {summary.providersOverThreshold.length > 0 ? (
                    <ul className="mt-2 text-xs space-y-2">
                      {summary.providersOverThreshold.map((provider) => (
                        <li key={provider.provider} className="rounded border px-2 py-1">
                          <p className="font-semibold">{provider.provider}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {provider.failureCount} fallos - {new Date(provider.lastFailureAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Ningun proveedor supera el umbral configurado.</p>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase text-muted-foreground">Plantillas pendientes</p>
                    <span className="text-xs text-muted-foreground">{summary.reviewDueCount} plantillas</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Las plantillas se marcan como pendientes cuando superan el periodo de revision configurado.
                  </p>
                </div>
              </div>
            )}

            {alerts && (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase text-muted-foreground">Alertas recientes</p>
                      <span className="text-xs text-muted-foreground">{alerts.failureAlerts.length} eventos</span>
                    </div>
                    {alerts.failureAlerts.length > 0 ? (
                      <ul className="mt-2 text-xs space-y-2">
                        {alerts.failureAlerts.map((alert) => {
                          const providerName =
                            alert.providerName ??
                            (alert.metadata && typeof alert.metadata === "object"
                              ? ((alert.metadata as Record<string, unknown>).providerName as string | undefined)
                              : undefined);
                          return (
                            <li key={alert.id} className="rounded border px-2 py-1">
                              <p className="font-semibold text-destructive">
                                {alert.alertType === "PROVIDER_FAILURE"
                                  ? `Proveedor ${providerName ?? "general"}`
                                  : alert.alertType === "CONFIDENCE_DROP"
                                    ? "Caida de confianza"
                                    : alert.alertType}
                              </p>
                              <p>{alert.message}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(alert.createdAt).toLocaleString()} - {alert.status}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No hay errores recientes.</p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase text-muted-foreground">Plantillas por revision</p>
                      <span className="text-xs text-muted-foreground">{alerts.reviewDueTemplates.length} entradas</span>
                    </div>
                    {alerts.reviewDueTemplates.length > 0 ? (
                      <ul className="mt-2 text-xs space-y-2">
                        {alerts.reviewDueTemplates.map((template) => (
                          <li key={template.id} className="rounded border px-3 py-2 space-y-1">
                            <div>
                              <p className="font-semibold">{template.documentType}</p>
                              <p>
                                {template.providerName || <span className="text-muted-foreground">Proveedor pendiente</span>}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] text-muted-foreground">
                                Ultima actualizacion: {new Date(template.updatedAt).toLocaleDateString()}
                              </p>
                              <Button
                                variant="secondary"
                                size="xs"
                                disabled={reviewingTemplateId === template.id || loading}
                                onClick={() => handleTemplateReview(template.id)}
                              >
                                {reviewingTemplateId === template.id ? "Guardando..." : "Marcar revisada"}
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No hay plantillas pendientes.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase text-muted-foreground">Historial de alertas</p>
                    <span className="text-xs text-muted-foreground">{alerts.recentEvents.length} registros</span>
                  </div>
                  {alerts.recentEvents.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm">
                      {alerts.recentEvents.map((event) => (
                        <li key={event.id} className="rounded border px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {event.alertType} - {event.status}
                          </p>
                          <p>{event.message}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Sin eventos registrados.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
