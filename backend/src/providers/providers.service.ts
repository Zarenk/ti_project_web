import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { Request } from 'express';
import { logOrganizationContext } from 'src/tenancy/organization-context.logger';
import {
  buildOrganizationFilter,
  resolveOrganizationId,
} from 'src/tenancy/organization.utils';

@Injectable()
export class ProvidersService {
  
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
  ) {}

   async create(
    createProviderDto: CreateProviderDto,
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    try {
      const { organizationId, ...providerPayload } = createProviderDto as CreateProviderDto & {
        organizationId?: number | null;
      };

      const resolvedOrganizationId = resolveOrganizationId({
        provided: organizationId === undefined ? undefined : organizationId,
        fallbacks: [organizationIdFromContext ?? undefined],
        mismatchError:
          'La organización del proveedor no coincide con el contexto actual.',
      });

      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'create',
        organizationId: resolvedOrganizationId ?? organizationId ?? undefined,
        metadata: { providerName: createProviderDto.name },
      });

      const provider = await this.prismaService.provider.create({
        data: {
          ...providerPayload,
          organizationId: resolvedOrganizationId ?? null,
        } as Prisma.ProviderUncheckedCreateInput,
      });

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          entityId: provider.id.toString(),
          action: AuditAction.CREATED,
          summary: `Proveedor ${provider.name} creado`,
          diff: { after: provider } as any,
        },
        req,
      );

      return provider;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El Proveedor con el RUC "${createProviderDto.documentNumber}" ya existe.`,
        );
      }
      console.error('Error en el backend:', error);
      throw error;
    }
  }
  
  findAll(options?: { organizationId?: number | null }) {
    try {
      const organizationFilter = buildOrganizationFilter(
        options?.organizationId,
      ) as Prisma.ProviderWhereInput;

      return this.prismaService.provider.findMany({
        where: organizationFilter,
      });
    } catch (error) {
      console.error('Error en el backend:', error);
      throw error;
    }
  }

  async findOne(id: number, organizationId?: number | null) {
    try{
      if (!id || typeof id !== 'number') {
        throw new Error('El ID proporcionado no es válido.');
      }
  
      const providerFound = await this.prismaService.provider.findFirst({
        where: {
          id,
          ...buildOrganizationFilter(organizationId),
        },
      });
  
      if(!providerFound){
        throw new NotFoundException(`Provider with id ${id} not found`)
      }
  
      return providerFound;
    }
    catch(error){
      console.error("Error en el backend:", error);
      throw error;
    }
  }

  // providers.service.ts
  async checkIfExists(documentNumber: string): Promise<boolean> {
    const provider = await this.prismaService.provider.findUnique({
      where: { documentNumber },
    });
    return !!provider; // Devuelve true si el proveedor existe, false si no
  }

  async update(
    id: number,
    updateProviderDto: UpdateProviderDto,
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    try {
      const providerId = Number(id);
      const before = await this.prismaService.provider.findFirst({
        where: {
          id: providerId,
          ...buildOrganizationFilter(organizationIdFromContext),
        },
      });

      if (!before) {
        throw new NotFoundException(`Provider with id ${id} not found`);
      }

      const { id: _id, organizationId, ...providerPayload } =
        updateProviderDto as UpdateProviderDto & {
          organizationId?: number | null;
        };

      if (
        organizationId === null &&
        organizationIdFromContext !== undefined &&
        organizationIdFromContext !== null
      ) {
        throw new BadRequestException(
          'No se puede limpiar la organización de un proveedor en un contexto multi-organización.',
        );
      }

      const resolvedOrganizationId = resolveOrganizationId({
        provided: organizationId === undefined ? undefined : organizationId,
        fallbacks: [
          organizationIdFromContext ?? undefined,
          (before as { organizationId?: number | null }).organizationId ?? null,
        ],
        mismatchError:
          'La organización del proveedor no coincide con el contexto actual.',
      });

      if (organizationId !== undefined) {
        logOrganizationContext({
          service: ProvidersService.name,
          operation: 'update',
          organizationId:
            organizationId ??
            organizationIdFromContext ??
            resolvedOrganizationId,
          metadata: { providerId: id },
        });
      }
      const providerFound = await this.prismaService.provider.update({
        where: { id: providerId },
        data: {
          ...providerPayload,
          ...(organizationId !== undefined
            ? {
                organizationId:
                  organizationId === null ? null : resolvedOrganizationId,
              }
            : {}),
        },
      });
  
      if(!providerFound){
        throw new NotFoundException(`Provider with id ${id} not found`)
      }

      const diff: any = { before: {}, after: {} };
      if (before) {
        for (const key of Object.keys(providerFound)) {
          if (
            JSON.stringify((before as any)[key]) !==
            JSON.stringify((providerFound as any)[key])
          ) {
            diff.before[key] = (before as any)[key];
            diff.after[key] = (providerFound as any)[key];
          }
        }
      }

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          entityId: providerFound.id.toString(),
          action: AuditAction.UPDATED,
          summary: `Proveedor ${providerFound.name} actualizado`,
          diff,
        },
        req,
      );
  
      return providerFound;
    } catch (error){
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          `El proveedor con el RUC "${updateProviderDto.name}" ya existe.`
        );
      }
      console.error("Error en el backend:", error);
      throw error; // Lanza otros errores no manejados
    }    
  }

  async updateMany(
    providers: UpdateProviderDto[],
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    if (!Array.isArray(providers) || providers.length === 0) {
      throw new BadRequestException('No se proporcionaron proveedores para actualizar.');
    }
  
    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProviders = providers.filter((provider) => !provider.id || isNaN(Number(provider.id)));
      if (invalidProviders.length > 0) {
        throw new BadRequestException('Todos los proveedores deben tener un ID válido.');
      }

      const ids = providers.map((provider) => Number(provider.id));
      const existingProviders = await this.prismaService.provider.findMany({
        where: {
          id: { in: ids },
          ...buildOrganizationFilter(organizationIdFromContext),
        },
      });

      if (existingProviders.length !== providers.length) {
        throw new NotFoundException(
          'Uno o más proveedores no fueron encontrados en la organización indicada.',
        );
      }

      const providersById = new Map(
        existingProviders.map((provider) => [provider.id, provider]),
      );
  
      // Ejecutar la transacción para actualizar múltiples productos
      const updatedProviders = await this.prismaService.$transaction(
        providers.map((provider) => {
          const { organizationId, id: providerId, ...rest } = provider as UpdateProviderDto & {
            organizationId?: number | null;
          };

          const existing = providersById.get(Number(providerId));

          if (!existing) {
            throw new NotFoundException(
              `Provider with id ${providerId} not found in the current organization`,
            );
          }

          if (
            organizationId === null &&
            organizationIdFromContext !== undefined &&
            organizationIdFromContext !== null
          ) {
            throw new BadRequestException(
              'No se puede limpiar la organización de un proveedor en un contexto multi-organización.',
            );
          }

          const resolvedOrganizationId = resolveOrganizationId({
            provided: organizationId === undefined ? undefined : organizationId,
            fallbacks: [
              organizationIdFromContext ?? undefined,
              (existing as { organizationId?: number | null }).organizationId ?? null,
            ],
            mismatchError:
              'La organización del proveedor no coincide con el contexto actual.',
          });

          logOrganizationContext({
            service: ProvidersService.name,
            operation: 'updateMany',
            organizationId:
              organizationId ??
              organizationIdFromContext ??
              resolvedOrganizationId,
            metadata: { providerId },
          });

          return this.prismaService.provider.update({
            where: { id: Number(providerId) },
            data: {
              ...rest,
              ...(organizationId !== undefined
                ? {
                    organizationId:
                      organizationId === null ? null : resolvedOrganizationId,
                  }
                : {}),
            },
          });
        }),
      );

      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          action: AuditAction.UPDATED,
          summary: `${updatedProviders.length} proveedor(es) actualizado(s)`,
        },
        req,
      );
  
      return {
        message: `${updatedProviders.length} Proveedor(es) actualizado(s) correctamente.`,
        updatedProviders,
      };
    } catch (error) {
      console.error('Error al actualizar proveedores:', error);
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Uno o mas proveedores no fueron encontrados.');
        }
      }
  
      throw new InternalServerErrorException(
        'Hubo un error al actualizar los proveedores.',
      );
    }
  }

  async remove(
    id: number,
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    try{
      const provider = await this.prismaService.provider.findFirst({
        where: {
          id,
          ...buildOrganizationFilter(organizationIdFromContext),
        },
      });

      if (!provider) {
        throw new NotFoundException(`Provider with id ${id} not found`);
      }

      // Verificar si la categoría tiene productos relacionados
      const relatedProviders = await this.prismaService.entry.findMany({
        where: { providerId: id },
      });

      if (relatedProviders.length > 0) {
        throw new ConflictException(
          `No se puede eliminar el proveedor con ID ${id} porque tiene entradas relacionadas.`
        );
      }
      // Proceder con la eliminación si no hay proveedores relacionados
      const deletedProvider = await this.prismaService.provider.delete({
        where: {
          id,
        },
      });
    
      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'remove',
        organizationId: (deletedProvider as { organizationId?: number | null })?.organizationId,
        metadata: { providerId: id },
      });
      if (!deletedProvider) {
        throw new NotFoundException(`Provider with id ${id} not found`);
      }
      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          entityId: id.toString(),
          action: AuditAction.DELETED,
          summary: `Proveedor ${deletedProvider.name} eliminado`,
          diff: { before: deletedProvider } as any,
        },
        req,
      );

      return deletedProvider;
    } catch (error) {
      console.error('Error en el backend:', error);
      throw error; // Lanza otros errores no manejados
    }
  }

  async removes(
    ids: number[],
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new NotFoundException('No se proporcionaron IDs válidos para eliminar.');
    }
      // Verificar si alguna de las categorías tiene productos relacionados
    const relatedProviders = await this.prismaService.entry.findMany({
      where: {
        providerId: {
          in: ids,
        },
      },
    });

    if (relatedProviders.length > 0) {
      throw new ConflictException(
        `No se pueden eliminar los proveedores porque algunos tienen datos relacionados.`,
      );
    }

    try {
      const accessibleProviders = await this.prismaService.provider.findMany({
        where: {
          id: { in: ids },
          ...buildOrganizationFilter(organizationIdFromContext),
        },
      });

      if (accessibleProviders.length !== ids.length) {
        throw new NotFoundException(
          'Uno o más proveedores no fueron encontrados en la organización indicada.',
        );
      }

      const deletedProviders = await this.prismaService.provider.deleteMany({
        where: {
          id: {
            in: ids,
          },
          ...buildOrganizationFilter(organizationIdFromContext),
        },
      });

      if (deletedProviders.count === 0) {
        throw new NotFoundException(
          `No se encontraron proveedores con los IDs proporcionados.`,
        );
      }

      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'removeMany',
        organizationId:
          organizationIdFromContext ??
          ((accessibleProviders[0] as { organizationId?: number | null })
            ?.organizationId ?? null),
        metadata: { providerIds: ids },
      });
      
      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          action: AuditAction.DELETED,
          summary: `${deletedProviders.count} proveedor(es) eliminado(s)`,
          diff: { ids } as any,
        },
        req,
      );

      return {
        message: `${deletedProviders.count} proveedor(es) eliminado(s) correctamente.`,
      };
    } catch (error) {
      console.error('Error en el backend:', error);
      throw new InternalServerErrorException(
        'Hubo un error al eliminar los proveedores.',
      );   
    }
  }
}

