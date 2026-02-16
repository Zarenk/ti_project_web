# Plan Tecnico General de Evolucion Arquitectonica

Fecha: 2026-02-12 (revisado con datos reales del codebase)
Proyecto: TI_projecto_web
Alcance: Backend NestJS + Frontend Next.js + multi-tenant + chat realtime + ventas/cotizaciones

## 1. Objetivo

Reducir riesgo de regresiones, mejorar mantenibilidad y acelerar la entrega de nuevas funciones sin romper flujos criticos (ventas, inventario, cotizaciones, chat, autenticacion y tenancy).

## 2. Diagnostico Resumido (validado contra codebase)

### Backend (98 servicios, 55 modulos NestJS)
- 9 servicios superan 1000 lineas. Los peores: `subscriptions.service.ts` (2,770), `tenancy.service.ts` (2,477), `sales.service.ts` (2,052), `inventory.service.ts` (1,710), `users.service.ts` (1,426).
- 13 controllers superan 250 lineas.
- 45 archivos .spec.ts para 98 servicios (~46% cobertura de archivos). Varios specs no compilan.
- Solo 5 tests E2E backend.

### Frontend (41 archivos .api.ts/.api.tsx)
- 22 archivos de dashboard superan 500 lineas. Los peores: `product-form.tsx` (3,696), `sales-form.tsx` (3,469), `options/page.tsx` (2,440), `quotes/page.tsx` (1,921), `entries.form.tsx` (1,879).
- Ya existe `authFetch` centralizado en `@/utils/auth-fetch` y `BACKEND_URL` en `@/lib/utils`, pero no se usan consistentemente. Al menos 3 patrones de fetch coexisten.
- Solo 1 spec de frontend. Cypress configurado pero sin suites activas evidentes.

### Multi-tenant
- Bien distribuido con TenantContextService y guards, pero complejidad operativa alta con 55 modulos.

## 3. Principios de Ejecucion

- **No romper funcionalidades existentes.** Cada cambio debe ser verificable antes de merge.
- Cambios incrementales y reversibles. Un archivo a la vez, nunca refactors masivos.
- Cada fase debe dejar el sistema desplegable.
- Refactor guiado por pruebas: escribir test ANTES de refactorizar, no despues.
- Priorizacion por impacto/riesgo.
- Si un refactor toca logica de negocio, requiere test que valide el comportamiento ANTES del cambio.

## 4. Roadmap General

## Fase 0 - Baseline y Control de Riesgo (1-2 semanas)

### Objetivo
Tener una linea base objetiva del sistema y arreglar la infraestructura de testing existente.

### Tareas

#### 0a. Arreglar tests existentes que no compilan
Estado actual: varios .spec.ts tienen errores TS (argumentos incorrectos, tipos faltantes). No se puede medir cobertura si los tests no compilan.
- Correr `npx tsc --noEmit` y listar todos los errores en .spec.ts
- Arreglar o eliminar tests rotos (si un test no aporta valor, eliminarlo es mejor que mantenerlo roto)
- Meta: `tsc --noEmit` sin errores en archivos de test

#### 0b. Definir mapa de flujos criticos
- Login / refresh / expiracion / redirect.
- Crear venta completa (con stock, series, caja, factura).
- Crear entrada de inventario.
- Emitir cotizacion (draft -> issue).
- Chat por tenant (aislamiento organizacional).
- Eliminar venta / eliminar producto (flujos validados en esta sesion).

#### 0c. KPIs base
- Cantidad de archivos > 1000 lineas (backend: 9, frontend: 17 actualmente).
- Tests que compilan y pasan vs total.
- Tiempo de build frontend/backend.

#### 0d. Suite de smoke tests minima
- Auth + tenancy context switch.
- Crear venta simple.
- Crear entrada simple.
- Eliminar venta (con validacion SUNAT).

### Entregables
- Tests existentes compilando.
- Suite smoke ejecutable localmente.

### Criterio de salida
- `tsc --noEmit` sin errores nuevos.
- Smoke tests pasan en flujos core.

---

## Fase 1 - Migracion de Capa API Frontend al patron existente (1-2 semanas)

