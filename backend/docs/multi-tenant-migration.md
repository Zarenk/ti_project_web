# Seguimiento migración Single DB + RLS

Este documento detalla el avance táctico del plan por fases para habilitar multi-tenancy en un único esquema con Row-Level Security.

## Estado general
- **Fase 1 – Nuevas tablas sin impacto:**
  - ✅ _Paso 1_: Tablas `Organization` y `OrganizationUnit` definidas en Prisma y disponibles mediante migraciones sin afectar el resto del modelo.
  - ✅ _Paso 2_: Script `npm run seed:organizations` ejecutado en staging con dataset oficial; se validó idempotencia y registros auditados.
  - 🔜 _Paso 3_: Documentar y socializar el flujo de alta/baja de organizaciones con Operaciones (pendiente de coordinación con stakeholders).
- **Fase 2 – Columnas opcionales (`NULL`):**
  - ✅ _Paso 1_: Columnas `organizationId` agregadas como opcionales a las tablas operativas (`User`, `Client`, `Store`, `Inventory`, `Entry`, `Sales`, `Transfer`, etc.).
  - ✅ _Paso 2_: Campos `organizationId` propagados en servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`) y en los repositorios Prisma manteniendo compatibilidad legacy.
  - 🔜 _Paso 3_: Extender la batería de pruebas para cubrir registros con `organizationId` nulo.

## Próximas acciones sugeridas
1. Documentar en esta bitácora el procedimiento operativo para altas/bajas de organizaciones (Fase 1 – Paso 3). Responsable: Operaciones + Ingeniería. Artefacto esperado: runbook + checklist.
2. Instrumentar temporalmente logs y métricas para detectar accesos a servicios (`users`, `clients`, `stores`, `inventory`, `sales`, `websales`) que aún no envíen `organizationId`, y documentar los consumidores faltantes.
3. Diseñar las pruebas unitarias y de integración que cubran entidades con `organizationId` nulo o definido (Fase 2 – Paso 3). Preparar suites para ejecución continua.
4. Planificar la **Fase 3 – Poblado y validación** con el equipo de datos. Entregables:
   - Definición de reglas de asignación por tabla (fuentes, columnas puente, excepciones manuales).
   - Scripts idempotentes por dominio con logging y métricas de progreso.
   - Calendario de ejecución en producción con ventanas de mantenimiento y responsables.

## Detalle de próximas fases

### Fase 2 – Paso 2 (exposición de campos)
- Actualizar DTOs de entrada y salida en los módulos `users`, `clients`, `stores`, `inventory` y `sales` para incluir `organizationId` opcional.
- Ajustar los mapeos de Prisma/Repositories para leer y escribir la nueva columna sin condicionar la lógica existente.
- Revisar integraciones externas (ETLs, webhooks) y agregar el campo cuando sea relevante, manteniendo compatibilidad mediante versionado o flags.

### Fase 2 – Paso 3 (cobertura de pruebas)
- Incorporar casos con `organizationId` `NULL` y definido en pruebas unitarias.
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

## Referencias
- Script de seed: [`prisma/seed/organizations.seed.ts`](../prisma/seed/organizations.seed.ts)
- Datos de ejemplo: [`prisma/data/organizations.json`](../prisma/data/organizations.json)
- Plan de migración original (resumen provisto en la historia de usuario).