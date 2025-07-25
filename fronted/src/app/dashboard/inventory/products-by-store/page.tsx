"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ProductsByStorePage() {
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 👈 Aplica debounce
  const debouncedSelectedStore = useDebounce(selectedStore, 600)
  const debouncedSelectedCategory = useDebounce(selectedCategory, 600)
  const [withStockOnly, setWithStockOnly] = useState(false); // ✅ checkbox de stock
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Dentro del componente:
  const [open, setOpen] = useState(false)
  const selectedCategoryName =
    selectedCategory === 0
      ? "Todas las categorías"
      : categories.find((cat) => cat.id === selectedCategory)?.name || "Selecciona una Categoria"

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
          const queryParams = new URLSearchParams();
          if (debouncedSelectedCategory && debouncedSelectedCategory !== 0) {
            queryParams.append("categoryId", debouncedSelectedCategory.toString());
          }
           
          const data = withStockOnly
            ? await getProductsByStore(debouncedSelectedStore ?? 0, queryParams.toString())
            : await getAllProductsByStore(debouncedSelectedStore ?? 0, queryParams.toString());
  
          setProducts(data);
        } catch (error) {
          console.error("Error al obtener los productos:", error);
        }
      }
  
      fetchProducts();
    }
  }, [debouncedSelectedStore, debouncedSelectedCategory, withStockOnly]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isShortcut = isMac ? event.metaKey && event.key === 'e' : event.ctrlKey && event.key === 'e';
  
      if (isShortcut) {
        event.preventDefault();
        if (selectedStore && !isExporting) {
          toast.info("Generando archivo Excel...");
          setIsExporting(true);
          setTimeout(() => {
            exportInventoryExcel(selectedStore, selectedCategory ?? undefined);
            setIsExporting(false);
          }, 800);
        }
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStore, selectedCategory, isExporting]);

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

  // Filtrar productos por término de búsqueda
  useEffect(() => {
    const deduped = Array.from(
      new Map(
        products.map((item) => [item.inventory.product.id, item])
      ).values()
    );
    const filtered = deduped.filter((item) =>
      item.inventory.product.name
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase())
    );
    setTotalItems(filtered.length);
  
    const start = (currentPage - 1) * limit;
    const end = start + limit;
    setFilteredProducts(filtered.slice(start, end));
  }, [debouncedSearchTerm, products, currentPage, limit]);

  return (
    <Card className="p-6 w-full max-w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl mx-auto shadow-md">
      <h1 className="text-2xl font-semibold mb-6">📦 Productos por Tienda</h1>

      <TooltipProvider delayDuration={500}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => {
                if (selectedStore) {
                  toast.info("Generando archivo Excel...");
                  setIsExporting(true);

                  setTimeout(() => {
                    exportInventoryExcel(selectedStore, selectedCategory ?? undefined);
                    setIsExporting(false);
                  }, 800);
                }
              }}
              disabled={!selectedStore || isExporting}
              style={{ touchAction: 'manipulation' }}
              className="bg-green-600 hover:bg-green-700 text-white ml-auto"
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
        <p className="hidden sm:block text-xs text-muted-foreground mt-1 ml-auto">
          Atajo: <kbd className="bg-muted px-1 py-0.5 rounded border text-[11px]">Ctrl</kbd> + <kbd className="bg-muted px-1 py-0.5 rounded border text-[11px]">E</kbd>
        </p>
      </TooltipProvider>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="flex-1 mb-3 sm:mb-0">
          <label className="block mb-1 text-sm font-medium">Selecciona una tienda</label>
          <Select onValueChange={(value) => setSelectedStore(Number(value))}>
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