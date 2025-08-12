import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { Prisma, AuditAction, Category } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';

@Injectable()
export class CategoryService {
  
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, req: Request) {
    try {
      const category = await this.prismaService.category.create({
        data: createCategoryDto,
      });
      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Category',
          entityId: category.id.toString(),
          action: AuditAction.CREATED,
          summary: `Categoría ${category.name} creada`,
        },
        req,
      );
      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La categoria con el nombre "${createCategoryDto.name}" ya existe.`,
        );
      }
      console.error('Error en el backend:', error);
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

  async findAllWithProductCount() {
    const categories = await this.prismaService.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      status: cat.status,
      image: cat.image,
      productCount: cat._count.products,
    }))
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

  async update(id: number, updateCategoryDto: UpdateCategoryDto, req: Request) {
    try {
      const before = await this.prismaService.category.findUnique({
        where: { id: Number(id) },
      });
      const categoryFound = await this.prismaService.category.update({
        where: { id: Number(id) },
        data: updateCategoryDto,
      });

      if(!categoryFound){
        throw new NotFoundException(`Category with id ${id} not found`)
      }

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Category',
          entityId: categoryFound.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Categoría ${categoryFound.name} actualizada`,
          diff: { before, after: categoryFound } as any,
        },
        req,
      );

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

  async remove(id: number, req: Request) {

    // Verificar si la categoría tiene productos relacionados
    const relatedProducts = await this.prismaService.product.findMany({
      where: { categoryId: id },
    });

    if (relatedProducts.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría con ID ${id} porque tiene productos relacionados.`,
      );
    }
    // Proceder con la eliminación si no hay productos relacionados
    const deteledCategory = this.prismaService.category.delete({
      where:{
        id,
      }
    })

    if(!deteledCategory){
      throw new NotFoundException(`Categoria with id ${id} not found`)
    }

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Category',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Categoría ${(await deteledCategory).name} eliminada`,
        diff: { before: deteledCategory } as any,
      },
      req,
    );

    return deteledCategory;
  }

  async removes(ids: number[], req: Request) {
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

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Category',
          entityId: ids.join(','),
          action: AuditAction.DELETED,
          summary: `Categorías eliminadas: ${ids.join(', ')}`,
        },
        req,
      );
  
      return {
        message: `${deletedCategories.count} categoria(s) eliminado(s) correctamente.`,
      };
    } catch (error) {
      throw new InternalServerErrorException('Hubo un error al eliminar los productos.');
    }
  }
}
