"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, ChevronsUpDown, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { AddStoreDialog } from "../AddStoreDialog"; // ajusta la ruta si lo tienes en otro lado

type StoreSectionProps = {
  openStore: boolean;
  setOpenStore: (open: boolean) => void;
  valueStore: string;
  setValueStore: (value: string) => void;
  stores: { id: number; name: string; description: string; adress: string }[];
  setValue: any;
  register: any;
  isDialogOpenStore: boolean;
  setIsDialogOpenStore: (open: boolean) => void;
  setStores: any;
  setIsProviderComboTouched: (touched: boolean) => void;
  valueProvider: string;
};

export const StoreSection = ({
  openStore,
  setOpenStore,
  valueStore,
  setValueStore,
  stores,
  setValue,
  register,
  isDialogOpenStore,
  setIsDialogOpenStore,
  setStores,
  setIsProviderComboTouched,
  valueProvider,
}: StoreSectionProps) => {
  return (
    <div className="flex-1 flex flex-col border border-gray-600 rounded-md p-2">
      <Label htmlFor="store-combobox" className="text-sm font-medium mb-2">
        Ingrese una Tienda:
      </Label>
      <div className="flex justify-between gap-1">
        <Popover open={openStore} onOpenChange={setOpenStore}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openStore}
              className="w-[260px] justify-between"
            >
              {valueStore
                ? stores.find((store) => String(store.name) === valueStore)?.name
                : "Seleccione una Tienda..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0">
            <Command>
              <CommandInput placeholder="Buscar tienda..." />
              <CommandList>
                <CommandEmpty>No se encontraron tiendas.</CommandEmpty>
                <CommandGroup>
                  {stores.map((store) => (
                    <CommandItem
                      key={store.name}
                      value={store.name}
                      onSelect={(currentValue) => {
                        if (currentValue === valueStore) return; // 👈 Si es el mismo proveedor, no hace nada
                        setIsProviderComboTouched(true);
                        setValueStore(currentValue === valueStore ? "" : currentValue);
                        const selectedStore = stores.find((store) => String(store.name) === currentValue);
                        if (selectedStore) {
                          setValue("store_name", selectedStore.name || "");
                          setValue("store_adress", selectedStore.adress || "");
                        } else {
                          console.error("Tienda no encontrada:", currentValue);
                        }
                        setOpenStore(false);
                      }}
                    >
                      {store.name}
                      <Check
                        className={cn("ml-auto", valueProvider === store.name ? "opacity-100" : "opacity-0")}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          className="sm:w-auto sm:ml-2 ml-0 bg-green-700 hover:bg-green-800 text-white"
          type="button"
          onClick={() => setIsDialogOpenStore(true)}
        >
          <span className="hidden sm:block">Nuevo</span>
          <Save className="w-6 h-6" />
        </Button>
      </div>
      <Label className="text-sm font-medium py-2">Tienda</Label>
      <Input {...register("store_name")} readOnly />
      <Label className="text-sm font-medium py-2">Direccion de la tienda</Label>
      <Input {...register("store_adress")} readOnly />
      <AddStoreDialog
        isOpen={isDialogOpenStore}
        onClose={() => setIsDialogOpenStore(false)}
        setStores={setStores}
        setValue={setValue}
      />
    </div>
  );
};