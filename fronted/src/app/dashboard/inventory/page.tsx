"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { columns } from "./columns"; // Importar las columnas definidas
import { getAllPurchasePrices, getInventory, getInventoryWithCurrency } from "./inventory.api";
import { DataTable } from "./data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseInventory, setBaseInventory] = useState<InventoryItem[]>([]);
  const [sortMode, setSortMode] = useState<"created" | "updated">("created");
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
      <section className='py-2 sm:py-6'>
          <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
            <h1 className='px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6'>Inventario General</h1>
            <div className="px-5 mb-4 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sort-updated"
                  checked={sortMode === "updated"}
                  onCheckedChange={(checked) => setSortMode(checked ? "updated" : "created")}
                />
                <Label htmlFor="sort-updated">Ordenar por último actualizado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sort-created"
                  checked={sortMode === "created"}
                  onCheckedChange={(checked) => setSortMode(checked ? "created" : "updated")}
                />
                <Label htmlFor="sort-created">Ordenar por último ingreso</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="in-stock-only"
                  checked={inStockOnly}
                  onCheckedChange={(checked) => setInStockOnly(!!checked)}
                />
                <Label htmlFor="in-stock-only">Solo productos en stock</Label>
              </div>
            </div>
            <div className="overflow-x-auto">
            <DataTable columns={columns} data={inventory} inStockOnly={inStockOnly}></DataTable>
          </div>
        </div>
      </section>
   </>
  );
}
