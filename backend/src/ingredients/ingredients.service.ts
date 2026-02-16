import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateIngredientDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const resolvedOrganizationId =
      organizationIdFromContext === undefined
        ? (dto.organizationId ?? null)
        : organizationIdFromContext;
    const resolvedCompanyId =
      companyIdFromContext === undefined
        ? resolveCompanyId({
            provided: dto.companyId ?? null,
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          })
        : resolveCompanyId({
            provided: dto.companyId ?? null,
            fallbacks: [companyIdFromContext],
            mismatchError:
              'La compania proporcionada no coincide con el contexto.',
          });

    if (!resolvedOrganizationId && !resolvedCompanyId) {
      throw new BadRequestException(
        'Contexto de tenant no disponible para crear insumos.',
      );
    }

    return this.prisma.ingredient.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        cost: dto.cost,
        status: dto.status ?? 'ACTIVE',
        organizationId: resolvedOrganizationId ?? null,
        companyId: resolvedCompanyId ?? null,
      },
    });
  }

  findAll(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const where = buildOrganizationFilter(
      organizationIdFromContext,
      companyIdFromContext,
    ) as Prisma.IngredientWhereInput;

    return this.prisma.ingredient.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const where = {
      id,
      ...buildOrganizationFilter(
        organizationIdFromContext,
        companyIdFromContext,
      ),
    } as Prisma.IngredientWhereInput;

    const ingredient = await this.prisma.ingredient.findFirst({ where });
    if (!ingredient) {
      throw new NotFoundException('Insumo no encontrado.');
    }
    return ingredient;
  }

  async update(
    id: number,
    dto: UpdateIngredientDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.ingredient.update({
      where: { id },
      data: {
        name: dto.name,
        unit: dto.unit,
        stock: dto.stock,
        minStock: dto.minStock,
        cost: dto.cost,
        status: dto.status,
      },
    });
  }

  async remove(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.ingredient.delete({ where: { id } });
  }
}
