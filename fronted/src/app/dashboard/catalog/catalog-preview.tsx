"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { CatalogTemplate } from "@/templates/catalog/catalog-template";
import type { CatalogItemProps } from "@/templates/catalog/catalog-item";

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  priceSell?: number;
  image?: string;
  imageUrl?: string;
}

interface CatalogPreviewProps {
  products: Product[];
}

export function CatalogPreview({ products }: CatalogPreviewProps) {
  const items: CatalogItemProps[] = products.map((p) => {
    const priceValue = p.priceSell ?? p.price;
    return {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? `$${priceValue}` : undefined,
      imageUrl: p.imageUrl ?? p.image,
    };
  });

  const html = renderToStaticMarkup(<CatalogTemplate items={items} />);

  return (
    <iframe
      className="w-full h-[600px] rounded-xl border shadow-sm"
      srcDoc={html}
    />
  );
}

export default CatalogPreview;