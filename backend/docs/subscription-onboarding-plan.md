# Pasarela de Pago y Onboarding Autoservicio

Este documento describe el plan integral para permitir que cualquier usuario cree una cuenta, reciba un tenant demo de 2 semanas y active planes pagados mediante una pasarela de pago. Incluye arquitectura, flujos operativos y la lista de tareas priorizadas.

## 1. Objetivos

- Exponer un landing público con pricing y flujo “Comenzar prueba”.
- Provisionar automáticamente `User`, `Tenant`, `Company` y datos demo al registrarse.
- Integrar una pasarela de pago (Stripe/MercadoPago/Culqi) que gestione trials, upgrades, downgrades y cancelaciones.
- Ofrecer portal de facturación self-service y paneles internos para soporte.
- Protegerse de fraude, cumplir requisitos legales (IGV/SUNAT) y garantizar observabilidad.

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
   - Banner sticky con días restantes de trial y botón “Actualizar plan”.
   - Quota meter en Settings: uso / límite (usuarios, comprobantes, almacenamiento).

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

- Métricas clave:
  - `signup_started`, `signup_completed`, `trial_activated`, `trial_converted`, `subscription_canceled`.
  - Cohorts de retención.
  - Funnel drop-offs (landing → checkout → activación).
- Alertas:
  - Spike de cancelaciones.
  - Webhook failures.
  - Cobros fallidos consecutivos > N.
- Paneles internos (Grafana/Looker) + alertas Slack/Email.

## 9. Migración de usuarios existentes

- Estrategia:
  - “Grandfather” de clientes actuales en plan legacy durante X meses.
  - UI para que el admin seleccione nuevo plan → checkout.
  - Comunicaciones: email + banner in-app explicando cambios y fechas.
- Script de migración: asignar plan `legacy`, `subscription.status = active`, `trialEndsAt = null`.

## 10. Roadmap sugerido

| Fase | Duración | Alcance |
| --- | --- | --- |
| **F1: Fundamentos** | 2 sprint | Modelo de datos, pasarela (checkout + webhooks), servicio de trial, jobs y alertas básicas. |
| **F2: Landing + Auto-signup** | 1 sprint | Marketing site, formulario público, provisioning automático, seguridad (captcha, rate limit). |
| **F3: Onboarding in-app** | 1 sprint | Wizard, demo datasets, banners de trial, quota meters. |
| **F4: Billing Portal & Dunning** | 1 sprint | Portal de facturación, historial de invoices, reintentos automáticos, correos de dunning. |
| **F5: Migración + Optimización** | 1 sprint | Migrar clientes existentes, referral program (opcional), mejoras UX. |

## 11. Checklist antes del Go-Live

- [ ] Feature flags configurados (permite rollback).
- [ ] Suites e2e (Cypress/Playwright) cubriendo signup → trial → upgrade → cancelación.
- [ ] Webhooks monitoreados (reenvío automático si fallan).
- [ ] Documentación de soporte (FAQs, scripts de migración, manual de facturación).
- [ ] Backups verificados y plan de recuperación probado.

---

Con este plan podemos implementar un flujo autoservicio completo, escalable y alineado con las mejores prácticas de suscripción SaaS. Cada fase puede desarrollarse y desplegarse incrementalmente bajo feature flags para minimizar riesgo. 
