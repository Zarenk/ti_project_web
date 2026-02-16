# Guía de Despliegue Seguro a Railway - Producción

## ⚠️ IMPORTANTE: Leer Completo Antes de Ejecutar

Esta guía documenta el proceso completo para desplegar a producción en Railway, mitigando problemas de migraciones y asegurando la integridad de los datos.

---

## Contexto del Problema

Durante el desarrollo local hemos aplicado varios parches SQL manuales que no están incluidos en las migraciones estándar de Prisma:

1. **Entry**: 11 columnas de guías de remisión SUNAT
2. **SunatTransmission**: 4 columnas CDR
3. **Brand**: columna `organizationId`
4. **Account**: 5 columnas para multi-tenancy y tipo de cuenta

Si desplegamos directamente, Railway ejecutará `prisma migrate deploy` pero **no incluirá estos cambios manuales**, causando errores 500 similares a los que resolvimos localmente.

---

## Estrategia de Mitigación

### Fase 1: Pre-Deploy (CRÍTICO)
Ejecutar script de seguridad que aplica todos los cambios manuales de forma idempotente.

### Fase 2: Deploy
Desplegar código y ejecutar migraciones estándar de Prisma.

### Fase 3: Post-Deploy
Verificar integridad y funcionalidad.

---

## 📋 Checklist Pre-Deploy

### 1. Backup de Base de Datos (OBLIGATORIO)

**En Railway Dashboard:**
```bash
# Opción A: Usar Railway CLI
railway run pg_dump $DATABASE_URL > backup-pre-deploy-$(date +%Y%m%d-%H%M%S).sql

# Opción B: Manualmente desde Railway Dashboard
# Data > PostgreSQL > Backups > Create Backup
```

**Guardar backup localmente:**
- Descargar el archivo .sql
- Guardarlo en lugar seguro fuera del proyecto
- Verificar que el archivo no esté corrupto (debe tener contenido SQL válido)

### 2. Verificar Variables de Entorno en Railway

**Variables requeridas:**
```env
DATABASE_URL=postgresql://...
TOKEN_DE_AUTENTICACION=... (configurar en Railway)
FRONTEND_URL=https://tu-app.up.railway.app
NODE_ENV=production
PORT=3000
```

**Verificar en Railway Dashboard:**
- Settings > Variables
- Confirmar que todas las variables están configuradas
- **IMPORTANTE**: `DATABASE_URL` debe apuntar a la base de datos de Railway, no a localhost

### 3. Confirmar Estado del Código

```bash
# Verificar que estás en la rama correcta
git status
git branch

# Confirmar que todos los cambios están commiteados
git log --oneline -5

# Verificar que el código funciona localmente
cd backend && npm run build
cd ../fronted && npm run build
```

---

## 🚀 Proceso de Despliegue

### PASO 1: Conectarse a la Base de Datos de Railway

**Opción A: Usando Railway CLI (Recomendado)**

```bash
# Instalar Railway CLI si no lo tienes
npm i -g @railway/cli

# Login a Railway
railway login

# Conectar al proyecto
railway link

# Obtener la conexión a la base de datos
railway run bash
```

**Opción B: Usando DATABASE_URL directamente**

```bash
# Copiar DATABASE_URL desde Railway Dashboard
# Settings > Variables > DATABASE_URL

# Exportar temporalmente
export DATABASE_URL="postgresql://postgres:..."
```

### PASO 2: Ejecutar Script de Seguridad

**Este paso es CRÍTICO y debe ejecutarse ANTES del deploy:**

```bash
# Desde el directorio backend
cd backend

# Opción A: Con Railway CLI
railway run npx prisma db execute --file ./prisma/migration-safety-check.sql

# Opción B: Con DATABASE_URL exportada
npx prisma db execute --file ./prisma/migration-safety-check.sql --schema ./prisma/schema.prisma
```

