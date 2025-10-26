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
    private tenantContext: TenantContextService, // 👈 INYECTADO
  ) {}

  private mapBrand(brand: Pick<Brand, 'name' | 'logoSvg' | 'logoPng'> | null) {
    if (!brand) return null;
    const name = brand.name?.trim();
    if (!name) return null;

    const slug = name.toLowerCase();
    const fallbackSvg = `/assets/logos/${slug}.svg`;
    const fallbackPng = `/assets/logos/${slug}.png`;
    return {
      name,
      logoSvg: brand.logoSvg ?? fallbackSvg,
      logoPng: brand.logoPng ?? fallbackPng,
    };
  }

  private normalizeStatus(status?: string | null) {
    if (!status) return 'Activo';
    const normalized = status.trim().toLowerCase();
    if (normalized === 'inactivo' || normalized === 'inactive') {
      return 'Inactivo';
    }
    return 'Activo';
  }

  private sanitizeFeatureInputs(features?: ProductFeatureInput[] | null) {
    if (!Array.isArray(features)) {
      return undefined;
    }

    const sanitized = features
      .map((feature) => {
        const title = feature?.title?.trim() ?? '';
        const icon = feature?.icon?.trim();
        const description = feature?.description?.trim();

        if (!title) {
          return null;
        }

        return {
          title,
          ...(icon ? { icon } : {}),
          ...(description ? { description } : {}),
        };
      })
      .filter(
        (
          feature,
        ): feature is { title: string; icon?: string; description?: string } =>
          feature !== null,
      );

    return sanitized;
  }

  async create(createProductDto: CreateProductDto) {
    const { specification, images, features, brandId, brand, status, ...data } =
      createProductDto as any;
    
    // 👇 OBTENER CONTEXTO DEL TENANT
    const context = this.tenantContext.getContext();
    
    const normalizedStatus = this.normalizeStatus(status);
    const normalizedFeatures = this.sanitizeFeatureInputs(features);
    
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
          status: normalizedStatus,
          organizationId: context.organizationId, // 👈 ASIGNAR ORG
          companyId: context.companyId,           // 👈 ASIGNAR COMPANY
          brandId: brandEntity ? brandEntity.id : (brandId ?? undefined),
          brandName: brandEntity ? brandEntity.name : undefined,
          images: images ?? [],
          specification: specification ? { create: specification } : undefined,
          features:
            normalizedFeatures && normalizedFeatures.length
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

      return {
        ...createdProduct,
        brand: this.mapBrand(createdProduct.brand),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${createProductDto.name}" ya existe en esta compañía.`,
        );
      }
      console.error('Error en el backend:', error);
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
    // 👇 OBTENER CONTEXTO DEL TENANT
    const context = this.tenantContext.getContext();
    
    const createdProducts: any[] = [];
    const defaultCategory =
      await this.categoryService.verifyOrCreateDefaultCategory();

    for (const product of products) {
      // 👇 BUSCAR PRODUCTO EN EL CONTEXTO DE LA COMPAÑÍA
      const existingProduct = await this.prismaService.product.findFirst({
        where: { 
          name: product.name,
          organizationId: context.organizationId,
          companyId: context.companyId,
        },
      });

      if (!existingProduct) {
        const category = await this.prismaService.category.findUnique({
          where: { id: product.categoryId || defaultCategory.id },
        });

        if (!category) {
          throw new NotFoundException(
            `La categoría con ID ${product.categoryId || defaultCategory.id} no existe.`,
          );
        }
        
        const newProduct = await this.prismaService.product.create({
          data: {
            name: product.name,
            price: product.price,
            description: product.description || '',
            brandId: product.brandId || null,
            categoryId: product.categoryId || defaultCategory.id,
            organizationId: context.organizationId, // 👈 ASIGNAR ORG
            companyId: context.companyId,           // 👈 ASIGNAR COMPANY
            images: [],
            status: 'Activo',
          },
        });
        createdProducts.push(newProduct);
      } else {
        createdProducts.push(existingProduct);
      }
    }

    console.log('Productos creados/verificados:', createdProducts);
    return createdProducts;
  }

  async findAll() {
    // 👇 APLICAR FILTRO DE TENANT
    const filter = this.tenantContext.buildOrganizationFilter(
      true,  // includeCompany = true
      false, // includeUnit = false
    );

    const products = await this.prismaService.product.findMany({
      where: filter, // 👈 FILTRAR POR ORG Y COMPANY
      include: {
        specification: true,
        features: true,
        brand: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return products.map((p) => ({
      ...p,
      brand: this.mapBrand(p.brand),
    }));
  }

  async findOne(id: number) {
    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    // 👇 APLICAR FILTRO DE TENANT
    const filter = this.tenantContext.buildOrganizationFilter(true, false);

    const productFound = await this.prismaService.product.findFirst({
      where: { 
        id: id,
        ...filter, // 👈 VALIDAR QUE PERTENEZCA AL TENANT
      },
      include: {
        category: true,
        specification: true,
        features: true,
        brand: {
          select: { id: true, name: true, logoSvg: true, logoPng: true },
        },
      },
    });

    if (!productFound) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return { ...productFound, brand: this.mapBrand(productFound.brand) };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { specification, images, features, brandId, brand, status, ...data } =
      updateProductDto as any;
    
    // 👇 VERIFICAR QUE EL PRODUCTO PERTENEZCA AL TENANT
    await this.findOne(id);
    
    const normalizedStatus =
      status !== undefined ? this.normalizeStatus(status) : undefined;
    const normalizedFeatures = this.sanitizeFeatureInputs(features);
    
    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      }
      
      const filter = this.tenantContext.buildOrganizationFilter(true, false);
      
      const productFound = await this.prismaService.$transaction(async (tx) => {
        const updatedProduct = await tx.product.update({
          where: { 
            id: Number(id),
            // Prisma no soporta múltiples where, así que validamos antes
          },
          data: {
            ...data,
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
            where: { productId: updatedProduct.id },
          });

          if (normalizedFeatures.length) {
            await tx.productFeature.createMany({
              data: normalizedFeatures.map((feature) => ({
                productId: updatedProduct.id,
                title: feature.title,
                ...(feature.icon ? { icon: feature.icon } : {}),
                ...(feature.description
                  ? { description: feature.description }
                  : {}),
              })),
            });
          }
        }

        return tx.product.findUnique({
          where: { id: updatedProduct.id },
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

      if (!productFound) {
        throw new NotFoundException(`Product with id ${id} not found`);
      }

      return {
        ...productFound,
        brand: this.mapBrand(productFound.brand),
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductDto.name}" ya existe en esta compañía.`,
        );
      }
      console.error('Error en el backend:', error);
      throw error;
    }
  }

  async updateMany(products: UpdateProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron productos para actualizar.',
      );
    }

    // 👇 VALIDAR QUE TODOS LOS PRODUCTOS PERTENEZCAN AL TENANT
    const filter = this.tenantContext.buildOrganizationFilter(true, false);
    
    try {
      const invalidProducts = products.filter(
        (product) => !product.id || isNaN(Number(product.id)),
      );
      if (invalidProducts.length > 0) {
        throw new BadRequestException(
          'Todos los productos deben tener un ID válido.',
        );
      }

      // Verificar que todos los productos pertenezcan al tenant
      const productIds = products.map((p) => Number(p.id));
      const existingProducts = await this.prismaService.product.findMany({
        where: {
          id: { in: productIds },
          ...filter,
        },
        select: { id: true },
      });

      if (existingProducts.length !== productIds.length) {
        throw new NotFoundException(
          'Uno o más productos no pertenecen a tu compañía.',
        );
      }

      const updatedProducts = await this.prismaService.$transaction(
        products.map((product) => {
          const normalizedStatus =
            typeof product.status === 'string'
              ? this.normalizeStatus(product.status)
              : undefined;

          return this.prismaService.product.update({
            where: { id: Number(product.id) },
            data: {
              price: product.price,
              priceSell: product.priceSell,
              ...(normalizedStatus !== undefined
                ? { status: normalizedStatus }
                : {}),
              name: product.name,
              description: product.description,
              brandId: product.brandId,
            },
          });
        }),
      );

      return {
        message: `${updatedProducts.length} producto(s) actualizado(s) correctamente.`,
        updatedProducts,
      };
    } catch (error) {
      console.error('Error al actualizar productos:', error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'Uno o más productos no fueron encontrados.',
          );
        }
      }

      throw new InternalServerErrorException(
        'Hubo un error al actualizar los productos.',
      );
    }
  }

  async remove(id: number) {
    // 👇 VERIFICAR QUE PERTENEZCA AL TENANT
    await this.findOne(id);
    
    const filter = this.tenantContext.buildOrganizationFilter(true, false);

    const deletedProduct = await this.prismaService.product.deleteMany({
      where: {
        id,
        ...filter, // 👈 SOLO ELIMINAR SI PERTENECE AL TENANT
      },
    });

    if (deletedProduct.count === 0) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return { id, deleted: true };
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }

    // 👇 APLICAR FILTRO DE TENANT
    const filter = this.tenantContext.buildOrganizationFilter(true, false);

    try {
      const numericIds = ids.map((id) => Number(id));

      const deletedProducts = await this.prismaService.product.deleteMany({
        where: {
          id: {
            in: numericIds,
          },
          ...filter, // 👈 SOLO ELIMINAR SI PERTENECEN AL TENANT
        },
      });

      if (deletedProducts.count === 0) {
        throw new NotFoundException(
          'No se encontraron productos con los IDs proporcionados en tu compañía.',
        );
      }

      return {
        message: `${deletedProducts.count} producto(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException(
        'Hubo un error al eliminar los productos.',
      );
    }
  }

  async findByBarcode(code: string) {
    // 👇 APLICAR FILTRO DE TENANT
    const filter = this.tenantContext.buildOrganizationFilter(true, false);
    
    return this.prismaService.product.findFirst({
      where: {
        OR: [{ barcode: code }, { qrCode: code }],
        ...filter, // 👈 BUSCAR SOLO EN LA COMPAÑÍA ACTUAL
      },
    });
  }
}