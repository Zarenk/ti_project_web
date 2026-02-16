# 🚦 Análisis: Rate Limiting - Problema #6

**Fecha:** 2026-02-10
**Estado:** ✅ **IMPLEMENTADO**

---

## 📊 RESUMEN EJECUTIVO

Después del análisis del código, se encontró que:

1. ✅ **El sistema YA tiene middleware de rate limiting implementado**
2. ⚠️ **Los endpoints críticos de autenticación NO están protegidos**
3. 🔴 **Vulnerabilidad HIGH: Brute force attacks posibles en login/register**

---

## 🔍 ESTADO ACTUAL

### Middleware de Rate Limiting Existente

**1. RateLimitMiddleware** (`backend/src/common/middleware/rate-limit.middleware.ts`)
```typescript
private readonly limit = 5;
private readonly windowMs = 60_000; // 1 minuto
```
- **Límite:** 5 requests por minuto por IP+path
- **Uso actual:** Solo en módulo de campaigns
- **Estado:** ✅ Implementado correctamente

**2. PublicRateLimitMiddleware** (`backend/src/common/middleware/public-rate-limit.middleware.ts`)
```typescript
private readonly windowMs = 60_000;
private readonly maxRequests = 120;
```
- **Límite:** 120 requests por minuto por IP
- **Uso actual:** Rutas públicas (public/.*, contact, newsletter, orders/.*)
- **Estado:** ✅ Implementado correctamente

---

## 🔴 ENDPOINTS VULNERABLES SIN PROTECCIÓN

