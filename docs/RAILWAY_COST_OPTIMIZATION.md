# Análisis de Costos y Optimización Railway

**Fecha:** 2026-02-13
**Usuarios actuales:** 3 clientes
**Costo estimado mensual:** $13.08
**Problema principal:** Memoria (93% del costo)

---

## 📊 Desglose de Costos

| Recurso | Costo Actual | Costo Estimado | % del Total |
|---------|--------------|----------------|-------------|
| **Memoria** | $4.19 | $12.15 | **93%** |
| CPU | $0.05 | $0.13 | 1% |
| Network Egress | $0.26 | $0.76 | 6% |
| Volume | $0.01 | $0.04 | <1% |
| **TOTAL** | **$4.51** | **$13.08** | **100%** |

---

## 🔴 Problemas Críticos Identificados

### 1. **Memoria Constante Alta (600-800 MB)**
**Problema:** Con solo 3 usuarios, la memoria se mantiene constantemente en 600-800 MB.

**Posibles causas:**
- ❌ No hay límite de conexiones a la base de datos (`PRISMA_CONNECTION_LIMIT` no configurado)
- ❌ No hay timeout de pool (`PRISMA_POOL_TIMEOUT` no configurado)
- ⚠️ WebSockets (chat, barcode) pueden acumular conexiones
- ⚠️ Posibles N+1 queries cargando datos innecesarios
- ⚠️ Caché sin límites

### 2. **Tiempos de Respuesta Extremadamente Altos**
**Problema:** p99 alcanza 20+ segundos en múltiples ocasiones.

**Impacto:**
- Experiencia de usuario pobre
- Timeout en navegadores
- Posible causa de memory spikes

**Posibles causas:**
- 🔍 Queries SQL sin índices
- 🔍 Generación de PDFs bloqueante
- 🔍 Procesamiento de imágenes sin optimizar
- 🔍 Llamadas externas (SUNAT, APIs Peru) sin timeout

### 3. **CPU Ociosa pero Memoria Alta**
**Problema:** CPU casi en 0% pero memoria constante.

**Indica:**
- Datos cargados en memoria sin procesar
- Conexiones idle consumiendo recursos
- Posible memory leak

---

## ✅ Optimizaciones Recomendadas

### **NIVEL 1: Configuración (Inmediato - 0 costo)**

#### 1.1. Optimizar Connection Pooling de Prisma

**Agregar a `backend/.env`:**
```bash
# Prisma Connection Pooling
PRISMA_CONNECTION_LIMIT=3
PRISMA_POOL_TIMEOUT=30

# Para Railway (producción), ajustar según plan:
# PRISMA_CONNECTION_LIMIT=5  # Para planes con más RAM
```

**Impacto estimado:**
- 🎯 Reducción de ~200-300 MB de RAM
- 💰 Ahorro: ~$3-4/mes (30-35% reducción)

**Justificación:**
- Con 3 usuarios, no necesitas más de 3-5 conexiones simultáneas
- Default de Prisma es ilimitado, desperdiciando memoria

---

#### 1.2. Configurar Railway Sleep Mode (si aplica)

**Railway Settings:**
```yaml
# railway.json (crear en root del proyecto)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepThreshold": "15m",  # Dormir después de 15min sin tráfico
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Impacto:**
- 🎯 Reduce costos en horas de baja actividad
- 💰 Ahorro: ~$2-3/mes (15-20% reducción)

**Nota:** Solo disponible en Hobby plan, verificar que no afecte SLA

---

#### 1.3. Optimizar Variables de Entorno

**Agregar a `backend/.env`:**
```bash
# Node.js Memory Limit (ajustar según Railway plan)
NODE_OPTIONS="--max-old-space-size=512"  # Limitar a 512MB

# Prisma optimizations
PRISMA_CLIENT_ENGINE_TYPE=binary  # Usa motor binario (más eficiente)

# Disable unnecessary telemetry
NODE_ENV=production
OTEL_TRACES_EXPORTER=none
OTEL_METRICS_EXPORTER=none
```

**Impacto:**
- 🎯 Fuerza garbage collection más agresivo
- 💰 Ahorro: ~$1-2/mes (10% reducción)

---

### **NIVEL 2: Código (1-2 días desarrollo)**

#### 2.1. Agregar Índices a Base de Datos

**Queries lentas detectadas (basado en p99 alto):**

```prisma
// backend/prisma/schema.prisma

model Sale {
  // ... campos existentes

  @@index([organizationId, companyId, createdAt])  // Para queries de dashboard
  @@index([status, organizationId])  // Para filtros por estado
}

model Product {
  // ... campos existentes

  @@index([organizationId, companyId, status])  // Para inventario
  @@index([barcode])  // Ya existe unique, pero verificar
}

model Inventory {
  // ... campos existentes

  @@index([productId, storeId])  // Para búsquedas de stock
  @@index([organizationId, companyId])  // Para multi-tenant
}

