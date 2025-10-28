# Guia paso a paso para habilitar organizaciones multi-compania

Esta guia describe el flujo recomendado para completar la implementacion backend que permite a una organizacion administrar una o mas companias, mantener la coherencia referencial y exponer la informacion a los consumidores del API.

## Estado de avance actual

- ✅ **Paso 1 – Modelo de datos y migraciones:** El esquema de Prisma ya incluye las relaciones `organizationId`/`companyId` en `Company`, `OrganizationUnit`, `Product` y `Category`, con restricciones `@@unique([organizationId, name])` y reglas `onDelete` alineadas al negocio (`Cascade` y `SetNull`). Las migraciones recientes reflejan estos cambios, aunque falta ampliar los _seeds_ para poblar companias iniciales.
- ✅ **Paso 2 – Tipos y entidades:** `CompanySnapshot` y `TenancySnapshot` en `backend/src/tenancy/entities/tenancy.entity.ts` contienen los atributos esperados (`status`, `legalName`, `taxId`, etc.) sin artefactos sobrantes.
- ✅ **Paso 3 – DTOs:** `CreateTenancyDto` y `UpdateTenancyDto` ya integran `CompanyInputDto` con validaciones para nombre, razon social, RUC y estado, permitiendo cargas anidadas de companias.
- ✅ **Paso 4 – TenancyService:** Los metodos `create`, `update`, `persistUnits`, `upsertUnit` y `syncCompanies` manejan companias dentro de transacciones, verifican pertenencia por organizacion y normalizan las respuestas.
- ⚠️ **Paso 5 – TenantContext y servicios dependientes:** `TenantContextService` valida `allowedCompanyIds` y servicios clave (`stores`, `sales`, `clients`, `websales`, `entries`, `inventory`) ya aplican filtros por compañia/organización, registrando eventos con ambos identificadores. Aún resta incorporar la misma lógica en contabilidad y reportes para garantizar consistencia total.
- ⚠️ **Paso 6 – Pruebas:** Los _specs_ unitarios principales (`TenantContextService`, `TenancyService`, `ClientsService`, `StoresController`, `SalesController`, `EntriesService`, `WebSalesService`, `InventoryService`) cubren escenarios multi-compañía y se ejecutó `npm test` con resultados en verde. Siguen pendientes escenarios negativos (desactivación, compañías externas o RUC duplicado) y pruebas e2e.
- ⭕ **Paso 7 – Validaciones y documentacion:** Pendiente documentar los nuevos campos en Swagger/OpenAPI y agregar validaciones/pipes especializados (ej. formato de RUC).
- ⭕ **Paso 8 – Checklist final:** Restan datos de prueba coherentes, ejecucion documentada de la suite completa y sincronizacion final de documentacion antes de habilitar cambios en frontend.

## 1. Revisar el modelo de datos y migraciones
### Estado actual
- `backend/prisma/schema.prisma` define `companyId` opcional con `onDelete: SetNull` en entidades dependientes (`Product`, `Category`, `OrganizationUnit`) y mantiene `Cascade` en la relacion `Organization` → `Company`.
- Existen migraciones en `backend/prisma/migrations` que incorporan las nuevas llaves y restricciones de unicidad.

### Pasos siguientes
- Actualizar los _seeds_ (`backend/prisma/seed/**`) para crear al menos una compania por organizacion.
- Validar manualmente la migracion sobre una base de datos de desarrollo y documentar ajustes adicionales requeridos en tablas consumidoras (`Store`, `Sales`, `Client`, etc.).

## 2. Normalizar los tipos y entidades de dominio
### Estado actual
- `backend/src/tenancy/entities/tenancy.entity.ts` expone `CompanySnapshot` con `name`, `legalName`, `taxId`, `status`, `createdAt` y `updatedAt`, e integra `companies: CompanySnapshot[]` en `TenancySnapshot`.
- No se detectan discrepancias entre los tipos de dominio y las definiciones de Prisma.

### Pasos siguientes
- Evaluar si se requieren atributos extra (p. ej. `address`, `phone`) y mantenerlos sincronizados con el esquema cuando se incorporen.

