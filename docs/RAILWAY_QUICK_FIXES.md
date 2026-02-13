# ⚡ Railway: Optimizaciones Inmediatas

**Fecha:** 2026-02-13
**Tiempo de implementación:** 15-30 minutos
**Ahorro estimado:** $3-4/mes (~30% reducción)
**Impacto:** Memoria: 600-800 MB → 400-500 MB

---

## 🎯 Problema Actual

- **Costo mensual:** $13.08 para solo 3 usuarios
- **Memoria:** 600-800 MB constante (93% del costo)
- **Response Time p99:** 20+ segundos
- **Causa principal:** Sin límite de conexiones a base de datos

---

## ✅ PASO 1: Configurar Variables de Entorno en Railway

### Accede a tu proyecto en Railway:
1. Ve a tu proyecto backend en Railway
2. Clic en **Variables**
3. Agrega estas nuevas variables:

```bash
PRISMA_CONNECTION_LIMIT=3
PRISMA_POOL_TIMEOUT=30
NODE_OPTIONS=--max-old-space-size=512
PRISMA_CLIENT_ENGINE_TYPE=binary
```

### ¿Por qué estos valores?

- **PRISMA_CONNECTION_LIMIT=3**: Con 3 usuarios, 3 conexiones simultáneas es suficiente. Cada conexión idle consume ~50-100 MB de RAM. Sin límite, Prisma puede abrir decenas de conexiones innecesarias.

- **PRISMA_POOL_TIMEOUT=30**: Cierra conexiones inactivas después de 30 segundos, liberando memoria.

- **NODE_OPTIONS=--max-old-space-size=512**: Limita Node.js a 512MB máximo, forzando garbage collection más agresivo.

- **PRISMA_CLIENT_ENGINE_TYPE=binary**: Usa motor binario en lugar de librería Node.js (10-20% más eficiente).

---

## ✅ PASO 2: Aplicar Migración de Base de Datos

Se agregó un índice en la tabla `Client` para búsquedas rápidas por número de documento.

```bash
# Desde tu máquina local (en el directorio backend):
cd backend
npx prisma migrate deploy
```

O desde Railway:
1. En Settings → Deploy Triggers
2. Agregar comando post-deploy: `npx prisma migrate deploy`

---

## ✅ PASO 3: Deploy y Monitorear

### Deploy:
```bash
git add .
git commit -m "feat: optimize Railway costs with connection pooling"
git push origin main
```

Railway detectará el push y desplegará automáticamente.

### Monitorear por 48 horas:

1. **Métricas de Railway:**
   - Ve a tu servicio → Metrics
   - Observa la gráfica de **Memory**
   - Debe reducirse de 600-800 MB a 400-500 MB

2. **Response Time:**
   - Observa **Response Time (p99)**
   - Debe reducirse gradualmente

3. **Costos:**
   - Ve a Settings → Usage
   - Compara "Current Usage" antes y después

---

## 📊 Resultados Esperados

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Memoria promedio | 700 MB | 450 MB | **-36%** |
| Conexiones DB activas | 10-20+ | 3-5 | **-75%** |
| Costo mensual (RAM) | $12.15 | $8-9 | **$3-4** |
| Costo total estimado | $13.08 | $9-10 | **-30%** |

---

## ⚠️ Posibles Problemas y Soluciones

### Problema 1: "Connection pool timeout"
**Síntoma:** Errores 500 en requests simultáneos

**Solución:** Aumenta ligeramente el límite:
```bash
PRISMA_CONNECTION_LIMIT=5  # En lugar de 3
```

### Problema 2: OOM (Out of Memory)
**Síntoma:** Railway reinicia el servicio

**Solución:** Aumenta memory limit:
```bash
NODE_OPTIONS=--max-old-space-size=768  # En lugar de 512
```

### Problema 3: Queries lentas persisten
**Síntoma:** p99 sigue alto después de 48 horas

**Solución:** Revisa los índices de BD. Ver `docs/RAILWAY_COST_OPTIMIZATION.md` sección "Nivel 2".

---

## 📈 Próximos Pasos (Semana 2-3)

Una vez confirmes que estas optimizaciones funcionan correctamente:

1. **Implementar cache service** (Nivel 2 - docs/RAILWAY_COST_OPTIMIZATION.md)
   - Reducción adicional: $1-2/mes
   - Tiempo: 1 día desarrollo

2. **Optimizar carga de imágenes** (Nivel 2)
   - Reducción network egress: $0.20-0.30/mes
   - Tiempo: 2-3 horas

3. **Considerar CDN para assets** (Nivel 3)
   - Cloudflare R2 / Vercel Blob
   - Reducción potencial: $0.50-1/mes
   - Tiempo: 1 día desarrollo

---

## 🔍 Comandos de Diagnóstico

### Ver conexiones activas a PostgreSQL:
```sql
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

### Ver memoria de Node.js:
```bash
# En Railway logs
railway logs --tail 100 | grep "memory"
```

### Ver queries más lentas:
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ✅ Checklist de Implementación

- [ ] Agregar variables de entorno en Railway
- [ ] Hacer deploy de cambios
- [ ] Aplicar migración de BD (`npx prisma migrate deploy`)
- [ ] Monitorear métricas por 48 horas
- [ ] Verificar reducción de costos en Railway Usage
- [ ] Si hay problemas, ajustar valores según "Posibles Problemas"
- [ ] Documentar resultados obtenidos
- [ ] Proceder con optimizaciones Nivel 2 si todo va bien

---

## 💰 Meta de Costo

**Objetivo a corto plazo (con quick fixes):**
- Costo actual: $13.08/mes
- **Meta: $9-10/mes**
- Ahorro: $3-4/mes (30%)

**Objetivo a mediano plazo (con todas las optimizaciones):**
- **Meta: $5-6/mes**
- Ahorro: $7-8/mes (55-60%)

---

**Próxima revisión:** 48 horas después del deploy

**Documento completo:** [docs/RAILWAY_COST_OPTIMIZATION.md](./RAILWAY_COST_OPTIMIZATION.md)
