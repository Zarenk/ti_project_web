"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  Loader2,
  ScanBarcode,
  Keyboard,
  Camera,
  ImageUp,
  ShoppingCart,
  PackagePlus,
  Pencil,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  Package,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SOCKET_URL } from "@/lib/utils";
import { getAuthHeaders } from "@/utils/auth-token";
import { resolveImageUrl } from "@/lib/images";

const ZxingScanner = dynamic(() => import("@/app/barcode/ZxingScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

// ── Types ──────────────────────────────────────────────────

interface StoreStock {
  storeId: number;
  storeName: string;
  stock: number;
}

interface ScannedProduct {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  images?: string[] | null;
  price?: number | null;
  priceSell?: number | null;
  barcode?: string | null;
  qrCode?: string | null;
  brand?: { name?: string } | null;
  brandName?: string | null;
  categoryName?: string | null;
  status?: string | null;
  code?: string | null;
  stockByStore?: StoreStock[];
  totalStock?: number;
}

interface HistoryItem {
  product: ScannedProduct;
  scannedAt: number;
}

type ScanMode = "camera" | "manual" | "image";

const HISTORY_KEY = "barcode-scan-history";
const MAX_HISTORY = 20;

// ── Helpers ────────────────────────────────────────────────

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable
  }
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "hace un momento";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `hace ${mins} min`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `hace ${hrs}h`;
  }
  const days = Math.floor(diff / 86400);
  return `hace ${days}d`;
}

function getStockColor(total: number | undefined) {
  if (total == null || total === 0) return "destructive" as const;
  if (total <= 10) return "outline" as const;
  return "secondary" as const;
}

function getStockDotColor(total: number | undefined) {
  if (total == null || total === 0) return "bg-red-500";
  if (total <= 10) return "bg-amber-500";
  return "bg-emerald-500";
}

// ── Component ──────────────────────────────────────────────

