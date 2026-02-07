import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
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
  constructor(
    private prismaService: PrismaService,
    private categoryService: CategoryService,
    private brandsService: BrandsService,
    private tenantContext: TenantContextService,
    private verticalConfigService: VerticalConfigService,
  ) {}

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
    const normalizedStatus = this.normalizeStatus(status);
    const normalizedFeatures = this.sanitizeFeatureInputs(features);
    const schemaResolution = await this.resolveCreateSchemaState(
      ctx.organizationId ?? null,
      ctx.companyId ?? null,
      extraAttributes,
    );

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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${createProductDto.name}" ya existe en esta organizacion.`,
        );
      }
      throw error;
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
  }

  async findAll(filters?: { migrationStatus?: 'legacy' | 'migrated' }) {
    const where: Prisma.ProductWhereInput = {
      ...this.orgFilter(),
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
  }

  async findOne(id: number) {
    if (!id || typeof id !== 'number') {
      throw new BadRequestException('El ID proporcionado no es valido.');
    }
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
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const ctx = this.tenantContext.getContext();
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

    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      }

      const productFound = await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: Number(id) },
          data: {
            ...data,
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductDto.name}" ya existe en esta organizacion.`,
        );
      }
      throw error;
    }
  }

  async updateProductVerticalMigration(
    id: number,
    extraAttributes: Record<string, unknown>,
    markMigrated = false,
  ) {
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

    return this.prismaService.product.update({
      where: { id },
      data: {
        extraAttributes:
          resolution.extraAttributes === null
            ? Prisma.JsonNull
            : resolution.extraAttributes,
        isVerticalMigrated: markMigrated || resolution.isVerticalMigrated,
      },
    });
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Uno o mas productos no fueron encontrados.',
        );
      }
      throw new InternalServerErrorException(
        'Hubo un error al actualizar los productos.',
      );
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    const deleted = await this.prismaService.product.deleteMany({
      where: { id, ...this.orgFilter() },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return { id, deleted: true };
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs validos para eliminar.',
      );
    }
    const numericIds = ids.map((id) => Number(id));

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
  }

  async findByBarcode(code: string) {
    return this.prismaService.product.findFirst({
      where: { OR: [{ barcode: code }, { qrCode: code }], ...this.orgFilter() },
    });
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
  }
}
