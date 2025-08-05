import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CatalogItem {
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  brandLogo?: string;
  gpuLogo?: string;
  cpuLogo?: string;
  categoryName?: string;
}

export async function getCatalogItems(
  filters: Record<string, any>,
): Promise<CatalogItem[]> {
  const categories = filters.categories
    ? String(filters.categories)
        .split(',')
        .map((id: string) => Number(id))
        .filter(Boolean)
    : undefined;

  const products = await prisma.product.findMany({
    where: {
      categoryId: categories ? { in: categories } : undefined,
    },
  select: {
      name: true,
      price: true,
      description: true,
      images: true,
      category: { select: { name: true } },
    },
    orderBy: [
      { category: { name: 'asc' } },
      { name: 'asc' },
    ],
  });

  return products.map((p) => ({
    name: p.name,
    price: p.price,
    description: p.description ?? undefined,
    imageUrl: p.images[0] ?? undefined,
    categoryName: p.category?.name,
  }));
}