### Objetivo
Unificar los 41 archivos .api.ts/.api.tsx al patron `authFetch` que YA existe. No crear nada nuevo, solo migrar.

### Estado actual
- `authFetch` de `@/utils/auth-fetch`: maneja auth headers, URL resolution, token refresh.
- `BACKEND_URL` de `@/lib/utils`: resolucion centralizada de URL.
- Problema: ~15 archivos API aun definen `BACKEND_URL` localmente o usan `fetch + getAuthHeaders` manual.

### Tareas

#### 1a. Migrar archivos que definen BACKEND_URL localmente
Prioridad por cantidad de ocurrencias duplicadas:
1. `sales.api.tsx` (46 ocurrencias de BACKEND_URL local)
2. `entries.api.tsx` (20 ocurrencias)
3. `account.api.ts` (6 ocurrencias)
4. Resto de archivos con definicion local.

Patron de migracion por archivo (uno a la vez):
```
// ANTES (cada archivo)
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
const res = await fetch(`${BACKEND_URL}/api/...`, { headers: getAuthHeaders() })

// DESPUES
import { BACKEND_URL } from '@/lib/utils'
import { authFetch } from '@/utils/auth-fetch'
const res = await authFetch(`${BACKEND_URL}/api/...`)
```

#### 1b. Eliminar `authorizedFetch` local de products.api.tsx
Duplica funcionalidad de `authFetch`. Reemplazar llamadas.

#### 1c. Verificar que cada migracion no rompe funcionalidad
- Migrar 1 archivo -> verificar en browser que las llamadas funcionan -> commit -> siguiente.
- NO migrar multiples archivos en un solo commit.

### Entregables
- Todos los archivos .api usando `authFetch` + `BACKEND_URL` centralizado.
- Cero definiciones locales de BACKEND_URL.

### Criterio de salida
- `grep -r "process.env.NEXT_PUBLIC_BACKEND_URL" fronted/src/app/` devuelve 0 resultados (excluyendo lib/utils).
- Funcionalidades verificadas en browser.

---

## Fase 2 - Endurecimiento de Seguridad y Tenancy (1-2 semanas)

### Objetivo
Fortalecer bordes de seguridad sin afectar experiencia de usuario.

### Tareas
1. Reforzar CORS y origen en WebSocket por entorno (no wildcard en produccion).
2. Revisar y unificar politica de cookies/tokens y rotacion.
3. Agregar trazabilidad de contexto tenant en errores de backend (sin exponer datos sensibles).
4. Verificar que todos los endpoints de dominios criticos apliquen contexto tenant obligatorio.
5. Validar manejo de sesion expirada en frontend con pruebas manuales de redireccion y retorno.

### Entregables
- Matriz de seguridad por capa (HTTP, WS, auth, tenant).
- Tests de regresion para aislamiento tenant.

### Criterio de salida
- Sin acceso cruzado entre organizaciones en pruebas.
- Sesion expirada consistente y recuperable en UI.

---

## Fase 3 - Descomposicion de Servicios Backend (3-6 semanas)

### Objetivo
Reducir tamano de servicios grandes extrayendo sub-servicios dentro del mismo modulo NestJS.

### Estrategia
Refactor por extraccion de servicios, NO por reestructuracion de carpetas. Mantener la estructura flat de NestJS. No crear carpetas domain/infrastructure/application (overhead excesivo para el proyecto actual).

### Orden basado en tamano y riesgo real

| # | Servicio | Lineas | Riesgo | Estrategia |
|---|----------|--------|--------|------------|
| 1 | `subscriptions.service.ts` | 2,770 | Medio | Extraer: billing logic, quota checks, trial management |
| 2 | `sales.service.ts` | 2,052 | Alto | Extraer: sales-calculation, sales-validation, sales-stock |
| 3 | `inventory.service.ts` | 1,710 | Alto | Extraer: stock-movement, inventory-query, transfer-logic |
| 4 | `users.service.ts` | 1,426 | Medio | Extraer: user-auth-logic, user-query, user-permissions |
| 5 | `entries.service.ts` | 1,156 | Medio | Extraer: entry-calculation, entry-validation |
| 6 | `tenancy.service.ts` | 2,477 | MUY Alto | Ultimo. Extraer: company-management, org-settings, context-resolution |

