export interface CatalogItem {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  brandLogo?: string;
  gpuLogo?: string;
  cpuLogo?: string;
}

export function getCatalogItems(filters: Record<string, any>): CatalogItem[] {
  return [
    {
      name: Object.keys(filters).length
        ? JSON.stringify(filters)
        : 'Catálogo',
      price: 0,
      description: '',
      imageUrl: '',
      brandLogo: '',
      gpuLogo: '',
      cpuLogo: '',
    },
  ];
}