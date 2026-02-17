"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, ChevronsUpDown, Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, normalizeOptionValue } from "@/lib/utils";
import { AddStoreDialog } from "../AddStoreDialog";

type StoreSectionProps = {
  openStore: boolean;
  setOpenStore: (open: boolean) => void;
  valueStore: string;
  setValueStore: (value: string) => void;
  stores: { id: number; name: string; description: string; adress: string }[];
  setValue: any;
  register: any;
  watch: (name: string) => any;
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
  watch,
  isDialogOpenStore,
  setIsDialogOpenStore,
  setStores,
  setIsProviderComboTouched,
  valueProvider,
}: StoreSectionProps) => {
  const normalizedSelectedStore = normalizeOptionValue(valueStore);
  const selectedStoreOption =
    stores.find((store) => normalizeOptionValue(store.name) === normalizedSelectedStore) ?? null;
  const displayedStoreName = selectedStoreOption?.name ?? valueStore ?? "";
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const renderStatusChip = (filled: boolean, optional = false) => (
    <span
      className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : optional
            ? "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300"
            : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      }`}
    >
      {filled ? "Listo" : optional ? "Opcional" : "Requerido"}
    </span>
  );

  const hasValue = (name: string) => {
    const value = watch(name);
    return Boolean(value && String(value).trim().length > 0);
  };

  return (
    <div className="flex min-w-0 flex-col rounded-md border border-gray-600 p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <Label htmlFor="store-combobox" className="text-sm font-medium">
            Ingrese una Tienda:
          </Label>
          {renderStatusChip(hasValue("store_name"))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={`${isCollapsed ? "Expandir" : "Contraer"} panel de tienda`}
              aria-expanded={!isCollapsed}
              className="cursor-pointer transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", isCollapsed ? "-rotate-90" : "rotate-0")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCollapsed ? "Mostrar panel" : "Ocultar panel"}</TooltipContent>
        </Tooltip>
      </div>

      {!isCollapsed && (
        <>
          <div className="flex justify-between gap-1">
            <Popover open={openStore} onOpenChange={setOpenStore}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openStore}
                  className="w-[260px] cursor-pointer justify-between transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                  title="Selecciona la tienda donde registrar el ingreso."
                >
                  {displayedStoreName || "Seleccione una Tienda..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <Command>
                  <CommandInput placeholder="Buscar tienda..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron tiendas.</CommandEmpty>
                    <CommandGroup>
                      {stores.map((store) => {
                        const normalizedStoreName = normalizeOptionValue(store.name);
                        const isSelected = normalizedStoreName === normalizedSelectedStore;
                        const commandValue =
                          typeof store.name === "string"
                            ? store.name.trim()
                            : store.name != null
                              ? String(store.name)
                              : "";

                        return (
                          <CommandItem
                            key={store.id ?? store.name}
                            value={commandValue}
                            className="cursor-pointer transition-colors hover:bg-accent/60"
                            onSelect={() => {
                              if (isSelected) {
                                setOpenStore(false);
                                return;
                              }

                              setIsProviderComboTouched(true);
                              setValueStore(store.name || "");
                              const selectedStoreName = store.name || "";
                              const selectedStoreAdress = store.adress || "";
                              setValue("store_name", selectedStoreName);
                              setValue("store_adress", selectedStoreAdress);
                              setOpenStore(false);
                            }}
                          >
                            {store.name}
                            <Check className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="ml-0 cursor-pointer bg-green-700 text-white transition-colors hover:bg-green-800 sm:ml-2 sm:w-auto"
                  type="button"
                  onClick={() => setIsDialogOpenStore(true)}
                >
                  <span className="hidden sm:block">Nuevo</span>
                  <Save className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crea una tienda sin salir del formulario.</TooltipContent>
            </Tooltip>
          </div>

          <Label className="py-2 text-sm font-medium">Tienda</Label>
          <Input {...register("store_name")} readOnly />

          <Label className="py-2 text-sm font-medium">Direccion de la tienda</Label>
          <Input {...register("store_adress")} readOnly />

          <AddStoreDialog
            isOpen={isDialogOpenStore}
            onClose={() => setIsDialogOpenStore(false)}
            setStores={setStores}
            setValue={setValue}
          />
        </>
      )}
    </div>
  );
};



