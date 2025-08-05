"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Tag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { getCategories } from "./catalog.api";

interface Category {
  id: number;
  name: string;
}

interface CategoryFilterProps {
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {selected.map((id) => {
          const cat = categories.find((c) => c.id === id);
          if (!cat) return null;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => toggle(id)}
            >
              {cat.name}
              <X className="size-3" />
            </Badge>
          );
        })}
        <Button variant="outline" onClick={() => setOpen(true)}>
          Seleccionar categorías
          {selected.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({selected.length})
            </span>
          )}
        </Button>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Categorías"
        description="Busca y selecciona"
      >
        <CommandInput placeholder="Buscar categoría" />
        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>Seleccionadas: {selected.length}</span>
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
            >
              Limpiar
            </Button>
          )}
        </div>
        <CommandList className="grid gap-2 p-2">
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <AnimatePresence>
            {categories.map((cat) => (
              <motion.div
                key={cat.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CommandItem
                  value={cat.name}
                  onSelect={() => toggle(cat.id)}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-2",
                    selected.includes(cat.id) &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Tag className="size-4" />
                    <span>{cat.name}</span>
                  </div>
                  <Checkbox checked={selected.includes(cat.id)} />
                </CommandItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default CategoryFilter;