import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
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

  private readonly logger = new Logger(ProvidersService.name);
  
  constructor(
    private prismaService: PrismaService,
    private activityService: ActivityService,
  ) {}

  private logIfUnexpected(error: unknown, operation: string) {
    if (error instanceof HttpException) {
      if (error.getStatus() >= 500) {
        this.logger.error(
          `HTTP ${error.getStatus()} during ${operation}: ${error.message}`,
          error.stack,
        );
      }

      return;
    }

    if (error instanceof Error) {
      this.logger.error(
        `Unexpected error during ${operation}: ${error.message}`,
        error.stack,
      );
      return;
    }

    this.logger.error(
      `Unexpected non-error thrown during ${operation}: ${JSON.stringify(error)}`,
    );
  }

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
      this.logIfUnexpected(error, 'create');
      throw error;
    }
  }
  
  findAll(options?: { organizationId?: number | null; search?: string }) {
    try {
      const organizationFilter = buildOrganizationFilter(
        options?.organizationId,
      ) as Prisma.ProviderWhereInput;
      const searchTerm = options?.search?.trim();
      const where: Prisma.ProviderWhereInput = { ...organizationFilter };

      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { documentNumber: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { adress: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const scope =
        options?.organizationId === undefined
          ? 'global'
          : options.organizationId === null
          ? 'legacy'
          : 'tenant';
      
      const metadata: Record<string, unknown> = { scope };

      if (searchTerm) {
        metadata.search = searchTerm;
      }

      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'findAll',
        organizationId:
          options?.organizationId === undefined
            ? undefined
            : options.organizationId,
        metadata,
      });

      return this.prismaService.provider.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      this.logIfUnexpected(error, 'findAll');
      throw error;
    }
  }

  async findOne(id: number, organizationId?: number | null) {
    try{
      if (!id || typeof id !== 'number') {
        throw new Error('El ID proporcionado no es válido.');
      }

      const organizationFilter = buildOrganizationFilter(
        organizationId,
      ) as Prisma.ProviderWhereInput;
  
      const providerFound = await this.prismaService.provider.findFirst({
        where: {
          id,
          ...organizationFilter,
        },
      });
  
      const resolvedOrganizationId =
        organizationId !== undefined
          ? organizationId
          : (providerFound as { organizationId?: number | null })
              ?.organizationId ?? null;

      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'findOne',
        organizationId: resolvedOrganizationId,
        metadata: { providerId: id, found: !!providerFound },
      });

      if (!providerFound) {
        throw new NotFoundException(`Provider with id ${id} not found`);
      }
  
      return providerFound;
    }
    catch(error){
      this.logIfUnexpected(error, 'findOne');
      throw error;
    }
  }

  async checkIfExists(
    documentNumber: string,
    organizationIdFromContext?: number | null,
  ): Promise<boolean> {
    const organizationFilter = buildOrganizationFilter(
      organizationIdFromContext,
    ) as Prisma.ProviderWhereInput;

    const provider = await this.prismaService.provider.findFirst({
      where: {
        documentNumber,
        ...organizationFilter,
      },
    });

    const resolvedOrganizationId =
      organizationIdFromContext !== undefined
        ? organizationIdFromContext
        : (provider as { organizationId?: number | null })?.organizationId ?? null;

    logOrganizationContext({
      service: ProvidersService.name,
      operation: 'checkIfExists',
      organizationId: resolvedOrganizationId,
      metadata: { documentNumber, exists: !!provider },
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
      this.logIfUnexpected(error, 'update');
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
  
      // Manejar errores específicos de Prisma
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Uno o mas proveedores no fueron encontrados.');
        }
      }

      this.logIfUnexpected(error, 'updateMany');
  
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
    try {
      const organizationFilter = buildOrganizationFilter(
        organizationIdFromContext,
      ) as Prisma.ProviderWhereInput;

      const provider = await this.prismaService.provider.findFirst({
        where: {
          id,
          ...organizationFilter,
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
      const deletionResult = await this.prismaService.provider.deleteMany({
        where: {
          id,
          ...organizationFilter,
        },
      });

      if (deletionResult.count === 0) {
        throw new NotFoundException(`Provider with id ${id} not found`);
      }

      const providerOrganizationId =
        (provider as { organizationId?: number | null }).organizationId;
    
      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'remove',
        organizationId:
          providerOrganizationId !== undefined
            ? providerOrganizationId
            : organizationIdFromContext ?? undefined,
        metadata: { providerId: id },
      });
      await this.activityService.log(
        {
          actorId: (req as any)?.user?.userId,
          actorEmail: (req as any)?.user?.username,
          entityType: 'Provider',
          entityId: id.toString(),
          action: AuditAction.DELETED,
          summary: `Proveedor ${provider.name} eliminado`,
          diff: { before: provider } as any,
        },
        req,
      );

      return provider;
    } catch (error) {
      this.logIfUnexpected(error, 'remove');
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
      this.logIfUnexpected(error, 'removeMany');
      throw new InternalServerErrorException(
        'Hubo un error al eliminar los proveedores.',
      );
    }
  }
}

