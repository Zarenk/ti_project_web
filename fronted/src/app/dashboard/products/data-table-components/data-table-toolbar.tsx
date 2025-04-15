"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
// import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { useEffect, useState } from "react";
import { TrashIcon } from "lucide-react";
import { DataTableFacetedFilter } from "../../../../components/data-table-faceted-filter";
import { getProducts } from "../products.api";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

// Define el tipo para los productos
interface Product {
    id: number;
    name: string;
    category: {
      id: number;
      name: string;
    };
  }

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

    // Estado para almacenar las categorías
    const [categories, setCategories] = useState<
    { label: string; value: string }[] 
    >([]);

   // Llama a la API para obtener las categorías
   useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getProducts() as Product[]; // Llama a tu función API

        // Filtra las categorías que tienen al menos un producto
        const filteredCategories = data.filter(
            (item: any) => item.category && item.category.id && item.category.name
          );

        // Mapea las categorías filtradas al formato esperado
        const formattedCategories = filteredCategories.map((item: any) => ({
          label: item.category.name, // Ajusta según la estructura de tu API
          value: item.category.id, // Ajusta según la estructura de tu API
        }));

        // Elimina categorías duplicadas basadas en el ID
        const uniqueCategories = Array.from(
            new Map(formattedCategories.map((item: any) => [item.value, item])).values()
          );
          
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Error al obtener las categorías:", error);
      }
    };

       fetchCategories();
    }, []); // Se ejecuta solo una vez al montar el componente



  return (

    

    <div className="flex flex-wrap items-center justify-between">

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {table.getColumn("category_name") && (
          <DataTableFacetedFilter
            column={table.getColumn("category_name")}
            title="Categoria"
            options={categories}
            onChange={(selectedValue) => {
                //console.log("Valor seleccionado:", selectedValue);
                // Si no hay valores seleccionados, elimina el filtro
                if (!selectedValue || selectedValue.length === 0) {
                    table.getColumn("category_name")?.setFilterValue(undefined);
                } else {
                    // Aplica el filtro con los valores seleccionados
                    table.getColumn("category_name")?.setFilterValue(selectedValue);
                }
            }}
          />
        )}
        {/*}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
        */}
      </div>

      {/* 
      <div className="flex items-center gap-2">
        {table.getFilteredSelectedRowModel().rows.length > 0 ? (
          <Button variant="outline" size="sm">
            <TrashIcon className="mr-2 size-4" aria-hidden="true" />
            Delete ({table.getFilteredSelectedRowModel().rows.length})
          </Button>
        ) : null}
      </div>
      */}
    </div>
  );
}