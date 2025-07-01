"use client"

import socket from "@/lib/utils";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { QRReaderProps } from "react-qr-reader";


// 👇 Aquí importamos dinámicamente con tipado
const QrReader = dynamic<QRReaderProps>(
  () => import("react-qr-reader").then((mod) => mod.default),
  { ssr: false }
);

export default function BarcodeCameraScanner() {
  const handleScan = (result: string | null) => {
    if (result) {
      console.log("Código escaneado:", result);
      socket.emit("barcode:scan", result);
    }
  };

  const handleError = (error: any) => {
    console.error("Error al escanear:", error);
  };

  useEffect(() => {
    socket.on("barcode:result", (product) => {
      console.log("Producto recibido desde backend:", product);
      
    });

    return () => {
      socket.off("barcode:result");
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Escanear con Cámara</h1>
      <QrReader
        delay={500}
        onError={handleError}
        onScan={handleScan}
        style={{ width: "100%" }}
      />
    </div>
  );
}