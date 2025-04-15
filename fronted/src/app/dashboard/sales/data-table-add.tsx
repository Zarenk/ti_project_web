import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReactTable, getCoreRowModel, getPaginationRowModel } from "@tanstack/react-table";
import { columns, Product } from "./columns";

interface DataTableProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
}

export function DataTableAdd({ products, onAddProduct }: DataTableProps) {
  const table = useReactTable({
    data: products.map((product) => ({
      ...product,
      onAdd: onAddProduct, // Pasar la función para manejar la acción de agregar
    })),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="border rounded-md p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : typeof header.column.columnDef.header === "function"
                    ? header.column.columnDef.header(header.getContext())
                    : header.column.columnDef.header}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {typeof cell.renderValue() === "object"
                      ? JSON.stringify(cell.renderValue()) // Si es un objeto, conviértelo a string
                      : (cell.renderValue() as React.ReactNode)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center">
                No hay productos disponibles.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}