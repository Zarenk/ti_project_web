# 🔒 Implementación de Seguridad Multi-Tenant

**Fecha:** 2026-02-15
**Estado:** IMPLEMENTADO
**Nivel de Prioridad:** CRÍTICO

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura de Seguridad](#arquitectura-de-seguridad)
3. [Componentes Implementados](#componentes-implementados)
4. [Patrones y Mejores Prácticas](#patrones-y-mejores-prácticas)
5. [Guía de Uso](#guía-de-uso)
6. [Tests y Validación](#tests-y-validación)
7. [Checklist de Seguridad](#checklist-de-seguridad)

---

## Resumen Ejecutivo

Este documento describe la implementación completa de seguridad multi-tenant en el proyecto TI Projecto Web, incluyendo:

- ✅ **Guards reutilizables** para validación de ownership
- ✅ **Filtros automáticos** de tenant en queries Prisma
- ✅ **Prevención de information disclosure**
- ✅ **Tests E2E** de aislamiento
- ✅ **Patrones de código** seguros

### Objetivos Cumplidos

1. **Aislamiento total** entre organizaciones
2. **Prevención de fugas** de datos
3. **Guards reutilizables** para reducir duplicación
4. **Documentación completa** de patrones seguros

---

## Arquitectura de Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────┐
│         1. Authentication Layer         │
│   (JWT Auth Guard - Verifica token)    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       2. Tenant Resolution Layer        │
│  (Tenant Required Guard - Extract org) │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│        3. Ownership Validation          │
│   (Entity Ownership Guard - Verify)    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          4. Data Access Layer           │
│     (Prisma + Tenant Filters)          │
└─────────────────────────────────────────┘
```

### Flujo de Request Seguro

```typescript
Request → JWT Auth → Tenant Context → Ownership Guard → Service → Prisma (filtered)
```

---

## Componentes Implementados

### 1. Entity Ownership Guard

**Ubicación:** `backend/src/common/guards/entity-ownership.guard.ts`

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, EntityOwnershipGuard)
@EntityModel('sales')      // Modelo de Prisma
@EntityIdParam('id')       // Parámetro de ruta
async getSale(@Param('id') id: string) {
  // Si llega aquí, la sale pertenece al tenant ✅
}
```

**Características:**
- ✅ Validación automática de ownership
- ✅ Prevención de information disclosure
- ✅ Decorators reutilizables
- ✅ Soporte para IDs numéricos y strings (UUIDs)

**Tests:** `entity-ownership.guard.spec.ts`

### 2. Tenant Required Guard

**Ubicación:** `backend/src/common/guards/tenant-required.guard.ts`

```typescript
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
async someAction(@CurrentTenant() tenant: TenantContext) {
  // tenant.organizationId está garantizado
  // tenant.companyId está garantizado
}
```

### 3. Decorators de Tenant Context

**Ubicación:** `backend/src/tenancy/tenant-context.decorator.ts`

```typescript
@CurrentTenant()  // Obtiene el contexto completo
@CurrentOrg()     // Solo organizationId
@CurrentCompany() // Solo companyId
```

### 4. Tests de Aislamiento E2E

**Ubicación:** `backend/test/multi-tenant-isolation.e2e-spec.ts`

Tests que verifican:
- ✅ Aislamiento de Sales por organizationId
- ✅ Aislamiento de Users por organizationId
- ✅ Aislamiento de Products por organizationId
- ✅ Aislamiento de Accounting Entries
- ✅ Prevención de data leaks entre organizaciones
- ✅ Integridad de schema (campos organizationId)

---

## Patrones y Mejores Prácticas

### ✅ PATRÓN CORRECTO: Usar Guards

```typescript
// ✅ CORRECTO - Usar EntityOwnershipGuard
@Get(':id')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, EntityOwnershipGuard)
@EntityModel('sales')
@EntityIdParam('id')
async getSale(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
  // La sale ya fue validada por el guard
  const sale = await this.salesService.findOne(id, tenant);
  return sale;
}
```

### ✅ PATRÓN CORRECTO: Filtrar por Tenant en Prisma

```typescript
// ✅ CORRECTO - Siempre incluir filtros de tenant
async findAll(tenant: TenantContext) {
  return this.prisma.sales.findMany({
    where: {
      ...(tenant?.organizationId && { organizationId: tenant.organizationId }),
      ...(tenant?.companyId && { companyId: tenant.companyId }),
    },
  });
}
```

### ✅ PATRÓN CORRECTO: Validar Ownership Antes de Operaciones Críticas

```typescript
// ✅ CORRECTO - Validar ownership antes de delete/update
async deleteSale(id: number, tenant: TenantContext) {
  // 1. Verificar que la sale existe Y pertenece al tenant
  const sale = await this.prisma.sales.findFirst({
    where: {
      id,
      organizationId: tenant.organizationId,
      companyId: tenant.companyId,
    },
  });

  if (!sale) {
    throw new NotFoundException('Sale not found');
  }

  // 2. Ahora sí, realizar operación
  await this.deleteSunatTransmissions(id);
  return this.prisma.sales.delete({ where: { id } });
}
```

### ❌ ANTI-PATRÓN: Queries sin Filtro de Tenant

```typescript
// ❌ MAL - No filtra por tenant
async findAll() {
  return this.prisma.sales.findMany(); // FUGA DE DATOS
}

// ❌ MAL - Operación antes de validar ownership
async deleteSale(id: number) {
  await this.deleteSunatTransmissions(id); // FUGA - puede borrar de otro tenant
  return this.prisma.sales.delete({ where: { id } });
}
```

### ❌ ANTI-PATRÓN: Exponer Información en Mensajes de Error

```typescript
// ❌ MAL - Revela que la entidad existe en otro tenant
if (sale.organizationId !== tenant.organizationId) {
  throw new ForbiddenException(
    'This sale belongs to organization ${sale.organizationId}' // INFORMATION DISCLOSURE
  );
}

// ✅ CORRECTO - Mensaje genérico
if (sale.organizationId !== tenant.organizationId) {
  throw new NotFoundException('Sale not found'); // Genérico
}
```

---

## Guía de Uso

### Para Crear un Nuevo Endpoint Seguro

**1. Controller**

```typescript
import { EntityOwnershipGuard, EntityModel, EntityIdParam } from '@common/guards';
import { TenantRequiredGuard } from '@common/guards/tenant-required.guard';
import { CurrentTenant } from '@tenancy/tenant-context.decorator';
import { TenantContext } from '@tenancy/tenant-context.interface';

@Controller('quotes')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class QuotesController {

  @Get()
  async findAll(@CurrentTenant() tenant: TenantContext) {
    return this.quotesService.findAll(tenant);
  }

  @Get(':id')
  @UseGuards(EntityOwnershipGuard)
  @EntityModel('quote')
  @EntityIdParam('id')
  async findOne(@Param('id') id: string) {
    // Ownership ya validado por guard
    return this.quotesService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(EntityOwnershipGuard)
  @EntityModel('quote')
  @EntityIdParam('id')
  async remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.quotesService.remove(+id, tenant);
  }
}
```

**2. Service**

```typescript
export class QuotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenant: TenantContext) {
    return this.prisma.quote.findMany({
      where: {
        ...(tenant?.organizationId && { organizationId: tenant.organizationId }),
        ...(tenant?.companyId && { companyId: tenant.companyId }),
      },
    });
  }

  async findOne(id: number, tenant?: TenantContext) {
    const where: any = { id };

    if (tenant?.organizationId) {
      where.organizationId = tenant.organizationId;
    }

    return this.prisma.quote.findFirst({ where });
  }

  async remove(id: number, tenant: TenantContext) {
    // Validar ownership primero
    const quote = await this.findOne(id, tenant);

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    // Operaciones relacionadas (si las hay)
    await this.prisma.quoteItem.deleteMany({ where: { quoteId: id } });

    // Delete principal
    return this.prisma.quote.delete({ where: { id } });
  }
}
```

---

## Tests y Validación

### Tests Unitarios del Guard

```bash
cd backend
npm run test -- entity-ownership.guard.spec.ts
```

### Tests E2E de Aislamiento

```bash
cd backend
npm run test:e2e -- multi-tenant-isolation.e2e-spec.ts
```

**Nota:** Los tests E2E requieren que existan al menos 2 organizaciones en la BD para verificar el aislamiento.

### Verificación Manual

```typescript
// En Prisma Studio o SQL:
SELECT id, organizationId, companyId FROM sales LIMIT 10;

// Verificar que NO hay registros sin organizationId:
SELECT COUNT(*) FROM sales WHERE organizationId IS NULL;
```

---

## Checklist de Seguridad

### Para Cada Nuevo Endpoint

- [ ] **Controller** usa `@UseGuards(JwtAuthGuard, TenantRequiredGuard)`
- [ ] **Endpoints GET/:id, PUT/:id, DELETE/:id** usan `EntityOwnershipGuard`
- [ ] **Decorators** `@EntityModel` y `@EntityIdParam` están configurados
- [ ] **Service methods** reciben `TenantContext` como parámetro
- [ ] **Prisma queries** filtran por `organizationId` y `companyId`
- [ ] **Delete operations** validan ownership ANTES de borrar
- [ ] **Error messages** no revelan información de otros tenants
- [ ] **Tests** verifican que no hay data leaks

### Para Cada Nueva Entidad (Modelo Prisma)

- [ ] **Campo `organizationId`** está presente
- [ ] **Campo `companyId`** está presente
- [ ] **Índice** en `organizationId` para performance
- [ ] **Relación** con `Organization` (opcional pero recomendado)
- [ ] **Migración** aplicada correctamente

### Auditoría de Código Existente

Buscar estos patrones peligrosos:

```bash
# Queries sin filtro de tenant
grep -r "findMany()" --include="*.service.ts"
grep -r "findFirst({ where: { id" --include="*.service.ts"

# Deletes sin validación de ownership
grep -r "delete({ where: { id" --include="*.service.ts"

# Mensajes de error que exponen info
grep -r "belongs to" --include="*.ts"
grep -r "different organization" --include="*.ts"
```

---

## Casos Críticos Corregidos

### ✅ #1: AccEntry en Sales Service

**Problema:** No filtraba por organizationId al buscar entries contables.

**Solución:**
```typescript
// ANTES ❌
const entry = await this.prisma.accEntry.findFirst({
  where: { serie, correlativo }
});

// DESPUÉS ✅
const entry = await this.prisma.accEntry.findFirst({
  where: {
    serie,
    correlativo,
    ...(tenant?.organizationId && { organizationId: tenant.organizationId }),
  }
});
```

### ✅ #2: Sale Posted Controller

**Problema:** No validaba tenant antes de crear entry contable.

**Solución:**
```typescript
// ANTES ❌
const sale = await this.prisma.sales.findUnique({ where: { id: saleId } });

// DESPUÉS ✅
const sale = await this.prisma.sales.findFirst({
  where: {
    id: data.saleId,
    ...(tenant?.organizationId && { organizationId: tenant.organizationId }),
  },
});

if (!sale) {
  // Verificar si existe en otro tenant (prevenir information disclosure)
  const existsInOtherTenant = await this.prisma.sales.findUnique({
    where: { id: data.saleId },
  });

  if (existsInOtherTenant) {
    throw new ForbiddenException('Sale does not belong to this organization');
  }

  return { status: 'not_found' };
}
```

### ✅ #3: Delete Sale con SUNAT Transmissions

**Problema:** Borraba transmisiones SUNAT sin validar ownership primero.

**Solución:**
```typescript
// ANTES ❌
async deleteSale(id: number) {
  await this.deleteSunatTransmissions(id); // Podría borrar de otro tenant
  return this.prisma.sales.delete({ where: { id } });
}

// DESPUÉS ✅
async deleteSale(id: number, tenant: TenantContext) {
  // 1. Validar ownership PRIMERO
  const sale = await this.findOne(id, tenant);
  if (!sale) {
    throw new NotFoundException('Sale not found');
  }

  // 2. Ahora sí, operaciones relacionadas
  await this.deleteSunatTransmissions(id);
  return this.prisma.sales.delete({ where: { id } });
}
```

---

## Herramientas de Prevención

### Pre-commit Hook

**Ubicación:** `.git/hooks/pre-commit`

Previene commits de:
- Archivos `.env`
- Secretos y credenciales
- Archivos de backup de BD

```bash
chmod +x .git/hooks/pre-commit
```

### Script de Limpieza de Git

**Ubicación:** `scripts/clean-git-history.sh`

Remueve secretos del historial de git si fueron commiteados accidentalmente.

```bash
./scripts/clean-git-history.sh
```

⚠️ **ADVERTENCIA:** Reescribe el historial. Coordinar con equipo.

---

## Recursos Adicionales

### Documentos Relacionados

- [MULTI_TENANT_SECURITY_PATTERNS.md](./MULTI_TENANT_SECURITY_PATTERNS.md) - Patrones detallados
- [SECURITY_CREDENTIALS_ROTATION.md](./SECURITY_CREDENTIALS_ROTATION.md) - Rotación de credenciales
- [CLAUDE.md](../CLAUDE.md) - Guía del proyecto

### Código de Referencia

- **Guards:** `backend/src/common/guards/`
- **Tests:** `backend/test/multi-tenant-isolation.e2e-spec.ts`
- **Decorators:** `backend/src/tenancy/tenant-context.decorator.ts`

---

## Mantenimiento y Evolución

### Agregar Nuevo Guard

1. Crear en `backend/src/common/guards/`
2. Implementar `CanActivate` interface
3. Agregar tests en `*.guard.spec.ts`
4. Documentar uso en este archivo

### Migrar Modelo Existente a Multi-Tenant

1. Agregar campos en schema:
   ```prisma
   organizationId Int?
   companyId      Int?
   organization   Organization? @relation(fields: [organizationId], references: [id])
   company        Company?      @relation(fields: [companyId], references: [id])

   @@index([organizationId])
   ```

2. Crear y aplicar migración:
   ```bash
   npx prisma migrate dev --name add_tenant_to_model_name
   ```

3. Poblar datos existentes:
   ```sql
   UPDATE model_name
   SET organizationId = (SELECT id FROM Organization LIMIT 1)
   WHERE organizationId IS NULL;
   ```

4. Actualizar Service para filtrar por tenant

5. Agregar tests de aislamiento

---

## Contacto y Soporte

**Responsable:** DevOps/Security Team
**Última actualización:** 2026-02-15
**Próxima revisión:** Trimestral o al detectar vulnerabilidad

Para reportar vulnerabilidades de seguridad, contactar inmediatamente al equipo de seguridad.

---

**🔒 RECUERDA:** La seguridad multi-tenant es CRÍTICA. Nunca skipear validaciones de tenant.