## 3. Exponer companias en los DTOs de tenencia
### Estado actual
- `CompanyInputDto` incluye validaciones para los campos clave y se reutiliza en creacion y actualizacion.
- `CreateTenancyDto` y `UpdateTenancyDto` aceptan arreglos opcionales de companias, configurados con `@ValidateNested` y `@Type` para validacion recursiva.

### Pasos siguientes
- Añadir reglas adicionales (longitud minima, patrones de RUC, estandarizacion de mayusculas) segun la normativa que defina el equipo legal/contable.ra `status` o validaciones de longitud minima del nombre) en consonancia con la normativa interna.

## 4. Implementar persistencia de companias en `TenancyService`
### Estado actual
- `TenancyService.create` crea organizaciones, companias y unidades dentro de una misma transaccion e invoca `persistCompanies` para validar duplicados y normalizar campos.
- `TenancyService.update` sincroniza companias mediante `syncCompanies`, valida pertenencia con `assertCompanyBelongsToOrganization` y reutiliza `upsertUnit` para controles de `companyId` en unidades.
- Las respuestas devuelven instantaneas completas (`companies`, `units`, `membershipCount`, `superAdmin`).

### Pasos siguientes
- Definir la estrategia final para desactivar companias ausentes (p. ej. marcar `INACTIVE`) y cubrirla con pruebas dedicadas.
- Extraer utilidades compartidas si surgen nuevas validaciones repetidas al ampliar la logica.

## 5. Ajustar el contexto de tenant y servicios dependientes
### Estado actual
- `TenantContextService` valida `allowedCompanyIds`, construye filtros de organizacion/compania/unidad y rechaza cabeceras no autorizadas.
- Servicios como `stores`, `sales`, `clients`, `websales`, `entries` e `inventory` ya invocan `buildOrganizationFilter`, `resolveCompanyId` y `resolveOrganizationId` para restringir operaciones al contexto seleccionado.

### Pasos siguientes
- Auditar módulos restantes (contabilidad, reportes, etc.) y adoptar el mismo patrón de filtrado.
- Documentar buenas practicas para nuevos servicios que dependan del contexto de tenant.

## 6. Ampliar las pruebas automatizadas
### Estado actual
- `backend/src/tenancy/tenant-context.service.spec.ts` cubre resolución de IDs, listas permitidas y cabeceras no autorizadas.
- `backend/src/tenancy/tenancy.service.spec.ts` valida creación de compañías, sincronización y errores por pertenencia.
- Servicios dependientes (`clients`, `stores`, `sales`, `websales`, `entries`, `inventory`) cuentan con specs multi-compañía y la suite `npm test` se ejecutó en verde.

### Pasos siguientes
- Extender las pruebas con escenarios negativos (RUC duplicado, companias externas) y casos de desactivacion.
- Agregar pruebas de integracion/e2e que verifiquen cabeceras `x-company-id`/`x-org-id` y flujos completos.
- Automatizar la ejecucion de `npm test` y `npm run test:e2e` en CI antes de despliegues.

## 7. Validaciones adicionales y documentacion
### Estado actual
- Las validaciones actuales se limitan a controles basicos en los DTOs.
- Swagger/OpenAPI y la documentacion externa aun no reflejan los nuevos campos ni ejemplos de payload multicompania.

### Pasos siguientes
- Implementar pipes o guardas adicionales (por ejemplo, verificacion de formato de RUC, longitud minima de razon social).
- Actualizar la documentacion de API y agregar ejemplos de peticiones/respuestas con multiples companias.


## 8. Checklist final antes de pasar al frontend
- Base de datos migrada y con datos de prueba coherentes.
- TenancyService crea/actualiza companias y valida `companyId` en las unidades.
- TenantContext y servicios derivados aplican filtros por compania.
- Suite de pruebas en verde y documentacion sincronizada.

### Estado actual
- La lógica principal está integrada, la batería de `npm test` se ejecutó en verde y se documentó el avance; faltan datos de prueba multicompañía consistentes y la ejecución documentada de pruebas e2e completas.

### Pasos siguientes
- Preparar una base de datos semilla con organizaciones y companias reales para pruebas funcionales.
- Cerrar las brechas de los pasos 5 a 7 y coordinar con frontend la exposicion de los nuevos campos tras validar la capa backend.
