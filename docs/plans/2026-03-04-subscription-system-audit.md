# Auditoria Tecnica: Sistema de Suscripciones, Trial y Pagos

**Fecha:** 2026-03-04
**Calificacion:** 8.5/10 como documento de arquitectura/operacion
**Estado:** Aprobado para ejecucion

---

## FLUJO COMPLETO: Signup → Dashboard → Pagos

### 1. Signup (3 pasos)
```
/signup → wizard (cuenta, negocio, confirmar + reCAPTCHA)
  ↓
POST /api/public/signup (transaccion atomica)
  ├─ Organization + Company + User(SUPER_ADMIN_ORG) + Membership
  ├─ Demo Data (1 cat + 1 prod + 1 tienda por vertical)
  ├─ Trial Subscription (14 dias) [post-tx, no-bloqueante]
  └─ Email verificacion (48h token) [post-tx, no-bloqueante]
  ↓
/portal/login?welcome=1
```

### 2. Verificacion Email
- Token 32-byte hex, 48h expiry
- REQUERIDO para login (isPublicSignup users)
- Reenvio disponible

### 3. Login → Dashboard
```
Login → JWT 3h + refresh 7d → /dashboard
  ├─ Auth context detecta isPublicSignup + onboarding incompleto
  ├─ → Redirect /dashboard/onboarding (4 pasos opcionales)
  ├─ TrialStatusBanner (dias restantes)
  └─ OnboardingWizardBanner (pasos pendientes)
```

### 4. Onboarding Wizard (4 pasos opcionales)
1. Datos de Empresa (RUC, legal name, direccion)
2. Tiendas/Almacenes (crear stores)
3. Conectar SUNAT (credenciales SOL)
4. Importacion/Demo data

### 5. Ciclo de Suscripcion
```
TRIAL (14 dias — acceso completo)
  ↓ warnings email: 7, 3, 1 dias (cron 5AM)
  ↓ daysLeft=0
PAST_DUE (grace limits activos)
  ├→ Pago exitoso → ACTIVE (limits removidos)
  └→ Dunning: reintento dia 1, 3, 5, 7
       └→ 4 fallos → cancelAtPeriodEnd=true → CANCELED
```

### 6. Grace Limits (PAST_DUE)
```
users: 1, invoices: 50, storageMB: 512
```

### 7. Pagos (Mercado Pago)
```
Checkout → MP → Webhook → applyInvoicePayment/Failure
```

---

## PROBLEMAS IDENTIFICADOS

### CRITICOS (Fuga de Revenue/Costo)

#### P1 — SUNAT sin gating de suscripcion
- Transmision SUNAT no verifica suscripcion activa
- Usuario con trial vencido puede seguir facturando electronicamente
- **REGLA DE NEGOCIO**: Si se vence el trial, NO debe poder facturar
- **Impacto**: Fuga de revenue + costo de API SUNAT

#### P2 — WhatsApp sin gating
- Conexion WhatsApp consume recursos del servidor permanentemente
- Sin limite por plan ni verificacion de suscripcion
- **Impacto**: Costo de servidor

#### P3 — Gating disperso por modulo
- `ensureQuota()` solo en sales, users, storage
- Guias de remision, notas de credito, contabilidad sin verificar
- Nuevos modulos pueden nacer sin gating (patron de "huecos")

### IMPORTANTES (Seguridad/Confiabilidad)

#### P4 — Webhook Mercado Pago sin proteccion completa
- Falta validacion de firma del webhook
- Falta idempotencia por `event_id`
- Falta proteccion anti-replay
- **Impacto**: Riesgo financiero

#### P5 — Race conditions cron vs pagos
- Cron trial/dunning y webhook de pago pueden ejecutarse simultaneamente
- Sin locking transaccional ni estado idempotente
- **Impacto**: Estados inconsistentes (ej: pago llega mientras cron marca CANCELED)

#### P6 — Post-transaccion fragil (Outbox pattern)
- `startTrial()` y `sendEmail()` son post-tx no-bloqueantes
- Si fallan: usuario creado pero sin trial ni email
- **Mejora**: Outbox pattern para garantizar eventos criticos

#### P7 — Email verification como hard blocker
- Si SMTP falla, usuario queda bloqueado permanentemente
- Sin grace period para primer acceso

#### P8 — Falta observabilidad
- Sin metricas por estado (TRIAL, PAST_DUE, CANCELED)
- Sin tasa de fallo de cobro
- Sin alertas por bloqueos de quota

---

## PLAN DE EJECUCION (Orden Priorizado)

### Fase 1: Cerrar Fuga de Revenue/Costo (P1 + P2)

**Objetivo**: Bloquear facturacion SUNAT y WhatsApp para suscripciones vencidas

**Backend cambios:**
- `sunat.service.ts`: Agregar verificacion de suscripcion antes de transmitir
- `whatsapp.service.ts`: Verificar suscripcion antes de conectar sesion
- `guide.service.ts`: Agregar ensureQuota antes de crear guias
- `credit-notes.service.ts`: Agregar ensureQuota antes de crear notas de credito

**Frontend cambios:**
- Mostrar modal "Suscripcion requerida" cuando se intenta usar funcion bloqueada
- Boton directo a `/dashboard/account/plan`

### Fase 2: Guard Central de Suscripciones (P3)

**Objetivo**: EntitlementService unico que centralice TODA la logica de gating

