# ✅ Checklist Pre-Deploy a Producción

Completar TODOS los ítems antes de hacer deploy a Railway.

---

## 📦 Código y Build

- [ ] **Todos los cambios commiteados**
  ```bash
  git status  # Debe mostrar "working tree clean"
  ```

- [ ] **Backend compila sin errores**
  ```bash
  cd backend && npm run build
  ```

- [ ] **Frontend compila sin errores**
  ```bash
  cd fronted && npm run build
  ```

- [ ] **Tests críticos pasando** (si existen)
  ```bash
  npm test
  ```

---

## 🗄️ Base de Datos

- [ ] **Backup realizado y descargado**
  - Railway Dashboard > Data > PostgreSQL > Backups
  - Archivo .sql descargado y guardado localmente
  - Verificado que el archivo tiene contenido válido

- [ ] **DATABASE_URL verificada en Railway**
  - Settings > Variables > DATABASE_URL existe
  - Apunta a la base de datos de Railway (no localhost)

- [ ] **Script de seguridad probado localmente**
  ```bash
  cd backend
  npx prisma db execute --file ./prisma/migration-safety-check.sql
  ```

---

## 🔐 Variables de Entorno

Verificar en Railway Dashboard > Settings > Variables:

- [ ] `DATABASE_URL` - URL de conexión a PostgreSQL
- [ ] Token secret para JWT (variable de entorno)
- [ ] `FRONTEND_URL` - URL del frontend en Railway
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (o el que use Railway)
- [ ] Otras variables específicas del proyecto:
  - [ ] `SUNAT_*` (si aplica)
  - [ ] `AWS_*` (si usa S3)
  - [ ] `REDIS_*` (si usa Redis)
  - [ ] `SMTP_*` (si usa email)

---

## 📝 Configuración de Railway

- [ ] **Build Command configurado**
  - Settings > Deploy > Build Command: `npm run build`

- [ ] **Deploy Command configurado**
  - Settings > Deploy > Deploy Command: `npm run deploy:full && npm run start:prod`

- [ ] **Start Command configurado** (opcional)
  - Settings > Deploy > Start Command: `npm run start:prod`

- [ ] **Railway CLI instalado**
  ```bash
  npm list -g @railway/cli
  # Si no está instalado: npm i -g @railway/cli
  ```

- [ ] **Conectado al proyecto**
  ```bash
  railway login
  railway link
  ```

---

## 🚀 Pre-Deploy Execution

- [ ] **Safety check ejecutado en Railway**
  ```bash
  railway run npm run deploy:safety-check
  ```

- [ ] **Output del safety check verificado**
  - Debe mostrar: `✓ El schema está listo para prisma migrate deploy`
  - NO debe mostrar errores

- [ ] **Conexión a base de datos verificada**
  ```bash
  railway run npx prisma db pull
  # O
  railway run psql $DATABASE_URL -c "SELECT version();"
  ```

---

## 📚 Documentación

- [ ] **Leída guía completa**
  - `docs/DESPLIEGUE_PRODUCCION_RAILWAY.md`

- [ ] **Leída guía rápida**
  - `backend/RAILWAY_DEPLOY.md`

- [ ] **Plan de rollback entendido**
  - Sé cómo revertir el deploy si algo sale mal
  - Sé cómo restaurar el backup

---

## 👥 Equipo

- [ ] **Equipo notificado del deploy**
  - Hora de inicio del deploy comunicada
  - Duración estimada compartida (~15-30 minutos)

- [ ] **Horario apropiado**
  - Evitar horas pico de uso
  - Preferiblemente fuera de horario laboral
  - O en ventana de mantenimiento acordada

- [ ] **Persona responsable asignada**
  - Quien monitoreará el deploy
  - Quien responderá si hay problemas

---

## 🔍 Verificación Post-Deploy

Preparar para verificar después del deploy:

- [ ] **URLs de verificación listas**
  - [ ] `https://tu-backend.railway.app/health`
  - [ ] `https://tu-frontend.railway.app/dashboard/inventory`
  - [ ] `https://tu-frontend.railway.app/dashboard/brands`
  - [ ] `https://tu-frontend.railway.app/dashboard/accounting/journals`
  - [ ] `https://tu-frontend.railway.app/dashboard/entries/new`
  - [ ] `https://tu-frontend.railway.app/dashboard/sales/new`

- [ ] **Credenciales de prueba listas**
  - Usuario y contraseña para login
  - Datos de prueba preparados

- [ ] **Tiempo reservado para monitoreo**
  - Al menos 1 hora después del deploy
  - Disponibilidad para resolver problemas

---

## 🆘 Plan de Contingencia

- [ ] **Backup accesible**
  - Ubicación del archivo .sql conocida
  - Proceso de restauración entendido

- [ ] **Contacto de soporte disponible**
  - Railway support (si es necesario)
  - Equipo técnico disponible

- [ ] **Documentación de rollback lista**
  - Comandos preparados
  - Proceso documentado

---

## ⚠️ Señales de Alerta (NO Deploy)

**NO proceder con el deploy si:**

- ❌ No hay backup de la base de datos
- ❌ Código no compila
- ❌ Safety check falla localmente
- ❌ Variables de entorno no están configuradas
- ❌ Es hora pico de uso del sistema
- ❌ No hay tiempo para monitorear después
- ❌ Equipo no está notificado/disponible

---

## ✅ Todo Listo - Ejecutar Deploy

Una vez que TODOS los ítems anteriores están marcados:

### Opción A: Deploy Automático (Git Push)

```bash
git push origin main
# Railway desplegará automáticamente
```

### Opción B: Deploy Manual

```bash
railway up
```

### Monitorear Deploy

```bash
# En otra terminal
railway logs --follow
```

---

## 📊 Post-Deploy Checklist

Después del deploy exitoso:

- [ ] Todas las URLs de verificación funcionan (200 OK)
- [ ] No hay errores en logs (`railway logs`)
- [ ] Funcionalidad básica probada (login, crear producto, etc.)
- [ ] Métricas normales (CPU, memoria en Railway Dashboard)
- [ ] Equipo notificado del deploy exitoso
- [ ] Monitoreo activo primeras 2-4 horas

---

## 📝 Notas

Espacio para notas específicas de este deploy:

```
Fecha del deploy: _________________
Hora de inicio: _________________
Responsable: _________________
Notas:







```

---

**Versión:** 1.0
**Última actualización:** 2026-02-15
