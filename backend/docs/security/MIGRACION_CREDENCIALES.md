# 🔄 Guía de Migración de Credenciales (Sin Romper el Sistema)

Esta guía te ayudará a actualizar tus credenciales de forma segura sin interrumpir el funcionamiento.

---

## 📋 ORDEN DE MIGRACIÓN (IMPORTANTE)

Sigue este orden para evitar romper el sistema:

1. ✅ **Base de Datos** (cambiar última)
2. ✅ **JWT_SECRET**
3. ✅ **Admin Password**
4. ✅ **APIs Externas** (SUNAT, MercadoPago, etc.)
5. ✅ **SMTP**

---

## 🔐 PASO 1: Generar Nuevas Credenciales

```bash
# Ejecuta el generador
node scripts/generate-secrets.js

# Guarda el output en un lugar seguro (archivo temporal o gestor de contraseñas)
```

**IMPORTANTE:** No sobrescribas las credenciales actuales todavía.

---

## 🔑 PASO 2: JWT_SECRET (Sin romper sesiones activas)

### Opción A: Migración Gradual (RECOMENDADO - Sin cerrar sesiones)

El sistema necesita soporte para múltiples JWT secrets. Modifica el código:

#### Backend: Verificar con dos secrets

**Archivo:** `backend/src/auth/jwt.strategy.ts` o donde valides tokens

```typescript
// ANTES (un solo secret)
constructor(private readonly jwtService: JwtService) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
  });
}

// DESPUÉS (dos secrets temporalmente)
async validate(payload: any) {
  // Intenta con el secret nuevo primero
  try {
    return await this.jwtService.verify(payload, {
      secret: process.env.JWT_SECRET_NEW || process.env.JWT_SECRET,
    });
  } catch (error) {
    // Si falla, intenta con el secret antiguo
    return await this.jwtService.verify(payload, {
      secret: process.env.JWT_SECRET_OLD || process.env.JWT_SECRET,
    });
  }
}
```

#### Configuración temporal en .env

```bash
# backend/.env
JWT_SECRET='vef2aWGghdsRm6SJynLD6f5y/F5Ldy/5jpmv2Djprrtt/U09oPTD3jG8l2iDoJ0c13Zko/rg0D9zm1Wmx4Aveg=='  # NUEVO
JWT_SECRET_OLD='2kQ1oLQuQrsNNA5YfVjfo1sS9STiQMMf'  # ANTIGUO (temporal)
```

#### Pasos:

1. Agrega `JWT_SECRET` nuevo y `JWT_SECRET_OLD` (actual) en backend/.env
2. Despliega el backend con soporte para ambos secrets
3. Actualiza frontend/.env con el `JWT_SECRET` nuevo
4. Espera 7 días (tiempo de expiración de refresh tokens)
5. Elimina `JWT_SECRET_OLD`

### Opción B: Migración Inmediata (Cierra todas las sesiones)

**⚠️ ADVERTENCIA:** Todos los usuarios deberán volver a iniciar sesión.

```bash
# 1. Actualiza backend/.env
JWT_SECRET='vef2aWGghdsRm6SJynLD6f5y/F5Ldy/5jpmv2Djprrtt/U09oPTD3jG8l2iDoJ0c13Zko/rg0D9zm1Wmx4Aveg=='

# 2. Actualiza fronted/.env
JWT_SECRET='vef2aWGghdsRm6SJynLD6f5y/F5Ldy/5jpmv2Djprrtt/U09oPTD3jG8l2iDoJ0c13Zko/rg0D9zm1Wmx4Aveg=='

# 3. Reinicia ambos servidores
cd backend && npm run start:dev
cd fronted && npm run dev

# 4. Notifica a los usuarios que deben volver a iniciar sesión
```

---

## 🗄️ PASO 3: Contraseña de Base de Datos

### ⚠️ CRÍTICO: Hazlo en horario de bajo tráfico

