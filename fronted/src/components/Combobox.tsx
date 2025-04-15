import React from "react";

interface ComboboxProps {
  id: string;
  options: { id: number; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({ id, options, value, onChange, placeholder }) => {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded-md"
    >
      <option value="" disabled>
        {placeholder || "Selecciona una opción"}
      </option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
};