import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  buildOrganizationFilter,
  resolveCompanyId,
} from 'src/tenancy/organization.utils';

@Injectable()
export class StoresService {
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
  ) {}

  async create(
    createStoreDto: CreateStoreDto,
    req: Request,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    try {
      const { organizationId, companyId, ...storePayload } = createStoreDto;

      const resolvedOrganizationId =
        organizationIdFromContext === undefined
          ? (organizationId ?? null)
          : organizationIdFromContext;
      const resolvedCompanyId =
        companyIdFromContext === undefined
          ? resolveCompanyId({
              provided: companyId ?? null,
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            })
          : resolveCompanyId({
              provided: companyId ?? null,
              fallbacks: [companyIdFromContext],
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            });

      logOrganizationContext({
        service: StoresService.name,
        operation: 'create',
        organizationId: resolvedOrganizationId ?? null,
        companyId: resolvedCompanyId ?? null,
        metadata: { storeName: createStoreDto.name },
      });

      const storeCreateData: Prisma.StoreUncheckedCreateInput & {
        organizationId?: number | null;
        companyId?: number | null;
      } = {
        ...storePayload,
        organizationId: resolvedOrganizationId ?? null,
        companyId: resolvedCompanyId ?? null,
      };

      const store = await this.prismaService.store.create({
        data: storeCreateData as Prisma.StoreUncheckedCreateInput,
      });

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: store.id.toString(),
          action: AuditAction.CREATED,
          summary: `Tienda ${store.name} creada`,
          diff: { after: store } as any,
        },
        req,
      );

      return store;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La tienda con el nombre "${createStoreDto.name}" ya existe.`,
        );
      }
      throw error;
    }
  }

  findAll(
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const where = buildOrganizationFilter(
      organizationIdFromContext,
      companyIdFromContext,
    ) as Prisma.StoreWhereInput;

    if (Object.keys(where).length === 0) {
      return this.prismaService.store.findMany();
    }

    return this.prismaService.store.findMany({ where });
  }

  async findOne(id: number, organizationIdFromContext?: number | null) {
    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es válido.');
    }

    const storeFound = await this.prismaService.store.findFirst({
      where: {
        id,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
        ) as Prisma.StoreWhereInput),
      },
    });

    if (!storeFound) {
      throw new NotFoundException(`Store with id ${id} not found`);
    }

    return storeFound;
  }

  // store.service.ts
  async checkIfExists(
    name: string,
    organizationIdFromContext?: number | null,
  ): Promise<boolean> {
    const store = await this.prismaService.store.findFirst({
      where: {
        name,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
        ) as Prisma.StoreWhereInput),
      },
    });
    return !!store; // Devuelve true si el proveedor existe, false si no
  }

  async update(
    id: number,
    updateStoreDto: UpdateStoreDto,
    req: Request,
    organizationIdFromContext?: number | null,
  ) {
    try {
      const before = await this.prismaService.store.findFirst({
        where: {
          id: Number(id),
          ...(buildOrganizationFilter(
            organizationIdFromContext,
          ) as Prisma.StoreWhereInput),
        },
      });

      if (!before) {
        throw new NotFoundException(`Store with id ${id} not found`);
      }

      const { id: _id, organizationId, ...storePayload } = updateStoreDto;

      const resolvedOrganizationId =
        organizationIdFromContext === undefined
          ? organizationId
          : organizationIdFromContext;

      if (resolvedOrganizationId !== undefined) {
        logOrganizationContext({
          service: StoresService.name,
          operation: 'update',
          organizationId: resolvedOrganizationId ?? null,
          metadata: { storeId: id },
        });
      }

      const storeUpdateData: Prisma.StoreUncheckedUpdateInput & {
        organizationId?: number | null;
      } = {
        ...storePayload,
      };

      if (resolvedOrganizationId !== undefined) {
        storeUpdateData.organizationId = resolvedOrganizationId ?? null;
      }

      const updated = await this.prismaService.store.update({
        where: { id: Number(id) },
        data: storeUpdateData as Prisma.StoreUncheckedUpdateInput,
      });

      if (!updated) {
        throw new NotFoundException(`Store with id ${id} not found`);
      }

      const diff: any = { before: {}, after: {} };
      for (const key of Object.keys(updated)) {
        if (
          JSON.stringify((before as any)?.[key]) !==
          JSON.stringify((updated as any)?.[key])
        ) {
          diff.before[key] = (before as any)?.[key];
          diff.after[key] = (updated as any)?.[key];
        }
      }

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: updated.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Tienda ${updated.name} actualizada`,
          diff,
        },
        req,
      );

      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `La tienda con el nombre "${updateStoreDto.name}" ya existe.`,
        );
      }
      console.error('Error en el backend:', error);
      throw error; // Lanza otros errores no manejados
    }
  }

  async updateMany(
    stores: UpdateStoreDto[],
    req: Request,
    organizationIdFromContext?: number | null,
  ) {
    if (!Array.isArray(stores) || stores.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron tiendas para actualizar.',
      );
    }

    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProducts = stores.filter(
        (store) => !store.id || isNaN(Number(store.id)),
      );
      if (invalidProducts.length > 0) {
        throw new BadRequestException(
          'Todas las tiendas deben tener un ID válido.',
        );
      }

      // Ejecutar la transacción para actualizar múltiples productos
      const updatedStores = await this.prismaService.$transaction(
        async (tx) => {
          const results: any[] = [];

          for (const store of stores) {
            const existing = await tx.store.findFirst({
              where: {
                id: Number(store.id),
                ...(buildOrganizationFilter(
                  organizationIdFromContext,
                ) as Prisma.StoreWhereInput),
              },
            });

            if (!existing) {
              throw new NotFoundException(
                `Store with id ${store.id} not found`,
              );
            }

            const resolvedOrganizationId =
              organizationIdFromContext === undefined
                ? (store.organizationId ?? null)
                : organizationIdFromContext;
            logOrganizationContext({
              service: StoresService.name,
              operation: 'updateMany',
              organizationId: resolvedOrganizationId ?? null,
              metadata: { storeId: store.id },
            });
            const updateData = {
              name: store.name,
              description: store.description,
              ruc: store.ruc,
              phone: store.phone,
              adress: store.adress,
              email: store.email,
              website: store.website,
              status: store.status,
              organizationId: resolvedOrganizationId ?? null,
            } as Prisma.StoreUncheckedUpdateInput;

            const updated = await tx.store.update({
              where: { id: Number(store.id) },
              data: updateData,
            });
            results.push(updated);
          }

          return results;
        },
      );

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          action: AuditAction.UPDATED,
          summary: `${updatedStores.length} tienda(s) actualizada(s)`,
          diff: { after: updatedStores } as any,
        },
        req,
      );

      return {
        message: `${updatedStores.length} tienda(s) actualizada(s) correctamente.`,
        updatedStores,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'Una o más tiendas no fueron encontrados.',
          );
        }
      }

      throw new InternalServerErrorException(
        'Hubo un error al actualizar los tiendas.',
      );
    }
  }

  async remove(
    id: number,
    req: Request,
    organizationIdFromContext?: number | null,
  ) {
    const existing = await this.prismaService.store.findFirst({
      where: {
        id,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
        ) as Prisma.StoreWhereInput),
      },
    });

    if (!existing) {
      throw new NotFoundException(`Store with id ${id} not found`);
    }

    const deletedStore = await this.prismaService.store.delete({
      where: {
        id,
      },
    });

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Store',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Tienda ${deletedStore.name} eliminada`,
        diff: { before: deletedStore } as any,
      },
      req,
    );

    return deletedStore;
  }

  async removes(
    ids: number[],
    req: Request,
    organizationIdFromContext?: number | null,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
    }

    try {
      // Convertir los IDs a números
      const numericIds = ids.map((id) => Number(id));

      const deletedStores = await this.prismaService.store.deleteMany({
        where: {
          id: {
            in: numericIds, // Elimina todos los productos cuyos IDs estén en este array
          },
          ...(buildOrganizationFilter(
            organizationIdFromContext,
          ) as Prisma.StoreWhereInput),
        },
      });

      if (deletedStores.count === 0) {
        throw new NotFoundException(
          'No se encontraron tiendas con los IDs proporcionados.',
        );
      }

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Store',
          entityId: numericIds.join(','),
          action: AuditAction.DELETED,
          summary: `${deletedStores.count} tienda(s) eliminada(s)`,
          diff: { ids: numericIds } as any,
        },
        req,
      );

      return {
        message: `${deletedStores.count} tienda(s) eliminada(s) correctamente.`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Hubo un error al eliminar los productos.',
      );
    }
  }
}
