import { ColumnDef } from "@tanstack/react-table"

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
}

export const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: "product.name", // Acceder al nombre del producto
      header: "Producto", 
    },
    {
      id: "product.category",
      accessorKey: "product.category", // Acceder a la categoría del producto
      header: "Categoría",
    },
    {
        accessorKey: "lowestPurchasePrice",
        header: "Precio de Compra Más Bajo",
        cell: ({ row }) => `S/. ${row.original.lowestPurchasePrice?.toFixed(2)}`, // Formatear el precio
    },
    {
        accessorKey: "highestPurchasePrice",
        header: "Precio de Compra Más Alto",
        cell: ({ row }) => `S/. ${row.original.highestPurchasePrice?.toFixed(2)}`, // Formatear el precio
    },
    {
      accessorKey: "priceSell",
      header: "Precio de Venta",
      cell: ({ row }) => `S/. ${row.original.product.priceSell?.toFixed(2)}`, // Formatear el precio
    },
    {
      accessorKey: "stock", // Acceder al stock
      header: "Stock General",
      cell: ({ row }) => (row.original.stock > 0 ? row.original.stock : "Sin stock"), // Formatear el valor
    },
    {
      accessorKey: "createdAt", // Acceder a la fecha de creación
      header: "Fecha de Ingreso",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(), // Formatear la fecha
    },
    {
      accessorKey: "updateAt", // Acceder a la última actualización
      header: "Última Actualización",
      cell: ({ row }) => new Date(row.original.updateAt).toLocaleDateString(), // Formatear la fecha
    },
  ];