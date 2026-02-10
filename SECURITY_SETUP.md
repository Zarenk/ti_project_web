# 🔐 Guía de Configuración de Seguridad

## ⚠️ IMPORTANTE: Credenciales de Producción

**NUNCA** compartas tus archivos `.env` reales ni los subas a git. Este repositorio incluye `.env.example` como plantilla.

---

## 📋 Configuración Inicial

### 1. Clonar archivos de ejemplo

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp fronted/.env.example fronted/.env
```

### 2. Generar Credenciales Seguras

#### A) JWT_SECRET (CRÍTICO)

Genera un secret fuerte de 64 caracteres:

```bash
# Linux/Mac
openssl rand -base64 64

# Windows (PowerShell)
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))

# Node.js (cualquier OS)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

**Resultado ejemplo:**
```
rK8X9mP3vN2wQ7jL5hT6yU4nB1gF0sD8eA3cV7xZ2qW5oI9pM4kH6jR1tY3uE8nL
```

Copia este valor en ambos archivos:
- `backend/.env` → `JWT_SECRET='...'`
- `fronted/.env` → `JWT_SECRET='...'`

#### B) Contraseña de Base de Datos

Genera una contraseña fuerte:

```bash
# Linux/Mac/PowerShell
openssl rand -base64 32

# O usa un generador online: https://passwordsgenerator.net/
# Mínimo: 16 caracteres, mayúsculas, minúsculas, números y símbolos
```

**Ejemplo:** `Xk9#mP2$vL7@qW5!nR8*hT3^jY6&`

Actualiza en `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:Xk9#mP2$vL7@qW5!nR8*hT3^jY6&@localhost:5432/ecoterra?schema=public"
```

**NOTA:** Si la contraseña tiene caracteres especiales, debe estar URL-encoded en la DATABASE_URL.

#### C) Contraseña de Admin por Defecto

**IMPORTANTE:** Esta contraseña es temporal. Cámbiala inmediatamente después del primer login.

```bash
# Genera una contraseña temporal fuerte
openssl rand -base64 16
```

Actualiza en `backend/.env`:
```env
DEFAULT_ADMIN_PASSWORD=tu_password_temporal_aqui
```

#### D) SMTP Password (Gmail App Password)

Para Gmail:
1. Ve a tu cuenta Google → Seguridad
2. Activa "Verificación en 2 pasos"
3. Ve a "Contraseñas de aplicaciones"
4. Genera una contraseña para "Correo" → "Otro"
5. Copia el código de 16 caracteres

```env
SMTP_PASS=abcd efgh ijkl mnop
```

---

## 🌍 Configuración por Entorno

### Desarrollo Local

```env
# backend/.env
DATABASE_URL="postgresql://postgres:admin1234@localhost:5432/ecoterra_dev?schema=public"
PUBLIC_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000

# fronted/.env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_PUBLIC_URL=http://localhost:3000
```

### Producción (Railway / Heroku / AWS)

**NO uses archivos .env en producción.** En su lugar, configura variables de entorno en la plataforma:

#### Railway
```bash
railway variables set JWT_SECRET="tu_secret_aqui"
railway variables set DATABASE_URL="postgresql://..."
```

#### Heroku
```bash
heroku config:set JWT_SECRET="tu_secret_aqui"
heroku config:set DATABASE_URL="postgresql://..."
```

#### Vercel (Frontend)
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable `NEXT_PUBLIC_*`

#### Variables CRÍTICAS para Producción:
```env
# Backend
DATABASE_URL=postgresql://...  # URL de producción
JWT_SECRET=...                  # Diferente al de desarrollo
PUBLIC_URL=https://api.tu-dominio.com
CORS_ORIGIN=https://tu-dominio.com
SUNAT_USERNAME=...              # Credenciales reales de SUNAT
SUNAT_PASSWORD=...              # Diferente a desarrollo

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
NEXT_PUBLIC_PUBLIC_URL=https://tu-dominio.com
JWT_SECRET=...                  # MISMO que backend
```

---

## 🔑 Servicios Externos - Dónde Obtener Credenciales

