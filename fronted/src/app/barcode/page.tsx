"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import { Loader2, ScanBarcode, Keyboard, Camera } from "lucide-react";

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
}

type ScanMode = "camera" | "manual";

export default function BarcodeScannerPage() {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanKey, setScanKey] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({
    code: "",
    time: 0,
  });

  // ── WebSocket connection ────────────────────────────────
  useEffect(() => {
    const barcodeSocket = io(`${SOCKET_URL}/barcode`, {
      transports: ["websocket"],
      auth: async (cb) => {
        try {
          const headers = await getAuthHeaders();
          console.log("[Barcode] Auth headers:", headers);
          const authorization =
            headers.Authorization ?? headers.authorization ?? "";
          const token = authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : authorization.trim();
          console.log("[Barcode] Token:", token ? "✅ Token found" : "❌ No token");
          console.log("[Barcode] OrgId:", headers["x-org-id"]);
          console.log("[Barcode] CompanyId:", headers["x-company-id"]);
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
      console.log("[Barcode] ✅ WebSocket connected!");
      setConnected(true);
    });

    barcodeSocket.on("disconnect", (reason) => {
      console.log("[Barcode] ❌ WebSocket disconnected:", reason);
      setConnected(false);
    });

    barcodeSocket.on("connect_error", (error) => {
      console.error("[Barcode] ❌ Connection error:", error.message);
      setError("Error de conexión: " + error.message);
    });

    barcodeSocket.on("barcode:result", (data: any) => {
      setLoading(false);
      if (data?.error) {
        setError(data.error);
        setProduct(null);
      } else if (data?.id) {
        setProduct(data);
        setError(null);
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
  }, []);

  // ── Scan handler (shared) ──────────────────────────────
  const handleScan = useCallback(
    (code: string, format?: string) => {
      const trimmed = code.trim();
      if (!trimmed || loading) return;

      // Debounce: ignore same code within 2 seconds
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
    lastScanRef.current = { code: "", time: 0 };
    setScanKey((k) => k + 1);
  };

  // ── Resolve product image ──────────────────────────────
  const productImage = product?.image
    ? resolveImageUrl(product.image)
    : product?.images?.length
      ? resolveImageUrl(product.images[0])
      : null;

  const brandName =
    product?.brandName ?? product?.brand?.name ?? null;

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
      </div>

      {/* Scanner / Input area */}
      {!product && !loading && (
        <>
          {mode === "camera" ? (
            <div className="overflow-hidden rounded-lg border">
              <ZxingScanner key={scanKey} onScanSuccess={handleScan} />
            </div>
          ) : (
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
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full cursor-pointer"
            >
              Escanear otro producto
            </Button>
          </CardFooter>
        </Card>
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
