"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogItem } from "@/templates/catalog/catalog-item";
import type { CatalogItemProps } from "@/templates/catalog/catalog-item";
import { brandAssets } from "@/catalog/brandAssets";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  specification?: {
    processor?: string;
    graphics?: string;
  };
}

interface CatalogPreviewProps {
  products: Product[];
}

export function CatalogPreview({ products }: CatalogPreviewProps) {
  const [onlyStock, setOnlyStock] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "brand" | "price-asc" | "price-desc">(
    "name"
  );

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
    const out = new Set<string>();

    // 1) Primary brand logo from backend
    const brandLogo = p.brand?.logoSvg || p.brand?.logoPng;
    if (brandLogo) out.add(brandLogo);

    // Base text to scan for keywords (name + description)
    const haystack = `${p.name} ${p.description ?? ""}`.toLowerCase();

    // 2) Sub-brand/series detection (e.g., TUF, ROG, Legion, Predator)
    if (brandAssets.subbrands) {
      for (const [keyword, logoPath] of Object.entries(brandAssets.subbrands)) {
        if (haystack.includes(keyword)) {
          out.add(logoPath);
          // Only one subbrand is needed; keep scanning CPUs/GPUs regardless
        }
      }
    }

    // 3) CPU brand detection
    const processor = p.specification?.processor?.toLowerCase() || "";
    for (const [key, path] of Object.entries(brandAssets.cpus)) {
      if (processor.includes(key)) {
        out.add(path);
        break;
      }
    }

    // 4) GPU brand detection
    const graphics = p.specification?.graphics?.toLowerCase() || "";
    for (const [key, path] of Object.entries(brandAssets.gpus)) {
      if (graphics.includes(key)) {
        out.add(path);
        break;
      }
    }

    return Array.from(out);
  }

  const grouped: Record<string, CatalogItemProps[]> = {};
    for (const p of filteredProducts) {
    const priceValue = p.priceSell ?? p.price;
    const item: CatalogItemProps = {
      title: p.name,
      description: p.description,
      price: typeof priceValue === "number" ? formatPrice(priceValue) : undefined,
      imageUrl: p.imageUrl ?? p.image ?? p.images?.[0],
      logos: getLogos(p),
    };
  const catName = p.category?.name || "Sin categoría";
    grouped[catName] = grouped[catName] ? [...grouped[catName], item] : [item];
  }
  const categories = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista previa del catálogo</CardTitle>
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
