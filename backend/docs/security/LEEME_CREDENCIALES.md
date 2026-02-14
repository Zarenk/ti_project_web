# 🔐 SOLUCIÓN: Credenciales Seguras - Resumen Rápido

## ✅ Archivos Creados

He creado estos archivos para ayudarte a corregir el problema de credenciales:

1. **`backend/.env.example`** - Plantilla de variables de entorno (backend)
2. **`fronted/.env.example`** - Plantilla de variables de entorno (frontend)
3. **`SECURITY_SETUP.md`** - Guía completa de configuración de seguridad
4. **`MIGRACION_CREDENCIALES.md`** - Cómo cambiar credenciales sin romper el sistema
5. **`scripts/generate-secrets.js`** - Script para generar credenciales seguras
6. **Este archivo** - Resumen rápido

---

## 🚀 INICIO RÁPIDO (5 minutos)

### Opción 1: Generar Credenciales Automáticamente (RECOMENDADO)

```bash
# 1. Genera credenciales nuevas
node scripts/generate-secrets.js

# 2. Copia el output y actualiza tus archivos .env manualmente
# - backend/.env
# - fronted/.env

# 3. Reinicia los servidores
cd backend && npm run start:dev
cd fronted && npm run dev
```

### Opción 2: Generar Manualmente

```bash
# Genera un JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Genera una contraseña de DB
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"

# Actualiza backend/.env y fronted/.env con estos valores
```

---

## 📋 QUÉ CAMBIAR (Prioridad)

### 🔴 CRÍTICO (Cambiar YA):

```bash
# backend/.env
JWT_SECRET='...'           # Línea 8 - Cambiar por uno generado
DATABASE_URL='...'         # Línea 7 - Cambiar la contraseña 'admin1234'
DEFAULT_ADMIN_PASSWORD='...' # Línea 29 - Cambiar 'chuscasas1991'

# fronted/.env
JWT_SECRET='...'           # Línea 8 - DEBE SER EL MISMO que backend
```

### 🟡 IMPORTANTE (Cambiar hoy):

```bash
# backend/.env
SUNAT_PASSWORD='...'       # Línea 14 - Cambiar 'Chuscasas1'
SMTP_PASS='...'            # Línea 24 - Regenerar App Password de Gmail
```

### 🟢 MODERADO (Cambiar esta semana):

```bash
# backend/.env
MERCADOPAGO_ACCESS_TOKEN='...'  # Línea 41 - Regenerar en MercadoPago
RECAPTCHA_SECRET_KEY='...'      # Línea 39 - Regenerar en Google
```

---

## ⚠️ IMPORTANTE: El Problema NO es Git

✅ **Buenas noticias:** Tus archivos `.env` ya están correctamente en `.gitignore` y NO están versionados en git.

❌ **El problema:** Las credenciales actuales son **débiles** y están en **texto plano**.

### Qué NO hacer:
- ❌ NO necesitas mover los .env a otra ubicación
- ❌ NO necesitas eliminar los .env
- ❌ NO necesitas cambiar el .gitignore

### Qué SÍ hacer:
- ✅ **Generar credenciales FUERTES** (64+ caracteres para JWT)
- ✅ **Reemplazar las credenciales débiles** actuales
- ✅ **Para producción:** Usar variables de entorno del servidor (Railway, Heroku, etc.)

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### HOY (30 minutos):

1. **Genera credenciales nuevas:**
   ```bash
   node scripts/generate-secrets.js
   ```

2. **Haz backup de tus .env actuales:**
   ```bash
   cp backend/.env backend/.env.backup
   cp fronted/.env fronted/.env.backup
   ```

3. **Actualiza las credenciales críticas:**
   - JWT_SECRET (backend y frontend - debe ser el mismo)
   - DATABASE_URL (cambia la contraseña de 'admin1234')
   - DEFAULT_ADMIN_PASSWORD (cambia 'chuscasas1991')

4. **Reinicia y prueba:**
   ```bash
   # Backend
   cd backend
   npm run start:dev

   # Frontend (en otra terminal)
   cd fronted
   npm run dev
   ```

5. **Verifica que todo funciona:**
   - Abre http://localhost:3000
   - Inicia sesión
   - Prueba crear un producto
   - Si todo funciona, ¡listo! ✅

