import { Logger } from '@nestjs/common';

export interface OrganizationContextLogOptions {
  service: string;
  operation: string;
  organizationId?: number | null;
  metadata?: Record<string, unknown>;
}

type OrganizationLogger = Pick<Logger, 'log' | 'warn'>;

let organizationLogger: OrganizationLogger = new Logger('OrganizationContext');

export function setOrganizationContextLogger(logger: OrganizationLogger) {
  organizationLogger = logger;
}

export function resetOrganizationContextLogger() {
  organizationLogger = new Logger('OrganizationContext');
}

export function logOrganizationContext({
  service,
  operation,
  organizationId,
  metadata,
}: OrganizationContextLogOptions) {
  const metadataSuffix =
    metadata && Object.keys(metadata).length > 0
      ? ` | metadata=${JSON.stringify(metadata)}`
      : '';

  if (organizationId === null || organizationId === undefined) {
    organizationLogger.warn(
      `[${service}.${operation}] executed without organizationId${metadataSuffix}`,
    );
    return;
  }

  organizationLogger.log(
    `[${service}.${operation}] organizationId=${organizationId}${metadataSuffix}`,
  );
}