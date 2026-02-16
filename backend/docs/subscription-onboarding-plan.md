# Pasarela de Pago y Onboarding Autoservicio

Este documento describe el plan integral para permitir que cualquier usuario cree una cuenta, reciba un tenant demo de 2 semanas y active planes pagados mediante una pasarela de pago. Incluye arquitectura, flujos operativos y la lista de tareas priorizadas.

## 1. Objetivos

- Exponer un landing público con pricing y flujo “Comenzar prueba”.
- Provisionar automáticamente `User`, `Tenant`, `Company` y datos demo al registrarse.
- Integrar una pasarela de pago (Stripe/MercadoPago/Culqi) que gestione trials, upgrades, downgrades y cancelaciones.
- Ofrecer portal de facturación self-service y paneles internos para soporte.
- Protegerse de fraude, cumplir requisitos legales (IGV/SUNAT) y garantizar observabilidad.

## Estado actual (dic/2025)

- [x] **F1 Fundamentos:** modelo `plans/subscriptions/payment_methods`, checkout mock con IGV, invoices propios y cron de trial. `TaxRateService` fija la tarifa por defecto y se registran las activaciones.
- [x] **F2 Landing + Auto-signup:** landing pública con reCAPTCHA, rate limiting y bloqueo de dominios desechables. `POST /public/signup` crea org/company/store, carga data demo, envía la verificación y define `trialEndsAt = 14 días`.
- [x] **F3 Onboarding in-app:** wizard y datasets demo listos, banner trial segmentado, quota meter en `/dashboard/account/plan` y UI para limpiar demo data. La exportación y limpieza automática se dispara al activar plan pago o al entrar en fase de cancelación (cron dedicado).
- [x] **F4 Billing Portal & Dunning:** `/dashboard/account/billing`, `/account/exports`, `/account/plan` y `/account/payment-methods` consumen las APIs reales. MercadoPago está integrado para checkout/dunning, upgrades/downgrades pro-rateados, cancelación self-service (encuesta + export previa) y multi-tarjeta. **Listo** el monitoreo con métricas Prometheus + alertas (archivo `monitoring/rules/subscriptions.rules.yml`) y runbook operativo en `docs/runbooks/subscriptions.md`.
- [ ] **F5 Migración + Optimización:** pendiente definir el “grandfathering” de clientes legacy, scripts de migración y comunicaciones (email + banners) antes del lanzamiento.

## 2. Modelo de datos y servicios

1. **Tablas nuevas**
   - `plans`: nombre, SKU, periodicidad (mensual/anual), currency, features/quotas JSON.
   - `subscriptions`: `tenantId`, `planId`, `status` (`trial`, `active`, `past_due`, `canceled`), `trialEndsAt`, `currentPeriodEnd`.
   - `subscription_invoices`: integración con comprobantes/facturas.
   - `payment_methods`: `tenantId`, `provider`, `externalId`, `last4`, `brand`, `status`.
2. **Servicios**
   - `BillingService`: crea sesiones de checkout, procesa webhooks, calcula prorrateos, genera créditos.
   - `TrialService`: provisioning demo, seguimiento `trialEndsAt`, limpieza de datos demo.
   - `QuotaService`: middleware que valida límites por plan (usuarios, productos, comprobantes/mes).
   - `FraudGuard`: rate limiting, validación de emails/IP, bloqueo de múltiples trials.

## 3. Landing y flujo público

1. **Sitio** (`/` o subdominio marketing):
   - Hero + trust signals, pricing table, calculadora de ROI.
   - CTA “Comenzar prueba” → formulario (nombre, email, password, país, giro/industria).
   - Integración reCAPTCHA + validación email corporativo opcional.
2. **Signup API**
   - `POST /public/signup`: valida datos, registra usuario, crea tenant, asigna plan `trial`.
   - Encola job para crear `company`, `org`, `store`, demo data (según industria elegida).
   - Envía email de verificación + instrucciones de onboarding.
   - ✅ Endpoint implementado con rate limiting, reCAPTCHA v3 (opcional) y bloqueo de dominios desechables. El formulario en la landing usa esa API y muestra el widget de reCAPTCHA.
