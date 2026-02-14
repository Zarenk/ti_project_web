import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

const logger = new Logger('PrismaErrorHandler');

/**
 * Maps Prisma errors to appropriate NestJS HTTP exceptions.
 * Re-throws HttpExceptions as-is so business-logic exceptions are preserved.
 *
 * Usage:
 * ```
 * try { ... } catch (error) { handlePrismaError(error); }
 * ```
 */
export function handlePrismaError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  logger.error(
    error instanceof Error ? error.message : error,
    error instanceof Error ? error.stack : undefined,
  );

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictException(
          `Ya existe un registro con esos datos: ${(error.meta?.target as string[])?.join(', ') ?? 'campo único'}`,
        );
      case 'P2025':
        throw new NotFoundException(
          (error.meta?.cause as string) ?? 'Registro no encontrado',
        );
      case 'P2003':
        throw new BadRequestException(
          'Referencia inválida: el registro relacionado no existe.',
        );
      case 'P2014':
        throw new ConflictException(
          'No se puede eliminar porque tiene registros dependientes.',
        );
      default:
        throw new InternalServerErrorException(
          'Error de base de datos inesperado',
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new BadRequestException(
      'Datos inválidos enviados a la base de datos',
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new InternalServerErrorException(
      'Error de conexión a la base de datos',
    );
  }

  throw new InternalServerErrorException('Error inesperado del servidor');
}