### ESTA SEMANA:

6. **Actualiza las APIs externas:**
   - Regenera token de MercadoPago
   - Regenera keys de reCAPTCHA
   - Regenera SMTP App Password de Gmail

7. **Lee la documentación:**
   - `SECURITY_SETUP.md` - Configuración completa
   - `MIGRACION_CREDENCIALES.md` - Guía detallada

### ANTES DE PRODUCCIÓN:

8. **Configura variables en tu plataforma de hosting:**
   - Railway: `railway variables set JWT_SECRET="..."`
   - Heroku: `heroku config:set JWT_SECRET="..."`
   - Vercel: Settings → Environment Variables

9. **Cambia TODAS las contraseñas de producción:**
   - Usa credenciales diferentes a desarrollo
   - NUNCA uses las mismas credenciales en dev y prod

---

## 🆘 Si Algo Sale Mal

### El backend no arranca:

```bash
# 1. Revisa los logs
cd backend && npm run start:dev

# 2. Busca errores como:
# - "Authentication failed" → Revisa DATABASE_URL
# - "Invalid JWT" → Revisa que JWT_SECRET sea el mismo en backend y frontend
# - "Cannot connect" → Revisa que PostgreSQL esté corriendo

# 3. Si nada funciona, restaura el backup:
cp backend/.env.backup backend/.env
cp fronted/.env.backup fronted/.env
```

### No puedo iniciar sesión:

```bash
# Si cambiaste JWT_SECRET, todos los tokens antiguos son inválidos
# Solución: Borra las cookies del navegador o usa modo incógnito
```

### Base de datos no conecta:

```bash
# 1. Verifica que PostgreSQL está corriendo
psql -U postgres -h localhost

# 2. Si cambiastela contraseña de la DB, asegúrate de:
#    a) Haberla cambiado EN PostgreSQL primero
#    b) Actualizar el DATABASE_URL INMEDIATAMENTE después
```

---

## 📚 Documentación Completa

- **`SECURITY_SETUP.md`** - Guía completa de seguridad (15 min lectura)
- **`MIGRACION_CREDENCIALES.md`** - Migración paso a paso (10 min lectura)
- **`backend/.env.example`** - Plantilla de variables (backend)
- **`fronted/.env.example`** - Plantilla de variables (frontend)

---

## 🎓 Conceptos Clave

### ¿Por qué JWT_SECRET debe ser largo?

- **Corto (32 chars):** ❌ Vulnerable a ataques de fuerza bruta
- **Largo (64+ chars):** ✅ Prácticamente imposible de crackear

### ¿Por qué el mismo JWT_SECRET en backend y frontend?

- El backend **firma** los tokens con el secret
- El frontend necesita el **mismo secret** para validar localmente
- Si son diferentes, los tokens serán inválidos

### ¿Por qué NO usar archivos .env en producción?

- Los .env son para desarrollo local
- En producción, usa variables de entorno de la plataforma:
  - Railway → `railway variables`
  - Heroku → `heroku config`
  - Vercel → Dashboard > Environment Variables
  - AWS → Parameter Store o Secrets Manager

---

## ✅ CHECKLIST FINAL

Antes de dar por terminado:

- [ ] He generado credenciales nuevas con el script
- [ ] He actualizado JWT_SECRET en backend/.env
- [ ] He actualizado JWT_SECRET en fronted/.env (mismo valor que backend)
- [ ] He cambiado la contraseña de la base de datos
- [ ] He actualizado DATABASE_URL con la nueva contraseña
- [ ] He cambiado DEFAULT_ADMIN_PASSWORD
- [ ] Backend arranca sin errores
- [ ] Frontend arranca sin errores
- [ ] Puedo iniciar sesión correctamente
- [ ] Puedo crear/editar productos
- [ ] He guardado las credenciales en un lugar seguro

---

## 🎉 ¡Listo!

Una vez completado el checklist, habrás resuelto el **Problema #1: Credenciales Sensibles Expuestas**.

**Próximo paso:** Revisar el Problema #2 (Vulnerabilidades en Dependencias)

---

**¿Dudas?** Consulta los archivos de documentación o pregunta.
