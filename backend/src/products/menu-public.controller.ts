import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { MenuConfigService } from 'src/menu-config/menu-config.service';

@Controller('public/menu')
export class MenuPublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuConfigService: MenuConfigService,
  ) {}

  /** Access menu by slug — no tenant headers needed */
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get public menu by slug' })
  async getMenuBySlug(
    @Param('slug') slug: string,
    @Query('storeId') storeId?: string,
  ) {
    const tenant = await this.menuConfigService.findTenantBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Menu no encontrado');
    }
    return this.buildMenu(tenant.organizationId, tenant.companyId, storeId);
  }

  @Get()
  @UseGuards(TenantRequiredGuard)
  @ApiOperation({ summary: 'Get public restaurant menu grouped by category' })
  async getMenu(
    @CurrentTenant('organizationId') organizationId: number | null,
    @CurrentTenant('companyId') companyId: number | null,
    @Query('storeId') storeId?: string,
  ) {
    return this.buildMenu(organizationId, companyId, storeId);
  }

  private async buildMenu(
    organizationId: number | null,
    companyId: number | null,
    storeId?: string,
  ) {
    const where: Record<string, unknown> = {
      status: { in: ['ACTIVE', 'Activo', 'activo'] },
    };

    if (companyId) {
      where.companyId = companyId;
    } else if (organizationId) {
      where.organizationId = organizationId;
    }

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

    // Load menu config
    let config: Awaited<ReturnType<MenuConfigService['getConfig']>>['data'] | null = null;
    try {
      const result = await this.menuConfigService.getConfig(organizationId, companyId);
      config = result.data;
    } catch {
      // non-critical — proceed without config
    }

    const hiddenIds = new Set(config?.hiddenProductIds ?? []);
    const overrides = (config?.productOverrides ?? {}) as Record<
      string,
      { menuDescription?: string; menuPrice?: number; featured?: boolean }
    >;

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
          featured: boolean;
        }>;
      }
    > = {};

    for (const product of products) {
      // Skip hidden products
      if (hiddenIds.has(product.id)) continue;

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

      // Apply product overrides from menu config
      const override = overrides[String(product.id)];
      const description = override?.menuDescription ?? product.description;
      const price = override?.menuPrice ?? product.priceSell ?? product.price;
      const featured = override?.featured ?? false;

      grouped[catName].items.push({
        id: product.id,
        name: product.name,
        description,
        price,
        image: product.image,
        images: product.images ?? [],
        available,
        prepTime,
        kitchenStation,
        featured,
      });
    }

    // Apply category config (ordering, visibility, display names)
    let categories = Object.values(grouped);
    const catConfig = (config?.categories ?? []) as Array<{
      categoryId: number;
      visible?: boolean;
      displayOrder?: number;
      displayName?: string | null;
    }>;

    if (catConfig.length > 0) {
      const catMap = new Map(catConfig.map((c) => [c.categoryId, c]));

      // Filter hidden categories
      categories = categories.filter((cat) => {
        const cc = catMap.get(cat.categoryId);
        return cc ? cc.visible !== false : true;
      });

      // Apply display names
      for (const cat of categories) {
        const cc = catMap.get(cat.categoryId);
        if (cc?.displayName) {
          cat.categoryName = cc.displayName;
        }
      }

      // Sort by displayOrder
      categories.sort((a, b) => {
        const orderA = catMap.get(a.categoryId)?.displayOrder ?? 999;
        const orderB = catMap.get(b.categoryId)?.displayOrder ?? 999;
        return orderA - orderB;
      });
    }

    return {
      branding: config
        ? {
            restaurantName: config.branding?.restaurantName || null,
            description: config.branding?.description || null,
            logoUrl: config.branding?.logoUrl || null,
            bannerUrl: config.branding?.bannerUrl || null,
            showSearch: config.branding?.showSearch ?? true,
          }
        : null,
      appearance: config
        ? {
            theme: config.appearance?.theme || 'dark',
            primaryColor: config.appearance?.primaryColor || '#34d399',
            backgroundColor: config.appearance?.backgroundColor || '#0a0a0a',
            textColor: config.appearance?.textColor || '#ffffff',
            menuStyle: config.appearance?.menuStyle || 'elegante',
          }
        : null,
      hours: config?.hours ?? null,
      contact: config?.contact ?? null,
      socialLinks: config?.socialLinks ?? null,
      categories,
      total: categories.reduce((sum, cat) => sum + cat.items.length, 0),
    };
  }
}
