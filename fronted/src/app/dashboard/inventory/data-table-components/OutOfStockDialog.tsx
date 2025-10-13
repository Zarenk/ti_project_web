"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getInventoryWithCurrency } from "../inventory.api";

type OutOfStockProduct = {
  id: string;
  name: string;
  category: { id: number; name: string } | null;
  totalStock: number;
  storeOnInventory: {
    storeId: number;
    storeName: string;
    stock: number;
    store: { name: string };
  }[];
};

export default function OutOfStockDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [outOfStockProducts, setOutOfStockProducts] = useState<OutOfStockProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function fetchOutOfStockProducts() {
      try {
        const inventoryData = await getInventoryWithCurrency();
        console.log("Datos del inventario:", inventoryData); // Depuración
    
        const groupedByProduct: Record<string, OutOfStockProduct> = {};
    
        inventoryData.forEach((item: any) => {
          const productId = item.product.id;
          const stock = item.storeOnInventory.reduce(
            (sum: number, store: any) => sum + (store.stock || 0),
            0,
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, outOfStockProducts.length]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return outOfStockProducts;
    }

    const normalizedTerm = searchTerm.toLowerCase();
    return outOfStockProducts.filter((product) =>
      (product.name || "").toLowerCase().includes(normalizedTerm),
    );
  }, [outOfStockProducts, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((prevPage) => Math.min(prevPage, totalPages));
  }, [totalPages]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const hasProducts = filteredProducts.length > 0;
  const firstItemIndex = hasProducts ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const lastItemIndex = hasProducts ? Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Productos Sin Stock</DialogTitle>
          <DialogDescription>
            Aquí puedes ver los productos que tienen stock general en 0 y su desglose por tienda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full flex-col gap-4 overflow-hidden">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre de producto..."
              className="md:max-w-xs"
            />
            {hasProducts && (
              <p className="text-sm text-muted-foreground">
                Mostrando {firstItemIndex} - {lastItemIndex} de {filteredProducts.length} productos
              </p>
            )}
          </div>

          <div className="w-full flex-1 overflow-hidden">
            <div className="max-h-[50vh] w-full overflow-auto rounded-md border">
              {hasProducts ? (
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[18%]" />
                    <col className="w-[16%]" />
                    <col className="w-[30%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-900 text-white uppercase tracking-wide">
                      <th className="border-b px-4 py-3 text-left">Nombre</th>
                      <th className="border-b px-4 py-3 text-left">Categoría</th>
                      <th className="border-b px-4 py-3 text-left">Stock General</th>
                      <th className="border-b px-4 py-3 text-left">Stock por Tienda</th>
                      <th className="border-b px-4 py-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product, index) => (
                      <tr
                        key={`${product.id}-${index}`}
                        className="border-b transition hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <td className="whitespace-normal break-words px-4 py-3">
                          {product.name || "Sin nombre"}
                        </td>
                        <td className="whitespace-normal break-words px-4 py-3">
                          {typeof product.category === "string"
                            ? product.category
                            : product.category?.name || "Sin categoría"}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold whitespace-nowrap ${
                            product.totalStock === 0 ? "text-red-600" : "text-foreground"
                          }`}
                        >
                          {product.totalStock} u.
                        </td>
                        <td className="whitespace-normal break-words px-4 py-3">
                          <ul className="space-y-1 text-sm">
                            {product.storeOnInventory.map((storeItem: any) => (
                              <li key={storeItem.storeId} className="flex flex-col">
                                <span className="font-medium">
                                  {storeItem.store?.name || "Tienda desconocida"}
                                </span>
                                <span
                                  className={`text-xs font-semibold ${
                                    storeItem.stock === 0 ? "text-red-600" : "text-foreground"
                                  }`}
                                >
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
                            Ver información
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground text-sm py-4">No hay productos sin stock.</p>
              )}
            </div>  
          </div>

          {hasProducts && (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                className="text-xs"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                className="text-xs"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>  
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}