export default function BarcodeScannerPage() {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanKey, setScanKey] = useState(0);
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [stockExpanded, setStockExpanded] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScanning, setImageScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({
    code: "",
    time: 0,
  });

  // ── Persist history ────────────────────────────────────
  useEffect(() => {
    saveHistory(scanHistory);
  }, [scanHistory]);

  // ── Add product to history ─────────────────────────────
  const addToHistory = useCallback((scanned: ScannedProduct) => {
    setScanHistory((prev) => {
      const filtered = prev.filter((h) => h.product.id !== scanned.id);
      const next = [{ product: scanned, scannedAt: Date.now() }, ...filtered];
      return next.slice(0, MAX_HISTORY);
    });
  }, []);

  // ── WebSocket connection ────────────────────────────────
  useEffect(() => {
    const barcodeSocket = io(`${SOCKET_URL}/barcode`, {
      transports: ["websocket"],
      auth: async (cb) => {
        try {
          const headers = await getAuthHeaders();
          const authorization =
            headers.Authorization ?? headers.authorization ?? "";
          const token = authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : authorization.trim();
          cb({
            token: token || undefined,
            orgId: headers["x-org-id"] ?? undefined,
            companyId: headers["x-company-id"] ?? undefined,
          });
        } catch (err) {
          console.error("[Barcode] Auth error:", err);
          cb({});
        }
      },
    });

    socketRef.current = barcodeSocket;

    barcodeSocket.on("connect", () => {
      setConnected(true);
    });

    barcodeSocket.on("disconnect", () => {
      setConnected(false);
    });

    barcodeSocket.on("connect_error", (error) => {
      setError("Error de conexion: " + error.message);
    });

    barcodeSocket.on("barcode:result", (data: any) => {
      setLoading(false);
      if (data?.error) {
        setError(data.error);
        setProduct(null);
      } else if (data?.id) {
        setProduct(data);
        setError(null);
        addToHistory(data);
      } else {
        setError("Respuesta inesperada del servidor.");
        setProduct(null);
      }
    });

    barcodeSocket.on("barcode:error", (data: any) => {
      setLoading(false);
      setError(data?.message ?? "Error de conexion");
      setProduct(null);
    });

    return () => {
      barcodeSocket.disconnect();
    };
  }, [addToHistory]);

  // ── Scan handler (shared) ──────────────────────────────
  const handleScan = useCallback(
    (code: string, format?: string) => {
      const trimmed = code.trim();
      if (!trimmed || loading) return;

      const now = Date.now();
      if (
        lastScanRef.current.code === trimmed &&
        now - lastScanRef.current.time < 2000
      ) {
        return;
      }
      lastScanRef.current = { code: trimmed, time: now };

      if (format) {
        console.log(`[Barcode] Scanned ${format}: ${trimmed}`);
      }

      setLoading(true);
      setError(null);
      setProduct(null);
      setStockExpanded(false);
      socketRef.current?.emit("barcode:scan", trimmed);
    },
    [loading],
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(manualCode);
  };

  const handleReset = () => {
    setProduct(null);
    setError(null);
    setManualCode("");
    setStockExpanded(false);
    clearImagePreview();
    lastScanRef.current = { code: "", time: 0 };
    setScanKey((k) => k + 1);
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setProduct(item.product);
    setError(null);
    setStockExpanded(false);
  };

  const clearHistory = () => {
    setScanHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // ── Image scan handler ─────────────────────────────────
  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("El archivo debe ser una imagen (PNG, JPG, etc.)");
        return;
      }

      // Show preview
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setImageScanning(true);
      setError(null);

      try {
        // html5-qrcode can decode from a File object
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("image-scan-temp", false);
        const result = await scanner.scanFile(file, false);

        // Clean up preview
        URL.revokeObjectURL(url);
        setImagePreview(null);
        setImageScanning(false);

        // Feed the decoded text into the normal scan flow
        handleScan(result, "IMAGE");
      } catch {
        URL.revokeObjectURL(url);
        setImagePreview(null);
        setImageScanning(false);
        setError(
          "No se pudo leer ningun codigo QR o barcode en la imagen. Intenta con otra imagen mas clara."
        );
      }

      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleScan],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const clearImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageScanning(false);
  };

  // ── Resolve product image ──────────────────────────────
  const productImage = product?.image
    ? resolveImageUrl(product.image)
    : product?.images?.length
      ? resolveImageUrl(product.images[0])
      : null;

  const brandName = product?.brandName ?? product?.brand?.name ?? null;
  const hasMultipleStores = (product?.stockByStore?.length ?? 0) > 1;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ScanBarcode className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Escaner de productos</h1>
            <p className="text-xs text-muted-foreground">
              Escanea un codigo QR o ingresa un codigo de barras
            </p>
          </div>
        </div>
        <div
          className={`h-2.5 w-2.5 rounded-full ${
            connected ? "bg-emerald-500" : "bg-red-400"
          }`}
          title={connected ? "Conectado" : "Desconectado"}
        />
      </div>

      {/* Mode switcher */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={() => setMode("camera")}
        >
          <Camera className="mr-1.5 h-4 w-4" />
          Camara
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={() => setMode("manual")}
        >
          <Keyboard className="mr-1.5 h-4 w-4" />
          Manual
        </Button>
        <Button
          variant={mode === "image" ? "default" : "outline"}
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={() => setMode("image")}
        >
          <ImageUp className="mr-1.5 h-4 w-4" />
          Imagen
        </Button>
      </div>

      {/* Scanner / Input / Image area */}
      {!product && !loading && (
        <>
          {mode === "camera" && (
            <div className="overflow-hidden rounded-lg border">
              <ZxingScanner key={scanKey} onScanSuccess={handleScan} />
            </div>
          )}

          {mode === "manual" && (
            <form
              onSubmit={handleManualSubmit}
              className="flex gap-2"
            >
              <Input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Codigo de barras o QR..."
                autoFocus
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!manualCode.trim() || !connected}
                className="cursor-pointer"
              >
                Buscar
              </Button>
            </form>
          )}

          {mode === "image" && (
            <div className="space-y-3">
              {/* Hidden temp element for html5-qrcode scanFile */}
              <div id="image-scan-temp" className="hidden" />

              {/* Preview */}
              {imagePreview ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={imagePreview}
                    alt="QR a escanear"
                    className="max-h-64 w-full object-contain bg-muted/30"
                  />
                  {imageScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                      <p className="text-xs font-medium text-white">Leyendo codigo...</p>
                    </div>
                  )}
                  {!imageScanning && (
                    <button
                      onClick={clearImagePreview}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                /* Drop zone / file selector */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-10 transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/30"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Sube una imagen con QR o codigo de barras
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Arrastra aqui o toca para seleccionar
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    PNG, JPG, JPEG, WEBP
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Buscando producto...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="mt-6 border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20">
          <CardContent className="py-6 text-center">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {error}
            </p>
          </CardContent>
          <CardFooter className="justify-center pb-4">
            <Button
              onClick={handleReset}
              variant="outline"
              className="cursor-pointer"
            >
              Intentar de nuevo
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Product result card */}
      {product && !loading && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base leading-tight">
                  {product.name}
                </CardTitle>
                {product.categoryName && (
                  <CardDescription className="mt-1">
                    {product.categoryName}
                  </CardDescription>
                )}
              </div>
              <Badge
                variant={
                  product.status === "Activo" ? "secondary" : "destructive"
                }
              >
                {product.status ?? "Activo"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {productImage && (
              <div className="flex justify-center">
                <img
                  src={productImage}
                  alt={product.name}
                  className="h-48 w-48 rounded-md object-contain"
                />
              </div>
            )}

            {/* Prices & info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {product.priceSell != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Precio Venta
                  </p>
                  <p className="font-semibold">
                    S/. {Number(product.priceSell).toFixed(2)}
                  </p>
                </div>
              )}
              {product.price != null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Precio Compra
                  </p>
                  <p className="font-semibold">
                    S/. {Number(product.price).toFixed(2)}
                  </p>
                </div>
              )}
              {brandName && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Marca
                  </p>
                  <p className="font-medium">{brandName}</p>
                </div>
              )}
              {product.code && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Codigo
                  </p>
                  <p className="font-mono text-xs">{product.code}</p>
                </div>
              )}
              {product.barcode && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Codigo de barras
                  </p>
                  <p className="font-mono text-xs">{product.barcode}</p>
                </div>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* ── Stock en Tiempo Real ─────────────────────── */}
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Stock Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStockDotColor(product.totalStock)}`} />
                  <Badge variant={getStockColor(product.totalStock)}>
                    {product.totalStock != null ? `${product.totalStock} uds` : "Sin inventario"}
                  </Badge>
                </div>
              </div>

              {/* Stock por tienda (expandible) */}
              {product.stockByStore && product.stockByStore.length > 0 && (
                <>
                  {hasMultipleStores && (
                    <button
                      onClick={() => setStockExpanded(!stockExpanded)}
                      className="mt-2 flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Ver por tienda ({product.stockByStore.length})</span>
                      {stockExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  {(stockExpanded || !hasMultipleStores) && (
                    <div className="mt-2 space-y-1">
                      {product.stockByStore.map((s) => (
                        <div
                          key={s.storeId}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs"
                        >
                          <span className="text-muted-foreground">{s.storeName}</span>
                          <span className={`font-medium ${s.stock === 0 ? "text-red-600 dark:text-red-400" : s.stock <= 10 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {s.stock} uds
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Alerta sin stock */}
              {product.totalStock === 0 && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                  Este producto no tiene stock disponible
                </p>
              )}
            </div>

            {/* ── Quick Actions ────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/dashboard/sales/new?productId=${product.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Agregar a Venta
              </Link>
              <Link
                href={`/dashboard/entries/new?productId=${product.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <PackagePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Registrar Ingreso
              </Link>
              <Link
                href={`/dashboard/products?edit=${product.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Editar Producto
              </Link>
              <Link
                href={`/dashboard/inventory/labels?productId=${product.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <Tag className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Imprimir Etiqueta
              </Link>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full cursor-pointer"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Escanear otro producto
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ── Historial de Escaneos ──────────────────────────── */}
      {scanHistory.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex w-full items-center justify-between rounded-lg border px-4 py-3 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Historial ({scanHistory.length})
              </span>
            </div>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {historyOpen && (
            <div className="mt-2 rounded-lg border">
              <div className="max-h-64 overflow-y-auto divide-y">
                {scanHistory.map((item) => (
                  <button
                    key={`${item.product.id}-${item.scannedAt}`}
                    onClick={() => handleHistoryClick(item)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.product.categoryName ?? "Sin categoria"}
                      </p>
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-0.5">
                      {item.product.priceSell != null && (
                        <span className="text-sm font-semibold">
                          S/. {Number(item.product.priceSell).toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(item.scannedAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t px-4 py-2">
                <button
                  onClick={clearHistory}
                  className="flex w-full items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar historial
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection warning */}
      {!connected && (
        <p className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400">
          Sin conexion al servidor. Verifica tu sesion.
        </p>
      )}
    </div>
  );
}
