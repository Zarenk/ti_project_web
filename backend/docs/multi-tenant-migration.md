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
  - 🚧 _Paso 3_: Diseño y ejecución de pruebas unitarias/integración para escenarios con y sin `organizationId` en curso; ya se consolidó la batería de `StoresService`, se extendió la instrumentación temporal de logs multi-organización, se añadió la suite de `SalesService`, se incorporó la batería de `InventoryService`, se reactivó la suite de `ClientService` tras resolver tipados de Prisma, se verificó la suite de `UsersService` cubriendo registros con y sin tenant, se agregó la suite de `WebSalesService` validando la propagación del tenant en órdenes y ventas web, se instrumentó `EntriesService` con su batería multi-organización, se incorporó la suite de `AdsService` garantizando el aislamiento de campañas y creatividades por tenant, se añadió la suite de `ProvidersService` reforzando altas, actualizaciones y eliminaciones multi-tenant, se consolidó la suite de `ProvidersController` asegurando el mapeo del tenant en la capa HTTP, se sumó la suite de `CashregisterService` validando cajas y cierres multi-organización, se documentó la suite de `OrderTrackingService` asegurando búsquedas acotadas al tenant activo y se agregó la suite de `SalesController` validando la propagación del tenant desde la capa HTTP. Se registró una corrida verde de todas las suites parametrizadas, habilitando el foco en fixtures de integración/E2E multi-organización. **Actualización:** se creó el seed `npm run seed:multi-tenant` con datasets alfa/beta para soportar pruebas de integración y E2E, y se validó la suite `populate-organization-ids.seed.spec.ts` para asegurar la cobertura de la nueva automatización de poblamiento.

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
2. Completar la verificación de la instrumentación temporal de logs y métricas en servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`), asegurando que los tipados de Prisma permitan los nuevos campos y documentando consumidores faltantes.
3. Completar las suites unitarias/integración priorizadas (`stores`, `clients`) cubriendo `organizationId` nulo o definido y habilitar su ejecución continua (Fase 2 – Paso 3). Documentar cualquier bloqueo derivado de validaciones o tipados y resolverlo en conjunto con el equipo de plataforma.
4. Extender la cobertura de pruebas al resto de dominios (`inventory`, `sales`, `websales`) siguiendo el mismo patrón de parametrización multi-organización. **Actualización:** las suites unitarias de `InventoryService` y `WebSalesService` ya validan escenarios con y sin tenant; queda ampliar fixtures de integración/E2E y monitorear la propagación de `organizationId` en `sales` dentro de staging.
5. Planificar la **Fase 3 – Poblado y validación** con el equipo de datos. Entregables:
   - Definición de reglas de asignación por tabla (fuentes, columnas puente, excepciones manuales).
   - Scripts idempotentes por dominio con logging y métricas de progreso.
   - Calendario de ejecución en producción con ventanas de mantenimiento y responsables.
6. Coordinar la ejecución controlada de `npm run seed:populate-organization-ids` en staging, documentando resultados y métricas antes de habilitar la corrida en producción.

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

## Referencias
- Script de seed: [`prisma/seed/organizations.seed.ts`](../prisma/seed/organizations.seed.ts)
- Fixtures multi-tenant: [`prisma/seed/multi-tenant-fixtures.seed.ts`](../prisma/seed/multi-tenant-fixtures.seed.ts)
- Datos de ejemplo: [`prisma/data/organizations.json`](../prisma/data/organizations.json)
- Plan de migración original (resumen provisto en la historia de usuario).