**Backend:**
- Crear `SubscriptionEntitlementService` con metodo `ensureEntitlement(orgId, feature)`
- Features: `sunat_transmission`, `whatsapp`, `guides`, `credit_notes`, `invoices`, `users`, `storage`
- Guard NestJS: `@RequiresEntitlement('sunat_transmission')` decorador + guard
- Cada feature mapea a un plan flag o quota
- Super admins bypass automatico

**Beneficio**: Nuevos modulos solo agregan decorador, no logica custom

### Fase 3: Grace Period Email Verification (P7)

**Objetivo**: No bloquear acceso si SMTP falla

**Backend:**
- Permitir login sin verificacion durante primeras 24h
- Despues de 24h: exigir verificacion
- Banner prominente en dashboard: "Verifica tu email para continuar"
- Restringir funciones criticas (SUNAT, pagos) sin email verificado

### Fase 4: Matriz de Permisos Graduada (UX)

**Objetivo**: Restricciones proporcionales, no binarias

| Funcionalidad | TRIAL | Grace (7d post-trial) | PAST_DUE | CANCELED |
|--------------|-------|----------------------|----------|----------|
| Ver datos | ✅ | ✅ | ✅ | Solo lectura |
| Crear ventas | ✅ | ✅ (limite 50) | ❌ | ❌ |
| SUNAT transmision | ✅ | ❌ | ❌ | ❌ |
| WhatsApp | ✅ | ❌ | ❌ | ❌ |
| Guias remision | ✅ | ✅ (limite 10) | ❌ | ❌ |
| Notas credito | ✅ | ✅ (limite 5) | ❌ | ❌ |
| Crear usuarios | ✅ | ❌ (solo 1) | ❌ | ❌ |
| Exportar datos | ✅ | ✅ | ✅ | ✅ |
| Contabilidad | ✅ | ✅ | Solo lectura | Solo lectura |
| Inventario | ✅ | ✅ | Solo lectura | Solo lectura |

**Frontend:**
- Modal soft-block: "Esta funcion requiere suscripcion activa" + CTA pago
- No `BadRequestException` generico — mensajes contextuales en español

### Fase 5: Seguridad Webhooks (P4 + P5)

**Objetivo**: Proteger flujo de pagos

- Validar firma HMAC del webhook de Mercado Pago
- Idempotencia: deduplicar por `event_id` (tabla `ProcessedWebhookEvent`)
- Anti-replay: rechazar eventos con timestamp > 5 min
- Locking: `SELECT FOR UPDATE` en subscription antes de cambiar estado
- Estado idempotente: si ya es ACTIVE, ignorar segundo `payment_succeeded`

### Fase 6: Outbox Pattern (P6)

**Objetivo**: Garantizar eventos post-signup

- Tabla `OutboxEvent` con eventos pendientes (trial_start, verification_email)
- Worker/cron que procesa outbox cada 30s
- Retry con backoff exponencial
- Garantiza que trial + email se ejecuten aunque falle primera vez

### Fase 7: Observabilidad (P8)

**Objetivo**: Visibilidad operacional

- Metricas Prometheus:
  - `subscriptions_by_status{status}` gauge
  - `trial_expirations_total` counter
  - `dunning_attempts_total{result}` counter
  - `quota_blocks_total{feature}` counter
  - `webhook_events_total{type,status}` counter
- Alertas:
  - Trial expiration rate > threshold
  - Dunning failure rate > 50%
  - Webhook failures > 5/min
- Dashboard admin con metricas de suscripciones

---

## ARCHIVOS CLAVE

| Archivo | Responsabilidad |
|---------|----------------|
| `backend/src/public-signup/public-signup.service.ts` | Signup completo |
| `backend/src/subscriptions/subscriptions.service.ts` | Core suscripciones |
| `backend/src/subscriptions/trial-cron.service.ts` | Expiracion trial (5AM) |
| `backend/src/subscriptions/dunning-cron.service.ts` | Reintentos pago (hourly) |
| `backend/src/subscriptions/subscription-quota.service.ts` | Quotas y grace limits |
| `backend/src/subscriptions/mercado-pago-webhook.service.ts` | Webhooks MP |
| `backend/src/sunat/sunat.service.ts` | Transmision SUNAT (SIN gating) |
| `backend/src/whatsapp/whatsapp.service.ts` | WhatsApp (SIN gating) |
| `backend/src/guide/guide.service.ts` | Guias remision (SIN gating) |
| `backend/src/credit-notes/credit-notes.service.ts` | Notas credito (SIN gating) |
| `backend/src/onboarding/onboarding.service.ts` | Onboarding wizard |
| `fronted/src/components/trial-status-banner.tsx` | Banner trial en dashboard |
| `fronted/src/components/onboarding-wizard-banner.tsx` | Banner onboarding |
| `fronted/src/app/dashboard/account/plan/page.tsx` | Pagina de planes |
| `fronted/src/app/dashboard/account/billing/page.tsx` | Pagina facturacion |

---

## REGLA DE NEGOCIO CONFIRMADA

> **Si el trial se vence, el usuario NO debe poder facturar (SUNAT).**
> Las funciones premium (SUNAT, WhatsApp, guias) se bloquean inmediatamente.
> Funciones basicas (ver datos, exportar, inventario lectura) permanecen disponibles.

---

**Proximo paso**: Implementar Fase 1 (cerrar fuga SUNAT + WhatsApp)
