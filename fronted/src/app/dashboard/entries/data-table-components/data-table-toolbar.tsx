"use client";

import { Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { DataTableFacetedFilter } from "../../../../components/data-table-faceted-filter";
import { getAllEntries } from "../entries.api";

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

// Define el tipo para los productos
interface Entry {
    id: number;
    name: string;
    user: {
      id: number;
      username: string;
    };
    user_username: string;
    provider: {
      id: number;
      name: string;
    }
    provider_name: string
    store:{
      id: number,
      name: string;
    }
    store_name:string;
  }

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {

  const isFiltered = table.getState().columnFilters.length > 0;

    // Estado para almacenar los Usuarios
    const [users, setUsers] = useState<
    { label: string; value: string }[] 
    >([]);

    // Llama a la API para obtener los usuarios
    useEffect(() => {
      const fetchUsers = async () => {
          try {
            const data = await getAllEntries() as Entry[]; // Llama a tu función API
    
            // Filtra las categorías que tienen al menos un producto
            const filteredEntryes = data.filter(
                (item: any) => item.user && item.user.id && item.user.username
              );
    
            // Mapea las categorías filtradas al formato esperado
            const formattedEntryes = filteredEntryes.map((item: any) => ({
              label: item.user.username, // Ajusta según la estructura de tu API
              value: item.user.id, // Ajusta según la estructura de tu API
            }));
    
            // Elimina categorías duplicadas basadas en el ID
            const uniqueEntryes = Array.from(
                new Map(formattedEntryes.map((item: any) => [item.value, item])).values()
              );
              
            setUsers(uniqueEntryes);
          } catch (error) {
            console.error("Error al obtener los usuarios:", error);
          }
        };
    
           fetchUsers();
    },[]); // Se ejecuta solo una vez al montar el componente

    // Estado para almacenar los Proveedores
    const [providers, setProviders] = useState<
    { label: string; value: string }[] 
    >([]);

    // Llama a la API para obtener los proveedores
    useEffect(() => {
      const fetchProviders = async () => {
          try {
            const data = await getAllEntries() as Entry[]; // Llama a tu función API
    
            // Filtra las categorías que tienen al menos un producto
            const filteredProviders = data.filter(
                (item: any) => item.provider && item.provider.id && item.provider.name
              );
    
            // Mapea las categorías filtradas al formato esperado
            const formattedProviders = filteredProviders.map((item: any) => ({
              label: item.provider.name, // Ajusta según la estructura de tu API
              value: item.provider.id, // Ajusta según la estructura de tu API
            }));
    
            // Elimina categorías duplicadas basadas en el ID
            const uniqueProviders = Array.from(
                new Map(formattedProviders.map((item: any) => [item.value, item])).values()
              );
              
            setProviders(uniqueProviders);
          } catch (error) {
            console.error("Error al obtener los proveedores:", error);
          }
        };
    
           fetchProviders();
    },[]); // Se ejecuta solo una vez al montar el componente

    // Llama a la API para obtener las tiendas
    // Estado para almacenar los Proveedores
    const [stores, setStores] = useState<
    { label: string; value: string }[] 
    >([]);

    useEffect(() => {
      const fetchStores = async () => {
          try {
            const data = await getAllEntries() as Entry[]; // Llama a tu función API
    
            // Filtra las categorías que tienen al menos un producto
            const filteredStores = data.filter(
                (item: any) => item.store && item.store.id && item.store.name
              );
    
            // Mapea las categorías filtradas al formato esperado
            const formattedStores = filteredStores.map((item: any) => ({
              label: item.store.name, // Ajusta según la estructura de tu API
              value: item.store.id, // Ajusta según la estructura de tu API
            }));
    
            // Elimina categorías duplicadas basadas en el ID
            const uniqueStores = Array.from(
                new Map(formattedStores.map((item: any) => [item.value, item])).values()
              );
              
            setStores(uniqueStores);
          } catch (error) {
            console.error("Error al obtener las tiendas:", error);
          }
        };
    
           fetchStores();
    },[]); // Se ejecuta solo una vez al montar el componente
    
  return (
    <div className="flex flex-wrap items-center justify-between">

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {table.getColumn("user_username") && (
          <DataTableFacetedFilter
            column={table.getColumn("user_username")}
            title="Usuario"
            options={users}
            onChange={(selectedValue) => {
                //console.log("Valor seleccionado:", selectedValue);
                // Si no hay valores seleccionados, elimina el filtro
                if (!selectedValue || selectedValue.length === 0) {
                    table.getColumn("user_username")?.setFilterValue(undefined);
                } else {
                    // Aplica el filtro con los valores seleccionados
                    table.getColumn("user_username")?.setFilterValue(selectedValue);
                }
            }}
          />
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {table.getColumn("provider_name") && (
          <DataTableFacetedFilter
            column={table.getColumn("provider_name")}
            title="Proveedor"
            options={providers}
            onChange={(selectedValue) => {
                //console.log("Valor seleccionado:", selectedValue);
                // Si no hay valores seleccionados, elimina el filtro
                if (!selectedValue || selectedValue.length === 0) {
                    table.getColumn("provider_name")?.setFilterValue(undefined);
                } else {
                    // Aplica el filtro con los valores seleccionados
                    table.getColumn("provider_name")?.setFilterValue(selectedValue);
                }
            }}
          />
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2">
        {table.getColumn("store_name") && (
          <DataTableFacetedFilter
            column={table.getColumn("store_name")}
            title="Tienda"
            options={stores}
            onChange={(selectedValue) => {
                //console.log("Valor seleccionado:", selectedValue);
                // Si no hay valores seleccionados, elimina el filtro
                if (!selectedValue || selectedValue.length === 0) {
                    table.getColumn("store_name")?.setFilterValue(undefined);
                } else {
                    // Aplica el filtro con los valores seleccionados
                    table.getColumn("store_name")?.setFilterValue(selectedValue);
                }
            }}
          />
        )}
      </div>
    </div>
  );
}