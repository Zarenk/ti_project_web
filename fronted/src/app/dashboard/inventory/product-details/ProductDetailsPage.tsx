"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useRef, useState } from "react";
import UpdatePriceDialog from "./inventory-product-details-components/UpdatePriceModal";
import { getProductByInventoryId, getProductSales } from "../inventory.api";
import { Book, DollarSign, LayoutGrid, Table } from "lucide-react";
import UpdateCategoryDialog from "./inventory-product-details-components/UpdateCategoryModal";
import { QRCodeCanvas } from "qrcode.react";

const CODE39_PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnwnw",
  L: "nnwnnnwnw",
  M: "wnwnnnwnn",
  N: "nnnnwnwnw",
  O: "wnnnwnwnn",
  P: "nnwnwnwnn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

interface ProductDetailsPageProps {
  product: {
    id: number; // productId
    inventoryId: number; // inventory record id
    [key: string]: any;
  };
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
  const [showBarcode, setShowBarcode] = useState(false);
  const barcodeRef = useRef<HTMLCanvasElement | null>(null);
  const codesSectionRef = useRef<HTMLDivElement | null>(null);

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
        if (product?.inventoryId) {
          const data = await getProductByInventoryId(product.inventoryId); // Llama al API con el inventoryId
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
  const [viewMode, setViewMode] = useState<"cards" | "tables">("cards");
  const dateTimeFormatter = useMemo(
    () =>
      typeof window !== "undefined"
        ? new Intl.DateTimeFormat("es-PE", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : null,
    [],
  );

  const formatDateTime = (value: string | Date | null | undefined): string => {
    if (!value) return "No registrado";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === "string" ? value : "Fecha inválida";
    }
    if (dateTimeFormatter) {
      return dateTimeFormatter.format(date);
    }
    return date.toLocaleString();
  };

  const resolveResponsibleName = (record: any): string => {
    return (
      record?.responsibleName ??
      record?.userName ??
      record?.user?.name ??
      record?.user?.username ??
      record?.employeeName ??
      record?.createdBy ??
      "No registrado"
    );
  };
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

  // Utilizar directamente el stock calculado en el backend para mantener la
  // misma cifra que se muestra en la vista general del inventario.
  const totalStock = product.stock;

  // Series disponibles en todas las tiendas
  const availableSeries = series.flatMap((item) => item.series);

  // Calcular la última fecha de actualización entre todas las tiendas
  const latestUpdateAt = product.storeOnInventory.reduce(
    (latest: Date, store: any) =>
      new Date(store.updatedAt) > new Date(latest) ? new Date(store.updatedAt) : latest,
    new Date(product.updateAt) // Comenzar con la fecha de actualización del producto
  );

  const barcodeValue = product.barcode || product.qrCode || product.id.toString();
  const sanitizedBarcodeValue = barcodeValue
    .toString()
    .toUpperCase()
    .split("")
    .filter((char:any) => char !== "*" && CODE39_PATTERNS[char])
    .join("");
  const code39Value = sanitizedBarcodeValue.length > 0 ? sanitizedBarcodeValue : product.id.toString();

  useEffect(() => {
    if ((showQR || showBarcode) && codesSectionRef.current) {
      codesSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showQR, showBarcode]);

  useEffect(() => {
    if (!showBarcode || !barcodeRef.current) return;

    const canvas = barcodeRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    const narrowWidth = 2;
    const wideWidth = narrowWidth * 3;
    const barHeight = 80;
    const gapWidth = narrowWidth;
    const textHeight = 20;
    const encodedValue = `*${code39Value}*`;
    const sequences = encodedValue.split("").map((char) => CODE39_PATTERNS[char]);

    let totalWidth = 0;
    sequences.forEach((sequence, index) => {
      if (!sequence) return;
      sequence.split("").forEach((symbol) => {
        totalWidth += symbol === "w" ? wideWidth : narrowWidth;
      });
      if (index < sequences.length - 1) {
        totalWidth += gapWidth;
      }
    });

    canvas.width = totalWidth;
    canvas.height = barHeight + textHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#000";

    let x = 0;
    sequences.forEach((sequence, index) => {
      if (!sequence) return;
      sequence.split("").forEach((symbol, patternIndex) => {
        const isBar = patternIndex % 2 === 0;
        const width = symbol === "w" ? wideWidth : narrowWidth;
        if (isBar) {
          context.fillRect(x, 0, width, barHeight);
        }
        x += width;
      });

      if (index < sequences.length - 1) {
        x += gapWidth;
      }
    });

    context.font = "16px monospace";
    context.textAlign = "center";
    context.textBaseline = "bottom";
    context.fillText(code39Value, canvas.width / 2, canvas.height);
  }, [showBarcode, code39Value]);

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
        <Link href="/dashboard/inventory" prefetch={false}>
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
        <Button
          className="shadow-sm"
          variant="outline"
          onClick={() => setShowBarcode(!showBarcode)}
        >
          Generar Código de Barras
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
                <p><strong>Series Disponibles:</strong> {availableSeries.length > 0 ? availableSeries.join(', ') : 'No disponibles'}</p>
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
                USD: {Math.floor(stockDetails.totalByCurrency.USD)},
                PEN: {Math.floor(stockDetails.totalByCurrency.PEN)}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(stockDetails.stockByStoreAndCurrency)
              .sort(([, a], [, b]) => a.storeName.localeCompare(b.storeName)) // Orden alfabético por storeName
                .map(([storeId, { storeName, USD, PEN }]) => (
                  <div key={storeId} className="border rounded-md p-4 shadow-sm">
                    <p className="font-medium">{storeName}</p>
                    <p className="text-sm text-muted-foreground">
                      USD: {Math.floor(USD)} | PEN: {Math.floor(PEN)} | TOTAL: {Math.floor(USD + PEN)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Series: {series.find((s) => s.storeId === parseInt(storeId, 10))?.series.join(", ") || "No disponibles"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No hay detalles por tienda disponibles.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Entradas del Producto</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant={viewMode === "cards" ? "default" : "outline"}
                className="h-9 w-9"
                onClick={() => setViewMode("cards")}
                title="Vista en tarjetas"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={viewMode === "tables" ? "default" : "outline"}
                className="h-9 w-9"
                onClick={() => setViewMode("tables")}
                title="Vista comparativa en tablas"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === "cards" ? (
            entries.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...entries]
                  .sort((a, b) => a.storeName.localeCompare(b.storeName))
                  .map((entry, index) => (
                    <div key={index} className="border rounded-md p-4 shadow-sm space-y-1 text-sm">
                      <p><strong>Fecha y hora:</strong> {formatDateTime(entry.createdAt)}</p>
                      <p><strong>Precio de Compra:</strong> S/. {(entry.price || 0).toFixed(2)}</p>
                      <p><strong>Moneda:</strong> {entry.tipoMoneda}</p>
                      <p><strong>Tienda:</strong> {entry.storeName}</p>
                      <p><strong>Proveedor:</strong> {entry.supplierName}</p>
                      <p><strong>Cantidad:</strong> {entry.quantity || 0}</p>
                      <p><strong>Responsable:</strong> {resolveResponsibleName(entry)}</p>
                      <p><strong>Series:</strong> {entry.series.length > 0 ? entry.series.join(", ") : "No disponibles"}</p>
                    </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay entradas disponibles para este producto.</p>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-md border">
                <div className="bg-muted px-4 py-2 font-semibold">Entradas</div>
                <div className="overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Fecha y hora</th>
                        <th className="px-3 py-2 text-left font-semibold">Tienda</th>
                        <th className="px-3 py-2 text-left font-semibold">Proveedor</th>
                        <th className="px-3 py-2 text-left font-semibold">Responsable</th>
                        <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.length > 0 ? (
                        [...entries]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((entry, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">{formatDateTime(entry.createdAt)}</td>
                              <td className="px-3 py-2">{entry.storeName}</td>
                              <td className="px-3 py-2">{entry.supplierName}</td>
                              <td className="px-3 py-2">{resolveResponsibleName(entry)}</td>
                              <td className="px-3 py-2 text-right">{entry.quantity || 0}</td>
                              <td className="px-3 py-2 text-right">S/. {(entry.price || 0).toFixed(2)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No hay entradas registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <div className="bg-muted px-4 py-2 font-semibold">Salidas</div>
                <div className="overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Fecha y hora</th>
                        <th className="px-3 py-2 text-left font-semibold">Tienda</th>
                        <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                        <th className="px-3 py-2 text-left font-semibold">Responsable</th>
                        <th className="px-3 py-2 text-right font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-right font-semibold">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length > 0 ? (
                        [...sales]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((sale, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-3 py-2">{formatDateTime(sale.createdAt)}</td>
                              <td className="px-3 py-2">{sale.storeName}</td>
                              <td className="px-3 py-2">{sale.clientName}</td>
                              <td className="px-3 py-2">{resolveResponsibleName(sale)}</td>
                              <td className="px-3 py-2 text-right">{sale.quantity}</td>
                              <td className="px-3 py-2 text-right">S/. {sale.price.toFixed(2)}</td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No hay salidas registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {viewMode === "cards" && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Salidas del Producto</h2>
            {sales.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...sales]
                  .sort((a, b) => a.storeName.localeCompare(b.storeName))
                  .map((sale, index) => (
                    <div key={index} className="border rounded-md p-4 shadow-sm space-y-1 text-sm">
                      <p><strong>Fecha y hora:</strong> {formatDateTime(sale.createdAt)}</p>
                      <p><strong>Cantidad:</strong> {sale.quantity}</p>
                      <p><strong>Precio:</strong> S/. {sale.price.toFixed(2)}</p>
                      <p><strong>Tienda:</strong> {sale.storeName}</p>
                      <p><strong>Cliente:</strong> {sale.clientName}</p>
                      <p><strong>Responsable:</strong> {resolveResponsibleName(sale)}</p>
                      {sale.series && sale.series.length > 0 && (
                        <p><strong>Series:</strong> {sale.series.join(', ')}</p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay salidas disponibles para este producto.</p>
            )}
          </div>
        )}

        <div ref={codesSectionRef} className="space-y-4">
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

          {showBarcode && (
            <div className="border rounded-md p-4 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Código de Barras del Producto</h2>
              <div className="flex flex-col items-center space-y-2">
                <canvas ref={barcodeRef} className="max-w-full h-auto" />
                <p className="text-sm text-muted-foreground">Contenido: {code39Value}</p>
              </div>
            </div>
          )}
        </div>         
    </div>
  );
}
