# Seguimiento migración Single DB + RLS

Este documento detalla el avance táctico del plan por fases para habilitar multi-tenancy en un único esquema con Row-Level Security.

## Estado general
- **Fase 1 – Nuevas tablas sin impacto:**
  - ✅ _Paso 1_: Tablas `Organization` y `OrganizationUnit` definidas en Prisma y disponibles mediante migraciones sin afectar el resto del modelo.
  - 🆕 _Paso 2_: Se añadió el script `npm run seed:organizations` que permite poblar organizaciones y unidades organizacionales de forma idempotente a partir de un archivo JSON (`prisma/data/organizations.json`). Este script sirve para la carga inicial en ambientes controlados (staging/producción) según el plan.
  - 🔜 _Paso 3_: Documentar y socializar el flujo de alta/baja de organizaciones con Operaciones (pendiente de coordinación con stakeholders).
- **Fase 2 – Columnas opcionales (`NULL`):**
  - ✅ _Paso 1_: Columnas `organizationId` agregadas como opcionales a las tablas operativas (`User`, `Client`, `Store`, `Inventory`, `Entry`, `Sales`, `Transfer`, etc.).
  - 🔜 _Paso 2_: Revisar servicios y repositorios para exponer los campos `organizationId` sin modificar todavía la lógica de negocio.
  - 🔜 _Paso 3_: Extender la batería de pruebas para cubrir registros con `organizationId` nulo.

## Próximas acciones sugeridas
1. Ejecutar el script `npm run seed:organizations` en staging utilizando un archivo de organizaciones acordado con el equipo de negocio. Validar que la carga es idempotente y que genera métricas de auditoría.
2. Registrar en esta bitácora el procedimiento operativo para altas/bajas de organizaciones (Fase 1 – Paso 3).
3. Iniciar revisión de servicios críticos (`users`, `clients`, `stores`, `inventory`, `sales`) para incluir `organizationId` en DTOs y repositorios sin alterar flujos vigentes, preparando la transición hacia la Fase 3.

## Referencias
- Script de seed: [`prisma/seed/organizations.seed.ts`](../prisma/seed/organizations.seed.ts)
- Datos de ejemplo: [`prisma/data/organizations.json`](../prisma/data/organizations.json)
- Plan de migración original (resumen provisto en la historia de usuario).