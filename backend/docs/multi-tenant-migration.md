# Seguimiento migración Single DB + RLS

Este documento detalla el avance táctico del plan por fases para habilitar multi-tenancy en un único esquema con Row-Level Security.

## Estado general
- **Fase 1 – Nuevas tablas sin impacto:**
  - ✅ _Paso 1_: Tablas `Organization` y `OrganizationUnit` definidas en Prisma y disponibles mediante migraciones sin afectar el resto del modelo.
  - ✅ _Paso 2_: Script `npm run seed:organizations` ejecutado en staging con dataset oficial; se validó idempotencia y registros auditados.
  - 🔜 _Paso 3_: Documentar y socializar el flujo de alta/baja de organizaciones con Operaciones (pendiente de coordinación con stakeholders).
- **Fase 2 – Columnas opcionales (`NULL`):**
  - ✅ _Paso 1_: Columnas `organizationId` agregadas como opcionales a las tablas operativas (`User`, `Client`, `Store`, `Inventory`, `Entry`, `Sales`, `Transfer`, etc.).
  - ✅ _Paso 2_: Campos `organizationId` propagados en servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`) y en los repositorios Prisma manteniendo compatibilidad legacy; DTOs de `clients` actualizados y documentados para nuevos consumidores.
  - 🚧 _Paso 3_: Diseño y ejecución de pruebas unitarias/integración para escenarios con y sin `organizationId` en curso; ya se consolidó la batería de `StoresService`, se extendió la instrumentación temporal de logs multi-organización, se añadió la suite de `SalesService` y se reactivó la suite de `ClientService` tras resolver tipados de Prisma.

## Próximas acciones sugeridas
1. Documentar en esta bitácora el procedimiento operativo para altas/bajas de organizaciones (Fase 1 – Paso 3). Responsable: Operaciones + Ingeniería. Artefacto esperado: runbook + checklist.
2. Completar la verificación de la instrumentación temporal de logs y métricas en servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`), asegurando que los tipados de Prisma permitan los nuevos campos y documentando consumidores faltantes.
3. Completar las suites unitarias/integración priorizadas (`stores`, `clients`) cubriendo `organizationId` nulo o definido y habilitar su ejecución continua (Fase 2 – Paso 3). Documentar cualquier bloqueo derivado de validaciones o tipados y resolverlo en conjunto con el equipo de plataforma.
4. Extender la cobertura de pruebas al resto de dominios (`inventory`, `sales`, `websales`) siguiendo el mismo patrón de parametrización multi-organización.
5. Planificar la **Fase 3 – Poblado y validación** con el equipo de datos. Entregables:
   - Definición de reglas de asignación por tabla (fuentes, columnas puente, excepciones manuales).
   - Scripts idempotentes por dominio con logging y métricas de progreso.
   - Calendario de ejecución en producción con ventanas de mantenimiento y responsables.

## Detalle de próximas fases

### Fase 2 – Paso 2 (exposición de campos)
- Actualizar DTOs de entrada y salida en los módulos `users`, `clients`, `stores`, `inventory` y `sales` para incluir `organizationId` opcional.
- Ajustar los mapeos de Prisma/Repositories para leer y escribir la nueva columna sin condicionar la lógica existente.
- Revisar integraciones externas (ETLs, webhooks) y agregar el campo cuando sea relevante, manteniendo compatibilidad mediante versionado o flags.

#### Plan táctico – Semana actual (Fase 2 – Paso 3)

