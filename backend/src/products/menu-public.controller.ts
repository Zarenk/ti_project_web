import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';

@Controller('public/menu')
@UseGuards(TenantRequiredGuard)
export class MenuPublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get public restaurant menu grouped by category' })
  async getMenu(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('storeId') storeId?: string,
  ) {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
    };

    if (companyId) {
      where.companyId = companyId;
    } else if (organizationId) {
      where.organizationId = organizationId;
    }

    // Only show migrated products (dishes) for restaurants
    where.isVerticalMigrated = true;

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        recipeItems: {
          include: {
            ingredient: { select: { id: true, name: true, unit: true } },
          },
        },
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    // If storeId provided, get stock availability
    let stockMap: Record<number, number> = {};
    if (storeId) {
      const parsedStoreId = parseInt(storeId, 10);
      if (!isNaN(parsedStoreId)) {
        const inventory = await this.prisma.storeOnInventory.findMany({
          where: {
            storeId: parsedStoreId,
            inventory: {
              productId: { in: products.map((p) => p.id) },
            },
          },
          include: { inventory: { select: { productId: true } } },
        });
        for (const inv of inventory) {
          stockMap[inv.inventory.productId] = inv.stock;
        }
      }
    }

    // Group by category
    const grouped: Record<
      string,
      {
        categoryId: number;
        categoryName: string;
        items: Array<{
          id: number;
          name: string;
          description: string | null;
          price: number;
          image: string | null;
          images: string[];
          available: boolean;
          prepTime: number | null;
          kitchenStation: string | null;
        }>;
      }
    > = {};

    for (const product of products) {
      const catName = product.category?.name ?? 'Sin categoría';
      const catId = product.category?.id ?? 0;

      if (!grouped[catName]) {
        grouped[catName] = {
          categoryId: catId,
          categoryName: catName,
          items: [],
        };
      }

      // Extract prepTime and kitchenStation from extraAttributes
      const extra = product.extraAttributes as Record<string, unknown> | null;
      const prepTime =
        typeof extra?.prepTime === 'number' ? extra.prepTime : null;
      const kitchenStation =
        typeof extra?.kitchenStation === 'string'
          ? extra.kitchenStation
          : null;

      const available =
        storeId && Object.keys(stockMap).length > 0
          ? (stockMap[product.id] ?? 0) > 0
          : true;

      grouped[catName].items.push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.priceSell ?? product.price,
        image: product.image,
        images: product.images ?? [],
        available,
        prepTime,
        kitchenStation,
      });
    }

    return {
      categories: Object.values(grouped),
      total: products.length,
    };
  }
}
