"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronsUpDown, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UBIGEO_DATA, type UbigeoEntry } from "@/lib/ubigeo-data";

interface UbigeoComboboxProps {
  value?: string;
  onSelect: (code: string, label: string) => void;
  placeholder?: string;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Build a searchable label for each entry once
const UBIGEO_ITEMS = UBIGEO_DATA.map((e) => ({
  ...e,
  label: `${e.dp} / ${e.p} / ${e.d}`,
  search: normalize(`${e.dp} ${e.p} ${e.d} ${e.c}`),
}));

export function UbigeoCombobox({
  value,
  onSelect,
  placeholder = "Buscar distrito...",
}: UbigeoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedEntry = useMemo(
    () => (value ? UBIGEO_ITEMS.find((e) => e.c === value) : null),
    [value],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return UBIGEO_ITEMS.slice(0, 40);
    const q = normalize(query.trim());
    const terms = q.split(/\s+/);
    return UBIGEO_ITEMS.filter((e) =>
      terms.every((t) => e.search.includes(t)),
    ).slice(0, 40);
  }, [query]);

  const handleSelect = useCallback(
    (entry: (typeof UBIGEO_ITEMS)[0]) => {
      onSelect(entry.c, entry.label);
      setOpen(false);
      setQuery("");
    },
    [onSelect],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          type="button"
          className="w-full justify-between cursor-pointer text-sm font-normal hover:text-foreground"
        >
          {selectedEntry ? (
            <span className="flex items-center gap-2 truncate text-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span className="truncate">{selectedEntry.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                {selectedEntry.c}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2 truncate text-muted-foreground">
              <Search className="h-3.5 w-3.5 flex-shrink-0" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ej: Tacna, Miraflores, Lima..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No se encontro el distrito.</CommandEmpty>
            <CommandGroup
              heading={
                query.trim()
                  ? `${filtered.length} resultados`
                  : "Escribe para buscar"
              }
            >
              {filtered.map((e) => (
                <CommandItem
                  key={e.c}
                  value={e.c}
                  onSelect={() => handleSelect(e)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 w-full min-w-0">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">
                        {e.d}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {e.dp} / {e.p}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">
                      {e.c}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
