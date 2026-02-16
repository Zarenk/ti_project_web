# 🌐 Configuración para Producción

**Fecha:** 2026-02-10
**Estado:** Guía para deployment

---

## ⚠️ IMPORTANTE: IPs Hardcodeadas

Las IPs `192.168.1.41` en los archivos `.env` son **solo para desarrollo local** y **NO funcionarán en producción**.

---

## 📋 VARIABLES QUE DEBES CAMBIAR PARA PRODUCCIÓN

### Backend (.env)

**Ubicación:** `backend/.env`

```bash
# ❌ DESARROLLO (NO usar en producción)
PUBLIC_URL=192.168.1.41
CORS_ORIGIN=http://localhost:3000,http://192.168.1.41:3000

# ✅ PRODUCCIÓN (Cambiar a tu dominio real)
PUBLIC_URL=https://api.tu-dominio.com
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com
```

### Frontend (.env)

**Ubicación:** `fronted/.env`

```bash
# ❌ DESARROLLO (NO usar en producción)
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.41:4000
NEXT_PUBLIC_IMAGE_HOSTS=http://192.168.1.41:4000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.41:4000
PUBLIC_URL=http://192.168.1.41:4000
BACKEND_URL=http://192.168.1.41:4000

# ✅ PRODUCCIÓN (Cambiar a tu dominio real)
NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
NEXT_PUBLIC_IMAGE_HOSTS=https://api.tu-dominio.com
NEXT_PUBLIC_SOCKET_URL=https://api.tu-dominio.com
PUBLIC_URL=https://tu-dominio.com
BACKEND_URL=https://api.tu-dominio.com
```

---

## 🚀 CONFIGURACIÓN POR PLATAFORMA

### Railway

**NO uses archivos .env en Railway.** Configura las variables en el dashboard:

1. Ve a tu proyecto en Railway
2. Selecciona tu servicio (backend o frontend)
3. Ve a la pestaña **Variables**
4. Agrega cada variable:

**Backend:**
```bash
PUBLIC_URL=https://tu-proyecto-backend.railway.app
CORS_ORIGIN=https://tu-proyecto-frontend.railway.app
DATABASE_URL=postgresql://... # Railway lo provee automáticamente
JWT_SECRET=tu_jwt_secret_seguro
# ... todas las demás variables
```

**Frontend:**
```bash
NEXT_PUBLIC_BACKEND_URL=https://tu-proyecto-backend.railway.app
NEXT_PUBLIC_IMAGE_HOSTS=https://tu-proyecto-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://tu-proyecto-backend.railway.app
PUBLIC_URL=https://tu-proyecto-frontend.railway.app
BACKEND_URL=https://tu-proyecto-backend.railway.app
JWT_SECRET=mismo_que_backend
```

**Comandos CLI:**
```bash
railway variables set PUBLIC_URL="https://api.tu-dominio.com"
railway variables set CORS_ORIGIN="https://tu-dominio.com"
```

---

### Vercel (Frontend)

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega cada variable `NEXT_PUBLIC_*`:

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
NEXT_PUBLIC_IMAGE_HOSTS=https://api.tu-dominio.com
NEXT_PUBLIC_SOCKET_URL=https://api.tu-dominio.com
NEXT_PUBLIC_PUBLIC_URL=https://tu-dominio.com
JWT_SECRET=mismo_que_backend
```

**Nota:** Variables `NEXT_PUBLIC_*` se incluyen en el bundle del cliente, por eso es seguro usarlas.

---

### Heroku

**Backend:**
```bash
heroku config:set PUBLIC_URL="https://tu-app.herokuapp.com" -a tu-app-backend
heroku config:set CORS_ORIGIN="https://tu-app-frontend.herokuapp.com" -a tu-app-backend
heroku config:set JWT_SECRET="tu_secret_aqui" -a tu-app-backend
```

**Frontend:**
```bash
heroku config:set NEXT_PUBLIC_BACKEND_URL="https://tu-app-backend.herokuapp.com" -a tu-app-frontend
heroku config:set NEXT_PUBLIC_IMAGE_HOSTS="https://tu-app-backend.herokuapp.com" -a tu-app-frontend
```

---

### Docker / VPS

Si despliegas con Docker en tu propio servidor:

**Archivo `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - PUBLIC_URL=https://api.tu-dominio.com
      - CORS_ORIGIN=https://tu-dominio.com
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "4000:4000"

  frontend:
    build: ./fronted
    environment:
      - NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
      - NEXT_PUBLIC_IMAGE_HOSTS=https://api.tu-dominio.com
      - NEXT_PUBLIC_SOCKET_URL=https://api.tu-dominio.com
      - PUBLIC_URL=https://tu-dominio.com
    ports:
      - "3000:3000"
