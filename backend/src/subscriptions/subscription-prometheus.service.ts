import { Injectable, Logger } from '@nestjs/common';
import { Counter } from 'prom-client';

type SignupResult = 'success' | 'error';
type DunningAttemptResult = 'success' | 'failed' | 'retry_exhausted';
type DunningJobResult = 'success' | 'error';
type WebhookResult = 'success' | 'failed';

function normalizeLabel(value?: string | null, fallback = 'unknown') {
  if (!value) {
    return fallback;
  }
  return String(value).trim().toLowerCase() || fallback;
}

function normalizePlan(planCode?: string | null) {
  if (!planCode) {
    return 'unknown';
  }
  return String(planCode).trim().slice(0, 48);
}

@Injectable()
export class SubscriptionPrometheusService {
  private readonly logger = new Logger(SubscriptionPrometheusService.name);

  private readonly signupStartedCounter = new Counter({
    name: 'signup_started_total',
    help: 'Numero de intentos de signup publico iniciados',
  });

  private readonly signupCompletedCounter = new Counter({
    name: 'signup_completed_total',
    help: 'Intentos de signup publico finalizados (exito o error)',
    labelNames: ['result'],
  });

  private readonly trialActivatedCounter = new Counter({
    name: 'trial_activated_total',
    help: 'Trials activados para organizaciones nuevas',
    labelNames: ['plan'],
  });

  private readonly trialConvertedCounter = new Counter({
    name: 'trial_converted_total',
    help: 'Trials convertidos a planes pagados',
    labelNames: ['plan'],
  });

  private readonly subscriptionCanceledCounter = new Counter({
    name: 'subscription_canceled_total',
    help: 'Suscripciones canceladas',
    labelNames: ['mode'],
  });

  private readonly webhookEventsCounter = new Counter({
    name: 'subscription_webhook_events_total',
    help: 'Eventos de webhooks procesados por el modulo de billing',
    labelNames: ['provider', 'type', 'result'],
  });

  private readonly dunningAttemptsCounter = new Counter({
    name: 'subscription_dunning_attempts_total',
    help: 'Intentos del workflow de dunning',
    labelNames: ['result'],
  });

  private readonly dunningJobsCounter = new Counter({
    name: 'subscription_dunning_job_runs_total',
    help: 'Ejecuciones del cron de dunning',
    labelNames: ['result'],
  });

  recordSignupStarted() {
    this.safeIncrement(this.signupStartedCounter, null, 'signup_started');
  }

  recordSignupCompleted(result: SignupResult) {
    this.safeIncrement(
      this.signupCompletedCounter,
      { result },
      'signup_completed',
      { result },
    );
  }

  recordTrialActivated(planCode?: string | null) {
    const plan = normalizePlan(planCode);
    this.safeIncrement(
      this.trialActivatedCounter,
      { plan },
      'trial_activated',
      { plan },
    );
  }

  recordTrialConverted(planCode?: string | null) {
    const plan = normalizePlan(planCode);
    this.safeIncrement(
      this.trialConvertedCounter,
      { plan },
      'trial_converted',
      { plan },
    );
  }

  recordSubscriptionCanceled(mode: string) {
    const normalized = normalizeLabel(mode);
    this.safeIncrement(
      this.subscriptionCanceledCounter,
      { mode: normalized },
      'subscription_canceled',
      { mode: normalized },
    );
  }

  recordWebhookEvent(
    provider?: string | null,
    type?: string | null,
    result: WebhookResult = 'success',
  ) {
    const payload = {
      provider: normalizeLabel(provider),
      type: normalizeLabel(type, 'unknown'),
      result,
    };
    this.safeIncrement(
      this.webhookEventsCounter,
      payload,
      'subscription_webhook_event',
      payload,
    );
  }

  recordDunningAttempt(result: DunningAttemptResult) {
    this.safeIncrement(
      this.dunningAttemptsCounter,
      { result },
      'subscription_dunning_attempt',
      { result },
    );
  }

  recordDunningJobRun(result: DunningJobResult) {
    this.safeIncrement(
      this.dunningJobsCounter,
      { result },
      'subscription_dunning_job_run',
      { result },
    );
  }

  private safeIncrement(
    counter: Counter<string>,
    labels?: Record<string, string> | null,
    analyticsEvent?: string,
    analyticsPayload?: Record<string, any>,
  ) {
    try {
      if (labels) {
        counter.inc(labels);
      } else {
        counter.inc();
      }
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : JSON.stringify(error);
      const metricName =
        (counter as { name?: string })?.name ?? analyticsEvent ?? 'unknown';
      this.logger.warn(
        `No se pudo actualizar el metric ${metricName}: ${reason}`,
      );
      if (analyticsEvent) {
        this.logAnalyticsEvent(analyticsEvent, {
          ...(analyticsPayload ?? {}),
          labels,
          error: reason,
        });
      }
    }
  }

  private logAnalyticsEvent(event: string, payload?: Record<string, any>) {
    const entry = {
      event,
      ts: new Date().toISOString(),
      ...(payload ?? {}),
    };
    this.logger.log(`[analytics] ${JSON.stringify(entry)}`);
  }
}