| Tarea | Responsable | Entregable | Fecha objetivo |
| --- | --- | --- | --- |
| Inventariar servicios críticos y casos felices/error que requieren cobertura multi-organización (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`). | QA + Ingeniería Backend | Lista priorizada de escenarios de prueba firmada en Confluence. | Miércoles 27/03 |
| Actualizar suites unitarias en `backend/test` para parametrizar `organizationId` (`NULL` vs definido) utilizando factories existentes. **Completado:** `stores.service.spec.ts`, `sales.service.spec.ts` y `clients.service.spec.ts` validados y ejecutados en CI local tras corregir tipados de Prisma en `ClientService`. | QA Automation + Plataforma | Pull request con nuevas pruebas y reporte de cobertura. | Viernes 29/03 |
| Extender pruebas de integración/E2E con fixtures multi-organización y datos semilla en Prisma. | Ingeniería Backend | Scripts de seed actualizados + pipeline CI verde. | Lunes 01/04 |
| Incorporar métrica temporal en CI (badge o reporte) que exponga porcentaje de casos multi-organización ejecutados. **Dependencia:** confirmación de logs temporales operativos. | DevOps | Dashboard en Grafana + enlace en esta bitácora. | Martes 02/04 |

### Fase 2 – Paso 3 (cobertura de pruebas)
- Incorporar casos con `organizationId` `NULL` y definido en pruebas unitarias, comenzando por `stores` y `clients`.
- Añadir fixtures de datos multi-organización en pruebas de integración/E2E.
- Configurar métricas en CI para asegurar que la suite cubra ambos escenarios antes de endurecer restricciones.

### Fase 3 – Poblado y validación
1. **Diseño de reglas**: por cada tabla operativa, mapear la fuente de la organización (`Store.companyId`, `Client.tenantId`, etc.).
2. **Scripts idempotentes**: crear scripts Prisma/SQL que asignen `organizationId` en batches pequeños, registrando totales afectados.
3. **Validación en staging**: ejecutar scripts con snapshots previos/posteriores y reportes comparativos.
4. **Ejecución en producción**: planificar ventana, ejecutar scripts monitoreando logs/metrics y documentar resultados.
5. **Guardas post-ejecución**: configurar tareas programadas o jobs en observabilidad que alerten si aparecen filas sin `organizationId`.

### Fase 4 – Enforzar integridad
- Convertir columnas `organizationId` a `NOT NULL` y crear claves foráneas hacia `Organization`/`OrganizationUnit` cuando corresponda.
- Revisar todos los índices únicos e incluir `organizationId` para evitar colisiones multi-tenant.
- Actualizar validaciones y DTOs de la capa de aplicación para requerir `organizationId`.
- Planificar rollback (scripts para revertir `NOT NULL`/FKs) antes de despliegues.

### Fase 5 en adelante
- Implementar middleware multi-tenant en NestJS, activarlo tras validar integridad.
- Activar RLS gradualmente siguiendo feature flags y monitoreo de políticas.
- Documentar resultados y retirar código legacy al final del despliegue.

## Bitácora técnica reciente

### 2024-03-26 – Cobertura unit-test `ClientService`

- **Contexto:** Como parte del _Paso 3_ de la Fase 2 se requirió validar que los servicios propaguen el `organizationId` tanto cuando está definido como cuando permanece en `NULL` para mantener compatibilidad con clientes legacy.
- **Implementación:** Se creó el archivo [`backend/src/clients/clients.service.spec.ts`](../src/clients/clients.service.spec.ts) con una suite Jest que aísla `ClientService` mediante _mocks_ de Prisma (`user.create`, `client.create`, `client.findUnique`). La batería cubre los flujos `create`, `createGuest`, `verifyOrCreateClients` y `selfRegister`, verificando que:
  - Los casos con `organizationId` definido lo propaguen hacia Prisma en la creación de usuarios y clientes.
  - Los escenarios sin organización explícita mantengan `organizationId: null`, preservando la semántica actual.
  - Se _mockee_ `crypto.randomUUID` para los invitados y así poder aseverar el valor generado sin efectos colaterales en otros tests.
- **Resultado:** Las pruebas se ejecutan con `npm test -- clients.service.spec.ts` y cubren las ramas principales exigidas por el plan táctico. Esta suite servirá como salvaguarda cuando se continúe con el poblado de datos (Fase 3) y el refuerzo de integridad (Fase 4).

### 2024-03-30 – Cobertura unit-test `StoresService`

- **Contexto:** El _Paso 3_ de la Fase 2 requiere validar la propagación del `organizationId` en los servicios. Tras completar `ClientService`, se abordó la suite de `StoresService` para cubrir los flujos críticos de creación y actualización.
- **Implementación:** Se creó [`backend/src/stores/stores.service.spec.ts`](../src/stores/stores.service.spec.ts) con _mocks_ de Prisma (`store.create`, `store.update`, `store.findUnique`) y de `ActivityService`. La suite parametriza `organizationId` nulo o definido para los métodos `create`, `update` y `updateMany`, asegurando que los payloads mantengan compatibilidad con escenarios legacy y multi-organización.
- **Resultado:** La suite se ejecuta con `npm test -- stores.service.spec.ts` y quedó documentada como referencia para replicar el patrón en el resto de dominios prioritarios. Esto habilita continuar con la extensión hacia `ClientService` y el resto de módulos definidos en el plan.

### 2024-04-02 – Instrumentación temporal multi-organización

- **Contexto:** Para dar visibilidad a los flujos que aún no propagan `organizationId`, se incorporó un helper de logging (`organization-context.logger.ts`) que centraliza la emisión de métricas y advertencias.
- **Implementación:** Se actualizaron los servicios de `clients`, `stores`, `inventory`, `sales`, `users` y `websales` para emitir logs contextualizados durante operaciones críticas de creación y actualización.
- **Pendientes:** Ajustar los tipados de Prisma para aceptar explícitamente los campos instrumentados y recuperar la suite `clients.service.spec.ts` en CI.

### 2024-04-04 – Actualización DTOs `Client`

- **Contexto:** Tras habilitar los campos opcionales `organizationId` en Prisma, los consumidores del módulo `clients` necesitaban DTOs alineados para exponer el identificador de organización cuando estuviera disponible.
- **Implementación:** Se normalizaron los DTOs de entrada y salida en `clients` documentando `organizationId` como campo opcional y se compartió el alcance con integraciones dependientes para garantizar compatibilidad.
- **Resultado:** El avance consolida el _Paso 2_ de la Fase 2, habilitando que nuevos consumidores adopten `organizationId` sin romper flujos legacy y dejando listo el terreno para robustecer las suites de pruebas multi-organización.

### 2024-04-06 – Cobertura unit-test `SalesService`

- **Contexto:** Para continuar con el _Paso 3_ de la Fase 2 se necesitaba extender la cobertura multi-organización al dominio de ventas, asegurando que las rutas críticas reflejen el `organizationId` cuando exista y mantengan compatibilidad cuando permanezca en `NULL`.
- **Implementación:** Se incorporó [`backend/src/sales/sales.service.spec.ts`](../src/sales/sales.service.spec.ts) con _mocks_ de Prisma (`storeOnInventory.findFirst`, `salePayment.findMany`, `user.findUnique`), además de aislar `ActivityService`, `AccountingHook` y los helpers `prepareSaleContext`/`executeSale`. Las pruebas parametrizan `createSale` en escenarios con `organizationId` provisto, heredado desde la tienda o ausente, verificando que el payload enviado al helper preserve el campo según corresponda y que la instrumentación temporal registre el contexto correcto.
- **Resultado:** La suite se ejecuta mediante `npm test -- sales.service.spec.ts` y mantiene alineada la cobertura de ventas con la de `stores` y `clients`, liberando al equipo para continuar la priorización de pruebas en `ClientService`.

### 2024-04-08 – Reactivación suite `ClientService`

- **Contexto:** Luego de la instrumentación temporal multi-organización, la suite de `ClientService` había quedado bloqueada por los tipados de Prisma. El objetivo era recuperar su ejecución para consolidar el _Paso 3_ de la Fase 2.
- **Implementación:** Se ajustaron los tipos consumidos por `ClientService` y se refrescaron los _mocks_ de Prisma (`user.create`, `client.create`, `client.findUnique`) asegurando la propagación opcional de `organizationId`. También se mantuvo el _mock_ de `crypto.randomUUID` para validar los invitados.
- **Resultado:** Las pruebas se ejecutan con `npm test -- clients.service.spec.ts` y arrojaron resultado positivo, recuperando la cobertura multi-organización para `create`, `createGuest`, `verifyOrCreateClients` y `selfRegister`.

## Referencias
- Script de seed: [`prisma/seed/organizations.seed.ts`](../prisma/seed/organizations.seed.ts)
- Datos de ejemplo: [`prisma/data/organizations.json`](../prisma/data/organizations.json)
- Plan de migración original (resumen provisto en la historia de usuario).