### Patron de extraccion (pragmatico)
```
// ANTES: sales.service.ts (2,052 lineas con todo mezclado)

// DESPUES: misma carpeta sales/
// sales.service.ts          -> orquestacion (create, update, delete) ~400 lineas
// sales-calculation.service.ts -> calculos de totales, impuestos, margenes
// sales-validation.service.ts  -> validaciones pre-venta (stock, SUNAT, limites)
// sales.repository.ts         -> queries Prisma complejas
```

### Reglas de seguridad para cada extraccion
1. Escribir test del metodo ANTES de moverlo (captura comportamiento actual).
2. Extraer a nuevo archivo.
3. Inyectar en modulo NestJS como provider.
4. Reemplazar llamadas en servicio original.
5. Verificar que test sigue pasando.
6. Commit atomico por metodo/grupo extraido.
7. Controller NO se toca — la API publica no cambia.

### Criterio de salida
- Ningun servicio supera 800 lineas.
- Cada sub-servicio tiene al menos 1 test que valida su funcion principal.

---

## Fase 4 - Descomposicion UI de Pantallas Masivas (2-4 semanas)

### Objetivo
Mejorar mantenibilidad de formularios complejos sin cambiar comportamiento visible.

### Pantallas prioritarias (por tamano real)

| # | Archivo | Lineas | Accion |
|---|---------|--------|--------|
| 1 | `product-form.tsx` | 3,696 | Extraer secciones a componentes, hooks para logica |
| 2 | `sales-form.tsx` | 3,469 | Extraer pasos del formulario, hook de calculo |
| 3 | `options/page.tsx` | 2,440 | Separar por seccion de configuracion |
| 4 | `quotes/page.tsx` | 1,921 | Extraer tabla, dialog, form a componentes |
| 5 | `entries.form.tsx` | 1,879 | Extraer secciones y logica de PDF |
| 6 | `company-edit-form.tsx` | 1,384 | Extraer tabs a componentes separados |

### Patron de extraccion UI
```
// ANTES: product-form.tsx (3,696 lineas)

// DESPUES: products/new/
// product-form.tsx           -> orquestacion y layout principal (~500 lineas)
// components/
//   basic-info-section.tsx   -> nombre, precio, categoria, marca
//   images-section.tsx       -> upload y preview de imagenes
//   specs-section.tsx        -> especificaciones tecnicas
//   features-section.tsx     -> caracteristicas del producto
// hooks/
//   use-product-form.ts     -> estado del formulario y submit logic
//   use-image-upload.ts     -> logica de upload
```

### Reglas de seguridad
1. Extraer componente visual SIN cambiar logica de estado.
2. Pasar props explicitamente (no context nuevo a menos que sea necesario).
3. Verificar en browser que el formulario funciona identico antes y despues.
4. Un componente extraido por commit.
5. NO cambiar names de campos, validaciones, ni flujo de submit.

### Criterio de salida
- Ningun archivo de pagina/formulario supera 800 lineas.
- Formularios criticos funcionan identico al estado actual.

---

## Fase 5 - Integridad de Datos y Schema (1-2 semanas)

### Objetivo
Auditar y corregir relaciones Prisma para garantizar integridad en operaciones criticas.

### Estado actual
- Schema de ~2300 lineas con relaciones inconsistentes detectadas.
- Ya corregido: cascade de Product (features, spec, review, favorite) y validacion de delete en Sales y Products.
- Pendiente: auditar TODOS los modelos con operaciones de eliminacion.

### Tareas
1. Auditar onDelete en cada FK del schema:
   - Documentar cuales usan Cascade, Restrict, SetNull, o default (sin especificar).
   - Identificar FKs sin onDelete explícito que deberian tener uno.
2. Validar que cada controller con endpoint DELETE tenga:
   - Pre-validacion de relaciones que bloquean.
   - Mensajes de error claros para el usuario.
   - Activity log (auditoria).
3. Evaluar si el schema se beneficiaria de split en archivos parciales (Prisma 7 lo soporta).

### Criterio de salida
- Toda FK tiene onDelete explicito (no defaults implicitos).
- Todo endpoint DELETE tiene validacion pre-eliminacion.

---

