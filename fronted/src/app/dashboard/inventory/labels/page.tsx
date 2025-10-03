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
}

interface ProductSelection {
  serials: string[];
  includeAll: boolean;
}

function sanitizeForCode39(value: string): string {
  const allowed = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -.$/+%";
  const upper = value.toUpperCase();
  const sanitized = upper
    .split("")
    .map((char) => (allowed.includes(char) ? char : "-"))
    .join("")
    .replace(/-+/g, "-")
    .trim();

  return sanitized.length ? sanitized : "CODE39";
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
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Record<number, ProductSelection>>({});
  const [codeType, setCodeType] = useState<"qr" | "barcode">("qr");

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    if (!printRef.current) {
      toast.error("No hay contenido para imprimir");
      return;
    }

    window.print();
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

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return categories;
    }
    const query = categorySearch.trim().toLowerCase();
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, categorySearch]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const categoryFilterActive = selectedCategories.length > 0;

    return products.filter((product) => {
      const categoryKey = product.categoryId ?? -1;
      const matchesCategory = !categoryFilterActive || selectedCategories.includes(categoryKey);
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.categoryName.toLowerCase().includes(query) ||
        product.code.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [products, productSearch, selectedCategories]);

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
          body {
            background: #fff;
          }

          .labels-print-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1.25rem !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Generar etiquetas</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Selecciona una o varias categorias, elige los productos y define si deseas imprimir codigos QR o codigos de barras.
                Puedes personalizar que series incluir para cada item antes de generar la version imprimible.
              </p>
            </div>
            <div className="no-print flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/inventory">Volver al inventario</Link>
              </Button>
              <Button onClick={handlePrint} disabled={selectedLabelCount === 0}>
                Imprimir etiquetas ({selectedLabelCount})
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6">
            <Card className="no-print">
              <CardHeader>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>
                  Define las categorias cuya mercaderia deseas listar. Puedes seleccionar todas o filtrar por nombre.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllCategories}
                    disabled={categories.length === 0}
                  >
                    Seleccionar todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearCategories}>
                    Limpiar
                  </Button>
                  <Badge variant="secondary">
                    {selectedCategories.length > 0 ? `${selectedCategories.length} seleccionadas` : 'Sin filtro'}
                  </Badge>
                </div>
                <Input
                  placeholder="Buscar categoria"
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  className="max-w-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCategories.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-3 transition hover:bg-muted"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleCategory(category.id)}
                        />
                        <span className="text-sm font-medium">{category.name}</span>
                      </label>
                    );
                  })}
                  {filteredCategories.length === 0 && (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No se encontraron categorias para el criterio de busqueda.
                    </div>
                  )}
                </div>
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
                  <Badge variant="secondary">
                    {selectedProductCount > 0
                      ? `${selectedProductCount} productos seleccionados`
                      : 'Sin productos seleccionados'}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map((product) => {
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
                          <CardFooter className="pt-0 text-xs text-muted-foreground">
                            Incluye {product.serialNumbers.length} series registradas
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
                  onValueChange={(value) => setCodeType(value as "qr" | "barcode")}
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

          <Separator className="my-6" />

          <div
            ref={printRef}
            className="labels-print-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            {labels.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Selecciona al menos un producto para visualizar las etiquetas.
              </div>
            )}

            {labels.map(({ product, serial, codeValue }) => {
              const barcodeValue = `*${sanitizeForCode39(codeValue)}*`;
              const qrValue = JSON.stringify({
                productId: product.id,
                code: product.code,
                serial: serial ?? null,
              });

              return (
                <div
                  key={`${product.id}-${serial ?? "all"}-${codeType}`}
                  className="label-card flex flex-col items-center gap-2 rounded-lg border p-4 transition-shadow hover:shadow"
                >
                  {codeType === "qr" ? (
                    <QRCodeCanvas value={qrValue} size={128} />
                  ) : (
                    <div className="w-full text-center">
                      <div className="font-barcode">
                        {barcodeValue}
                      </div>
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{product.categoryName}</p>
                    <p className="text-xs text-muted-foreground leading-tight">Codigo base: {product.code}</p>
                    {serial && (
                      <p className="text-xs font-medium leading-tight">Serie: {serial}</p>
                    )}
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

