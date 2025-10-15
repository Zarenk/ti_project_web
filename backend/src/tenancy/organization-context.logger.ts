import { Logger } from '@nestjs/common';
import { Counter, register } from 'prom-client';

export interface OrganizationContextLogOptions {
  service: string;
  operation: string;
  organizationId?: number | null;
  metadata?: Record<string, unknown>;
}

type OrganizationLogger = Pick<Logger, 'log' | 'warn'>;

type OrganizationContextMetricLabels = {
  service: string;
  operation: string;
  hasOrganizationId: 'yes' | 'no';
};

interface OrganizationContextMetrics {
  incrementTotal(labels: OrganizationContextMetricLabels): void;
}

let organizationLogger: OrganizationLogger = new Logger('OrganizationContext');
let metricsRecorder: OrganizationContextMetrics = createDefaultMetricsRecorder();

export function setOrganizationContextLogger(logger: OrganizationLogger) {
  organizationLogger = logger;
}

export function resetOrganizationContextLogger() {
  organizationLogger = new Logger('OrganizationContext');
}

export function setOrganizationContextMetrics(recorder: OrganizationContextMetrics) {
  metricsRecorder = recorder;
}

export function resetOrganizationContextMetrics() {
  metricsRecorder = createDefaultMetricsRecorder();
}

function createDefaultMetricsRecorder(): OrganizationContextMetrics {
  const counter = getOrCreateOrganizationContextCounter();
  return {
    incrementTotal: ({ service, operation, hasOrganizationId }) =>
      counter.inc({ service, operation, hasOrganizationId }),
  };
}

function getOrCreateOrganizationContextCounter(): Counter<
  'service' | 'operation' | 'hasOrganizationId'
> {
  const existing = register.getSingleMetric('organization_context_events_total');
  if (existing) {
    return existing as Counter<'service' | 'operation' | 'hasOrganizationId'>;
  }

  return new Counter({
    name: 'organization_context_events_total',
    help: 'Count of organization context events grouped by service, operation and organizationId presence.',
    labelNames: ['service', 'operation', 'hasOrganizationId'],
  });
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

  const hasOrganizationId =
    organizationId === null || organizationId === undefined ? 'no' : 'yes';

  metricsRecorder.incrementTotal({
    service,
    operation,
    hasOrganizationId,
  });

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