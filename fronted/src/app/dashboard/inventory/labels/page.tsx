"use client";

import Head from "next/head";
import Link from "next/link";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import CatalogPagination from "@/components/catalog-pagination";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { getCategories } from "../../categories/categories.api";
import { getInventoryWithCurrency } from "../inventory.api";
import type { InventoryApiItem } from "../inventory.api";

interface CategoryOption {
  id: number;
  name: string;
}

interface AggregatedProduct {
  id: number;
  name: string;
  code: string;
  categoryId: number | null;
  categoryName: string;
  serialNumbers: string[];
  stock: number;
  createdAt: Date;
}

interface ProductSelection {
  serials: string[];
  includeAll: boolean;
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  "$": "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

function sanitizeForCode39(value: string): string {
  const allowed = Object.keys(CODE39_PATTERNS);
  const upper = value.toUpperCase();
  const sanitized = upper
    .split("")
    .map((char) => (allowed.includes(char) ? char : "-"))
    .join("")
    .replace(/-+/g, "-")
    .trim();

  return sanitized.length ? sanitized : "CODE39";
}

interface Code39BarSegment {
  type: "bar" | "space";
  width: number;
}

function buildCode39Segments(value: string): Code39BarSegment[] {
  const sanitized = `*${sanitizeForCode39(value)}*`;
  const segments: Code39BarSegment[] = [];

  sanitized.split("").forEach((character, index, array) => {
    const pattern = CODE39_PATTERNS[character];
    if (!pattern) {
      return;
    }

    for (let position = 0; position < pattern.length; position += 1) {
      const isBar = position % 2 === 0;
      const width = pattern[position] === "w" ? 3 : 1;
      segments.push({ type: isBar ? "bar" : "space", width });
    }

    if (index < array.length - 1) {
      segments.push({ type: "space", width: 1 });
    }
  });

  return segments;
}

function Code39Barcode({ value, height = 50 }: { value: string; height?: number }): ReactElement {
  const moduleWidth = 2;
  const segments = buildCode39Segments(value);
  const totalUnits = segments.reduce((total, segment) => total + segment.width, 0);
  let offset = 0;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${totalUnits * moduleWidth} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Codigo de barras ${value}`}
      >
        {segments.map((segment, index) => {
          const segmentWidth = segment.width * moduleWidth;
          const element =
            segment.type === "bar" ? (
              <rect
                key={`bar-${index}`}
                x={offset}
                y={0}
                width={segmentWidth}
                height={height}
                fill="currentColor"
              />
            ) : null;

          offset += segmentWidth;
          return element;
        })}
      </svg>
      <p className="mt-1 text-center text-xs font-medium tracking-widest text-muted-foreground">
        {sanitizeForCode39(value)}
      </p>
    </div>
  );
}

function buildDisplayCode(product: AggregatedProduct, serial: string | null): string {
  const base = product.code || `PROD-${product.id}`;
  return serial ? `${base}-${serial}` : base;
}

function aggregateInventory(items: InventoryApiItem[]): AggregatedProduct[] {
  const map = new Map<number, AggregatedProduct>();

  items.forEach((item: any) => {
    const product = item.product ?? {};
    const productId = product.id ?? item.productId;
    if (!productId) {
      return;
    }

    if (!map.has(productId)) {
      map.set(productId, {
        id: productId,
        name: product.name ?? "Producto sin nombre",
        code: product.sku || product.code || product.barcode || `PROD-${productId}`,
        categoryId: product.category?.id ?? null,
        categoryName: product.category?.name ?? "Sin categoria",
        serialNumbers: [],
        stock: 0,
        createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
      });
    }

    const aggregated = map.get(productId)!;

    const storeStock = Array.isArray(item.storeOnInventory)
      ? item.storeOnInventory.reduce(
          (total: number, store: any) => total + (store?.stock ?? 0),
          0,
        )
      : Number(item.stock ?? 0);
    aggregated.stock += storeStock;

    if (Array.isArray(item.serialNumbers)) {
      aggregated.serialNumbers.push(...item.serialNumbers);
    }

    if (Array.isArray(item.entryDetails)) {
      item.entryDetails.forEach((detail: any) => {
        if (Array.isArray(detail.series)) {
          aggregated.serialNumbers.push(...detail.series.map((serie: any) => String(serie.serial)));
        }
      });
    }
  });

  return Array.from(map.values()).map((product) => ({
    ...product,
    serialNumbers: Array.from(new Set(product.serialNumbers.map((serial) => String(serial).trim())))
      .filter(Boolean)
      .sort(),
  }));
}

export default function InventoryLabelsPage(): ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<AggregatedProduct[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Record<number, ProductSelection>>({});
  const [codeType, setCodeType] = useState<"qr" | "barcode">("qr");
  const [showLatestOnly, setShowLatestOnly] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(12);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) {
      toast.error("No hay contenido para imprimir");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const type = codeType === "qr" ? "QR" : "Barcode";
    const originalTitle = document.title;
    document.title = `Etiquetas_${type}_${selectedLabelCount}uds_${today}`;
    window.print();
    document.title = originalTitle;
  };

  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        setIsLoading(true);
        const [categoryResponse, inventoryResponse] = await Promise.all([
          getCategories(),
          getInventoryWithCurrency(),
        ]);

        const aggregated = aggregateInventory(inventoryResponse ?? []);

        const normalizedCategories: CategoryOption[] = Array.isArray(categoryResponse)
          ? categoryResponse
              .map((category: any) => ({
                id: Number(category.id),
                name: String(category.name ?? "Sin categoria"),
              }))
              .filter((category) => !Number.isNaN(category.id))
          : [];

        const hasUncategorized = aggregated.some((product) => product.categoryId === null);
        const categoriesWithFallback = hasUncategorized
          ? [
              ...normalizedCategories,
              normalizedCategories.some((category) => category.id === -1)
                ? undefined
                : { id: -1, name: "Sin categoria" },
            ].filter(Boolean) as CategoryOption[]
          : normalizedCategories;

        const uniqueSortedCategories = categoriesWithFallback
          .reduce((acc: CategoryOption[], category) => {
            if (!acc.some((existing) => existing.id === category.id)) {
              acc.push(category);
            }
            return acc;
          }, [])
          .sort((a, b) => a.name.localeCompare(b.name, "es"));

        const sortedProducts = aggregated.sort((a, b) => a.name.localeCompare(b.name, "es"));

        setCategories(uniqueSortedCategories);
        setProducts(sortedProducts);
      } catch (error) {
        console.error("Error al cargar los datos de inventario:", error);
        toast.error("No se pudo cargar la informacion del inventario");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<number, AggregatedProduct>();
    products.forEach((product) => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);


  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const categoryFilterActive = selectedCategories.length > 0;

    // Filter products based on search and category
    const filtered = products.filter((product) => {
      const categoryKey = product.categoryId ?? -1;
      const matchesCategory = !categoryFilterActive || selectedCategories.includes(categoryKey);
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });

    // Sort products: if showLatestOnly is true, sort by createdAt DESC, otherwise alphabetically
    return filtered.sort((a, b) => {
      if (showLatestOnly) {
        // Most recent first
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      // Alphabetical order
      return a.name.localeCompare(b.name, "es");
    });
  }, [products, productSearch, selectedCategories, showLatestOnly]);

  // Pagination for products
  const productTotalPages = Math.ceil(filteredProducts.length / productPageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Reset page when filters change
  useEffect(() => {
    setProductPage(1);
  }, [productSearch, selectedCategories, showLatestOnly]);

  useEffect(() => {
    if (selectedCategories.length === 0) {
      return;
    }
    const allowedIds = new Set(filteredProducts.map((product) => product.id));
    setSelectedProducts((previous) => {
      const entries = Object.entries(previous);
      const updated = entries.filter(([key]) => allowedIds.has(Number(key)));
      if (updated.length === entries.length) {
        return previous;
      }
      return updated.reduce<Record<number, ProductSelection>>((acc, [key, value]) => {
        acc[Number(key)] = value;
        return acc;
      }, {});
    });
  }, [filteredProducts, selectedCategories]);

  const labels = useMemo(() => {
    return Object.entries(selectedProducts).flatMap(([key, selection]) => {
      const product = productMap.get(Number(key));
      if (!product) {
        return [];
      }

      const serialsToUse = product.serialNumbers.length > 0
        ? (selection.includeAll ? product.serialNumbers : selection.serials)
        : [null];

      return serialsToUse.map((serial) => ({
        product,
        serial,
        codeValue: buildDisplayCode(product, serial),
      }));
    });
  }, [selectedProducts, productMap]);

  const handleToggleCategory = (categoryId: number): void => {
    setSelectedCategories((previous) =>
      previous.includes(categoryId)
        ? previous.filter((id) => id !== categoryId)
        : [...previous, categoryId],
    );
  };

  const handleSelectAllCategories = (): void => {
    setSelectedCategories(categories.map((category) => category.id));
  };

  const handleClearCategories = (): void => {
    setSelectedCategories([]);
  };

  const handleToggleProduct = (product: AggregatedProduct): void => {
    setSelectedProducts((previous) => {
      const next = { ...previous };
      if (next[product.id]) {
        delete next[product.id];
        return next;
      }

      next[product.id] = {
        serials: [...product.serialNumbers],
        includeAll: true,
      };
      return next;
    });
  };

  const handleToggleSerial = (product: AggregatedProduct, serial: string): void => {
    setSelectedProducts((previous) => {
      const current = previous[product.id];
      if (!current) {
        return {
          ...previous,
          [product.id]: {
            serials: [serial],
            includeAll: product.serialNumbers.length === 1,
          },
        };
      }

      const hasSerial = current.serials.includes(serial);
      const serials = hasSerial
        ? current.serials.filter((value) => value !== serial)
        : [...current.serials, serial];

      if (serials.length === 0) {
        const { [product.id]: _removed, ...rest } = previous;
        return rest;
      }

      return {
        ...previous,
        [product.id]: {
          serials: Array.from(new Set(serials)),
          includeAll: serials.length === product.serialNumbers.length,
        },
      };
    });
  };

  const handleSelectAllSerials = (product: AggregatedProduct): void => {
    setSelectedProducts((previous) => ({
      ...previous,
      [product.id]: {
        serials: [...product.serialNumbers],
        includeAll: true,
      },
    }));
  };

  const handleClearSerials = (productId: number): void => {
    setSelectedProducts((previous) => {
      const { [productId]: _removed, ...rest } = previous;
      return rest;
    });
  };

  const selectedProductCount = Object.keys(selectedProducts).length;
  const selectedLabelCount = labels.length;

  if (isLoading) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="rounded-lg border bg-card p-6 text-muted-foreground">
            Cargando opciones para imprimir etiquetas...
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap"
        />
      </Head>
      <style jsx global>{`
        .font-barcode {
          font-family: 'Libre Barcode 39', cursive;
          font-size: 64px;
          line-height: 1;
        }

        .labels-print-grid {
          break-inside: avoid;
        }

        .labels-print-grid .label-card {
          break-inside: avoid;
        }

        @media print {
          @page {
            margin: 8mm;
            size: A4;
          }

          /* Force light theme for printing */
          html, body {
            background: #fff !important;
            color: #000 !important;
            color-scheme: light !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Override dark mode variables */
          :root, .dark, [data-theme="dark"] {
            --background: 0 0% 100% !important;
            --foreground: 0 0% 0% !important;
            --card: 0 0% 100% !important;
            --card-foreground: 0 0% 0% !important;
            --muted-foreground: 0 0% 30% !important;
          }

          .labels-print-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
            gap: 0.35rem !important;
          }

          .labels-print-grid .label-card {
            padding: 0.25rem !important;
            border-width: 1px !important;
            border-color: #d1d5db !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          .labels-print-grid .label-card .qr-code-container canvas {
            width: 56px !important;
            height: 56px !important;
          }

          .labels-print-grid .label-card .barcode-container svg {
            height: 36px !important;
          }

          .labels-print-grid .label-card .label-product-name {
            font-size: 6.5pt !important;
            line-height: 1.15 !important;
            color: #000 !important;
            overflow: visible !important;
            white-space: normal !important;
            text-overflow: unset !important;
            word-break: break-word !important;
          }

          .labels-print-grid .label-card .label-serial-badge {
            font-size: 6pt !important;
            padding: 0 3px !important;
          }

          .labels-print-grid .label-card .label-code {
            font-size: 6pt !important;
            line-height: 1.15 !important;
            color: #000 !important;
            overflow: visible !important;
            white-space: normal !important;
            text-overflow: unset !important;
          }

          .labels-print-grid .label-card .label-category {
            font-size: 5.5pt !important;
            line-height: 1.15 !important;
            color: #444 !important;
            overflow: visible !important;
            white-space: normal !important;
            text-overflow: unset !important;
          }

          .no-print,
          [data-sidebar="sidebar"],
          [data-sidebar="rail"],
          [data-sidebar="trigger"] {
            display: none !important;
          }

          /* Remove sidebar inset margin/padding */
          [data-sidebar="inset"] {
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide banners/overlays */
          .context-status-banner,
          .trial-status-banner,
          .onboarding-banner {
            display: none !important;
          }
        }
      `}</style>

      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Generar etiquetas</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Selecciona una o varias categorias, elige los productos y define si deseas imprimir codigos QR o codigos de barras.
                Puedes personalizar que series incluir para cada item antes de generar la version imprimible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/inventory">Volver al inventario</Link>
              </Button>
              <Button onClick={handlePrint} disabled={selectedLabelCount === 0}>
                Imprimir etiquetas ({selectedLabelCount})
              </Button>
            </div>
          </div>

          <Separator className="no-print my-6" />

          <div className="grid gap-6">
            <Card className="no-print">
              <CardHeader>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>
                  Filtra por categorias para listar solo los productos que necesitas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoryPopoverOpen}
                        className="w-full max-w-sm justify-between"
                      >
                        {selectedCategories.length > 0
                          ? `${selectedCategories.length} categoria${selectedCategories.length === 1 ? '' : 's'} seleccionada${selectedCategories.length === 1 ? '' : 's'}`
                          : "Seleccionar categorias..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                          <CommandEmpty>No se encontraron categorias.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => {
                              const isSelected = selectedCategories.includes(category.id);
                              return (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => handleToggleCategory(category.id)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`}
                                  />
                                  {category.name}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCategories}
                    disabled={categories.length === 0}
                  >
                    Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearCategories} disabled={selectedCategories.length === 0}>
                    Limpiar
                  </Button>
                </div>

                {selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategories.map((catId) => {
                      const cat = categories.find((c) => c.id === catId);
                      if (!cat) return null;
                      return (
                        <Badge
                          key={catId}
                          variant="secondary"
                          className="cursor-pointer gap-1 pr-1 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleToggleCategory(catId)}
                        >
                          {cat.name}
                          <X className="h-3 w-3" />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="no-print">
              <CardHeader>
                <CardTitle>Productos disponibles</CardTitle>
                <CardDescription>
                  Marca los productos que deseas incluir. Si cuentan con series, podras decidir cuales imprimir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    placeholder="Buscar por nombre, categoria o codigo"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    className="max-w-md"
                  />
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition hover:bg-muted">
                    <Checkbox
                      checked={showLatestOnly}
                      onCheckedChange={(checked) => setShowLatestOnly(checked === true)}
                    />
                    <span className="font-medium">Ultimos productos agregados</span>
                  </label>
                  <Badge variant="secondary">
                    {selectedProductCount > 0
                      ? `${selectedProductCount} productos seleccionados`
                      : 'Sin productos seleccionados'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
                </p>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedProducts.map((product) => {
                    const isSelected = Boolean(selectedProducts[product.id]);
                    const selectedSerials = selectedProducts[product.id]?.serials ?? [];
                    const hasSerials = product.serialNumbers.length > 0;
                    const selectedSerialCount = hasSerials ? selectedSerials.length : 0;

                    return (
                      <Card key={product.id} className="flex flex-col">
                        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleProduct(product)}
                          />
                          <div className="flex-1 space-y-1">
                            <CardTitle className="text-base">{product.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                            <p className="text-xs text-muted-foreground">Codigo: {product.code}</p>
                          </div>
                          <Badge variant={product.stock > 0 ? "secondary" : "destructive"}>
                            {product.stock} en stock
                          </Badge>
                        </CardHeader>
                        {hasSerials && isSelected && (
                          <CardContent className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                              <span>Series seleccionadas ({selectedSerialCount}/{product.serialNumbers.length})</span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSelectAllSerials(product)}
                                >
                                  Todas
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleClearSerials(product.id)}
                                >
                                  Ninguna
                                </Button>
                              </div>
                            </div>
                            <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2">
                              {product.serialNumbers.map((serial) => {
                                const checked = selectedSerials.includes(serial);
                                return (
                                  <label key={serial} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => handleToggleSerial(product, serial)}
                                    />
                                    <span className="truncate">{serial}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </CardContent>
                        )}
                        {!hasSerials && isSelected && (
                          <CardContent className="flex-1">
                            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                              Este producto no registra series individuales. Se generara una etiqueta por item.
                            </p>
                          </CardContent>
                        )}
                        {!isSelected && hasSerials && (
                          <CardFooter className="flex-col items-start gap-1 pt-0 text-xs text-muted-foreground">
                            <p className="font-medium">
                              Incluye {product.serialNumbers.length} series registradas:
                            </p>
                            <p className="leading-relaxed">
                              {product.serialNumbers.slice(0, 3).join(", ")}
                              {product.serialNumbers.length > 3 && "..."}
                            </p>
                          </CardFooter>
                        )}
                      </Card>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No se encontraron productos con los filtros actuales.
                    </div>
                  )}
                </div>

                {filteredProducts.length > productPageSize && (
                  <CatalogPagination
                    currentPage={productPage}
                    totalPages={productTotalPages}
                    pageSize={productPageSize}
                    onPageChange={setProductPage}
                    onPageSizeChange={(size) => {
                      setProductPageSize(size);
                      setProductPage(1);
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="no-print">
              <CardHeader>
                <CardTitle>Configuracion de etiquetas</CardTitle>
                <CardDescription>
                  Define el formato de codigo a utilizar antes de imprimir.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup
                  value={codeType}
                  onValueChange={(value:any) => setCodeType(value as "qr" | "barcode")}
                  className="flex flex-wrap gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="qr" id="code-qr" />
                    <Label htmlFor="code-qr" className="cursor-pointer">Codigos QR</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="barcode" id="code-barcode" />
                    <Label htmlFor="code-barcode" className="cursor-pointer">Codigos de barras</Label>
                  </div>
                </RadioGroup>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Total de etiquetas generadas: <span className="font-semibold">{selectedLabelCount}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator className="no-print my-6" />

          <div
            ref={printRef}
            className="labels-print-grid grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
          >
            {labels.length === 0 && (
              <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Selecciona al menos un producto para visualizar las etiquetas.
              </div>
            )}

            {labels.map(({ product, serial, codeValue }) => {
              const humanReadableCode = sanitizeForCode39(codeValue);
              const qrValue = JSON.stringify({
                productId: product.id,
                code: product.code,
                serial: serial ?? null,
              });

              return (
                <div
                  key={`${product.id}-${serial ?? "all"}-${codeType}`}
                  className="label-card flex flex-col items-center gap-1.5 rounded-md border p-2 transition-shadow hover:shadow"
                >
                  {codeType === "qr" ? (
                    <div className="qr-code-container">
                      <QRCodeCanvas value={qrValue} size={72} />
                    </div>
                  ) : (
                    <div className="barcode-container w-full">
                      <Code39Barcode value={humanReadableCode} />
                    </div>
                  )}
                  <div className="text-center space-y-0.5 w-full min-w-0">
                    <p className="label-product-name text-[11px] font-bold leading-tight text-foreground break-words">
                      {product.name}
                    </p>
                    {serial && (
                      <Badge variant="default" className="label-serial-badge text-[10px] px-1.5 py-0 font-semibold">
                        {serial}
                      </Badge>
                    )}
                    <p className="label-code text-[10px] font-medium leading-tight text-foreground">
                      {product.code}
                    </p>
                    <p className="label-category text-[9px] text-muted-foreground leading-tight">
                      {product.categoryName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

