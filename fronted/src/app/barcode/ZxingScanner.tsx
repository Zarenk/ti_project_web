"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  BarcodeFormat,
  DecodeHintType,
  NotFoundException,
} from "@zxing/library";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface ZxingScannerProps {
  onScanSuccess: (decodedText: string, format: string) => void;
  onScanError?: (error: Error) => void;
  formats?: BarcodeFormat[];
}

/**
 * Modern barcode/QR scanner using @zxing/browser
 *
 * Supports multiple formats:
 * - QR Code
 * - EAN-13 (common product barcodes)
 * - EAN-8
 * - UPC-A
 * - UPC-E
 * - Code 128
 * - Code 39
 * - ITF (Interleaved 2 of 5)
 * - And more...
 */
export default function ZxingScanner({
  onScanSuccess,
  onScanError,
  formats,
}: ZxingScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isActive = true;
    let controls: { stop: () => void } | null = null;

    const initScanner = async () => {
      try {
        // Configure hints for better performance and QR detection
        const hints = new Map();

        // Set supported formats (default to common formats if not specified)
        const supportedFormats = formats ?? [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
        ];
        hints.set(DecodeHintType.POSSIBLE_FORMATS, supportedFormats);

        // 🚀 OPTIMIZATIONS: Better QR detection in complex positions
        hints.set(DecodeHintType.TRY_HARDER, true); // More thorough scanning
        hints.set(DecodeHintType.PURE_BARCODE, false); // Allow detection of codes with surrounding content
        hints.set(DecodeHintType.ASSUME_GS1, false); // Better for non-GS1 codes

        // Create reader with hints
        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        // Get available video devices using native API
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoInputDevices.length === 0) {
          throw new Error("No se encontraron cámaras disponibles");
        }

        // Prefer back camera on mobile devices
        const backCamera = videoInputDevices.find((device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("trasera") ||
          device.label.toLowerCase().includes("rear")
        );
        const selectedDeviceId = backCamera?.deviceId ?? videoInputDevices[0].deviceId;
        setDeviceId(selectedDeviceId);

        if (!isActive || !videoRef.current) return;

        console.log(`[ZxingScanner] Using camera: ${videoInputDevices.find(d => d.deviceId === selectedDeviceId)?.label || selectedDeviceId}`);

        // Start continuous scanning using decodeFromVideoDevice
        // This is the correct API for @zxing/browser
        controls = await reader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result && isActive) {
              const text = result.getText();
              const format = BarcodeFormat[result.getBarcodeFormat()];
              console.log(`[ZxingScanner] ✅ Scanned: ${text} (${format})`);
              onScanSuccess(text, format);
            }

            // Only log errors that are NOT "NotFoundException" (which is normal)
            if (error && !(error instanceof NotFoundException)) {
              console.warn("[ZxingScanner] Scan error:", error);
            }
          }
        );

        setIsLoading(false);
      } catch (err) {
        console.error("[ZxingScanner] Initialization error:", err);
        const errorMessage = err instanceof Error ? err.message : "Error al iniciar el escáner";
        setError(errorMessage);
        setIsLoading(false);
        onScanError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initScanner();

    // Cleanup function
    return () => {
      isActive = false;

      // Stop continuous decode
      if (controls) {
        try {
          controls.stop();
        } catch (e) {
          console.warn("[ZxingScanner] Error stopping controls:", e);
        }
      }

      // Stop all video tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Clear reader
      if (readerRef.current) {
        readerRef.current = null;
      }
    };
  }, [formats, onScanSuccess, onScanError]);

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

      <video
        ref={videoRef}
        className="w-full"
        style={{
          maxHeight: "500px", // 🚀 Larger viewport for better scanning
          objectFit: "cover",
        }}
        playsInline // Important for iOS devices
        autoPlay
        muted
      />

      {/* Scan guide overlay - LARGER for better visibility */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          {/* Main scanning frame */}
          <div className="h-64 w-64 rounded-xl border-4 border-primary shadow-2xl">
            {/* Corner indicators for better visual guidance */}
            <div className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-primary" />
            <div className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-primary" />
            <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-primary" />
            <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-primary" />
          </div>

          {/* Pulsing animation to indicate active scanning */}
          <div className="absolute inset-0 animate-pulse rounded-xl border-2 border-primary/30" />
        </div>
      </div>

      {/* Info text with tips */}
      <div className="absolute bottom-6 left-0 right-0 space-y-2 px-4 text-center">
        <p className="text-sm font-medium text-white drop-shadow-lg">
          Centra el código QR en el recuadro
        </p>
        <p className="text-xs text-white/80 drop-shadow-lg">
          💡 Mantén el código estable y bien iluminado
        </p>
      </div>
    </div>
  );
}
