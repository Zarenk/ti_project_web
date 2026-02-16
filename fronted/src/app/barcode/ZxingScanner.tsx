"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface ZxingScannerProps {
  onScanSuccess: (decodedText: string, format: string) => void;
  onScanError?: (error: Error) => void;
}

/**
 * Barcode/QR scanner using html5-qrcode (self-contained, zero dependencies).
 *
 * Supports: QR Code, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, ITF, etc.
 */
export default function ZxingScanner({
  onScanSuccess,
  onScanError,
}: ZxingScannerProps) {
  const containerId = useId().replace(/:/g, "_");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const initScanner = async () => {
      try {
        const scanner = new Html5Qrcode(containerId, /* verbose */ false);
        scannerRef.current = scanner;

        const devices = await Html5Qrcode.getCameras();
        if (devices.length === 0) {
          throw new Error("No se encontraron cámaras disponibles");
        }

        // Prefer back camera on mobile devices
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("trasera") ||
            d.label.toLowerCase().includes("rear")
        );
        const cameraId = backCamera?.id ?? devices[0].id;

        if (!isActive) return;

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, result) => {
            if (!isActive) return;
            const format = result?.result?.format?.formatName ?? "UNKNOWN";
            console.log(`[Scanner] Scanned: ${decodedText} (${format})`);
            onScanSuccess(decodedText, format);
          },
          // errorMessage callback (called on every frame without a code - ignore)
          () => {}
        );

        setIsLoading(false);
      } catch (err) {
        if (!isActive) return;
        console.error("[Scanner] Initialization error:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Error al iniciar el escáner";
        setError(errorMessage);
        setIsLoading(false);
        onScanError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initScanner();

    return () => {
      isActive = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((e: unknown) =>
            console.warn("[Scanner] Error stopping:", e)
          )
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [containerId, onScanSuccess, onScanError]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      <div
        id={containerId}
        className="w-full"
        style={{ maxHeight: "500px" }}
      />

      {/* Info text */}
      <div className="absolute bottom-6 left-0 right-0 space-y-2 px-4 text-center">
        <p className="text-sm font-medium text-white drop-shadow-lg">
          Centra el código QR en el recuadro
        </p>
        <p className="text-xs text-white/80 drop-shadow-lg">
          Mantén el código estable y bien iluminado
        </p>
      </div>
    </div>
  );
}
