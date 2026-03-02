import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { Prisma, AuditAction, Category } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityService } from 'src/activity/activity.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';

@Injectable()
export class CategoryService {
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
    private tenant: TenantContextService, // 👈 NUEVO
  ) {}

  // Utilidad mínima: obtiene el organizationId actual
  private orgId() {
    return this.tenant.getContext().organizationId ?? null;
  }

  async create(createCategoryDto: CreateCategoryDto, req: Request) {
    const ctx = this.tenant.getContext();
    try {
      const category = await this.prismaService.category.create({
        data: {
          ...createCategoryDto,
          organizationId: ctx.organizationId ?? null, // 👈 identidad
          companyId: ctx.companyId ?? null, // 👈 trazabilidad
        },
      });

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Category',
          entityId: category.id.toString(),
          action: AuditAction.CREATED,
          summary: `Categoría ${category.name} creada`,
          // opcional: diff: { after: { ...category, organizationId: ctx.organizationId, companyId: ctx.companyId } } as any,
        },
        req,
      );
      return category;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // Unicidad por organización: @@unique([organizationId, name])
        throw new ConflictException(
          `La categoria con el nombre "${createCategoryDto.name}" ya existe en esta organización.`,
        );
      }
      throw error;
    }
  }

  async verifyOrCreateDefaultCategory() {
    const orgId = this.orgId();
    if (orgId === null) {
      throw new BadRequestException(
        'No se puede resolver la organizacion para la categoria por defecto.',
      );
    }

    const defaultCategoryName = 'Sin categoria';
    const companyId = this.tenant.getContext().companyId ?? null;

    const existing = await this.prismaService.category.findUnique({
      where: {
        organizationId_name: {
          organizationId: orgId,
          name: defaultCategoryName,
        },
      },
    });

    if (existing) {
      if (existing.companyId !== companyId || existing.status !== 'ACTIVE') {
        return this.prismaService.category.update({
          where: {
            organizationId_name: {
              organizationId: orgId,
              name: defaultCategoryName,
            },
          },
          data: {
            companyId,
            status: 'ACTIVE',
          },
        });
      }
      return existing;
    }

    try {
      return await this.prismaService.category.create({
        data: {
          name: defaultCategoryName,
          organizationId: orgId,
          companyId,
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const resolved = await this.prismaService.category.findUnique({
          where: {
            organizationId_name: {
              organizationId: orgId,
              name: defaultCategoryName,
            },
          },
        });
        if (resolved) {
          return resolved;
        }
      }
      throw error;
    }
  }

  async verifyCategories(categories: { name: string }[]): Promise<Category[]> {
    const orgId = this.orgId();
    const names = Array.from(
      new Set(
        categories
          .map((c) => (c?.name || '').trim())
          .filter((n) => n.length > 0),
      ),
    );
    if (names.length === 0) return [];

    // Verificar por organización
    return this.prismaService.category.findMany({
      where: {
        ...buildOrganizationFilter(orgId),
        name: { in: names },
      },
      orderBy: { name: 'asc' },
    });
  }

  async validateCategoryName(
    name: string,
    categoryId?: number,
  ): Promise<{ nameAvailable: boolean }> {
    const orgId = this.orgId();
    if (orgId === null) {
      throw new BadRequestException(
        'No se puede validar la categoria sin organizacion activa.',
      );
    }

    const trimmed = String(name ?? '').trim();
    if (!trimmed) {
      return { nameAvailable: true };
    }

    const existing = await this.prismaService.category.findFirst({
      where: {
        ...buildOrganizationFilter(orgId),
        name: { equals: trimmed, mode: 'insensitive' },
        ...(categoryId ? { id: { not: categoryId } } : {}),
      },
      select: { id: true },
    });

    return { nameAvailable: !existing };
  }

  findAll() {
    return this.prismaService.category.findMany({
      where: buildOrganizationFilter(this.orgId()),
      orderBy: { name: 'asc' },
    });
  }

  async findAllWithProductCount() {
    // Como Category es única por organización, basta con filtrar categorías por org.
    // Los productos asociados a esa categoría también pertenecen a la misma org.
    const categories = await this.prismaService.category.findMany({
      where: buildOrganizationFilter(this.orgId()),
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      status: cat.status,
      image: cat.image,
      productCount: cat._count.products,
    }));
  }

  async findOne(id: number) {
    if (!id || typeof id !== 'number') {
      throw new BadRequestException('El ID proporcionado no es válido.');
    }

    const category = await this.prismaService.category.findFirst({
      where: { id, ...buildOrganizationFilter(this.orgId()) },
    });

    if (!category) {
      throw new NotFoundException(`Categoria with id ${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto, req: Request) {
    // Asegura que existe y pertenece a la org
    await this.findOne(id);

    try {
      const before = await this.prismaService.category.findFirst({
        where: { id, ...buildOrganizationFilter(this.orgId()) },
      });

      const categoryFound = await this.prismaService.category.update({
        where: { id },
        data: {
          ...updateCategoryDto,
          // Nunca cambiar organizationId por aquí; compañía de trazabilidad también puede quedar tal cual
        },
      });

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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La categoría "${updateCategoryDto.name}" ya existe en esta organización.`,
        );
      }
      throw error;
    }
  }

  async remove(id: number, req: Request) {
    const orgFilter = buildOrganizationFilter(this.orgId());

    // Verificar si la categoría pertenece a la org
    const category = await this.prismaService.category.findFirst({
      where: { id, ...orgFilter },
    });
    if (!category) {
      throw new NotFoundException(`Categoria with id ${id} not found`);
    }

    // Verificar productos relacionados (de la misma org)
    const relatedProducts = await this.prismaService.product.findMany({
      where: { categoryId: id, ...orgFilter },
      select: { id: true },
      take: 1,
    });
    if (relatedProducts.length > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría con ID ${id} porque tiene productos relacionados.`,
      );
    }

    const deleted = await this.prismaService.category.delete({
      where: { id },
    });

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Category',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Categoría ${deleted.name} eliminada`,
        diff: { before: deleted } as any,
      },
      req,
    );

    return deleted;
  }

  async removes(ids: number[], req: Request) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }

    const orgFilter = buildOrganizationFilter(this.orgId());

    // Verificar que todas las categorías pertenecen a la organización
    const existing = await this.prismaService.category.findMany({
      where: { id: { in: ids }, ...orgFilter },
      select: { id: true },
    });
    if (existing.length !== ids.length) {
      throw new NotFoundException(
        'Una o más categorías no pertenecen a tu organización.',
      );
    }

    // Verificar si alguna tiene productos relacionados en esta organización
    const related = await this.prismaService.product.findMany({
      where: { categoryId: { in: ids }, ...orgFilter },
      select: { id: true },
      take: 1,
    });
    if (related.length > 0) {
      throw new ConflictException(
        `No se pueden eliminar las categorías porque algunas tienen productos relacionados.`,
      );
    }

    try {
      const deletedCategories = await this.prismaService.category.deleteMany({
        where: { id: { in: ids }, ...orgFilter },
      });

      if (deletedCategories.count === 0) {
        throw new NotFoundException(
          'No se encontraron categorias con los IDs proporcionados.',
        );
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
    } catch {
      throw new InternalServerErrorException(
        'Hubo un error al eliminar las categorías.',
      );
    }
  }
}
