# Guía rápida para el equipo – Context Restore

## Configuración necesaria

1. Backend:
   - Variables: `JWT_SECRET`, `DATABASE_URL`, `SOCKET_PORT` (opcional), `NEXT_PUBLIC_SOCKET_URL` (si se usa proxy inverso).
   - Ejecutar `npx prisma migrate dev` y `npm run start:dev`.
2. Frontend:
   - `.env` con `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SOCKET_URL` (opcional).
   - Bandera opcional para experimentos: `NEXT_PUBLIC_CONTEXT_RESTORE_VARIANT=control|remote_first|extended_ttl`.
   - Levantar con `npm run dev`.

## Endpoints clave

| Ruta | Método | Uso |
| --- | --- | --- |
| `/users/me/last-context` | PATCH | Persiste contexto actual. |
| `/users/me` | GET | Incluye `lastContext`. |
| `/users/me/validate-context` | GET | Valida selección sin aplicarla. |
| `/users/me/context-history` | GET | Historial paginado (`limit`, `cursor`). |
| `/users/me/context-history/:id/restore` | POST | Restaura entrada histórica. |
| `/context-metrics/me` | GET | Métricas personales. |
| `/context-metrics/summary` | GET | Métricas globales (solo super admins). |

## Flujos de prueba manual

1. **Restauración automática**  
   - Ingresar como super admin, seleccionar organización A.  
   - Recargar `/dashboard`; verificar toast y banner en verde.  
   - Cambiar a organización B, repetir.

2. **Contexto inválido**  
   - Desde el backend, revocar permisos o borrar la empresa usada.  
   - Recargar frontend → debe mostrar banner de error, limpiar selección y forzar nuevo selector.

3. **Sincronización multi dispositivo**  
   - Abrir dos pestañas; cambiar organización en la primera.  
   - Confirmar que la segunda actualiza via WebSocket (`context:changed`).

4. **Historial + métricas**  
   - Navegar a `/dashboard/account/context-history`.  
   - Revisar panel de métricas (tops, último registro).  
   - Restaurar una entrada anterior y verificar update en TenantSelectionProvider.

5. **Feature flags / variantes**  
   - Cambiar `NEXT_PUBLIC_CONTEXT_RESTORE_VARIANT` y reiniciar frontend.  
   - Correr `npx vitest run --environment node src/context/context-restore.service.test.ts` para asegurar cobertura.
6. **Rate limit / alertas**  
   - Forzar más de 10 cambios/minuto; backend debe devolver 429 con mensaje y `/context-metrics/summary` refleja `throttleStats`.  
   - Verificar que el frontend espere 60 s antes de reintentar y que el panel de métricas muestre los “top users” con throttles.
7. **Escenarios E2E**  
   - Dashboard/Home: registrar cambios y verificar breadcrumb + Analytics `context_manual_change`.  
   - Catálogo/Messages: revisar que `authFetch` envíe `x-org-id` correcto tras restaurar.  
   - Cash register: abrir módulo tras varios cambios rápidos para descartar 429s y verificar headers en las llamadas.
8. **Prometheus / Integraciones externas**  
   - `GET /context-metrics/prometheus` devuelve el dump; añadirlo al job de Prometheus/Grafana.
   - Verificar que los counters `context_update_total`, `context_update_latency_ms` y `context_rate_limit_total` crecen al ejecutar los flujos anteriores.

## Troubleshooting rápido

- `context_restore_failure` en consola: revisar `/users/me/validate-context` (puede ser permisos caducos).  
- `Cannot PATCH /users/me/last-context` → asegurar backend en `http://localhost:4000` y token válido.  
- Panel de analytics vacío: evento se ignora si no inicia con `context_`.  
- Historial sin datos: ejecutar `DELETE FROM "UserContextHistory"` y reintentar guardado para descartar TTL.
- Rate limit frecuente: revisar `ContextThrottleService` (puede ajustarse `CONTEXT_RATE_LIMIT` o ampliar el backoff en `useUserContextSync`).

## Contacto / ownership

- Backend: UsersService + ContextMetricsService → equipo Plataforma.  
- Frontend: ContextRestoreService + TenantSelectionProvider → equipo Experiencia Admin.  
- Para incidents, seguir runbook de Tenant Context en Confluence.
