"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogItem } from "@/templates/catalog/catalog-item";
import type { CatalogItemProps } from "@/templates/catalog/catalog-item";
import { brandAssets } from "@/catalog/brandAssets";
import { resolveImageUrl } from "@/lib/images";
import { getBrands, getKeywords } from "../brands/brands.api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CatalogLayoutMode } from "./catalog-pdf";

type PrimitiveSpecValue = string | number | boolean | null | undefined;

type SpecificationValue = PrimitiveSpecValue | PrimitiveSpecValue[];

interface ProductSpecification {
  processor?: string;
  ram?: string;
  storage?: string;
  graphics?: string;
  screen?: string;
  resolution?: string;
  refreshRate?: string;
  connectivity?: string;
  [key: string]: SpecificationValue;
}

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  priceSell?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  brand?: {
    name: string;
    logoSvg?: string;
    logoPng?: string;
  } | null;
  stock?: number | null;
  category?: {
    id: number;
    name: string;
  };
  specification?: ProductSpecification;
}

interface CatalogPreviewProps {
  products: Product[];
  layout: CatalogLayoutMode;
  onRemoveProduct?: (productId: number) => void;
  onPriceChange?: (productId: number, value: number | null) => void;
  onPreviousPriceChange?: (productId: number, value: number | null) => void;
  priceOverrides?: Record<number, number>;
  previousPriceOverrides?: Record<number, number>;
}

const SPEC_CONFIG: Array<{ key: string; label: string }> = [
  { key: "processor", label: "Procesador" },
  { key: "ram", label: "Memoria" },
  { key: "storage", label: "Almacenamiento" },
  { key: "graphics", label: "Graficos" },
  { key: "screen", label: "Pantalla" },
  { key: "resolution", label: "Resolucion" },
  { key: "refreshRate", label: "Refresco" },
  { key: "connectivity", label: "Conectividad" },
];
const IGNORED_SPEC_KEYS = new Set([
  "id",
  "productid",
  "product_id",
  "createdat",
  "created_at",
  "updatedat",
  "updated_at",
  "createdon",
  "updatedon",
]);

type CatalogItemDetailItem = NonNullable<CatalogItemProps["details"]>[number];

function normalizePrimitiveSpecValue(value: PrimitiveSpecValue): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return String(value);
}

function normalizeSpecValue(value: SpecificationValue | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    const normalizedItems = value
      .map((item) => normalizePrimitiveSpecValue(item))
      .filter((item): item is string => !!item);
    return normalizedItems.length > 0 ? normalizedItems.join(", ") : null;
  }
  return normalizePrimitiveSpecValue(value);
}

