import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';

@Injectable()
export class RestaurantTablesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateRestaurantTableDto,
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
        'Contexto de tenant no disponible para crear mesas.',
      );
    }

    return this.prisma.restaurantTable.create({
      data: {
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity,
        area: dto.area,
        positionX: dto.positionX,
        positionY: dto.positionY,
        status: dto.status,
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
    ) as Prisma.RestaurantTableWhereInput;

    return this.prisma.restaurantTable.findMany({
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
    } as Prisma.RestaurantTableWhereInput;

    const table = await this.prisma.restaurantTable.findFirst({ where });
    if (!table) {
      throw new NotFoundException('Mesa no encontrada.');
    }
    return table;
  }

  async update(
    id: number,
    dto: UpdateRestaurantTableDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.restaurantTable.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        capacity: dto.capacity,
        area: dto.area,
        positionX: dto.positionX,
        positionY: dto.positionY,
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
    return this.prisma.restaurantTable.delete({ where: { id } });
  }
}
