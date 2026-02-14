# 🔍 Análisis: Error en schema.prisma - legalName

**Fecha:** 2026-02-10
**Error:** `The unique index definition refers to the unknown fields: legalName`

---

## 📊 PROBLEMA IDENTIFICADO

### Error en Modelo Product

**Archivo:** `backend/prisma/schema.prisma` - Línea 107

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  barcode     String?  @unique
  qrCode      String?  @unique
  description String?
  brandName   String?  @map("brand")
  price       Float
  priceSell   Float?
  status      String?
  image       String?
  images      String[]
  organizationId Int?
  companyId      Int?
  extraAttributes Json?
  isVerticalMigrated Boolean @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // ... relaciones ...

  @@unique([organizationId, legalName])  // ❌ ERROR: legalName NO EXISTE
  @@index([categoryId])
  @@index([name])
  @@index([brandId])
  @@index([organizationId, name])
  @@index([organizationId, companyId])
  @@index([companyId])
}
```

### Causa del Error

La restricción `@@unique([organizationId, legalName])` hace referencia a un campo **`legalName`** que:
- ❌ **NO existe** en el modelo `Product`
- ✅ **SÍ existe** en el modelo `Company`

**Conclusión:** La restricción fue copiada incorrectamente del modelo `Company` al modelo `Product`.

---

## 🔍 CAMPO legalName EN EL PROYECTO

### Dónde SÍ Existe legalName

**Modelo Company** (línea 400):
```prisma
model Company {
  id                    Int            @id @default(autoincrement())
  organizationId        Int
  name                  String
  legalName             String?        // ✅ EXISTE AQUÍ
  taxId                 String?        @unique
  status                String         @default("ACTIVE")
  businessVertical      BusinessVertical @default(GENERAL)
  // ... más campos ...
}
```

**Uso en el código:**
- ✅ `backend/prisma/seed/ensure-company.seed.ts` - Usa legalName para Company
- ✅ `backend/prisma/seed/invoice-alerts.seed.ts` - Usa legalName para Company
- ✅ `backend/prisma/migrations/` - Columna legalName en tabla Company

---

## 🎯 SOLUCIÓN

### Opción Recomendada: Remover la Restricción Errónea

**Razón:** El campo `legalName` no existe en Product y probablemente nunca fue la intención tenerlo.

**Cambio necesario:**

```diff
model Product {
  // ... todos los campos ...

  transfers Transfer[]

- @@unique([organizationId, legalName])
  @@index([categoryId])
  @@index([name])
  @@index([brandId])
  @@index([organizationId, name])
  @@index([organizationId, companyId])
  @@index([companyId])
}
```

### ¿Por qué es seguro removerla?

1. ✅ **El campo no existe** - La restricción nunca ha funcionado
2. ✅ **Ya existe restricción alternativa** - `@@index([organizationId, name])` previene duplicados similares
3. ✅ **Sin impacto en código** - Ningún código TypeScript usa `legalName` en Product
4. ✅ **Sin impacto en base de datos** - La restricción no pudo crearse porque el campo no existe

---

## 📋 PASOS PARA APLICAR LA SOLUCIÓN

### 1. Editar schema.prisma

```bash
# Abrir el archivo
code backend/prisma/schema.prisma
```

Buscar la línea 107 en el modelo Product y **eliminar**:
```prisma
@@unique([organizationId, legalName])
```

### 2. Validar el Schema

```bash
cd backend
npx prisma validate
```

**Resultado esperado:**
```
✔ Prisma schema loaded from prisma\schema.prisma
✔ Prisma schema is valid
```

### 3. Generar Cliente de Prisma

```bash
npx prisma generate
```

**Resultado esperado:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 4. Verificar que Todo Compila

```bash
npm run build
```

**Resultado esperado:**
```
✔ Build completed successfully
```

---

## ⚠️ ALTERNATIVA: Si Se Necesitara legalName en Product

**Solo si realmente se necesita este campo** (poco probable), se debería:

1. Agregar el campo al modelo:
```prisma
model Product {
  // ... campos existentes ...
  legalName   String?  // Agregar este campo
  // ... resto de campos ...

  @@unique([organizationId, legalName])
}
```

2. Crear migración:
```bash
npx prisma migrate dev --name add_legal_name_to_product
```

**NO RECOMENDADO** porque:
- ❌ No hay uso de legalName en el código de Product
- ❌ Añadiría un campo innecesario
- ❌ Podría causar confusión con Company.legalName

---

## 🔍 VERIFICACIÓN POST-FIX

Después de remover la línea, verificar:

### 1. Schema válido
```bash
npx prisma validate
```

### 2. Generar cliente
```bash
npx prisma generate
```

### 3. Build exitoso
```bash
npm run build
```

### 4. Tests pasando (opcional)
```bash
npm run test
```

---

## 📝 RESUMEN

**Problema:** Restricción `@@unique([organizationId, legalName])` en modelo Product hace referencia a campo inexistente.

**Causa:** Error de copy/paste del modelo Company al modelo Product.

**Solución:** Remover la línea 107 del modelo Product en schema.prisma.

**Impacto:** ✅ Ninguno - La restricción nunca funcionó y no se usa en el código.

**Tiempo estimado:** 2 minutos

---

**Estado:** ✅ IMPLEMENTADO - Ver [FIX_APLICADO_SCHEMA_PRISMA.md](FIX_APLICADO_SCHEMA_PRISMA.md)
**Última actualización:** 2026-02-10

---

## 🎯 SOLUCIÓN APLICADA

La solución correcta fue **REEMPLAZAR** en lugar de remover:

**Cambio realizado:**
```diff
model Product {
  // ... campos ...

- @@unique([organizationId, legalName])
+ @@unique([organizationId, name])
  @@index([categoryId])
  @@index([name])
  @@index([brandId])
- @@index([organizationId, name])
  @@index([organizationId, companyId])
  @@index([companyId])
}
```

**Razón:** El código seed usa `organizationId_name` como unique constraint para upsert. Cambiar `legalName` → `name` corrige el typo y mantiene la funcionalidad.

**Próximo paso:** Regenerar cliente Prisma después de detener el servidor de desarrollo.