function formatAdditionalSpecLabel(key: string): string {
  if (!key) {
    return "";
  }
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim();
  if (!spaced) {
    return key;
  }
  return spaced
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildItemDetails(spec?: ProductSpecification): CatalogItemDetailItem[] {
  if (!spec) {
    return [];
  }
  const details: CatalogItemDetailItem[] = [];
  const handled = new Set<string>();

  for (const { key, label } of SPEC_CONFIG) {
    const value = normalizeSpecValue(spec[key]);
    if (!value) {
      continue;
    }
    details.push({ label, value, iconKey: key });
    handled.add(key.toLowerCase());
  }

  const additionalEntries = Object.entries(spec).filter(([key]) => !handled.has(key.toLowerCase()));
  additionalEntries.sort(([a], [b]) => a.localeCompare(b));

  for (const [key, rawValue] of additionalEntries) {
    const normalizedKey = key.toLowerCase();
    if (IGNORED_SPEC_KEYS.has(normalizedKey)) {
      continue;
    }
    const value = normalizeSpecValue(rawValue);
    if (!value) {
      continue;
    }
    details.push({
      label: formatAdditionalSpecLabel(key),
      value,
    });
  }

  return details;
}

export function CatalogPreview({
  products,
  layout,
  onRemoveProduct,
  onPriceChange,
  onPreviousPriceChange,
  priceOverrides,
  previousPriceOverrides,
}: CatalogPreviewProps) {
  const [onlyStock, setOnlyStock] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "brand" | "price-asc" | "price-desc">(
    "name"
  );
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchBrands() {
      try {
        const [{ data }, keywordRes] = await Promise.all([
          getBrands(1, 1000),
          getKeywords(),
        ]);
        const map: Record<string, string> = {};
        for (const b of data) {
          const logo = b.logoSvg || b.logoPng;
          if (logo) {
            map[b.name.toLowerCase()] = resolveImageUrl(logo);
          }
        }
        for (const k of keywordRes?.data || []) {
          const keyword = k.keyword?.toLowerCase();
          const brandName = k.brand?.name?.toLowerCase();
          const logo = brandName ? map[brandName] : undefined;
          if (keyword && logo) {
            map[keyword] = logo;
          }
        }
        setBrandMap(map);
      } catch (err) {
        console.error("Error fetching brands", err);
      }
    }
    fetchBrands();
  }, []);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          products.map((p) => p.brand?.name).filter((b): b is string => !!b)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );


  const filteredProducts = useMemo(() => {
    const result = products.filter((p) => {
      const matchesStock = !onlyStock || (p.stock ?? 0) > 0;
      const matchesBrand =
        selectedBrand === "all" || p.brand?.name === selectedBrand;
      return matchesStock && matchesBrand;
    });
    const getPrice = (p: Product) => {
      const override = typeof p.id === "number" ? priceOverrides?.[p.id] : undefined;
      return override ?? p.priceSell ?? p.price ?? 0;
    };
    result.sort((a, b) => {
        switch (sortBy) {
          case "price-asc":
            return getPrice(a) - getPrice(b);
          case "price-desc":
            return getPrice(b) - getPrice(a);
          case "brand":
            return (
              (a.brand?.name || "").localeCompare(b.brand?.name || "") ||
              a.name.localeCompare(b.name)
            );
          default:
            return a.name.localeCompare(b.name);
        }
      });
    return result;
  }, [products, onlyStock, selectedBrand, sortBy]);

function formatPrice(value: number): string {
  return `S/. ${value.toLocaleString('en-US')}`;
}

