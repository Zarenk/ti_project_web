# Runbook – Subscripciones & Billing

Este runbook centraliza los pasos para operar el módulo de suscripciones y reaccionar ante alertas.

## 1. Consultar métricas / PromQL

1. Port-forward (si Prometheus no es público):
   ```bash
   kubectl port-forward svc/backend 4000:4000
   curl http://localhost:4000/api/metrics | grep subscription_
   ```
2. Consultas comunes en Prometheus:
   - Cancelaciones por hora:
     ```promql
     rate(subscription_canceled_total[1h])
     ```
   - Webhooks fallidos por proveedor:
     ```promql
     increase(subscription_webhook_events_total{result="failed"}[5m])
     ```
   - Dunning agotado:
     ```promql
     increase(subscription_dunning_attempts_total{result="retry_exhausted"}[1h])
     ```

## 2. Alertas y respuesta

| Alerta | Acción |
| --- | --- |
| SpikeCancelaciones | Revisar `SubscriptionsService.cancelSubscription` en logs; confirmar si se trata de downgrade masivo, bug o ataque. |
| WebhookFailures | Revisar `subscription_webhook_events_total` por `provider/type`; reenviar desde MercadoPago y verificar `handleProviderWebhook`. |
| DunningExhausted | Revisar la organización afectada, contactar al cliente y usar `/api/subscriptions/me/change-plan` para reactivar manualmente. |

Todas las alertas se reciben en Slack (`#billing-oncall`) y email. Si la alerta persiste > 15 min, escalar a Producto.

## 3. Scripts de soporte

- `backend/scripts/assign-legacy-plan.ts`: asigna plan `legacy`, limpia `trialEndsAt`, setea `metadata.legacyGraceUntil`.
- `backend/scripts/schedule-migration.ts`: programa `pendingPlanChange { planCode, effectiveAt }` para un set de organizaciones.
- Uso general:
  ```bash
  cd backend
  npx ts-node scripts/assign-legacy-plan.ts --orgIds 1,2,3 --graceUntil 2025-03-31
  ```

## 4. Endpoint administrativo

- `POST /api/admin/subscriptions/:orgId/migrate` (sólo Global Super Admin). Body esperado:
  ```json
  { "planCode": "growth", "effectiveAt": "2025-02-01T00:00:00Z" }
  ```
- El endpoint usa `SubscriptionsService.requestPlanChange`, genera `pendingPlanChange` y registra auditoría.

## 5. Escalamiento

1. Soporte Nivel 1 (chat/onboarding) ejecuta los pasos del runbook.
2. Si no hay respuesta en 30 minutos, ping a `billing-oncall` (Slack).
3. Severo (`severity=critical`) → escalar a Gerencia de Producto/Comercial y pausar campañas de marketing hasta resolver.

Documentar siempre en el ticket correspondiente los pasos y métricas revisadas.
