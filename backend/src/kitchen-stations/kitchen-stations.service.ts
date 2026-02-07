import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildOrganizationFilter, resolveCompanyId } from 'src/tenancy/organization.utils';
import { CreateKitchenStationDto } from './dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from './dto/update-kitchen-station.dto';

@Injectable()
export class KitchenStationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateKitchenStationDto,
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
        'Contexto de tenant no disponible para crear estaciones.',
      );
    }

    return this.prisma.kitchenStation.create({
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
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
    ) as Prisma.KitchenStationWhereInput;

    return this.prisma.kitchenStation.findMany({
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
    } as Prisma.KitchenStationWhereInput;

    const station = await this.prisma.kitchenStation.findFirst({ where });
    if (!station) {
      throw new NotFoundException('Estacion no encontrada.');
    }
    return station;
  }

  async update(
    id: number,
    dto: UpdateKitchenStationDto,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.kitchenStation.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive,
      },
    });
  }

  async remove(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    await this.findOne(id, organizationIdFromContext, companyIdFromContext);
    return this.prisma.kitchenStation.delete({ where: { id } });
  }
}
