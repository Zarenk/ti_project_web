# 🔐 GUÍA DE ROTACIÓN DE CREDENCIALES Y SECRETOS

**Fecha de creación:** 2026-02-15
**Severidad:** CRÍTICA
**Estado:** ACCIÓN INMEDIATA REQUERIDA

---

## 🚨 SITUACIÓN ACTUAL

**ALERTA:** Credenciales activas han sido comprometidas al estar expuestas en archivos `.env` commiteados al repositorio.

### Secretos Comprometidos Identificados:

1. **JWT_SECRET** - Token de autenticación
2. **DATABASE_URL** - Credenciales de PostgreSQL
3. **SUNAT_CLIENT_ID** y **SUNAT_CLIENT_SECRET** - Facturación electrónica SUNAT
4. **SUNAT_USERNAME** y **SUNAT_PASSWORD**
5. **SMTP_USER** y **SMTP_PASS** - Correo electrónico
6. **APISPERU_TOKEN** - Consultas DNI/RUC
7. **RECAPTCHA_SECRET_KEY** - Validación reCAPTCHA
8. **MERCADOPAGO_PUBLIC_KEY** y **MERCADOPAGO_ACCESS_TOKEN** - Pagos
9. **GOOGLE_CLIENT_SECRET** - OAuth de Google
10. **DEFAULT_ADMIN_PASSWORD** - Contraseña de administrador

---

## ⏱️ TIMELINE DE ROTACIÓN (URGENTE)

### FASE 1: INMEDIATA (Próximas 2 horas)

#### 1.1. Revocar Accesos Críticos

**PostgreSQL Database:**
```bash
# Conectar a PostgreSQL como superuser
psql -U postgres -h localhost

# Cambiar contraseña del usuario de la aplicación
ALTER USER postgres WITH PASSWORD 'NUEVA_CONTRASEÑA_SEGURA_AQUI';

# Verificar cambio
\du

# Actualizar .env con nueva contraseña
# DATABASE_URL="postgresql://postgres:NUEVA_CONTRASEÑA@localhost:5432/ecoterra?schema=public"
```

**JWT Secret:**
```bash
# Generar nuevo JWT secret (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# O usando OpenSSL
openssl rand -base64 64

# Actualizar en .env:
# JWT_SECRET='NUEVO_SECRET_AQUI'
```

**Admin Password:**
```bash
# Backend: src/users/users.service.ts
# Cambiar DEFAULT_ADMIN_PASSWORD en .env

# Generar contraseña fuerte:
openssl rand -base64 32

# IMPORTANTE: El admin debe cambiar su contraseña en primer login
```

#### 1.2. Servicios Terceros - SUNAT