model Client {
  // ... campos existentes

  @@index([typeNumber])  # Para búsquedas de clientes
  @@index([organizationId, companyId])
}
```

**Crear migración:**
```bash
cd backend
npx prisma migrate dev --name add_performance_indexes
```

**Impacto:**
- 🎯 Reducción de p99 de 20s a <1s
- 💰 Reducción indirecta de RAM por queries más rápidas

---

#### 2.2. Implementar Cleanup en WebSocket Disconnect

**Archivo:** `backend/src/barcode/barcode.gateway.ts`

```typescript
// Agregar después de línea 39
export class BarcodeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ... código existente

  handleDisconnect(client: Socket) {
    this.logger.log(`Barcode socket ${client.id} disconnected`);
    // Cleanup de cualquier referencia al socket
    delete client.data;
  }
}
```

**Impacto:**
- 🎯 Previene memory leaks en conexiones WebSocket
- 💰 Reducción de RAM gradual (~50-100 MB)

---

#### 2.3. Optimizar Generación de PDFs (Cotizaciones, Ventas)

**Problema:** PDFs generados síncronamente bloqueando thread principal.

**Solución:**
```typescript
// backend/src/quotes/quotes.service.ts

import { Queue } from 'bull';  // Agregar dependencia

@Injectable()
export class QuotesService {
  constructor(
    @InjectQueue('pdf-generation') private pdfQueue: Queue,
  ) {}

  async generateQuotePdf(quoteId: number) {
    // En lugar de generar síncronamente:
    const job = await this.pdfQueue.add('generate-quote-pdf', {
      quoteId,
    });

    return { jobId: job.id, status: 'processing' };
  }
}
```

**Alternativa sin cola (más simple):**
```typescript
// Generar PDFs solo cuando se solicita descarga, no al crear cotización
// No pre-generar PDFs
```

**Impacto:**
- 🎯 Reduce picos de memoria de 800MB a ~500MB
- 🎯 Mejora response time de generación de cotizaciones
- 💰 Reduce spikes de RAM

---

#### 2.4. Implementar Cache con Límites

**Agregar cache para queries frecuentes:**

```typescript
// backend/src/common/cache/cache.service.ts

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';  // npm install lru-cache

@Injectable()
export class CacheService {
  private cache = new LRUCache({
    max: 500,  // Máximo 500 items
    maxSize: 50 * 1024 * 1024,  // 50MB max
    sizeCalculation: (value) => JSON.stringify(value).length,
    ttl: 1000 * 60 * 5,  // 5 minutos TTL
  });

  get(key: string) {
    return this.cache.get(key);
  }