```

**Archivo `.env.production` (local):**
```bash
# Este archivo NO se versiona en git
DATABASE_URL=postgresql://...
JWT_SECRET=...
# ... otras variables sensibles
```

**Deploy:**
```bash
docker-compose --env-file .env.production up -d
```

---

## 🔍 VERIFICACIÓN PRE-PRODUCCIÓN

Antes de hacer deploy, verifica:

### Checklist Backend

- [ ] `PUBLIC_URL` apunta a tu dominio de producción
- [ ] `CORS_ORIGIN` incluye SOLO dominios de producción (no localhost)
- [ ] `DATABASE_URL` apunta a base de datos de producción
- [ ] `JWT_SECRET` es diferente al de desarrollo
- [ ] Todas las credenciales (SUNAT, SMTP, etc.) son de producción
- [ ] Variables sensibles NO están en archivos .env versionados

### Checklist Frontend

- [ ] `NEXT_PUBLIC_BACKEND_URL` apunta al backend de producción
- [ ] `NEXT_PUBLIC_IMAGE_HOSTS` apunta al backend de producción
- [ ] `NEXT_PUBLIC_SOCKET_URL` apunta al backend de producción
- [ ] `PUBLIC_URL` apunta al dominio del frontend
- [ ] `JWT_SECRET` es el MISMO que en backend
- [ ] No hay referencias a `localhost` o `192.168.x.x`

---

## 🌍 EJEMPLO: Configuración Completa

### Desarrollo Local

**Backend (.env):**
```bash
DATABASE_URL=postgresql://postgres:admin1234@localhost:5432/ecoterra_dev
JWT_SECRET=dev_secret_not_for_production
PUBLIC_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000,http://192.168.1.41:3000
```

**Frontend (.env):**
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_IMAGE_HOSTS=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
PUBLIC_URL=http://localhost:3000
JWT_SECRET=dev_secret_not_for_production
```

### Producción (Railway)

**Backend (Variables en Railway):**
```bash
DATABASE_URL=postgresql://user:pass@host.railway.internal:5432/railway
JWT_SECRET=N6g7q3jhrUSjRevG0PwpvWuga1dTLw9XhN5C+JD6mXPF9WVjVZgk1WSDTrJWnnuk...
PUBLIC_URL=https://ecoterra-backend.railway.app
CORS_ORIGIN=https://ecoterra.com,https://www.ecoterra.com
SUNAT_USERNAME=20519857538JDZARENK
SUNAT_PASSWORD=tu_password_real_de_produccion
```

**Frontend (Variables en Vercel):**
```bash
NEXT_PUBLIC_BACKEND_URL=https://ecoterra-backend.railway.app
NEXT_PUBLIC_IMAGE_HOSTS=https://ecoterra-backend.railway.app
NEXT_PUBLIC_SOCKET_URL=https://ecoterra-backend.railway.app
PUBLIC_URL=https://ecoterra.com
JWT_SECRET=N6g7q3jhrUSjRevG0PwpvWuga1dTLw9XhN5C+JD6mXPF9WVjVZgk1WSDTrJWnnuk...
```

