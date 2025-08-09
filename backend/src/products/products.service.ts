import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma, Brand } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';
import { BrandsService } from 'src/brands/brands.service';

@Injectable()
export class ProductsService {
  
  constructor(
    private prismaService: PrismaService,
    private categoryService: CategoryService, // Cambiado a PrismaService
    private brandsService: BrandsService,
  ) {}

  private mapBrand(brand: string | null) {
    if (!brand) return null;
    const slug = brand.trim().toLowerCase();
    return {
      name: brand,
      logoSvg: `/assets/logos/${slug}.svg`,
      logoPng: `/assets/logos/${slug}.png`,
    };
  }

  async create(createProductDto: CreateProductDto) {
    const { specification, images, features, brandId, brand, ...data } =
      createProductDto as any;
    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      } else if (brandId) {
        brandEntity = await this.prismaService.brand.findUnique({
          where: { id: brandId },
        });
      }
      return await this.prismaService.product.create({
        data: {
          ...data,
          brandId: brandEntity ? brandEntity.id : brandId ?? undefined,
          brandName: brandEntity ? brandEntity.name : undefined,
          images: images ?? [],
          specification: specification ? { create: specification } : undefined,
          features: features ? { createMany: { data: features } } : undefined,
        },
        include: {
          specification: true,
          features: true,
          brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El producto con el nombre "${createProductDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  async verifyOrCreateProducts(
    products: {
      name: string
      price: number
      description?: string
      brandId?: number
      categoryId?: number
    }[],
  ) {
    const createdProducts: {
      name: string;
      id: number;
      description: string | null;
      price: number;
      priceSell: number | null;
      status: string | null;
      images: string[];
      createdAt: Date;
      updatedAt: Date;
      categoryId: number;
    }[] = [];
    const defaultCategory = await this.categoryService.verifyOrCreateDefaultCategory();
  
    for (const product of products) {
      // Verificar si el producto ya existe
      let existingProduct = await this.prismaService.product.findUnique({
        where: { name: product.name },
      });
  
      if (!existingProduct) {

        // Verificar que la categoría exista
        const category = await this.prismaService.category.findUnique({
          where: { id: product.categoryId || defaultCategory.id }, // Usa una categoría predeterminada si no se proporciona
        });

        if (!category) {
          throw new NotFoundException(`La categoría con ID ${product.categoryId || defaultCategory.id} no existe.`);
        }
        // Crear el producto si no existe
        const newProduct = await this.prismaService.product.create({
          data: {
            name: product.name,
            price: product.price,
            description: product.description || '',
            brandId: product.brandId || null,
            categoryId: product.categoryId || defaultCategory.id,
            images: [],
          },
        });
        createdProducts.push(newProduct);
      }
      else {
        createdProducts.push(existingProduct);
      }
    }
  
    console.log("Productos creados/verificados:", createdProducts);
    return createdProducts;
  }

  async findAll() {
    const products = await this.prismaService.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        priceSell: true,
        description: true,
        brand: true,
        status: true,
        createdAt: true,
        images: true,
        categoryId: true,
        category: {
          select: {
            name: true, // 👈 solo si necesitas mostrar el nombre de la categoría
          },
        },
        specification: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return products.map((p) => ({
      ...p,
      brand: this.mapBrand(p.brand?.name ?? null),
    }));
  }

  async findOne(id: number) {

    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const productFound = await this.prismaService.product.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
      where: {id: id,},
      include: {
        category: true, // Incluye la relación con la categoría
        specification: true,
        features: true,
        brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
      },
    })

    if(!productFound){
      throw new NotFoundException(`Product with id ${id} not found`)
    }

    return { ...productFound, brand: this.mapBrand(productFound.brand?.name ?? null) };
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { specification, images, features, brandId, brand, ...data } =
      updateProductDto as any;
    try {
      let brandEntity: Brand | null = null;
      if (!brandId && brand) {
        brandEntity = await this.brandsService.findOrCreateByName(brand);
      }
      const productFound = await this.prismaService.product.update({
        where: { id: Number(id) },
        data: {
          ...data,
          brandId: brandEntity ? brandEntity.id : brandId ?? undefined,
          brandName: brandEntity ? brandEntity.name : undefined,
          images: images ?? undefined,
          specification: specification
            ? { upsert: { create: specification, update: specification } }
            : undefined,
        },
        include: {
          specification: true,
          features: true,
          brand: { select: { id: true, name: true, logoSvg: true, logoPng: true } },
        },
      });

      if (!productFound) {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
  
      return productFound;
    } catch (error){
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El producto con el nombre "${updateProductDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }    
  }

  async updateMany(products: UpdateProductDto[]) {
    if (!Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('No se proporcionaron productos para actualizar.');
    }
  
    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProducts = products.filter((product) => !product.id || isNaN(Number(product.id)));
      if (invalidProducts.length > 0) {
        throw new BadRequestException('Todos los productos deben tener un ID válido.');
      }
  
      // Ejecutar la transacción para actualizar múltiples productos
      const updatedProducts = await this.prismaService.$transaction(
        products.map((product) =>
          this.prismaService.product.update({
            where: { id: Number(product.id) },
            data: {             
              price: product.price,
              priceSell: product.priceSell,
              status: product.status,
              name: product.name,
              description: product.description,
              brandId: product.brandId,
            },
          })
        )
      );
  
      return {
        message: `${updatedProducts.length} producto(s) actualizado(s) correctamente.`,
        updatedProducts,
      };
    } catch (error) {
      console.error('Error al actualizar productos:', error);
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Uno o más productos no fueron encontrados.');
        }
      }
  
      throw new InternalServerErrorException('Hubo un error al actualizar los productos.');
    }
  }

  async remove(id: number) {
      const deletedProduct = this.prismaService.product.delete({
      where:{
        id
      }
    })

    if(!deletedProduct){
      throw new NotFoundException(`Product with id ${id} not found`)
    }

    return deletedProduct;
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
  
    try {

      // Convertir los IDs a números
      const numericIds = ids.map((id) => Number(id));

      const deletedProducts = await this.prismaService.product.deleteMany({
        where: {
          id: {
            in: numericIds, // Elimina todos los productos cuyos IDs estén en este array
          },
        },
      });
  
      if (deletedProducts.count === 0) {
        throw new NotFoundException('No se encontraron productos con los IDs proporcionados.');
      }
        
      return {
        message: `${deletedProducts.count} producto(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      console.error("Error en el backend:", error);
      throw new InternalServerErrorException('Hubo un error al eliminar los productos.');     
    }
  }

  async findByBarcode(code: string) {
    return this.prismaService.product.findFirst({
      where: {
        OR: [
          { barcode: code },
          { qrCode: code },
        ],
        // Puedes omitir el OR si solo usas uno de esos campos
      },
    })
  }
}
