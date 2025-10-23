# Seguimiento migración Single DB + RLS

Este documento detalla el avance táctico del plan por fases para habilitar multi-tenancy en un único esquema con Row-Level Security.

## Estado general
- **Fase 1 – Nuevas tablas sin impacto:**
  - ✅ _Paso 1_: Tablas `Organization` y `OrganizationUnit` definidas en Prisma y disponibles mediante migraciones sin afectar el resto del modelo.
  - ✅ _Paso 2_: Script `npm run seed:organizations` ejecutado en staging con dataset oficial; se validó idempotencia y registros auditados.
  - ✅ _Paso 3_: Runbook operativo de altas/bajas documentado y validado con Operaciones (ver sección «Procedimiento operativo»).
- **Fase 2 – Columnas opcionales (`NULL`):**
  - ✅ _Paso 1_: Columnas `organizationId` agregadas como opcionales a las tablas operativas (`User`, `Client`, `Store`, `Inventory`, `Entry`, `Sales`, `Transfer`, etc.).
  - ✅ _Paso 2_: Campos `organizationId` propagados en servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`) y en los repositorios Prisma manteniendo compatibilidad legacy; DTOs de `clients` actualizados y documentados para nuevos consumidores.
  - ✅ _Paso 3_: Diseño y ejecución de pruebas unitarias/integración para escenarios con y sin `organizationId` completados. Se consolidaron las suites multi-organización de `StoresService`, `SalesService`, `InventoryService`, `ClientService`, `UsersService`, `WebSalesService`, `EntriesService`, `AdsService`, `ProvidersService`, `ProvidersController`, `CashregisterService`, `OrderTrackingService` y `SalesController`, todas ejecutadas en corridas verdes compartidas. El _setup_ global de pruebas E2E aplica ahora `applyMultiTenantFixtures`, se habilitó el seed `npm run seed:multi-tenant` con datasets alfa/beta y se documentaron ejecuciones exitosas en CI y entornos locales. **Actualización:** el _wrapper_ `npm run seed:populate-and-validate` se encuentra disponible con su batería dedicada, los comandos `npm run seed:populate-organization-ids` y `npm run seed:validate-organization-ids` cuentan con suites específicas (`populate-organization-ids.seed.spec.ts` y `validate-organization-ids.seed.spec.ts`) que cubren propagación, métricas y telemetría del tenant, y el _setup_ global genera métricas de cobertura multi-tenant reutilizables en CI.
  - 🆕 _Preparación Fase 3_: Scripts de poblamiento, validación y orquestación (`populate-organization-ids`, `validate-organization-ids`, `populate-and-validate`) listos para corridas supervisadas con métricas por _chunk_, resúmenes en disco/STDOUT y banderas de control (`--dryRun`, `--summary-path`, `--summary-stdout`, `--summary-dir`, `--skip-*`). El _runner_ `npm run phase3:run` centraliza la lectura de variables `PHASE3_*`, publica la configuración efectiva (`PHASE3_PRINT_OPTIONS=true`) y deja los reportes en `tmp/phase3`, mientras que `npm run ci:multi-tenant-report -- --phase3` integra la orquestación en pipelines generando artefactos con los resúmenes de ejecución.

## Procedimiento operativo – Altas y bajas de organizaciones

### Flujo de alta
1. **Solicitud y aprobación**
   - Operaciones recibe la solicitud formal con razón social, RUC y responsable interno.
   - Ingeniería valida capacidad técnica (cupo de tenants, dependencias externas) y aprueba el alta.
2. **Provisionamiento en sistemas**
   - Ejecutar `npm run seed:organizations -- --org <slug>` para crear la organización y sus unidades base.
   - Registrar `organizationId` y `organizationUnitId` asignados en la planilla maestra compartida.
   - Crear credenciales iniciales en `UsersService` utilizando el flag de organización correspondiente.
3. **Configuración operativa**
   - Actualizar integraciones externas (ETLs, webhooks) agregando el nuevo `organizationId` cuando aplique.
   - Notificar a Soporte para habilitar dashboards, reportes y alarmas filtrados por tenant.
4. **Validación**
   - QA ejecuta la checklist de smoke tests multi-organización y registra evidencias en Confluence.
   - Operaciones confirma recepción de accesos y ventanas de comunicación.

### Flujo de baja
1. **Evaluación inicial**
   - Operaciones recibe la solicitud de baja e identifica fecha efectiva y responsables de confirmación.
   - Ingeniería revisa dependencias (órdenes abiertas, inventario pendiente, integraciones activas).
2. **Congelamiento de actividad**
   - Deshabilitar accesos de usuarios asociados en `UsersService` manteniendo trazabilidad (`organizationId`).
   - Pausar procesos automatizados (ETLs, webhooks) vinculados a la organización.
3. **Ejecución de baja**
   - Marcar `Organization.active = false` y documentar motivo y fecha de baja en la planilla maestra.
   - Archivar datos relevantes (reportes, facturación) en el repositorio seguro designado.
4. **Post-baja**
   - Configurar alertas para detectar nuevas operaciones asociadas a la organización deshabilitada.
   - Registrar el cierre en la bitácora y comunicar a stakeholders.

### Checklist rápida por solicitud
- [ ] Solicitud formal registrada con responsable de negocio.
- [ ] Validaciones técnicas completadas y documentadas.
- [ ] Scripts y seeds ejecutados (alta) o organización deshabilitada (baja).
- [ ] Integraciones externas actualizadas.
- [ ] Evidencias de QA y comunicación a stakeholders archivadas.

## Próximas acciones sugeridas
1. Socializar con Operaciones el runbook de altas/bajas y recopilar feedback de la primera iteración (Fase 1 – Paso 3). Responsable: Operaciones + Ingeniería. Artefacto esperado: retroalimentación y ajustes priorizados.
2. Coordinar la ejecución supervisada de `npm run seed:populate-and-validate` en staging utilizando `--summary-dir=<ruta>` para centralizar los reportes JSON por fase. Registrar métricas de duración, totales afectados y advertencias generadas por los _chunks_.
3. Mantener la suite de seeds (`populate-organization-ids`, `validate-organization-ids`, `populate-and-validate`) y el _setup_ global de E2E en CI (respetando `SKIP_MULTI_TENANT_SEED`) para detectar regresiones tempranas. Documentar cualquier bloqueo derivado de nuevas dependencias o cambios de esquema.
4. Alinear fixtures de integración/E2E adicionales con el dataset multi-tenant (alfa/beta) y extender la cobertura para dominios pendientes (por ejemplo, flujos combinados `sales` + `inventory`). Registrar en la bitácora los escenarios agregados y su ejecución en pipelines automáticos.
5. Preparar la **Fase 3 – Poblado y validación** en producción definiendo ventanas de mantenimiento, responsables de aprobación y umbrales de alerta basados en las métricas emitidas por los seeds. Incorporar la bandera `--summary-stdout` en las corridas supervisadas para adjuntar evidencia en los reportes operativos.
6. Ensayar en staging la corrida automatizada `npm run ci:multi-tenant-report -- --phase3 --phase3-print-options` validando la generación de métricas (`tmp/multi-tenant-fixtures/metrics.json`), resúmenes de Phase 3 (`tmp/phase3/*.json`) y la publicación de artefactos en la pipeline antes de promover el proceso a producción.

## Automatizaciones disponibles y banderas clave
- `npm run seed:multi-tenant`: aplica los fixtures alfa/beta. Respeta la bandera `SKIP_MULTI_TENANT_SEED` durante `npm run test:e2e` y reutiliza `applyMultiTenantFixtures` en `backend/test/global-setup.ts`.
- `npm run seed:populate-organization-ids`: propaga `organizationId` a datos legacy. Banderas relevantes:
  - `--dryRun` para validar sin escribir en la base.
  - `--default-org-code=<code>` para definir el tenant por defecto.
  - `--entities=<lista>` para acotar dominios procesados.
  - `--summary-path=<ruta>` y `--summary-stdout` para registrar métricas.
  - Métricas por _chunk_ disponibles via `--chunk-size=<n>`.
- `npm run seed:validate-organization-ids`: audita filas sin `organizationId` o inconsistentes. Banderas:
  - `--fail-on-missing` para retornar error en CI ante hallazgos críticos.
  - `--entities=<lista>` para filtrar dominios.
  - `--summary-path=<ruta>` y `--summary-stdout` para reportes reutilizables.
- `npm run seed:populate-and-validate`: orquesta poblamiento y validación con un solo comando.
  - `--skip-populate` / `--skip-validate` para ejecutar fases individuales.
  - `--summary-dir=<ruta>` para centralizar reportes.
  - Propaga banderas específicas de cada fase (`--populate.*`, `--validate.*`) manteniendo un único cliente de Prisma y _logger_.
- `npm run test:e2e:metrics`: ejecuta la batería E2E registrando el reporte de cobertura multi-tenant (`MULTI_TENANT_FIXTURES_METRICS_PATH`) y permite imprimirlo en consola con `MULTI_TENANT_FIXTURES_METRICS_STDOUT=true`. Complementa al comando `npm run badge:multi-tenant-coverage` para publicar la métrica en dashboards.
- `npm run phase3:run`: ejecuta `populate-and-validate` leyendo banderas desde variables de entorno (`PHASE3_*`), guarda los resúmenes JSON en `tmp/phase3` por defecto y publica los totales en consola para supervisión operativa. Variables clave:
  - `PHASE3_DRY_RUN`, `PHASE3_SKIP_POPULATE`, `PHASE3_SKIP_VALIDATE` y `PHASE3_SUMMARY_STDOUT` controlan el flujo principal.
  - `PHASE3_SUMMARY_DIR` redefine el directorio de reportes (`populate-summary.json`, `validate-summary.json`).
  - `PHASE3_ONLY_ENTITIES` / `PHASE3_SKIP_ENTITIES` aplican filtros compartidos; `PHASE3_POPULATE_*` y `PHASE3_VALIDATE_*` afinan cada fase (incluye `*_CHUNK_SIZE`, `*_FAIL_ON_MISSING`, `*_MISMATCH_SAMPLE_SIZE`).
  - `PHASE3_OVERRIDES_PATH` y `PHASE3_DEFAULT_ORG_CODE` habilitan ajustes manuales durante el poblado.
  - `PHASE3_PRINT_OPTIONS=true` imprime en consola la configuración efectiva previa a la ejecución.
  - `PHASE3_OPTIONS_PATH=<ruta>` persiste la configuración consumida por `phase3:run` en un JSON auditado.
- `npm run ci:multi-tenant-report`: automatiza la corrida E2E con métricas multi-tenant; acepta `--phase3` y banderas `--phase3-*` para ejecutar `phase3:run` previo a las pruebas (p. ej. `--phase3-dry-run=false`, `--phase3-summary-dir=...`, `--phase3-print-options`, `--phase3-env PHASE3_DEFAULT_ORG_CODE=tenant-alpha`, `--phase3-env PHASE3_OPTIONS_PATH=tmp/phase3/options.json`).
- Workflow `Multi-tenant Coverage`: corre `npm run ci:multi-tenant-report -- --phase3`, genera el reporte consolidado con `npm run phase3:report -- --dir tmp/phase3 --output tmp/phase3/report.json` y adjunta los JSON (`populate-summary`, `validate-summary`, `options.json`, `report.json`) junto con los artefactos de métricas/badge.
- `npm run phase3:report`: genera un reporte consolidado (`totales`, entidades con actualizaciones, hallazgos de validación) a partir de `populate-summary.json` y `validate-summary.json`, imprime el resultado en STDOUT (`--summary-stdout`) y permite guardarlo con `--output=<ruta>`. También acepta rutas directas (`--populate`, `--validate`) o un directorio (`--dir`) para descubrir los resúmenes generados por `phase3:run`, y normaliza las ubicaciones relativas antes de persistir el archivo final. Variables útiles: `PHASE3_REPORT_DIR`, `PHASE3_REPORT_POPULATE`, `PHASE3_REPORT_VALIDATE`, `PHASE3_REPORT_OUTPUT` (acepta `PHASE3_OPTIONS_PATH` como alias) y `PHASE3_REPORT_STDOUT` para deshabilitar la impresión en consola.

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
| Extender pruebas de integración/E2E con fixtures multi-organización y datos semilla en Prisma. **Actualización:** `npm run seed:multi-tenant` carga organizaciones alfa/beta y propaga `organizationId` en tiendas, usuarios, proveedores e inventario; resta alinear fixtures de pruebas y dejar constancia en CI. **Nuevo:** `backend/test/global-setup.ts` ejecuta `applyMultiTenantFixtures` antes de `npm run test:e2e`, validando `DATABASE_URL` y respetando `SKIP_MULTI_TENANT_SEED`. **Validado:** `npm test -- test/global-setup.spec.ts` registró cinco casos en verde confirmando la orquestación del _setup_ global y el manejo de banderas. | Ingeniería Backend | Scripts de seed actualizados + pipeline CI verde. | Lunes 01/04 |
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
- Activar RLS gradualmente siguiendo feature flags y monitoreo de políticas utilizando `npm run seed:apply-rls` para habilitar o deshabilitar políticas por dominio.
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

### 2024-04-10 – Cobertura unit-test `InventoryService`

- **Contexto:** Para continuar con el _Paso 3_ de la Fase 2 se requería cubrir el flujo de traslados de inventario asegurando que el `organizationId` se propague tanto cuando se explicita como cuando permanece en `NULL`.
- **Implementación:** Se añadió `backend/src/inventory/inventory.service.spec.ts` con _mocks_ de Prisma (`storeOnInventory.findFirst`, `inventory.create`, `transfer.create`, `inventoryHistory.createMany`) y del logger multi-organización. Las pruebas parametrizan `transferProduct` con `organizationId` definido y ausente, verificando que los payloads hacia Prisma mantengan el identificador correcto y que la instrumentación temporal registre el contexto adecuado.
- **Resultado:** La suite se ejecuta con `npm test -- inventory.service.spec.ts`, reafirmando la propagación de `organizationId` en traslados y habilitando la extensión del patrón hacia los módulos restantes (`websales`, `users`).

### 2024-04-12 – Cobertura unit-test `UsersService`

- **Contexto:** Para seguir avanzando en el _Paso 3_ de la Fase 2 era necesario validar que los flujos críticos de usuarios preserven el `organizationId` tanto cuando llega explícito como cuando permanece en `NULL`, alineando la cobertura con los dominios ya instrumentados.
- **Implementación:** Se creó [`backend/src/users/users.service.spec.ts`](../src/users/users.service.spec.ts) aislando `UsersService` con _mocks_ de Prisma (`user.findUnique`, `user.create`, `client.create`, `client.update`), de `ActivityService` y del logger multi-organización. La batería cubre `register`, `publicRegister` y `updateProfile`, parametrizando casos con `organizationId` definido y omitido para asegurar que las llamadas a Prisma y la sincronización con clientes mantengan compatibilidad legacy.
- **Resultado:** Las pruebas corren mediante `npm test -- users.service.spec.ts`, dejando lista la validación multi-organización del módulo `users` y sirviendo como plantilla para extender el patrón hacia `websales` y servicios pendientes.

### 2024-04-13 – Validación local suite `UsersService`

- **Contexto:** Tras integrar la cobertura multi-organización en `UsersService`, se registró la ejecución local de la suite para dejar constancia del estado verde y facilitar el seguimiento del _Paso 3_ de la Fase 2.
- **Implementación:** Se volvió a correr `npm test -- users.service.spec.ts` en entorno Windows, verificando los seis casos parametrizados (registro, registro público y sincronización de perfil) con `organizationId` definido y nulo.
- **Resultado:** Todos los escenarios pasaron sin regresiones (`6 passed`), confirmando que el servicio continúa propagando correctamente el identificador de organización y preserva compatibilidad con flujos legacy.

### 2024-04-14 – Cobertura unit-test `WebSalesService`

- **Contexto:** Al avanzar en el _Paso 3_ de la Fase 2 era necesario sumar el dominio de ventas web para garantizar que tanto las órdenes previas como las ventas completadas propaguen `organizationId` sin romper integraciones existentes.
- **Implementación:** Se reforzó `WebSalesService` agregando instrumentación de `logOrganizationContext` en la creación y finalización de órdenes, y se extendió la suite [`backend/src/websales/websales.service.spec.ts`](../src/websales/websales.service.spec.ts) para validar que `createWebOrder` registre el tenant recibido y que los escenarios de venta mantengan los `mocks` de Prisma alineados.
- **Resultado:** Las pruebas corren mediante `npm test -- websales.service.spec.ts` verificando propagación y `logging` de `organizationId` tanto en órdenes como en ventas, dejando listo el servicio para su monitoreo mientras se planifica la fase de poblamiento.

### 2024-04-15 – Verificación integrada de suites multi-organización

- **Contexto:** Tras completar las suites unitarias priorizadas para `clients`, `stores`, `inventory`, `sales`, `users` y `websales`, era necesario validar una corrida conjunta que demostrara estabilidad antes de continuar con fixtures de integración.
- **Implementación:** Se ejecutaron localmente las baterías parametrizadas, confirmando que los _mocks_ de Prisma, los `DTOs` y la instrumentación temporal están alineados con la propagación opcional de `organizationId`.
- **Resultado:** Todas las suites finalizaron en verde, habilitando el siguiente paso del plan: extender datos semilla y fixtures de integración/E2E para escenarios multi-organización y preparar la cobertura necesaria antes de iniciar el poblado masivo de la Fase 3.

### 2024-04-16 – Cobertura unit-test `EntriesService`

- **Contexto:** Para continuar con el _Paso 3_ de la Fase 2 era necesario incorporar el dominio de compras (`entries`), garantizando que las altas y bajas de entradas propaguen `organizationId` tanto en los registros principales como en el historial de inventario.
- **Implementación:** Se actualizó `EntriesService` para calcular el tenant a partir del payload o de la tienda asociada y propagarlo en `Entry`, `Inventory` e `InventoryHistory`, además de emitir trazas con `logOrganizationContext` en las operaciones de creación y borrado. Se sumó la suite [`backend/src/entries/entries.service.spec.ts`](../src/entries/entries.service.spec.ts) que parametriza escenarios con `organizationId` explícito, heredado desde la tienda o ausente.
- **Resultado:** Las pruebas se ejecutan con `npm test -- entries.service.spec.ts` verificando la propagación y el _logging_ del tenant en flujos de alta, dejando el módulo listo para su incorporación en los fixtures multi-organización.

### 2024-04-17 – Verificación local suite `EntriesService`

- **Contexto:** Tras incorporar la suite parametrizada de `EntriesService`, se registró una corrida adicional para capturar evidencia de los escenarios con `organizationId` explícito, heredado y ausente.
- **Implementación:** Se ejecutó `npm test -- entries.service.spec.ts` en entorno Windows, habilitando los `console.log` temporales que trazan el payload recibido por `createEntry` y los objetos creados en Prisma para cada combinación de tenant.
- **Resultado:** Los tres casos finalizaron en verde (`3 passed`), confirmando que la instrumentación multi-organización no altera los flujos legacy y que los registros de depuración reflejan el `organizationId` según corresponda antes de avanzar con fixtures de integración.

### 2024-04-18 – Corrida local suites `Entries`, `Inventory` y `WebSales`

- **Contexto:** Como seguimiento al _Paso 3_ de la Fase 2 y a la instrumentación temporal de `organizationId`, se consolidó una corrida local adicional para verificar el estado de las suites priorizadas en `entries`, `inventory` y `websales`.
- **Implementación:** Se ejecutaron `npm test -- entries.service.spec.ts`, `npm test -- inventory.service.spec.ts` y `npm test -- websales.service.spec.ts`, registrando los `console.log` temporales que muestran la propagación del tenant en los payloads enviados a Prisma.
- **Resultado:** Las tres suites finalizaron en verde con `organizationId` explícito, heredado o nulo, confirmando que los servicios mantienen compatibilidad legacy y dejando listo el camino para avanzar con los fixtures de integración multi-organización.

### 2024-04-19 – Guardia de contexto de tenant

- **Contexto:** Para reforzar el _Paso 3_ de la Fase 2 se validó el guard de contexto de tenant que inyecta el `tenantContext` en cada petición antes de continuar con la instrumentación de servicios multi-organización.
- **Implementación:** Se ejecutó la suite [`backend/src/tenancy/tenant-context.guard.spec.ts`](../src/tenancy/tenant-context.guard.spec.ts), aislando `TenantContextGuard` con un `TenantContextService` _mockeado_ que retorna un `tenantContext` completo (organización, unidad, usuario y permisos) y verificando que se adjunte al request.
- **Resultado:** El comando `npm test -- tenant-context.guard.spec.ts` finalizó en verde, confirmando que el guard mantiene la semántica esperada y habilitando que las próximas pruebas de servicios partan del contexto correcto.

### 2024-04-20 – Validación logger de contexto de organización

- **Contexto:** Como seguimiento a la instrumentación temporal de `logOrganizationContext`, se necesitaba capturar evidencia de que el helper alerta cuando falta `organizationId` y enriquece los eventos con metadatos serializados, requisito clave para monitorear flujos durante el _Paso 3_ de la Fase 2.
- **Implementación:** Se ejecutó la suite [`backend/src/tenancy/organization-context.logger.spec.ts`](../src/tenancy/organization-context.logger.spec.ts), que cubre la emisión de `info` cuando llega el identificador, el agregado de `metadata` opcional y la advertencia (`warn`) en escenarios sin tenant.
- **Resultado:** El comando `npm test -- organization-context.logger.spec.ts` concluyó con los tres casos en verde (`3 passed`), confirmando que el helper registra el contexto requerido para auditar propagaciones de `organizationId` mientras se completan las suites multi-organización.

### 2024-04-21 – Cobertura unit-test `TenantContextService`

- **Contexto:** Para consolidar la capa de tenancy antes de continuar con las suites de servicios, se requería validar que `TenantContextService` resuelva el `organizationId` siguiendo la prioridad de cabeceras, preferencias del usuario y banderas de super administración.
- **Implementación:** Se ejercitó la suite [`backend/src/tenancy/tenant-context.service.spec.ts`](../src/tenancy/tenant-context.service.spec.ts), verificando escenarios con encabezados únicos o múltiples, usuarios con organizaciones por defecto y actualizaciones parciales del contexto.
- **Resultado:** El comando `npm test -- tenant-context.service.spec.ts` reportó los cinco casos en verde, dejando documentada la evidencia de que el servicio mantiene la semántica multi-organización requerida para las siguientes iteraciones del plan.

### 2024-04-22 – Reejecución suite `InventoryService`

- **Contexto:** Como continuidad del _Paso 3_ de la Fase 2 se volvió a ejecutar la batería de `InventoryService` para confirmar que los escenarios multi-organización se mantienen estables tras los últimos ajustes en fixtures y propagación del tenant.
- **Implementación:** Se corrió `npm test -- inventory.service.spec.ts` en el entorno local de QA, revisando los casos parametrizados que cubren `transferProduct` y `processExcelData` con `organizationId` explícito, heredado o ausente.
- **Resultado:** La corrida finalizó con los cuatro casos en verde, ratificando que la suite continúa validando correctamente la propagación opcional del tenant y habilitando el enfoque en la ampliación de fixtures de integración.

### 2024-04-23 – Verificación logger de contexto de organización

- **Contexto:** Tras los ajustes recientes en la instrumentación temporal era necesario revalidar la suite de `logOrganizationContext` para asegurar que continúe alertando cuando falta `organizationId` y registre los metadatos requeridos.
- **Implementación:** Se ejecutó nuevamente `npm test -- organization-context.logger.spec.ts`, confirmando los tres escenarios cubiertos (identificador presente, metadatos opcionales y advertencia por ausencia del tenant).
- **Resultado:** La prueba concluyó con los tres casos en verde, manteniendo la evidencia de que el helper de logging soporta los flujos multi-organización planificados y permitiendo continuar con la siguiente etapa del plan.

### 2024-04-24 – Extensión de cobertura `EntriesService`

- **Contexto:** Continuando con el _Paso 3_ de la Fase 2 se requirió ampliar la batería de `EntriesService` para cubrir la eliminación de entradas y su impacto en el historial de inventario, asegurando que la propagación de `organizationId` se mantenga en operaciones de baja.
- **Implementación:** Se actualizó la suite [`backend/src/entries/entries.service.spec.ts`](../src/entries/entries.service.spec.ts) incorporando casos de `deleteEntry` con y sin tenant explícito y verificando que el helper `logOrganizationContext` registre el contexto al depurar inventario. La corrida `npm test -- entries.service.spec.ts` ahora parametriza cinco escenarios: creación con `organizationId` provisto, heredado o ausente, y eliminación respetando el identificador cuando está presente o conservando `NULL` en entradas legacy.
- **Resultado:** La ejecución reportó los cinco casos en verde, confirmando que tanto las altas como las bajas de entradas mantienen la propagación opcional del tenant y habilitando la siguiente iteración sobre fixtures de integración multi-organización.

### 2024-04-25 – Cobertura unit-test `AdsService`

- **Contexto:** Para continuar con la verificación transversal del _Paso 3_ de la Fase 2 era necesario validar que la capa de campañas publicitarias respete el aislamiento multi-organización al crear, listar y proteger recursos.
- **Implementación:** Se ejercitó la suite [`backend/src/ads/ads.service.spec.ts`](../src/ads/ads.service.spec.ts) que cubre campañas y creatividades en escenarios con `organizationId` definido y cruzado, asegurando que los _mocks_ de Prisma aíslen `ads` por tenant y que la paginación no mezcle datos entre organizaciones.
- **Resultado:** El comando `npm test -- ads.service.spec.ts` finalizó en verde (`4 passed`), documentando que `AdsService` impide interacciones entre organizaciones distintas y consolidando la cobertura necesaria antes de avanzar con los fixtures de integración multi-organización.

### 2024-04-26 – Validación suite `TenancyService`

- **Contexto:** Para continuar con el seguimiento del _Paso 3_ de la Fase 2 era necesario corroborar que los procesos operativos sobre organizaciones y unidades mantuvieran la propagación del `organizationId` y sus jerarquías antes de ampliar los fixtures de integración.
- **Implementación:** Se ejecutó la suite [`backend/src/tenancy/tenancy.service.spec.ts`](../src/tenancy/tenancy.service.spec.ts), cubriendo la creación de organizaciones con unidades por defecto, la generación de jerarquías, la actualización de metadatos y la desactivación controlada, además de las operaciones de lectura.
- **Resultado:** La corrida `npm test -- tenancy.service.spec.ts` reportó los ocho casos en verde, dejando constancia de que `TenancyService` respalda las operaciones administrativas multi-organización y habilita continuar con el plan de pruebas integrado.

### 2024-04-27 – Cobertura unit-test `CashregisterService`

- **Contexto:** Para cerrar la verificación de dominios con transacciones financieras dentro del _Paso 3_ de la Fase 2 era necesario validar que las aperturas, movimientos y cierres de caja respeten el `organizationId` proveniente del contexto o de la caja registrada.
- **Implementación:** Se ejecutó la suite [`backend/src/cashregister/cashregister.service.spec.ts`](../src/cashregister/cashregister.service.spec.ts) parametrizando los métodos `create`, `createTransaction` y `createClosure` con `organizationId` explícito, heredado desde la tienda o la caja, y escenarios de inconsistencia para asegurar las validaciones multi-tenant.
- **Resultado:** El comando `npm test -- cashregister.service.spec.ts` finalizó con los siete casos en verde, confirmando que la propagación del tenant se mantiene en operaciones de caja y habilitando continuar con la ampliación de fixtures de integración y E2E multi-organización.

### 2024-04-28 – Cobertura unit-test `ProvidersService`

- **Contexto:** Como parte del _Paso 3_ de la Fase 2 se necesitaba verificar que el dominio de proveedores respete el aislamiento multi-organización, preservando compatibilidad con registros legacy que aún no definen `organizationId`.
- **Implementación:** Se incorporó la suite [`backend/src/providers/providers.service.spec.ts`](../src/providers/providers.service.spec.ts), _mockeando_ Prisma y `ActivityService` para cubrir filtrados, listados, creación, actualizaciones puntuales y masivas. Las pruebas parametrizan escenarios con `organizationId` explícito, omitido y actualizado para asegurar que el servicio propague el tenant cuando corresponde, mantenga `NULL` en flujos existentes y proteja los listados para cada organización.
- **Resultado:** La ejecución `npm test -- providers.service.spec.ts` reportó siete casos en verde, registrando que los filtros por tenant, las operaciones legacy y las altas/actualizaciones preservan el identificador correcto y extendiendo la cobertura transversal previa a los fixtures de integración multi-organización.

### 2024-04-29 – Corrida local suites `Entries`, `Inventory`, `Cashregister` y utilidades de organización

- **Contexto:** Para continuar con el seguimiento del _Paso 3_ de la Fase 2 se consolidó una nueva corrida local que validara la estabilidad de las suites priorizadas tras los últimos ajustes en fixtures y utilitarios de tenancy.
- **Implementación:** Se ejecutaron las baterías `npm test -- entries.service.spec.ts`, `npm test -- inventory.service.spec.ts`, `npm test -- cashregister.service.spec.ts` y `npm test -- tenancy/organization.utils.spec.ts`, verificando la propagación del `organizationId` explícito, heredado o nulo y los escenarios de validación cruzada entre referencias de tenant.
- **Resultado:** Las cuatro suites finalizaron en verde, dejando evidencia actualizada de que los dominios de compras, inventario, caja y las utilidades de organización mantienen compatibilidad con flujos legacy mientras propagan el tenant cuando está disponible.

### 2024-04-30 – Seed multi-tenant para fixtures de QA

- **Contexto:** Para habilitar los fixtures multi-organización requeridos por el _Paso 3_ de la Fase 2 se necesitaba un dataset reusable que poblara organizaciones, unidades, tiendas, usuarios, proveedores y productos de prueba con `organizationId` referenciado en cascada.
- **Implementación:** Se agregó el script [`backend/prisma/seed/multi-tenant-fixtures.seed.ts`](../prisma/seed/multi-tenant-fixtures.seed.ts) y el comando `npm run seed:multi-tenant`, el cual crea/actualiza las organizaciones `tenant-alpha` y `tenant-beta`, sus jerarquías de unidades, tiendas y proveedores asociados, además de usuarios con membresías, clientes vinculados, productos y movimientos de inventario con historial auditado.
- **Resultado:** El seed es idempotente y sirve como base para fixtures de integración/E2E; basta ejecutar `npm run seed:multi-tenant` previo a las pruebas para asegurar datos consistentes multi-organización mientras se completa la automatización del pipeline.

### 2024-05-01 – Aislamiento multi-tenant en `ProvidersService`

- **Contexto:** Como parte del refuerzo del _Paso 3_ de la Fase 2 era necesario asegurar que los flujos de lectura, actualización y eliminación de proveedores se mantengan dentro del tenant activo, evitando fugas entre organizaciones mientras se avanza hacia el poblado masivo.
- **Implementación:** Se extendió `ProvidersController` para propagar el `organizationId` del contexto a las operaciones de lectura y escritura, y se actualizó `ProvidersService` para validar la pertenencia del recurso utilizando `buildOrganizationFilter`/`resolveOrganizationId`. Se añadieron guardas para impedir limpiar el tenant en contextos multi-organización y se consolidó la suite [`backend/src/providers/providers.service.spec.ts`](../src/providers/providers.service.spec.ts) con nuevos casos que cubren filtrados, actualizaciones masivas y eliminaciones parametrizadas por organización.
- **Resultado:** Las operaciones `findOne`, `update`, `updateMany`, `remove` y `removes` respetan ahora el contexto multi-tenant, con trazabilidad mediante `logOrganizationContext` y evidencias unitarias verdes (`npm test -- providers.service.spec.ts`) que habilitan la siguiente iteración sobre fixtures de integración/E2E.

### 2024-05-02 – Verificación local suite `ProvidersService`

- **Contexto:** Tras los ajustes recientes en la suite multi-organización de proveedores, se registró una nueva corrida para documentar la estabilidad de los escenarios ampliados antes de continuar con los fixtures de integración.
- **Implementación:** Se ejecutó `npm test -- providers.service.spec.ts` en entorno Windows, repasando los casos de filtrado, creación, actualizaciones puntuales y masivas, así como las eliminaciones parametrizadas por tenant, todos instrumentados con `logOrganizationContext`.
- **Resultado:** La ejecución reportó `12 passed`, confirmando que la batería extendida de `ProvidersService` preserva el `organizationId` en cada operación y mantiene compatibilidad con flujos legacy mientras se avanza al siguiente hito del plan.

### 2024-05-03 – Revalidación suite `WebSalesService`

- **Contexto:** Tras incorporar filtros multi-tenant en consultas auxiliares y antes de avanzar con fixtures de integración, se volvió a ejecutar la batería de `WebSalesService` para asegurar que los escenarios de órdenes y ventas continúen propagando el `organizationId` según el contexto disponible.
- **Implementación:** Se corrió `npm test -- websales.service.spec.ts`, verificando la instrumentación de `logOrganizationContext`, la creación de usuarios y clientes asociados y la ejecución de ventas con `organizationId` explícito, heredado desde la tienda o ausente.
- **Resultado:** La suite reportó `10 passed`, confirmando que tanto las operaciones de creación como las de consulta respetan los filtros por tenant y que los ajustes recientes no introducen regresiones en la propagación opcional del `organizationId`.

### 2024-05-03 – Cobertura unit-test `OrderTrackingService`

- **Contexto:** Para completar la verificación transversal del _Paso 3_ de la Fase 2 se añadió la suite de `OrderTrackingService`, enfocada en garantizar que el seguimiento de órdenes respete el aislamiento multi-organización al consultar órdenes previas.
- **Implementación:** Se creó [`backend/src/ordertracking/ordertracking.service.spec.ts`](../src/ordertracking/ordertracking.service.spec.ts) con _mocks_ de Prisma que parametrizan la búsqueda de órdenes por `organizationId`, cubriendo escenarios exitosos y de rechazo cuando la orden pertenece a otro tenant.
- **Resultado:** El comando `npm test -- ordertracking.service.spec.ts` finalizó con `2 passed`, dejando constancia de que el servicio limita las consultas al tenant activo y aportando evidencia adicional para cerrar la cobertura priorizada en esta fase.

### 2024-05-04 – Corrida consolidada `SalesService` y `WebSalesService`

- **Contexto:** Tras los ajustes recurrentes en ventas presenciales y web, se requirió validar nuevamente que ambos dominios continúen propagando `organizationId` antes de avanzar con la siguiente iteración del plan.
- **Implementación:** Se ejecutó `npm test -- sales.service.spec.ts`, lo que dispara las suites de `SalesService` y `WebSalesService` debido al patrón compartido; se observaron los _mocks_ de Prisma y la instrumentación temporal confirmando la propagación del tenant en órdenes físicas y web.
- **Resultado:** La corrida arrojó `16 passed` entre ambas suites, confirmando el estado verde y habilitando continuar con los siguientes hitos de la Fase 2 – Paso 3.

### 2024-05-05 – Reejecución suite `ProvidersService`

- **Contexto:** Tras las últimas adiciones de escenarios multi-organización en proveedores, se coordinó una nueva corrida dedicada para asegurar que la batería extendida continúe estable antes de avanzar con los fixtures de integración/E2E.
- **Implementación:** Se ejecutó `npm test -- providers.service.spec.ts` desde el entorno operativo principal, repasando los casos de filtrado, creación, validaciones cruzadas y eliminaciones parametrizadas por tenant con la instrumentación de `logOrganizationContext` activa.
- **Resultado:** La suite reportó `14 passed`, confirmando que los ajustes recientes mantienen la propagación opcional del `organizationId` y habilitando que el equipo prosiga con el plan táctico sin bloqueos.

### 2024-05-06 – Corrida validada `ProvidersService`

- **Contexto:** Como seguimiento a la verificación multi-organización y ante la solicitud de continuar con el plan, se registró una nueva ejecución focalizada en `ProvidersService` para obtener evidencia fresca del estado de la suite.
- **Implementación:** Se volvió a correr `npm test -- providers.service.spec.ts`, constatando que los escenarios con `organizationId` explícito, heredado y nulo mantienen la propagación correcta del tenant en altas, lecturas, actualizaciones y eliminaciones masivas.
- **Resultado:** El comando arrojó `15 passed`, ratificando que las pruebas unitarias permanecen en verde y habilitando avanzar hacia la siguiente iteración del plan sin pendientes en la cobertura de proveedores.

### 2024-05-07 – Validación multi-tenant `ProvidersController`

- **Contexto:** Para completar la cobertura transversal de proveedores en el _Paso 3_ de la Fase 2 era necesario corroborar que la capa HTTP preserve el `organizationId` al delegar operaciones hacia el servicio.
- **Implementación:** Se ejecutó la suite [`backend/src/providers/providers.controller.spec.ts`](../src/providers/providers.controller.spec.ts), verificando la propagación del tenant en altas, listados, lecturas, actualizaciones y bajas masivas, además de las validaciones de payload.
- **Resultado:** La corrida `npm test -- providers.controller.spec.ts` finalizó con `13 passed`, confirmando que el controlador respeta el contexto multi-organización y dejando habilitado continuar con el plan táctico.

### 2024-05-08 – Ampliación de cobertura `ProvidersService`

- **Contexto:** Tras la validación del controlador y las suites previas, se extendió nuevamente la batería de `ProvidersService` para cubrir escenarios adicionales de lecturas, validaciones cruzadas y operaciones masivas multi-organización.
- **Implementación:** Se enriquecieron los _mocks_ de Prisma en [`backend/src/providers/providers.service.spec.ts`](../src/providers/providers.service.spec.ts) para contemplar verificaciones del `organizationId` durante la lectura individual, las actualizaciones puntuales y en bloque, además de reforzar las guardas que impiden operaciones fuera del tenant activo. La suite se reejecutó con `npm test -- providers.service.spec.ts` registrando los nuevos casos.
- **Resultado:** La ejecución reportó `18 passed`, confirmando que los escenarios ampliados mantienen la propagación del tenant, preservan compatibilidad con proveedores legacy (`organizationId: null`) y dejan lista la cobertura para enfocarse en fixtures de integración/E2E multi-organización.

### 2024-05-09 – Instrumentación de lecturas `ProvidersService`

- **Contexto:** Para sostener la observabilidad del _Paso 3_ de la Fase 2 se necesitaba extender la instrumentación temporal de `logOrganizationContext` a las operaciones de consulta de proveedores y verificar que las trazas alerten cuando falta `organizationId`.
- **Implementación:** Se añadieron llamadas a `logOrganizationContext` en los métodos `findAll`, `findOne` y `checkIfExists` del servicio de proveedores, registrando el alcance (`tenant`, `legacy`, `global`) y el identificador consultado. La suite [`backend/src/providers/providers.service.spec.ts`](../src/providers/providers.service.spec.ts) se actualizó para afirmar las nuevas trazas y se incorporó un caso que valida el registro cuando la búsqueda no encuentra resultados.
- **Resultado:** Las operaciones de lectura ahora generan métricas y advertencias consistentes con el resto del dominio, habilitando el monitoreo del acceso legacy y multi-organización mientras se continúan los trabajos sobre fixtures de integración y E2E.

### 2024-05-10 – Reejecución suite `ProvidersController`

- **Contexto:** Tras los últimos ajustes en la capa HTTP de proveedores se solicitó validar nuevamente la propagación del `organizationId` antes de continuar con la fase de fixtures de integración/E2E.
- **Implementación:** Se volvió a ejecutar la suite [`backend/src/providers/providers.controller.spec.ts`](../src/providers/providers.controller.spec.ts), abarcando los escenarios de altas, lecturas, listados, actualizaciones puntuales y masivas, eliminaciones individuales y en bloque, además de las validaciones de payload cuando faltan parámetros obligatorios.
- **Resultado:** El comando `npm test -- providers.controller.spec.ts` finalizó con `19 passed`, confirmando que los controles multi-tenant y las salvaguardas para contextos legacy permanecen estables y habilitando continuar con el plan sin regresiones en la capa HTTP.

### 2024-05-11 – Cobertura unit-test `SalesController`

- **Contexto:** Para sostener el avance del _Paso 3_ de la Fase 2 se necesitaba evidenciar que la capa HTTP de ventas propaga el `organizationId` cuando está disponible y mantiene compatibilidad con flujos legacy que operan sin tenant.
- **Implementación:** Se ejercitó la suite [`backend/src/sales/sales.controller.spec.ts`](../src/sales/sales.controller.spec.ts), validando la creación de ventas, listados, consultas y eliminaciones con `organizationId` explícito, heredado desde el contexto o ausente, además de las invocaciones a métricas como `getTopProducts` y `getTopProductsByRange`.
- **Resultado:** La ejecución `npm test -- sales.controller.spec.ts` reportó `11 passed`, registrando la propagación correcta del tenant y dejando la capa de ventas alineada con el resto de servicios multi-organización mientras se avanza hacia fixtures de integración/E2E.

### 2024-05-12 – Validación E2E multi-organización

- **Contexto:** Con las suites unitarias priorizadas en verde se debía evidenciar que los fixtures multi-tenant habilitados por `applyMultiTenantFixtures` permiten ejecutar las pruebas end-to-end sin regresiones mientras se avanza con el _Paso 3_ de la Fase 2.
- **Implementación:** Se corrió `npm run test:e2e`, lo que dispara Jest con la configuración `backend/test/jest-e2e.json` e invoca el _setup_ global que garantiza la siembra `npm run seed:multi-tenant` para las organizaciones `tenant-alpha` y `tenant-beta` antes de iniciar la batería.
- **Resultado:** La corrida finalizó en verde (`test/tenancy.e2e-spec.ts`) tras aplicar los fixtures multi-organización, dejando constancia de que la suite E2E opera correctamente con los nuevos datos idempotentes y permitiendo continuar con la expansión de fixtures de integración.

### 2024-05-13 – Cobertura `global-setup` multi-organización

- **Contexto:** Para asegurar la estabilidad del _setup_ global previo a las suites E2E se requería validar que `applyMultiTenantFixtures` respete las banderas de control (`SKIP_MULTI_TENANT_SEED`) y el manejo de errores durante la carga de datos multi-tenant.
- **Implementación:** Se ejecutó `npm test -- test/global-setup.spec.ts`, ejercitando los escenarios de _skip_ por bandera, ausencia de `DATABASE_URL`, aplicación exitosa de fixtures con _logger_ prefijado y manejo de errores recuperables y no recuperables de Prisma.
- **Resultado:** La suite reportó cinco casos en verde, confirmando que el _setup_ global orquesta correctamente la siembra multi-organización y deja evidencias listas para integrarlas al pipeline continuo.

### 2024-05-14 – Reejecución suites `EntriesService` y `EntriesController`

- **Contexto:** Tras completar los ajustes multi-organización en compras era necesario capturar una corrida conjunta que demostrara la estabilidad de `EntriesService` y su controlador HTTP antes de continuar con los fixtures de integración.
- **Implementación:** Se ejecutaron `npm test -- entries.service.spec.ts` y `npm test -- entries.controller.spec.ts`, manteniendo los _mocks_ de Prisma y la instrumentación temporal que trazan los payloads enviados a `createEntry`, `deleteEntry` y a los manejadores expuestos por la capa HTTP.
- **Resultado:** Las suites reportaron ocho y tres casos en verde respectivamente, ratificando que las altas, bajas y delegaciones hacia el servicio continúan propagando el `organizationId` explícito, heredado o nulo sin romper compatibilidad legacy y habilitando avanzar con la siguiente iteración del plan.

### 2024-05-15 – Corrida validada `SalesService` y `WebSalesService`

- **Contexto:** Como seguimiento al _Paso 3_ de la Fase 2 se solicitó verificar nuevamente los dominios de ventas presenciales y web tras los últimos ajustes en la propagación del `organizationId`, asegurando que la cobertura unitaria permanezca estable antes de continuar con los fixtures de integración.
- **Implementación:** Se ejecutó `npm test -- sales.service.spec.ts` desde el entorno operativo principal, lo que dispara las suites de `SalesService` y `WebSalesService` y reutiliza los _mocks_ de Prisma junto con la instrumentación de `logOrganizationContext` para casos con `organizationId` explícito, heredado o ausente.
- **Resultado:** La corrida reportó `18 passed` distribuidos en ambas baterías, confirmando el estado verde y habilitando que el equipo prosiga con el plan táctico centrado en la ampliación de fixtures de integración y E2E multi-organización.

### 2024-05-16 – Automatización de fixtures multi-tenant en CI

- **Contexto:** Con la suite E2E estable se necesitaba garantizar que los fixtures multi-organización se apliquen consistentemente en la integración continua para evitar ejecuciones manuales y documentar el procedimiento para el equipo de QA.
- **Implementación:** Se actualizó el _pipeline_ de CI para invocar `npm run seed:multi-tenant` durante el _setup_ previo a `npm run test:e2e`, reutilizando `applyMultiTenantFixtures` y registrando métricas de duración en el dashboard temporal de pruebas. Además, se añadió una nota operativa en Confluence con los pasos de verificación y enlaces a los logs generados.
- **Resultado:** Las corridas automáticas del _pipeline_ aplican ahora los fixtures multi-tenant de manera idempotente, reduciendo tiempos de preparación y asegurando que cualquier falla relacionada al seed se refleje en las métricas monitoreadas por QA y Plataforma.

### 2024-05-17 – Validación unit-test `applyMultiTenantFixtures`

- **Contexto:** Para sostener el avance del _Paso 3_ de la Fase 2 se requería corroborar que el seed multi-organización continúe propagando `organizationId` de forma consistente en todas las entidades de prueba antes de ampliar los fixtures de integración/E2E.
- **Implementación:** Se ejecutó la batería `npm test -- multi-tenant-fixtures.seed.spec.ts`, la cual valida el helper `applyMultiTenantFixtures` verificando que los datos sembrados para `tenant-alpha` y `tenant-beta` mantengan las referencias de organización en cascada.
- **Resultado:** La suite reportó `1 passed`, confirmando que el seed conserva la integridad multi-tenant y dejando el terreno listo para extender las pruebas de integración con los datasets alfa/beta.

### 2024-05-18 – Corrida validada `SalesService` y `WebSalesService`

- **Contexto:** Como seguimiento al _Paso 3_ de la Fase 2 y para mantener la bitácora de ejecuciones locales, se solicitó volver a comprobar que las ventas presenciales y web preserven el `organizationId` al ejecutar su suite dedicada.
- **Implementación:** Se ejecutó `npm test -- sales.service.spec.ts` en el entorno operativo de QA (Windows), lo que dispara las suites de `SalesService` y `WebSalesService` con los _mocks_ de Prisma e instrumentación de `logOrganizationContext` activos para escenarios con `organizationId` explícito, heredado y nulo.
- **Resultado:** Ambas suites reportaron `22 passed` en conjunto, confirmando que la propagación del tenant se mantiene estable y habilitando que el equipo continúe con las tareas del plan (alinear fixtures de integración/E2E y monitorear métricas en CI).

### 2024-05-19 – Script de poblado de `organizationId`

- **Contexto:** Con la Fase 2 enfocada en validar cobertura se requería habilitar el primer entregable de la Fase 3 (_Poblado y validación_) que permita asignar `organizationId` de forma idempotente sobre datos legacy.
- **Implementación:** Se incorporó el script [`backend/prisma/seed/populate-organization-ids.seed.ts`](../prisma/seed/populate-organization-ids.seed.ts) junto al comando `npm run seed:populate-organization-ids`. El helper recorre dominios críticos (`stores`, `users`, `clients`, `inventory`, `entries`, `providers`, `sales`, `transfers`, `orders`, `cashRegister`, `cashTransaction`, `cashClosure`) propagando el tenant desde referencias existentes (tienda, usuario, cliente, entry) y registrando métricas por motivo (`inherit:*`, `fallback`). Se añadió la batería [`backend/prisma/seed/populate-organization-ids.seed.spec.ts`](../prisma/seed/populate-organization-ids.seed.spec.ts) para validar los flujos con _mocks_ de Prisma y modo `dryRun`. El CLI admite `--default-org-code=<code>` para reutilizar un tenant existente en escenarios legacy.
- **Resultado:** El comando `npm run seed:populate-organization-ids` deja trazabilidad de los registros actualizados y habilita ejecutar corridas de prueba sin modificar datos mediante `--dryRun`, preparando el terreno para los scripts específicos por dominio y la validación en staging.

### 2024-05-20 – Verificación unitaria del poblado multi-organización

- **Contexto:** Después de integrar el script de poblamiento era necesario constatar que la suite dedicada permaneciera estable para continuar con el plan de ejecución en ambientes superiores.
- **Implementación:** Se corrió `npm test -- populate-organization-ids.seed.spec.ts`, verificando los escenarios de propagación por herencia y `fallback`, el modo `--dryRun`, los filtros de entidades y la sobreescritura del código de organización por defecto, además del manejo de argumentos inválidos.
- **Resultado:** La batería reportó `7 passed`, confirmando que las reglas de asignación funcionan según lo esperado y habilitando la siguiente etapa: ejecutar el seed en staging monitoreando métricas y trazas.

### 2024-05-21 – Revalidación suite `InventoryService`

- **Contexto:** Tras los ajustes recientes en fixtures multi-organización se solicitó confirmar que el dominio de inventario mantenga la propagación del `organizationId` antes de continuar con la fase de fixtures de integración/E2E.
- **Implementación:** Se ejecutó `npm test -- src/inventory/inventory.service.spec.ts` en el entorno operativo de QA (Windows), verificando los escenarios parametrizados de transferencias, historiales, precios de compra y procesamiento de catálogos con `organizationId` explícito, heredado o nulo.
- **Resultado:** La suite reportó `13 passed`, ratificando que las operaciones de inventario preservan el tenant en cada flujo y habilitando continuar con las próximas acciones del plan sin regresiones en este dominio.

### 2024-05-22 – Corrida validada `EntriesService`

- **Contexto:** Como seguimiento al _Paso 3_ de la Fase 2 y tras los últimos ajustes en fixtures multi-organización, se requería reconfirmar que el dominio de compras preserve la propagación opcional del `organizationId` antes de avanzar con las siguientes iteraciones del plan.
- **Implementación:** Se corrió `npm test -- entries.service.spec.ts`, observando los _logs_ instrumentados que documentan los payloads recibidos por `createEntry` y las entidades generadas en Prisma para escenarios con `organizationId` explícito, heredado desde la tienda o ausente, además de la cobertura de búsquedas y eliminaciones parametrizadas por tenant.
- **Resultado:** La batería registró `14 passed`, con evidencia de que las operaciones de alta, lectura y baja mantienen el identificador de organización correspondiente o `NULL` para flujos legacy, dejando habilitado continuar con la planificación de fixtures de integración/E2E multi-organización.

### 2024-05-23 – Registro automatizado de resúmenes del seed multi-organización

- **Contexto:** Para documentar métricas durante la ejecución controlada de `npm run seed:populate-organization-ids` (Fase 3), era necesario generar un reporte idempotente con los totales procesados por entidad sin depender de capturas manuales.
- **Implementación:** Se añadió la bandera `--summary-path=<ruta>` al comando, persistiendo un JSON con el `organizationId` utilizado, el detalle por entidad y un sello temporal (`generatedAt`). El helper asegura la creación del directorio destino y registra advertencias si la escritura falla.
- **Resultado:** Cada corrida del seed puede almacenar su resumen estructurado y reutilizable, habilitando la trazabilidad de métricas en staging y producción y simplificando la evidencia requerida por Operaciones y QA.

### 2024-05-24 – Resiliencia ante errores al generar el resumen del seed

- **Contexto:** Para garantizar la trazabilidad aun cuando falle la escritura del resumen en disco se necesitaba validar el manejo de errores del helper `persistSummaryToFile` y las métricas entregadas por `populateMissingOrganizationIds`.
- **Implementación:** Se incorporó una prueba unitaria que fuerza un error de E/S en `writeFile`, verificando que el seed registre la advertencia correspondiente y continúe retornando el resumen en memoria sin adjuntar `summaryFilePath`.
- **Resultado:** El comando `npm test -- populate-organization-ids.seed.spec.ts` ahora evidencia el comportamiento resiliente del seed, asegurando que la corrida entregue estadísticas aunque no pueda persistir el archivo JSON.

### 2024-05-25 – Métricas de progreso por _chunks_ en el seed multi-organización

- **Contexto:** Con el objetivo de monitorear la ejecución del poblamiento en lotes grandes (Fase 3) se necesitaba instrumentar trazas por _chunk_ que permitan seguir el avance en tiempo real y detectar fácilmente cuellos de botella o fallas puntuales.
- **Implementación:** Se actualizó `populateMissingOrganizationIds` para registrar un log por cada lote procesado indicando el número de _chunk_ y la cantidad de registros actualizados, además de acumular los totales parciales antes del resumen final. Se añadió una prueba unitaria que fuerza lotes de tres tiendas con `chunkSize=2`, validando las nuevas trazas (`chunk 1/2`, `chunk 2/2`) y la métrica consolidada.
- **Resultado:** El seed deja evidencia granular de progreso y mantiene el resumen acumulado, habilitando la observabilidad necesaria cuando se ejecute en staging y producción.

### 2024-05-26 – Reejecución suite `populate-organization-ids.seed`

- **Contexto:** Como seguimiento al _Paso 3_ de la Fase 2 y previo a coordinar la ejecución controlada del poblado en staging, se requirió validar nuevamente que la batería de pruebas del seed multi-organización permaneciera estable.
- **Implementación:** Se ejecutó `npm test -- populate-organization-ids.seed.spec.ts`, repasando los escenarios de propagación por herencia, métricas por _chunk_, manejo de errores al persistir el resumen, modo `--dryRun`, filtros por entidad y sobreescritura del código de organización por defecto.
- **Resultado:** La suite reportó `9 passed`, confirmando que las recientes mejoras mantienen la integridad del seed y habilitando avanzar con la planificación operativa de la Fase 3.

### 2024-05-27 – Búsqueda multi-tenant en `Providers`

- **Contexto:** Para facilitar la operación durante el _Paso 3_ de la Fase 2 se requería habilitar búsquedas acotadas por tenant que reutilicen los filtros de organización sin perder compatibilidad con proveedores legacy.
- **Implementación:** Se extendió `ProvidersService.findAll` agregando filtros `OR` con coincidencias insensibles a mayúsculas por nombre, RUC, correo, teléfono y dirección, respetando el `organizationId` activo y registrando el `scope` junto al término buscado en `logOrganizationContext`. El controlador expone ahora el query param `search`, normaliza el valor y delega la combinación de filtros hacia el servicio, manteniendo el ordenamiento ascendente por nombre. Las suites `providers.service.spec.ts` y `providers.controller.spec.ts` se actualizaron con casos que cubren búsquedas con y sin tenant, valores vacíos y propagación de metadatos multi-organización.
- **Resultado:** El listado de proveedores ofrece búsquedas consistentes para escenarios multi-organización y legacy, dejando documentada la funcionalidad en la bitácora para las próximas iteraciones del plan.

### 2024-05-28 – Extensión de CLI y métricas del seed multi-organización

- **Contexto:** Antes de coordinar la ejecución del poblado en staging se necesitaba reforzar la trazabilidad del comando `npm run seed:populate-organization-ids`, incorporando banderas operativas y validaciones adicionales que faciliten la supervisión durante corridas controladas.
- **Implementación:** Se añadió el soporte `--summary-stdout` para imprimir en consola el resumen JSON generado por `populateMissingOrganizationIds`, junto con nuevos parseos tipados para argumentos booleanos, numéricos y listas en `parsePopulateOrganizationCliArgs`. Además, se robustecieron las métricas por _chunk_ y las advertencias cuando se omiten entidades o se detectan argumentos inválidos, extendiendo la suite `populate-organization-ids.seed.spec.ts` con casos dedicados.
- **Resultado:** El comando reporta ahora once casos en verde (`npm test -- populate-organization-ids.seed.spec.ts`), dejando documentadas las banderas adicionales y asegurando que los equipos operativos cuenten con telemetría suficiente para monitorear la corrida del seed multi-organización.

### 2024-05-29 – Validación automatizada de `organizationId`

- **Contexto:** Con el script de poblamiento listo para corridas controladas se requería habilitar una verificación independiente que alertara sobre filas sin `organizationId` o con referencias inconsistentes antes de promover datos a staging/producción.
- **Implementación:** Se creó el comando `npm run seed:validate-organization-ids`, el cual reutiliza los modelos de Prisma para contabilizar valores presentes, ausentes y desalineados por dominio. La suite [`backend/prisma/seed/validate-organization-ids.seed.spec.ts`](../prisma/seed/validate-organization-ids.seed.spec.ts) cubre filtros por entidad, exportes del resumen (`--summary-path`, `--summary-stdout`) y la bandera `--fail-on-missing` que corta la ejecución ante hallazgos críticos. Se confirmó la integración con `populateMissingOrganizationIds` ejecutando `npm test -- prisma/seed/validate-organization-ids.seed.spec.ts prisma/seed/populate-organization-ids.seed.spec.ts`.
- **Resultado:** El validador entrega métricas homogéneas por entidad, provee ejemplos de registros inconsistentes y permite fallar la tubería cuando se detectan faltantes o desalineaciones, completando el andamiaje de comprobaciones previo a la Fase 3.

### 2024-05-30 – Orquestación combinada de poblamiento y validación

- **Contexto:** Para coordinar la corrida controlada en staging (Próximas acciones 6) se necesitaba un _wrapper_ que ejecutara secuencialmente `populateMissingOrganizationIds` y `validateOrganizationIds`, compartiendo Prisma, filtros y rutas de reporte.
- **Implementación:** Se añadió `npm run seed:populate-and-validate`, respaldado por [`backend/prisma/seed/populate-and-validate.seed.ts`](../prisma/seed/populate-and-validate.seed.ts). El comando permite saltar etapas (`--skip-populate`, `--skip-validate`), reutiliza las selecciones de entidades entre ambos pasos, acepta directorios de resumen (`--summary-dir`) y expone banderas específicas para poblamiento y validación. La suite [`backend/prisma/seed/populate-and-validate.seed.spec.ts`](../prisma/seed/populate-and-validate.seed.spec.ts) asegura la propagación de Prisma/logger compartidos y la compatibilidad del parser CLI con combinaciones de banderas y valores booleanos explícitos.
- **Resultado:** Operaciones puede gatillar una sola instrucción para poblar y auditar `organizationId`, registrando reportes diferenciados por fase y habilitando la trazabilidad exigida antes de promover el script a producción.

### 2024-05-31 – Reejecución suite `populate-and-validate`

- **Contexto:** Luego de habilitar el _wrapper_ combinado era necesario registrar una corrida adicional que constatara la estabilidad de la suite dedicada antes de coordinar la ejecución controlada en staging.
- **Implementación:** Se ejecutó `npm test -- prisma/seed/populate-and-validate.seed.spec.ts`, verificando nuevamente la orquestación conjunta del poblamiento y la validación, el intercambio del cliente Prisma y del _logger_ compartido, así como el parseo de banderas para filtros, _skip_ y generación de resúmenes.
- **Resultado:** La batería reportó `11 passed`, confirmando que los ajustes recientes se mantienen en verde y que el comando `seed:populate-and-validate` está listo para utilizarse durante las corridas supervisadas de la Fase 3.

### 2024-06-01 – Reejecución suite `populate-organization-ids.seed`

- **Contexto:** Tras los ajustes de trazabilidad y el refuerzo del parser CLI, se requería validar nuevamente que el script de poblamiento mantuviera la cobertura completa antes de ejecutar corridas extendidas en ambientes supervisados.
- **Implementación:** Se volvió a correr `npm test -- populate-organization-ids.seed.spec.ts` desde el entorno operativo principal, verificando los escenarios de propagación por herencia y `fallback`, el _logging_ de resúmenes con `--summary-stdout`, las métricas por _chunk_ y el parseo de argumentos booleanos, numéricos y de listas.
- **Resultado:** La suite reportó `13 passed` en 8 segundos, confirmando que las salvaguardas del seed permanecen estables para futuras iteraciones del plan.

### 2024-06-02 – Corrida conjunta de seeds multi-organización

- **Contexto:** Tras integrar el _wrapper_ combinado de poblamiento y validación, se necesitaba evidenciar una ejecución conjunta que dejara constancia del estado verde antes de coordinar la ventana en staging (Próximas acciones 6 y 7).
- **Implementación:** Se ejecutó `npm test -- prisma/seed/populate-organization-ids.seed.spec.ts prisma/seed/populate-and-validate.seed.spec.ts`, verificando que ambas suites convivan en una misma corrida y que el _wrapper_ reutilice correctamente Prisma, los parsers CLI y las métricas consolidadas de resumen.
- **Resultado:** El comando registró `27 passed` con ambas baterías en verde, confirmando que la orquestación conjunta está lista para supervisar corridas controladas y habilitando el siguiente paso del plan en ambientes superiores.

### 2024-06-03 – Revalidación guardia y servicio de contexto de tenant

- **Contexto:** Con las suites de seeds consolidadas se requirió confirmar que la capa transversal de tenancy siga resolviendo el contexto correctamente antes de ampliar las pruebas de integración multi-organización.
- **Implementación:** Se reejecutaron `npm test -- tenant-context.service.spec.ts` y `npm test -- tenant-context.guard.spec.ts`, verificando la priorización de cabeceras `x-org-id`/`x-org-unit-id`, los _fallbacks_ hacia organizaciones por defecto, la preservación de listas permitidas y la inyección del `tenantContext` en la capa HTTP.
- **Resultado:** Las baterías reportaron `7 passed` y `1 passed` respectivamente, dejando constancia de que tanto `TenantContextService` como `TenantContextGuard` mantienen la propagación esperada del `organizationId` y habilitando el avance hacia fixtures de integración supervisados.

## Referencias
- Script de seed: [`prisma/seed/organizations.seed.ts`](../prisma/seed/organizations.seed.ts)
- Fixtures multi-tenant: [`prisma/seed/multi-tenant-fixtures.seed.ts`](../prisma/seed/multi-tenant-fixtures.seed.ts)
- Datos de ejemplo: [`prisma/data/organizations.json`](../prisma/data/organizations.json)
- Validador multi-tenant: [`prisma/seed/validate-organization-ids.seed.ts`](../prisma/seed/validate-organization-ids.seed.ts)
- Plan de migración original (resumen provisto en la historia de usuario).
### 2024-06-04 – Métricas de cobertura multi-tenant en _global setup_

- **Contexto:** Para completar la visibilidad requerida en el Paso 3 (Fase 2) era necesario medir cuántas entidades quedan cubiertas en cada corrida de fixtures multi-organización.
- **Implementación:** Se extendió `backend/test/global-setup.ts` para generar un JSON con organizaciones procesadas, entidades cubiertas y ratio de cobertura (`MULTI_TENANT_FIXTURES_METRICS_PATH`, `MULTI_TENANT_FIXTURES_METRICS_STDOUT`), se añadieron los _runners_ `npm run test:e2e:metrics` y `npm run badge:multi-tenant-coverage` para publicar la métrica, y se actualizó `backend/test/global-setup.spec.ts` verificando la escritura del archivo y la salida por `stdout`.
- **Resultado:** La tubería de CI puede consumir el archivo o la salida estándar para publicar la métrica de cobertura multi-tenant, dejando el Paso 3 listo para enfocarse en fixtures de integración/E2E y la planificación de la Fase 3.

### 2024-06-05 – Orquestación Phase 3 en pipelines multi-tenant

- **Contexto:** De cara a las corridas supervisadas de la Fase 3 era necesario automatizar la invocación del `populate-and-validate` previo a las suites E2E, aprovechando los CLI existentes y sin duplicar lógica de banderas.
- **Implementación:** Se añadió el helper `buildPhase3OptionsFromEnv` (`backend/scripts/phase3-config.ts`) que interpreta las variables `PHASE3_*`, crea el directorio de reportes, permite persistir la configuración (`PHASE3_OPTIONS_PATH`) y expone `printOptions` para depuración. El runner `npm run phase3:run` quedó apoyado en dicho helper y permite imprimir la configuración efectiva con `PHASE3_PRINT_OPTIONS=true`. Se actualizó `npm run ci:multi-tenant-report` (`backend/scripts/e2e-multi-tenant-report.ts`) para aceptar `--phase3` y banderas `--phase3-*`, ejecutar `phase3:run` antes de `npm run test:e2e:metrics`, propagar overrides vía `--phase3-env` y garantizar que los resúmenes/artefactos queden en `tmp/phase3`.
- **Resultado:** Los pipelines CI/CD pueden poblar y validar `organizationId` automáticamente antes de la suite multi-organización, registrar resúmenes JSON en `tmp/phase3`, persistir la configuración y reutilizar los mismos comandos en corridas manuales o supervisadas.

### 2024-06-05 – Artefactos Phase 3 en CI

- **Contexto:** Luego de habilitar la ejecución automática de `phase3:run`, era necesario conservar los reportes JSON generados (`populate-summary.json`, `validate-summary.json`) junto a las métricas multi-tenant para su análisis posterior.
- **Implementación:** El workflow `Multi-tenant Coverage` ahora sube el directorio `backend/tmp/phase3` (incluyendo `options.json` cuando se define `PHASE3_OPTIONS_PATH` y el `report.json` generado) como parte del artefacto `multi-tenant-metrics`, garantizando que los resúmenes de Phase 3 queden disponibles tras cada corrida de CI.
- **Resultado:** Operaciones y QA pueden descargar los reportes de poblado/validación desde los artefactos de la pipeline, manteniendo la trazabilidad requerida para las corridas supervisadas de la Fase 3.

### 2024-06-06 – Consolidación de configuración Phase 3

- **Contexto:** Para simplificar las corridas de `phase3:run` en distintos entornos se requería un parser consistente de variables `PHASE3_*` que validara banderas, rutas y entidades disponibles.
- **Implementación:** Se fortaleció [`backend/scripts/phase3-config.ts`](../scripts/phase3-config.ts) centralizando la lectura de banderas booleanas, numéricas y listas (`PHASE3_SKIP_*`, `PHASE3_DEFAULT_ORG_CODE`, `PHASE3_ONLY_ENTITIES`, etc.) y calculando rutas absolutas para resúmenes/opciones. La suite [`backend/test/phase3-config.spec.ts`](../test/phase3-config.spec.ts) valida casos por defecto, overrides completos y errores ante entidades inválidas.
- **Resultado:** Las corridas automatizadas y manuales de Phase 3 comparten ahora un helper único que devuelve opciones normalizadas, directorios listos para usarse y mensajes de validación homogéneos.

### 2024-06-06 – Reporte consolidado `phase3:report`

- **Contexto:** Al preparar la supervisión operativa de la Fase 3 se necesitaba un resumen sintetizado que combinara los resultados de poblamiento y validación para adjuntarlos en reportes y artefactos de CI.
- **Implementación:** Se añadió [`backend/scripts/phase3-report.ts`](../scripts/phase3-report.ts) junto al comando `npm run phase3:report`, que lee los resúmenes generados por `populate-and-validate`, agrega totales por entidad, alerta sobre hallazgos (`missing`, `mismatched`) y soporta banderas `--dir`, `--populate`, `--validate`, `--output` y `--summary-stdout`. La suite [`backend/test/phase3-report.spec.ts`](../test/phase3-report.spec.ts) asegura la agregación de métricas, el manejo de escenarios parciales y los mensajes de error cuando no se proveen resúmenes.
- **Resultado:** Operaciones cuenta con un reporte estándar que resume el avance de Phase 3, listo para anexar a dashboards, pipelines y bitácoras sin reprocesar los JSON individuales.

