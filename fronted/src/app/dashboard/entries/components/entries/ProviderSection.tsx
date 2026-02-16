// components/entries/ProviderSection.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronsUpDown, Save } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  watch: (name: string) => any;
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
  watch,
}: ProviderSectionProps) {
  const normalizedSelectedProvider = normalizeOptionValue(valueProvider);
  const selectedProviderOption =
    providers.find((provider) => normalizeOptionValue(provider.name) === normalizedSelectedProvider) ?? null;
  const displayedProviderName = selectedProviderOption?.name ?? valueProvider ?? "";
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="flex flex-1 flex-col rounded-md border p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center">
          <Label htmlFor="provider-combobox" className="text-sm font-medium">
            Ingrese un proveedor:
          </Label>
          {renderStatusChip(hasValue("provider_name"))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={`${isCollapsed ? "Expandir" : "Contraer"} panel de proveedor`}
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
            <Popover open={openProvider} onOpenChange={setOpenProvider}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProvider}
                  className="w-[260px] cursor-pointer justify-between transition-colors hover:border-border hover:bg-accent hover:text-foreground"
                  title="Busca y selecciona el proveedor del ingreso."
                >
                  {displayedProviderName || "Selecciona un proveedor..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
                <Command>
                  <CommandInput placeholder="Buscar proveedor..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                    <CommandGroup>
                      {providers.map((provider) => {
                        const normalizedProviderName = normalizeOptionValue(provider.name);
                        const isSelected = normalizedProviderName === normalizedSelectedProvider;
                        const commandValue =
                          typeof provider.name === "string"
                            ? provider.name.trim()
                            : provider.name != null
                              ? String(provider.name)
                              : "";

                        return (
                          <CommandItem
                            key={provider.id ?? provider.name}
                            value={commandValue}
                            className="cursor-pointer transition-colors hover:bg-accent/60"
                            onSelect={() => {
                              if (isSelected) {
                                setOpenProvider(false);
                                return;
                              }

                              setValueProvider(provider.name || "");
                              setValue("provider_name", provider.name || "");
                              setValue("provider_adress", provider.adress || "");
                              setValue("provider_documentNumber", provider.documentNumber || "");
                              setOpenProvider(false);
                            }}
                          >
                            {provider.name}
                            <Save className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0")} />
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
                  onClick={() => setIsDialogOpenProvider(true)}
                >
                  <span className="hidden sm:block">Nuevo</span>
                  <Save className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Registra un proveedor sin salir del formulario.</TooltipContent>
            </Tooltip>

            <AddProviderDialog
              isOpen={isDialogOpenProvider}
              onClose={() => setIsDialogOpenProvider(false)}
              setProviders={setProviders}
              setValue={setValue}
            />
          </div>

          <Label className="py-2 text-sm font-medium">Nombre del Proveedor</Label>
          <Input {...register("provider_name")} readOnly />

          <div className="flex justify-between gap-1">
            <div className="flex flex-grow flex-col">
              <Label className="py-2 text-sm font-medium">Direccion del Proveedor</Label>
              <Input {...register("provider_adress")} readOnly />
            </div>
            <div className="flex flex-col">
              <Label className="py-2 text-sm font-medium">Ruc</Label>
              <Input {...register("provider_documentNumber")} readOnly />
            </div>
          </div>
        </>
      )}
    </div>
  );
}



