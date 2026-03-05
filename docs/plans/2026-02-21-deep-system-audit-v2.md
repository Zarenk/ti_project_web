# Auditoría Técnica Profunda (V2) — Estado Real del Sistema

Fecha: 2026-02-21  
Alcance: `backend/`, `fronted/`, Prisma, seguridad operativa, calidad de código, readiness de producción.

---

## 1) Resumen Ejecutivo

Sí: el sistema ya está en escala grande y tiene bastante avance funcional.  
Pero también hay **riesgos críticos de producción** que deben cerrarse antes de release.

### Riesgos críticos detectados

1. **Exposición de material sensible y archivos privados**
   - `backend/src/main.ts:98` publica todo `uploads` sin auth.
   - `backend/src/main.ts:132` publica `sunat.zip/facturas` sin auth.
   - Hay llaves privadas en repo (`backend/certificates/private_key*.pem`) y también dentro de `backend/uploads/sunat/**/key-*.pem`.
   - Existe un backup de entorno versionado: `backend/.env.backup`.
   - Documentación con credenciales explícitas (`backend/docs/project-root/README.backend.md:19`).

2. **Endpoints de contabilidad sin guards**
   - Hooks de accounting con guards comentados:
   - `backend/src/accounting/hooks/sale-posted.controller.ts:15`
   - `backend/src/accounting/hooks/sale-fulfilled.controller.ts:8`
   - `backend/src/accounting/hooks/purchase-posted.controller.ts:16`
   - `backend/src/accounting/hooks/payment-posted.controller.ts:12`
   - `backend/src/accounting/hooks/invetory-adjusted.controller.ts:11`
   - `backend/src/accounting/hooks/credit-note-posted.controller.ts:19`
   - `backend/src/accounting/hooks/debit-note-posted.controller.ts:12`

3. **Contaminación del repositorio para release**
   - `git status --porcelain`: 691 entradas (`576` untracked, `115` modified unstaged).
   - Archivos versionados que no deberían estar en código fuente:
   - `node_modules/**` (553 archivos tracked).
   - `backend/uploads/**` (512 archivos tracked, ~142.71 MB).
   - `backend/temp/**` (61 archivos tracked).
   - Archivos basura en raíz: `d`, `el.click()`, `__tmp.txt`, `temp.ts`, `temp_patch_sales.txt`.

---

## 2) Métricas Revalidadas (snapshot)

## Tamaño de código
- `backend/src`: 639 archivos, **74,820 LOC**
- `fronted/src`: 794 archivos, **177,927 LOC**

## Pruebas
- Backend tests: **51**
- Frontend tests: **11**

## Deuda técnica visible
- Uso de `any` (`backend/src` + `fronted/src`): **1704**
- Marcadores `TODO/FIXME/HACK/XXX` en código: **36**

## Calidad (lint)
- Frontend (`next lint`): **1298 errores**, **114 warnings**
- Backend (`eslint src/**/*.ts`): **76,867 problemas**  
  Nota: gran parte es formato/line endings (`prettier/prettier` con `CRLF`), pero también hay deuda real de tipos.

## Vulnerabilidades (npm audit, prod deps)
- Backend: **31** (1 critical, 17 high, 13 moderate)
- Frontend: **13** (7 high, 4 moderate, 2 low)

---

## 3) Hallazgos por Severidad

## CRÍTICO

### C1. Exposición de archivos sensibles por estáticos públicos

**Evidencia**
- `backend/src/main.ts:98` → `app.use('/uploads', express.static(...))`
- `backend/src/main.ts:132` → `app.use('/sunat.zip/facturas', express.static(...))`
- `backend/src/legal-documents/legal-documents.service.ts:115` genera `fileUrl` público (`/uploads/legal-documents/...`).
- Llaves privadas en repo:
  - `backend/certificates/private_key.pem`
  - `backend/certificates/private_key_pkcs1.pem`
  - `backend/certificates/private_key_pkcs8.pem`
  - `backend/certificates/private_key_unencrypted.pem`
  - `backend/uploads/sunat/**/key-*.pem`

