"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportCatalog } from "./catalog.api";
import { generateCatalogPdf } from "./catalog-pdf";
import { getProducts } from "../products/products.api";
import { getStoresWithProduct } from "../inventory/inventory.api";
import CategoryFilter from "./category-filter";
import CatalogPreview from "./catalog-preview";

export default function CatalogPage() {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      if (selectedCategories.length === 0) {
        setProducts([]);
        return;
      }
      const all = await getProducts();
      const filtered = all.filter((p: any) =>
        selectedCategories.includes(p.categoryId)
      );
      const mapped = await Promise.all(
        filtered.map(async (p: any) => {
          let stock: number | null = null;
          try {
            const stores = await getStoresWithProduct(p.id);
            stock = stores.reduce(
              (sum: number, item: any) => sum + (item.stock ?? 0),
              0
            );
          } catch (error) {
            console.error("Error fetching stock:", error);
          }
          return { ...p, stock };
        })
      );
      setProducts(mapped);
    }
    fetchProducts();
  }, [selectedCategories]);

  async function handleDownload(format: "pdf" | "excel") {
    try {
      setDownloading(format);
      let blob: Blob;
      if (format === "pdf") {
        blob = await generateCatalogPdf(products);
      } else {
        const params = selectedCategories.length
          ? { categories: selectedCategories }
          : {};
        blob = await exportCatalog("excel", params);
      }
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
      <CategoryFilter
        selected={selectedCategories}
        onChange={setSelectedCategories}
      />
      <div className="flex gap-4">
        <Button onClick={() => handleDownload("pdf")} disabled={downloading === "pdf"}>
          {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
        </Button>
        <Button onClick={() => handleDownload("excel")} disabled={downloading === "excel"}>
          {downloading === "excel" ? "Generando..." : "Descargar Excel"}
        </Button>
      </div>
      {products.length > 0 && <CatalogPreview products={products} />}
    </div>
  );
}