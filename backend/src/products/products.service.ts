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

@Injectable()
export class ProductsService {
  constructor(
    private prismaService: PrismaService,
    private categoryService: CategoryService,
    private brandsService: BrandsService,
    private tenantContext: TenantContextService,
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
        return { title, ...(icon ? { icon } : {}), ...(description ? { description } : {}) };
      })
      .filter((f): f is { title: string; icon?: string; description?: string } => f !== null);
    return sanitized;
  }

  /** FILTRO por organización (no por compañía) */
  private orgFilter() {
    const orgId = this.tenantContext.getContext().organizationId ?? null;
    return { organizationId: orgId } as const;
  }

  async create(createProductDto: CreateProductDto) {
    const { specification, images, features, brandId, brand, status, categoryId, ...data } =
      createProductDto as any;

    const ctx = this.tenantContext.getContext();
    const normalizedStatus = this.normalizeStatus(status);
    const normalizedFeatures = this.sanitizeFeatureInputs(features);

    // Verificar categoría en esta organización (si viene)
    if (typeof categoryId === 'number') {
      const cat = await this.prismaService.category.findFirst({
        where: { id: categoryId, organizationId: ctx.organizationId ?? null },
      });
      if (!cat) {
        throw new BadRequestException('La categoría no pertenece a tu organización.');
      }
    }

    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      } else if (brandId) {
        brandEntity = await this.prismaService.brand.findUnique({ where: { id: brandId } });
      }

      const createdProduct = await this.prismaService.product.create({
        data: {
          ...data,
          status: normalizedStatus,
          organizationId: ctx.organizationId,    // identidad
          companyId: ctx.companyId ?? null,      // trazabilidad (no filtra lecturas)
          categoryId: categoryId ?? undefined,
          brandId: brandEntity ? brandEntity.id : (brandId ?? undefined),
          brandName: brandEntity ? brandEntity.name : undefined,
          images: images ?? [],
          specification: specification ? { create: specification } : undefined,
          features: normalizedFeatures?.length ? { create: normalizedFeatures } : undefined,
        },
        include: {
          specification: true,
          features: true,
          brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
        },
      });

      return { ...createdProduct, brand: this.mapBrand(createdProduct.brand) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // @@unique([organizationId, name]) en el schema
        throw new ConflictException(
          `El producto con el nombre "${createProductDto.name}" ya existe en esta organización.`,
        );
      }
      throw error;
    }
  }

  async verifyOrCreateProducts(
    products: { name: string; price: number; description?: string; brandId?: number; categoryId?: number }[],
  ) {
    const ctx = this.tenantContext.getContext();
    const createdProducts: any[] = [];
    const defaultCategory = await this.categoryService.verifyOrCreateDefaultCategory(); // ya scoped por organización

    for (const p of products) {
      // Buscar por ORGANIZACIÓN (compartido entre compañías)
      const existing = await this.prismaService.product.findFirst({
        where: { name: p.name, organizationId: ctx.organizationId ?? null },
      });

      if (!existing) {
        // Validar categoría dentro de la organización
        const categoryIdToUse = p.categoryId ?? defaultCategory.id;
        const cat = await this.prismaService.category.findFirst({
          where: { id: categoryIdToUse, organizationId: ctx.organizationId ?? null },
        });
        if (!cat) {
          throw new NotFoundException(`La categoría ${categoryIdToUse} no existe en tu organización.`);
        }

        const newProduct = await this.prismaService.product.create({
          data: {
            name: p.name,
            price: p.price,
            description: p.description || '',
            brandId: p.brandId ?? null,
            categoryId: categoryIdToUse,
            organizationId: ctx.organizationId ?? null, // identidad
            companyId: ctx.companyId ?? null,           // trazabilidad
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

  async findAll() {
    // Sólo por organización (compartido entre compañías)
    const products = await this.prismaService.product.findMany({
      where: this.orgFilter(),
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
      throw new BadRequestException('El ID proporcionado no es válido.');
    }
    const product = await this.prismaService.product.findFirst({
      where: { id, ...this.orgFilter() }, // validar pertenencia a la organización
      include: {
        category: true,
        specification: true,
        features: true,
        brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
      },
    });
    if (!product) throw new NotFoundException(`Product with id ${id} not found`);
    return { ...product, brand: this.mapBrand(product.brand) };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { specification, images, features, brandId, brand, status, categoryId, ...data } =
      updateProductDto as any;

    // Asegura que pertenece a la organización
    const existing = await this.findOne(id);

    // Validar categoría (si se envía) pertenece a la organización
    if (typeof categoryId === 'number') {
      const cat = await this.prismaService.category.findFirst({
        where: { id: categoryId, ...this.orgFilter() },
      });
      if (!cat) throw new BadRequestException('La categoría no pertenece a tu organización.');
    }

    const normalizedStatus = status !== undefined ? this.normalizeStatus(status) : undefined;
    const normalizedFeatures = this.sanitizeFeatureInputs(features);

    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      }

      const productFound = await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id: Number(id) }, // pertenencia ya validada
          data: {
            ...data,
            ...(categoryId !== undefined ? { categoryId } : {}),
            ...(normalizedStatus !== undefined ? { status: normalizedStatus } : {}),
            brandId: brandEntity ? brandEntity.id : (brandId ?? undefined),
            brandName: brandEntity ? brandEntity.name : undefined,
            images: images ?? undefined,
            specification: specification
              ? { upsert: { create: specification, update: specification } }
              : undefined,
          },
        });

        if (normalizedFeatures !== undefined) {
          await tx.productFeature.deleteMany({ where: { productId: updated.id } });
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
            brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
            category: { select: { name: true } },
          },
        });
      });

      if (!productFound) throw new NotFoundException(`Product with id ${id} not found`);
      return { ...productFound, brand: this.mapBrand(productFound.brand) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // @@unique([organizationId, name])
        throw new ConflictException(
          `El producto con el nombre "${updateProductDto.name}" ya existe en esta organización.`,
        );
      }
      throw error;
    }
  }

  async updateMany(products: UpdateProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('No se proporcionaron productos para actualizar.');
    }

    try {
      const invalid = products.filter((p) => !p.id || isNaN(Number(p.id)));
      if (invalid.length) {
        throw new BadRequestException('Todos los productos deben tener un ID válido.');
      }

      // Verificar pertenencia a la organización
      const ids = products.map((p) => Number(p.id));
      const existing = await this.prismaService.product.findMany({
        where: { id: { in: ids }, ...this.orgFilter() },
        select: { id: true },
      });
      if (existing.length !== ids.length) {
        throw new NotFoundException('Uno o más productos no pertenecen a tu organización.');
      }

      const updated = await this.prismaService.$transaction(
        products.map((p) => {
          const normalizedStatus =
            typeof p.status === 'string' ? this.normalizeStatus(p.status) : undefined;
          return this.prismaService.product.update({
            where: { id: Number(p.id) },
            data: {
              price: p.price,
              priceSell: p.priceSell,
              ...(normalizedStatus !== undefined ? { status: normalizedStatus } : {}),
              name: p.name,
              description: p.description,
              brandId: p.brandId,
              ...(typeof p.categoryId === 'number' ? { categoryId: p.categoryId } : {}),
            },
          });
        }),
      );

      return { message: `${updated.length} producto(s) actualizado(s) correctamente.`, updatedProducts: updated };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Uno o más productos no fueron encontrados.');
      }
      throw new InternalServerErrorException('Hubo un error al actualizar los productos.');
    }
  }

  async remove(id: number) {
    // Verificar pertenencia a la organización
    await this.findOne(id);

    const deleted = await this.prismaService.product.deleteMany({
      where: { id, ...this.orgFilter() }, // sólo si pertenece a la org
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return { id, deleted: true };
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
    const numericIds = ids.map((id) => Number(id));

    const deleted = await this.prismaService.product.deleteMany({
      where: { id: { in: numericIds }, ...this.orgFilter() },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(
        'No se encontraron productos con los IDs proporcionados en tu organización.',
      );
    }

    return { message: `${deleted.count} producto(s) eliminado(s) correctamente.` };
  }

  async findByBarcode(code: string) {
    return this.prismaService.product.findFirst({
      where: { OR: [{ barcode: code }, { qrCode: code }], ...this.orgFilter() },
    });
  }
}
