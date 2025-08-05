import React from 'react';
import type { CatalogItemProps } from './catalog-item';
import { CatalogItem } from './catalog-item';

export interface CatalogTemplateProps {
  title?: string;
  items: CatalogItemProps[];
}

export function CatalogTemplate({
  title = 'Catalog',
  items,
}: CatalogTemplateProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
      </head>
      <body>
        <main className="catalog-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <CatalogItem key={index} {...item} />
          ))}
        </main>
      </body>
    </html>
  );
}

export default CatalogTemplate;