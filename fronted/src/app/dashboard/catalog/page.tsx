"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exportCatalog } from "./catalog.api";

export default function CatalogPage() {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);

  async function handleDownload(format: "pdf" | "excel") {
    try {
      setDownloading(format);
      const blob = await exportCatalog(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalog.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar el catálogo:", error);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Exportar Catálogo</h1>
      <div className="flex gap-4">
        <Button onClick={() => handleDownload("pdf")} disabled={downloading === "pdf"}>
          {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
        </Button>
        <Button onClick={() => handleDownload("excel")} disabled={downloading === "excel"}>
          {downloading === "excel" ? "Generando..." : "Descargar Excel"}
        </Button>
      </div>
    </div>
  );
}