**Impacto**
- Riesgo alto de fuga de documentos legales/fiscales y llaves criptográficas.
- Incumplimiento de principios mínimos de seguridad para producción.

**Acción requerida**
- Bloquear acceso público directo a `/uploads` y `/sunat.zip/facturas`.
- Servir archivos sensibles solo vía endpoint autenticado/autorizado.
- Rotar inmediatamente cualquier llave/secret expuesto y purgar historial.

---

### C2. Hooks contables sin autenticación/autorización

**Evidencia**
- Guards comentados en todos los controladores de hooks contables (rutas `/accounting/hooks/*`).

**Impacto**
- Cualquier actor con acceso de red al endpoint puede disparar eventos contables.
- Riesgo de asientos inválidos/fraude y corrupción contable.

**Acción requerida**
- Rehabilitar guards o usar firma HMAC obligatoria + timestamp + nonce.
- Rechazar requests sin firma válida.

---

### C3. Credenciales y defaults inseguros en repositorio

**Evidencia**
- `backend/.env.backup` versionado.
- `backend/docs/project-root/README.backend.md:19` incluye `DEFAULT_ADMIN_PASSWORD=chuscasas19911991`.
- `backend/src/clients/clients.service.ts:121` y `:157` usa `'default_password'` para usuarios genéricos/invitados.

**Impacto**
- Riesgo de toma de cuenta y escalamiento.
- Riesgo reputacional y de cumplimiento.

**Acción requerida**
- Eliminar/rotar secretos, limpiar historial git.
- Nunca persistir contraseñas en claro.
- Forzar hash + policy incluso para usuarios “guest”.

---

## ALTO

### H1. Módulo Jurisprudencia incompleto para productivo

**Evidencia**
- Scraping real no implementado:
  - `backend/src/jurisprudence-scraper/jurisprudence-scraper.service.ts:116`
  - `backend/src/jurisprudence-scraper/jurisprudence-scraper.service.ts:165`
- Upload no encola extracción:
  - `backend/src/jurisprudence-documents/jurisprudence-documents.controller.ts:224`
- RAG usa fallback en memoria (no pgvector nativo):
  - `backend/src/jurisprudence-assistant/jurisprudence-rag.service.ts:184`
  - `backend/src/jurisprudence-assistant/jurisprudence-rag.service.ts:204` (`take: 500`)
- Schema aún con embedding temporal:
  - `backend/prisma/schema.prisma:3043` (`embedding Bytes`)
- No se detectaron workers/cron propios del flujo jurisprudencia.

**Impacto**
- Funcionalidad parcial, rendimiento limitado y operación manual.

---

### H2. Gaps de aislamiento por compañía en endpoints jurisprudencia

**Evidencia**
- `backend/src/jurisprudence-documents/jurisprudence-documents.controller.ts:117` usa solo `organizationId` en endpoints de detalle/acciones.
- `backend/src/jurisprudence-assistant/jurisprudence-assistant.controller.ts` en feedback valida por `organizationId` y no por `companyId`.

**Impacto**
- Potencial visibilidad cruzada entre compañías de una misma organización.

---

### H3. Pipeline de calidad sin gate efectivo

**Evidencia**
- Único workflow detectado: `.github/workflows/multi-tenant-coverage.yml` (solo backend / enfoque específico).
- `fronted/next.config.ts:41` y `:44` permite ignorar ESLint/TypeScript en build según entorno (`skipStrictChecks`).

**Impacto**
- Deploys potencialmente exitosos con errores reales de compilación/calidad.

---

### H4. Riesgo de performance por consultas amplias sin paginación fuerte

