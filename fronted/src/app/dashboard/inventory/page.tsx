"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Filter, Tags, CalendarDays, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { columns } from "./columns"; // Importar las columnas definidas
import { getAllPurchasePrices, getInventoryWithCurrency } from "./inventory.api";
import { DataTable } from "./data-table";
import { CreateTemplateDialog } from "./create-template-dialog";
import { authFetch } from "@/utils/auth-fetch";

interface InventoryItem {
  id: number;
  product: {
    name: string;
    category: string;
  };
  stock: number;
  createdAt: Date;
  updateAt: Date;
  tipoMoneda: string;
  stockByCurrency: {
    USD: number;
    PEN: number;
  }; // Nuevo campo para el desglose por moneda
  storeOnInventory: {
    id: number;
    stock: number;
    createdAt: Date;
    updatedAt: Date;
    store: {
      name: string;
    };
  }[];
  serialNumbers: string[];
}

type SortMode = "created" | "updated";

interface FilterControlsProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  inStockOnly: boolean;
  onInStockToggle: (value: boolean) => void;
}

function FilterControls({ sortMode, onSortChange, inStockOnly, onInStockToggle }: FilterControlsProps) {
  const baseButtonClasses =
    "flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ordenar por
        </span>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={cn(
              baseButtonClasses,
              sortMode === "updated"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-foreground"
            )}
            onClick={() => onSortChange("updated")}
          >
            <div className="flex size-9 items-center justify-center rounded-full border bg-background">
              <Clock className="size-4" />
            </div>
            <div className="space-y-1">
              <span className="font-medium leading-none">Última actualización</span>
              <p className="text-sm text-muted-foreground">
                Ordena por la fecha de modificación más reciente.
              </p>
            </div>
          </button>
          <button
            type="button"
            className={cn(
              baseButtonClasses,
              sortMode === "created"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-foreground"
            )}
            onClick={() => onSortChange("created")}
          >
            <div className="flex size-9 items-center justify-center rounded-full border bg-background">
              <CalendarDays className="size-4" />
            </div>
            <div className="space-y-1">
              <span className="font-medium leading-none">Último ingreso</span>
              <p className="text-sm text-muted-foreground">
                Prioriza los productos agregados recientemente.
              </p>
            </div>
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4">
        <div>
          <Label htmlFor="in-stock-only" className="text-sm font-medium">
            Solo productos en stock
          </Label>
          <p className="text-sm text-muted-foreground">
            Oculta los artículos sin unidades disponibles.
          </p>
        </div>
        <Switch id="in-stock-only" checked={inStockOnly} onCheckedChange={onInStockToggle} />
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("created");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [metrics, setMetrics] = useState<{
    totalProcessed: number;
    failedExtractions: number;
    averageConfidence: number | null;
    lowConfidenceSamples: Array<{ id: number; providerId?: number | null; mlConfidence: number }>;
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<{
    failureAlerts: Array<{ id: number; sampleId: number; template: string | null; message: string; createdAt: string }>;
    reviewDueTemplates: Array<{ id: number; documentType: string; providerName: string; updatedAt: string }>;
  } | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const { selection, version, loading: tenantLoading } = useTenantSelection();
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  );


  useEffect(() => {
    if (tenantLoading) {
      return;
    }
    if (!selection.orgId || !selection.companyId) {
      return;
    }

    let cancelled = false;

    const loadInventory = async () => {
      setLoading(true);
      setInventory([]);
      setBaseInventory([]);

      try {
        const [inventoryData, purchasePrices] = await Promise.all([
          getInventoryWithCurrency(), // Llama al endpoint para obtener el inventario con desglose por moneda
          getAllPurchasePrices(), // Llama al endpoint para obtener los precios de compra
        ]);

        if (cancelled) {
          return;
        }

        if (!Array.isArray(inventoryData)) {
          throw new Error("Los datos del inventario no son validos");
        }

        const priceMap = (Array.isArray(purchasePrices) ? purchasePrices : []).reduce((acc: any, price: any) => {
          acc[price.productId] = {
            highestPurchasePrice: price.highestPurchasePrice,
            lowestPurchasePrice: price.lowestPurchasePrice,
          };
          return acc;
        }, {});

        const groupedData = Object.values(
          inventoryData.reduce((acc: any, item: any) => {
            const productName = item.product.name;

            if (!acc[productName]) {
              acc[productName] = {
                id: item.product.id,
                product: {
                  ...item.product,
                  category: item.product.category.name,
                },
                stock: 0,
                stockByCurrency: { USD: 0, PEN: 0 }, // Desglose por moneda
                createdAt: item.createdAt,
                updateAt: item.updatedAt,
                storeOnInventory: [],
                serialNumbers: [],
                highestPurchasePrice: priceMap[item.product.id]?.highestPurchasePrice || 0, // Precio mas alto
                lowestPurchasePrice: priceMap[item.product.id]?.lowestPurchasePrice || 0, // Precio mas bajo
              };
            }

            acc[productName].stock += item.storeOnInventory.reduce(
              (total: number, store: any) => total + store.stock,
              0
            );

            item.stockByStore.forEach((store: any) => {
              acc[productName].stockByCurrency.USD += store.stockByCurrency.USD;
              acc[productName].stockByCurrency.PEN += store.stockByCurrency.PEN;
            });

            acc[productName].storeOnInventory.push(...item.storeOnInventory);

            item.entryDetails?.forEach((detail: any) => {
              const series = detail.series?.map((s: any) => s.serial) || [];
              acc[productName].serialNumbers.push(...series);
            });

            const latestUpdateAt = item.storeOnInventory.reduce(
              (latest: Date, store: any) =>
                new Date(store.updatedAt) > new Date(latest) ? new Date(store.updatedAt) : latest,
              new Date(acc[productName].updateAt)
            );

            acc[productName].updateAt = latestUpdateAt;

            return acc;
          }, {})
        );

        const sortedData = groupedData.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (cancelled) {
          return;
        }

        setBaseInventory(groupedData as InventoryItem[]);
        setInventory(sortedData as InventoryItem[]);
      } catch (error) {
        console.error("Error al obtener el inventario:", error);
        if (!cancelled) {
          toast.error("Error al obtener el inventario");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [tenantLoading, selectionKey]);

  useEffect(() => {
    let canceled = false;
    const loadMetrics = async () => {
      setMetricsError(null);
      setMetricsLoading(true);
      try {
        const response = await authFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"}/api/invoice-templates/metrics-public`);
        if (!response.ok) {
          throw new Error("No se pudieron cargar las métricas");
        }
        const data = await response.json();
        if (!canceled) {
          setMetrics(data);
        }
      } catch (error: any) {
        console.error("Error al cargar métricas de facturas:", error);
        if (!canceled) {
          setMetricsError(error.message || "No se pudo obtener métricas");
        }
      } finally {
        if (!canceled) {
          setMetricsLoading(false);
        }
      }
    };
    if (!tenantLoading && selection.orgId && selection.companyId) {
      void loadMetrics();
    }
    return () => {
      canceled = true;
    };
  }, [tenantLoading, selectionKey, selection.orgId, selection.companyId]);

  useEffect(() => {
    if (tenantLoading) {
      return;
    }

    let canceled = false;
    const loadAlerts = async () => {
      setAlertsLoading(true);
      setAlertsError(null);
      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000"}/api/invoice-templates/alerts`,
        );
        if (!response.ok) {
          const errorText = await response.text().catch(() => null);
          console.error("alerts fetch error body:", errorText);
          throw new Error(errorText || "No se pudieron cargar las alertas");
        }
        const data = await response.json();
        if (!canceled) {
          setAlerts(data);
        }
      } catch (error: any) {
        console.error("Error al cargar alertas:", error);
        if (!canceled) {
          setAlertsError(error.message || "No se pudieron obtener alertas");
        }
      } finally {
        if (!canceled) {
          setAlertsLoading(false);
        }
      }
    };
    void loadAlerts();
    return () => {
      canceled = true;
    };
  }, [tenantLoading, selectionKey]);


  // Aplicar orden y filtro según controles
  useEffect(() => {
    let data = [...baseInventory];

    if (inStockOnly) {
      data = data.filter((item) => (item?.stock ?? 0) > 0);
    }

    if (sortMode === "updated") {
      data.sort(
        (a: any, b: any) => new Date(b.updateAt).getTime() - new Date(a.updateAt).getTime()
      );
    } else {
      data.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    setInventory(data);
  }, [baseInventory, sortMode, inStockOnly]);
  

  if (loading) {
    return <div className="px-4">Cargando inventario...</div>;
  }

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b px-5 pb-5 pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Inventario General</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Monitorea existencias, números de serie y precios en tiempo real.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="inline-flex w-full items-center justify-center gap-2 sm:hidden"
                    >
                      <Filter className="size-4" />
                      <span>Filtros</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="sm:hidden">
                    <SheetHeader>
                      <SheetTitle>Filtros de inventario</SheetTitle>
                      <SheetDescription>
                        Ajusta la visualización para encontrar productos rápidamente.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="px-1 pb-6">
                      <FilterControls
                        sortMode={sortMode}
                        onSortChange={setSortMode}
                        inStockOnly={inStockOnly}
                        onInStockToggle={(value) => setInStockOnly(!!value)}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                <CreateTemplateDialog
                  organizationId={selection?.organizationId ?? null}
                  companyId={selection?.companyId ?? null}
                  sampleId={null}
                />
                <Button
                  asChild
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Link href="/dashboard/inventory/labels">
                    <Tags className="size-4" />
                    <span>Generar etiquetas</span>
                  </Link>
                </Button>
        </div>
        {metrics && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="text-xs uppercase text-muted-foreground">Facturas procesadas</p>
              <p className="text-3xl font-semibold">{metrics.totalProcessed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Fallos: {(metrics.failedExtractions / Math.max(metrics.totalProcessed, 1) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="text-xs uppercase text-muted-foreground">Confianza promedio</p>
              <p className="text-3xl font-semibold">
                {metrics.averageConfidence !== null
                  ? `${(metrics.averageConfidence * 100).toFixed(1)}%`
                  : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.lowConfidenceSamples.length} muestras{' '}
                <span className="text-xs text-destructive">baja confianza</span>
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <p className="text-xs uppercase text-muted-foreground">Alertas</p>
              {metrics.lowConfidenceSamples.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {metrics.lowConfidenceSamples.slice(0, 3).map((sample) => (
                    <li key={sample.id}>
                      <span className="font-semibold text-destructive">Muestra #{sample.id}</span>{' '}
                      ({sample.mlConfidence.toFixed(2)})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sin alertas</p>
              )}
            </div>
          </div>
        )}
        {alerts && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">Alertas recientes</p>
                <span className="text-xs text-muted-foreground">
                  {alerts.failureAlerts.length} eventos
                </span>
              </div>
              {alerts.failureAlerts.length > 0 ? (
                <ul className="mt-2 text-xs space-y-2">
                  {alerts.failureAlerts.map((alert) => (
                    <li key={alert.id} className="rounded border px-2 py-1">
                      <p className="font-semibold text-destructive">
                        #{alert.sampleId} · {alert.template ?? "Sin plantilla"}
                      </p>
                      <p>{alert.message}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No hay errores recientes.</p>
              )}
            </div>
            <div className="rounded-lg border bg-background p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-muted-foreground">Plantillas por revisión</p>
                <span className="text-xs text-muted-foreground">
                  {alerts.reviewDueTemplates.length} entradas
                </span>
              </div>
              {alerts.reviewDueTemplates.length > 0 ? (
                <ul className="mt-2 text-xs space-y-2">
                  {alerts.reviewDueTemplates.map((template) => (
                    <li key={template.id} className="rounded border px-2 py-1">
                      <p className="font-semibold">{template.documentType}</p>
                      <p>{template.providerName || <span className="text-muted-foreground">Proveedor pendiente</span>}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Última actualización: {new Date(template.updatedAt).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No hay plantillas pendientes.</p>
              )}
            </div>
          </div>
        )}
        </div>
            <div className="hidden border-b px-5 py-4 sm:block">
              <FilterControls
                sortMode={sortMode}
                onSortChange={setSortMode}
                inStockOnly={inStockOnly}
                onInStockToggle={(value) => setInStockOnly(!!value)}
              />
            </div>
            <div className="px-2 pb-6 sm:px-5">
              <div className="overflow-x-auto">
                <DataTable columns={columns} data={inventory} inStockOnly={inStockOnly}></DataTable>
              </div>
            </div>
          </div>
        </div>
      </section>
   </>
  );
}