function getDefaultPreviousPrice(product: Product): number | undefined {
  const priceValue = product.priceSell ?? product.price;
  if (typeof priceValue !== "number") {
    return undefined;
  }
  const seedSource = product.id ?? priceValue ?? 1;
  const normalized = Math.abs(Math.sin(seedSource || 1));
  const upliftPercent = 0.05 + normalized * 0.05;
  return Math.max(priceValue, Math.round(priceValue * (1 + upliftPercent)));
}

  function handleResetPricing(product: Product) {
    if (typeof product.id !== "number") {
      return;
    }
    onPriceChange?.(product.id, null);
    onPreviousPriceChange?.(product.id, null);
  }

  function getLogos(p: Product): string[] {
    const logos = new Set<string>();

    // 1) Primary brand logo from backend or fallback assets
    const brandKey = p.brand?.name?.toLowerCase();
    const primaryLogo =
      resolveImageUrl(p.brand?.logoSvg || p.brand?.logoPng) ||
      brandAssets.brands[brandKey ?? ""];
    if (primaryLogo) logos.add(primaryLogo);

    const haystack = `${p.name} ${p.description ?? ""}`.toLowerCase();

    // 2) Additional brand detection from keywords
    for (const [keyword, logoPath] of Object.entries(brandMap)) {
      if (keyword === brandKey) continue;
      if (haystack.includes(keyword)) {
        logos.add(logoPath);
      }
    }

    // 3) CPU brand detection using backend brands
    const processor = p.specification?.processor?.toLowerCase() || "";
    for (const [key, brandKey] of Object.entries(brandAssets.cpus)) {
      if (processor.includes(key)) {
        const logoUrl = brandMap[brandKey];
        if (logoUrl) logos.add(logoUrl);
        break;
      }
    }

    // 4) GPU brand detection using backend brands
    const graphics = p.specification?.graphics?.toLowerCase() || "";
    for (const [key, brandKey] of Object.entries(brandAssets.gpus)) {
      if (graphics.includes(key)) {
        const logoUrl = brandMap[brandKey];
        if (logoUrl) logos.add(logoUrl);
        break;
      }
    }

    return Array.from(logos);
  }

  const grouped: Record<string, Array<{ product: Product; item: CatalogItemProps }>> = {};
  for (const p of filteredProducts) {
    const overridePrice =
      typeof p.id === "number" ? priceOverrides?.[p.id] : undefined;
    const priceValue = overridePrice ?? p.priceSell ?? p.price;
    const details = buildItemDetails(p.specification);
    const item: CatalogItemProps = {
      title: p.name,
      description: p.description,
      price: typeof priceValue === "number" ? formatPrice(priceValue) : undefined,
      imageUrl: p.imageUrl ?? p.image ?? p.images?.[0],
      logos: getLogos(p),
      details: details.length > 0 ? details : undefined,
    };
    const catName = p.category?.name || "Sin categoria";
    const entry = grouped[catName] ?? [];
    entry.push({ product: p, item });
    grouped[catName] = entry;
  }
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  const layoutContainerClass =
    layout === "grid"
      ? "catalog-grid mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      : "catalog-list mx-auto flex max-w-7xl flex-col gap-6";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista previa del catalogo</CardTitle>
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="only-stock"
              checked={onlyStock}
              onCheckedChange={(checked) => setOnlyStock(checked === true)}
            />
            <Label htmlFor="only-stock">Solo con stock</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Label>Marca</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Label>Ordenar</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="brand">Marca</SelectItem>
                <SelectItem value="price-asc">Precio ascendente</SelectItem>
                <SelectItem value="price-desc">Precio descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {categories.map((cat, idx) => (
          <div key={cat} className="rounded-md p-4 odd:bg-muted/50 even:bg-muted">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-semibold">{cat}</h2>
              <div className="mx-auto mt-2 h-1 w-full bg-primary"></div>
            </div>
            <div className={layoutContainerClass}>
              {grouped[cat].map(({ product, item }, index) => {
                const productId = typeof product.id === "number" ? product.id : null;
                const currentDisplayValue =
                  priceOverrides?.[productId ?? -1] ??
                  product.priceSell ??
                  product.price;
                const previousDisplayValue =
                  previousPriceOverrides?.[productId ?? -1] ??
                  getDefaultPreviousPrice(product);
                const priceEditorNode =
                  productId !== null && onPriceChange ? (
                    <PriceEditor
                      productId={productId}
                      currentPrice={typeof currentDisplayValue === "number" ? currentDisplayValue : undefined}
                      previousPrice={typeof previousDisplayValue === "number" ? previousDisplayValue : undefined}
                      onPriceChange={onPriceChange}
                      onPreviousPriceChange={onPreviousPriceChange}
                    />
                  ) : undefined;

                return (
                  <div key={product.id ?? `${cat}-${index}`} className="relative group space-y-2">
                    {(productId !== null &&
                      ((onRemoveProduct !== undefined) ||
                        (onPriceChange &&
                          (priceOverrides?.[productId] !== undefined ||
                            previousPriceOverrides?.[productId] !== undefined)))) && (
                      <div className="absolute right-3 top-3 z-10 hidden gap-2 group-hover:flex focus-visible:flex">
                        {onPriceChange &&
                          (priceOverrides?.[productId] !== undefined ||
                            previousPriceOverrides?.[productId] !== undefined) && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="cursor-pointer rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-md hover:bg-white"
                            onClick={() => handleResetPricing(product)}
                          >
                            Restaurar precios
                          </Button>
                        )}
                        {onRemoveProduct && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="cursor-pointer rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-md hover:bg-white"
                            onClick={() => onRemoveProduct(productId)}
                          >
                            Ocultar
                          </Button>
                        )}
                      </div>
                    )}
                    <CatalogItem
                      {...item}
                      layout={layout}
                      priceEditor={priceEditorNode}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default CatalogPreview;

interface PriceEditorProps {
  productId: number;
  currentPrice?: number;
  previousPrice?: number;
  onPriceChange?: (productId: number, value: number | null) => void;
  onPreviousPriceChange?: (productId: number, value: number | null) => void;
}

function PriceEditor({
  productId,
  currentPrice,
  previousPrice,
  onPriceChange,
  onPreviousPriceChange,
}: PriceEditorProps) {
  const formatInputValue = (value?: number) =>
    typeof value === "number" ? String(value) : "";

  const [isEditingCurrent, setIsEditingCurrent] = useState(false);
  const [isEditingPrevious, setIsEditingPrevious] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(formatInputValue(currentPrice));
  const [previousDraft, setPreviousDraft] = useState(formatInputValue(previousPrice));

  useEffect(() => {
    if (!isEditingCurrent) {
      setCurrentDraft(formatInputValue(currentPrice));
    }
  }, [currentPrice, isEditingCurrent]);

  useEffect(() => {
    if (!isEditingPrevious) {
      setPreviousDraft(formatInputValue(previousPrice));
    }
  }, [previousPrice, isEditingPrevious]);

  function commitPrice(value: string, callback?: (id: number, value: number | null) => void) {
    if (!callback) {
      return;
    }
    if (value.trim() === "") {
      callback(productId, null);
      return;
    }
    const parsed = Number(value);
    callback(productId, Number.isFinite(parsed) ? parsed : null);
  }

  return (
    <div className="flex flex-col items-end text-right text-sm text-gray-900">
      <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Antes</span>
        {isEditingPrevious ? (
          <Input
            type="number"
            inputMode="decimal"
            value={previousDraft}
            onChange={(event) => setPreviousDraft(event.target.value)}
            onBlur={() => {
              setIsEditingPrevious(false);
              commitPrice(previousDraft, onPreviousPriceChange);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setIsEditingPrevious(false);
                commitPrice(previousDraft, onPreviousPriceChange);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setIsEditingPrevious(false);
                setPreviousDraft(formatInputValue(previousPrice));
              }
            }}
            autoFocus
            className="h-6 w-24 rounded border border-slate-300 bg-white px-2 text-right text-xs font-semibold text-gray-900 focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : (
          <button
            type="button"
            className="cursor-text rounded px-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => setIsEditingPrevious(true)}
          >
            {typeof previousPrice === "number" ? previousPrice.toLocaleString("en-US") : "--"}
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-1 text-base font-bold text-gray-900">
        <span>S/.</span>
        {isEditingCurrent ? (
          <Input
            type="number"
            inputMode="decimal"
            value={currentDraft}
            onChange={(event) => setCurrentDraft(event.target.value)}
            onBlur={() => {
              setIsEditingCurrent(false);
              commitPrice(currentDraft, onPriceChange);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setIsEditingCurrent(false);
                commitPrice(currentDraft, onPriceChange);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setIsEditingCurrent(false);
                setCurrentDraft(formatInputValue(currentPrice));
              }
            }}
            autoFocus
            className="h-7 w-24 rounded border border-slate-300 bg-white px-2 text-right text-base font-bold text-gray-900 focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : (
          <button
            type="button"
            className="cursor-text rounded px-1 text-base font-bold text-gray-900 hover:bg-slate-100"
            onClick={() => setIsEditingCurrent(true)}
          >
            {typeof currentPrice === "number" ? currentPrice.toLocaleString("en-US") : "--"}
          </button>
        )}
      </div>
    </div>
  );
}



