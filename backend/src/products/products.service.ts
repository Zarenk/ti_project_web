import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProductDto,
  ProductFeatureInput,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, Brand } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { BrandsService } from 'src/brands/brands.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { BusinessVertical } from 'src/types/business-vertical.enum';
import { VerticalProductSchema } from 'src/config/verticals.config';
import { handlePrismaError } from 'src/common/errors/prisma-error.handler';
import { EntriesService } from 'src/entries/entries.service';

interface VerticalSchemaState {
  vertical: BusinessVertical;
  enforceSchema: boolean;
  schema: VerticalProductSchema | null;
}

interface SchemaResolution {
  extraAttributes: Prisma.InputJsonValue | null;
  isVerticalMigrated: boolean;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prismaService: PrismaService,
    private categoryService: CategoryService,
    private brandsService: BrandsService,
    private tenantContext: TenantContextService,
    private verticalConfigService: VerticalConfigService,
    private entriesService: EntriesService,
  ) {}

  private async ensureProductsFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfigService.getConfig(companyId);
    if (config.features.inventory === false) {
      throw new ForbiddenException(
        'El modulo de productos/inventario no esta habilitado para esta empresa.',
      );
    }
  }

  /** Helpers */
  private mapBrand(brand: Pick<Brand, 'name' | 'logoSvg' | 'logoPng'> | null) {
    if (!brand) return null;
    const name = brand.name?.trim();
    if (!name) return null;
    const slug = name.toLowerCase();
    return {
      name,
      logoSvg: brand.logoSvg ?? `/assets/logos/${slug}.svg`,
      logoPng: brand.logoPng ?? `/assets/logos/${slug}.png`,
    };
  }

  private normalizeStatus(status?: string | null) {
    if (!status) return 'Activo';
    const normalized = status.trim().toLowerCase();
    return normalized === 'inactivo' || normalized === 'inactive'
      ? 'Inactivo'
      : 'Activo';
  }

  private sanitizeFeatureInputs(features?: ProductFeatureInput[] | null) {
    if (!Array.isArray(features)) return undefined;
    const sanitized = features
      .map((f) => {
        const title = f?.title?.trim() ?? '';
        if (!title) return null;
        const icon = f?.icon?.trim();
        const description = f?.description?.trim();
        return {
          title,
          ...(icon ? { icon } : {}),
          ...(description ? { description } : {}),
        };
      })
      .filter(
        (f): f is { title: string; icon?: string; description?: string } =>
          f !== null,
      );
    return sanitized;
  }

  private orgFilter() {
    const orgId = this.tenantContext.getContext().organizationId ?? null;
    return { organizationId: orgId } as const;
  }

  async create(createProductDto: CreateProductDto) {
    const {
      specification,
      images,
      features,
      brandId,
      brand,
      status,
      categoryId,
      extraAttributes,
      isVerticalMigrated,
      ...data
    } = createProductDto as any;

    const ctx = this.tenantContext.getContext();

    // Validate products/inventory feature is enabled
    await this.ensureProductsFeatureEnabled(ctx.companyId);

    const trimmedName = String(createProductDto?.name ?? '').trim();
    if (!trimmedName) {
      throw new BadRequestException('El nombre del producto es obligatorio.');
    }
    if (!ctx.organizationId) {
      throw new BadRequestException('Organizacion no definida para el producto.');
    }
    const normalizedStatus = this.normalizeStatus(status);
    const normalizedFeatures = this.sanitizeFeatureInputs(features);
    const schemaResolution = await this.resolveCreateSchemaState(
      ctx.organizationId ?? null,
      ctx.companyId ?? null,
      extraAttributes,
    );
    const normalizedPrice = Number(data?.price);
    if (!Number.isFinite(normalizedPrice)) {
      throw new BadRequestException('El precio de compra es invalido.');
    }
    const hasPriceSell =
      Object.prototype.hasOwnProperty.call(data ?? {}, 'priceSell') &&
      data?.priceSell !== null &&
      data?.priceSell !== undefined;
    const normalizedPriceSell = hasPriceSell
      ? Number(data?.priceSell)
      : undefined;
    if (hasPriceSell && !Number.isFinite(normalizedPriceSell)) {
      throw new BadRequestException('El precio de venta es invalido.');
    }

    if (typeof categoryId === 'number') {
      const cat = await this.prismaService.category.findFirst({
        where: { id: categoryId, organizationId: ctx.organizationId ?? null },
      });
      if (!cat) {
        throw new BadRequestException(
          'La categoria no pertenece a tu organizacion.',
        );
      }
    }

    try {
      const existingByName = await this.prismaService.product.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: { equals: trimmedName, mode: 'insensitive' },
        },
      });
      if (existingByName) {
        throw new ConflictException(
          `El producto con el nombre "${trimmedName}" ya existe en esta organizacion.`,
        );
      }
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      } else if (brandId) {
        brandEntity = await this.prismaService.brand.findUnique({
          where: { id: brandId },
        });
      }

      const createdProduct = await this.prismaService.product.create({
        data: {
          ...data,
          price: normalizedPrice,
          priceSell: normalizedPriceSell,
          name: trimmedName,
          extraAttributes: schemaResolution.extraAttributes,
          isVerticalMigrated: schemaResolution.isVerticalMigrated,
          status: normalizedStatus,
          organizationId: ctx.organizationId,
          companyId: ctx.companyId ?? null,
          categoryId: categoryId ?? undefined,
          brandId: brandEntity ? brandEntity.id : (brandId ?? undefined),
          brandName: brandEntity ? brandEntity.name : undefined,
          images: images ?? [],
          specification: specification ? { create: specification } : undefined,
          features: normalizedFeatures?.length
            ? { create: normalizedFeatures }
            : undefined,
        },
        include: {
          specification: true,
          features: true,
          brand: {
            select: { id: true, name: true, logoSvg: true, logoPng: true },
          },
        },
      });

      return { ...createdProduct, brand: this.mapBrand(createdProduct.brand) };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${createProductDto.name}" ya existe en esta organizacion.`,
        );
      }
      handlePrismaError(error);
    }
  }

  /**
   * Atomically creates a product and registers initial stock via an entry.
   * If the entry creation fails, the product is rolled back (deleted).
   */
  async createWithInitialStock(
    createProductDto: CreateProductDto,
    stockData: {
      storeId: number;
      userId: number;
      providerId: number;
      quantity: number;
      price: number;
      priceInSoles: number;
      tipoMoneda?: string;
      referenceId?: string;
      series?: string[];
    },
    organizationIdFromContext?: number | null,
  ) {
    const product = await this.create(createProductDto);
    try {
      const entry = await this.entriesService.createEntry(
        {
          storeId: stockData.storeId,
          userId: stockData.userId,
          providerId: stockData.providerId,
          date: new Date(),
          description: 'Stock inicial',
          tipoMoneda: stockData.tipoMoneda ?? 'PEN',
          details: [
            {
              productId: product.id,
              quantity: stockData.quantity,
              price: stockData.price,
              priceInSoles: stockData.priceInSoles,
              series: stockData.series,
            },
          ],
          referenceId:
            stockData.referenceId ??
            `initial-stock:${product.id}:${Date.now()}`,
        },
        organizationIdFromContext,
      );
      return { product, entry, stockCreated: true };
    } catch (error) {
      this.logger.warn(
        `Entry creation failed for product ${product.id}, rolling back product.`,
      );
      try {
        await this.prismaService.product.delete({
          where: { id: product.id },
        });
      } catch (deleteError) {
        this.logger.error(
          `Failed to rollback product ${product.id}: ${deleteError}`,
        );
      }
      if (error instanceof HttpException) throw error;
      handlePrismaError(error);
    }
  }

  async verifyOrCreateProducts(
    products: {
      name: string;
      price: number;
      description?: string;
      brandId?: number;
      categoryId?: number;
    }[],
  ) {
    try {
      const ctx = this.tenantContext.getContext();
      const createdProducts: any[] = [];
      const defaultCategory =
        await this.categoryService.verifyOrCreateDefaultCategory();

      for (const p of products) {
        const existing = await this.prismaService.product.findFirst({
          where: { name: p.name, organizationId: ctx.organizationId ?? null },
        });

        if (!existing) {
          const categoryIdToUse = p.categoryId ?? defaultCategory.id;
          const cat = await this.prismaService.category.findFirst({
            where: {
              id: categoryIdToUse,
              organizationId: ctx.organizationId ?? null,
            },
          });
          if (!cat) {
            throw new NotFoundException(
              `La categoria ${categoryIdToUse} no existe en tu organizacion.`,
            );
          }

          const newProduct = await this.prismaService.product.create({
            data: {
              name: p.name,
              price: p.price,
              description: p.description || '',
              brandId: p.brandId ?? null,
              categoryId: categoryIdToUse,
              organizationId: ctx.organizationId ?? null,
              companyId: ctx.companyId ?? null,
              images: [],
              status: 'Activo',
            },
          });
          createdProducts.push(newProduct);
        } else {
          createdProducts.push(existing);
        }
      }

      return createdProducts;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findAll(filters?: { migrationStatus?: 'legacy' | 'migrated' }) {
    try {
      // Validate products/inventory feature is enabled
      const ctx = this.tenantContext.getContext();
      await this.ensureProductsFeatureEnabled(ctx.companyId);

      const orgId = ctx.organizationId ?? null;
      if (orgId === null) {
        return [];
      }

      const where: Prisma.ProductWhereInput = {
        organizationId: orgId,
      };

      if (filters?.migrationStatus === 'legacy') {
        where.OR = [
          { extraAttributes: { equals: Prisma.JsonNull } },
          { isVerticalMigrated: false },
        ];
      } else if (filters?.migrationStatus === 'migrated') {
        where.AND = [
          { extraAttributes: { not: Prisma.JsonNull } },
          { isVerticalMigrated: true },
        ];
      }

      const products = await this.prismaService.product.findMany({
        where,
        include: {
          specification: true,
          features: true,
          brand: true,
          category: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return products.map((p) => ({ ...p, brand: this.mapBrand(p.brand) }));
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findOne(id: number) {
    if (!id || typeof id !== 'number') {
      throw new BadRequestException('El ID proporcionado no es valido.');
    }

    // Validate products/inventory feature is enabled
    const ctx = this.tenantContext.getContext();
    await this.ensureProductsFeatureEnabled(ctx.companyId);

    try {
      const product = await this.prismaService.product.findFirst({
        where: { id, ...this.orgFilter() },
        include: {
          category: true,
          specification: true,
          features: true,
          brand: {
            select: { id: true, name: true, logoSvg: true, logoPng: true },
          },
        },
      });
      if (!product)
        throw new NotFoundException(`Product with id ${id} not found`);
      return { ...product, brand: this.mapBrand(product.brand) };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const ctx = this.tenantContext.getContext();

    // Validate products/inventory feature is enabled
    await this.ensureProductsFeatureEnabled(ctx.companyId);

    const {
      specification,
      images,
      features,
      brandId,
      brand,
      status,
      categoryId,
      extraAttributes,
      isVerticalMigrated,
      ...data
    } = updateProductDto as any;

    const existing = await this.findOne(id);

    if (typeof categoryId === 'number') {
      const cat = await this.prismaService.category.findFirst({
        where: { id: categoryId, ...this.orgFilter() },
      });
      if (!cat)
        throw new BadRequestException(
          'La categoria no pertenece a tu organizacion.',
        );
    }

    const normalizedStatus =
      status !== undefined ? this.normalizeStatus(status) : undefined;
    const normalizedFeatures = this.sanitizeFeatureInputs(features);
    const schemaResolution = await this.resolveUpdateSchemaState(
      ctx.organizationId ?? null,
      ctx.companyId ?? null,
      extraAttributes,
      existing.extraAttributes,
      existing.isVerticalMigrated,
    );
    const hasPrice = Object.prototype.hasOwnProperty.call(
      updateProductDto ?? {},
      'price',
    );
    const hasPriceSell = Object.prototype.hasOwnProperty.call(
      updateProductDto ?? {},
      'priceSell',
    );
    const normalizedPrice = hasPrice ? Number(data?.price) : undefined;
    if (hasPrice && !Number.isFinite(normalizedPrice)) {
      throw new BadRequestException('El precio de compra es invalido.');
    }
    const normalizedPriceSell = hasPriceSell ? Number(data?.priceSell) : undefined;
    if (hasPriceSell && !Number.isFinite(normalizedPriceSell)) {
      throw new BadRequestException('El precio de venta es invalido.');
    }

    try {
      if (updateProductDto.name) {
        const nextName = updateProductDto.name.trim();
        if (nextName) {
          const duplicate = await this.prismaService.product.findFirst({
            where: {
              organizationId: ctx.organizationId ?? null,
              name: { equals: nextName, mode: 'insensitive' },
              NOT: { id: Number(id) },
            },
          });
          if (duplicate) {
            throw new ConflictException(
              `El producto con el nombre "${nextName}" ya existe en esta organizacion.`,
            );
          }
        }
      }
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      }

      const productFound = await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: Number(id) },
          data: {
            ...data,
            ...(hasPrice ? { price: normalizedPrice } : {}),
            ...(hasPriceSell ? { priceSell: normalizedPriceSell } : {}),
            extraAttributes: schemaResolution.extraAttributes,
            isVerticalMigrated: schemaResolution.isVerticalMigrated,
            ...(categoryId !== undefined ? { categoryId } : {}),
            ...(normalizedStatus !== undefined
              ? { status: normalizedStatus }
              : {}),
            brandId: brandEntity ? brandEntity.id : (brandId ?? undefined),
            brandName: brandEntity ? brandEntity.name : undefined,
            images: images ?? undefined,
            specification: specification
              ? { upsert: { create: specification, update: specification } }
              : undefined,
          },
        });

        if (normalizedFeatures !== undefined) {
          await tx.productFeature.deleteMany({
            where: { productId: updated.id },
          });
          if (normalizedFeatures.length) {
            await tx.productFeature.createMany({
              data: normalizedFeatures.map((f) => ({
                productId: updated.id,
                title: f.title,
                ...(f.icon ? { icon: f.icon } : {}),
                ...(f.description ? { description: f.description } : {}),
              })),
            });
          }
        }

        return tx.product.findUnique({
          where: { id: updated.id },
          include: {
            specification: true,
            features: true,
            brand: {
              select: { id: true, name: true, logoSvg: true, logoPng: true },
            },
            category: { select: { name: true } },
          },
        });
      });

      if (!productFound)
        throw new NotFoundException(`Product with id ${id} not found`);
      return { ...productFound, brand: this.mapBrand(productFound.brand) };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductDto.name}" ya existe en esta organizacion.`,
        );
      }
      handlePrismaError(error);
    }
  }

  async validateProductName(
    name: string,
    excludeId?: number,
  ): Promise<{ nameAvailable: boolean }> {
    const ctx = this.tenantContext.getContext();
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { nameAvailable: true };
    }
    if (!ctx.organizationId) {
      throw new BadRequestException('Organizacion no definida para el producto.');
    }
    try {
      const existing = await this.prismaService.product.findFirst({
        where: {
          organizationId: ctx.organizationId,
          name: { equals: trimmedName, mode: 'insensitive' },
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      return { nameAvailable: !existing };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateProductVerticalMigration(
    id: number,
    extraAttributes: Record<string, unknown>,
    markMigrated = false,
  ) {
    try {
      const ctx = this.tenantContext.getContext();
      const existing = await this.prismaService.product.findFirst({
        where: { id, ...this.orgFilter() },
      });
      if (!existing) {
        throw new NotFoundException('Producto no encontrado en tu organización.');
      }

      const resolution = await this.resolveUpdateSchemaState(
        ctx.organizationId ?? null,
        ctx.companyId ?? null,
        extraAttributes,
        existing.extraAttributes,
        existing.isVerticalMigrated,
      );

      const updated = await this.prismaService.product.update({
        where: { id },
        data: {
          extraAttributes:
            resolution.extraAttributes === null
              ? Prisma.JsonNull
              : resolution.extraAttributes,
          isVerticalMigrated: markMigrated || resolution.isVerticalMigrated,
        },
      });

      // Sync recipe ingredients from extraAttributes JSON → RecipeItem table
      await this.syncRecipeItems(
        id,
        extraAttributes,
        ctx.organizationId ?? null,
        ctx.companyId ?? null,
      );

      return updated;
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Sync recipe ingredients from extraAttributes JSON to the RecipeItem table.
   * For each ingredient in the JSON, find-or-create the Ingredient record,
   * then upsert the RecipeItem linking productId → ingredientId.
   */
  private async syncRecipeItems(
    productId: number,
    attrs: Record<string, unknown>,
    organizationId: number | null,
    companyId: number | null,
  ): Promise<void> {
    const ingredients = attrs?.ingredients;
    if (!Array.isArray(ingredients) || ingredients.length === 0) return;

    try {
      for (const raw of ingredients) {
        const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
        const quantity = typeof raw?.quantity === 'number' ? raw.quantity : 0;
        const unit = typeof raw?.unit === 'string' ? raw.unit.trim() : 'unidad';

        if (!name) continue;

        // Find or create the Ingredient by name within the same company
        let ingredient = await this.prismaService.ingredient.findFirst({
          where: {
            name: { equals: name, mode: 'insensitive' },
            ...(companyId ? { companyId } : { organizationId }),
          },
        });

        if (!ingredient) {
          ingredient = await this.prismaService.ingredient.create({
            data: {
              name,
              unit,
              stock: 0,
              minStock: 0,
              status: 'ACTIVE',
              organizationId,
              companyId,
            },
          });
          this.logger.log(`Auto-created ingredient "${name}" (id=${ingredient.id})`);
        }

        // Upsert RecipeItem (unique on productId+ingredientId)
        await this.prismaService.recipeItem.upsert({
          where: {
            productId_ingredientId: {
              productId,
              ingredientId: ingredient.id,
            },
          },
          update: { quantity, unit },
          create: {
            productId,
            ingredientId: ingredient.id,
            quantity,
            unit,
            organizationId,
            companyId,
          },
        });
      }

      // Remove RecipeItems that are no longer in the JSON recipe
      const validNames = ingredients
        .map((r: any) => (typeof r?.name === 'string' ? r.name.trim().toLowerCase() : ''))
        .filter(Boolean);

      const existingItems = await this.prismaService.recipeItem.findMany({
        where: { productId },
        include: { ingredient: true },
      });

      for (const item of existingItems) {
        if (!validNames.includes(item.ingredient.name.toLowerCase())) {
          await this.prismaService.recipeItem.delete({
            where: { id: item.id },
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to sync recipe items for product ${productId}: ${err}`);
    }
  }

  async updateMany(products: UpdateProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron productos para actualizar.',
      );
    }

    try {
      const invalid = products.filter((p) => !p.id || isNaN(Number(p.id)));
      if (invalid.length) {
        throw new BadRequestException(
          'Todos los productos deben tener un ID valido.',
        );
      }

      const ids = products.map((p) => Number(p.id));
      const existing = await this.prismaService.product.findMany({
        where: { id: { in: ids }, ...this.orgFilter() },
        select: { id: true },
      });
      if (existing.length !== ids.length) {
        throw new NotFoundException(
          'Uno o mas productos no pertenecen a tu organizacion.',
        );
      }

      const updated = await this.prismaService.$transaction(
        products.map((p) => {
          const normalizedStatus =
            typeof p.status === 'string'
              ? this.normalizeStatus(p.status)
              : undefined;
          return this.prismaService.product.update({
            where: { id: Number(p.id) },
            data: {
              price: p.price,
              priceSell: p.priceSell,
              ...(normalizedStatus !== undefined
                ? { status: normalizedStatus }
                : {}),
              name: p.name,
              description: p.description,
              brandId: p.brandId,
              ...(typeof p.categoryId === 'number'
                ? { categoryId: p.categoryId }
                : {}),
            },
          });
        }),
      );

      return {
        message: `${updated.length} producto(s) actualizado(s) correctamente.`,
        updatedProducts: updated,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Uno o mas productos no fueron encontrados.',
        );
      }
      handlePrismaError(error);
    }
  }

  async remove(id: number) {
    try {
      const product = await this.findOne(id);

      // Pre-validación: detectar relaciones que bloquean la eliminación
      const blocking = await this.checkBlockingRelations([id]);
      if (blocking.length > 0) {
        const reasons = blocking.map((b) => b.reason).join('; ');
        throw new ConflictException(
          `No se puede eliminar el producto "${product.name}": ${reasons}. ` +
            `Debe eliminar o desvincular estos registros primero.`,
        );
      }

      const deleted = await this.prismaService.product.deleteMany({
        where: { id, ...this.orgFilter() },
      });

      if (deleted.count === 0) {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
      return { id, deleted: true };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs validos para eliminar.',
      );
    }
    try {
      const numericIds = ids.map((id) => Number(id));

      // Pre-validación: detectar relaciones que bloquean la eliminación
      const blocking = await this.checkBlockingRelations(numericIds);
      if (blocking.length > 0) {
        const summary = blocking
          .map((b) => `Producto ID ${b.productId}: ${b.reason}`)
          .join('. ');
        throw new ConflictException(
          `No se pueden eliminar algunos productos: ${summary}`,
        );
      }

      const deleted = await this.prismaService.product.deleteMany({
        where: { id: { in: numericIds }, ...this.orgFilter() },
      });

      if (deleted.count === 0) {
        throw new NotFoundException(
          'No se encontraron productos con los IDs proporcionados en tu organizacion.',
        );
      }

      return {
        message: `${deleted.count} producto(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      handlePrismaError(error);
    }
  }

  /**
   * Verifica relaciones que bloquean la eliminación de productos (FK RESTRICT).
   * Retorna un arreglo de { productId, reason } para cada producto bloqueado.
   */
  private async checkBlockingRelations(
    productIds: number[],
  ): Promise<{ productId: number; reason: string }[]> {
    const blocking: { productId: number; reason: string }[] = [];

    // Relaciones con ON DELETE RESTRICT que bloquean la eliminación
    // (ProductFeature, ProductSpecification, Review, Favorite usan CASCADE — no bloquean)
    const [entries, inventory, transfers, restaurantItems] =
      await Promise.all([
        this.prismaService.entryDetail.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _count: true,
        }),
        this.prismaService.inventory.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _count: true,
        }),
        this.prismaService.transfer.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _count: true,
        }),
        this.prismaService.restaurantOrderItem.groupBy({
          by: ['productId'],
          where: { productId: { in: productIds } },
          _count: true,
        }),
      ]);

    // Mapear resultados por productId
    const reasonsMap = new Map<number, string[]>();

    for (const e of entries) {
      const list = reasonsMap.get(e.productId) ?? [];
      list.push(`${e._count} detalle(s) de entrada`);
      reasonsMap.set(e.productId, list);
    }
    for (const i of inventory) {
      const list = reasonsMap.get(i.productId) ?? [];
      list.push(`${i._count} registro(s) de inventario`);
      reasonsMap.set(i.productId, list);
    }
    for (const t of transfers) {
      const list = reasonsMap.get(t.productId) ?? [];
      list.push(`${t._count} transferencia(s)`);
      reasonsMap.set(t.productId, list);
    }
    for (const r of restaurantItems) {
      const list = reasonsMap.get(r.productId) ?? [];
      list.push(`${r._count} orden(es) de restaurante`);
      reasonsMap.set(r.productId, list);
    }

    for (const [productId, reasons] of reasonsMap) {
      blocking.push({
        productId,
        reason: `tiene ${reasons.join(', ')}`,
      });
    }

    return blocking;
  }

  async findByBarcode(code: string, explicitOrganizationId?: number | null) {
    try {
      const orgFilter =
        explicitOrganizationId !== undefined
          ? { organizationId: explicitOrganizationId }
          : this.orgFilter();
      return this.prismaService.product.findFirst({
        where: { OR: [{ barcode: code }, { qrCode: code }], ...orgFilter },
        include: { category: { select: { id: true, name: true } } },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async findOneForBarcode(id: number, explicitOrganizationId?: number | null) {
    try {
      const orgFilter =
        explicitOrganizationId !== undefined
          ? { organizationId: explicitOrganizationId }
          : this.orgFilter();
      return this.prismaService.product.findFirst({
        where: { id, ...orgFilter },
        include: { category: { select: { id: true, name: true } } },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  private async resolveCreateSchemaState(
    _organizationId: number | null,
    companyId: number | null,
    extraAttributes: unknown,
  ): Promise<SchemaResolution> {
    const state = await this.resolveVerticalState(_organizationId, companyId);
    return this.applySchemaRules(state, extraAttributes ?? null, false);
  }

  private async resolveUpdateSchemaState(
    _organizationId: number | null,
    companyId: number | null,
    incomingExtraAttributes: unknown,
    fallbackExtraAttributes: unknown,
    currentMigrated: boolean,
  ): Promise<SchemaResolution> {
    const state = await this.resolveVerticalState(_organizationId, companyId);
    const source =
      incomingExtraAttributes !== undefined
        ? incomingExtraAttributes
        : fallbackExtraAttributes ?? null;
    return this.applySchemaRules(state, source, currentMigrated);
  }

  private async resolveVerticalState(
    organizationId: number | null,
    companyId: number | null,
  ): Promise<VerticalSchemaState> {
    if (!companyId) {
      return {
        vertical: BusinessVertical.GENERAL,
        enforceSchema: false,
        schema: null,
      };
    }
    let config: Awaited<ReturnType<VerticalConfigService["getConfig"]>> | null =
      null;
    try {
      config = await this.verticalConfigService.getConfig(companyId);
    } catch (error) {
      if (organizationId) {
        const fallback = await this.prismaService.company.findFirst({
          where: { organizationId },
          select: { id: true },
          orderBy: { id: "asc" },
        });
        if (fallback?.id) {
          config = await this.verticalConfigService.getConfig(fallback.id);
        }
      }
      if (!config) {
        throw error;
      }
    }
    return {
      vertical: config.name,
      enforceSchema: config.enforcedProductSchema,
      schema: config.productSchema ?? null,
    };
  }

  private applySchemaRules(
    state: VerticalSchemaState,
    rawValue: unknown,
    fallbackMigrated: boolean,
  ): SchemaResolution {
    if (state.vertical !== BusinessVertical.RETAIL) {
      return {
        extraAttributes: (rawValue as Prisma.InputJsonValue) ?? null,
        isVerticalMigrated: fallbackMigrated,
      };
    }

    if (!rawValue && state.enforceSchema) {
      throw new BadRequestException(
        'Este vertical requiere completar los atributos adicionales del producto.',
      );
    }

    if (!rawValue) {
      return {
        extraAttributes: null,
        isVerticalMigrated: false,
      };
    }

    const normalized = state.schema
      ? this.validateExtraAttributes(rawValue, state.schema)
      : this.ensureJsonValue(rawValue);

    return {
      extraAttributes: normalized,
      isVerticalMigrated: true,
    };
  }

  private ensureJsonValue(value: unknown): Prisma.InputJsonValue {
    if (
      value === undefined ||
      value === null ||
      (typeof value !== 'object' && typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
    ) {
      throw new BadRequestException(
        'Los atributos adicionales del producto no son validos.',
      );
    }
    return value as Prisma.InputJsonValue;
  }

  private validateExtraAttributes(
    rawValue: unknown,
    schema: VerticalProductSchema,
  ): Prisma.JsonObject {
    const payload = this.ensureJsonValue(rawValue);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException(
        'Los atributos adicionales del producto no cumplen con el esquema requerido.',
      );
    }
    const normalized: Prisma.JsonObject = {};

    for (const field of schema.fields) {
      const value = payload[field.key];
      const isEmptyString =
        typeof value === 'string' && value.trim().length === 0;
      if ((value === null || value === undefined || isEmptyString) && field.required) {
        throw new BadRequestException(
          `El campo "${field.label}" es obligatorio para productos de este vertical.`,
        );
      }
      if (
        value !== null &&
        value !== undefined &&
        field.options &&
        typeof value === 'string' &&
        !field.options.includes(value)
      ) {
        throw new BadRequestException(
          `El campo "${field.label}" solo admite los valores: ${field.options.join(', ')}.`,
        );
      }
      if (value !== undefined) {
        normalized[field.key] = value;
      }
    }

    return normalized;
  }

  async markProductVerticalMigrated(id: number) {
    try {
      const product = await this.prismaService.product.findFirst({
        where: { id, ...this.orgFilter() },
        select: { id: true, extraAttributes: true, isVerticalMigrated: true },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado en tu organización.');
      }
      if (!product.extraAttributes) {
        throw new BadRequestException(
          'Completa los atributos adicionales antes de marcar el producto como migrado.',
        );
      }

      return this.prismaService.product.update({
        where: { id },
        data: { isVerticalMigrated: true },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
