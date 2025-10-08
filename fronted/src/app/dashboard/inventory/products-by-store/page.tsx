"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStores } from "../../stores/stores.api";
import { exportInventoryExcel, getAllProductsByStore, getProductsByStore } from "../inventory.api";
import { Card } from "@/components/ui/card";
import { format } from "date-fns-tz";
import { getCategories } from "../../categories/categories.api";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/app/hooks/useDebounce";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check, ChevronsUpDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getBrands } from "../../brands/brands.api";

export default function ProductsByStorePage() {
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 👈 Aplica debounce
  const debouncedSelectedStore = useDebounce(selectedStore, 600)
  const debouncedSelectedCategory = useDebounce(selectedCategory, 600)
  const debouncedSelectedBrand = useDebounce(selectedBrand, 600)
  const [withStockOnly, setWithStockOnly] = useState(false); // ✅ checkbox de stock
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);

  // Dentro del componente:
  const [open, setOpen] = useState(false)
  const [brandOpen, setBrandOpen] = useState(false)
  const selectedCategoryName =
    selectedCategory === 0
      ? "Todas las categorías"
      : categories.find((cat) => cat.id === selectedCategory)?.name || "Selecciona una Categoria"
  const selectedBrandName =
    selectedBrand === 0
      ? "Todas las marcas"
      : brands.find((brand) => brand.id === selectedBrand)?.name || "Selecciona una Marca"

  const filtersQuery = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedSelectedCategory && debouncedSelectedCategory !== 0) {
      params.append("categoryId", debouncedSelectedCategory.toString());
    }

    if (debouncedSelectedBrand && debouncedSelectedBrand !== 0) {
      params.append("brandId", debouncedSelectedBrand.toString());
    }

    const normalizedSearch = debouncedSearchTerm.trim();
    if (normalizedSearch.length > 0) {
      params.append("search", normalizedSearch);
    }

    if (withStockOnly) {
      params.append("withStockOnly", "true");
    }

    return params.toString();
  }, [debouncedSelectedBrand, debouncedSearchTerm, debouncedSelectedCategory, withStockOnly]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedStore !== null ||
      (selectedCategory !== null && selectedCategory !== 0) ||
      (selectedBrand !== null && selectedBrand !== 0) ||
      searchTerm.trim().length > 0 ||
      withStockOnly
    );
  }, [selectedBrand, searchTerm, selectedCategory, selectedStore, withStockOnly]);

  const handleExport = useCallback(() => {
    if (selectedStore === null || isExporting) {
      return;
    }

    toast.info("Generando archivo Excel...");
    setIsExporting(true);

    setTimeout(() => {
      exportInventoryExcel({
        storeId: selectedStore,
        categoryId: selectedCategory ?? undefined,
        brandId: selectedBrand ?? undefined,
        search: searchTerm.trim(),
        withStockOnly,
      });
      setIsExporting(false);
    }, 800);
  }, [isExporting, searchTerm, selectedBrand, selectedCategory, selectedStore, withStockOnly]);

  const handleClearFilters = useCallback(() => {
    setSelectedStore(null);
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSearchTerm("");
    setWithStockOnly(false);
    setCurrentPage(1);
    setProducts([]);
    setFilteredProducts([]);
    setTotalItems(0);
    setTotalInventoryValue(0);
    setOpen(false);
    setBrandOpen(false);
  }, []);

  useEffect(() => {
    async function fetchStores() {
      try {
        const data = await getStores();
        setStores(data);
      } catch (error) {
        console.error("Error al obtener las tiendas:", error);
      }
    }
    fetchStores();
  }, []);

  useEffect(() => {
    if (debouncedSelectedStore !== null) {
      async function fetchProducts() {
        try {
          const data = withStockOnly
            ? await getProductsByStore(debouncedSelectedStore ?? 0, filtersQuery)
            : await getAllProductsByStore(debouncedSelectedStore ?? 0, filtersQuery);
  
          setProducts(data);
        } catch (error) {
          console.error("Error al obtener los productos:", error);
        }
      }
      fetchProducts();
      } else {
      setProducts([]);
    }
  }, [debouncedSelectedStore, filtersQuery, withStockOnly]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtersQuery, debouncedSelectedStore]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isShortcut = isMac ? event.metaKey && event.key === 'e' : event.ctrlKey && event.key === 'e';
  
      if (isShortcut) {
        event.preventDefault();
        if (selectedStore !== null && !isExporting) {
          handleExport();
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExport, isExporting, selectedStore]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories();
        console.log("Categorías obtenidas:", data); // Verifica los datos obtenidos
        setCategories(data);
      } catch (error) {
        console.error("Error al obtener las categorías:", error);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await getBrands(1, 1000);
        const normalizedBrands = Array.isArray(response?.data)
          ? response.data.map((brand: any) => ({ id: brand.id, name: brand.name }))
          : [];
        setBrands(normalizedBrands);
      } catch (error) {
        console.error("Error al obtener las marcas:", error);
      }
    }

    fetchBrands();
  }, []);

  // Filtrar productos por término de búsqueda
  useEffect(() => {
    const deduped = Array.from(
      new Map(
        products.map((item) => [item.inventory.product.id, item])
      ).values()
    );
    const normalizedSearch = debouncedSearchTerm.toLowerCase();
    const filtered = deduped.filter((item) => {
      const product = item.inventory.product;
      const matchesSearch = product.name.toLowerCase().includes(normalizedSearch);

      const matchesBrand = (() => {
        if (!debouncedSelectedBrand || debouncedSelectedBrand === 0) {
          return true;
        }

        const productBrandId =
          typeof product?.brandId === "number"
            ? product.brandId
            : product?.brand?.id;

        if (productBrandId === debouncedSelectedBrand) {
          return true;
        }

        const productBrandName = (
          typeof product?.brand === "string"
            ? product.brand
            : product?.brand?.name ?? product?.brandName ?? ""
        )
          .toString()
          .trim()
          .toLowerCase();

        const selectedBrandLabel =
          brands.find((brand) => brand.id === debouncedSelectedBrand)?.name
            ?.trim()
            .toLowerCase() ?? "";

        return (
          productBrandName.length > 0 &&
          selectedBrandLabel.length > 0 &&
          productBrandName === selectedBrandLabel
        );
      })();

      return matchesSearch && matchesBrand;
    });
    const totalValue = deduped.reduce((acc, item) => {
      const purchasePrice = Number(item?.inventory?.product?.price ?? 0);
      const stockQuantity = Number(item?.stock ?? 0);

      return acc + purchasePrice * stockQuantity;
    }, 0);

    setTotalInventoryValue(totalValue);
    setTotalItems(filtered.length);
  
    const start = (currentPage - 1) * limit;
    const end = start + limit;
    setFilteredProducts(filtered.slice(start, end));
  }, [debouncedSearchTerm, products, currentPage, limit, debouncedSelectedBrand, brands]);

  return (
    <Card className="p-6 w-full max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto shadow-md">
      <h1 className="text-2xl font-semibold mb-6">📦 Productos por Tienda</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <TooltipProvider delayDuration={500}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleExport}
                  disabled={selectedStore === null || isExporting}
                  style={{ touchAction: 'manipulation' }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Exportar a Excel
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Descargar inventario en Excel
              </TooltipContent>
            </Tooltip>
            <p className="hidden sm:block text-xs text-muted-foreground">
              Atajo: <kbd className="bg-muted px-1 py-0.5 rounded border text-[11px]">Ctrl</kbd> + <kbd className="bg-muted px-1 py-0.5 rounded border text-[11px]">E</kbd>
            </p>
          </div>
        </TooltipProvider>

        <Button
          variant="outline"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="w-full sm:w-auto"
        >
          Limpiar filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="flex-1 mb-3 sm:mb-0">
          <label className="block mb-1 text-sm font-medium">Selecciona una tienda</label>
          <Select
            value={selectedStore !== null ? selectedStore.toString() : undefined}
            onValueChange={(value) => setSelectedStore(Number(value))}
          >
            <SelectTrigger className="w-full h-10 text-sm border-gray-300 shadow-sm">
              <SelectValue placeholder="Selecciona una tienda" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id.toString()}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 mb-3 sm:mb-0">
        <label className="block mb-1 text-sm font-medium">Selecciona una categoría</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-10"
            >
              {selectedCategoryName}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full max-h-60 overflow-y-auto p-0">
            <Command>
              <CommandInput placeholder="Buscar categoría..." className="h-9" />
              <CommandEmpty>No se encontró categoría.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  key="0"
                  onSelect={() => {
                    setSelectedCategory(0)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedCategory === 0 ? "opacity-100" : "opacity-0")} />
                  Todas las categorías
                </CommandItem>
                {categories
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((category) => (
                    <CommandItem
                      key={category.id}
                      onSelect={() => {
                        setSelectedCategory(category.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCategory === category.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {category.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

        <div className="flex-1 mb-3 sm:mb-0">
          <label className="block mb-1 text-sm font-medium">Selecciona una marca</label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={brandOpen}
                className="w-full justify-between h-10"
              >
                {selectedBrandName}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full max-h-60 overflow-y-auto p-0">
              <Command>
                <CommandInput placeholder="Buscar marca..." className="h-9" />
                <CommandEmpty>No se encontró marca.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    key="0"
                    onSelect={() => {
                      setSelectedBrand(0)
                      setCurrentPage(1)
                      setBrandOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedBrand === 0 ? "opacity-100" : "opacity-0")} />
                    Todas las marcas
                  </CommandItem>
                  {brands
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((brand) => (
                      <CommandItem
                        key={brand.id}
                        onSelect={() => {
                          setSelectedBrand(brand.id)
                          setCurrentPage(1)
                          setBrandOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedBrand === brand.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {brand.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1">
          <label className="block mb-1 text-sm font-medium">Filtrar producto</label>
          <Input
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full h-10 text-sm"
          />
        </div>

        <div className="w-full sm:col-span-3 mt-2 flex items-center space-x-2">
          <Checkbox
            id="withStockOnlyCheckbox"
            checked={withStockOnly}
            onCheckedChange={(checked) => setWithStockOnly(!!checked)}
          />
          <label
            htmlFor="withStockOnlyCheckbox"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Mostrar solo productos con stock
          </label>
        </div>
      </div>

      <div className="mb-6">
        <div className="max-w-md rounded-lg border border-green-200 bg-gradient-to-r from-green-50 via-white to-white p-4 shadow-sm sm:rounded-xl sm:p-5 dark:border-emerald-900/40 dark:bg-gradient-to-r dark:from-emerald-950/80 dark:via-slate-950/80 dark:to-slate-950/80 dark:shadow-none">
          <p className="text-sm font-medium text-muted-foreground dark:text-emerald-100">Valor real del inventario</p>
          <p className="mt-2 text-2xl font-semibold text-green-700 sm:text-3xl dark:text-emerald-200">
            {formatCurrency(totalInventoryValue, "PEN")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground dark:text-emerald-100/80">
            Sumatoria de precio de compra por stock de cada producto en la tienda seleccionada.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Producto</TableHead>
              <TableHead className="text-xs">Categoría</TableHead>
              <TableHead className="text-xs">Precio de Compra</TableHead>
              <TableHead className="text-xs">Precio de Venta</TableHead>
              <TableHead className="text-xs">Stock</TableHead>
              <TableHead className="text-xs">Fecha de Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm">{item.inventory.product.name}</TableCell>
                <TableCell className="text-sm">
                  {item.inventory.product.category?.name || "Sin categoría"}
                </TableCell>
                <TableCell className="text-sm">{item.inventory.product.price}</TableCell>
                <TableCell className="text-sm">{item.inventory.product.priceSell}</TableCell>
                <TableCell className="text-sm">{item.stock}</TableCell>
                <TableCell className="text-sm">
                  {format(new Date(item.inventory.product.createdAt), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Controles izquierda */}
          <div className="flex items-center space-x-2">
            <span className="text-sm">Resultados por página:</span>
            <Select onValueChange={(value) => { setLimit(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Controles derecha */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              ← Anterior
            </Button>
            <span className="text-sm">
              Página <strong>{currentPage}</strong> de{" "}
              <strong>{Math.max(Math.ceil(totalItems / limit), 1)}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, Math.ceil(totalItems / limit))
                )
              }
              disabled={currentPage >= Math.ceil(totalItems / limit)}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}