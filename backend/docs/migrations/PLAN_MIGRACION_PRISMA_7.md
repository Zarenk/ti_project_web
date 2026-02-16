# 🔄 Plan de Migración Segura: Prisma 6.5 → 7.3

**Fecha:** 2026-02-10
**Versión actual:** Prisma 6.5.0
**Versión objetivo:** Prisma 7.3.0
**Estado:** ⏳ PENDIENTE - LEER COMPLETO ANTES DE EJECUTAR

---

## ⚠️ IMPORTANTE: LEE ESTO PRIMERO

**CONTEXTO:**
- ✅ Prisma 6.5.0 está funcionando correctamente
- ❌ Intentaste actualizar a 7.x anteriormente y se rompieron cosas
- ⚠️ Este plan es GRADUAL y con ROLLBACK en cada paso
- 🔒 **NO actualices sin seguir TODOS los pasos en orden**

---

## 📊 BREAKING CHANGES DE PRISMA 7.X

### 1. Configuración de datasource.url
**Antes (Prisma 6.x):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Después (Prisma 7.x):**
```prisma
datasource db {
  provider = "postgresql"
  // url ya no se soporta aquí
}
```

URL ahora se pasa en runtime:
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
})
```

### 2. engineType deprecado
**Antes:**
```prisma
generator client {
  provider = "prisma-client-js"
  engineType = "library"  // ❌ Deprecado en 7.x
}
```

**Después:**
```prisma
generator client {
  provider = "prisma-client-js"
  // engineType se remueve, ahora es default
}
```

### 3. Cambios en Tipos TypeScript
- Algunos tipos opcionales ahora requieren manejo explícito
- Cambios en `WhereInput` types
- Cambios en tipos de relaciones

### 4. Cambios en Middleware API
- `$use` sigue funcionando pero hay nuevo API recomendado
- Algunos hooks de lifecycle cambiaron

---

## 🎯 ESTRATEGIA DE MIGRACIÓN

**Enfoque:** Migración incremental con rollback fácil

### Fase 1: Preparación (30 min)
1. Backup completo
2. Análisis de código
3. Identificar puntos de riesgo

### Fase 2: Prueba en Branch Temporal (1-2 horas)
1. Crear branch de prueba
2. Actualizar Prisma
3. Ajustar código
4. Probar exhaustivamente

### Fase 3: Implementación (15 min)
1. Merge si todo funciona
2. O rollback si hay problemas

---

## 📋 FASE 1: PREPARACIÓN

### Paso 1.1: Backup Completo

```bash
# 1. Hacer backup de la base de datos
pg_dump -h localhost -U postgres -d ecoterra_dev > backup_antes_prisma7_$(date +%Y%m%d_%H%M%S).sql

# 2. Commit de todo el código actual
git add .
git commit -m "backup: antes de migración a Prisma 7.x"

# 3. Crear tag de seguridad
git tag -a v1.0-prisma6.5-stable -m "Versión estable con Prisma 6.5.0"

# 4. Backup de node_modules (por si acaso)
cd backend
npm pack
```

**✅ Checkpoint:** Tienes backup de DB, código y dependencias

---

### Paso 1.2: Análisis de Uso de Prisma

**Archivos críticos a revisar:**

```bash
# Ver todos los usos de PrismaClient
grep -r "PrismaClient" backend/src --include="*.ts" > prisma_usage.txt

# Ver todos los usos de datasources
grep -r "datasources" backend/src --include="*.ts" >> prisma_usage.txt

# Ver todos los usos de middleware
grep -r "\$use" backend/src --include="*.ts" >> prisma_usage.txt
```

**Revisar:**
1. ✅ `backend/src/prisma/prisma.service.ts` - Singleton con datasources
2. ✅ `backend/src/common/security/credentials.middleware.ts` - Usa $use
3. ❓ ¿Otros servicios que extiendan PrismaClient?

---

### Paso 1.3: Identificar Puntos de Riesgo

**Según tu experiencia previa, ¿qué se rompió?**

Anota aquí los problemas específicos que encontraste:
- [ ] ¿Errores de tipos TypeScript?
- [ ] ¿Problemas con middleware?
- [ ] ¿Problemas con migraciones?
- [ ] ¿Problemas con queries específicas?
- [ ] ¿Otros? __________________

---

## 📋 FASE 2: MIGRACIÓN EN BRANCH TEMPORAL

### Paso 2.1: Crear Branch de Prueba

```bash
# Crear y cambiar a branch temporal
git checkout -b test/prisma-7-migration

