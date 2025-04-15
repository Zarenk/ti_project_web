import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoryService } from 'src/category/category.service';

@Injectable()
export class ProductsService {
  
  constructor(
    private prismaService: PrismaService,
    private categoryService: CategoryService, // Cambiado a PrismaService
  ) {}

  async create(createProductDto: CreateProductDto) {
    try{
      return await this.prismaService.product.create({
        data: createProductDto
      })   
    }
    catch (error) {
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

  async verifyOrCreateProducts(products: { name: string; price: number; description?: string; categoryId?: number }[]) {
    const createdProducts: {
      name: string;
      id: number;
      description: string | null;
      price: number;
      priceSell: number | null;
      status: string | null;
      image: string | null;
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
            categoryId: product.categoryId || defaultCategory.id,
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

  findAll() {
    return this.prismaService.product.findMany({
      include: {
        category: true,
      },
    })
  }

  async findOne(id: number) {

    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const productFound = await this.prismaService.product.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
      where: {id: id,},
      include: {
        category: true, // Incluye la relación con la categoría
      },
    })

    if(!productFound){
      throw new NotFoundException(`Product with id ${id} not found`)
    }

    return productFound;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    try{
      const productFound = await this.prismaService.product.update({
        where: {id: Number(id)},  
        data: updateProductDto
      })
  
      if(!productFound){
        throw new NotFoundException(`Product with id ${id} not found`)
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
}
