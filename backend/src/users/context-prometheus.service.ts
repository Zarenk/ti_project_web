import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

/**
 * Servicio ligero que expone métricas Prometheus relacionadas al contexto.
 * - Contabiliza actualizaciones exitosas/fallidas.
 * - Observa la latencia de cada PATCH /users/me/last-context.
 * - Cuenta cuantos rate-limit (429) ocurren.
 *
 * Nota: prom-client usa un registro global; no es necesario crear uno nuevo.
 */
@Injectable()
export class ContextPrometheusService {
  private readonly updateCounter = new Counter({
    name: 'context_update_total',
    help: 'Total de actualizaciones de contexto procesadas',
    labelNames: ['result'],
  });

  private readonly updateLatency = new Histogram({
    name: 'context_update_latency_ms',
    help: 'Latencia en milisegundos de PATCH /users/me/last-context',
    labelNames: ['result'],
    buckets: [25, 50, 100, 250, 500, 1000, 2000],
  });

  private readonly rateLimitCounter = new Counter({
    name: 'context_rate_limit_total',
    help: 'Cantidad de rate limits aplicados a PATCH /users/me/last-context',
  });

  /**
   * Registra el resultado de una actualización (éxito o error).
   * @param result 'success' cuando se persiste correctamente; 'error' si se lanza alguna excepción.
   * @param latencyMs Latencia total de la operación para alimentar el histograma.
   */
  recordContextUpdate(result: 'success' | 'error', latencyMs?: number) {
    this.updateCounter.inc({ result });
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
      this.updateLatency.observe({ result }, latencyMs);
    }
  }

  /**
   * Registra un evento de rate limit (HTTP 429) para poder alertar en Grafana.
   */
  recordRateLimitHit() {
    this.rateLimitCounter.inc();
  }

  /**
   * Devuelve el dump completo de métricas en formato Prometheus.
   * Este texto se expone vía HTTP para que Prometheus pueda scrapearlo.
   */
  async getMetricsSnapshot(): Promise<string> {
    return register.metrics();
  }
}