**Verificar salida:**
Deberías ver mensajes como:
```
✓ Columnas de Entry verificadas
✓ Columnas de SunatTransmission verificadas
✓ Columnas de Brand verificadas
✓ Columnas de Account verificadas
✓ Índices verificados
✓ Foreign keys verificadas
=== VERIFICACIÓN COMPLETADA ===
```

**Si hay errores:**
- NO continuar con el deploy
- Copiar el mensaje de error completo
- Analizar y resolver antes de proceder

### PASO 3: Hacer Deploy a Railway

**Opción A: Deploy Automático (Git Push)**

```bash
# Asegurarte de estar en main/master
git checkout main

# Push a Railway (si está configurado con GitHub)
git push origin main

# Railway detectará el push y desplegará automáticamente
```

**Opción B: Deploy Manual con Railway CLI**

```bash
railway up
```

### PASO 4: Verificar Migraciones en Railway

**Monitorear logs del deploy:**

```bash
# En Railway Dashboard > Deployments > Logs
# O con CLI:
railway logs
```

**Buscar en logs:**
```
Running migrations...
Prisma Migrate applied successfully
```

**Si ves errores de migraciones:**
- NO entrar en pánico
- Los cambios críticos ya se aplicaron en PASO 2
- Revisar qué migración específica falló
- Probablemente sea algo menor que se puede corregir

---

## ✅ Verificación Post-Deploy

### 1. Verificar Conectividad

```bash
# Verificar que el backend responde
curl https://tu-backend.railway.app/health

# O desde el navegador
https://tu-backend.railway.app
```

### 2. Verificar Páginas Críticas

**Abrir cada una en el navegador y verificar que cargan sin errores 500:**

1. ✅ **Inventory**: `https://tu-app.com/dashboard/inventory`
2. ✅ **Brands**: `https://tu-app.com/dashboard/brands`
3. ✅ **Journal Entries**: `https://tu-app.com/dashboard/accounting/journals`
4. ✅ **Entries**: `https://tu-app.com/dashboard/entries/new`
5. ✅ **Sales**: `https://tu-app.com/dashboard/sales/new`
6. ✅ **Products**: `https://tu-app.com/dashboard/products`

### 3. Verificar Logs en Tiempo Real

```bash
railway logs --follow
```

**Buscar errores:**
- `PrismaClientKnownRequestError`
- `column does not exist`
- `500 Internal Server Error`

**Si todo está bien, verás:**
- Requests 200 OK
- No errores de Prisma
- Aplicación funcionando normalmente

### 4. Prueba de Funcionalidad Básica

**Realizar estas acciones en la UI:**
1. Login con usuario existente
2. Crear un nuevo producto
3. Crear una entrada de inventario
4. Crear una venta
5. Ver reporte de inventario
6. Ver asientos contables

**Si alguna falla:**
- Revisar logs específicos de esa funcionalidad
- Verificar que la tabla afectada tiene todas las columnas

---

## 🆘 Plan de Rollback (Si algo sale mal)

### Opción 1: Rollback del Deploy

```bash
# En Railway Dashboard
# Deployments > [deployment anterior] > Redeploy
```

### Opción 2: Restaurar Backup de Base de Datos

**⚠️ SOLO EN CASO DE EMERGENCIA - Perderás datos creados después del backup**

```bash
# Desde Railway CLI
railway run bash

# Restaurar backup
psql $DATABASE_URL < backup-pre-deploy-YYYYMMDD-HHMMSS.sql
```

### Opción 3: Rollback de Código + Reejecutar Script

```bash
# Revertir a commit anterior
git revert HEAD

# Push del revert
git push origin main

# Reejecutar script de seguridad
railway run npx prisma db execute --file ./prisma/migration-safety-check.sql
```

---

## 📊 Monitoreo Post-Deploy (Primeras 24 horas)

### Checklist de Monitoreo

