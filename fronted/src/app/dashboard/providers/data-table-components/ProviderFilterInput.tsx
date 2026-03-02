import React from "react";
import { Input } from "@/components/ui/input";

interface ProviderFilterInputProps {
  value: string; // Valor actual del filtro
  onChange: (value: string) => void; // Función para actualizar el filtro
}

export const ProviderFilterInput: React.FC<ProviderFilterInputProps> = ({ value, onChange }) => {
  return (
    <Input
        placeholder="Filtrar por nombre de proveedor..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full"
    />
  );
};