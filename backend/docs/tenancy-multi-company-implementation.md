# Guia paso a paso para habilitar organizaciones multi-compania

Esta guia describe el flujo recomendado para completar la implementacion backend que permite a una organizacion administrar una o mas companias, mantener la coherencia referencial y exponer la informacion a los consumidores del API.

## 1. Revisar el modelo de datos y migraciones
1. **Auditar el esquema actual de Prisma** (`backend/prisma/schema.prisma`): confirmar que los modelos `Company` y `OrganizationUnit` tienen las relaciones y restricciones esperadas (`@@unique([organizationId, name])`, claves foraneas y `companyId` opcional en unidades).
2. **Corregir inconsistencias** en caso de encontrar campos faltantes o `onDelete` incorrectos; ajustar el esquema conforme a la logica de negocio (por ejemplo, mantener `Cascade` entre `Organization` y `Company` y `SetNull` en las referencias opcionales).
3. **Generar la migracion** (`npm run prisma:migrate` o `npx prisma migrate dev`) y validar que la base de datos refleja el nuevo `companyId` en tablas dependientes como `Store`, `Sales` o `Client`.
4. **Actualizar los seeds** si se emplean datos iniciales para pruebas manuales, asegurandose de crear al menos una compania asociada a cada organizacion existente.

## 2. Normalizar los tipos y entidades de dominio
1. Abrir `backend/src/tenancy/entities/tenancy.entity.ts` y **corregir la definicion de `CompanySnapshot`** eliminando el `};` sobrante y asegurando que `TenancySnapshot` incluya `companies: CompanySnapshot[]`.
2. Extender `CompanySnapshot` si se requieren atributos adicionales (p. ej. `status`, `legalName`, `taxId`) y mantener los tipos en sincron�a con Prisma.
3. Crear tipos auxiliares para reutilizar en DTOs y respuestas si se necesitan estructuras especificas para creacion/edicion de companias.

## 3. Exponer companias en los DTOs de tenencia
1. En `backend/src/tenancy/dto/create-tenancy.dto.ts`, **anadir un DTO anidado** `CompanyInputDto` con validaciones para `name`, `legalName`, `taxId` y `status`.
2. Incorporar un arreglo opcional `companies?: CompanyInputDto[]` dentro de `CreateTenancyDto`, aplicando `@ValidateNested` y `@Type` para garantizar la validacion recursiva.
3. Extender `UpdateTenancyDto` (`backend/src/tenancy/dto/update-tenancy.dto.ts`) para permitir operaciones de `upsert`/desactivacion sobre companias (incluyendo `id` opcional para distinguir entre creacion y actualizacion).
4. Anadir reglas de negocio en los DTOs (por ejemplo, `@IsIn(['ACTIVE','INACTIVE'])` para `status` o validaciones de longitud minima del nombre) en consonancia con la normativa interna.

## 4. Implementar persistencia de companias en `TenancyService`
1. Actualizar `create` (`backend/src/tenancy/tenancy.service.ts`) para **crear companias dentro de la transaccion**: iterar sobre `createTenancyDto.companies`, validar unicidad de nombre por organizacion y registrar `taxId`/`legalName` cuando aplique.
2. Ajustar `persistUnits`/`upsertUnit` para validar que cualquier `companyId` suministrado pertenezca a la organizacion actual; lanzar `BadRequestException` si se referencia una compania externa.
3. En `update`, implementar logica de **upsert de companias**: detectar registros por `id`, actualizar datos existentes, crear nuevas companias y desactivar (no borrar) las ausentes segun las reglas de negocio.
4. Normalizar las respuestas para que `companies` refleje el estado persistido (no retornar arreglos vacios) y se mantenga la consistencia con `TenancySnapshot`.
5. Centralizar validaciones repetidas en metodos privados (por ejemplo, `sanitizeCompanyInput`, `assertCompanyBelongsToOrganization`) para mantener el servicio legible y testeable.

## 5. Ajustar el contexto de tenant y servicios dependientes
1. Revisar `backend/src/tenancy/tenant-context.service.ts` para garantizar que **`resolveCompanyId`** valida contra `allowedCompanyIds` y retorna errores claros si la cabecera contiene una compania no autorizada.
2. Actualizar `buildOrganizationFilter` para incluir `companyId` en los filtros cuando corresponda, evitando fugas de datos entre companias del mismo tenant.
3. Modificar servicios que consumen `TenantContext` (por ejemplo, `backend/src/stores/stores.service.ts`, `backend/src/sales/sales.service.ts`) para aplicar filtros por `companyId` en operaciones de lectura/actualizacion/borrado, no solo en la creacion.
4. Revisar modulos relacionados (`Orders`, `Clients`, etc.) para propagar el nuevo control de compania siguiendo el patron del servicio de ventas.

## 6. Ampliar las pruebas automatizadas
1. Corregir y ampliar `backend/src/tenancy/tenant-context.service.spec.ts` para incluir los nuevos campos (`companyId`, `allowedCompanyIds`) en los objetos esperados y cubrir casos de exito/fallo de `resolveCompanyId`.
2. Crear pruebas unitarias para `TenancyService` que validen la creacion, actualizacion, desactivacion y validaciones cruzadas de companias (ej. `companyId` ajeno a la organizacion). Revisar `backend/src/tenancy/tenancy.service.spec.ts` como punto de partida.
3. Actualizar pruebas de integracion o e2e si existen (busque en `backend/test`) para reflejar el flujo multicompan�a completo.
4. Ejecutar la suite (`npm test`, `npm run test:e2e`) y asegurar que todo pase antes de fusionar cambios.

## 7. Validaciones adicionales y documentacion
1. Anadir guardas o pipes personalizados si se requieren validaciones adicionales (por ejemplo, formato de RUC) y documentar las reglas en OpenAPI/Swagger.
2. Actualizar los contratos de API (decoradores `@ApiProperty`, ejemplos de respuesta) para que el frontend conozca los nuevos campos.
3. Documentar en el README del modulo o en `docs/` la forma correcta de consumir el endpoint con multiples companias, incluyendo payloads de ejemplo y pautas de migracion de datos legados.

## 8. Checklist final antes de pasar al frontend
- Base de datos migrada y con datos de prueba coherentes.
- TenancyService crea/actualiza companias y valida `companyId` en las unidades.
- TenantContext y servicios derivados aplican filtros por compania.
- Suite de pruebas en verde y documentacion sincronizada.

Cumplir estos pasos garantiza que el backend exponga correctamente la funcionalidad multicompan�a y permita al frontend construir las pantallas correspondientes con datos confiables.