---

## 🔐 DOMINIO PERSONALIZADO

### 1. Configurar DNS

Apunta tu dominio a los servidores:

**Backend (api.tu-dominio.com):**
```
Tipo: A o CNAME
Nombre: api
Valor: [IP de tu servidor o CNAME de Railway/Heroku]
```

**Frontend (tu-dominio.com y www.tu-dominio.com):**
```
Tipo: A o CNAME
Nombre: @
Valor: [IP de tu servidor o CNAME de Vercel]

Tipo: CNAME
Nombre: www
Valor: tu-dominio.com
```

### 2. Configurar SSL/TLS

**Railway / Vercel / Heroku:**
- SSL se configura automáticamente ✅
- Usan Let's Encrypt

**VPS / Docker:**
```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com -d api.tu-dominio.com
```

### 3. Actualizar Variables

Después de configurar el dominio, actualiza TODAS las variables con tu dominio real:

```bash
# Backend
PUBLIC_URL=https://api.tu-dominio.com
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com

# Frontend
NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
PUBLIC_URL=https://tu-dominio.com
```

---

## 🧪 TESTING EN PRODUCCIÓN

Después del deploy, verifica:

### 1. Backend

```bash
# Health check
curl https://api.tu-dominio.com/api

# Login
curl -X POST https://api.tu-dominio.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### 2. Frontend

1. Abre https://tu-dominio.com
2. Verifica que no hay errores en la consola del navegador
3. Intenta hacer login
4. Verifica que se conecta al backend correcto:
   - Abre DevTools → Network
   - Haz una acción (login, crear producto, etc.)
   - Verifica que los requests van a `https://api.tu-dominio.com`

---

## 🆘 TROUBLESHOOTING

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Problema:** CORS_ORIGIN no incluye el dominio del frontend

**Solución:**
```bash
# Backend: Agregar dominio del frontend
CORS_ORIGIN=https://tu-dominio-frontend.com,https://www.tu-dominio-frontend.com
```

### Error: "Failed to fetch" o "Network Error"

**Problema:** NEXT_PUBLIC_BACKEND_URL apunta a URL incorrecta

**Solución:**
```bash
# Frontend: Verificar URL del backend
NEXT_PUBLIC_BACKEND_URL=https://tu-backend-real.com

# NO usar:
# NEXT_PUBLIC_BACKEND_URL=http://localhost:4000  ❌
# NEXT_PUBLIC_BACKEND_URL=http://192.168.1.41:4000  ❌
```

### Error: WebSocket connection failed

**Problema:** NEXT_PUBLIC_SOCKET_URL apunta a URL incorrecta

**Solución:**
```bash
# Frontend: Usar el mismo host que BACKEND_URL
NEXT_PUBLIC_SOCKET_URL=https://api.tu-dominio.com
```

### Error: "Mixed Content" (HTTP en sitio HTTPS)

**Problema:** Algunas URLs usan HTTP en vez de HTTPS

**Solución:** Todas las URLs deben usar HTTPS en producción:
```bash
# ❌ Incorrecto
NEXT_PUBLIC_BACKEND_URL=http://api.tu-dominio.com

# ✅ Correcto
NEXT_PUBLIC_BACKEND_URL=https://api.tu-dominio.com
```

---

## 📝 RESUMEN

**Para producción, NUNCA uses:**
- ❌ `localhost`
- ❌ `127.0.0.1`
- ❌ `192.168.x.x` (IPs privadas)
- ❌ `http://` (sin SSL)

**Siempre usa:**
- ✅ Tu dominio real (`tu-dominio.com`)
- ✅ URLs de la plataforma (`app.railway.app`, `vercel.app`)
- ✅ `https://` (con SSL)
- ✅ Variables de entorno de la plataforma (NO archivos .env)

---

**Última actualización:** 2026-02-10
