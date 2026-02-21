"use client"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import React, { useEffect, useMemo, useRef, useState } from "react";
import UpdatePriceDialog from "./inventory-product-details-components/UpdatePriceModal";
import { getProductSales } from "../inventory.api";
import { ArrowLeft, Book, DollarSign, LayoutGrid, Table, Tag, TrendingDown, TrendingUp, ShoppingCart, Package, CalendarDays, Hash, Store, QrCode, Barcode, Download, Printer } from "lucide-react";
import UpdateCategoryDialog from "./inventory-product-details-components/UpdateCategoryModal";
import { QRCodeCanvas } from "qrcode.react";
import { useSiteSettings } from "@/context/site-settings-context";
import { useAuth } from "@/context/auth-context";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
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

function sanitizeForCode39(value: string): string {
  const allowed = Object.keys(CODE39_PATTERNS);
  const upper = value.toUpperCase();
  const sanitized = upper
    .split("")
    .map((char) => (allowed.includes(char) ? char : "-"))
    .join("")
    .replace(/-+/g, "-")
    .trim();

  return sanitized.length ? sanitized : "CODE39";
}

interface Code39BarSegment {
  type: "bar" | "space";
  width: number;
}

function buildCode39Segments(value: string): Code39BarSegment[] {
  const sanitized = `*${sanitizeForCode39(value)}*`;
  const segments: Code39BarSegment[] = [];

  sanitized.split("").forEach((character, index, array) => {
    const pattern = CODE39_PATTERNS[character];
    if (!pattern) {
      return;
    }

    for (let position = 0; position < pattern.length; position += 1) {
      const isBar = position % 2 === 0;
      const width = pattern[position] === "w" ? 3 : 1;
      segments.push({ type: isBar ? "bar" : "space", width });
    }

    if (index < array.length - 1) {
      segments.push({ type: "space", width: 1 });
    }
  });

  return segments;
}

