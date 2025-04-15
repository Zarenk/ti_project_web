import React from "react";
import { Input } from "@/components/ui/input";

interface UserFilterInputProps {
  value: string; // Valor actual del filtro
  onChange: (value: string) => void; // Función para actualizar el filtro
}

export const UserFilterInput: React.FC<UserFilterInputProps> = ({ value, onChange }) => {
  return (
    <Input
      placeholder="Filtrar por nombre de Usuario..."
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};