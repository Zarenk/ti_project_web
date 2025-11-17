import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
interface InventoryItem {
    id: number;
    product: {
      name: string;
      category: string;
      priceSell: number;
    };
    stock: number;
    createdAt: Date;
    updateAt: Date;
    storeOnInventory: {
      id: number;
      stock: number;
      createdAt: Date;
      updatedAt: Date;
      store: {
        name: string;
      };
    }[];
    lowestPurchasePrice?: number; // Nuevo campo para el precio de compra
    highestPurchasePrice?: number; // Nuevo campo para el precio de compra
    entryDetails: {
      entry: {
        storeId: string;
        tipoMoneda: string;
      };
      quantity: number;
    }[]; // Added entryDetails property
    serialNumbers: string[];
}

export const columns: ColumnDef<InventoryItem>[] = [
    {
      id: "product_name",
      accessorKey: "product.name", // Acceder al nombre del producto
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Producto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      id: "product.category",
      accessorKey: "product.category", // Acceder a la categoría del producto
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Categoría
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
        accessorKey: "lowestPurchasePrice",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Compra Más Bajo
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => `S/. ${row.original.lowestPurchasePrice?.toFixed(2)}`, // Formatear el precio
    },
    {
        accessorKey: "highestPurchasePrice",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Compra Más Alto
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => `S/. ${row.original.highestPurchasePrice?.toFixed(2)}`, // Formatear el precio
    },
    {
      accessorKey: "priceSell",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Precio de Venta
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `S/. ${row.original.product.priceSell?.toFixed(2)}`, // Formatear el precio
    },
    {
      accessorKey: "stock", // Acceder al stock
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stock General
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (row.original.stock > 0 ? row.original.stock : "Sin stock"), // Formatear el valor
    },
    {
      accessorKey: "createdAt", // Acceder a la fecha de creación
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Fecha de Ingreso
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(), // Formatear la fecha
    },
    {
      accessorKey: "updateAt", // Acceder a la última actualización
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Última Actualización
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.updateAt).toLocaleDateString(), // Formatear la fecha
    },
    {
      id: "serialNumbers",
      accessorKey: "serialNumbers",
      header: "Series",
    },
  ];