3. **Trial**
   - Duración configurable (default 14 días). Guardar `trialEndsAt`.
   - Job diario que envía recordatorios (7/3/1 días) y suspende el tenant si no se activa.
   - ✅ Implementado: `POST /public/signup` provisiona organización/compañía/usuario Owner, genera data demo y dispara un trial `DEFAULT_TRIAL_PLAN_CODE`. La landing principal ya muestra el formulario “Comenzar prueba”.

## 4. Pasarela de pago

1. **Checkout**
   - Endpoint `POST /billing/checkout` → crea sesión con plan elegido (trial o pago directo).
   - Soportar múltiples monedas (USD, PEN) y cálculo de IGV 18 % (Perú) + IVA para otras regiones.
2. **Webhooks**
   - `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, etc.
   - Registrar en `subscription_invoices`, actualizar `subscriptions`.
   - Workflow de dunning: reintentos día 1, 3, 5, 7 + emails automáticos.
3. **Upgrades/downgrades**
   - Prorrateo automático (Stripe proration) o cálculo propio si la pasarela no soporta.
   - Opción de aplicar cambio inmediato o siguiente ciclo.
4. **Cancelaciones/downgrades**
   - UI self-service para bajar plan o cancelar.
   - Retención de datos configurable (30/60/90 días). Exportación CSV antes de eliminación.
   - Encuesta de salida (motivo de cancelación).

## 5. Onboarding in-app

1. **Wizard**
   - Pasos: (1) Datos de empresa, (2) Tiendas/almacenes, (3) Conectar SUNAT, (4) Carga inicial (importar CSV o usar demo).
   - Mostrar progreso + gamificación (badge cuando completan setup).
   - Botón “Limpiar datos demo y empezar de cero”.
2. **Demo datasets**
   - Kits por industria (retail, servicios, manufactura). Marcar registros `is_demo`.
   - Scripts para eliminar demo data al activar plan.
3. **Dashboards**
   - Banner sticky con días restantes de trial y botón "Actualizar plan".
   - ✅ Quota meter en Settings: uso / límite (usuarios, comprobantes, almacenamiento) ya visible en `/dashboard/account/plan`.
   - ⚠️ Automatizar limpieza/exportación cuando el tenant deja el modo prueba o cancela (hoy es manual).

## 6. Seguridad, fraude y cumplimiento

- **Rate limiting** en `POST /public/signup` y endpoints críticos.
- **Detection**: bloquear IPs/dispositivos que generen múltiples trials; validación de dominios desechables.
- **Captcha** para signup público.
- **Cumplimiento**:
  - IGV/IVA: tabla `tax_rates` y servicio que calcula impuestos por país/región.
  - SUNAT: generar boletas/facturas electrónicas, asociar a invoices de suscripción si corresponde.
  - Logs de auditoría para cambios de plan y pago.

## 7. Portal de facturación self-service

- Sección `/dashboard/account/billing`:
  - Ver plan actual, próximos cobros, historial de invoices.
  - Actualizar método de pago.
  - Descargar facturas PDF/UBL.
  - Trigger manual para reintentar pago fallido.

## 8. Observabilidad y alertas

### Métricas publicadas

El servicio `SubscriptionPrometheusService` incrementa counters en el mismo registro global de prom-client, por lo que `/api/metrics` muestra los valores sin configuración adicional. Los nombres expuestos son:

- `signup_started_total`
- `signup_completed_total{result="success|error"}`
- `trial_activated_total{plan}`
- `trial_converted_total{plan}`
- `subscription_canceled_total{mode}`
- `subscription_webhook_events_total{provider,type,result}`
- `subscription_dunning_attempts_total{result="success|failed|retry_exhausted"}`
- `subscription_dunning_job_runs_total{result="success|error"}`

Para verificarlos basta correr `curl http://localhost:4000/api/metrics | Select-String "subscription_"`. Si Prometheus no está disponible, el helper escribe la entrada `[analytics]` en los logs.

### Alertas operativas

Las reglas oficiales viven en `monitoring/rules/subscriptions.rules.yml` y se cargan en Prometheus (`rule_files: ["rules/subscriptions.rules.yml"]`). Incluyen:

