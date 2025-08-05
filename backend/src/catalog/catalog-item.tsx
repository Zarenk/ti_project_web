import React from 'react';

export interface CatalogItemProps {
  title: string;
  description?: string;
  price?: string;
  imageUrl?: string;
}

export function CatalogItem({
  title,
  description,
  price,
  imageUrl,
}: CatalogItemProps) {
  return (
    <div className="catalog-item p-4 border rounded">
      {imageUrl && (
        <img src={imageUrl} alt={title} className="w-full h-auto mb-2" />
      )}
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-sm text-gray-700">{description}</p>}
      {price && <p className="text-sm font-bold mt-2">{price}</p>}
    </div>
  );
}

export type { CatalogItemProps as CatalogItemProperties };