  set(key: string, value: any, ttl?: number) {
    this.cache.set(key, value, { ttl });
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}
```

**Usar en ProductsService:**
```typescript
async findOne(id: number, organizationId?: number) {
  const cacheKey = `product:${id}:${organizationId}`;
  const cached = this.cacheService.get(cacheKey);

  if (cached) return cached;

  const product = await this.prisma.product.findUnique({
    where: { id },
    include: { /* ... */ },
  });

  this.cacheService.set(cacheKey, product, 60_000);  // 1 minuto
  return product;
}
```

**Impacto:**
- 🎯 Reduce queries redundantes a DB
- 🎯 Mejora response time
- 💰 Memoria controlada (max 50MB cache)

---

#### 2.5. Optimizar Carga de Imágenes

**Problema:** Imágenes de productos/catálogos cargadas completas en memoria.

**Solución:**

```typescript
// backend/src/products/products.service.ts

async findAll(filter) {
  return this.prisma.product.findMany({
    where: { /* ... */ },
    select: {
      id: true,
      name: true,
      price: true,
      // NO cargar campo 'images' array completo
      // Cargar solo primera imagen o thumbnail
      image: true,  // Solo imagen principal
      // images: true,  // ❌ Evitar esto en listados
    },
  });
}

// Cargar imágenes completas solo en detalle
async findOne(id: number) {
  return this.prisma.product.findUnique({
    where: { id },
    select: {
      // ... todos los campos incluido images
      images: true,  // ✅ OK en detalle
    },
  });
}
```

**Impacto:**
- 🎯 Reduce payload de listados
- 💰 Reduce RAM y network egress

---

### **NIVEL 3: Infraestructura (Evaluación)**

#### 3.1. Mover Assets a CDN

**Opción 1: Cloudflare R2 (Compatible con S3)**
- Costo: ~$0.015/GB storage + $0/egress (gratis)
- Para imágenes de productos, catálogos, PDFs

**Opción 2: Vercel Blob**
- Integración simple si frontend en Vercel
- 1GB gratis, luego $0.15/GB

**Impacto:**
- 💰 Reduce network egress de Railway
- 🎯 Mejora velocidad de carga de imágenes

---

#### 3.2. Considerar Railway Vertical Scaling

**Actual (estimado):** Shared CPU + 512MB RAM
**Recomendación:** Mantener plan actual DESPUÉS de optimizaciones

**Alternativas a evaluar:**
- Railway Pro: $20/mes base + usage
- Railway Hobby: $5/mes base + usage

**Nota:** PRIMERO aplicar optimizaciones de código, LUEGO evaluar si necesitas cambiar plan

---

## 📋 Plan de Acción Recomendado

### **Semana 1: Quick Wins (0 costo, 2 horas)**

1. ✅ Agregar variables de entorno de Prisma
   ```bash
   PRISMA_CONNECTION_LIMIT=3
   PRISMA_POOL_TIMEOUT=30
   NODE_OPTIONS="--max-old-space-size=512"
   ```

2. ✅ Agregar railway.json con sleep mode

3. ✅ Deploy y monitorear por 48 horas

**Ahorro esperado:** $3-4/mes (30%)

---

### **Semana 2: Optimizaciones DB (1 día dev)**

1. ✅ Agregar índices a Prisma schema
2. ✅ Crear migración
3. ✅ Deploy y monitorear performance

**Impacto esperado:** p99 de 20s → <2s

---

### **Semana 3: Código (2 días dev)**

1. ✅ Implementar cache service con límites
2. ✅ Optimizar carga de imágenes en listados
3. ✅ Agregar handleDisconnect a barcode gateway
4. ✅ Revisar generación de PDFs (moverlo a on-demand)

**Ahorro esperado:** $2-3/mes adicional (20%)

---

## 💰 Resumen de Ahorros Proyectados

| Optimización | Ahorro Mensual | Dificultad | Prioridad |
|--------------|----------------|------------|-----------|
| Connection pooling | $3-4 | Baja | 🔴 Alta |
| Sleep mode | $2-3 | Baja | 🟡 Media |
| Índices DB | $0* | Media | 🔴 Alta |
| Cache implementado | $1-2 | Media | 🟡 Media |
| Optimización imágenes | $1 | Baja | 🟢 Baja |
| WebSocket cleanup | $0.5 | Baja | 🟢 Baja |
| **TOTAL** | **$7.5-10.5** | - | - |

*Los índices no reducen costo directo pero mejoran performance significativamente

---

## 🎯 Meta de Costo

**Actual:** $13.08/mes
**Meta Optimizada:** $5-6/mes (reducción del 50-60%)
**Costo por usuario:** $1.50-2/mes (vs $4.36 actual)

**Escalabilidad:**
- Con optimizaciones: soportar 10-15 usuarios en mismo plan
- Actual: máximo 5-7 usuarios antes de necesitar upgrade

---

## 📊 Métricas a Monitorear Post-Optimización

1. **Memoria:**
   - Objetivo: < 400 MB promedio
   - Actual: 600-800 MB

2. **Response Time (p99):**
   - Objetivo: < 2 segundos
   - Actual: 20+ segundos

3. **Database Connections:**
   - Objetivo: ≤ 3 conexiones activas
   - Monitorear en Railway Observability

4. **Network Egress:**
   - Objetivo: < $0.50/mes
   - Actual: $0.76/mes

---

## 🔍 Comandos de Diagnóstico

```bash
# Monitorear memoria en Railway
railway logs --tail 100 | grep "memory"

# Ver conexiones activas a Postgres
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

# Ver queries lentas
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ⚠️ Riesgos y Consideraciones

1. **Sleep Mode:**
   - Primer request después de sleep tomará 10-30s (cold start)
   - Solo activar si los usuarios toleran esto en horas de baja actividad

2. **Connection Limit Bajo:**
   - Con 3 conexiones, si hay spike de tráfico, algunas requests esperarán
   - Monitorear errores de "connection pool timeout"

3. **Node Memory Limit:**
   - Si limitas a 512MB, asegúrate que Railway plan soporta eso
   - Monitorear OOM (Out of Memory) errors

---

## 📝 Checklist de Implementación

### Nivel 1 (Inmediato)
- [ ] Agregar PRISMA_CONNECTION_LIMIT=3 a .env
- [ ] Agregar PRISMA_POOL_TIMEOUT=30 a .env
- [ ] Agregar NODE_OPTIONS="--max-old-space-size=512"
- [ ] Crear railway.json con sleep config
- [ ] Deploy a producción
- [ ] Monitorear por 48 horas

### Nivel 2 (Esta semana)
- [ ] Agregar índices a schema.prisma
- [ ] Crear migración de índices
- [ ] Agregar handleDisconnect a barcode.gateway.ts
- [ ] Deploy y monitorear p99

### Nivel 3 (Próxima semana)
- [ ] Implementar CacheService
- [ ] Optimizar ProductsService con cache
- [ ] Optimizar carga de imágenes en listados
- [ ] Revisar generación de PDFs
- [ ] Evaluar CDN para assets

---

**Próximos pasos:** Aplicar optimizaciones de Nivel 1 y monitorear resultados antes de proceder con Nivel 2 y 3.
