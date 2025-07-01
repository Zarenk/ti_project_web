// components/entries/ProviderSection.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Save } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { AddProviderDialog } from "../AddProviderDialog";

interface ProviderSectionProps {
  valueProvider: string;
  setValueProvider: (val: string) => void;
  providers: any[];
  openProvider: boolean;
  setOpenProvider: (val: boolean) => void;
  setIsDialogOpenProvider: (val: boolean) => void;
  isDialogOpenProvider: boolean;
  setProviders: (val: any) => void;
  setValue: any;
  register: any;
}

export function ProviderSection({
  valueProvider,
  setValueProvider,
  providers,
  openProvider,
  setOpenProvider,
  isDialogOpenProvider,
  setIsDialogOpenProvider,
  setProviders,
  setValue,
  register,
}: ProviderSectionProps) {
  return (
    <div className="flex-1 flex flex-col border rounded-md p-2">
      <Label htmlFor="provider-combobox" className="text-sm font-medium mb-2">
        Ingrese un proveedor:
      </Label>
      <div className="flex justify-between gap-1">
        <Popover open={openProvider} onOpenChange={setOpenProvider}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openProvider}
              className="w-[260px] justify-between"
            >
              {valueProvider
                ? providers.find((provider) => String(provider.name) === valueProvider)?.name
                : "Selecciona un proveedor..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-0">
            <Command>
              <CommandInput placeholder="Buscar proveedor..." />
              <CommandList>
                <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                <CommandGroup>
                  {providers.map((provider) => (
                    <CommandItem
                      key={provider.name}
                      value={provider.name}
                      onSelect={(currentValue) => {
                        if (currentValue === valueProvider) return; // 👈 Si es el mismo proveedor, no hace nada
                        setValueProvider(currentValue === valueProvider ? "" : currentValue);
                        const selectedProvider = providers.find(
                          (provider) => String(provider.name) === currentValue
                        );
                        if (selectedProvider) {
                          setValue("provider_name", selectedProvider.name || "");
                          setValue("provider_adress", selectedProvider.adress || "");
                          setValue("provider_documentNumber", selectedProvider.documentNumber || "");
                        } else {
                          console.error("Proveedor no encontrado:", currentValue);
                        }
                        setOpenProvider(false);
                      }}
                    >
                      {provider.name}
                      <Save
                        className={cn(
                          "ml-auto",
                          valueProvider === provider.name ? "opacity-100" : "opacity-0"
                        )}
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
          onClick={() => setIsDialogOpenProvider(true)}
        >
          <span className="hidden sm:block">Nuevo</span>
          <Save className="w-6 h-6" />
        </Button>
        <AddProviderDialog
          isOpen={isDialogOpenProvider}
          onClose={() => setIsDialogOpenProvider(false)}
          setProviders={setProviders}
          setValue={setValue}
        />
      </div>
      <Label className="text-sm font-medium py-2">Nombre del Proveedor</Label>
      <Input {...register("provider_name")} readOnly />
      <div className="flex justify-between gap-1">
        <div className="flex flex-col flex-grow">
          <Label className="text-sm font-medium py-2">Dirección del Proveedor</Label>
          <Input {...register("provider_adress")} readOnly />
        </div>
        <div className="flex flex-col">
          <Label className="text-sm font-medium py-2">Ruc</Label>
          <Input {...register("provider_documentNumber")} readOnly />
        </div>
      </div>
    </div>
  );
}