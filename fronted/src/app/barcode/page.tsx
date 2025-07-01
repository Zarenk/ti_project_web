"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";

// Importar dinámicamente (solo en cliente)
const Html5QrScanner = dynamic(() => import("@/app/barcode/Html5QrScanner"), {
  ssr: false,
});

export default function LectorCamaraPage() {
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleScan = (code: string) => {
    if (!scanned && code) {
      setScanned(true);
      toast.success(`Código escaneado: ${code}`);
      router.push(`/producto/${code}`);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-center mb-4">Escáner QR</h1>
      <Html5QrScanner onScanSuccess={handleScan} />
    </div>
  );
}
