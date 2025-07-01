"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import React, { useEffect, useState } from "react";
import UpdatePriceDialog from "./inventory-product-details-components/UpdatePriceModal";
import { getProductByInventoryId, getProductSales } from "../inventory.api";
import { Book, DollarSign } from "lucide-react";
import UpdateCategoryDialog from "./inventory-product-details-components/UpdateCategoryModal";
import { QRCodeCanvas } from "qrcode.react";

interface ProductDetailsPageProps {
  product: any;
  stockDetails: {
    totalByCurrency: { USD: number; PEN: number };
    stockByStoreAndCurrency: Record<string, { storeName: string; USD: number; PEN: number }>;
  } | null;
  entries: any[];
  series: { storeId: number; series: string[] }[]; // Nueva prop para las series
  searchParams?: { editPrice?: string };
}

export default function ProductDetailsPage({ product, stockDetails, entries, series, searchParams }: ProductDetailsPageProps) {

  // Lógica para mostrar el modal de actualización de precio al cargar la página
  const [isLoading, setIsLoading] = useState(true);
  // Estado para controlar la visibilidad del modal de QR
  const [showQR, setShowQR] = useState(false);

  if (!product) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <p className="text-muted-foreground">No se encontraron datos para este producto.</p>
      </div>
    );
  }

  // Obtener el productId real desde el API usando el inventoryId
  const [realProductId, setRealProductId] = useState<number | null>(null)
  useEffect(() => {
    async function fetchRealProductId() {
      try {
        if (product?.id) {
          const data = await getProductByInventoryId(product.id); // Llama al API con el inventoryId
          setRealProductId(data.productId); // Guarda el productId verdadero
        }
      } catch (error) {
        console.error("Error al obtener el productId:", error);
        setRealProductId(null); // Establecer un valor predeterminado en caso de error
      }
    }

    fetchRealProductId(); // Ejecutar al montar el componente
  }, [product?.id]); // Dependencias vacías para que se ejecute solo al montar
  //

  // Obtener las salidas del producto usando el productId real
  const [sales, setSales] = useState<any[]>([]);
  useEffect(() => {
    async function fetchProductSales() {
      try {
        if (product?.id) {
          const data = await getProductSales(realProductId ?? 0);
          setSales(data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error al obtener las salidas del producto:", error);
      }
    }

    fetchProductSales();
  }, [realProductId]);
  //

  const totalStockByCurrency = stockDetails
  ? Object.values(stockDetails.stockByStoreAndCurrency).reduce(
      (acc, store) => ({
        USD: acc.USD + (store.USD || 0),
        PEN: acc.PEN + (store.PEN || 0),
      }),
      { USD: 0, PEN: 0 }
    )
  : { USD: 0, PEN: 0 };

  const totalStock = entries.reduce((sum, entry) => sum + entry.quantity, 0) - sales.reduce((sum, sale) => sum + sale.quantity, 0);

  // Calcular la última fecha de actualización entre todas las tiendas
  const latestUpdateAt = product.storeOnInventory.reduce(
    (latest: Date, store: any) =>
      new Date(store.updatedAt) > new Date(latest) ? new Date(store.updatedAt) : latest,
    new Date(product.updateAt) // Comenzar con la fecha de actualización del producto
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="animate-pulse text-lg font-medium">Cargando información del producto...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">

        <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link href="/dashboard/inventory">
            <Button variant="outline" className="shadow-sm">
            ← Volver al Inventario
            </Button>
        </Link>
        
        <Link href="?editPrice=true" scroll={false}>
            <Button className="shadow-sm">
            Actualizar Precio de Venta
            <DollarSign className="h-6 w-6 text-green-800" />
            </Button>
        </Link>

        <Link href="?editCategory=true" scroll={false}>
            <Button className="shadow-sm">
            Actualizar Categoría
            <Book className="h-6 w-6 text-blue-800" />
            </Button>
        </Link>

        <Button
          className="shadow-sm"
          variant="outline"
          onClick={() => setShowQR(!showQR)}
        >
          Generar Código QR
        </Button>
        </div>
        <UpdatePriceDialog 
            defaultPrice={product.priceSell} 
            productId={realProductId!} 
        />
        <UpdateCategoryDialog 
        defaultCategoryId={product.categoryId} 
        productId={realProductId!} 
        />

        <div className="space-y-4">
            <div className="mb-4">
            <h1 className="text-3xl font-bold mb-1">Información General del Producto</h1>
            <div className="h-1 bg-primary rounded w-[375px] sm:w-[580px]" /> {/* ajusta el valor según el largo del texto */}
        </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <p><strong>Nombre:</strong> {product.name}</p>
                <p><strong>Categoría:</strong> {product.category}</p>
                <p><strong>Precio Compra Mínimo:</strong> S/. {product.lowestPurchasePrice}</p>
                <p><strong>Precio Compra Máximo:</strong> S/. {product.highestPurchasePrice}</p>
                <p><strong>Precio de Venta:</strong> S/. {product.priceSell}</p>
                <p><strong>Stock General:</strong>{" "}
                  <span className={totalStock === 0 ? "text-red-600 font-bold" : ""}>
                    {totalStock}
                  </span>
                </p>
                <p><strong>Fecha de Ingreso:</strong> {new Date(product.createdAt).toLocaleDateString()}</p>
                <p><strong>Última Actualización:</strong> {latestUpdateAt.toLocaleDateString()}</p>
            </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Stock por Tienda y Tipo de Moneda:</h2>
          {stockDetails ? (
            <>
              <p className="text-sm mb-2">
                <strong>Total: </strong> 
                USD: {Math.max(0, Math.floor(entries.reduce((sum, entry) => entry.tipoMoneda === "USD" ? sum + entry.quantity : sum, 0)))}, 
                PEN: {Math.max(0, Math.floor(
                  entries.reduce((sum, entry) => entry.tipoMoneda === "PEN" ? sum + entry.quantity : sum, 0) -
                  sales.reduce((sum, sale) => sum + sale.quantity, 0)
                ))}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stockDetails.stockByStoreAndCurrency)
              .sort(([, a], [, b]) => a.storeName.localeCompare(b.storeName)) // Orden alfabético por storeName
              .map(([storeId, { storeName, USD, PEN }]) => {
                  // Filtrar las salidas que pertenecen a esta tienda
                  const storeSales = sales.filter((sale) => sale.storeName === storeName);

                  // Calcular el total de salidas en PEN para esta tienda
                  const totalSales = storeSales.reduce((sum, sale) => sum + sale.quantity, 0);

                  // Inicializar variables para el stock actualizado
                  let remainingSales = totalSales;
                  let updatedPEN = PEN;
                  let updatedUSD = USD;

                  // Restar del stock en PEN primero
                  if (remainingSales > 0) {
                    const deductedPEN = Math.min(remainingSales, updatedPEN);
                    updatedPEN -= deductedPEN;
                    remainingSales -= deductedPEN;
                  }

                  // Si quedan salidas pendientes, restar directamente del stock en USD
                  if (remainingSales > 0) {
                    const deductedUSD = Math.min(remainingSales, updatedUSD);
                    updatedUSD -= deductedUSD;
                    remainingSales -= deductedUSD; // No se realiza conversión
                  }

                  return (
                    <div key={storeId} className="border rounded-md p-4 shadow-sm">
                      <p className="font-medium">{storeName}</p>
                      <p className="text-sm text-muted-foreground">
                        USD: {Math.floor(updatedUSD)} | PEN: {Math.floor(updatedPEN)} | TOTAL: {Math.floor(updatedUSD + updatedPEN)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Series: {series.find((s) => s.storeId === parseInt(storeId, 10))?.series.join(", ") || "No disponibles"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No hay detalles por tienda disponibles.</p>
          )}
        </div>

        <div>
            <h2 className="text-xl font-semibold mb-2">Entradas del Producto</h2>
            {entries.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...entries]
              .sort((a, b) => a.storeName.localeCompare(b.storeName))
              .map((entry, index) => (
                <div key={index} className="border rounded-md p-4 shadow-sm space-y-1 text-sm">
                    <p><strong>Fecha:</strong> {new Date(entry.createdAt).toLocaleDateString()}</p>
                    <p><strong>Precio de Compra:</strong> S/. {(entry.price || 0).toFixed(2)}</p>
                    <p><strong>Moneda:</strong> {entry.tipoMoneda}</p>
                    <p><strong>Tienda:</strong> {entry.storeName}</p>
                    <p><strong>Proveedor:</strong> {entry.supplierName}</p>
                    <p><strong>Cantidad:</strong> {entry.quantity || 0}</p>
                    <p><strong>Series:</strong> {entry.series.length > 0 ? entry.series.join(", ") : "No disponibles"}</p>
                </div>
                ))}
            </div>
            ) : (
            <p className="text-muted-foreground text-sm">No hay entradas disponibles para este producto.</p>
            )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Salidas del Producto</h2>
          {sales.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...sales]
              .sort((a, b) => a.storeName.localeCompare(b.storeName))
              .map((sale, index) => (
                <div key={index} className="border rounded-md p-4 shadow-sm space-y-1 text-sm">
                  <p><strong>Fecha:</strong> {new Date(sale.createdAt).toLocaleDateString()}</p>
                  <p><strong>Cantidad:</strong> {sale.quantity}</p>
                  <p><strong>Precio:</strong> S/. {sale.price.toFixed(2)}</p>
                  <p><strong>Tienda:</strong> {sale.storeName}</p>
                  <p><strong>Cliente:</strong> {sale.clientName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay salidas disponibles para este producto.</p>
          )}
        </div>    

        {showQR && (
          <div className="border rounded-md p-4 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">Código QR del Producto</h2>
            <div className="flex flex-col items-center space-y-2">
              <QRCodeCanvas
                value={product.qrCode || product.barcode || product.id.toString()}
                size={200}
              />
              <p className="text-sm text-muted-foreground">
                Contenido: {product.qrCode || product.barcode || product.id}
              </p>
            </div>
          </div>
        )}   
        
    </div>
  );
}