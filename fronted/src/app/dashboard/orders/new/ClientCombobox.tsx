"use client";

import React from "react";
import { useDebounce } from "@/app/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Client = {
  id: number;
  name?: string;
  type?: string;
  typeNumber?: string;
  email?: string;
  phone?: string;
  searchKey?: string;
};

export type ClientComboboxProps = {
  clients: Client[];
  selectedId: number | null;
  selectedLabel: string;
  onPick: (c: Client) => void;
};

export default function ClientCombobox({ clients, selectedId, selectedLabel, onPick }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuWidth, setMenuWidth] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const update = () => { if (triggerRef.current) setMenuWidth(triggerRef.current.offsetWidth); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const debounced = useDebounce(search, 500);
  const deferred = React.useDeferredValue(debounced);

  const filtered = React.useMemo(() => {
    if (!open) return [] as Client[];
    const q = deferred.trim().toLowerCase();
    if (q.length === 0) {
      return clients.slice(0, 50);
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return clients
      .filter((c) => {
        const key = c.searchKey ?? '';
        return tokens.every((t) => key.includes(t));
      })
      .slice(0, 50);
  }, [open, clients, deferred]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button ref={triggerRef} variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedLabel || "Seleccionar cliente"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 max-w-none" align="start" side="bottom" avoidCollisions={false} sideOffset={4} style={{ width: menuWidth }}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar por nombre, DNI o RUC..." value={search} onValueChange={setSearch} />
          <CommandEmpty>Sin resultados</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {filtered.map((c) => (
                <CommandItem key={c.id} value={`${c.id}`} onSelect={() => { onPick(c); setOpen(false); }}>
                  <div className="flex flex-col">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.type} {c.typeNumber}
                      {c.email ? (<><span>{" \u2022 "}</span>{c.email}</>) : null}
                      {c.phone ? (<><span>{" \u2022 "}</span>{c.phone}</>) : null}
                    </span>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", selectedId === c.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