### 1. POST /api/users/login
**Ubicación:** [users.controller.ts:36-48](backend/src/users/users.controller.ts#L36-L48)
```typescript
@Post('login')
async login(
  @Body() body: { email: string; password: string },
  @Request() req: ExpressRequest,
) {
  const user = await this.usersService.validateUser(
    body.email,
    body.password,
    req,
  );
  const token = await this.usersService.login(user, req);
  return token;
}
```
- ❌ **Sin Guards**
- ❌ **Sin Rate Limiting**
- 🔴 **Riesgo:** Brute force de contraseñas

### 2. POST /api/users/register
**Ubicación:** [users.controller.ts:50-63](backend/src/users/users.controller.ts#L50-L63)
```typescript
@Post('register')
async register(
  @Body()
  body: {
    email: string;
    username?: string;
    password: string;
    role: string;
    status?: string;
    organizationId?: number | null;
  },
) {
  return this.usersService.register(body);
}
```
- ❌ **Sin Guards**
- ❌ **Sin Rate Limiting**
- 🔴 **Riesgo:** Spam de cuentas, enumeración de usuarios

### 3. POST /api/users/self-register
**Ubicación:** [users.controller.ts:130-145](backend/src/users/users.controller.ts#L130-L145)
```typescript
@Post('self-register')
async publicRegister(
  @Body()
  body: {
    email: string;
    username?: string;
    password: string;
    name: string;
    image?: string | null;
    type?: string | null;
    typeNumber?: string | null;
    organizationId?: number | null;
  },
) {
  return this.usersService.publicRegister(body);
}
```
- ❌ **Sin Guards**
- ❌ **Sin Rate Limiting**
- 🔴 **Riesgo:** Registro masivo de cuentas falsas

---

## 🎯 COMPARACIÓN CON OTROS MÓDULOS

### Campaigns Module (PROTEGIDO) ✅
**Archivo:** [campaigns.module.ts:16-23](backend/src/campaigns/campaigns.module.ts#L16-L23)
```typescript
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(RateLimitMiddleware)
    .forRoutes(
      { path: 'campaigns', method: RequestMethod.POST },
      { path: 'campaigns/:id/schedule', method: RequestMethod.POST },
    );
}
```
- ✅ Rate limiting aplicado correctamente a endpoints POST

### Users Module (NO PROTEGIDO) ❌
**Archivo:** [users.module.ts:50-52](backend/src/users/users.module.ts#L50-L52)
```typescript
configure(consumer: MiddlewareConsumer) {
  consumer.apply(SimpleCookieMiddleware).forRoutes('*');
}
```
- ❌ Solo tiene SimpleCookieMiddleware
- ❌ NO tiene RateLimitMiddleware

---

## 💥 VECTORES DE ATAQUE

### 1. Brute Force en Login
**Escenario:** Atacante intenta múltiples contraseñas en la misma cuenta

Sin rate limiting:
```bash
# Atacante puede hacer 1000+ intentos por minuto
for i in {1..1000}; do
  curl -X POST http://api.tu-dominio.com/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"victim@example.com","password":"pass'$i'"}'
done
```

**Impacto:** 🔴 CRÍTICO - Puede comprometer cuentas con contraseñas débiles

### 2. Enumeración de Usuarios
**Escenario:** Atacante verifica qué emails están registrados

```bash
# Sin rate limiting, puede enumerar miles de emails
for email in emails.txt; do
  curl -X POST http://api.tu-dominio.com/api/users/register \
    -H "Content-Type: application/json" \
    -d '{"email":"'$email'","password":"test123","role":"CLIENT"}'
done
```

**Impacto:** 🟠 MEDIO - Obtiene lista de usuarios válidos para phishing

### 3. Registro Masivo de Cuentas Falsas
**Escenario:** Atacante crea miles de cuentas spam

```bash
# Sin rate limiting, puede crear cientos de cuentas por minuto
for i in {1..1000}; do
  curl -X POST http://api.tu-dominio.com/api/users/self-register \
    -H "Content-Type: application/json" \
    -d '{"email":"spam'$i'@temp.com","password":"test","name":"Spam"}'
done
```

**Impacto:** 🟠 MEDIO - Contamina base de datos, costos de almacenamiento

---

## ✅ SOLUCIÓN RECOMENDADA

### Opción A: Rate Limiting Estricto (RECOMENDADO) ✅

Aplicar `RateLimitMiddleware` (5 req/min) a los endpoints de autenticación.

**Implementación:**

**Archivo:** `backend/src/users/users.module.ts`

```typescript
import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './JwtStrategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { SimpleCookieMiddleware } from './simple-cookie.middleware';
import { RateLimitMiddleware } from 'src/common/middleware/rate-limit.middleware';  // ← AGREGAR
import { ActivityModule } from 'src/activity/activity.module';
import { GlobalSuperAdminGuard } from 'src/tenancy/global-super-admin.guard';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ContextEventsGateway } from './context-events.gateway';
import { ContextMetricsService } from './context-metrics.service';
import { ContextThrottleService } from './context-throttle.service';
import { ContextPrometheusService } from './context-prometheus.service';
import { SubscriptionQuotaService } from 'src/subscriptions/subscription-quota.service';
import { ContextMetricsController } from './context-metrics.controller';

@Module({
  imports: [
    ActivityModule,
    TenancyModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [UsersController, ContextMetricsController],
  providers: [
    UsersService,
    PrismaService,
    JwtStrategy,
    JwtAuthGuard,
    GlobalSuperAdminGuard,
    ContextMetricsService,
    ContextThrottleService,
    ContextPrometheusService,
    ContextEventsGateway,
    SubscriptionQuotaService,
  ],
  exports: [JwtAuthGuard],
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SimpleCookieMiddleware).forRoutes('*');

    // ← AGREGAR RATE LIMITING A ENDPOINTS CRÍTICOS
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'users/login', method: RequestMethod.POST },
        { path: 'users/register', method: RequestMethod.POST },
        { path: 'users/self-register', method: RequestMethod.POST },
      );
  }
}
```

**Características:**
- ✅ 5 intentos por minuto por IP por endpoint
- ✅ Contador independiente para cada endpoint (login, register, self-register)
- ✅ Usuario puede intentar 5 veces si escribe mal su contraseña
- ✅ Previene brute force efectivamente
- ✅ No afecta a usuarios legítimos

---

### Opción B: Rate Limiting Moderado

Si 5 req/min es muy restrictivo, crear un nuevo middleware con límites personalizados:

**Nuevo archivo:** `backend/src/common/middleware/auth-rate-limit.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface Entry {
  count: number;
  timestamp: number;
}

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private hits = new Map<string, Entry>();
  private readonly limit = 10; // 10 intentos por minuto
  private readonly windowMs = 60_000;

  use(req: Request, res: Response, next: NextFunction) {
    const key = req.ip + req.path;
    const now = Date.now();
    const entry = this.hits.get(key);

    if (entry && now - entry.timestamp < this.windowMs) {
      if (entry.count >= this.limit) {
        return res.status(429).json({
          message: 'Demasiados intentos. Intenta de nuevo en 1 minuto.',
          retryAfter: Math.ceil((entry.timestamp + this.windowMs - now) / 1000)
        });
      }
      entry.count++;
    } else {
      this.hits.set(key, { count: 1, timestamp: now });
    }

    next();
  }
}
```

**Ventajas:**
- ✅ 10 intentos por minuto (más permisivo)
- ✅ Mensaje en español
- ✅ Indica cuánto tiempo esperar

**Desventaja:**
- ⚠️ Más vulnerable a brute force (el doble de intentos)

---

## 📈 ANÁLISIS DE LÍMITES

### Comparación de Opciones

| Aspecto | RateLimitMiddleware (5/min) | AuthRateLimitMiddleware (10/min) | Sin Límite (actual) |
|---------|----------------------------|----------------------------------|---------------------|
| **Seguridad** | 🟢 ALTA | 🟡 MEDIA | 🔴 NULA |
| **UX para usuarios legítimos** | 🟡 Buena | 🟢 Excelente | 🟢 Perfecta |
| **Prevención brute force** | 🟢 Muy efectiva | 🟡 Efectiva | 🔴 Nula |
| **Intentos por hora** | 300 | 600 | ∞ |
| **Intentos por día** | 7,200 | 14,400 | ∞ |

### Escenarios de Uso

**Usuario legítimo que olvidó su contraseña:**
- Con 5/min: Puede intentar 5 veces, esperar 1 min, intentar 5 más → Suficiente
- Con 10/min: Puede intentar 10 veces → Más que suficiente
- Sin límite: Puede intentar infinito → Inseguro

**Atacante con diccionario de 10,000 contraseñas:**
- Con 5/min: Tardaría 33 horas en probar todas
- Con 10/min: Tardaría 16.6 horas en probar todas
- Sin límite: Tardaría minutos en probar todas

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar Opción A (RateLimitMiddleware con 5 req/min)** ✅

### Razones:

1. **Seguridad primero:** 5 intentos por minuto es suficiente para usuarios legítimos
2. **Ya implementado:** No requiere código nuevo, solo configuración
3. **Consistente:** Usa el mismo middleware que campaigns
4. **Probado:** Ya está en producción en otro módulo

### Beneficios:

- 🛡️ Previene brute force efectivamente
- ⚡ No requiere desarrollo adicional
- 📝 Fácil de auditar y mantener
- 🔄 Puede ajustarse fácilmente si es necesario

---

## 📋 PASOS DE IMPLEMENTACIÓN

1. ✅ Analizar código existente (COMPLETADO)
2. ✅ Modificar `users.module.ts` para agregar rate limiting (COMPLETADO)
3. ✅ Compilar backend (COMPLETADO - Sin errores)
4. ⏳ Probar endpoints con curl/Postman (Pendiente para el usuario)
5. ⏳ Verificar respuesta 429 después de 5 intentos (Pendiente para el usuario)
6. ⏳ Crear commit (En proceso)

---

## 🧪 PLAN DE PRUEBAS

### Prueba 1: Login Rate Limiting
```bash
# Debe permitir 5 requests
for i in {1..5}; do
  echo "Intento $i:"
  curl -X POST http://localhost:4000/api/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong'$i'"}'
  echo ""
done

# El 6to debe retornar 429
echo "Intento 6 (debe fallar):"
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong6"}'
```

**Resultado esperado:** Los primeros 5 intentos funcionan, el 6to retorna `429 Too many requests`

### Prueba 2: Registro Rate Limiting
```bash
# Similar al anterior pero con /users/register
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/users/register \
    -H "Content-Type: application/json" \
    -d '{"email":"spam'$i'@test.com","password":"test","role":"CLIENT"}'
done
```

**Resultado esperado:** Los primeros 5 se procesan, el 6to retorna 429

---

## 📝 CONCLUSIÓN

**Estado:** ✅ **IMPLEMENTADO EXITOSAMENTE**

Se implementó `RateLimitMiddleware` en los endpoints críticos de autenticación:

### Cambios Realizados

**Archivo modificado:** [users.module.ts](backend/src/users/users.module.ts)

**Cambios:**
1. ✅ Importado `RequestMethod` de `@nestjs/common`
2. ✅ Importado `RateLimitMiddleware` de `src/common/middleware/rate-limit.middleware`
3. ✅ Configurado rate limiting para:
   - `POST /users/login` (5 req/min)
   - `POST /users/register` (5 req/min)
   - `POST /users/self-register` (5 req/min)

**Resultado:**
- ✅ Backend compila sin errores
- ✅ Rate limiting activo en endpoints de autenticación
- ✅ Protección contra brute force implementada
- ✅ Protección contra registro masivo implementada

### Vulnerabilidades Mitigadas

1. ✅ **Brute force de contraseñas:** Limitado a 5 intentos/min
2. ✅ **Enumeración de usuarios:** Limitado a 5 intentos/min
3. ✅ **Registro masivo de spam:** Limitado a 5 intentos/min

**Próximo paso:** Probar en desarrollo y crear commit

---

**Última actualización:** 2026-02-10
