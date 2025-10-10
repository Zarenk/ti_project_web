"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Filter, Tags, CalendarDays, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { columns } from "./columns"; // Importar las columnas definidas
import { getAllPurchasePrices, getInventoryWithCurrency } from "./inventory.api";
import { DataTable } from "./data-table";

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

  useEffect(() => {
    async function fetchInventory() {
      try {
        // Obtener el inventario y los precios de compra en paralelo
        const [inventoryData, purchasePrices] = await Promise.all([
          //getInventory(), // Llama al endpoint para obtener el inventario
          getInventoryWithCurrency(), // Llama al endpoint para obtener el inventario con desglose por moneda
          getAllPurchasePrices(), // Llama al endpoint para obtener los precios de compra
        ]);
  
        // Crear un mapa de precios para un acceso rápido
        const priceMap = purchasePrices.reduce((acc: any, price: any) => {
          acc[price.productId] = {
            highestPurchasePrice: price.highestPurchasePrice,
            lowestPurchasePrice: price.lowestPurchasePrice,
          };
          return acc;
        }, {});
  
        // Agrupar productos por nombre y calcular el stock global
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
                highestPurchasePrice: priceMap[item.product.id]?.highestPurchasePrice || 0, // Precio más alto
                lowestPurchasePrice: priceMap[item.product.id]?.lowestPurchasePrice || 0, // Precio más bajo
              };
            }
  
            // Sumar el stock por moneda
            acc[productName].stock += item.storeOnInventory.reduce(
              (total: number, store: any) => total + store.stock,
              0
            );

            // Sumar el stock por moneda
          item.stockByStore.forEach((store: any) => {
            acc[productName].stockByCurrency.USD += store.stockByCurrency.USD;
            acc[productName].stockByCurrency.PEN += store.stockByCurrency.PEN;
          });
  
            // Agregar las tiendas al inventario agrupado
            acc[productName].storeOnInventory.push(...item.storeOnInventory);

            // Agregar números de serie disponibles
            item.entryDetails?.forEach((detail: any) => {
              const series = detail.series?.map((s: any) => s.serial) || [];
              acc[productName].serialNumbers.push(...series);
            });
  
            // Calcular el updateAt más reciente entre las entradas de storeOnInventory
            const latestUpdateAt = item.storeOnInventory.reduce(
              (latest: Date, store: any) =>
                new Date(store.updatedAt) > new Date(latest) ? new Date(store.updatedAt) : latest,
              new Date(acc[productName].updateAt)
            );
  
            acc[productName].updateAt = latestUpdateAt; // Actualizar el updateAt con el más reciente
  
            return acc;
          }, {})
        );
  
        // Ordenar los datos por fecha de creación en orden descendente
        const sortedData = groupedData.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setBaseInventory(groupedData as InventoryItem[]);
        setInventory(sortedData as InventoryItem[]);
      } catch (error) {
        console.error("Error al obtener el inventario:", error);
        toast.error("Error al obtener el inventario");
      } finally {
        setLoading(false);
      }
    }

    fetchInventory();
  }, []);

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