## Fase 6 - Observabilidad y Operacion (1-2 semanas)

### Objetivo
Mejorar deteccion temprana de incidentes y diagnostico.

### Tareas
1. Estandarizar logs estructurados por request-id y tenant context.
2. Instrumentar metricas por modulo critico:
   - auth, sales, inventory, quotes, chat, tenancy.
3. Definir alertas minimas:
   - 401/403 anormal.
   - p95 latencia por endpoint clave.
   - fallos de emision cotizacion/factura.

### Entregables
- Tablero operativo basico.
- Runbook corto de incidentes.

### Criterio de salida
- Tiempo medio de deteccion de fallos reducido.

---

## 5. Plan de Pruebas Transversal

### Unitarias
- Reglas de calculo (impuestos, margen, stock check).
- Validaciones tenant.
- Validaciones pre-eliminacion (sales, products, entries).

### Integracion
- Casos de uso backend con Prisma test DB.
- Endpoints core con contratos fijos.

### E2E
- Login + contexto tenant.
- Venta completa (crear + eliminar).
- Entrada de inventario (crear + eliminar).
- Cotizacion: borrador -> emitir.
- Chat: historial -> envio -> visto.

### No funcionales
- Performance basica de endpoints top.
- Resiliencia ante expiracion de sesion.

### Criterio global
- Ninguna fase cierra sin smoke tests verdes en flujos core.

## 6. Gestion de Riesgo

### Riesgos principales
1. Regresion en tenancy (alto impacto).
2. Cambios de auth que afecten redirect/session restore.
3. Refactors UI que rompan integraciones existentes.
4. Migracion de API frontend que cambie timing de requests.

### Mitigaciones
1. Un archivo por commit, verificacion manual antes de merge.
2. Releases por lotes pequenos.
3. Contratos congelados: la API publica (controllers, endpoints, response shapes) NO cambia durante refactors internos.
4. Rollback simple: si un servicio extraido causa problemas, se revierte el commit y se vuelve al monolito.
5. No usar feature flags (overhead innecesario para refactors internos que no cambian API).

## 7. Estimacion Global

| Fase | Duracion | Riesgo |
|------|----------|--------|
| Fase 0: Baseline + fix tests | 1-2 semanas | Bajo |
| Fase 1: Migracion API frontend | 1-2 semanas | Bajo |
| Fase 2: Seguridad y tenancy | 1-2 semanas | Medio |
| Fase 3: Descomposicion backend | 4-7 semanas | Alto |
| Fase 4: Descomposicion UI | 3-5 semanas | Medio |
| Fase 5: Integridad schema | 1-2 semanas | Medio |
| Fase 6: Observabilidad | 1-2 semanas | Bajo |

Total estimado: **12 a 22 semanas** (segun capacidad del equipo y paralelo frontend/backend).

## 8. Orden Recomendado de Ejecucion

1. **Fase 0** (obligatorio primero — sin baseline no se puede medir progreso)
2. **Fase 1** (bajo riesgo, alto impacto en consistencia)
3. **Fase 5** (auditar schema ahora previene problemas en fases siguientes)
4. **Fase 2** (seguridad antes de refactors grandes)
5. **Fase 3** (backend primero, empezar por subscriptions que es el mas grande)
6. **Fase 4** (frontend en paralelo cuando backend de modulo este estable)
7. **Fase 6** (observabilidad al final, cuando la arquitectura este mas limpia)

## 9. Decision Gates (go/no-go)

Al cierre de cada fase evaluar:
1. Calidad tecnica: tests pasan, sin regresiones reportadas.
2. Funcionalidad: flujos criticos verificados manualmente en browser.
3. Build: frontend y backend compilan sin errores nuevos.

Si una fase no cumple criterios, no avanzar hasta corregir.

## 10. Proximo Paso Sugerido

Arrancar con **Fase 0a** inmediatamente:
- Correr `npx tsc --noEmit` y arreglar los .spec.ts que no compilan.
- Esto es trabajo de bajo riesgo que se puede hacer ahora mismo.

Luego en paralelo:
- **Fase 0d**: smoke tests minimos.
- **Fase 1a**: migrar `sales.api.tsx` al patron authFetch (el archivo con mas duplicacion).
