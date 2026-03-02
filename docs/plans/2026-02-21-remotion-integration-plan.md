# Plan Tecnico: Integracion de Remotion para Videos en Cotizaciones

Fecha: 2026-02-21  
Estado: Propuesto (listo para iniciar implementacion)

## 1) Objetivo

Agregar generacion de videos MP4 para cotizaciones emitidas, con flujo asincrono, trazabilidad y aislamiento multi-tenant (`organizationId` / `companyId`), sin bloquear la API principal.

## 2) Alcance MVP

- Plantilla inicial: `quote-summary` (20-30s).
- Trigger manual desde UI de cotizaciones: `Generar video`.
- Trigger opcional al emitir cotizacion (feature flag).
- Estado de render en tiempo real basico (`queued`, `running`, `succeeded`, `failed`).
- URL final para compartir por WhatsApp/Email.

Fuera de MVP:
- Varias plantillas por vertical.
- Edicion timeline avanzada.
- Render distribuido multi-worker autoscale.

## 3) Arquitectura recomendada

Opcion elegida: **API + Cola + Worker de Render**.

- `fronted` (Next): inicia render y consulta estado.
- `backend` (Nest): crea jobs, valida permisos, expone endpoints.
- `worker` (Node + Remotion): procesa cola y renderiza MP4.
- `storage` (bucket actual): almacena video final.
- `db` (PostgreSQL/Prisma): persiste jobs y auditoria.

Razon: desacopla carga pesada de CPU/memoria de la API principal y evita congelar UX.

## 4) Modelo de datos (nuevo)

Tabla: `video_render_jobs`

- `id` (PK)
- `organizationId` (nullable para legacy, pero recomendado obligatorio nuevo)
- `companyId` (obligatorio)
- `entityType` (`QUOTE`)
- `entityId` (id cotizacion)
- `template` (`quote-summary`)
- `status` (`queued` | `running` | `succeeded` | `failed` | `cancelled`)
- `inputJson` (snapshot render)
- `outputUrl` (nullable)
- `outputDurationMs` (nullable)
- `attempts` (default 0)
- `errorMessage` (nullable)
- `createdById`
- `createdAt`, `startedAt`, `finishedAt`

Indices:
- `(companyId, createdAt desc)`
- `(entityType, entityId, createdAt desc)`
- `(status, createdAt)`

## 5) API (backend)

### 5.1 Crear render
`POST /api/video-renders/quotes/:quoteId`

Body:
- `template?: "quote-summary"`
- `autoSendWhatsApp?: boolean` (fase posterior)

Validaciones:
- Cotizacion existe y pertenece a tenant.
- Estado permitido (`ISSUED` recomendado para consistencia).
- Limites por usuario/empresa (rate limit).

### 5.2 Consultar estado
`GET /api/video-renders/:jobId`

Respuesta:
- `status`, `progress` (opcional), `outputUrl`, `errorMessage`.

### 5.3 Reintentar
`POST /api/video-renders/:jobId/retry`

Reglas:
- Solo `failed`.
- Max reintentos configurable.

### 5.4 Descargar
`GET /api/video-renders/:jobId/download`

Reglas:
- Solo si `succeeded`.
- URL firmada o stream proxy con permisos tenant.

## 6) Flujo funcional

1. Usuario presiona `Generar video`.
2. Frontend llama `POST /video-renders/quotes/:id`.
3. Backend crea `video_render_job` con snapshot de cotizacion (evita drift por cambios posteriores).
4. Job entra a cola.
5. Worker consume, renderiza Remotion, sube MP4 al storage.
6. Worker actualiza job `succeeded/failed`.
7. Frontend consulta estado y habilita `Ver/Compartir`.

## 7) Integracion con cotizaciones actuales

Puntos de integracion:
- `fronted/src/app/dashboard/quotes/page.tsx`
  - Boton `Generar video`.
  - Polling de estado (o SSE en fase 2).
  - CTA de compartir cuando `succeeded`.
- `backend/src/quotes/quotes.service.ts`
  - Hook opcional tras `issueQuote` con feature flag:
    - `VIDEO_RENDER_ON_ISSUE=false` (default).

## 8) Seguridad y cumplimiento multi-tenant

- Todas las consultas deben filtrar por `companyId` y `organizationId`.
- `inputJson` no debe guardar secretos ni tokens.
- Auditoria de eventos:
  - `VIDEO_RENDER_REQUESTED`
  - `VIDEO_RENDER_STARTED`
  - `VIDEO_RENDER_SUCCEEDED`
  - `VIDEO_RENDER_FAILED`
- Enlaces de descarga con expiracion (signed URL).

## 9) Observabilidad

Metricas:
- `video_render_jobs_total{status,template}`
- `video_render_duration_ms` (p50/p95)
- `video_render_queue_wait_ms`
- `video_render_failures_total{reason}`

Logs estructurados:
- `jobId`, `quoteId`, `companyId`, `attempt`, `duration`, `error`.

Alertas:
- tasa de falla > 10% en 15 min.
- cola acumulada > umbral configurable.

## 10) Pruebas

Backend:
- Unit: validaciones de tenant y estados.
- Integration: lifecycle completo de job.
- Negative: quote inexistente, tenant incorrecto, retries excedidos.

Worker:
- Render smoke test con payload minimo.
- Manejo de assets faltantes (logo, imagenes).

Frontend:
- Estados de UI por ciclo de vida.
- Error states y retry UX.

E2E:
- Emitir cotizacion -> generar video -> descargar/compartir.

## 11) Plan por fases

### Fase 1: Spike Remotion (1-2 dias)
- Composicion `quote-summary` con datos mock.
- Render local estable (`1080x1920` y `1920x1080`, decidir uno para MVP).

### Fase 2: Backend jobs + Prisma (2-3 dias)
- Migracion `video_render_jobs`.
- Endpoints create/status/retry/download.
- Auditoria y controles tenant.

### Fase 3: Worker + cola (2-4 dias)
- Consumidor de jobs.
- Render + upload storage.
- Reintentos y manejo de fallas.

### Fase 4: Integracion UI cotizaciones (2 dias)
- Botones, estados y feedback.
- Integracion con historial de cotizaciones.

### Fase 5: Hardening (2-3 dias)
- Metricas/alertas.
- Rate limit.
- Pruebas E2E y rollout gradual (feature flag).

## 12) Riesgos y mitigaciones

- Render lento por recursos: limitar concurrencia por worker.
- Costos de CPU/almacenamiento: TTL para videos temporales + politica de limpieza.
- Drift de datos entre emision y render: snapshot en `inputJson`.
- Fallas por assets externos: placeholders y timeout por asset.

## 13) Decisiones pendientes (para cerrar antes de implementar)

1. Cola:
   - Recomendado: BullMQ + Redis.
   - Alternativa: polling DB (menos infraestructura, menos robusto).
2. Formato MVP:
   - Recomendado: `1080x1920` (WhatsApp/status/mobile first).
   - Alternativa: `1920x1080` (presentacion desktop).
3. Trigger inicial:
   - Recomendado: manual (`Generar video`).
   - Luego feature flag para auto al emitir.

## 14) Criterio de exito MVP

- 95% de jobs completan en < 60s.
- 0 incidencias de fuga de datos entre tenants.
- Flujo end-to-end funcional desde cotizaciones sin bloquear UI.
- Compartir video disponible desde interfaz de usuario.
