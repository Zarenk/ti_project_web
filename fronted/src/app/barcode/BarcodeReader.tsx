"use client"

import socket from "@/lib/utils";
import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  barcode?: string;
  qrCode?: string;
  [key: string]: any;
}

export default function BarcodeReader() {
  const [scannedCode, setScannedCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    socket.on("barcode:result", (data) => {
      console.log("Producto recibido:", data);
      setProduct(data?.id ? data : null);
    });

    return () => {
      socket.off("barcode:result");
    };
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (scannedCode.trim()) {
      socket.emit("barcode:scan", scannedCode.trim());
      setScannedCode("");
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Lector de Código</h1>
      <form onSubmit={handleScan} className="mb-4">
        <input
          type="text"
          value={scannedCode}
          onChange={(e) => setScannedCode(e.target.value)}
          placeholder="Escanea un código o escribe uno"
          className="border p-2 w-full"
          autoFocus
        />
      </form>

      {product ? (
        <div className="bg-green-100 p-4 rounded shadow">
          <h2 className="text-xl font-semibold">Producto Encontrado</h2>
          <p><strong>ID:</strong> {product.id}</p>
          <p><strong>Nombre:</strong> {product.name}</p>
          <p><strong>Precio:</strong> S/ {product.price}</p>
          <p><strong>Descripción:</strong> {product.description}</p>
        </div>
      ) : (
        <p className="text-gray-500">No se ha detectado ningún producto aún.</p>
      )}
    </div>
  );
}