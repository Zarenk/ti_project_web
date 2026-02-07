"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { exportCatalog } from "./catalog.api";
import { generateCatalogPdf, type CatalogLayoutMode } from "./catalog-pdf";
import { deleteCatalogCover, getCatalogCover, uploadCatalogCover, type CatalogCover } from "./catalog-cover.api";
import { resolveImageUrl } from "@/lib/images";
import { getProducts, updateProduct, uploadProductImage } from "../products/products.api";
import { getStoresWithProduct } from "../inventory/inventory.api";
import CategoryFilter from "./category-filter";
import CatalogPreview from "./catalog-preview";
import { toast } from "sonner";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getCategories } from "./catalog.api";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCompanyDetail } from "../tenancy/tenancy.api";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CatalogPage() {
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [cover, setCover] = useState<CatalogCover | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { version, selection } = useTenantSelection();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [layoutMode, setLayoutMode] = useState<CatalogLayoutMode>("grid");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [hiddenProductIds, setHiddenProductIds] = useState<number[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({});
  const [previousPriceOverrides, setPreviousPriceOverrides] = useState<Record<number, number>>({});
  const [updatingImageId, setUpdatingImageId] = useState<number | null>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const productImageTargetRef = useRef<number | null>(null);

  const normalizeImagePath = (input?: string): string => {
    const raw = input?.trim() ?? "";
    if (!raw) {
      return "";
    }

    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith("/uploads")) {
        return parsed.pathname;
      }
    } catch {
      // Ignore parsing errors for relative paths
    }

    const uploadsIndex = raw.indexOf("/uploads");
    if (uploadsIndex >= 0) {
      const relative = raw.slice(uploadsIndex);
      return relative.startsWith("/") ? relative : `/${relative}`;
    }

    return raw;
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchAllProducts() {
      try {
        const all = await getProducts();
        if (!cancelled) {
          setCatalogProducts(all);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching products:", error);
          setCatalogProducts([]);
        }
      }
    }
    fetchAllProducts();
    return () => {
      cancelled = true;
    };
  }, [version]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProducts() {
      if (selectedCategories.length === 0) {
        setProducts([]);
        setHiddenProductIds([]);
        return;
      }
      const filtered = catalogProducts.filter((p: any) =>
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
      if (!cancelled) {
        setProducts(mapped);
        const availableIds = new Set(mapped.map((item: any) => item.id));
        setHiddenProductIds((prev) => prev.filter((id) => availableIds.has(id)));
        setPriceOverrides((prev) => {
          const next: Record<number, number> = {};
          for (const id of availableIds) {
            if (prev[id] !== undefined) {
              next[id] = prev[id];
            }
          }
          return next;
        });
        setPreviousPriceOverrides((prev) => {
          const next: Record<number, number> = {};
          for (const id of availableIds) {
            if (prev[id] !== undefined) {
              next[id] = prev[id];
            }
          }
          return next;
        });
      }
    }
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [selectedCategories, catalogProducts]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCompanyLogo() {
      if (!selection?.companyId) {
        setCompanyLogoUrl(null);
        return;
      }
      try {
        const detail = await getCompanyDetail(selection.companyId);
        if (cancelled) return;
        const logo = detail?.logoUrl ? resolveImageUrl(detail.logoUrl) : null;
        setCompanyLogoUrl(logo);
      } catch {
        if (!cancelled) {
          setCompanyLogoUrl(null);
        }
      }
    }
    void fetchCompanyLogo();
    return () => {
      cancelled = true;
    };
  }, [selection?.companyId, version]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategoriesAndCover() {
      try {
        setCategories([]);
        setCover(null);
        setSelectedCategories([]);
        setProducts([]);
        setHiddenProductIds([]);
        setPriceOverrides({});
        setPreviousPriceOverrides({});
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

  async function handleRemoveCover() {
    if (!cover) return;
    try {
      setRemovingCover(true);
      await deleteCatalogCover();
      setCover(null);
      toast.success('Caratula eliminada');
    } catch (error) {
      console.error('Error deleting catalog cover:', error);
      toast.error('No se pudo eliminar la caratula');
    } finally {
      setRemovingCover(false);
    }
  }

  const visibleProducts = useMemo(
    () => products.filter((p: any) => !hiddenProductIds.includes(p.id)),
    [products, hiddenProductIds],
  );

  const pdfProducts = useMemo(
    () =>
      visibleProducts.map((product: any) => {
        const overrides: any = { ...product };
        if (typeof product.id === "number") {
          if (priceOverrides[product.id] !== undefined) {
            overrides.priceSell = priceOverrides[product.id];
          }
          if (previousPriceOverrides[product.id] !== undefined) {
            overrides.previousPriceOverride = previousPriceOverrides[product.id];
          }
        }
        return overrides;
      }),
    [visibleProducts, priceOverrides, previousPriceOverrides],
  );

  const hiddenProducts = products.filter((p: any) =>
    hiddenProductIds.includes(p.id),
  );

  async function handleDownload(format: "pdf" | "excel") {
    if (selectedCategories.length === 0) {
      toast.error("Debes seleccionar una categoría");
      return;
    }
    try {
      setDownloading(format);
      let blob: Blob;
      if (format === "pdf") {
        const coverImage =
          cover?.imageUrl ??
          cover?.imagePath ??
          cover?.pdfImageUrl ??
          undefined;
        blob = await generateCatalogPdf(
          pdfProducts,
          coverImage,
          layoutMode,
          companyLogoUrl ?? undefined,
        );
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

  function handleHideProduct(productId: number) {
    setHiddenProductIds((prev) =>
      prev.includes(productId) ? prev : [...prev, productId],
    );
  }

  function handleRestoreProduct(productId: number) {
    setHiddenProductIds((prev) => prev.filter((id) => id !== productId));
  }

  function handleRestoreAllHidden() {
    setHiddenProductIds([]);
  }

  function handlePriceChange(productId: number, value: number | null) {
    setPriceOverrides((prev) => {
      if (value === null || Number.isNaN(value)) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: value };
    });
  }

  function handlePreviousPriceChange(productId: number, value: number | null) {
    setPreviousPriceOverrides((prev) => {
      if (value === null || Number.isNaN(value)) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: value };
    });
  }

  function handleResetCatalogOptions() {
    setSelectedCategories([]);
    setProducts([]);
    setHiddenProductIds([]);
    setPriceOverrides({});
    setPreviousPriceOverrides({});
    setLayoutMode("grid");
  }

  function handleSelectProductImage(productId: number) {
    productImageTargetRef.current = productId;
    productImageInputRef.current?.click();
  }

  async function handleProductImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const productId = productImageTargetRef.current;
    if (!file || !productId) {
      return;
    }

    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Solo se permiten imagenes JPG o PNG");
      event.target.value = "";
      productImageTargetRef.current = null;
      return;
    }

    try {
      setUpdatingImageId(productId);
      const { url } = await uploadProductImage(file);
      const normalizedPath = normalizeImagePath(url);
      const updated = await updateProduct(String(productId), {
        images: [normalizedPath],
      });

      setCatalogProducts((prev) =>
        prev.map((product: any) =>
          product.id === productId
            ? {
                ...product,
                ...updated,
                image: updated?.image ?? normalizedPath,
                imageUrl: updated?.imageUrl ?? normalizedPath,
                images: updated?.images ?? [normalizedPath],
              }
            : product,
        ),
      );
      setProducts((prev) =>
        prev.map((product: any) =>
          product.id === productId
            ? {
                ...product,
                ...updated,
                image: updated?.image ?? normalizedPath,
                imageUrl: updated?.imageUrl ?? normalizedPath,
                images: updated?.images ?? [normalizedPath],
              }
            : product,
        ),
      );
      toast.success("Imagen actualizada");
    } catch (error) {
      console.error("Error updating product image:", error);
      toast.error("No se pudo actualizar la imagen");
    } finally {
      setUpdatingImageId(null);
      event.target.value = "";
      productImageTargetRef.current = null;
    }
  }

  const coverUrl = cover?.imageUrl || cover?.imagePath
    ? resolveImageUrl(cover?.imageUrl ?? cover?.imagePath)
    : null;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Exportar Catálogo</h1>
      <CategoryFilter
        categories={categories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
        products={catalogProducts}
      />
      {hiddenProducts.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              Productos ocultos ({hiddenProductIds.length}):
            </span>
            {hiddenProducts.map((product: any) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <span className="text-xs font-semibold">{product.name}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-primary underline cursor-pointer"
                      onClick={() => handleRestoreProduct(product.id)}
                    >
                      Mostrar
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Volver a mostrar</TooltipContent>
                </Tooltip>
              </Badge>
            ))}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestoreAllHidden}
                  className="ml-auto text-xs font-medium cursor-pointer"
                >
                  Restaurar todos
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Mostrar todos los productos ocultos</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleSelectCover}
              disabled={uploadingCover}
              className="cursor-pointer"
            >
              {uploadingCover
                ? "Guardando caratula..."
                : cover
                ? "Actualizar caratula"
                : "Agregar caratula"}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {cover ? "Actualizar caratula" : "Agregar caratula"}
          </TooltipContent>
        </Tooltip>
        {coverUrl && (
          <div className="flex items-center gap-2">
            <div className="relative h-16 w-32">
              <img
                src={coverUrl}
                alt="Caratula del catalogo"
                className="h-full w-full rounded border object-cover"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    disabled={removingCover}
                    className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-destructive text-xs font-bold text-white shadow"
                    aria-label="Eliminar caratula"
                  >
                    ×
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Eliminar caratula</TooltipContent>
              </Tooltip>
            </div>
            <span className="text-sm text-muted-foreground">
              {removingCover ? 'Eliminando...' : 'Vista previa'}
            </span>
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
      <input
        ref={productImageInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleProductImageSelected}
      />
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="layout-mode" className="text-sm font-medium">
              Distribución
            </Label>
            <Select
              value={layoutMode}
              onValueChange={(value) => setLayoutMode(value as CatalogLayoutMode)}
            >
              <SelectTrigger id="layout-mode" className="w-[200px] cursor-pointer">
                <SelectValue placeholder="Selecciona un modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Tarjetas (3x3)</SelectItem>
                <SelectItem value="list">Listado (1x1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDownload("pdf")}
                  disabled={downloading === "pdf"}
                  className="cursor-pointer"
                >
                  {downloading === "pdf" ? "Generando..." : "Descargar PDF"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Descargar catalogo en PDF</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleDownload("excel")}
                  disabled={downloading === "excel"}
                  className="cursor-pointer"
                >
                  {downloading === "excel" ? "Generando..." : "Descargar Excel"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Descargar catalogo en Excel</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetCatalogOptions}
                  className="group relative cursor-pointer overflow-hidden border-primary/40 text-primary transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white"
                >
                  <span className="relative z-10">Limpiar configuración</span>
                  <span className="absolute inset-0 translate-y-full bg-primary/80 transition-all duration-200 group-hover:translate-y-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Restablecer opciones del catalogo</TooltipContent>
            </Tooltip>
</div>
        </div>
      </div>
      {visibleProducts.length > 0 ? (
          <CatalogPreview
            products={visibleProducts}
            layout={layoutMode}
            onRemoveProduct={handleHideProduct}
            onPriceChange={handlePriceChange}
            onPreviousPriceChange={handlePreviousPriceChange}
            priceOverrides={priceOverrides}
            previousPriceOverrides={previousPriceOverrides}
            onRequestImageUpdate={handleSelectProductImage}
            updatingImageId={updatingImageId}
          />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Selecciona categorias y deja visibles los productos que quieres incluir.
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}



