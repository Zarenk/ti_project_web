"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Filter,
  Tags,
  CalendarDays,
  TrendingUp,
  Bell,
  ArrowRightLeft,
  MoreHorizontal,
  BookOpen,
  Store,
  PackagePlus,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { CalendarDatePicker } from "@/components/calendar-date-picker";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { useTenantFeatures } from "@/context/tenant-features-context";
import { useInventoryColumns } from "./columns";
import {
  getAllPurchasePrices,
  getInventoryWithCurrency,
  getInventoryAlertSummary,
  getCategoriesFromInventory,
  getAllStores,
  type InventoryAlertSummary,
} from "./inventory.api";
import { DataTable } from "./data-table";
import { CreateTemplateDialog } from "./create-template-dialog";
import { TablePageSkeleton } from "@/components/table-page-skeleton";
import OutOfStockDialog from "./data-table-components/OutOfStockDialog";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { INVENTORY_GUIDE_STEPS } from "./inventory-guide-steps";

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
  };
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

/* ─── Compact FilterControls (desktop: inline row, mobile: inside Sheet) ─── */

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
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {/* Sort toggle — segmented control */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 hidden text-xs font-medium text-muted-foreground lg:inline">Ordenar:</span>
        <div className="flex rounded-lg border p-0.5">
          <Button
            type="button"
            variant={sortMode === "created" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => onSortChange("created")}
          >
            <CalendarDays className="size-3.5" />
            <span className="hidden sm:inline">Reciente</span>
          </Button>
          <Button
            type="button"
            variant={sortMode === "stock" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => onSortChange("stock")}
          >
            <TrendingUp className="size-3.5" />
            <span className="hidden sm:inline">Stock</span>
          </Button>
        </div>
      </div>

      {/* Date range picker */}
      <CalendarDatePicker
        className="h-8 w-full text-xs sm:w-[240px]"
        variant="outline"
        date={dateRange || { from: undefined, to: undefined }}
        onDateSelect={onDateRangeChange}
      />

      {/* Migration status */}
      <Select value={migrationStatus} onValueChange={onMigrationChange}>
        <SelectTrigger className="h-8 w-full text-xs sm:w-[140px]">
          <SelectValue placeholder="Migración" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="legacy">Legacy</SelectItem>
          <SelectItem value="migrated">Migrados</SelectItem>
        </SelectContent>
      </Select>

      {/* In-stock toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="in-stock-only"
          checked={inStockOnly}
          onCheckedChange={onInStockToggle}
          className="scale-90"
        />
        <Label htmlFor="in-stock-only" className="cursor-pointer text-xs font-medium">
          Solo en stock
        </Label>
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

  // Lifted filter state (shared with DataTable)
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [storeOptions, setStoreOptions] = useState<{id:number; name:string}[]>([]);

  // OutOfStock dialog
  const [isOutOfStockDialogOpen, setIsOutOfStockDialogOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const open = searchParams?.get('outOfStock');
    if (open && (open === '1' || open.toLowerCase() === 'true')) {
      setIsOutOfStockDialogOpen(true);
    }
  }, [searchParams]);

  // Load categories and stores for filters
  useEffect(() => {
    async function loadCategories() {
      try {
        const categories = await getCategoriesFromInventory();
        setCategoryOptions(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Error al cargar las categorías:', error);
        setCategoryOptions([]);
      }
    }
    async function loadStores() {
      try {
        const stores = await getAllStores();
        setStoreOptions(Array.isArray(stores) ? stores : []);
      } catch (error) {
        console.error('Error al cargar las tiendas:', error);
        setStoreOptions([]);
      }
    }
    loadCategories();
    loadStores();
  }, []);


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
          getInventoryWithCurrency(),
          getAllPurchasePrices(),
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
            const productName = item.product?.name;
            if (!productName) return acc;

            if (!acc[productName]) {
              acc[productName] = {
                id: item.product.id,
                product: {
                  ...item.product,
                  category: item.product.category?.name ?? 'Sin categoría',
                },
                stock: 0,
                stockByCurrency: { USD: 0, PEN: 0 },
                createdAt: item.createdAt,
                updateAt: item.updatedAt,
                storeOnInventory: [],
                serialNumbers: [],
                highestPurchasePrice: priceMap[item.product.id]?.highestPurchasePrice || 0,
                lowestPurchasePrice: priceMap[item.product.id]?.lowestPurchasePrice || 0,
              };
            }

            const stores = Array.isArray(item.storeOnInventory) ? item.storeOnInventory : [];

            acc[productName].stock += stores.reduce(
              (total: number, store: any) => total + (store.stock ?? 0),
              0
            );

            (Array.isArray(item.stockByStore) ? item.stockByStore : []).forEach((store: any) => {
              acc[productName].stockByCurrency.USD += store.stockByCurrency?.USD ?? 0;
              acc[productName].stockByCurrency.PEN += store.stockByCurrency?.PEN ?? 0;
            });

            acc[productName].storeOnInventory.push(...stores);

            item.entryDetails?.forEach((detail: any) => {
              const series = detail.series?.map((s: any) => s.serial) || [];
              acc[productName].serialNumbers.push(...series);
            });

            if (stores.length > 0) {
              const latestUpdateAt = stores.reduce(
                (latest: Date, store: any) =>
                  new Date(store.updatedAt) > new Date(latest) ? new Date(store.updatedAt) : latest,
                new Date(acc[productName].updateAt)
              );
              acc[productName].updateAt = latestUpdateAt;
            }

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
    return <TablePageSkeleton filters={3} columns={5} rows={8} />;
  }

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <div className="rounded-2xl border bg-card shadow-sm">
            {/* ── Header: title + action buttons ─────────────────── */}
            <div className="flex flex-col gap-3 border-b px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Inventario General</h1>
                  <PageGuideButton steps={INVENTORY_GUIDE_STEPS} tooltipLabel="Guía del inventario" />
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Monitorea existencias, series y precios en tiempo real.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* ── Mobile: Botones de acción agrupados (Sin Stock + Por Tienda + Ingresar items) ── */}
                <div className="flex items-center gap-2 sm:hidden">
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                    onClick={() => setIsOutOfStockDialogOpen(true)}
                    title="Sin Stock"
                  >
                    <BookOpen className="size-3.5" />
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    className="h-8 w-8 bg-blue-600 text-white hover:bg-blue-700"
                    title="Por Tienda"
                  >
                    <Link href="/dashboard/inventory/products-by-store">
                      <Store className="size-3.5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    className="h-8 w-8 bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95"
                  >
                    <Link href="/dashboard/entries/new">
                      <PackagePlus className="size-4" />
                    </Link>
                  </Button>
                </div>

                {/* ── Mobile: Filtros sheet ── */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs sm:hidden"
                    >
                      <Filter className="size-3.5" />
                      Filtros
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

                {/* Mobile: dropdown for secondary actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/products/migration" className="gap-2">
                        <ArrowRightLeft className="size-4" />
                        {pendingLegacyProducts > 0
                          ? `Migrar productos (${pendingLegacyProducts})`
                          : "Asistente de migración"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/inventory/labels" className="gap-2">
                        <Tags className="size-4" />
                        Generar etiquetas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/inventory/alerts" className="gap-2">
                        <Bell className="size-4" />
                        Alertas
                        {alertSummary?.badgeCount ? (
                          <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                            {alertSummary.badgeCount}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Desktop: compact button row ──────────────────── */}
                <TooltipProvider delayDuration={300}>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <CreateTemplateDialog
                    organizationId={selection?.orgId ?? null}
                    companyId={selection?.companyId ?? null}
                    sampleId={null}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant={pendingLegacyProducts > 0 ? "destructive" : "outline"}
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Link href="/dashboard/products/migration">
                          <ArrowRightLeft className="size-3.5" />
                          <span className="hidden lg:inline">
                            {pendingLegacyProducts > 0
                              ? `Migrar (${pendingLegacyProducts})`
                              : "Migración"}
                          </span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Asistente de migración de productos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                      >
                        <Link href="/dashboard/inventory/labels">
                          <Tags className="size-3.5" />
                          <span className="hidden lg:inline">Etiquetas</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Generar etiquetas de productos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={!tenantReady}
                      >
                        <Link href="/dashboard/inventory/alerts">
                          <Bell className="size-3.5" />
                          <span className="hidden lg:inline">Alertas</span>
                          {alertSummary?.badgeCount ? (
                            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                              {alertSummary.badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Alertas de inventario</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-red-600 text-xs text-white hover:bg-red-700"
                        onClick={() => setIsOutOfStockDialogOpen(true)}
                      >
                        <BookOpen className="size-3.5" />
                        <span className="hidden lg:inline">Sin Stock</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Ver productos sin stock</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
                      >
                        <Link href="/dashboard/inventory/products-by-store">
                          <Store className="size-3.5" />
                          <span className="hidden lg:inline">Por Tienda</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Ver productos por tienda</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 gap-1.5 bg-emerald-600 text-xs text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:bg-emerald-500"
                      >
                        <Link href="/dashboard/entries/new">
                          <PackagePlus className="size-3.5" />
                          <span className="hidden lg:inline">Ingresar items</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Registrar entrada de inventario</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                </TooltipProvider>
              </div>
            </div>

            {/* ── Desktop filter bar (compact inline row) ─────── */}
            <div className="hidden border-b px-5 py-3 sm:block">
              <div className="flex flex-wrap items-center gap-3">
                {/* lg-only: search, category, store inline */}
                <div className="hidden items-center gap-2 lg:flex">
                  <Input
                    placeholder="Filtrar por producto o serie..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="h-8 w-[220px] text-xs"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 w-[170px] text-xs">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                          <Filter className="w-3.5 h-3.5" />
                          Todas las categorías
                        </div>
                      </SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="h-8 w-[170px] text-xs">
                      <SelectValue placeholder="Tienda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
                          <Store className="w-3.5 h-3.5" />
                          Todas las tiendas
                        </div>
                      </SelectItem>
                      {storeOptions.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>{store.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="h-5 w-px bg-border" />
                </div>
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
            </div>

            {/* ── Data table ─────────────────────────────────── */}
            <div className="px-2 pb-6 sm:px-5">
              <div className="overflow-x-auto">
                <DataTable
                  columns={columns}
                  data={inventory}
                  inStockOnly={inStockOnly}
                  globalFilter={globalFilter}
                  onGlobalFilterChange={setGlobalFilter}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  categoryOptions={categoryOptions}
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  storeOptions={storeOptions}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <OutOfStockDialog
        isOpen={isOutOfStockDialogOpen}
        onClose={() => setIsOutOfStockDialogOpen(false)}
      />
   </>
  );
}
