"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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

interface Category {
  id: number;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onChange,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {selected.map((id) => {
          const cat = categories.find((c) => c.id === id);
          if (!cat) return null;
          return (
            <Badge
              key={id}
              variant="secondary"
              className="flex cursor-pointer items-center gap-1"
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
        draggable
      >
        <CommandInput placeholder="Buscar categoría" />

        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>Seleccionadas: {selected.length}</span>

          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>
              Limpiar
            </Button>
          )}
        </div>

        {/* IMPORTANTE: CommandItem debe ser hijo directo de CommandList */}
        <CommandList className="grid gap-2 p-2">
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>

          {categories.map((cat) => {
            const isSelected = selected.includes(cat.id);

            return (
              <CommandItem
                key={cat.id}
                value={cat.name}
                onSelect={() => toggle(cat.id)}
                className={cn(
                  "flex items-center justify-between rounded-md border p-2",
                  isSelected && "bg-accent text-accent-foreground"
                )}
              >
                {/* Animamos SOLO el contenido interno (transform/opacity no rompen el layout de cmdk) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 350, damping: 24 }}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="size-4" />
                    <span>{cat.name}</span>
                  </div>

                  {/* Checkbox como indicador visual controlado */}
                  <Checkbox checked={isSelected} />
                </motion.div>
              </CommandItem>
            );
          })}
        </CommandList>
      </CommandDialog>
    </div>
  );
}

export default CategoryFilter;