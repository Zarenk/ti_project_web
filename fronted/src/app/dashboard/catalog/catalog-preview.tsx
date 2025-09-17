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
    details.push({ label, value });
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

export function CatalogPreview({ products }: CatalogPreviewProps) {
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
    const getPrice = (p: Product) => p.priceSell ?? p.price ?? 0;
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

  const grouped: Record<string, CatalogItemProps[]> = {};
  for (const p of filteredProducts) {
    const priceValue = p.priceSell ?? p.price;
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
    grouped[catName] = grouped[catName] ? [...grouped[catName], item] : [item];
  }
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

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
            <div className="catalog-grid mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[cat].map((item, index) => (
                <CatalogItem key={index} {...item} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default CatalogPreview;