```bash
# 1. Conecta a PostgreSQL
psql -U postgres -h localhost

# 2. Cambia la contraseña
ALTER USER postgres WITH PASSWORD 'sGd3c8W75U__XcUyKhQ65pqW1ld1WJ1d';

# 3. Sal de psql
\q
```

```bash
# 4. Actualiza backend/.env INMEDIATAMENTE (el sistema dejará de funcionar hasta que lo hagas)
DATABASE_URL="postgresql://postgres:sGd3c8W75U__XcUyKhQ65pqW1ld1WJ1d@localhost:5432/ecoterra?schema=public"

# 5. Reinicia el backend
cd backend
npm run start:dev
```

**Verificación:**
```bash
# Verifica que el backend se conectó correctamente
curl http://localhost:4000/api

# Deberías ver la respuesta normal de la API
```

---

## 👤 PASO 4: Contraseña de Admin

### Opción A: Cambiar desde la interfaz (RECOMENDADO)

1. Inicia sesión con las credenciales actuales
2. Ve a: Dashboard → Perfil → Cambiar Contraseña
3. Ingresa contraseña actual: `chuscasas1991`
4. Nueva contraseña: `oZaNizaxelBKAJWd` (temporal)
5. Guarda los cambios

### Opción B: Cambiar directamente en la base de datos

```bash
# 1. Genera el hash bcrypt de la nueva contraseña
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('oZaNizaxelBKAJWd', 10).then(hash => console.log(hash));"

# Salida ejemplo: $2b$10$abcd1234efgh5678ijkl9012mnop3456qrst7890uvwxyz...

# 2. Actualiza en la base de datos
psql -U postgres -d ecoterra

UPDATE "User"
SET password = '$2b$10$abcd1234efgh5678ijkl9012mnop3456qrst7890uvwxyz...'
WHERE email = 'jdzare@gmail.com';

\q
```

**IMPORTANTE:** Después del primer login con la nueva contraseña temporal, cámbiala por una personalizada.

---

## 🌐 PASO 5: Credenciales de APIs Externas

### A) SUNAT (Perú)

Las credenciales de SUNAT son proporcionadas por ellos. **No las cambies** a menos que:
- Hayas sido comprometido
- SUNAT te haya dado nuevas credenciales

Si necesitas cambiarlas:
```bash
# backend/.env
SUNAT_USERNAME=tu_nuevo_ruc_usuario
SUNAT_PASSWORD=tu_nueva_password_sunat
```

### B) MercadoPago

1. Ve a: https://www.mercadopago.com.pe/developers/
2. Panel → Credenciales → Regenerar
3. Copia las nuevas credenciales

```bash
# backend/.env
MERCADOPAGO_PUBLIC_KEY=nuevo_public_key
MERCADOPAGO_ACCESS_TOKEN=nuevo_access_token

# fronted/.env
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=nuevo_public_key
```

4. Reinicia ambos servidores

### C) reCAPTCHA

1. Ve a: https://www.google.com/recaptcha/admin
2. Regenera las keys
3. Actualiza:

```bash
# backend/.env
RECAPTCHA_SECRET_KEY=nueva_secret_key

# fronted/.env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=nueva_site_key
```

### D) APIs Perú

Si tu token fue comprometido:
1. Inicia sesión en https://apis.net.pe/
2. Regenera tu token de API
3. Actualiza en backend/.env:

```bash
APISPERU_TOKEN=nuevo_token_aqui
```

---

## 📧 PASO 6: SMTP (Gmail App Password)

1. Ve a tu cuenta Google → Seguridad
2. Contraseñas de aplicaciones
3. Revoca la contraseña anterior
4. Genera una nueva

```bash
# backend/.env
SMTP_PASS=abcd efgh ijkl mnop  # Nueva contraseña de app
```

5. Reinicia el backend
6. Prueba enviando un email de prueba:

```bash
cd backend
node test-smtp.js
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

Después de cada cambio, verifica que todo funciona:

### Backend
```bash
# 1. El servidor arranca sin errores
cd backend && npm run start:dev

