import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Category } from '@prisma/client'; // Importa el tipo generado por Prisma

@Injectable()
export class CategoryService {
  
  constructor(private prismaService: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try{
      return await this.prismaService.category.create({
        data: createCategoryDto
      })   
    }
    catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            throw new ConflictException(
              `La categoria con el nombre "${createCategoryDto.name}" ya existe.`
            );
          }
          console.error("Error en el backend:", error);
          throw error;
    }
  }

  async verifyOrCreateDefaultCategory() {
    const defaultCategoryName = "Sin categoria";
  
    // Verificar si la categoría ya existe
    let category = await this.prismaService.category.findUnique({
      where: { name: defaultCategoryName },
    });
  
    // Si no existe, crearla
    if (!category) {
      category = await this.prismaService.category.create({
        data: { name: defaultCategoryName },
      });
    }
  
    return category;
  }

  async verifyCategories(categories: { name: string }[]): Promise<Category[]> {
    const verifiedCategories: Category[] = [];
    for (const category of categories) {
      const existingCategory = await this.prismaService.category.findUnique({
        where: { name: category.name },
      });
  
      if (existingCategory) {
        verifiedCategories.push(existingCategory);
      }
    }
    return verifiedCategories;
  }

  findAll() {
     return this.prismaService.category.findMany({
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {

    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const productFound = await this.prismaService.category.findUnique({ // NO OLVIDAR EL AWAIT O ASYNC CON FUNCIONES
      where: {id: id,},
    })

    if(!productFound){
      throw new NotFoundException(`Categoria with id ${id} not found`)
    }

    return productFound;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    try{
      const categoryFound = await this.prismaService.category.update({
        where: {id: Number(id)},  
        data: updateCategoryDto
      })

      if(!categoryFound){
        throw new NotFoundException(`Category with id ${id} not found`)
      }
      return categoryFound;
    }
    catch (error) {
      if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
      ) {
          throw new ConflictException(
          `El producto con el nombre "${updateCategoryDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }
  }

  async remove(id: number) {

    // Verificar si la categoría tiene productos relacionados
    const relatedProducts = await this.prismaService.product.findMany({
      where: { categoryId: id },
    });

    if (relatedProducts.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría con ID ${id} porque tiene productos relacionados.`
      );
    }
    // Proceder con la eliminación si no hay productos relacionados
      const deteledCategory = this.prismaService.category.delete({
      where:{
        id
      }
    })

    if(!deteledCategory){
      throw new NotFoundException(`Categoria with id ${id} not found`)
    }

    return deteledCategory;
  }

  async removes(ids: number[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }

    // Verificar si alguna de las categorías tiene productos relacionados
    const relatedProducts = await this.prismaService.product.findMany({
      where: {
        categoryId: {
          in: ids,
        },
      },
    });

    if (relatedProducts.length > 0) {
      throw new ConflictException(
        `No se pueden eliminar las categorías porque algunas tienen productos relacionados.`
      );
    }
  
    // Proceder con la eliminación si no hay productos relacionados
    try {
      const deletedCategories = await this.prismaService.category.deleteMany({
        where: {
          id: {
            in: ids, // Elimina todos los productos cuyos IDs estén en este array
          },
        },
      });
  
      if (deletedCategories.count === 0) {
        throw new NotFoundException('No se encontraron categorias con los IDs proporcionados.');
      }
  
      return {
        message: `${deletedCategories.count} categoria(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      throw new InternalServerErrorException('Hubo un error al eliminar los productos.');
    }
  }
}
