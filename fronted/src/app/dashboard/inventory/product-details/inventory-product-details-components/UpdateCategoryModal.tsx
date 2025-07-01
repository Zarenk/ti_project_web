"use client";

import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { updateProductCategory } from "../../inventory.api";
import { toast } from "sonner";
import { getCategories } from "@/app/dashboard/categories/categories.api";

interface Props {
  productId: number;
  defaultCategoryId: number;
}

export default function UpdateCategoryDialog({ productId, defaultCategoryId }: Props) {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(defaultCategoryId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const isOpen = searchParams.get("editCategory") === "true";

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories(); // Llama a la API para obtener las categorías
        setCategories(data);
      } catch (error) {
        console.error("Error al cargar categorías:", error);
      }
    }

    fetchCategories();
  }, []);

  const handleClose = () => {
    const current = new URLSearchParams(window.location.search);
    current.delete("editCategory");

    const newPath = `${window.location.pathname}${current.toString() ? `?${current.toString()}` : ""}`;
    router.replace(newPath);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!selectedCategory) {
        toast.error("Por favor, selecciona una categoría.");
        return;
      }

      await updateProductCategory(productId, selectedCategory);
      toast.success("Categoría actualizada correctamente.");
      router.replace(`/dashboard/inventory/product-details/${productId}`);
    } catch (error) {
      console.error("Error al actualizar la categoría:", error);
      toast.error("Error al actualizar la categoría.");
    }
  };

  return (
    <AlertDialog open={isOpen}>
        <AlertDialogContent>
            <form onSubmit={handleSubmit}>
            <AlertDialogHeader>
                <AlertDialogTitle>Actualizar Categoría</AlertDialogTitle>
                <AlertDialogDescription>
                Seleccione una nueva categoría para el producto.
                </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-4 space-y-2">
                <div className="flex flex-col gap-2">
                    <label
                    htmlFor="category"
                    className="text-sm font-medium text-foreground"
                    >
                    Categoría
                    </label>
                    <Select
                    value={selectedCategory ? String(selectedCategory) : ""}
                    onValueChange={(value) => setSelectedCategory(Number(value))}
                    >
                    <SelectTrigger id="category" className="w-full">
                        <SelectValue placeholder="Seleccione una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
            </div>

            <AlertDialogFooter className="mt-6">
                <AlertDialogCancel asChild>
                <Button onClick={handleClose} variant="outline">
                    Cancelar
                </Button>
                </AlertDialogCancel>
                <Button type="submit">Guardar</Button>
            </AlertDialogFooter>
            </form>
        </AlertDialogContent>
    </AlertDialog>
  );
}