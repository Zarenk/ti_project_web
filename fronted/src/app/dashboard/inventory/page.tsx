"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { columns } from "./columns"; // Importar las columnas definidas
import { getAllPurchasePrices, getInventory, getInventoryWithCurrency } from "./inventory.api";
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
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
  

  if (loading) {
    return <div className="px-4">Cargando inventario...</div>;
  }

  return (
    <>
      <section className='py-2 sm:py-6'>
          <div className='container mx-auto px-1 sm:px-6 lg:px-8'>
            <h1 className='px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6'>Inventario General</h1>
            <div className="overflow-x-auto">
            <DataTable columns={columns} data={inventory}></DataTable>
          </div>          
        </div>
      </section>
   </>
  );
}