### 1. Base de Datos PostgreSQL
- **Desarrollo:** Instalación local
- **Producción:**
  - [Supabase](https://supabase.com/) (Gratis)
  - [Railway](https://railway.app/) (Gratis con límites)
  - [Neon](https://neon.tech/) (Gratis)
  - [AWS RDS](https://aws.amazon.com/rds/)

### 2. SUNAT (Perú - Facturación Electrónica)
- **Registro:** https://www.sunat.gob.pe/
- **Documentación:** Portal SOL (Sistema de Operaciones en Línea)
- **Testing:** SUNAT tiene un ambiente de pruebas

### 3. reCAPTCHA (Google)
- **Crear cuenta:** https://www.google.com/recaptcha/admin
- **Tipo:** reCAPTCHA v2 Checkbox
- Obtendrás: Site Key (público) y Secret Key (privado)

### 4. MercadoPago (Pagos)
- **Registro:** https://www.mercadopago.com.pe/developers/
- **Panel:** Tus integraciones → Credenciales
- **Testing:** Usa credenciales de prueba primero

### 5. APIs Perú (Consulta DNI/RUC)
- **Registro:** https://apis.net.pe/
- Consulta de DNI, RUC y otros servicios

### 6. Google OAuth (Opcional)
- **Consola:** https://console.cloud.google.com/apis/credentials
- Crear proyecto → Credenciales → ID de cliente OAuth

---

## 🛡️ Mejores Prácticas de Seguridad

### ✅ DO (Hacer)

1. **Usa contraseñas únicas y fuertes** (16+ caracteres)
2. **Rota credenciales regularmente** (cada 90 días)
3. **Usa diferentes credenciales por entorno** (dev ≠ prod)
4. **Configura variables en la plataforma de hosting** (no en .env)
5. **Mantén actualizadas las dependencias** (`npm audit fix`)
6. **Usa HTTPS en producción** (SSL/TLS)
7. **Habilita autenticación 2FA** donde sea posible

### ❌ DON'T (No hacer)

1. **NO subas archivos .env a git** (verificar .gitignore)
2. **NO uses contraseñas simples** (admin, 123456, etc.)
3. **NO compartas credenciales por email/chat**
4. **NO uses las mismas credenciales en dev y prod**
5. **NO hardcodees credenciales en el código**
6. **NO uses HTTP en producción** (siempre HTTPS)

---

## 🔄 Cambiar Credenciales Comprometidas

Si tus credenciales fueron expuestas (commit accidental, screenshot, etc.):

### 1. Base de Datos
```sql
-- PostgreSQL: Cambiar contraseña
ALTER USER postgres WITH PASSWORD 'nueva_password_segura_aqui';
```

### 2. JWT_SECRET
1. Genera un nuevo secret (ver sección 2A)
2. Actualiza en backend y frontend
3. **IMPORTANTE:** Todos los tokens existentes quedarán inválidos
4. Los usuarios deberán volver a iniciar sesión

### 3. Credenciales de APIs Externas
- **SUNAT:** Contactar soporte
- **MercadoPago:** Regenerar en el panel de desarrollador
- **Google:** Regenerar en Google Cloud Console
- **reCAPTCHA:** Regenerar keys

### 4. Admin Password
```bash
# Conectarse a la base de datos y cambiar password
# O usar el endpoint de cambio de contraseña del sistema
```

---

## 📝 Checklist de Seguridad

### Antes de cada Deploy a Producción

- [ ] Todas las contraseñas son fuertes (16+ caracteres)
- [ ] JWT_SECRET es único y largo (64+ caracteres)
- [ ] Variables configuradas en la plataforma (no .env)
- [ ] HTTPS habilitado
- [ ] CORS configurado correctamente (solo dominios de producción)
- [ ] Dependencias actualizadas (`npm audit`)
- [ ] Console.log sensibles removidos
- [ ] Contraseña de admin cambiada
- [ ] Backup de base de datos configurado
- [ ] Monitoreo y alertas activos

---

## 🆘 En Caso de Emergencia

Si detectas un acceso no autorizado:

1. **Cambia TODAS las credenciales inmediatamente**
2. **Revisa logs de acceso** (base de datos, aplicación)
3. **Invalida tokens activos** (cambiar JWT_SECRET)
4. **Notifica a usuarios si hay exposición de datos**
5. **Haz backup de la base de datos actual**
6. **Analiza el vector de ataque** (¿cómo entraron?)

---

## 📞 Contacto

Para dudas sobre seguridad: [tu_email_aqui]

**Última actualización:** 2026-02-10
