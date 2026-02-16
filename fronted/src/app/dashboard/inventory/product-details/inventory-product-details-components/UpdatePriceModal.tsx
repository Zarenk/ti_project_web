"use client"

import { useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateProductPriceSell } from "../../inventory.api";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  defaultPrice: number;
  productId: number;
}

export default function UpdatePriceDialog({ productId, defaultPrice }: Omit<Props, "isOpen">) {
    
    const [price, setPrice] = useState<number | string>(defaultPrice ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const isOpen = searchParams.get("editPrice") === "true";

    const handleClose = () => {
        const current = new URLSearchParams(window.location.search);
        current.delete("editPrice");
      
        const newPath = `${window.location.pathname}${current.toString() ? `?${current.toString()}` : ""}`;
        router.replace(newPath);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const parsedPrice = parseFloat(price as string);
        if (isNaN(parsedPrice)) {
          toast.error("Por favor, ingrese un precio válido.");
          return;
        }

        setIsSubmitting(true);
        try {
            await updateProductPriceSell(productId, parsedPrice);
            router.replace(`/dashboard/inventory/product-details/${productId}`);
            toast.success("Se actualizo el precio de venta del producto correctamente.");
          } catch (error) {
            console.error("Error actualizando precio:", error);
            toast.error("Error al actualizar el precio.");
          } finally {
            setIsSubmitting(false);
          }
    };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit}>
          <AlertDialogHeader>
            <AlertDialogTitle>Actualizar Precio de Venta(Soles)</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Ingrese el nuevo precio de venta para el producto. Asegúrese de que el precio sea correcto antes de continuar.
          </AlertDialogDescription>

          <Input
            type="text" // Cambiar a "text" para manejar validaciones personalizadas
            name="priceSell"
            value={price}
            onChange={(e) => {
                const value = e.target.value;
                // Permitir solo números con hasta 2 decimales y longitud máxima de 10 caracteres
                if (/^\d{0,7}(\.\d{0,2})?$/.test(value) && value.length <= 10) {
                setPrice(value);
                }
            }}
            maxLength={10} // Longitud máxima de 10 caracteres
            className="mt-3"
            required
          />

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel asChild>
                <Button onClick={handleClose} variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </AlertDialogCancel>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar"}
                </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}