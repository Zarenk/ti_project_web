import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

/**
 * 🔒 Entity Ownership Guard
 *
 * Valida que una entidad (Sale, Entry, Invoice, etc.) pertenece al tenant actual
 * antes de permitir acceso. Previene fugas de datos multi-tenant.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @UseGuards(EntityOwnershipGuard)
 * @EntityModel('sales') // nombre de la tabla en Prisma
 * @EntityIdParam('id')   // nombre del parámetro en la ruta
 * async getSale(@Param('id') id: string) {
 *   // Si llega aquí, la sale pertenece al tenant
 * }
 * ```
 */
@Injectable()
export class EntityOwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Obtener metadata del decorator
    const entityModel = this.reflector.get(
      EntityModel,
      context.getHandler(),
    );
    const entityIdParam = this.reflector.get(
      EntityIdParam,
      context.getHandler(),
    );

    if (!entityModel || !entityIdParam) {
      // Si no hay metadata, skip guard (el desarrollador debe configurarlo)
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request.tenantContext;
    const entityId = request.params[entityIdParam];

    if (!entityId) {
      throw new NotFoundException(`Parámetro ${entityIdParam} no encontrado.`);
    }

    // Convertir a número si es necesario
    const parsedId = isNaN(Number(entityId)) ? entityId : Number(entityId);

    // Verificar ownership
    const entity = await this.findEntityWithTenant(
      entityModel,
      parsedId,
      tenantContext,
    );

    if (!entity) {
      // Verificar si existe en otro tenant (information disclosure prevention)
      const existsInOtherTenant = await this.entityExistsGlobally(
        entityModel,
        parsedId,
      );

      if (existsInOtherTenant) {
        throw new ForbiddenException(
          `El recurso ${entityModel}#${parsedId} no pertenece a esta organización.`,
        );
      }

      throw new NotFoundException(
        `${entityModel} con ID ${parsedId} no encontrado.`,
      );
    }

    // Entity pertenece al tenant, permitir acceso
    return true;
  }

  private async findEntityWithTenant(
    model: string,
    id: number | string,
    tenant: TenantContext | undefined,
  ): Promise<any> {
    const where: any = { id };

    // Agregar filtros de tenant si están disponibles
    if (tenant?.organizationId !== undefined) {
      where.organizationId = tenant.organizationId;
    }

    if (tenant?.companyId !== undefined) {
      where.companyId = tenant.companyId;
    }

    try {
      return await (this.prisma as any)[model].findFirst({
        where,
        select: { id: true },
      });
    } catch (error) {
      throw new Error(
        `Modelo "${model}" no existe en Prisma schema o no tiene los campos organizationId/companyId.`,
      );
    }
  }

  private async entityExistsGlobally(
    model: string,
    id: number | string,
  ): Promise<boolean> {
    try {
      const entity = await (this.prisma as any)[model].findUnique({
        where: { id },
        select: { id: true },
      });
      return !!entity;
    } catch {
      return false;
    }
  }
}

/**
 * Decorator para especificar el modelo de Prisma a validar
 *
 * @param modelName - Nombre del modelo en Prisma (ej: 'sales', 'entry', 'invoice')
 */
export const EntityModel = Reflector.createDecorator<string>();

/**
 * Decorator para especificar el parámetro de ruta que contiene el ID
 *
 * @param paramName - Nombre del parámetro en @Param() (ej: 'id', 'saleId')
 */
export const EntityIdParam = Reflector.createDecorator<string>();
