"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/app/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/context/site-settings-context";
import { getChipPresentation } from "@/utils/site-settings";

type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryName?: string | null;
  searchKey?: string;
};

export type ProductComboboxProps = {
  products: ProductOption[];
  selectedId: number | null;
  selectedLabel: string;
  onPick: (p: { id: number; name: string; price: number }) => void;
  disabled?: boolean;
};

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export default function ProductCombobox({ products, selectedId, selectedLabel, onPick, disabled }: ProductComboboxProps) {
  const { settings } = useSiteSettings();
  const chipPresentation = getChipPresentation(settings);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const update = () => { if (triggerRef.current) setMenuWidth(triggerRef.current.offsetWidth); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const debounced = useDebouncedValue(query, 250);
  const deferred = React.useDeferredValue(debounced);

  const filtered = React.useMemo(() => {
    if (!open) return [] as ProductOption[];
    const q = norm(deferred.trim());
    if (q.length === 0) return products.slice(0, 50);
    return products
      .filter((p) => {
        const fallback = norm(`${p.name ?? ""} ${p.categoryName ?? ""}`);
        const key = p.searchKey ? p.searchKey : fallback;
        return key.includes(q);
      })
      .slice(0, 50);
  }, [open, products, deferred]);

  const stockBadgeClass = React.useCallback(
    (stock: number | null | undefined) => {
      const inStock = (stock ?? 0) > 0;

      if (chipPresentation.variant === "outline") {
        return inStock
          ? "border border-green-500 text-green-600 dark:border-green-400 dark:text-green-200"
          : "border border-red-500 text-red-600 dark:border-red-400 dark:text-red-200";
      }

      return inStock
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    },
    [chipPresentation.variant],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedLabel || "Seleccionar producto"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 max-w-none" align="start" side="bottom" avoidCollisions={false} sideOffset={4} style={{ width: menuWidth }}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar producto..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandEmpty>Sin resultados</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {filtered.map((p) => (
                <CommandItem key={p.id} value={`${p.id}`} onSelect={() => { onPick(p); setOpen(false); }}>
                  <div className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">S/. {p.price.toFixed(2)}</span>
                      <Badge
                        variant={chipPresentation.variant}
                        className={cn("text-xs", stockBadgeClass(p.stock))}
                      >
                        Stock: {p.stock ?? '-'}
                      </Badge>
                    </div>
                    {p.categoryName ? (
                      <span className="text-xs text-muted-foreground">{p.categoryName}</span>
                    ) : null}
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", selectedId === p.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
