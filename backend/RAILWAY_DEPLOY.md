# Despliegue a Railway - Guía Rápida

## 🚨 IMPORTANTE: Ejecutar en orden

### Pre-requisitos
- [ ] Railway CLI instalado: `npm i -g @railway/cli`
- [ ] Acceso al proyecto en Railway
- [ ] Backup de base de datos realizado

---

## Opción 1: Despliegue Automático (Recomendado)

### Configurar en Railway Dashboard

1. **Settings > Deploy > Build Command:**
   ```bash
   npm run build
   ```

2. **Settings > Deploy > Deploy Command:**
   ```bash
   npm run deploy:full && npm run start:prod
   ```

Esto ejecutará:
- ✅ Safety check (verifica y corrige schema)
- ✅ Migraciones de Prisma
- ✅ Inicio de la aplicación

### Push y Deploy

```bash
git add .
git commit -m "feat: preparado para producción"
git push origin main
```

Railway detectará el push y desplegará automáticamente.

---

## Opción 2: Despliegue Manual

### Paso 1: Conectar a Railway

```bash
railway login
railway link
```

### Paso 2: Ejecutar Safety Check

```bash
railway run npm run deploy:safety-check
```

**Verificar output:**
```
✓ Columnas de Entry verificadas
✓ Columnas de SunatTransmission verificadas
✓ Columnas de Brand verificadas
✓ Columnas de Account verificadas
✓ El schema está listo para prisma migrate deploy
```

### Paso 3: Aplicar Migraciones

```bash
railway run npm run deploy:migrate
```

### Paso 4: Deploy

```bash
railway up
```

---

## Verificación Post-Deploy

### Verificar Logs

```bash
railway logs --follow
```

### Verificar Salud de la Aplicación

```bash
# Desde línea de comandos
curl https://tu-backend.railway.app/health

# Desde navegador
https://tu-backend.railway.app
```

### Verificar Páginas Críticas

Abrir en navegador y confirmar que NO hay errores 500:

- ✅ `/dashboard/inventory`
- ✅ `/dashboard/brands`
- ✅ `/dashboard/accounting/journals`
- ✅ `/dashboard/entries/new`
- ✅ `/dashboard/sales/new`

---

## Scripts Disponibles

```bash
# Solo safety check (verifica schema)
npm run deploy:safety-check

# Solo migraciones
npm run deploy:migrate

# Safety check + Migraciones (Completo)
npm run deploy:full
```

---

## Troubleshooting

### Error: "column does not exist"

**Solución:**
```bash
# Reejecutar safety check
railway run npm run deploy:safety-check

# Verificar que se ejecutó correctamente
railway logs
```

### Error: "Migration already applied"

**Solución:**
```bash
# Marcar migración como aplicada
railway run npx prisma migrate resolve --applied "nombre_migracion"

# Continuar con siguiente
railway run npm run deploy:migrate
```

### Rollback

```bash
# En Railway Dashboard
# Deployments > [deployment anterior] > Redeploy
```

---

## Documentación Completa

Ver: `docs/DESPLIEGUE_PRODUCCION_RAILWAY.md`

---

**Última actualización:** 2026-02-15
