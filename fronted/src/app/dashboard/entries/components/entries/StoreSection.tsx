"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, ChevronsUpDown, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, normalizeOptionValue } from "@/lib/utils";
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
  const normalizedSelectedStore = normalizeOptionValue(valueStore)
  const selectedStoreOption =
    stores.find((store) => normalizeOptionValue(store.name) === normalizedSelectedStore) ?? null
  const displayedStoreName = selectedStoreOption?.name ?? valueStore ?? ""

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
              title="Selecciona la tienda donde se registrará el ingreso"
            >
              {displayedStoreName || "Seleccione una Tienda..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0">
            <Command>
              <CommandInput placeholder="Buscar tienda..." />
              <CommandList>
                <CommandEmpty>No se encontraron tiendas.</CommandEmpty>
                <CommandGroup>
                  {stores.map((store) => {
                    const normalizedStoreName = normalizeOptionValue(store.name)
                    const isSelected = normalizedStoreName === normalizedSelectedStore
                    const commandValue =
                      typeof store.name === "string"
                        ? store.name.trim()
                        : store.name != null
                          ? String(store.name)
                          : ""

                    return (
                      <CommandItem
                        key={store.id ?? store.name}
                        value={commandValue}
                        onSelect={() => {
                          if (isSelected) {
                            setOpenStore(false)
                            return
                          }

                          setIsProviderComboTouched(true)
                          setValueStore(store.name || "")
                          const selectedStoreName = store.name || ""
                          const selectedStoreAdress = store.adress || ""
                          setValue("store_name", selectedStoreName)
                          setValue("store_adress", selectedStoreAdress)
                          setOpenStore(false)
                        }}
                      >
                        {store.name}
                        <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          className="sm:w-auto sm:ml-2 ml-0 bg-green-700 hover:bg-green-800 text-white"
          type="button"
          onClick={() => setIsDialogOpenStore(true)}
          title="Crea una nueva tienda para asociarla al ingreso"
        >
          <span className="hidden sm:block">Nuevo</span>
          <Save className="w-6 h-6" />
        </Button>
      </div>
      <Label className="text-sm font-medium py-2">Tienda</Label>
      <Input
        {...register("store_name")}
        readOnly
        title="Nombre de la tienda seleccionada"
      />
      <Label className="text-sm font-medium py-2">Direccion de la tienda</Label>
      <Input
        {...register("store_adress")}
        readOnly
        title="Dirección comercial de la tienda asociada"
      />
      <AddStoreDialog
        isOpen={isDialogOpenStore}
        onClose={() => setIsDialogOpenStore(false)}
        setStores={setStores}
        setValue={setValue}
      />
    </div>
  );
};