function Code39Barcode({
  value,
  height = 60,
}: {
  value: string;
  height?: number;
}): React.ReactElement {
  const moduleWidth = 2;
  const segments = buildCode39Segments(value);
  const totalUnits = segments.reduce((total, segment) => total + segment.width, 0);
  let offset = 0;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${totalUnits * moduleWidth} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Codigo de barras ${value}`}
      >
        {segments.map((segment, index) => {
          const segmentWidth = segment.width * moduleWidth;
          const element =
            segment.type === "bar" ? (
              <rect
                key={`bar-${index}`}
                x={offset}
                y={0}
                width={segmentWidth}
                height={height}
                fill="currentColor"
              />
            ) : null;

          offset += segmentWidth;
          return element;
        })}
      </svg>
      <p className="mt-1 text-center text-xs font-medium tracking-widest text-muted-foreground">
        {sanitizeForCode39(value)}
      </p>
    </div>
  );
}

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
  const { settings } = useSiteSettings();
  const { role } = useAuth();
  const tenantSelection = useTenantSelection();
  const normalizedRole = role ? role.toUpperCase() : null;
  const canViewCosts =
    normalizedRole === "SUPER_ADMIN_GLOBAL" ||
    normalizedRole === "SUPER_ADMIN_ORG" ||
    normalizedRole === "ADMIN";
  const hidePurchaseCost = (settings.permissions?.hidePurchaseCost ?? false) && !canViewCosts;
  const entryTableColSpan = hidePurchaseCost ? 5 : 6;

  // Lógica para mostrar el modal de actualización de precio al cargar la página
  const [isLoading, setIsLoading] = useState(true);
  // Estado para controlar la visibilidad del panel de codigos
  const [showCodes, setShowCodes] = useState(false);
  const [codeType, setCodeType] = useState<"qr" | "barcode">("qr");
  const [selectedSerie, setSelectedSerie] = useState<string>("none");
  const codesSectionRef = useRef<HTMLDivElement | null>(null);

  if (!product) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <p className="text-muted-foreground">No se encontraron datos para este producto.</p>
      </div>
    );
  }

  const productId = product?.id ?? null;

  // Obtener las salidas del producto
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
        if (productId != null) {
          const data = await getProductSales(productId);
          setSales(data);
        }
      } catch (error) {
        console.error("Error al obtener las salidas del producto:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProductSales();
  }, [productId]);
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

  const baseCode =
    product.sku || product.code || product.barcode || product.qrCode || `PROD-${product.id}`;
  const selectedSerial = selectedSerie !== "none" ? selectedSerie : null;
  const displayCode = selectedSerial ? `${baseCode}-${selectedSerial}` : baseCode;
  const humanReadableCode = sanitizeForCode39(displayCode);
  const categoryLabel =
    product.category?.name || product.categoryName || product.category || "Sin categoria";
  const descriptionText = String(
    product.description ??
      product.descripcion ??
      product.shortDescription ??
      product.details ??
      "",
  ).trim();
  const currencyLabel = String(product.tipoMoneda ?? product.currency ?? "PEN");
  const priceSellValue = Number(product.priceSell ?? 0);
  const formattedPrice = Number.isFinite(priceSellValue)
    ? `${currencyLabel} ${priceSellValue.toFixed(2)}`
    : `${currencyLabel} 0.00`;
  const orgId = tenantSelection?.selection?.orgId ?? null;
  const companyId = tenantSelection?.selection?.companyId ?? null;
  const qrPayload = JSON.stringify({
    productId: product.id,
    code: displayCode,
    serial: selectedSerial,
    name: product.name ?? "",
    category: categoryLabel,
    orgId,
    companyId,
  });

  useEffect(() => {
    if (showCodes && codesSectionRef.current) {
      codesSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showCodes]);

  useEffect(() => {
    if (selectedSerie !== "none" && !availableSeries.includes(selectedSerie)) {
      setSelectedSerie("none");
    }
  }, [availableSeries, selectedSerie]);

  const handleCodeButton = (nextType: "qr" | "barcode") => {
    setShowCodes((prev) => (!prev || codeType !== nextType ? true : !prev));
    setCodeType(nextType);
  };

  const handleDownload = () => {
    if (codeType === "qr") {
      // Descargar QR como PNG
      const canvas = document.querySelector(".qr-code-container canvas") as HTMLCanvasElement;
      if (canvas) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `QR-${displayCode}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        });
      }
    } else {
      // Descargar Barcode como SVG
      const svg = document.querySelector(".barcode-container svg") as SVGElement;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `BARCODE-${displayCode}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handlePrint = () => {
    const labelContent = document.querySelector(".label-card");
    if (!labelContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: white;
        }
        .label-card {
          width: 300px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .qr-code-container canvas {
          display: block;
        }
        .barcode-container {
          width: 100%;
        }
        .label-product-name {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          word-wrap: break-word;
        }
        .label-serial-badge {
          display: inline-block;
          background: #000;
          color: #fff;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }
        .label-code {
          font-size: 10px;
          font-weight: 500;
          text-align: center;
        }
        .label-category {
          font-size: 9px;
          color: #666;
          text-align: center;
        }
        @media print {
          body {
            background: white;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Imprimir Etiqueta - ${product.name}</title>
          ${styles}
        </head>
        <body>
          ${labelContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Esperar a que cargue el canvas si es QR
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="animate-pulse text-lg font-medium">Cargando información del producto...</p>
      </div>
    );
  }
  
  return (
    <div className="p-3 sm:p-4 max-w-5xl mx-auto space-y-5">

        {/* Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
          <Link href="/dashboard/inventory" prefetch={false} className="sm:mr-auto">
            <Button variant="outline" className="cursor-pointer w-full sm:w-auto gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Volver al Inventario
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
            <Link href="?editPrice=true" scroll={false}>
              <Button className="cursor-pointer w-full sm:w-auto gap-1.5" size="sm">
                <DollarSign className="h-4 w-4" />
                <span className="hidden xs:inline">Actualizar</span> Precio
              </Button>
            </Link>
            <Link href="?editCategory=true" scroll={false}>
              <Button className="cursor-pointer w-full sm:w-auto gap-1.5" size="sm">
                <Tag className="h-4 w-4" />
                <span className="hidden xs:inline">Actualizar</span> Categoría
              </Button>
            </Link>
            <Button
              className="cursor-pointer gap-1.5"
              variant="outline"
              size="sm"
              onClick={() => handleCodeButton("qr")}
            >
              <QrCode className="h-4 w-4" />
              Código QR
            </Button>
            <Button
              className="cursor-pointer gap-1.5"
              variant="outline"
              size="sm"
              onClick={() => handleCodeButton("barcode")}
            >
              <Barcode className="h-4 w-4" />
              Código Barras
            </Button>
          </div>
        </div>

        <UpdatePriceDialog
            defaultPrice={product.priceSell}
            productId={productId ?? product.id}
        />
        <UpdateCategoryDialog
        defaultCategoryId={product.categoryId}
        productId={productId ?? product.id}
        />

        {/* Product Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{product.category}</p>
        </div>

        {/* Info Cards Grid */}
        <div className={`grid gap-3 ${hidePurchaseCost ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>

          {/* Prices Card */}
          {!hidePurchaseCost && (
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Precios de Compra
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-blue-500" /> Mínimo
                  </span>
                  <span className="text-sm font-semibold">S/. {Number(product.lowestPurchasePrice ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-orange-500" /> Máximo
                  </span>
                  <span className="text-sm font-semibold">S/. {Number(product.highestPurchasePrice ?? 0).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Precio Actual</span>
                  <span className="text-sm font-bold">
                    {Number.isFinite(product.price) && (product.price ?? 0) > 0
                      ? `S/. ${Number(product.price).toFixed(2)}`
                      : <span className="text-muted-foreground font-normal">Sin precio</span>}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sale Price & Stock Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Venta y Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Precio de Venta</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">S/. {Number(product.priceSell ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> Stock General
                </span>
                <span className={`text-sm font-bold ${totalStock === 0 ? "text-red-500" : ""}`}>
                  {totalStock}
                </span>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Series
                </span>
                <span className="text-xs text-right max-w-[60%] truncate">
                  {availableSeries.length > 0 ? availableSeries.join(', ') : <span className="text-muted-foreground">No disponibles</span>}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fecha de Ingreso</span>
                <span className="text-sm font-medium">{formatDateTime(product.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Última Actualización</span>
                <span className="text-sm font-medium">{formatDateTime(latestUpdateAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {showCodes && (
          <div ref={codesSectionRef} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader>
                <CardTitle>Configuracion de codigos</CardTitle>
                <CardDescription>
                  Incluye nombre, descripcion, precio y codigo interno como en la seccion de etiquetas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de codigo</Label>
                  <RadioGroup
                    value={codeType}
                    onValueChange={(value: any) => setCodeType(value as "qr" | "barcode")}
                    className="flex flex-wrap gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="qr" id="code-type-qr" />
                      <Label htmlFor="code-type-qr" className="cursor-pointer">
                        Codigo QR
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="barcode" id="code-type-barcode" />
                      <Label htmlFor="code-type-barcode" className="cursor-pointer">
                        Codigo de barras
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {availableSeries.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Serie (opcional)</Label>
                    <Select value={selectedSerie} onValueChange={setSelectedSerie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin serie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin serie</SelectItem>
                        {availableSeries.map((serie) => (
                          <SelectItem key={serie} value={serie}>
                            {serie}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-md border p-3 text-sm text-muted-foreground">
                  Codigo generado: <span className="font-semibold text-foreground">{displayCode}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
                <CardDescription>Etiqueta unitaria lista para imprimir.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer flex-1 gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer flex-1 gap-1.5"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
                <div className="label-card flex flex-col items-center gap-2 rounded-md border p-3">
                  {codeType === "qr" ? (
                    <div className="qr-code-container">
                      <QRCodeCanvas value={qrPayload} size={96} />
                    </div>
                  ) : (
                    <div className="barcode-container w-full">
                      <Code39Barcode value={humanReadableCode} height={64} />
                    </div>
                  )}
                  <div className="text-center space-y-1 w-full min-w-0">
                    <p className="label-product-name text-[12px] font-bold leading-tight text-foreground break-words">
                      {product.name}
                    </p>
                    {selectedSerial && (
                      <Badge variant="default" className="label-serial-badge text-[10px] px-1.5 py-0 font-semibold">
                        {selectedSerial}
                      </Badge>
                    )}
                    <p className="label-code text-[10px] font-medium leading-tight text-foreground">
                      {baseCode}
                    </p>
                    <p className="label-category text-[9px] text-muted-foreground leading-tight">
                      {categoryLabel}
                    </p>
                    {descriptionText && (
                      <p className="text-[9px] text-muted-foreground leading-tight line-clamp-1">
                        {descriptionText}
                      </p>
                    )}
                    <p className="text-[10px] font-semibold text-foreground">{formattedPrice}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Stock por Tienda */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Store className="h-5 w-5 text-muted-foreground" />
              Stock por Tienda
            </h2>
            {stockDetails && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>USD: <strong className="text-foreground">{Math.floor(stockDetails.totalByCurrency.USD)}</strong></span>
                <span>PEN: <strong className="text-foreground">{Math.floor(stockDetails.totalByCurrency.PEN)}</strong></span>
              </div>
            )}
          </div>
          {stockDetails ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(stockDetails.stockByStoreAndCurrency)
                .sort(([, a], [, b]) => a.storeName.localeCompare(b.storeName))
                .map(([storeId, { storeName, USD, PEN }]) => {
                  const storeSeries = series.find((s) => s.storeId === parseInt(storeId, 10))?.series ?? []
                  return (
                    <Card key={storeId} className="border-border/60">
                      <CardContent className="p-4 space-y-2">
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-muted-foreground" />
                          {storeName}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-md bg-muted/50 px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">USD</p>
                            <p className="text-sm font-bold">{Math.floor(USD)}</p>
                          </div>
                          <div className="rounded-md bg-muted/50 px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PEN</p>
                            <p className="text-sm font-bold">{Math.floor(PEN)}</p>
                          </div>
                          <div className="rounded-md bg-muted/50 px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                            <p className="text-sm font-bold">{Math.floor(USD + PEN)}</p>
                          </div>
                        </div>
                        {storeSeries.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            <strong>Series:</strong> {storeSeries.join(", ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
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
                className="h-9 w-9 cursor-pointer"
                onClick={() => setViewMode("cards")}
                title="Vista en tarjetas"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={viewMode === "tables" ? "default" : "outline"}
                className="h-9 w-9 cursor-pointer"
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
                      {!hidePurchaseCost && (
                        <p><strong>Precio de Compra:</strong> S/. {(entry.price || 0).toFixed(2)}</p>
                      )}
                      <p><strong>Moneda:</strong> {entry.tipoMoneda ?? "PEN"}</p>
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
              <div className="table-scroll overflow-x-auto rounded-md border">
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
                        {!hidePurchaseCost && (
                          <th className="px-3 py-2 text-right font-semibold">Precio</th>
                        )}
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
                              {!hidePurchaseCost && (
                                <td className="px-3 py-2 text-right">S/. {(entry.price || 0).toFixed(2)}</td>
                              )}
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={entryTableColSpan} className="px-3 py-4 text-center text-muted-foreground">No hay entradas registradas.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="table-scroll overflow-x-auto rounded-md border">
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

    </div>
  );
}

