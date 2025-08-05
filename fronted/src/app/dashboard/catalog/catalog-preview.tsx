"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogTemplate } from "@/templates/catalog/catalog-template";
import type { CatalogItemProps } from "@/templates/catalog/catalog-item";
import { brandAssets } from "@/catalog/brandAssets";

interface Product {
  id: number;
  name: string;
  description?: string;
  price?: number;
  priceSell?: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  brand?: string;
  specification?: {
    processor?: string;
    graphics?: string;
  };
}

interface CatalogPreviewProps {
  products: Product[];
}

export function CatalogPreview({ products }: CatalogPreviewProps) {

  function getLogos(p: Product): string[] {
    const logos: string[] = [];
    if (p.brand) {
      const brandLogo = brandAssets.brands[p.brand.toLowerCase()];
      if (brandLogo) logos.push(brandLogo);
    }
    const processor = p.specification?.processor?.toLowerCase() || "";
    for (const [key, path] of Object.entries(brandAssets.cpus)) {
      if (processor.includes(key)) {
        logos.push(path);
        break;
      }
    }
    const graphics = p.specification?.graphics?.toLowerCase() || "";
    for (const [key, path] of Object.entries(brandAssets.gpus)) {
      if (graphics.includes(key)) {
        logos.push(path);
        break;
      }
    }
    return logos;
  }

  const items: CatalogItemProps[] = products.map((p) => {
    const priceValue = p.priceSell ?? p.price;
    return {
      title: p.name,
      description: p.description,
      price: typeof priceValue === 'number' ? `$${priceValue}` : undefined,
      imageUrl: p.imageUrl ?? p.image ?? p.images?.[0],
      logos: getLogos(p),
    };
  });

  const html = renderToStaticMarkup(<CatalogTemplate items={items} />);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista previa del catálogo</CardTitle>
      </CardHeader>
      <CardContent>
        <iframe
          className="w-full h-[600px] rounded-xl border shadow-sm"
          srcDoc={html}
        />
      </CardContent>
    </Card>
  );
}

export default CatalogPreview;