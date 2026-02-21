"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  ImageOff,
  LayoutGrid,
  List,
  Loader2,
  Package,
  RotateCcw,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Check,
  Tags,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { exportCatalog, getCategories } from "./catalog.api";
import { generateCatalogPdf, type CatalogLayoutMode } from "./catalog-pdf";
import {
  deleteCatalogCover,
  getCatalogCover,
  uploadCatalogCover,
  type CatalogCover,
} from "./catalog-cover.api";
import { resolveImageUrl } from "@/lib/images";
import { getProducts, updateProduct, uploadProductImage } from "../products/products.api";
import { getStoresWithProduct } from "../inventory/inventory.api";
import { getCompanyDetail } from "../tenancy/tenancy.api";

import CategoryFilter from "./category-filter";
import CatalogPreview from "./catalog-preview";
import { CatalogStepper, type StepDef } from "./catalog-stepper";

import { useTenantSelection } from "@/context/tenant-selection-context";
import { useAuth } from "@/context/auth-context";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { CATALOG_GUIDE_STEPS } from "./catalog-guide-steps";

const STEPS: StepDef[] = [
  { label: "Categorias", description: "Selecciona productos" },
  { label: "Personalizar", description: "Ajusta tu catalogo" },
  { label: "Descargar", description: "Exporta el resultado" },
];

