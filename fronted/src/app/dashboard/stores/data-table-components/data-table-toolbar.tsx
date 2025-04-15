"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

// import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { useEffect, useState } from "react";
import { TrashIcon } from "lucide-react";
import { DataTableFacetedFilter } from "../../../../components/data-table-faceted-filter";
import { getStores } from "../stores.api";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

// Define el tipo para los productos
interface Store {
    id: number;
    name: string;
  }

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

    // Estado para almacenar las categorías
    const [categories, setCategories] = useState<
    { label: string; value: string }[] 
    >([]);


    /*
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
*/


  return (

        <div></div>
  );
  
}