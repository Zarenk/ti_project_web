"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getInventoryWithCurrency } from "../inventory.api";

type OutOfStockProduct = {
    id: string;
    name: string;
    category: { id: number; name: string } | null;
    totalStock: number;
    storeOnInventory: { storeId: number; storeName: string; stock: number; store:{name:string} }[];
};

export default function OutOfStockDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [outOfStockProducts, setOutOfStockProducts] = useState<OutOfStockProduct[]>([]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function fetchOutOfStockProducts() {
      try {
        const inventoryData = await getInventoryWithCurrency();
        console.log("Datos del inventario:", inventoryData); // DepuraciÃ³n
    
        const groupedByProduct: Record<string, OutOfStockProduct> = {};
    
        inventoryData.forEach((item: any) => {
          const productId = item.product.id;
          const stock = item.storeOnInventory.reduce(
            (sum: number, store: any) => sum + (store.stock || 0),
            0
          );
    
          if (!groupedByProduct[productId]) {
            groupedByProduct[productId] = {
              id: productId,
              name: item.product.name,
              category: item.product.category,
              totalStock: stock,
              storeOnInventory: [...item.storeOnInventory],
            };
          } else {
            groupedByProduct[productId].totalStock += stock;
            groupedByProduct[productId].storeOnInventory.push(...item.storeOnInventory);
          }
        });
    
        const filteredProducts = Object.values(groupedByProduct).filter((item) => {
          return item.totalStock === 0 || item.storeOnInventory.some((store: any) => store.stock === 0);
        });
    
        setOutOfStockProducts(filteredProducts);
      } catch (error) {
        console.error("Error al obtener productos sin stock:", error);
      }
    }

    if (isOpen) {
      fetchOutOfStockProducts(); // Actualiza los datos al abrir el diÃ¡logo
      intervalId = setInterval(fetchOutOfStockProducts, 5000); // Actualiza cada 5 segundos
    }

    return () => {
      if (intervalId) clearInterval(intervalId); // Limpia el intervalo al cerrar el diÃ¡logo
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl">
        <DialogHeader>
          <DialogTitle>Productos Sin Stock</DialogTitle>
          <DialogDescription>
            AquÃ­ puedes ver los productos que tienen stock general en 0 y su desglose por tienda.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full overflow-x-auto max-h-[60vh]">
          {outOfStockProducts.length > 0 ? (
            <table className="w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900 text-white uppercase tracking-wide">
                  <th className="border-b px-4 py-3 text-left">Nombre</th>
                  <th className="border-b px-4 py-3 text-left">CategorÃ­a</th>
                  <th className="border-b px-4 py-3 text-left">Stock General</th>
                  <th className="border-b px-4 py-3 text-left">Stock por Tienda</th>
                  <th className="border-b px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockProducts.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3">{product.name || "Sin nombre"}</td>
                    <td className="px-4 py-3">
                        {typeof product.category === "string"
                        ? product.category
                        : product.category?.name || "Sin categorÃ­a"}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        product.totalStock === 0 ? "text-red-600" : "text-foreground"
                      }`}
                    >
                      {product.totalStock} u.
                    </td>
                    <td className="px-4 py-3">
                      <ul className="list-disc list-inside space-y-0.2">
                        {product.storeOnInventory.map((storeItem: any) => (
                          <li key={storeItem.storeId}>
                            {storeItem.store?.name || "Tienda desconocida"}:{" "}
                            <span
                              className={`font-semibold ${storeItem.stock === 0 ? "text-red-600" : "text-foreground"}`}
                            >
                              <br />
                              {storeItem.stock} u.
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3">
                        <Button
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                        onClick={() => {
                            window.location.href = `/dashboard/inventory/product-details/${product.id}`;
                        }}
                        >
                        Ver informacion
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm py-4">
              No hay productos sin stock.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}