```yaml
- alert: SpikeSubscriptionCancellations
  expr: increase(subscription_canceled_total[15m]) > 5
- alert: SubscriptionWebhookFailures
  expr: increase(subscription_webhook_events_total{result="failed"}[5m]) > 0
- alert: SubscriptionDunningExhausted
  expr: increase(subscription_dunning_attempts_total{result="retry_exhausted"}[1h]) > 0
```

Alertmanager enruta estos eventos al canal `billing-oncall` (Slack/email). El runbook `docs/runbooks/subscriptions.md` detalla cómo responder (ver logs, reintentar webhook en MercadoPago, forzar `retryInvoice`, etc.).

### Pendiente

- Construir dashboards de conversión, drop-offs y cohorts (Grafana/Looker) usando estas métricas.
- Automatizar comunicaciones post-alerta (emails y tareas de soporte).
- Completar la migración legacy (sección 9).

## 9. Migración de usuarios existentes

- **Pendiente de ejecución (F5).** El feature autoservicio ya funciona para nuevas cuentas, pero falta el plan de migración:
  - Definir estrategia de “grandfathering” y qué plan (`legacy`) se asignará a clientes actuales, incluyendo precios y fecha límite.
  - Scripts para migrar masivamente (`subscription.planId`, `status = active`, `trialEndsAt = null`, regenerar facturación si procede).
  - Comunicaciones: emails, banners in-app y FAQ para acompañar el cambio.
  - UI o wizard para que un admin legacy pueda seleccionar el nuevo plan y completar checkout (aprovechando la misma vista de upgrades).

## 10. Roadmap sugerido (actualizado)

| Fase | Duración | Alcance |
| --- | --- | --- |
| **F1: Fundamentos** | 2 sprint | Modelo de datos, pasarela (checkout + webhooks), servicio de trial, jobs y alertas básicas. |
| **F2: Landing + Auto-signup** | 1 sprint | Marketing site, formulario público, provisioning automático, seguridad (captcha, rate limit). |
| **F3: Onboarding in-app** | 1 sprint | Wizard, demo datasets, banners de trial, quota meters. |
| **F4: Billing Portal & Dunning** | ✅ | Integrado contra MercadoPago (checkout real, dunning 1/3/5/7, cron de cancelación/export, portal self-service completo). **Falta** monitoreo, alertas y runbooks de soporte. |
| **F5: Migración + Optimización** | 1 sprint | Migrar clientes existentes (grandfathering), scripts y comunicaciones. Considerar mejoras UX/referral program. |

## 11. Checklist antes del Go-Live

- [ ] Feature flags configurados (permite rollback).
- [ ] Suites e2e (Cypress/Playwright) cubriendo signup → trial → upgrade → cancelación.
- [ ] Observabilidad: métricas + alertas para webhooks/dunning; runbooks de soporte.
- [ ] Documentación de soporte (FAQs, scripts de migración, manual de facturación).
- [ ] Plan de migración (grandfathering) comunicando fechas y pasos.
- [ ] Backups verificados y plan de recuperación probado.

---

Con este plan podemos implementar un flujo autoservicio completo, escalable y alineado con las mejores prácticas de suscripción SaaS. Cada fase puede desarrollarse y desplegarse incrementalmente bajo feature flags para minimizar riesgo. 

## 12. Runbooks y soporte

- Se documento el procedimiento operativo en docs/runbooks/subscriptions.md. El runbook explica como consultar las metricas publicadas (kubectl port-forward svc/billing-metrics 9000:9000, ejemplos de PromQL), como responder a cada alerta (revisar logs de SubscriptionsService, reintentar webhook desde MercadoPago, forzar 
etryInvoice, activar job de dunning manual) y el flujo de escalamiento (Soporte N1 ? Billing Oncall ? Producto/Comercial).
- El documento tambien lista los scripts de soporte planificados (backend/scripts/assign-legacy-plan.ts, backend/scripts/schedule-migration.ts) y el endpoint administrativo POST /api/admin/subscriptions/:orgId/migrate; hoy siguen marcados como **pendientes**, pero el runbook ya describe el contrato esperado para cuando se implementen.
