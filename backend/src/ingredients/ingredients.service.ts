import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class IngredientsService {
  private readonly logger = new Logger(IngredientsService.name);

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

  async findMovements(
    ingredientId: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
    type?: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE',
  ) {
    const where: Prisma.IngredientMovementWhereInput = {
      ingredientId,
      ...buildOrganizationFilter(organizationIdFromContext, companyIdFromContext),
    };
    if (type) {
      where.type = type;
    }

    return this.prisma.ingredientMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: { select: { id: true, status: true } },
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  /**
   * Deduct ingredients for a restaurant order based on RecipeItems.
   * Creates IngredientMovement (OUT) records and decrements Ingredient.stock.
   * Can run inside an existing transaction or standalone.
   */
  async deductForOrder(
    orderId: number,
    orderItems: Array<{ productId: number; quantity: number }>,
    organizationId: number | null,
    companyId: number | null,
    userId: number | null,
    tx?: TxClient,
  ): Promise<{ deducted: number; warnings: string[] }> {
    const client = tx ?? this.prisma;
    const warnings: string[] = [];
    let deducted = 0;

    for (const orderItem of orderItems) {
      // Look up recipe for this product
      const recipeItems = await client.recipeItem.findMany({
        where: { productId: orderItem.productId },
        include: { ingredient: true },
      });

      if (recipeItems.length === 0) {
        warnings.push(
          `Producto id=${orderItem.productId} no tiene receta registrada.`,
        );
        continue;
      }

      for (const recipe of recipeItems) {
        const amountToDeduct = recipe.quantity * orderItem.quantity;

        // Create movement record
        await client.ingredientMovement.create({
          data: {
            ingredientId: recipe.ingredientId,
            type: 'OUT',
            quantity: amountToDeduct,
            unit: recipe.unit,
            orderId,
            notes: `Deducción automática - Orden #${orderId}`,
            createdById: userId,
            organizationId,
            companyId,
          },
        });

        // Decrement stock
        await client.ingredient.update({
          where: { id: recipe.ingredientId },
          data: { stock: { decrement: amountToDeduct } },
        });

        deducted++;

        // Warn if stock is below minimum
        const updated = await client.ingredient.findUnique({
          where: { id: recipe.ingredientId },
        });
        if (updated && updated.minStock != null && updated.stock < updated.minStock) {
          warnings.push(
            `⚠ "${updated.name}" stock bajo: ${updated.stock} ${updated.unit} (mín: ${updated.minStock})`,
          );
        }
      }
    }

    if (deducted > 0) {
      this.logger.log(
        `Order #${orderId}: deducted ${deducted} ingredient(s). Warnings: ${warnings.length}`,
      );
    }

    return { deducted, warnings };
  }

  /**
   * Reverse ingredient deductions for a cancelled order.
   * Creates IngredientMovement (ADJUSTMENT) records and restores stock.
   */
  async reverseForOrder(
    orderId: number,
    organizationId: number | null,
    companyId: number | null,
    userId: number | null,
    tx?: TxClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;

    // Find all OUT movements for this order
    const movements = await client.ingredientMovement.findMany({
      where: { orderId, type: 'OUT' },
    });

    if (movements.length === 0) return 0;

    for (const mov of movements) {
      // Create reversal movement
      await client.ingredientMovement.create({
        data: {
          ingredientId: mov.ingredientId,
          type: 'ADJUSTMENT',
          quantity: mov.quantity,
          unit: mov.unit,
          orderId,
          notes: `Reversión por cancelación - Orden #${orderId}`,
          createdById: userId,
          organizationId,
          companyId,
        },
      });

      // Restore stock
      await client.ingredient.update({
        where: { id: mov.ingredientId },
        data: { stock: { increment: mov.quantity } },
      });
    }

    this.logger.log(
      `Order #${orderId}: reversed ${movements.length} ingredient deduction(s).`,
    );
    return movements.length;
  }
}
