"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Filter, Tags, CalendarDays, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { useTenantFeatures } from "@/context/tenant-features-context";
import { useInventoryColumns } from "./columns"; // Importar las columnas definidas
import {
  getAllPurchasePrices,
  getInventoryWithCurrency,
  getInventoryAlertSummary,
  type InventoryAlertSummary,
} from "./inventory.api";
import { DataTable } from "./data-table";
import { CreateTemplateDialog } from "./create-template-dialog";

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

type SortMode = "created" | "stock";
type MigrationFilter = "all" | "legacy" | "migrated";

interface FilterControlsProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  inStockOnly: boolean;
  onInStockToggle: (value: boolean) => void;
  migrationStatus: MigrationFilter;
  onMigrationChange: (value: MigrationFilter) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

function FilterControls({
  sortMode,
  onSortChange,
  inStockOnly,
  onInStockToggle,
  migrationStatus,
  onMigrationChange,
  dateRange,
  onDateRangeChange,
}: FilterControlsProps) {
  const baseButtonClasses =
    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:border-primary/60 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="rounded-xl border bg-muted/20 p-3 lg:col-span-7">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ordenar por
        </span>
        <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(220px,280px)]">
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
            <div className="flex size-8 items-center justify-center rounded-full border bg-background">
              <CalendarDays className="size-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-medium leading-none">Último ingreso</span>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Prioriza los productos agregados recientemente.
              </p>
            </div>
          </button>
          <button
            type="button"
            className={cn(
              baseButtonClasses,
              sortMode === "stock"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-foreground"
            )}
            onClick={() => onSortChange("stock")}
          >
            <div className="flex size-8 items-center justify-center rounded-full border bg-background">
              <TrendingUp className="size-4" />
            </div>
            <div className="space-y-0.5">
              <span className="font-medium leading-none">Mayor stock</span>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Muestra primero los productos con más unidades.
              </p>
            </div>
          </button>
          <div className="flex flex-col justify-center rounded-lg border border-dashed border-border/60 bg-background/60 px-3 py-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rango de fechas
            </Label>
            <CalendarDatePicker
              className="mt-1 h-9 w-full"
              variant="outline"
              date={dateRange || { from: undefined, to: undefined }}
              onDateSelect={onDateRangeChange}
            />
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-muted/20 p-3 lg:col-span-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Estado de migración
        </Label>
        <Select value={migrationStatus} onValueChange={onMigrationChange}>
          <SelectTrigger className="mt-2 w-full">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="legacy">Legacy</SelectItem>
            <SelectItem value="migrated">Migrados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3 lg:col-span-2">
        <div>
          <Label htmlFor="in-stock-only" className="text-sm font-medium">
            Solo en stock
          </Label>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Oculta sin unidades.
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
  const [migrationStatus, setMigrationStatus] = useState<MigrationFilter>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const { selection, version, loading: tenantLoading } = useTenantSelection();
  const selectionKey = useMemo(
    () => `${selection.companyId ?? "none"}-${version}`,
    [selection.companyId, version],
  );
  const [alertSummary, setAlertSummary] = useState<InventoryAlertSummary | null>(null);
  const { migration, productSchema } = useTenantFeatures();
  const pendingLegacyProducts = migration?.legacy ?? 0;
  const columns = useInventoryColumns({ productSchema });


  useEffect(() => {
    if (tenantLoading || !selection.companyId) {
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

  const tenantReady = !tenantLoading && !!selection.companyId;

  useEffect(() => {
    if (!tenantReady) {
      setAlertSummary(null);
      return;
    }

    let cancelled = false;
    const loadSummary = async () => {
        try {
          const summary = await getInventoryAlertSummary({
            companyId: selection.companyId ?? undefined,
          });
          if (!cancelled) {
            setAlertSummary(summary);
          }
      } catch (error) {
        console.error("Error al cargar resumen de alertas:", error);
        if (!cancelled) {
          setAlertSummary(null);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
    }, [tenantReady, selectionKey]);

  // Aplicar orden y filtro según controles
  useEffect(() => {
    let data = [...baseInventory];

    if (inStockOnly) {
      data = data.filter((item) => (item?.stock ?? 0) > 0);
    }

    if (migrationStatus !== "all") {
      data = data.filter((item) => {
        const attrs = item.product?.extraAttributes ?? null;
        const hasAttrs = !!attrs && Object.keys(attrs).length > 0;
        const migrated = item.product?.isVerticalMigrated === true;
        const legacy = item.product?.isVerticalMigrated === false || !hasAttrs;

        return migrationStatus === "legacy" ? legacy : migrated && hasAttrs;
      });
    }

    if (selectedDateRange?.from && selectedDateRange?.to) {
      const from = new Date(selectedDateRange.from);
      const to = new Date(selectedDateRange.to);
      to.setHours(23, 59, 59, 999);
      data = data.filter((item) => {
        const itemDate = new Date(item.createdAt);
        return itemDate >= from && itemDate <= to;
      });
    }

    if (sortMode === "stock") {
      data.sort((a: any, b: any) => (b.stock ?? 0) - (a.stock ?? 0));
    } else {
      data.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    setInventory(data);
  }, [baseInventory, sortMode, inStockOnly, migrationStatus, selectedDateRange]);
  

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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
                          migrationStatus={migrationStatus}
                          onMigrationChange={(value) => setMigrationStatus(value as MigrationFilter)}
                          dateRange={selectedDateRange}
                          onDateRangeChange={setSelectedDateRange}
                        />
                    </div>
                  </SheetContent>
                </Sheet>
                <CreateTemplateDialog
                  organizationId={selection?.orgId ?? null}
                  companyId={selection?.companyId ?? null}
                  sampleId={null}
                />
                <Button
                  asChild
                  variant={pendingLegacyProducts > 0 ? "destructive" : "outline"}
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Link href="/dashboard/products/migration">
                    <Tags className="size-4" />
                    <span>
                      {pendingLegacyProducts > 0
                        ? `Migrar productos (${pendingLegacyProducts})`
                        : "Asistente de migración"}
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Link href="/dashboard/inventory/labels">
                    <Tags className="size-4" />
                    <span>Generar etiquetas</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="secondary"
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                  disabled={!tenantReady}
                >
                  <Link href="/dashboard/inventory/alerts">
                    <Tags className="size-4" />
                    <span>Mostrar alertas</span>
                    {alertSummary?.badgeCount ? (
                      <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-destructive px-2 text-xs font-semibold text-destructive-foreground">
                        {alertSummary.badgeCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
        </div>
        </div>
            <div className="hidden border-b px-5 py-4 sm:block">
              <FilterControls
                sortMode={sortMode}
                onSortChange={setSortMode}
                inStockOnly={inStockOnly}
                onInStockToggle={(value) => setInStockOnly(!!value)}
                migrationStatus={migrationStatus}
                onMigrationChange={(value) => setMigrationStatus(value as MigrationFilter)}
                dateRange={selectedDateRange}
                onDateRangeChange={setSelectedDateRange}
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
