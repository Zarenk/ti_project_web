import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerticalConfigService } from 'src/tenancy/vertical-config.service';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateRecipeItemDto } from './dto/create-recipe-item.dto';
import { UpdateRecipeItemDto } from './dto/update-recipe-item.dto';

@Injectable()
export class RecipeItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verticalConfig: VerticalConfigService,
  ) {}

  private async ensureProductionFeatureEnabled(
    companyId?: number | null,
  ): Promise<void> {
    if (companyId == null) {
      return;
    }

    const config = await this.verticalConfig.getConfig(companyId);
    if (config.features.production === false && config.features.reservations === false) {
      throw new ForbiddenException(
        'El modulo de produccion/recetas no esta habilitado para esta empresa.',
      );
    }
  }

  async create(
    dto: CreateRecipeItemDto,
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
        'Contexto de tenant no disponible para crear recetas.',
      );
    }

    // Validate production feature is enabled
    await this.ensureProductionFeatureEnabled(resolvedCompanyId);

    return this.prisma.recipeItem.create({
      data: {
        productId: dto.productId,
        ingredientId: dto.ingredientId,
        quantity: dto.quantity,
        unit: dto.unit,
        organizationId: resolvedOrganizationId ?? null,
        companyId: resolvedCompanyId ?? null,
      },
    });
  }

  async findAll(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    // Validate production feature is enabled
    await this.ensureProductionFeatureEnabled(companyIdFromContext);

    const where = buildOrganizationFilter(
      organizationIdFromContext,
      companyIdFromContext,
    ) as Prisma.RecipeItemWhereInput;

    return this.prisma.recipeItem.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    // Validate production feature is enabled
    await this.ensureProductionFeatureEnabled(companyIdFromContext);

    const where = {
      id,
      ...buildOrganizationFilter(
        organizationIdFromContext,
        companyIdFromContext,
      ),
    } as Prisma.RecipeItemWhereInput;

    const recipe = await this.prisma.recipeItem.findFirst({ where });
    if (!recipe) {
      throw new NotFoundException('Receta no encontrada.');
    }
    return recipe;
  }

  async update(
    id: number,
    dto: UpdateRecipeItemDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    // Validate production feature is enabled (also called in findOne below)
    await this.ensureProductionFeatureEnabled(companyIdFromContext);

    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.recipeItem.update({
      where: { id },
      data: {
        productId: dto.productId,
        ingredientId: dto.ingredientId,
        quantity: dto.quantity,
        unit: dto.unit,
      },
    });
  }

  async remove(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.recipeItem.delete({ where: { id } });
  }
}