# 2. Verifica conexión a la base de datos
curl http://localhost:4000/api

# 3. Verifica login
curl -X POST http://localhost:4000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jdzare@gmail.com","password":"nueva_password"}'
```

### Frontend
```bash
# 1. El servidor arranca sin errores
cd fronted && npm run dev

# 2. Abre el navegador
http://localhost:3000

# 3. Intenta iniciar sesión
```

### Tests Funcionales
- [ ] Login funciona correctamente
- [ ] Crear productos funciona
- [ ] Subir imágenes funciona
- [ ] Envío de emails funciona (SMTP)
- [ ] Pagos funcionan (MercadoPago)
- [ ] Facturación funciona (SUNAT)

---

## 🚨 PLAN DE ROLLBACK (Si algo sale mal)

Si después de cambiar credenciales algo deja de funcionar:

### 1. Identifica qué dejó de funcionar
```bash
# Revisa los logs del backend
cd backend
npm run start:dev

# Busca errores relacionados con:
# - "Authentication failed"
# - "Connection refused"
# - "Invalid credentials"
# - "ECONNREFUSED"
```

### 2. Rollback de la credencial problemática

**Base de datos:**
```bash
psql -U postgres
ALTER USER postgres WITH PASSWORD 'admin1234';  # Contraseña antigua
\q

# Actualiza backend/.env con la contraseña antigua
DATABASE_URL="postgresql://postgres:admin1234@localhost:5432/ecoterra?schema=public"
```

**JWT_SECRET:**
```bash
# backend/.env y fronted/.env
JWT_SECRET='2kQ1oLQuQrsNNA5YfVjfo1sS9STiQMMf'  # Secret antiguo
```

**APIs Externas:**
```bash
# Restaura los valores antiguos del backup de .env
```

### 3. Reinicia los servidores
```bash
cd backend && npm run start:dev
cd fronted && npm run dev
```

---

## 📝 BACKUP ANTES DE EMPEZAR

**MUY IMPORTANTE:** Antes de cambiar cualquier credencial:

```bash
# 1. Backup de archivos .env
cp backend/.env backend/.env.backup
cp fronted/.env fronted/.env.backup

# 2. Backup de base de datos
pg_dump -U postgres -d ecoterra > backup_ecoterra_$(date +%Y%m%d).sql

# 3. Verifica que los backups existen
ls -lh backend/.env.backup fronted/.env.backup backup_ecoterra_*.sql
```

---

## 🎯 RESUMEN EJECUTIVO

### Migración Segura (Sin downtime)

1. **Día 1:** Genera credenciales nuevas con `node scripts/generate-secrets.js`
2. **Día 1:** Implementa soporte para JWT_SECRET dual (antiguo + nuevo)
3. **Día 1:** Actualiza JWT_SECRET en backend y frontend
4. **Día 2:** Cambia contraseña de admin (interfaz o base de datos)
5. **Día 3:** Regenera tokens de APIs externas (MercadoPago, reCAPTCHA, etc.)
6. **Día 3:** Actualiza SMTP password
7. **Día 8:** Cambia contraseña de base de datos (en horario de bajo tráfico)
8. **Día 15:** Elimina JWT_SECRET_OLD del código

### Migración Rápida (Con downtime de 5-10 minutos)

1. Genera credenciales nuevas
2. Haz backup de .env y base de datos
3. Cambia todas las credenciales a la vez
4. Reinicia backend y frontend
5. Notifica a usuarios que deben volver a iniciar sesión
6. Verifica que todo funciona

---

## 📞 Ayuda

Si algo sale mal o tienes dudas:

1. Revisa los logs: `cd backend && npm run start:dev`
2. Verifica los archivos .env (no deben tener espacios extra)
3. Usa los backups para restaurar
4. Consulta `SECURITY_SETUP.md` para más detalles

---

**Última actualización:** 2026-02-10
