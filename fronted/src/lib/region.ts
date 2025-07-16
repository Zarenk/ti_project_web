export interface Region {
  name: string;
  cities: string[];
}

export const regions: Region[] = [
  { name: "Lima", cities: ["Lima", "Barranca", "Cañete"] },
  { name: "Arequipa", cities: ["Arequipa", "Camana", "Mollendo"] },
  { name: "Cusco", cities: ["Cusco", "Sicuani", "Quillabamba"] },
  { name: "Piura", cities: ["Piura", "Sullana", "Talara"] },
  { name: "La Libertad", cities: ["Trujillo", "Chepén", "Pacasmayo"] },
];