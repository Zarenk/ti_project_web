import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import type { VerticalProductSchema } from "@/app/dashboard/tenancy/tenancy.api"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
interface InventoryItem {
    id: number;
    product: {
      name: string;
      category: string;
      price?: number;
      priceSell: number;
      extraAttributes?: Record<string, unknown> | null;
      isVerticalMigrated?: boolean | null;
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

type InventoryColumnsOptions = {
  productSchema?: VerticalProductSchema | null;
};

export function useInventoryColumns(options: InventoryColumnsOptions = {}) {
  const schemaFields = options.productSchema?.fields ?? [];
  const hasSizeField = schemaFields.some((field) => field.key === "size");
  const hasColorField = schemaFields.some((field) => field.key === "color");
  const hasLotField =
    schemaFields.some((field) => field.key === "lot_number") ||
    schemaFields.some((field) => field.key === "expiration_date");

  return useMemo<ColumnDef<InventoryItem>[]>(() => {
    const baseColumns: ColumnDef<InventoryItem>[] = [
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
        cell: ({ row }) => {
          const isLegacy =
            row.original.product.isVerticalMigrated === false ||
            !row.original.product.extraAttributes ||
            Object.keys(row.original.product.extraAttributes ?? {}).length === 0;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.original.product.name}</span>
              {isLegacy && <Badge variant="destructive">Legacy</Badge>}
            </div>
          );
        },
      },
      {
        id: "product.category",
        accessorKey: "product.category", // Acceder a la categor??a del producto
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Categoria
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
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
        cell: ({ row }) =>
          row.original.stock > 0 ? row.original.stock : "Sin stock", // Formatear el valor
      },
      {
        accessorKey: "product.price",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Compra
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.original.product.price;
          if (!Number.isFinite(value) || (value ?? 0) <= 0) {
            return <span className="text-muted-foreground">Sin precio</span>;
          }
          return (
            <span className="font-medium tabular-nums">
              S/. {value!.toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "priceSell",
        accessorKey: "product.priceSell",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Venta
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.original.product.priceSell;
          if (!Number.isFinite(value) || (value ?? 0) <= 0) {
            return <span className="text-muted-foreground">Sin precio</span>;
          }
          return (
            <span className="font-medium tabular-nums">
              S/. {value!.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "updateAt", // Acceder a la ??ltima actualizaci??n
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Ultima Actualizacion
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const d = new Date(row.original.updateAt);
          return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
        },
      },
      {
        accessorKey: "lowestPurchasePrice",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Compra Mas Bajo
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.original.lowestPurchasePrice;
          if (value == null || !Number.isFinite(value)) {
            return <span className="text-muted-foreground">Sin precio</span>;
          }
          return <span className="font-medium tabular-nums">S/. {value.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "highestPurchasePrice",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio de Compra Mas Alto
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const value = row.original.highestPurchasePrice;
          if (value == null || !Number.isFinite(value)) {
            return <span className="text-muted-foreground">Sin precio</span>;
          }
          return <span className="font-medium tabular-nums">S/. {value.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "createdAt", // Acceder a la fecha de creaci??n
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha de Ingreso
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
        },
      },
      {
        id: "serialNumbers",
        accessorKey: "serialNumbers",
        header: "Series",
      },
    ];
const dynamicColumns: ColumnDef<InventoryItem>[] = [];

    if (hasSizeField) {
      dynamicColumns.push({
        accessorKey: "product.extraAttributes.size",
        header: () => <span>Talla</span>,
        cell: ({ row }) => {
          const value = row.original.product.extraAttributes?.size;
          return <div className="text-sm">{typeof value === "string" ? value : "-"}</div>;
        },
      });
    }

    if (hasColorField) {
      dynamicColumns.push({
        accessorKey: "product.extraAttributes.color",
        header: () => <span>Color</span>,
        cell: ({ row }) => {
          const value = row.original.product.extraAttributes?.color;
          if (typeof value !== "string") {
            return <div className="text-sm">-</div>;
          }
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: value }} />
              {value}
            </div>
          );
        },
      });
    }

    if (hasLotField) {
      dynamicColumns.push({
        accessorKey: "product.extraAttributes.lot_number",
        header: () => <span>Lote</span>,
        cell: ({ row }) => {
          const attrs = row.original.product.extraAttributes ?? {};
          const lot = typeof attrs.lot_number === "string" ? attrs.lot_number : null;
          const expiration =
            typeof attrs.expiration_date === "string" ? attrs.expiration_date : null;
          if (!lot && !expiration) {
            return <div className="text-sm">-</div>;
          }
          return (
            <div className="space-y-0.5 text-xs">
              {lot && <div>Lote: {lot}</div>}
              {expiration && <div>Vence: {expiration}</div>}
            </div>
          );
        },
      });
    }

    return [...baseColumns, ...dynamicColumns];
  }, [hasSizeField, hasColorField, hasLotField]);
}
