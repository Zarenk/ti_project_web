"use client";

import { useEffect, useState } from "react";
import { getCategories } from "./catalog.api";

interface Category {
  id: number;
  name: string;
}

interface CategoryFilterProps {
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <label key={cat.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            value={cat.id}
            checked={selected.includes(cat.id)}
            onChange={() => toggle(cat.id)}
          />
          <span>{cat.name}</span>
        </label>
      ))}
    </div>
  );
}

export default CategoryFilter;