# Verificar que estás en el branch correcto
git branch --show-current
```

**✅ Checkpoint:** Estás en branch `test/prisma-7-migration`

---

### Paso 2.2: Actualizar Prisma a 7.3

```bash
cd backend

# Actualizar ambos paquetes al mismo tiempo
npm install prisma@7.3.0 @prisma/client@7.3.0

# Verificar instalación
npx prisma version
```

**✅ Checkpoint:** Debes ver `prisma: 7.3.0` y `@prisma/client: 7.3.0`

---

### Paso 2.3: Ajustar schema.prisma

**Archivo:** `backend/prisma/schema.prisma`

**Cambio 1: Remover engineType**

```diff
generator client {
  provider = "prisma-client-js"
- engineType = "library"
}
```

**Cambio 2: Mantener datasource URL**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ✅ Mantener por ahora
}
```

**NOTA:** En Prisma 7.x, `url` en datasource es opcional si se pasa en runtime. Podemos mantenerlo como fallback.

**Guardar y validar:**
```bash
npx prisma validate
```

**✅ Checkpoint:** Schema es válido

---

### Paso 2.4: Verificar prisma.service.ts

**Archivo:** `backend/src/prisma/prisma.service.ts`

El código actual (líneas 55-59) **SIGUE FUNCIONANDO** en Prisma 7.x:

```typescript
super({
  datasources: {
    db: { url: pooledUrl },
  },
});
```

**NO REQUIERE CAMBIOS** ✅

La forma de pasar `datasources` en runtime sigue siendo válida en Prisma 7.x.

---

### Paso 2.5: Regenerar Cliente de Prisma

```bash
cd backend

# Limpiar generación previa
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma/client

# Regenerar
npx prisma generate

# Verificar que se generó correctamente
ls node_modules/.prisma/client
```

**✅ Checkpoint:** Cliente generado sin errores

---

### Paso 2.6: Compilar Backend

```bash
npm run build
```

**Si hay errores TypeScript:**

#### Error Común 1: Tipos opcionales
```typescript
// Antes (puede funcionar en 6.x)
const user = await prisma.user.findUnique({ where: { id: 1 } })
user.name // TS no se queja

// Después (7.x más estricto)
const user = await prisma.user.findUnique({ where: { id: 1 } })
user?.name // Ahora DEBES usar optional chaining
```

**Solución:** Agregar `?` o verificar con `if (user)`

#### Error Común 2: WhereUniqueInput
Si ves errores como "does not satisfy the constraint", revisa:
```typescript
// Verificar que los campos unique existen y son correctos
await prisma.product.findUnique({
  where: { organizationId_name: { organizationId: 1, name: "test" } }
})
```

**Solución:** Asegurar que el constraint @@unique existe en schema.prisma

#### Error Común 3: Relaciones
Si ves errores en includes o selects, verificar tipos:
```typescript
// Puede requerir tipo explícito
const product = await prisma.product.findUnique({
  where: { id: 1 },
  include: { category: true }
}) as Product & { category: Category }
```

---

### Paso 2.7: Probar Funcionalidad Crítica

**Tests manuales:**

```bash
# 1. Iniciar servidor
npm run start:dev

# 2. Probar endpoint de salud
curl http://localhost:4000/api

# 3. Probar login
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# 4. Probar query de productos
curl http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Tests automatizados:**

```bash
npm run test
npm run test:e2e
```

---

### Paso 2.8: Probar Seeds

```bash
# Probar seed de organizaciones
npm run seed:organizations

# Probar seed multi-tenant
npm run seed:multi-tenant
```

**Si hay errores en seeds:**
- Revisar usos de `organizationId_name` y otros composite uniques
- Verificar que los constraints existen en schema.prisma

---

## 📊 DECISIÓN: ¿CONTINUAR O ROLLBACK?

### ✅ SI TODO FUNCIONA:

```bash
# Commit los cambios
git add .
git commit -m "upgrade: migrar a Prisma 7.3.0

- Remover engineType deprecado de schema.prisma
- Actualizar prisma y @prisma/client a 7.3.0
- Tests pasando correctamente
- Sin breaking changes detectados"

# Merge a develop
git checkout develop
git merge test/prisma-7-migration

# Tag de nueva versión
git tag -a v1.1-prisma7.3 -m "Versión con Prisma 7.3.0"

# Push
git push origin develop --tags
```

---

### ❌ SI HAY PROBLEMAS:

```bash
# Volver a develop
git checkout develop

# Eliminar branch de prueba (opcional)
git branch -D test/prisma-7-migration

# Restaurar versión anterior en package.json
cd backend
npm install prisma@6.5.0 @prisma/client@6.5.0

# Regenerar cliente
npx prisma generate

# Verificar que funciona
npm run build
npm run start:dev
```

**Documentar problemas encontrados:**
Anota aquí qué errores específicos encontraste para buscar soluciones:

```
ERROR 1:
Archivo: __________
Mensaje: __________
Stack trace: __________

ERROR 2:
...
```

---

## 🔍 TROUBLESHOOTING

### Problema 1: "query_engine not found"

```bash
# Limpiar todo y reinstalar
cd backend
rm -rf node_modules
rm -rf node_modules/.prisma
rm package-lock.json
npm install
npx prisma generate
```

### Problema 2: "Cannot find module '@prisma/client'"

```bash
# Reinstalar solo prisma
npm uninstall prisma @prisma/client
npm install prisma@7.3.0 @prisma/client@7.3.0
npx prisma generate
```

### Problema 3: Tipos TypeScript incorrectos

```bash
# Regenerar tipos
npx prisma generate --force
npm run build
```

### Problema 4: Middleware no funciona

Si `$use` da errores, verificar:
```typescript
// Prisma 7.x prefiere nuevo API pero $use sigue funcionando
this.$use(async (params, next) => {
  // Tu middleware
  return next(params)
})
```

---

## 📚 REFERENCIAS ÚTILES

- [Prisma 7.0 Upgrade Guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrade-from-prisma-6-to-prisma-7)
- [Prisma 7.0 Breaking Changes](https://github.com/prisma/prisma/releases/tag/7.0.0)
- [Datasource Configuration in 7.x](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#datasource)

---

## ⏱️ TIEMPO ESTIMADO

- Preparación: 30 minutos
- Migración en branch: 1-2 horas (dependiendo de errores)
- Tests y validación: 30 minutos
- **Total: 2-3 horas**

---

## 📝 CHECKLIST FINAL

### Antes de Empezar
- [ ] Backup de base de datos creado
- [ ] Commit de código actual
- [ ] Tag de versión estable creado
- [ ] Equipo notificado (si aplica)

### Durante Migración
- [ ] Branch temporal creado
- [ ] Prisma actualizado a 7.3.0
- [ ] schema.prisma ajustado
- [ ] Cliente regenerado
- [ ] Backend compila sin errores
- [ ] Tests manuales pasando
- [ ] Tests automatizados pasando
- [ ] Seeds funcionando

### Después de Migración
- [ ] Código mergeado a develop
- [ ] Tag de nueva versión creado
- [ ] Documentación actualizada
- [ ] Deploy a staging realizado
- [ ] Validación en staging OK

---

## 🚨 ALTERNATIVA: QUEDARSE EN PRISMA 6.5

**Si decides NO actualizar:**

Prisma 6.5.0 está en **LTS (Long Term Support)** y recibirá:
- ✅ Parches de seguridad hasta 2025
- ✅ Bug fixes críticos
- ✅ Soporte de comunidad

**Puedes quedarte en 6.5.0 de forma segura si:**
- La aplicación funciona correctamente
- No necesitas features nuevas de 7.x
- Prefieres estabilidad sobre nuevas funciones

**Para quedarte en 6.5.0:**
```bash
# Fijar versiones en package.json
cd backend
npm install prisma@6.5.0 @prisma/client@6.5.0 --save-exact
```

En `package.json`:
```json
"dependencies": {
  "@prisma/client": "6.5.0"
},
"devDependencies": {
  "prisma": "6.5.0"
}
```

---

**Estado:** ⏳ PENDIENTE DE DECISIÓN
**Última actualización:** 2026-02-10
