// components/entries/ProviderSection.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronsUpDown, Save } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn, normalizeOptionValue } from "@/lib/utils";
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
  const normalizedSelectedProvider = normalizeOptionValue(valueProvider)
  const selectedProviderOption =
    providers.find((provider) => normalizeOptionValue(provider.name) === normalizedSelectedProvider) ?? null
  const displayedProviderName = selectedProviderOption?.name ?? valueProvider ?? ""
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex-1 flex flex-col border rounded-md p-2">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="provider-combobox" className="text-sm font-medium">
          Ingrese un proveedor:
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={`${isCollapsed ? "Expandir" : "Contraer"} panel de proveedor`}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? "Mostrar panel" : "Ocultar panel"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isCollapsed ? "-rotate-90" : "rotate-0"
            )}
          />
        </Button>
      </div>
      {!isCollapsed && (
        <>
          <div className="flex justify-between gap-1">
            <Popover open={openProvider} onOpenChange={setOpenProvider}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProvider}
                  className="w-[260px] justify-between"
                  title="Busca y selecciona el proveedor responsable del ingreso"
                >
                  {displayedProviderName || "Selecciona un proveedor..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar proveedor..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                    <CommandGroup>
                      {providers.map((provider) => {
                        const normalizedProviderName = normalizeOptionValue(provider.name)
                        const isSelected = normalizedProviderName === normalizedSelectedProvider
                        const commandValue =
                          typeof provider.name === "string"
                            ? provider.name.trim()
                            : provider.name != null
                              ? String(provider.name)
                              : ""

                        return (
                          <CommandItem
                            key={provider.id ?? provider.name}
                            value={commandValue}
                            onSelect={() => {
                              if (isSelected) {
                                setOpenProvider(false)
                                return
                              }

                              setValueProvider(provider.name || "")
                              setValue("provider_name", provider.name || "")
                              setValue("provider_adress", provider.adress || "")
                              setValue("provider_documentNumber", provider.documentNumber || "")
                              setOpenProvider(false)
                            }}
                          >
                            {provider.name}
                            <Save className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
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
              onClick={() => setIsDialogOpenProvider(true)}
              title="Registra un nuevo proveedor sin salir del formulario"
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
          <Input
            {...register("provider_documentNumber")}
            readOnly
            title="Número de documento tributario del proveedor"
          />
        <div className="flex justify-between gap-1">
            <div className="flex flex-col flex-grow">
              <Label className="text-sm font-medium py-2">Dirección del Proveedor</Label>
              <Input
                {...register("provider_adress")}
                readOnly
                title="Dirección fiscal registrada del proveedor"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-sm font-medium py-2">Ruc</Label>
              <Input
                {...register("provider_documentNumber")}
                readOnly
                title="Número de documento tributario del proveedor"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}