- [ ] Revisar logs cada 2-4 horas el primer día
- [ ] Verificar que no haya errores 500
- [ ] Confirmar que todas las funcionalidades críticas funcionan
- [ ] Revisar métricas de Railway (CPU, Memoria, Requests)
- [ ] Tener backup fresco disponible

### Comandos Útiles

```bash
# Ver logs en tiempo real
railway logs --follow

# Ver logs de los últimos 100 eventos
railway logs --tail 100

# Ver métricas
railway status

# Conectar a la base de datos
railway run psql $DATABASE_URL
```

---

## 🔧 Solución de Problemas Comunes

### Error: "column X does not exist"

**Causa:** El script de seguridad no se ejecutó o falló parcialmente.

**Solución:**
```bash
# Reejecutar script de seguridad
railway run npx prisma db execute --file ./prisma/migration-safety-check.sql

# Reiniciar deployment
railway up --force
```

### Error: "Unique constraint violation"

**Causa:** Datos duplicados en índices únicos.

**Solución:**
```bash
# Conectar a la base de datos
railway run psql $DATABASE_URL

# Identificar duplicados (ejemplo para Account)
SELECT code, "organizationId", COUNT(*)
FROM "Account"
GROUP BY code, "organizationId"
HAVING COUNT(*) > 1;

# Resolver manualmente según el caso
```

### Error: "Migration already applied"

**Causa:** Prisma detecta que una migración ya se ejecutó.

**Solución:**
```bash
# Marcar migración como aplicada sin ejecutarla
railway run npx prisma migrate resolve --applied "nombre_migracion"

# Continuar con siguiente migración
railway run npx prisma migrate deploy
```

---

## 📝 Notas Importantes

### ¿Por qué no usar `prisma migrate reset`?

**NUNCA usar en producción** - Esto:
1. Elimina TODA la base de datos
2. Recrea desde cero
3. **PIERDE TODOS LOS DATOS**

Solo es seguro en desarrollo.

### ¿Por qué el script de seguridad es idempotente?

Usa `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc.
- Se puede ejecutar múltiples veces
- No causará errores si ya existe
- Seguro de reejecutar si algo falla a mitad

### ¿Qué pasa con futuras migraciones?

**Flujo correcto a partir de ahora:**

1. Crear migración localmente:
   ```bash
   npx prisma migrate dev --name descripcion_cambio
   ```

2. Commitear la migración:
   ```bash
   git add prisma/migrations/
   git commit -m "feat: add nueva_funcionalidad migration"
   ```

3. Push a Railway:
   ```bash
   git push origin main
   ```

4. Railway ejecutará automáticamente `prisma migrate deploy`

**NO más parches SQL manuales** a menos que sea una emergencia.

---

## ✅ Checklist Final Antes de Deploy

- [ ] Backup de base de datos creado y descargado
- [ ] Variables de entorno verificadas en Railway
- [ ] Código compila sin errores (`npm run build`)
- [ ] Script de seguridad probado localmente
- [ ] Conexión a base de datos de Railway verificada
- [ ] Script de seguridad ejecutado en Railway
- [ ] Plan de rollback entendido y listo
- [ ] Equipo notificado del deploy
- [ ] Horario apropiado (evitar horas pico)

---

## 🎯 Resultado Esperado

Después de seguir esta guía:

✅ Base de datos con schema actualizado y correcto
✅ Todas las columnas necesarias presentes
✅ Migraciones de Prisma aplicadas correctamente
✅ Aplicación funcionando sin errores 500
✅ Datos preservados intactos
✅ Sistema listo para producción

---

## 📞 Soporte

Si encuentras problemas no cubiertos en esta guía:

1. Revisar logs completos de Railway
2. Verificar estado de la base de datos
3. Consultar documentación de Prisma: https://www.prisma.io/docs/guides/migrate/production-troubleshooting
4. Documentar el error específico

---

**Última actualización:** 2026-02-15
**Versión:** 1.0
**Autor:** Equipo de Desarrollo TI Projecto Web
