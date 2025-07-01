import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { createCategory } from "../../categories/categories.api";
import { createProduct } from "../../products/products.api";
import { UseFormSetValue } from "react-hook-form";
import { EntriesType } from "../new/entries.form";

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: number; name: string }[];
  setCategories: React.Dispatch<React.SetStateAction<{ id: number; name: string }[]>>;
  setProducts: React.Dispatch<
    React.SetStateAction<
      { id: number; name: string; price: number; priceSell: number; description: string; categoryId: number; category_name: string }[]
    >
  >;
  setValueProduct: React.Dispatch<React.SetStateAction<string>>;
  setCurrentProduct: React.Dispatch<
    React.SetStateAction<{
      id: number;
      name: string;
      price: number;
      priceSell: number;
      categoryId: number;
      category_name: string;
    } | null>
  >;
  setValue: UseFormSetValue<EntriesType>; // Usar el tipo de react-hook-form
  isNewCategoryBoolean: boolean; // Agregar esta propiedad
  setIsNewCategoryBoolean: React.Dispatch<React.SetStateAction<boolean>>; // Agregar esta propiedad
}

export function AddProductDialog({
  isOpen,
  onClose,
  categories,
  setCategories,
  setProducts,
  setValueProduct,
  setCurrentProduct,
  setValue,
  isNewCategoryBoolean,
  setIsNewCategoryBoolean,
}: AddProductDialogProps) {
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductPrice, setNewProductPrice] = useState<number | "">("");
  const [newProductPriceSell, setNewProductPriceSell] = useState<number | "">("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);

  const handleAddCategory = async (): Promise<{ id: number; name: string } | null> => {
    if (!newCategoryName.trim()) {
      toast.error("El nombre de la nueva categoría es obligatorio.");
      return null;
    }

    try {
      const category = await createCategory({ name: newCategoryName });
      toast.success("Categoría agregada correctamente.");
      setCategories((prev) => [...prev, category]); // Actualizar las categorías en el estado principal
      setIsNewCategoryBoolean(true);
      return { id: category.id, name: category.name };
    } catch (error: any) {
      console.error("Error al agregar la categoría:", error);
      toast.error("La categoría ya existe o no se pudo crear.");
      return null;
    }
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) {
      toast.error("El nombre del producto es obligatorio.");
      return;
    }
    if (!isNewCategory && !newProductCategory) {
      toast.error("Debe seleccionar una categoría.");
      return;
    }
    if (newProductPrice === "" || newProductPrice <= 0) {
      toast.error("El precio del producto debe ser mayor a 0.");
      return;
    }

    try {
      let categoryId: number;
      let categoryName: string;

      if (isNewCategory) {
        const newCategory = await handleAddCategory();
        if (!newCategory) {
          return;
        }
        categoryId = newCategory.id;
        categoryName = newCategory.name;
      } else {
        categoryId = Number(newProductCategory);
        categoryName = categories.find((cat) => cat.id === categoryId)?.name || "";
      }

      const createdProduct = await createProduct({
        name: newProductName,
        categoryId,
        price: Number(newProductPrice),
        priceSell: Number(newProductPriceSell),
      });

      setProducts((prevProducts) => [
        ...prevProducts,
        {
          id: createdProduct.id,
          name: createdProduct.name,
          price: createdProduct.price,
          priceSell: createdProduct.priceSell || 0,
          description: createdProduct.description || "",
          categoryId: createdProduct.categoryId,
          category_name: categoryName,
        },
      ]);

      setValueProduct(createdProduct.name);
      setCurrentProduct({
        id: createdProduct.id,
        name: createdProduct.name,
        price: createdProduct.price,
        priceSell: createdProduct.priceSell || 0,
        categoryId: createdProduct.categoryId,
        category_name: createdProduct.category_name || "Sin categoría",
      });
      setValue("category_name", categoryName);
      setValue("price", createdProduct.price);
      setValue("priceSell", createdProduct.priceSell);

      toast.success("Producto agregado correctamente.");
      onClose();
      setNewProductName("");
      setNewProductCategory("");
      setNewProductPrice("");
      setNewProductPriceSell("");
      setNewCategoryName("");
      setIsNewCategory(false);
    } catch (error: any) {
      console.error("Error al agregar el producto:", error);
      toast.error(error.message || "El producto ya existe o no se pudo crear.");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Agregar Producto</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          Completa los campos para agregar un nuevo producto.
        </AlertDialogDescription>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-product-name" className="text-sm font-medium">
              Nombre del Producto
            </Label>
            <Input
              id="new-product-name"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="Ingresa el nombre del producto"
              maxLength={100}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isNewCategory}
              onCheckedChange={(checked) => setIsNewCategory(checked === true)}
            />
            <span>Agregar nueva categoría</span>
          </div>
          {isNewCategory ? (
            <Input
              placeholder="Nombre de la nueva categoría"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          ) : (
            <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {newProductCategory
                    ? categories.find((cat) => String(cat.id) === newProductCategory)?.name
                    : "Selecciona una categoría..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Command>
                  <CommandInput placeholder="Buscar categoría..." />
                  <CommandList>
                    {categories.map((category) => (
                      <CommandItem
                        key={category.id}
                        value={category.name}
                        onSelect={() => {
                          setNewProductCategory(String(category.id));
                          setIsCategoryPopoverOpen(false); // Cerrar el Popover
                        }}       
                      >
                        {category.name}
                        <Check
                          className={`ml-auto ${
                            newProductCategory === String(category.id) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <div>
            <Label htmlFor="new-product-price" className="text-sm font-medium">
              Precio de compra del Producto
            </Label>
            <Input
              id="new-product-price"
              type="number"
              value={newProductPrice}
              onChange={(e) => setNewProductPrice(e.target.value ? Number(e.target.value) : "")}
              placeholder="Ingresa el precio de compra del producto"
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <Label htmlFor="new-product-price" className="text-sm font-medium">
              Precio de venta del Producto
            </Label>
            <Input
              id="new-product-price"
              type="number"
              value={newProductPriceSell}
              onChange={(e) => setNewProductPriceSell(e.target.value ? Number(e.target.value) : "")}
              placeholder="Ingresa el precio de venta del producto"
              min={0}
              step={0.01}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleAddProduct}>Guardar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddProductDialog;