"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { exportCatalog } from "./catalog.api";
import { generateCatalogPdf } from "./catalog-pdf";
import { getCatalogCover, uploadCatalogCover, type CatalogCover } from "./catalog-cover.api";
import { resolveImageUrl } from "@/lib/images";
import { getProducts } from "../products/products.api";
import { getStoresWithProduct } from "../inventory/inventory.api";
import CategoryFilter from "./category-filter";
import CatalogPreview from "./catalog-preview";
import { toast } from "sonner";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getCategories } from "./catalog.api";

export default function CatalogPage() {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cover, setCover] = useState<CatalogCover | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { version } = useTenantSelection();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    async function fetchCategoriesAndCover() {
      try {
        setCategories([]);
        setCover(null);
        setSelectedCategories([]);
        setProducts([]);
        const [fetchedCategories, currentCover] = await Promise.all([
          getCategories(),
          getCatalogCover().catch(() => null),
        ]);
        if (cancelled) return;
        setCategories(fetchedCategories);
        setCover(currentCover);
        setSelectedCategories((prev) =>
          prev.filter((id) => fetchedCategories.some((cat) => cat.id === id)),
        );
        setProducts((prev) =>
          prev.filter((product) =>
            fetchedCategories.some((cat) => cat.id === product.categoryId),
          ),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching catalog data:", error);
          setCategories([]);
          setCover(null);
        }
      }
    }

    fetchCategoriesAndCover();

    return () => {
      cancelled = true;
    };
  }, [version]);

  function handleSelectCover() {
    fileInputRef.current?.click();
  }

  async function handleCoverSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error('Solo se permiten imagenes JPG o PNG');
      event.target.value = '';
      return;
    }

    try {
      setUploadingCover(true);
      const updated = await uploadCatalogCover(file);
      setCover(updated);
      toast.success('Caratula guardada');
    } catch (error) {
      console.error('Error uploading catalog cover:', error);
      toast.error('No se pudo guardar la caratula');
    } finally {
      setUploadingCover(false);
      event.target.value = '';
    }
  }

  async function handleDownload(format: "pdf" | "excel") {
    if (selectedCategories.length === 0) {
      toast.error("Debes seleccionar una categoría");
      return;
    }
    try {
      setDownloading(format);
      let blob: Blob;
      if (format === "pdf") {
        const coverImage = cover?.imageUrl ?? cover?.imagePath ?? undefined;
        blob = await generateCatalogPdf(products, coverImage);
      } else {
        const params = { categories: selectedCategories };
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

  const coverUrl = cover?.imageUrl || cover?.imagePath
    ? resolveImageUrl(cover?.imageUrl ?? cover?.imagePath)
    : null;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Exportar Catálogo</h1>
      <CategoryFilter
        categories={categories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="outline"
          onClick={handleSelectCover}
          disabled={uploadingCover}
        >
          {uploadingCover
            ? "Guardando caratula..."
            : cover
            ? "Actualizar caratula"
            : "Agregar caratula"}
        </Button>
        {coverUrl && (
          <div className="flex items-center gap-2">
            <img
              src={coverUrl}
              alt="Caratula del catalogo"
              className="h-16 w-32 rounded border object-cover"
            />
            <span className="text-sm text-muted-foreground">Vista previa</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleCoverSelected}
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
