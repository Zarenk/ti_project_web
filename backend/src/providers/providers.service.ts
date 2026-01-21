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
import * as xlsx from 'xlsx';
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

  parseExcel(filePath: string): any[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { raw: false });

    const cleanedData = rawData.map((row: any) => {
      const cleanedRow: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        const cleanKey = key.trim();
        const value = row[key];
        cleanedRow[cleanKey] = typeof value === 'string' ? value.trim() : value;
      });
      return cleanedRow;
    });

    return cleanedData;
  }

  private normalizeProviderDocument(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toUpperCase();
    if (normalized === 'DNI') return 'DNI';
    if (normalized === 'RUC') return 'RUC';
    if (normalized === 'OTRO DOCUMENTO' || normalized === 'OTRO') {
      return 'Otro Documento';
    }
    return null;
  }

  private normalizeOptionalField(value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return String(value);
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  async processExcelData(
    data: any[],
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new BadRequestException('No se encontraron datos para importar.');
    }

    const errors: string[] = [];
    const seenDocumentNumbers = new Set<string>();
    const payload: Prisma.ProviderCreateManyInput[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const name = this.normalizeOptionalField(row?.name);
      const document = this.normalizeProviderDocument(row?.document);
      const documentNumberRaw =
        typeof row?.documentNumber === 'number'
          ? String(row.documentNumber)
          : typeof row?.documentNumber === 'string'
            ? row.documentNumber.trim()
            : '';
      const documentNumber = documentNumberRaw.replace(/\s+/g, '');

      if (!name) {
        errors.push(`Fila ${rowNumber}: El campo name es obligatorio.`);
      }

      if (!document) {
        errors.push(
          `Fila ${rowNumber}: El campo document debe ser DNI, RUC u Otro Documento.`,
        );
      }

      if (!documentNumber) {
        errors.push(
          `Fila ${rowNumber}: El campo documentNumber es obligatorio.`,
        );
      } else if (document === 'DNI' && !/^\d{8}$/.test(documentNumber)) {
        errors.push(
          `Fila ${rowNumber}: El documentNumber debe tener 8 digitos para DNI.`,
        );
      } else if (document === 'RUC' && !/^\d{11}$/.test(documentNumber)) {
        errors.push(
          `Fila ${rowNumber}: El documentNumber debe tener 11 digitos para RUC.`,
        );
      }

      if (documentNumber) {
        if (seenDocumentNumbers.has(documentNumber)) {
          errors.push(
            `Fila ${rowNumber}: documentNumber duplicado en el archivo.`,
          );
        }
        seenDocumentNumbers.add(documentNumber);
      }

      const statusRaw = this.normalizeOptionalField(row?.status);
      const status =
        statusRaw && statusRaw.toLowerCase() === 'inactivo'
          ? 'Inactivo'
          : 'Activo';

      payload.push({
        name: name ?? '',
        document: document ?? 'Otro Documento',
        documentNumber,
        description: this.normalizeOptionalField(row?.description),
        phone: this.normalizeOptionalField(row?.phone),
        adress: this.normalizeOptionalField(row?.adress),
        email: this.normalizeOptionalField(row?.email),
        website: this.normalizeOptionalField(row?.website),
        image: this.normalizeOptionalField(row?.image),
        status,
        organizationId: organizationIdFromContext ?? null,
      });
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Se encontraron errores en el archivo.',
        errors,
      });
    }

    const documentNumbers = payload
      .map((row) => row.documentNumber)
      .filter((value): value is string => Boolean(value));

    const existing = await this.prismaService.provider.findMany({
      where: {
        documentNumber: { in: documentNumbers },
        ...buildOrganizationFilter(organizationIdFromContext),
      },
      select: { documentNumber: true },
    });

    if (existing.length > 0) {
      const duplicates = existing.map((item) => item.documentNumber);
      throw new ConflictException(
        `Ya existen proveedores con estos documentos: ${duplicates.join(', ')}.`,
      );
    }

    const result = await this.prismaService.provider.createMany({
      data: payload,
    });

    logOrganizationContext({
      service: ProvidersService.name,
      operation: 'importExcel',
      organizationId: organizationIdFromContext ?? undefined,
      metadata: { count: result.count },
    });

    await this.activityService.log(
      {
        actorId: (req as any)?.user?.userId,
        actorEmail: (req as any)?.user?.username,
        entityType: 'Provider',
        action: AuditAction.CREATED,
        summary: `${result.count} proveedor(es) importado(s)`,
      },
      req,
    );

    return {
      message: `${result.count} proveedor(es) importado(s) correctamente.`,
      count: result.count,
    };
  }

  async create(
    createProviderDto: CreateProviderDto,
    req?: Request,
    organizationIdFromContext?: number | null,
  ) {
    try {
      const { organizationId, ...providerPayload } =
        createProviderDto as CreateProviderDto & {
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
    try {
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
          : ((providerFound as { organizationId?: number | null })
              ?.organizationId ?? null);

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
    } catch (error) {
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
      orderBy: { name: 'asc' },
    });

    const resolvedOrganizationId =
      organizationIdFromContext !== undefined
        ? organizationIdFromContext
        : ((provider as { organizationId?: number | null })?.organizationId ??
          null);

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

      const {
        id: _id,
        organizationId,
        ...providerPayload
      } = updateProviderDto as UpdateProviderDto & {
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

      if (!providerFound) {
        throw new NotFoundException(`Provider with id ${id} not found`);
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El proveedor con el RUC "${updateProviderDto.name}" ya existe.`,
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
      throw new BadRequestException(
        'No se proporcionaron proveedores para actualizar.',
      );
    }

    try {
      // Validar que todos los productos tengan un ID válido
      const invalidProviders = providers.filter(
        (provider) => !provider.id || isNaN(Number(provider.id)),
      );
      if (invalidProviders.length > 0) {
        throw new BadRequestException(
          'Todos los proveedores deben tener un ID válido.',
        );
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
          const {
            organizationId,
            id: providerId,
            ...rest
          } = provider as UpdateProviderDto & {
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
              (existing as { organizationId?: number | null }).organizationId ??
                null,
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
          throw new NotFoundException(
            'Uno o mas proveedores no fueron encontrados.',
          );
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
          `No se puede eliminar el proveedor con ID ${id} porque tiene entradas relacionadas.`,
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

      const providerOrganizationId = (
        provider as { organizationId?: number | null }
      ).organizationId;

      logOrganizationContext({
        service: ProvidersService.name,
        operation: 'remove',
        organizationId:
          providerOrganizationId !== undefined
            ? providerOrganizationId
            : (organizationIdFromContext ?? undefined),
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
      throw new NotFoundException(
        'No se proporcionaron IDs válidos para eliminar.',
      );
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
          (accessibleProviders[0] as { organizationId?: number | null })
            ?.organizationId ??
          null,
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
