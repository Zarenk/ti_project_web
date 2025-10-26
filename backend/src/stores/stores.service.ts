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

      if (resolvedCompanyId !== null) {
        if (resolvedOrganizationId === null) {
          throw new BadRequestException(
            'Debe indicar una organizacion valida para asociar la tienda a una compania.',
          );
        }
        await this.assertCompanyMatchesOrganization(
          resolvedCompanyId,
          resolvedOrganizationId,
        );
      }

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

  async findOne(
    id: number,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    if (!id || typeof id !== 'number') {
      throw new Error('El ID proporcionado no es valido.');
    }

    const storeFound = await this.prismaService.store.findFirst({
      where: {
        id,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
          companyIdFromContext,
        ) as Prisma.StoreWhereInput),
      },
    });

    if (!storeFound) {
      throw new NotFoundException(`Store with id ${id} not found`);
    }

    return storeFound;
  }

  async checkIfExists(
    name: string,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ): Promise<boolean> {
    const store = await this.prismaService.store.findFirst({
      where: {
        name,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
          companyIdFromContext,
        ) as Prisma.StoreWhereInput),
      },
    });
    return !!store;
  }

  async update(
    id: number,
    updateStoreDto: UpdateStoreDto,
    req: Request,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    try {
      const before = await this.prismaService.store.findFirst({
        where: {
          id: Number(id),
          ...(buildOrganizationFilter(
            organizationIdFromContext,
            companyIdFromContext,
          ) as Prisma.StoreWhereInput),
        },
      });

      if (!before) {
        throw new NotFoundException(`Store with id ${id} not found`);
      }

      const { id: _id, organizationId, companyId, ...storePayload } =
        updateStoreDto;

      const resolvedOrganizationId =
        organizationIdFromContext === undefined
          ? organizationId ?? before.organizationId ?? null
          : organizationIdFromContext;

      const resolvedCompanyId =
        companyIdFromContext === undefined
          ? resolveCompanyId({
              provided: companyId ?? null,
              fallbacks: [before.companyId ?? null],
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            })
          : resolveCompanyId({
              provided: companyId ?? null,
              fallbacks: [companyIdFromContext],
              mismatchError:
                'La compania proporcionada no coincide con el contexto.',
            });

      if (resolvedCompanyId !== null) {
        if (resolvedOrganizationId === null) {
          throw new BadRequestException(
            'Debe indicar una organizacion valida para asociar la tienda a una compania.',
          );
        }
        await this.assertCompanyMatchesOrganization(
          resolvedCompanyId,
          resolvedOrganizationId,
        );
      }

      logOrganizationContext({
        service: StoresService.name,
        operation: 'update',
        organizationId: resolvedOrganizationId ?? null,
        companyId: resolvedCompanyId ?? null,
        metadata: { storeId: id },
      });

      const storeUpdateData: Prisma.StoreUncheckedUpdateInput & {
        organizationId?: number | null;
        companyId?: number | null;
      } = {
        ...storePayload,
      };

      if (resolvedOrganizationId !== undefined) {
        storeUpdateData.organizationId = resolvedOrganizationId ?? null;
      }

      if (resolvedCompanyId !== undefined) {
        storeUpdateData.companyId = resolvedCompanyId ?? null;
      }

      const updated = await this.prismaService.store.update({
        where: { id: Number(id) },
        data: storeUpdateData,
      });

      const diff: Record<string, unknown> = { before: {}, after: {} } as any;
      for (const key of Object.keys(updated)) {
        if (
          JSON.stringify((before as any)?.[key]) !==
          JSON.stringify((updated as any)?.[key])
        ) {
          (diff.before as any)[key] = (before as any)?.[key];
          (diff.after as any)[key] = (updated as any)?.[key];
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
          diff: diff as unknown as Prisma.JsonValue,
        },
        req,
      );

      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
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

      throw error;
    }
  }
  async updateMany(
    stores: UpdateStoreDto[],
    req: Request,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    if (!Array.isArray(stores) || stores.length === 0) {
      throw new BadRequestException(
        'No se proporcionaron tiendas para actualizar.',
      );
    }

    try {
      const invalidStores = stores.filter(
        (store) => !store.id || Number.isNaN(Number(store.id)),
      );
      if (invalidStores.length > 0) {
        throw new BadRequestException(
          'Todas las tiendas deben tener un ID valido.',
        );
      }

      const updatedStores = await this.prismaService.$transaction(
        async (tx) => {
          const results: any[] = [];

          for (const store of stores) {
            const existing = await tx.store.findFirst({
              where: {
                id: Number(store.id),
                ...(buildOrganizationFilter(
                  organizationIdFromContext,
                  companyIdFromContext,
                ) as Prisma.StoreWhereInput),
              },
            });

            if (!existing) {
              throw new NotFoundException(
                `Store with id ${store.id} not found`,
              );
            }

            const { id: storeId, organizationId, companyId, ...storePayload } =
              store;

            const resolvedOrganizationId =
              organizationIdFromContext === undefined
                ? organizationId ?? existing.organizationId ?? null
                : organizationIdFromContext;

            const resolvedCompanyId =
              companyIdFromContext === undefined
                ? resolveCompanyId({
                    provided: companyId ?? null,
                    fallbacks: [existing.companyId ?? null],
                    mismatchError:
                      'La compania proporcionada no coincide con el contexto.',
                  })
                : resolveCompanyId({
                    provided: companyId ?? null,
                    fallbacks: [companyIdFromContext],
                    mismatchError:
                      'La compania proporcionada no coincide con el contexto.',
                  });

            if (resolvedCompanyId !== null) {
              if (resolvedOrganizationId === null) {
                throw new BadRequestException(
                  'Debe indicar una organizacion valida para asociar la tienda a una compania.',
                );
              }
              const company = await tx.company.findUnique({
                where: { id: resolvedCompanyId },
                select: { organizationId: true },
              });
              if (!company || company.organizationId !== resolvedOrganizationId) {
                throw new BadRequestException(
                  `La compania ${resolvedCompanyId} no pertenece a la organizacion ${resolvedOrganizationId}.`,
                );
              }
            }

            logOrganizationContext({
              service: StoresService.name,
              operation: 'updateMany',
              organizationId: resolvedOrganizationId ?? null,
              companyId: resolvedCompanyId ?? null,
              metadata: { storeId },
            });

            const updateData: Prisma.StoreUncheckedUpdateInput = {
              name: storePayload.name,
              description: storePayload.description,
              ruc: storePayload.ruc,
              phone: storePayload.phone,
              adress: storePayload.adress,
              email: storePayload.email,
              website: storePayload.website,
              status: storePayload.status,
              organizationId: resolvedOrganizationId ?? null,
              companyId: resolvedCompanyId ?? null,
            };

            const updated = await tx.store.update({
              where: { id: Number(storeId) },
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
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Una o mas tiendas no fueron encontradas.',
        );
      }

      throw new InternalServerErrorException(
        'Hubo un error al actualizar las tiendas.',
      );
    }
  }

  async remove(
    id: number,
    req: Request,
    organizationIdFromContext?: number | null,
    companyIdFromContext?: number | null,
  ) {
    const existing = await this.prismaService.store.findFirst({
      where: {
        id,
        ...(buildOrganizationFilter(
          organizationIdFromContext,
          companyIdFromContext,
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
    companyIdFromContext?: number | null,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException(
        'No se proporcionaron IDs validos para eliminar.',
      );
    }

    try {
      const numericIds = ids.map((id) => Number(id));

      const deletedStores = await this.prismaService.store.deleteMany({
        where: {
          id: {
            in: numericIds,
          },
          ...(buildOrganizationFilter(
            organizationIdFromContext,
            companyIdFromContext,
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
        'Hubo un error al eliminar las tiendas.',
      );
    }
  }

  private async assertCompanyMatchesOrganization(
    companyId: number,
    organizationId: number,
  ): Promise<void> {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
      select: { organizationId: true },
    });

    if (!company || company.organizationId !== organizationId) {
      throw new BadRequestException(
        `La compania ${companyId} no pertenece a la organizacion ${organizationId}.`,
      );
    }
  }
}