**Evidencia**
- Heurística: 266 usos de `findMany`; 213 sin `take/cursor` en ventana cercana.
- Hotspots: `backend/src/sales/sales.service.ts`, `backend/src/inventory/inventory.service.ts`, `backend/src/tenancy/tenancy.service.ts`.

**Impacto**
- Riesgo de presión de memoria/latencia en producción con crecimiento de data.

---

## MEDIO

### M1. Ruido de codificación/caracteres (mojibake) en textos y regex

**Evidencia**
- `fronted/src/utils/auth-fetch.ts:88` (`organizaci[oÃ³]n`)
- Varios strings con acentos degradados en backend/front.

**Impacto**
- UX inconsistente y validaciones regex frágiles.

---

### M2. Desalineación de reglas de tipos entre backend/front

**Evidencia**
- Backend: `strict: true` pero `noImplicitAny: false` + regla `no-explicit-any` desactivada.
- Frontend: lint estricto, deuda acumulada alta.

**Impacto**
- Comportamiento heterogéneo, deuda de mantenimiento creciente.

---

## 4) Lo que sí apareció nuevo en esta iteración

Respecto al análisis anterior, se detectaron adicionalmente:

1. **Material sensible versionado** (`.env.backup`, llaves privadas en `certificates` y `uploads/sunat`).
2. **`node_modules/` tracked en git** (553 archivos).
3. **Pipeline de build que puede ignorar errores de TS/ESLint** en frontend según entorno.
4. **Gaps de compañía (no solo organización) en jurisprudencia** en endpoints específicos.
5. **Magnitud real de deuda lint** (frontend y backend cuantificada).

---

## 5) Plan de cierre recomendado (orden de ejecución)

## Fase 0 — Bloqueo inmediato (24-48h)
- [ ] Cerrar exposición pública de `/uploads` y `/sunat.zip/facturas`.
- [ ] Rotar llaves/secretos expuestos y revocar material comprometido.
- [ ] Eliminar `backend/.env.backup` y credenciales hardcodeadas de docs.
- [ ] Reactivar seguridad en `/accounting/hooks/*` (guard + firma).

## Fase 1 — Higiene de repositorio (1-2 días)
- [ ] Dejar de trackear `node_modules/`, `uploads/`, `temp/`, artefactos.
- [ ] Añadir/ajustar `.gitignore`.
- [ ] Limpiar archivos basura en raíz.

## Fase 2 — Jurisprudencia productizable (3-5 días)
- [ ] Implementar workers BullMQ y cron reales.
- [ ] Encolar extracción/embedding al subir documento.
- [ ] Migrar embeddings a pgvector real y quitar fallback JSON.
- [ ] Corregir filtros company-scoped en detalle/feedback.

## Fase 3 — Gates de calidad (2-4 días)
- [ ] Separar lint “bloqueante” de deuda histórica (baseline).
- [ ] CI mínimo: `typecheck + lint + test` para backend y frontend.
- [ ] No permitir `ignoreBuildErrors/ignoreDuringBuilds` en producción.

---

## 6) Checklist “Go/No-Go” para Producción

### NO-GO si cualquiera de estos sigue abierto:
- [ ] Secretos o llaves privadas dentro del repo.
- [ ] Endpoints contables críticos sin auth/firma.
- [ ] Archivos legales/fiscales accesibles por URL pública directa.
- [ ] `node_modules/uploads/temp` versionados.
- [ ] CI sin gates básicos de compilación/tipado/lint/test.

### GO cuando:
- [ ] C1/C2/C3 cerrados y verificados.
- [ ] Jurisprudencia en modo estable o detrás de feature flag real.
- [ ] Pipeline de release con controles mínimos bloqueantes.

---

## 7) Nota de alcance

Este informe prioriza **riesgo operativo y seguridad de release** sobre refinamientos de UI.  
Si quieres, el siguiente paso es generar un **plan de ejecución por tickets (P0/P1/P2)** con owner sugerido, esfuerzo estimado y criterio de aceptación por ticket.

