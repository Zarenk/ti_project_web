import React from "react";
import { Input } from "@/components/ui/input";

interface ProviderFilterInputProps {
  value: string; // Valor actual del filtro
  onChange: (value: string) => void; // Función para actualizar el filtro
}

export const ProviderFilterInput: React.FC<ProviderFilterInputProps> = ({ value, onChange }) => {
  return (
    <Input
        placeholder="Filtrar por nombre de tienda..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};