**Portal SUNAT:**
1. Ingresar a [https://www.sunat.gob.pe](https://www.sunat.gob.pe)
2. Ir a **SUNAT Operaciones en Línea > Facturación Electrónica**
3. Sección **Gestión de Credenciales**
4. Seleccionar **Regenerar Client Secret**
5. Copiar nuevas credenciales
6. Actualizar en `.env`:
   ```
   SUNAT_CLIENT_ID=nuevo-client-id-aqui
   SUNAT_CLIENT_SECRET=nuevo-client-secret-aqui
   SUNAT_USERNAME=tu-usuario-sunat
   SUNAT_PASSWORD=nueva-contraseña-sunat
   ```

#### 1.3. MercadoPago

**Portal MercadoPago:**
1. Ingresar a [https://www.mercadopago.com.pe/developers](https://www.mercadopago.com.pe/developers)
2. Ir a **Tus aplicaciones**
3. Seleccionar la aplicación **TI Projecto Web**
4. En **Credenciales**, click en **Regenerar credenciales**
5. Confirmar regeneración
6. Copiar nuevas credenciales:
   ```
   MERCADOPAGO_PUBLIC_KEY=nuevo-public-key
   MERCADOPAGO_ACCESS_TOKEN=nuevo-access-token
   ```

**⚠️ ADVERTENCIA:** Esto invalidará todos los pagos en proceso. Coordinar con equipo de operaciones.

#### 1.4. Google OAuth

**Google Cloud Console:**
1. Ir a [https://console.cloud.google.com](https://console.cloud.google.com)
2. Seleccionar proyecto **TI Projecto Web**
3. **APIs & Services > Credentials**
4. Encontrar OAuth 2.0 Client ID
5. Click en **⋮** > **Delete**
6. Crear nuevo OAuth Client:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (dev)
     - `https://tu-dominio.com/api/auth/callback/google` (prod)
7. Copiar nuevo Client ID y Client Secret
8. Actualizar `.env`:
   ```
   GOOGLE_CLIENT_ID=nuevo-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=nuevo-client-secret
   ```

#### 1.5. SMTP (Gmail)

**Cuenta de Gmail:**
1. Ir a [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. **Contraseñas de aplicaciones**
3. **Revocar** contraseña existente `tecnologiatitacna@gmail.com`
4. Generar nueva contraseña de aplicación
5. Actualizar `.env`:
   ```
   SMTP_USER=tecnologiatitacna@gmail.com
   SMTP_PASS=nueva-contraseña-aplicacion
   ```

#### 1.6. APIs Peru (Consultas DNI/RUC)

**Portal APIs Peru:**
1. Ingresar a [https://apisperu.com](https://apisperu.com)
2. Login con cuenta `jdzare@gmail.com`
3. Ir a **Mi cuenta > API Tokens**
4. **Revocar token actual**
5. Generar nuevo token
6. Actualizar `.env`:
   ```
   APISPERU_TOKEN=nuevo-token-jwt-aqui
   ```

#### 1.7. reCAPTCHA

**Google reCAPTCHA Admin:**
1. Ir a [https://www.google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)
2. Seleccionar sitio **TI Projecto Web**
3. Click en **⚙️ Settings**
4. **Delete this site** (regenerar completamente)
5. Crear nuevo sitio:
   - reCAPTCHA type: **v2 Checkbox**
   - Domains: `localhost`, `tu-dominio.com`
6. Copiar nuevo Site Key y Secret Key
7. Actualizar `.env`:
   ```
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=nuevo-site-key
   RECAPTCHA_SECRET_KEY=nuevo-secret-key
   ```

---

### FASE 2: Limpieza de Repositorio (4-6 horas)

#### 2.1. Instalar BFG Repo-Cleaner

```bash
# Descargar BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# O usar Homebrew (Mac)
brew install bfg

# O Chocolatey (Windows)
choco install bfg-repo-cleaner
```

#### 2.2. Crear Backup del Repositorio

```bash
# Crear backup completo
cd "c:\Users\Usuario\Documents\Proyectos PROGRAMACION"
cp -r TI_projecto_web TI_projecto_web_backup_$(date +%Y%m%d)

# Verificar tamaño
du -sh TI_projecto_web_backup_*
```

#### 2.3. Limpiar Archivos .env del Historial

```bash
cd TI_projecto_web

# Opción 1: Usando BFG (Recomendado)
java -jar bfg-1.14.0.jar --delete-files .env
java -jar bfg-1.14.0.jar --delete-files .env.backup

# Opción 2: Usando git filter-branch (Manual)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/.env' \
  --prune-empty --tag-name-filter cat -- --all

git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch fronted/.env' \
  --prune-empty --tag-name-filter cat -- --all

# Limpiar referencias
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verificar que .env ya no está en historial
git log --all --full-history -- "*/.env"
# (No debería retornar nada)
```

#### 2.4. Force Push (CUIDADO - Solo después de coordinar con el equipo)

```bash
# Verificar remote
git remote -v

# Force push a todas las ramas
git push origin --force --all
git push origin --force --tags

# Notificar a todos los desarrolladores que deben re-clonar el repositorio
```

#### 2.5. Notificar al Equipo

**Mensaje de Slack/Email:**
```
🚨 ALERTA DE SEGURIDAD - ACCIÓN REQUERIDA

Se ha detectado que credenciales sensibles fueron comprometidas en el repositorio.
Se ha limpiado el historial de git.

ACCIÓN REQUERIDA INMEDIATA:
1. Borrar tu copia local del repositorio
2. Re-clonar desde origin: git clone <url>
3. Configurar nuevas variables de entorno (contactar a DevOps)
4. NO usar git pull - el historial ha sido reescrito

Fecha límite: [HOY + 2 horas]
Contacto: [Tu nombre/email]
```

---

### FASE 3: Implementar Prevención (1-2 días)

#### 3.1. Activar Pre-commit Hook

```bash
# El hook ya fue creado en .git/hooks/pre-commit
# Hacerlo ejecutable
chmod +x .git/hooks/pre-commit

# Probar el hook
git add .
git commit -m "test" # Debería escanear secretos
```

#### 3.2. Configurar git-secrets (Opcional pero recomendado)

```bash
# Instalar git-secrets
brew install git-secrets  # Mac
# O descargar desde https://github.com/awslabs/git-secrets

# Configurar en el repositorio
cd TI_projecto_web
git secrets --install

# Agregar patrones
git secrets --register-aws
git secrets --add 'password\s*=\s*["\'][^"\']+["\']'
git secrets --add 'JWT_SECRET'
git secrets --add 'DATABASE_URL'
git secrets --add 'SUNAT.*SECRET'
git secrets --add 'MERCADOPAGO.*TOKEN'

# Verificar
git secrets --list
```

#### 3.3. Implementar Gestión de Secretos

**Opción A: Railway Secrets (Ya en uso)**
```bash
# Configurar secretos en Railway CLI
railway login
railway link
railway variables set JWT_SECRET="nuevo-secret"
railway variables set DATABASE_URL="nueva-url"
# ... repetir para todos los secretos
```

**Opción B: AWS Secrets Manager (Producción)**
```bash
# Instalar AWS CLI
brew install awscli

# Configurar
aws configure

# Crear secretos
aws secretsmanager create-secret \
    --name TI-Projecto-JWT \
    --secret-string "nuevo-jwt-secret"

# En el código, cargar desde Secrets Manager
# Ver: backend/src/config/secrets.service.ts (crear este archivo)
```

**Opción C: HashiCorp Vault (Empresarial)**
```bash
# Instalar Vault
brew install vault

# Iniciar servidor (desarrollo)
vault server -dev

# Almacenar secretos
vault kv put secret/ti-projecto jwt_secret="nuevo-secret"
```

#### 3.4. Actualizar Documentación

Crear `docs/ENVIRONMENT_VARIABLES.md`:
```markdown
# Variables de Entorno

## Backend

| Variable | Descripción | Ejemplo | Requerida |
|----------|-------------|---------|-----------|
| JWT_SECRET | Secret para JWT | (ver Secrets Manager) | Sí |
| DATABASE_URL | PostgreSQL connection | postgresql://... | Sí |
| ... | ... | ... | ... |

## Frontend

| Variable | Descripción | Ejemplo | Requerida |
|----------|-------------|---------|-----------|
| NEXT_PUBLIC_BACKEND_URL | URL del backend | http://localhost:4000 | Sí |
| ... | ... | ... | ... |

## ⚠️ NUNCA commitear valores reales de secretos
```

---

### FASE 4: Monitoreo Post-Rotación (Continuo)

#### 4.1. Verificar Servicios

**Checklist de verificación:**

- [ ] **Backend inicia correctamente** con nuevas credenciales
- [ ] **Login de usuarios funciona** (JWT nuevo)
- [ ] **Base de datos accesible** (nueva contraseña)
- [ ] **Envío de correos funciona** (SMTP nuevo)
- [ ] **Facturación SUNAT funciona** (credenciales nuevas)
- [ ] **Pagos MercadoPago funcionan** (tokens nuevos)
- [ ] **OAuth Google funciona** (client secret nuevo)
- [ ] **APIs Peru responde** (token nuevo)
- [ ] **reCAPTCHA valida** (secret key nuevo)

#### 4.2. Monitorear Logs

```bash
# Backend - verificar errores de autenticación
cd backend && npm run start:dev | grep -i "error\|failed\|unauthorized"

# Frontend - verificar errores de API
cd fronted && npm run dev | grep -i "error\|failed"
```

#### 4.3. Scan de Vulnerabilidades

```bash
# Escanear dependencias
cd backend && npm audit
cd fronted && npm audit

# Escanear con Snyk (si está configurado)
snyk test

# Verificar que no haya secretos en código
cd "c:\Users\Usuario\Documents\Proyectos PROGRAMACION\TI_projecto_web"
git secrets --scan-history
```

---

## 📋 CHECKLIST DE ROTACIÓN COMPLETA

### Inmediato (2 horas)
- [ ] PostgreSQL password cambiada
- [ ] JWT_SECRET regenerado
- [ ] Admin password cambiado
- [ ] SUNAT credentials regeneradas
- [ ] MercadoPago tokens regenerados
- [ ] Google OAuth regenerado
- [ ] SMTP password regenerada
- [ ] APIs Peru token regenerado
- [ ] reCAPTCHA keys regeneradas
- [ ] Todos los `.env` actualizados localmente
- [ ] Railway variables actualizadas
- [ ] Servicios verificados funcionando

### Limpieza (6 horas)
- [ ] Backup del repositorio creado
- [ ] BFG ejecutado y .env removidos del historial
- [ ] Force push completado
- [ ] Equipo notificado de re-clonar
- [ ] Todos los desarrolladores re-clonaron

### Prevención (2 días)
- [ ] Pre-commit hook instalado y probado
- [ ] git-secrets configurado
- [ ] Secrets Manager implementado (Railway/AWS)
- [ ] Documentación actualizada
- [ ] Proceso de rotación documentado
- [ ] Alertas configuradas para secretos expuestos

### Monitoreo (Continuo)
- [ ] Logs monitoreados por 48 horas
- [ ] Tests E2E ejecutados exitosamente
- [ ] Performance normal verificado
- [ ] Incidentes de seguridad: 0
- [ ] Scan de vulnerabilidades: PASS

---

## 🆘 EN CASO DE EMERGENCIA

**Si detectas un breach activo:**

1. **INMEDIATAMENTE:**
   - Desconectar aplicación de internet (railway scale down)
   - Revocar TODOS los tokens y secrets
   - Contactar a leads de seguridad

2. **Investigar:**
   - Revisar logs de acceso: `railway logs`
   - Verificar transacciones sospechosas en BD
   - Auditar cambios recientes en git

3. **Notificar:**
   - Informar a stakeholders (clientes, SUNAT si es necesario)
   - Documentar el incidente
   - Preparar informe post-mortem

---

## 📞 CONTACTOS DE EMERGENCIA

| Servicio | Contacto | Acción |
|----------|----------|--------|
| SUNAT | [Soporte SUNAT](https://www.sunat.gob.pe) | Reportar compromiso |
| MercadoPago | soporte@mercadopago.com | Notificar breach |
| Google Cloud | [Support Console](https://console.cloud.google.com/support) | Ticket urgente |
| Railway | [Support](https://railway.app/help) | Incidente de seguridad |

---

**Fecha de última actualización:** 2026-02-15
**Responsable:** DevOps/Security Team
**Próxima revisión:** Inmediata (cada rotación)
