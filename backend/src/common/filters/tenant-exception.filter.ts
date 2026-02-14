import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

@Catch()
export class TenantExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TenantExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const tenant = (request as any).tenantContext as
      | TenantContext
      | undefined;

    this.logger.error({
      error: message,
      statusCode: status,
      method: request.method,
      path: request.url,
      organizationId: tenant?.organizationId ?? null,
      companyId: tenant?.companyId ?? null,
      userId: tenant?.userId ?? null,
      timestamp: new Date().toISOString(),
      ...(exception instanceof Error && status >= 500
        ? { stack: exception.stack }
        : {}),
    });

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