export default function CatalogPage() {
  /* ─── Wizard ─── */
  const [currentStep, setCurrentStep] = useState(0);

  /* ─── Data ─── */
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [cover, setCover] = useState<CatalogCover | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { version, selection } = useTenantSelection();
  const { userId } = useAuth();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [layoutMode, setLayoutMode] = useState<CatalogLayoutMode>("grid");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [hiddenProductIds, setHiddenProductIds] = useState<number[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<
    Record<number, number>
  >({});
  const [previousPriceOverrides, setPreviousPriceOverrides] = useState<
    Record<number, number>
  >({});
  const [updatingImageId, setUpdatingImageId] = useState<number | null>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const productImageTargetRef = useRef<number | null>(null);

  /* ─── Derived ─── */
  const catalogLayoutStorageKey = useMemo(() => {
    if (!selection?.orgId) return null;
    const suffix = typeof userId === "number" ? `:${userId}` : "";
    return `catalog_layout_mode_v1:${selection.orgId}${suffix}`;
  }, [selection?.orgId, userId]);

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
            overrides.previousPriceOverride =
              previousPriceOverrides[product.id];
          }
        }
        return overrides;
      }),
    [visibleProducts, priceOverrides, previousPriceOverrides],
  );

  const hiddenProducts = products.filter((p: any) =>
    hiddenProductIds.includes(p.id),
  );

  const coverUrl =
    cover?.imageUrl || cover?.imagePath
      ? resolveImageUrl(cover?.imageUrl ?? cover?.imagePath)
      : null;

  const editedPricesCount =
    Object.keys(priceOverrides).length +
    Object.keys(previousPriceOverrides).length;

  const canProceedStep0 = selectedCategories.length > 0;

  /* ─── Layout persistence ─── */
  useEffect(() => {
    if (!catalogLayoutStorageKey) {
      setLayoutMode("grid");
      return;
    }
    try {
      const stored = localStorage.getItem(catalogLayoutStorageKey);
      if (stored === "grid" || stored === "list") {
        setLayoutMode(stored as CatalogLayoutMode);
      } else {
        setLayoutMode("grid");
      }
    } catch {
      setLayoutMode("grid");
    }
  }, [catalogLayoutStorageKey]);

  useEffect(() => {
    if (!catalogLayoutStorageKey) return;
    try {
      localStorage.setItem(catalogLayoutStorageKey, layoutMode);
    } catch {
      // noop
    }
  }, [catalogLayoutStorageKey, layoutMode]);

  /* ─── Data fetching ─── */
  const normalizeImagePath = (input?: string): string => {
    const raw = input?.trim() ?? "";
    if (!raw) return "";
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith("/uploads")) return parsed.pathname;
    } catch {
      // relative
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
        if (!cancelled) setCatalogProducts(all);
      } catch {
        if (!cancelled) setCatalogProducts([]);
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
        selectedCategories.includes(p.categoryId),
      );
      const mapped = await Promise.all(
        filtered.map(async (p: any) => {
          let stock: number | null = null;
          try {
            const stores = await getStoresWithProduct(p.id);
            stock = stores.reduce(
              (sum: number, item: any) => sum + (item.stock ?? 0),
              0,
            );
          } catch {
            // ignore
          }
          return { ...p, stock };
        }),
      );
      if (!cancelled) {
        setProducts(mapped);
        const availableIds = new Set(mapped.map((item: any) => item.id));
        setHiddenProductIds((prev) =>
          prev.filter((id) => availableIds.has(id)),
        );
        setPriceOverrides((prev) => {
          const next: Record<number, number> = {};
          for (const id of availableIds) {
            if (prev[id] !== undefined) next[id] = prev[id];
          }
          return next;
        });
        setPreviousPriceOverrides((prev) => {
          const next: Record<number, number> = {};
          for (const id of availableIds) {
            if (prev[id] !== undefined) next[id] = prev[id];
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
        if (!cancelled) setCompanyLogoUrl(null);
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
          prev.filter((id) =>
            fetchedCategories.some((cat) => cat.id === id),
          ),
        );
        setProducts((prev) =>
          prev.filter((product) =>
            fetchedCategories.some(
              (cat) => cat.id === product.categoryId,
            ),
          ),
        );
      } catch {
        if (!cancelled) {
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

  /* ─── Handlers ─── */
  function handleSelectCover() {
    fileInputRef.current?.click();
  }

  async function handleCoverSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast.error("Solo se permiten imagenes JPG o PNG");
      event.target.value = "";
      return;
    }
    try {
      setUploadingCover(true);
      const updated = await uploadCatalogCover(file);
      setCover(updated);
      toast.success("Caratula guardada");
    } catch {
      toast.error("No se pudo guardar la caratula");
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  }

  async function handleRemoveCover() {
    if (!cover) return;
    try {
      setRemovingCover(true);
      await deleteCatalogCover();
      setCover(null);
      toast.success("Caratula eliminada");
    } catch {
      toast.error("No se pudo eliminar la caratula");
    } finally {
      setRemovingCover(false);
    }
  }

  async function handleDownload(format: "pdf" | "excel") {
    if (selectedCategories.length === 0) {
      toast.error("Debes seleccionar una categoria");
      return;
    }
    try {
      setDownloading(format);
      let blob: Blob;
      if (format === "pdf") {
        const coverImage =
          cover?.imageUrl ?? cover?.imagePath ?? cover?.pdfImageUrl ?? undefined;
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
    } catch {
      toast.error("Error al descargar el catalogo");
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

  function handlePreviousPriceChange(
    productId: number,
    value: number | null,
  ) {
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
    setCurrentStep(0);
    if (catalogLayoutStorageKey) {
      try {
        localStorage.removeItem(catalogLayoutStorageKey);
      } catch {
        // noop
      }
    }
  }

  function handleSelectProductImage(productId: number) {
    productImageTargetRef.current = productId;
    productImageInputRef.current?.click();
  }

  async function handleProductImageSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    const productId = productImageTargetRef.current;
    if (!file || !productId) return;
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
      const patch = {
        ...updated,
        image: updated?.image ?? normalizedPath,
        imageUrl: updated?.imageUrl ?? normalizedPath,
        images: updated?.images ?? [normalizedPath],
      };
      setCatalogProducts((prev) =>
        prev.map((p: any) => (p.id === productId ? { ...p, ...patch } : p)),
      );
      setProducts((prev) =>
        prev.map((p: any) => (p.id === productId ? { ...p, ...patch } : p)),
      );
      toast.success("Imagen actualizada");
    } catch {
      toast.error("No se pudo actualizar la imagen");
    } finally {
      setUpdatingImageId(null);
      event.target.value = "";
      productImageTargetRef.current = null;
    }
  }

  /* ─── Step navigation ─── */
  function canReachStep(index: number): boolean {
    if (index === currentStep) return false;
    // Step 0 is always reachable
    if (index === 0) return true;
    // Steps 1 and 2 require categories selected and visible products
    if (index >= 1) return canProceedStep0 && visibleProducts.length > 0;
    return false;
  }

  function handleStepClick(index: number) {
    if (!canReachStep(index)) {
      if (index >= 1 && !canProceedStep0) {
        toast.error("Selecciona al menos una categoria primero");
      } else if (index >= 1 && visibleProducts.length === 0) {
        toast.error("No hay productos visibles para incluir en el catalogo");
      }
      return;
    }
    setCurrentStep(index);
  }

  function handleNext() {
    const nextStep = currentStep + 1;
    if (nextStep >= STEPS.length) return;
    handleStepClick(nextStep);
  }

  function handleBack() {
    const prevStep = currentStep - 1;
    if (prevStep < 0) return;
    handleStepClick(prevStep);
  }

  /* ─── Render ─── */
  return (
    <TooltipProvider delayDuration={120}>
      <div className="min-h-screen w-full px-4 py-6 sm:px-6 lg:px-10">
        {/* Hidden file inputs */}
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

        {/* Header */}
        <div className="mb-6 space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Exportar Catalogo
            </h1>
            <PageGuideButton steps={CATALOG_GUIDE_STEPS} tooltipLabel="Guía del catálogo" />
          </div>
          <p className="text-sm text-muted-foreground">
            Configura y descarga tu catalogo de productos en PDF o Excel
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <CatalogStepper
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canReachStep={canReachStep}
          />
        </div>

        {/* Step content */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <StepCategories
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              catalogProducts={catalogProducts}
              visibleProducts={visibleProducts}
              hiddenProducts={hiddenProducts}
              onHideProduct={handleHideProduct}
              onRestoreProduct={handleRestoreProduct}
              onRestoreAllHidden={handleRestoreAllHidden}
              layoutMode={layoutMode}
            />
          )}

          {currentStep === 1 && (
            <StepCustomize
              coverUrl={coverUrl}
              cover={cover}
              uploadingCover={uploadingCover}
              removingCover={removingCover}
              onSelectCover={handleSelectCover}
              onRemoveCover={handleRemoveCover}
              layoutMode={layoutMode}
              onLayoutChange={setLayoutMode}
              visibleProducts={visibleProducts}
              onHideProduct={handleHideProduct}
              onPriceChange={handlePriceChange}
              onPreviousPriceChange={handlePreviousPriceChange}
              priceOverrides={priceOverrides}
              previousPriceOverrides={previousPriceOverrides}
              onRequestImageUpdate={handleSelectProductImage}
              updatingImageId={updatingImageId}
              hiddenProducts={hiddenProducts}
              onRestoreProduct={handleRestoreProduct}
              onRestoreAllHidden={handleRestoreAllHidden}
            />
          )}

          {currentStep === 2 && (
            <StepExport
              selectedCategories={selectedCategories}
              categories={categories}
              visibleProductsCount={visibleProducts.length}
              hiddenProductsCount={hiddenProducts.length}
              layoutMode={layoutMode}
              hasCover={!!cover}
              editedPricesCount={editedPricesCount}
              downloading={downloading}
              onDownload={handleDownload}
              onReset={handleResetCatalogOptions}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="cursor-pointer gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {STEPS.length}
          </span>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canReachStep(currentStep + 1)}
              className="cursor-pointer gap-1.5"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[120px]" />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 — Categorias y Productos
   ═══════════════════════════════════════════════════════════════════ */

function StepCategories({
  categories,
  selectedCategories,
  onCategoriesChange,
  catalogProducts,
  visibleProducts,
  hiddenProducts,
  onHideProduct,
  onRestoreProduct,
  onRestoreAllHidden,
  layoutMode,
}: {
  categories: { id: number; name: string }[];
  selectedCategories: number[];
  onCategoriesChange: (ids: number[]) => void;
  catalogProducts: any[];
  visibleProducts: any[];
  hiddenProducts: any[];
  onHideProduct: (id: number) => void;
  onRestoreProduct: (id: number) => void;
  onRestoreAllHidden: () => void;
  layoutMode: CatalogLayoutMode;
}) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          Selecciona las categorias para tu catalogo
        </h2>
        <p className="text-sm text-muted-foreground">
          Elige las categorias de productos que deseas incluir. Puedes ocultar
          productos individuales desde la vista previa.
        </p>
      </div>

      {/* Category filter */}
      <CategoryFilter
        categories={categories}
        selected={selectedCategories}
        onChange={onCategoriesChange}
        products={catalogProducts}
      />

      {/* Stats bar */}
      {selectedCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-sm">
            <Tags className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {selectedCategories.length}
            </span>
            <span className="text-muted-foreground">
              {selectedCategories.length === 1
                ? "categoria"
                : "categorias"}
            </span>
          </div>
          <span className="text-muted-foreground/30">|</span>
          <div className="flex items-center gap-1.5 text-sm">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{visibleProducts.length}</span>
            <span className="text-muted-foreground">
              {visibleProducts.length === 1 ? "producto" : "productos"}{" "}
              visibles
            </span>
          </div>
          {hiddenProducts.length > 0 && (
            <>
              <span className="text-muted-foreground/30">|</span>
              <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <EyeOff className="h-4 w-4" />
                <span className="font-medium">
                  {hiddenProducts.length}
                </span>
                <span>ocultos</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden products */}
      {hiddenProducts.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Productos ocultos:
            </span>
            {hiddenProducts.map((product: any) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="flex cursor-pointer items-center gap-1.5 transition-colors hover:bg-secondary/80"
                onClick={() => onRestoreProduct(product.id)}
              >
                <span className="text-xs">{product.name}</span>
                <Eye className="h-3 w-3 text-primary" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestoreAllHidden}
              className="ml-auto cursor-pointer text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400"
            >
              Restaurar todos
            </Button>
          </div>
        </div>
      )}

      {/* Product preview */}
      {visibleProducts.length > 0 ? (
        <CatalogPreview
          products={visibleProducts}
          layout={layoutMode}
          onRemoveProduct={onHideProduct}
        />
      ) : selectedCategories.length > 0 ? (
        <EmptyState
          icon={EyeOff}
          title="Todos los productos estan ocultos"
          description="Restaura productos ocultos para verlos en la vista previa."
        />
      ) : (
        <EmptyState
          icon={Tags}
          title="Selecciona categorias"
          description="Haz clic en 'Seleccionar categorias' para elegir que productos incluir en tu catalogo."
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 — Personalizar
   ═══════════════════════════════════════════════════════════════════ */

function StepCustomize({
  coverUrl,
  cover,
  uploadingCover,
  removingCover,
  onSelectCover,
  onRemoveCover,
  layoutMode,
  onLayoutChange,
  visibleProducts,
  onHideProduct,
  onPriceChange,
  onPreviousPriceChange,
  priceOverrides,
  previousPriceOverrides,
  onRequestImageUpdate,
  updatingImageId,
  hiddenProducts,
  onRestoreProduct,
  onRestoreAllHidden,
}: {
  coverUrl: string | null;
  cover: CatalogCover | null;
  uploadingCover: boolean;
  removingCover: boolean;
  onSelectCover: () => void;
  onRemoveCover: () => void;
  layoutMode: CatalogLayoutMode;
  onLayoutChange: (mode: CatalogLayoutMode) => void;
  visibleProducts: any[];
  onHideProduct: (id: number) => void;
  onPriceChange: (id: number, value: number | null) => void;
  onPreviousPriceChange: (id: number, value: number | null) => void;
  priceOverrides: Record<number, number>;
  previousPriceOverrides: Record<number, number>;
  onRequestImageUpdate: (id: number) => void;
  updatingImageId: number | null;
  hiddenProducts: any[];
  onRestoreProduct: (id: number) => void;
  onRestoreAllHidden: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Personaliza tu catalogo</h2>
        <p className="text-sm text-muted-foreground">
          Configura la caratula, distribucion, y ajusta precios o imagenes de
          los productos.
        </p>
      </div>

      {/* Top config row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Cover card */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Caratula del catalogo</span>
              {cover && (
                <Badge
                  variant="secondary"
                  className="text-[10px] text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="mr-1 h-3 w-3" />
                  Configurada
                </Badge>
              )}
            </div>

            {coverUrl ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-lg border bg-muted/20">
                  <img
                    src={coverUrl}
                    alt="Caratula del catalogo"
                    className="h-40 w-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSelectCover}
                    disabled={uploadingCover}
                    className="flex-1 cursor-pointer text-xs"
                  >
                    {uploadingCover ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-3 w-3" />
                    )}
                    {uploadingCover ? "Subiendo..." : "Cambiar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRemoveCover}
                    disabled={removingCover}
                    className="cursor-pointer text-xs text-destructive hover:text-destructive"
                  >
                    {removingCover ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-3 w-3" />
                    )}
                    Eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSelectCover}
                disabled={uploadingCover}
                className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/20 p-8 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                {uploadingCover ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/40" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-muted-foreground/30" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploadingCover
                    ? "Subiendo caratula..."
                    : "Haz clic para agregar una caratula"}
                </span>
                <span className="text-[11px] text-muted-foreground/50">
                  JPG o PNG
                </span>
              </button>
            )}
          </CardContent>
        </Card>

        {/* Layout card */}
        <Card>
          <CardContent className="p-4">
            <span className="mb-3 block text-sm font-medium">
              Distribucion del catalogo
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onLayoutChange("grid")}
                className={cn(
                  "group flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                  layoutMode === "grid"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted-foreground/15 hover:border-muted-foreground/30 hover:bg-muted/30",
                )}
              >
                <LayoutGrid
                  className={cn(
                    "h-8 w-8 transition-colors",
                    layoutMode === "grid"
                      ? "text-primary"
                      : "text-muted-foreground/40 group-hover:text-muted-foreground/60",
                  )}
                />
                <div className="text-center">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      layoutMode === "grid"
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    Tarjetas
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    3 por fila
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange("list")}
                className={cn(
                  "group flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                  layoutMode === "list"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted-foreground/15 hover:border-muted-foreground/30 hover:bg-muted/30",
                )}
              >
                <List
                  className={cn(
                    "h-8 w-8 transition-colors",
                    layoutMode === "list"
                      ? "text-primary"
                      : "text-muted-foreground/40 group-hover:text-muted-foreground/60",
                  )}
                />
                <div className="text-center">
                  <span
                    className={cn(
                      "block text-sm font-medium",
                      layoutMode === "list"
                        ? "text-primary"
                        : "text-foreground",
                    )}
                  >
                    Listado
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    1 por fila
                  </span>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden products */}
      {hiddenProducts.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Ocultos ({hiddenProducts.length}):
            </span>
            {hiddenProducts.map((product: any) => (
              <Badge
                key={product.id}
                variant="secondary"
                className="flex cursor-pointer items-center gap-1.5 transition-colors hover:bg-secondary/80"
                onClick={() => onRestoreProduct(product.id)}
              >
                <span className="text-xs">{product.name}</span>
                <Eye className="h-3 w-3 text-primary" />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestoreAllHidden}
              className="ml-auto cursor-pointer text-xs"
            >
              Restaurar todos
            </Button>
          </div>
        </div>
      )}

      {/* Products with price editing */}
      {visibleProducts.length > 0 ? (
        <CatalogPreview
          products={visibleProducts}
          layout={layoutMode}
          onRemoveProduct={onHideProduct}
          onPriceChange={onPriceChange}
          onPreviousPriceChange={onPreviousPriceChange}
          priceOverrides={priceOverrides}
          previousPriceOverrides={previousPriceOverrides}
          onRequestImageUpdate={onRequestImageUpdate}
          updatingImageId={updatingImageId}
        />
      ) : (
        <EmptyState
          icon={Package}
          title="No hay productos visibles"
          description="Restaura productos ocultos o vuelve al paso anterior para seleccionar categorias."
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3 — Descargar
   ═══════════════════════════════════════════════════════════════════ */

function StepExport({
  selectedCategories,
  categories,
  visibleProductsCount,
  hiddenProductsCount,
  layoutMode,
  hasCover,
  editedPricesCount,
  downloading,
  onDownload,
  onReset,
}: {
  selectedCategories: number[];
  categories: { id: number; name: string }[];
  visibleProductsCount: number;
  hiddenProductsCount: number;
  layoutMode: CatalogLayoutMode;
  hasCover: boolean;
  editedPricesCount: number;
  downloading: "pdf" | "excel" | null;
  onDownload: (format: "pdf" | "excel") => void;
  onReset: () => void;
}) {
  const selectedCategoryNames = categories
    .filter((c) => selectedCategories.includes(c.id))
    .map((c) => c.name);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Tu catalogo esta listo</h2>
        <p className="text-sm text-muted-foreground">
          Revisa el resumen y descarga tu catalogo en el formato que prefieras.
        </p>
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="divide-y p-0">
          <SummaryRow
            label="Categorias"
            value={
              <div className="flex flex-wrap gap-1">
                {selectedCategoryNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            }
          />
          <SummaryRow
            label="Productos visibles"
            value={
              <span className="font-medium tabular-nums">
                {visibleProductsCount}
              </span>
            }
          />
          {hiddenProductsCount > 0 && (
            <SummaryRow
              label="Productos ocultos"
              value={
                <span className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {hiddenProductsCount}
                </span>
              }
            />
          )}
          <SummaryRow
            label="Distribucion"
            value={
              <div className="flex items-center gap-1.5">
                {layoutMode === "grid" ? (
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <List className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {layoutMode === "grid" ? "Tarjetas (3x3)" : "Listado (1x1)"}
                </span>
              </div>
            }
          />
          <SummaryRow
            label="Caratula"
            value={
              hasCover ? (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                  Configurada
                </span>
              ) : (
                <span className="text-muted-foreground">Sin caratula</span>
              )
            }
          />
          {editedPricesCount > 0 && (
            <SummaryRow
              label="Precios editados"
              value={
                <span className="font-medium tabular-nums">
                  {editedPricesCount}
                </span>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Download buttons */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onDownload("pdf")}
          disabled={downloading === "pdf"}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-8 transition-all",
            downloading === "pdf"
              ? "border-primary/50 bg-primary/5"
              : "border-muted-foreground/15 hover:border-red-500/40 hover:bg-red-500/5 hover:shadow-md",
          )}
        >
          {downloading === "pdf" ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <FileText className="h-10 w-10 text-red-500/70 transition-colors group-hover:text-red-500" />
          )}
          <div className="text-center">
            <span className="block text-base font-semibold">
              {downloading === "pdf" ? "Generando PDF..." : "Descargar PDF"}
            </span>
            <span className="text-xs text-muted-foreground">
              Catalogo visual con imagenes y especificaciones
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onDownload("excel")}
          disabled={downloading === "excel"}
          className={cn(
            "group relative flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 p-8 transition-all",
            downloading === "excel"
              ? "border-primary/50 bg-primary/5"
              : "border-muted-foreground/15 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:shadow-md",
          )}
        >
          {downloading === "excel" ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <FileSpreadsheet className="h-10 w-10 text-emerald-500/70 transition-colors group-hover:text-emerald-500" />
          )}
          <div className="text-center">
            <span className="block text-base font-semibold">
              {downloading === "excel"
                ? "Generando Excel..."
                : "Descargar Excel"}
            </span>
            <span className="text-xs text-muted-foreground">
              Hoja de calculo con datos de productos
            </span>
          </div>
        </button>
      </div>

      {/* Reset */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          onClick={onReset}
          className="cursor-pointer gap-1.5 text-sm text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpiar configuracion y empezar de nuevo
        </Button>
      </div>
    </div>
  );
}

/* ─── Shared sub‑components ─── */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/20" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/60">{description}</p>
      </div>
    </div>
  );
}
