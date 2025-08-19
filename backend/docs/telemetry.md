# Telemetry and Monitoring

This service exposes OpenTelemetry traces and Prometheus metrics.

## Prometheus Metrics

- `provider_requests_total{provider, status}` – counts provider operations and success rate per provider.
- `request_latency_ms` – histogram for request latency, used for P95 calculations.
- `campaign_cost_total{campaign}` – gauge recording cost per campaign.
- `moderation_hits_total{provider}` – counts moderation failures.
- `retry_total{provider}` – retry attempts per provider.
- `dlq_depth{queue}` – depth of dead letter queues.

### PromQL Examples

- **Success rate per provider**
  ```promql
  sum(rate(provider_requests_total{status="success"}[5m])) by (provider)
  /
  sum(rate(provider_requests_total[5m])) by (provider)
  ```
- **P95 request latency**
  ```promql
  histogram_quantile(0.95, sum(rate(request_latency_ms_bucket[5m])) by (le))
  ```
- **Average campaign cost**
  ```promql
  avg(campaign_cost_total)
  ```
- **Moderation hit rate**
  ```promql
  rate(moderation_hits_total[5m])
  ```
- **Retry count per provider**
  ```promql
  rate(retry_total[5m]) by (provider)
  ```
- **Dead letter queue depth**
  ```promql
  dlq_depth
  ```

## Alerting Suggestions

- Trigger an alert if success rate per provider drops below 95% for 10 minutes.
- Alert when P95 latency exceeds 1s over a 5‑minute window.
- Alert if any `dlq_depth` remains above 0 for more than 5 minutes.

## Dashboard

Use these metrics to build a Grafana dashboard for end‑to‑end visibility. Import the metrics and create panels for each of the queries above.