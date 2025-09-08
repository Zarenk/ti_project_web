"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ProductCombobox from "@/components/sales/ProductCombobox";

type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
};

type Store = { id: number; name: string };
type Category = { id: number; name: string };

// Buffered number input to avoid re-rendering parent on each keystroke
const BufferedNumberInput = React.memo(function BufferedNumberInput({
  value,
  onCommit,
  min,
  max,
  step,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [text, setText] = React.useState<string>(String(value ?? ""));
  React.useEffect(() => {
    setText(String(value ?? ""));
  }, [value]);

  const commit = React.useCallback(() => {
    let v = Number(text);
    if (Number.isNaN(v)) v = value;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    onCommit(v);
  }, [text, min, max, onCommit, value]);

  return (
    <Input
      type="number"
      inputMode="numeric"
      step={step}
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
      }}
    />
  );
});

export type ProductsSectionProps = {
  storeId: number;
  stores: Store[];
  setStoreId: (id: number) => void;
  categories: Category[];
  selectedCategory: number;
  setSelectedCategory: (id: number) => void;
  selectedProductId: number | null;
  products: (ProductOption & { searchKey?: string })[];
  handleProductPick: (p: { id: number; name: string; price: number }) => void;
  selectedStock: number | null;
  remainingStock: number | null;
  quantity: number;
  setQuantity: (n: number) => void;
  selectedPrice: number;
  setSelectedPrice: (n: number) => void;
  addItem: () => void;
  items: { productId: number; name: string; quantity: number; price: number }[];
  removeItem: (id: number) => void;
};

// Product results are rendered by ProductCombobox

export const ProductsSection = React.memo(function ProductsSection(props: ProductsSectionProps) {
  const {
    storeId, stores, setStoreId,
    categories, selectedCategory, setSelectedCategory,
    selectedProductId, products, handleProductPick,
    selectedStock, remainingStock,
    quantity, setQuantity,
    selectedPrice, setSelectedPrice,
    addItem, items, removeItem,
  } = props;

  // Filter by category only; search is inside ProductCombobox
  const baseList = React.useMemo(() => {
    return products.filter((p) => selectedCategory === 0 || p.categoryId === selectedCategory);
  }, [products, selectedCategory]);

  const onPickProduct = React.useCallback((p: { id: number; name: string; price: number }) => {
    handleProductPick(p);
  }, [handleProductPick]);

  return (
    <Card className="border-blue-200 dark:border-blue-700 shadow-sm">
      <CardHeader className="px-4 pt-4 pb-2 items-center">
        <CardTitle className="text-center">Productos</CardTitle>
        <Separator className="mx-auto mt-1 w-16 bg-blue-200 dark:bg-blue-700" />
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid md:grid-cols-4 gap-4 items-start">
          <div className="md:col-span-4 space-y-2">
            <Label className="block">Tienda</Label>
            <Select value={String(storeId)} onValueChange={(v) => setStoreId(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona tienda" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                {stores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 space-y-2">
            <Label className="block">Categoría</Label>
            <Select value={String(selectedCategory)} onValueChange={(v) => setSelectedCategory(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                <SelectItem value={String(0)}>Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 space-y-2">
            <Label className="block">Producto</Label>
            <ProductCombobox
              products={baseList}
              selectedId={selectedProductId}
              selectedLabel={products.find((p) => p.id === selectedProductId)?.name || ""}
              onPick={onPickProduct}
            />
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              {selectedProductId ? (
                selectedStock === null ? (
                  <Badge variant="outline">Stock: -</Badge>
                ) : (
                  <Badge className={selectedStock > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                    Stock: {selectedStock}
                  </Badge>
                )
              ) : (
                'Selecciona un producto para ver el stock.'
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="block">Cantidad</Label>
            <BufferedNumberInput
              min={1}
              max={remainingStock ?? undefined}
              value={quantity}
              onCommit={(v) => setQuantity(Math.max(1, v))}
            />
            {remainingStock !== null && (
              <p className="text-xs text-muted-foreground">Restante disponible: {remainingStock}</p>
            )}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label className="block">Precio unitario</Label>
            <BufferedNumberInput
              step={0.01}
              min={0}
              value={selectedPrice}
              onCommit={(v) => setSelectedPrice(Math.max(0, v))}
            />
          </div>
          <div className="md:col-span-1">
            <Button
              className="w-full bg-blue-900 hover:bg-blue-800 text-white"
              type="button"
              onClick={addItem}
              disabled={remainingStock !== null && quantity > remainingStock}
            >
              Agregar
            </Button>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">No has agregado productos.</p>
          )}
          {items.map((it) => (
            <div key={it.productId} className="flex items-center justify-between rounded-md border p-3 bg-white dark:bg-gray-900">
              <div className="flex-1">
                <p className="font-medium">{it.name}</p>
                <p className="text-sm text-muted-foreground">{it.quantity} x S/. {it.price.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">S/. {(it.quantity * it.price).toFixed(2)}</p>
                <Button variant="ghost" size="sm" onClick={() => removeItem(it.productId)}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export default ProductsSection;
