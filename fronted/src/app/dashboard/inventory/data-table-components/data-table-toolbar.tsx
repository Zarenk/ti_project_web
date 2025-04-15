"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

// import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { useEffect, useState } from "react";
import { TrashIcon } from "lucide-react";
import { DataTableFacetedFilter } from "../../../../components/data-table-faceted-filter";


interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

// Define el tipo para los productos
interface Provider {
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

  return (

        <div></div>
  );
  
}