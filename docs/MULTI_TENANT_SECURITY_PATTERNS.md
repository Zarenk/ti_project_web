# 🔒 PATRONES DE SEGURIDAD MULTI-TENANT

**Documento:** Guía de Implementación de Seguridad Multi-Tenant
**Versión:** 1.0
**Fecha:** 2026-02-15
**Autor:** Claude Code (Sonnet 4.5)

---

## 📋 TABLA DE CONTENIDOS

1. [Principios Fundamentales](#principios-fundamentales)
2. [Fugas Corregidas](#fugas-corregidas)
3. [Patrones de Implementación](#patrones-de-implementación)
4. [Guards y Decorators](#guards-y-decorators)
5. [Testing de Aislamiento](#testing-de-aislamiento)
6. [Checklist de Revisión](#checklist-de-revisión)

---

## 🎯 PRINCIPIOS FUNDAMENTALES

### 1. **Never Trust, Always Verify**

Cada query a la base de datos DEBE filtrar por `organizationId` y/o `companyId`, incluso si:
- El usuario ya está autenticado
- La entidad fue previamente validada
- El request viene de un endpoint interno

**❌ INCORRECTO:**
```typescript
const sale = await prisma.sales.findUnique({
  where: { id: saleId }, // ⚠️ Sin filtro de tenant
});
```

**✅ CORRECTO:**
```typescript
const sale = await prisma.sales.findFirst({
  where: {
    id: saleId,
    organizationId: tenant.organizationId, // ✅ Filtro explícito
    companyId: tenant.companyId,
  },
});
```

---

### 2. **Prevent Information Disclosure**

Nunca revelar si una entidad existe en otra organización.

**❌ INCORRECTO:**
```typescript
if (!sale) {
  throw new NotFoundException('Venta no encontrada');
}

// Si sale exists pero no pertenece al tenant:
throw new ForbiddenException('Esta venta pertenece a otra organización'); // ⚠️ Leak!
```

**✅ CORRECTO:**
```typescript
const sale = await prisma.sales.findFirst({
  where: { id, organizationId, companyId },
});

if (!sale) {
  // Verificar si existe en otro tenant SIN revelar información
  const existsElsewhere = await prisma.sales.findUnique({
    where: { id },
    select: { id: true },
  });

  if (existsElsewhere) {
    // Error genérico, SIN mencionar "otra organización"
    throw new ForbiddenException('Acceso denegado al recurso solicitado');
  }

  throw new NotFoundException('Venta no encontrada');
}
```

---

### 3. **Validate Ownership BEFORE Operations**

Siempre validar que la entidad pertenece al tenant ANTES de realizar operaciones sobre ella.

**❌ INCORRECTO:**
```typescript
async deleteSale(id: number, organizationId: number) {
  // Busca transmisiones SUNAT sin validar ownership primero
  const sunatTx = await prisma.sunatTransmission.findFirst({
    where: { saleId: id }, // ⚠️ Puede revelar info de otra org
  });

  if (sunatTx) {
    throw new ConflictException('No se puede eliminar, tiene transmisión SUNAT');
  }

  // Luego valida ownership (demasiado tarde)
  const sale = await prisma.sales.findFirst({
    where: { id, organizationId },
  });
}
```

**✅ CORRECTO:**
```typescript
async deleteSale(id: number, organizationId: number, companyId: number) {
  // 1. PRIMERO: Validar ownership
  const sale = await prisma.sales.findFirst({
    where: { id, organizationId, companyId },
  });

  if (!sale) {
    throw new NotFoundException('Venta no encontrada');
  }

  // 2. DESPUÉS: Operaciones específicas
  const sunatTx = await prisma.sunatTransmission.findFirst({
    where: { saleId: id },
  });

  if (sunatTx) {
    throw new ConflictException('No se puede eliminar');
  }

  // 3. Proceder con delete
  return await prisma.sales.delete({ where: { id } });
}
```

---

## 🐛 FUGAS CORREGIDAS

### **Fuga #1: accEntry sin filtro de organizationId**

**Ubicación:** `backend/src/sales/sales.service.ts:688-695`

**Problema:**
```typescript
// ❌ ANTES:
const accEntry = await this.prisma.accEntry.findFirst({
  where: {
    serie: invoiceData.serie,
    correlativo: invoiceData.nroCorrelativo,
    status: { not: 'VOID' },
    // ⚠️ FALTA: organizationId, companyId
  },
});
```

**Solución:**
```typescript
// ✅ DESPUÉS:
const accEntry = await this.prisma.accEntry.findFirst({
  where: {
    serie: invoiceData.serie,
    correlativo: invoiceData.nroCorrelativo,
    status: { not: 'VOID' },
    ...(organizationId !== undefined && { organizationId }),
    ...(companyId !== undefined && { companyId }),
  },
});
```

**Impacto:** Usuario de Org A podía anular asientos contables de Org B si conocía el número de serie.

---

### **Fuga #2: sale-posted hook sin validación de tenant**

**Ubicación:** `backend/src/accounting/hooks/sale-posted.controller.ts:30-31`

**Problema:**
```typescript
// ❌ ANTES:
const sale = await this.prisma.sales.findUnique({
  where: { id: data.saleId }, // ⚠️ Sin filtro de tenant
});
```

**Solución:**
```typescript
// ✅ DESPUÉS:
const sale = await this.prisma.sales.findFirst({
  where: {
    id: data.saleId,
    ...(tenant?.organizationId !== undefined && { organizationId: tenant.organizationId }),
    ...(tenant?.companyId !== undefined && { companyId: tenant.companyId }),
  },
});

if (!sale) {
  // Verificar si existe en otro tenant
  const existsInOtherTenant = await this.prisma.sales.findUnique({
    where: { id: data.saleId },
    select: { id: true },
  });

  if (existsInOtherTenant) {
    throw new ForbiddenException('La venta no pertenece a esta organización');
  }

  return { status: 'not_found' };
}
```

**Impacto:** Un hook de contabilidad podía crear asientos para ventas de otra organización.

---

### **Fuga #3: deleteSale sin validación de ownership antes de SUNAT**

**Ubicación:** `backend/src/sales/sales.service.ts:482-490`

**Problema:**
```typescript
// ❌ ANTES:
const sunatAccepted = await this.prisma.sunatTransmission.findFirst({
  where: { saleId: id, status: 'ACCEPTED' },
  // ⚠️ Busca SUNAT SIN validar que la sale pertenece al tenant
});

if (sunatAccepted) {
  throw new ConflictException('Ya transmitida a SUNAT'); // ⚠️ Information leak
}
```

**Solución:**
```typescript
// ✅ DESPUÉS:
// 1. PRIMERO: Validar ownership
const saleOwnership = await this.prisma.sales.findFirst({
  where: { id, ...organizationFilter },
  select: { id: true },
});

if (!saleOwnership) {
  throw new NotFoundException('Venta no encontrada');
}

// 2. DESPUÉS: Verificar SUNAT
const sunatAccepted = await this.prisma.sunatTransmission.findFirst({
  where: { saleId: id, status: 'ACCEPTED' },
});
```

**Impacto:** Revelaba si una venta de otra org tenía transmisión SUNAT aceptada.

---

## 🛡️ PATRONES DE IMPLEMENTACIÓN

### Patrón 1: Service Method con Tenant Context

```typescript
async getSale(
  id: number,
  organizationId?: number | null,
  companyId?: number | null,
): Promise<Sale> {
  // 1. Construir filtros de tenant
  const where: Prisma.SalesWhereInput = {
    id,
    ...(organizationId !== undefined && { organizationId }),
    ...(companyId !== undefined && { companyId }),
  };

  // 2. Query con filtros
  const sale = await this.prisma.sales.findFirst({ where });

  // 3. Manejo de errores sin information leak
  if (!sale) {
    throw new NotFoundException(`Venta ${id} no encontrada`);
  }

  return sale;
}
```

---

### Patrón 2: Controller con @CurrentTenant Decorator

```typescript
@Controller('sales')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SalesController {
  @Get(':id')
  async getSale(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.salesService.getSale(
      Number(id),
      tenant?.organizationId,
      tenant?.companyId,
    );
  }
}
```

---

### Patrón 3: Entity Ownership Guard (Reusable)

```typescript
@Get(':id')
@UseGuards(EntityOwnershipGuard)
@EntityModel('sales')
@EntityIdParam('id')
async getSale(@Param('id') id: string) {
  // Si llega aquí, ownership ya fue validado por el guard
  return this.salesService.getSaleById(Number(id));
}
```

El guard verifica automáticamente:
1. Que la entidad exista
2. Que pertenezca al tenant del request
3. Lanza errores apropiados (404/403) sin information leak

---

### Patrón 4: Prisma Include con Tenant Filters

```typescript
const sale = await this.prisma.sales.findFirst({
  where: {
    id,
    organizationId,
    companyId,
  },
  include: {
    // ✅ Las relaciones heredan el filtro automáticamente
    salesDetails: {
      include: {
        product: true,
      },
    },
    // ❌ CUIDADO: Relaciones inversas NO heredan filtro
    sunatTransmissions: true, // OK porque saleId ya está filtrado
  },
});
```

---

## 🎨 GUARDS Y DECORATORS

### `TenantRequiredGuard`

**Ubicación:** `backend/src/common/guards/tenant-required.guard.ts`

**Propósito:** Verifica que el request tenga contexto de tenant válido.

**Uso:**
```typescript
@Controller('sales')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SalesController {
  // Todos los métodos requieren tenant context
}
```

**Qué hace:**
- Lee `request.tenantContext` del middleware
- Verifica que `organizationId` o `companyId` existan
- Lanza `BadRequestException` si no hay contexto

**⚠️ IMPORTANTE:** Este guard NO valida ownership, solo existencia de contexto.

---

### `EntityOwnershipGuard`

**Ubicación:** `backend/src/common/guards/entity-ownership.guard.ts`

**Propósito:** Valida que una entidad pertenezca al tenant actual.

**Uso:**
```typescript
@Get(':id')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, EntityOwnershipGuard)
@EntityModel('sales')         // Nombre del modelo Prisma
@EntityIdParam('id')           // Parámetro de ruta que contiene el ID
async getSale(@Param('id') id: string) {
  return this.salesService.getSaleById(Number(id));
}
```

**Qué hace:**
1. Extrae `id` del parámetro de ruta
2. Busca la entidad con filtros de tenant
3. Si no encuentra:
   - Verifica si existe en otro tenant
   - Si existe → `ForbiddenException` (sin revelar info)
   - Si no existe → `NotFoundException`
4. Si encuentra → permite acceso

**Ventajas:**
- ✅ Reutilizable en cualquier controller
- ✅ Previene information disclosure
- ✅ Centraliza lógica de ownership
- ✅ Incluye tests unitarios

---

### `@CurrentTenant` Decorator

**Ubicación:** `backend/src/tenancy/tenant-context.decorator.ts`

**Propósito:** Inyecta el contexto de tenant en métodos del controller.

**Uso:**
```typescript
@Post()
async createSale(
  @Body() dto: CreateSaleDto,
  @CurrentTenant() tenant: TenantContext | null,
) {
  return this.salesService.createSale(
    dto,
    tenant?.organizationId,
    tenant?.companyId,
  );
}

// O extraer solo un campo específico:
@Get()
async listSales(
  @CurrentTenant('organizationId') orgId: number | null,
) {
  return this.salesService.listSales(orgId);
}
```

---

## 🧪 TESTING DE AISLAMIENTO

### Test E2E Multi-Tenant

**Ubicación:** `backend/test/multi-tenant-isolation.e2e-spec.ts`

**Escenarios cubiertos:**

1. **Sales Isolation:**
   - User A NO puede acceder a Sale B
   - User A SÍ puede acceder a Sale A
   - User B NO puede eliminar Sale A

2. **Accounting Isolation:**
   - User B NO puede acceder a asientos de Org A

3. **SUNAT Transmissions:**
   - User B NO puede ver transmisiones SUNAT de Sale A

4. **Users List:**
   - User A solo ve usuarios de su organización

5. **Inventory:**
   - User A NO puede acceder a inventario de Org B

6. **Edge Cases Críticos:**
   - No leak de existencia en mensajes de error
   - Prevención de SQL injection en headers
   - No permite tenant switching mid-request

---

### Ejemplo de Test

```typescript
describe('Sales Isolation', () => {
  it('should NOT allow User A to access Sale B', async () => {
    return request(app.getHttpServer())
      .get(`/api/sales/${saleB.id}`)
      .set('Authorization', `Bearer ${userA.token}`)
      .set('x-org-id', ORG_A.organizationId.toString())
      .set('x-company-id', ORG_A.companyId.toString())
      .expect((res) => {
        // Debe fallar con 403 o 404
        expect([403, 404]).toContain(res.status);

        // NO debe exponer información de la venta
        if (res.body.total) {
          fail('Se expuso información de otra organización');
        }
      });
  });
});
```

---

### Ejecutar Tests

```bash
# Tests E2E de multi-tenancy
npm run test:e2e -- multi-tenant-isolation.e2e-spec.ts

# Tests unitarios de guards
npm run test -- entity-ownership.guard.spec.ts

# Coverage
npm run test:cov
```

---

## ✅ CHECKLIST DE REVISIÓN

Usa esta checklist al implementar nuevos endpoints o revisar código existente:

### **Para cada Service Method:**

- [ ] **Parámetros de tenant:** ¿Acepta `organizationId` y `companyId`?
- [ ] **Filtros aplicados:** ¿Todas las queries usan estos filtros?
- [ ] **Validación de ownership:** ¿Valida que la entidad pertenece al tenant ANTES de operar sobre ella?
- [ ] **Errores sin leaks:** ¿Los mensajes de error NO revelan existencia en otro tenant?
- [ ] **Relaciones incluidas:** ¿Las relaciones Prisma también filtran por tenant si es necesario?

### **Para cada Controller Endpoint:**

- [ ] **Guards configurados:** ¿Tiene `TenantRequiredGuard` y/o `EntityOwnershipGuard`?
- [ ] **@CurrentTenant usado:** ¿Inyecta el tenant context correctamente?
- [ ] **Propagación de contexto:** ¿Pasa `organizationId`/`companyId` al service?
- [ ] **Validación de DTOs:** ¿Los DTOs NO permiten override de `organizationId`/`companyId`?

### **Para cada Query Prisma:**

- [ ] **findUnique vs findFirst:** ¿Usa `findFirst` con filtros de tenant en lugar de `findUnique`?
- [ ] **Filtros explícitos:** ¿Incluye `organizationId` y/o `companyId` en el where?
- [ ] **Spread operator:** ¿Usa `...(organizationId !== undefined && { organizationId })`?
- [ ] **Include cauteloso:** ¿Relaciones inversas también están filtradas?

### **Para Tests:**

- [ ] **Test de aislamiento:** ¿Existe un test que verifica que User A no puede acceder a datos de User B?
- [ ] **Test de ownership:** ¿Verifica que un usuario SÍ puede acceder a sus propios datos?
- [ ] **Test de information leak:** ¿Verifica que errores no revelan existencia de datos en otro tenant?

---

## 📝 EJEMPLO COMPLETO: Implementación Segura

### Service

```typescript
// sales.service.ts
@Injectable()
export class SalesService {
  async getSale(
    id: number,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<Sale> {
    // 1. Construir filtros de tenant
    const where: Prisma.SalesWhereInput = {
      id,
      ...(organizationId !== undefined && { organizationId }),
      ...(companyId !== undefined && { companyId }),
    };

    // 2. Query con filtros
    const sale = await this.prisma.sales.findFirst({
      where,
      include: {
        salesDetails: {
          include: { product: true },
        },
        invoices: true,
      },
    });

    // 3. Manejo de errores sin information leak
    if (!sale) {
      throw new NotFoundException(`Venta ${id} no encontrada`);
    }

    return sale;
  }

  async deleteSale(
    id: number,
    actorId: number,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<void> {
    // 1. PRIMERO: Validar ownership
    const sale = await this.getSale(id, organizationId, companyId);

    // 2. DESPUÉS: Verificaciones de negocio
    const sunatAccepted = await this.prisma.sunatTransmission.findFirst({
      where: { saleId: id, status: 'ACCEPTED' },
    });

    if (sunatAccepted) {
      throw new ConflictException('No se puede eliminar');
    }

    // 3. Proceder con delete
    await this.prisma.sales.delete({ where: { id } });
  }
}
```

### Controller

```typescript
// sales.controller.ts
@Controller('sales')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get(':id')
  @UseGuards(EntityOwnershipGuard)
  @EntityModel('sales')
  @EntityIdParam('id')
  async getSale(@Param('id') id: string) {
    // Ownership ya validado por EntityOwnershipGuard
    return this.salesService.getSaleById(Number(id));
  }

  @Delete(':id')
  async deleteSale(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext | null,
    @Request() req: any,
  ) {
    return this.salesService.deleteSale(
      Number(id),
      req.user.id,
      tenant?.organizationId,
      tenant?.companyId,
    );
  }
}
```

### Test

```typescript
// sales.service.spec.ts
describe('SalesService - Multi-Tenant', () => {
  it('should NOT return sale from different tenant', async () => {
    const saleOrgB = await createSale({ organizationId: 2 });

    await expect(
      service.getSale(saleOrgB.id, 1, 10), // Org A intenta acceder
    ).rejects.toThrow(NotFoundException);
  });

  it('should return sale from same tenant', async () => {
    const saleOrgA = await createSale({ organizationId: 1, companyId: 10 });

    const result = await service.getSale(saleOrgA.id, 1, 10);

    expect(result.id).toBe(saleOrgA.id);
  });
});
```

---

## 🚨 RED FLAGS - Patrones a Evitar

### 🚩 #1: findUnique sin validación posterior

```typescript
// ❌ PELIGROSO
const sale = await prisma.sales.findUnique({ where: { id } });
// No valida que pertenece al tenant
```

### 🚩 #2: Operaciones basadas en IDs sin validación

```typescript
// ❌ PELIGROSO
async deleteSale(id: number) {
  await prisma.sales.delete({ where: { id } });
  // Puede eliminar venta de cualquier organización
}
```

### 🚩 #3: Queries con OR que pueden saltarse filtros

```typescript
// ❌ PELIGROSO
where: {
  OR: [
    { id: saleId },
    { referenceId: refId },
  ],
  organizationId, // Puede no aplicarse a ambos OR
}

// ✅ CORRECTO
where: {
  organizationId, // Fuera del OR
  OR: [
    { id: saleId },
    { referenceId: refId },
  ],
}
```

### 🚩 #4: Information leak en mensajes

```typescript
// ❌ PELIGROSO
if (!sale) {
  throw new NotFoundException('La venta 123 pertenece a otra organización');
}

// ✅ CORRECTO
if (!sale) {
  throw new NotFoundException('Venta no encontrada');
}
```

---

## 📚 RECURSOS ADICIONALES

- **Tests E2E:** `backend/test/multi-tenant-isolation.e2e-spec.ts`
- **Entity Ownership Guard:** `backend/src/common/guards/entity-ownership.guard.ts`
- **Tenant Context Decorator:** `backend/src/tenancy/tenant-context.decorator.ts`
- **Análisis de Vulnerabilidades:** `docs/FINAL_OPTIMIZATION_REPORT.md`

---

**Última actualización:** 2026-02-15
**Próxima revisión:** Mensual o post-incident
**Propietario:** Security & Backend Teams
