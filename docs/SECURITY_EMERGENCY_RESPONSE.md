# 🚨 PLAN DE RESPUESTA A EMERGENCIAS DE SEGURIDAD

**Documento:** Procedimiento de Respuesta a Incidentes de Seguridad
**Versión:** 1.0
**Fecha:** 2026-02-15
**Clasificación:** CONFIDENCIAL

---

## 🎯 OBJETIVO

Este documento define el procedimiento a seguir cuando se detecta o sospecha de un incidente de seguridad en el sistema TI Projecto Web.

---

## 📋 TIPOS DE INCIDENTES

### Severidad CRÍTICA 🔴

| Incidente | Descripción | Tiempo de Respuesta |
|-----------|-------------|---------------------|
| **Credenciales Expuestas** | Secrets en repositorio público | INMEDIATO (<15 min) |
| **Breach de Datos** | Acceso no autorizado a BD | INMEDIATO (<15 min) |
| **Ransomware** | Encriptación de datos | INMEDIATO (<15 min) |
| **DDoS Activo** | Servicio caído por ataque | INMEDIATO (<15 min) |

### Severidad ALTA 🟠

| Incidente | Descripción | Tiempo de Respuesta |
|-----------|-------------|---------------------|
| **SQL Injection Explotado** | Queries maliciosas detectadas | <30 minutos |
| **XSS Activo** | Scripts maliciosos inyectados | <30 minutos |
| **Escalación de Privilegios** | Usuario con acceso no autorizado | <30 minutos |
| **Leak Multi-Tenant** | Datos de org A visibles para org B | <30 minutos |

### Severidad MEDIA 🟡

| Incidente | Descripción | Tiempo de Respuesta |
|-----------|-------------|---------------------|
| **Brute Force Detection** | Múltiples intentos de login | <2 horas |
| **Vulnerabilidad Reportada** | CVE en dependencia crítica | <4 horas |
| **Anomalía en Logs** | Patrones sospechosos detectados | <4 horas |

---

## 🚨 PROCEDIMIENTO DE RESPUESTA INMEDIATA

### PASO 1: DETECCIÓN Y ALERTA (0-5 minutos)

#### 1.1. Canales de Detección

**Automáticos:**
- Alertas de monitoring (Sentry, New Relic)
- Railway health checks fallando
- Alertas de seguridad de GitHub
- npm audit warnings

**Manuales:**
- Reporte de usuario
- Descubrimiento en code review
- Notificación de terceros (SUNAT, MercadoPago)

#### 1.2. Notificación del Equipo

**Personas a notificar:**
1. **Tech Lead** - Decisiones técnicas
2. **DevOps Lead** - Infraestructura
3. **Security Lead** - Análisis de seguridad
4. **CEO/CTO** - Decisiones de negocio

**Canales de comunicación:**
- Slack: Canal `#security-incidents` (crear si no existe)
- Email: `security@tu-empresa.com`
- Teléfono: Solo para CRÍTICO (números en contactos)

**Template de alerta:**
```
🚨 ALERTA DE SEGURIDAD - [SEVERIDAD]

Incidente: [Tipo de incidente]
Detectado: [Timestamp]
Reportado por: [Nombre]
Sistemas afectados: [Lista]
Impacto inicial: [Descripción breve]

Acción tomada: [Si ya se tomó alguna]
Requiere escalamiento: [SÍ/NO]

Sala de guerra: [Link a videollamada si aplica]
```

---

### PASO 2: CONTENCIÓN (5-15 minutos)

#### Escenario A: Credenciales Expuestas (Este caso actual)

**Acciones inmediatas:**

```bash
# 1. Verificar si el repositorio es PÚBLICO
gh repo view --json visibility
# Si es público → CRÍTICO MÁXIMO

# 2. Hacer el repositorio PRIVADO inmediatamente
gh repo edit --visibility private

# 3. Desactivar aplicación en producción (Railway)
railway down
# O escalar a 0 instancias
railway scale --replicas 0

# 4. Revocar credenciales comprometidas
# Ver: docs/SECURITY_CREDENTIALS_ROTATION.md sección "FASE 1: INMEDIATA"
```

**Checklist de contención:**
- [ ] Repositorio configurado como privado
- [ ] Aplicación en producción pausada
- [ ] Database: password cambiada
- [ ] JWT_SECRET: regenerado
- [ ] SUNAT: credenciales revocadas
- [ ] MercadoPago: tokens revocados
- [ ] Google OAuth: secret regenerado
- [ ] SMTP: password cambiada
- [ ] Todos los servicios terceros notificados

#### Escenario B: Breach de Base de Datos

**Acciones inmediatas:**

```bash
# 1. Aislar la base de datos
# En PostgreSQL, denegar todas las conexiones excepto localhost
psql -U postgres
ALTER ROLE postgres CONNECTION LIMIT 0;
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid();

# 2. Crear snapshot de BD inmediata
pg_dump ecoterra > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Analizar conexiones activas
SELECT * FROM pg_stat_activity WHERE datname = 'ecoterra';

# 4. Revisar logs de acceso
tail -f /var/log/postgresql/postgresql-*.log | grep -i "unauthorized\|error\|failed"
```

**Checklist de contención:**
- [ ] BD aislada (solo localhost)
- [ ] Backup de emergencia creado
- [ ] Conexiones sospechosas terminadas
- [ ] Logs de acceso capturados
- [ ] Firewall actualizado (solo IPs conocidas)

#### Escenario C: DDoS Activo

**Acciones inmediatas:**

```bash
# 1. Activar Cloudflare "I'm Under Attack Mode"
# (si está configurado)

# 2. Rate limiting agresivo en Railway
# Configurar en railway.json:
{
  "rateLimit": {
    "max": 10,
    "windowMs": 60000
  }
}

# 3. Bloquear IPs atacantes (temporal)
# Ver IPs en logs:
railway logs | grep "429\|503" | awk '{print $1}' | sort | uniq -c | sort -rn
```

---

### PASO 3: INVESTIGACIÓN (15-60 minutos)

#### 3.1. Recolección de Evidencia

**Logs a capturar:**

```bash
# Railway logs (últimas 2 horas)
railway logs --since 2h > incident_logs_$(date +%Y%m%d_%H%M%S).log

# PostgreSQL logs
sudo tail -n 5000 /var/log/postgresql/postgresql-*.log > db_logs_$(date +%Y%m%d_%H%M%S).log

# Git history de cambios recientes
git log --all --since="24 hours ago" --pretty=fuller > git_recent_$(date +%Y%m%d_%H%M%S).log

# Railway deployment history
railway deployments list > deployments_$(date +%Y%m%d_%H%M%S).log
```

**Datos de la base de datos:**

```sql
-- Consultas sospechosas en las últimas 24 horas
-- (si tienes auditoría habilitada)
SELECT * FROM audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
AND (action LIKE '%DELETE%' OR action LIKE '%DROP%' OR action LIKE '%TRUNCATE%')
ORDER BY created_at DESC;

-- Usuarios creados recientemente
SELECT * FROM "User"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;

-- Cambios en permisos recientes
SELECT * FROM activity
WHERE action = 'PERMISSION_CHANGE'
AND timestamp > NOW() - INTERVAL '7 days';
```

#### 3.2. Análisis de Impacto

**Preguntas clave:**

1. **¿Qué datos fueron comprometidos?**
   - [ ] Información de usuarios (PII)
   - [ ] Credenciales (passwords, tokens)
   - [ ] Datos financieros (facturas, pagos)
   - [ ] Datos contables (asientos, libros)
   - [ ] Backups

2. **¿Cuándo comenzó el incidente?**
   - Timestamp exacto del primer evento sospechoso
   - Duración total del incidente

3. **¿Cómo ocurrió el breach?**
   - Vector de ataque identificado
   - Vulnerabilidad explotada

4. **¿Quién fue afectado?**
   - Número de usuarios impactados
   - Organizaciones afectadas (multi-tenant)
   - Datos específicos comprometidos por usuario

#### 3.3. Documentación del Incidente

**Crear archivo de incidente:**

```markdown
# Incidente de Seguridad #[NÚMERO]

## Resumen
- **Fecha/Hora:** [Timestamp]
- **Severidad:** [CRÍTICA/ALTA/MEDIA]
- **Tipo:** [Tipo de incidente]
- **Estado:** [EN CURSO/CONTENIDO/RESUELTO]

## Timeline
| Hora | Evento |
|------|--------|
| 14:23 | Incidente detectado |
| 14:25 | Equipo notificado |
| 14:28 | Contención iniciada |
| ... | ... |

## Impacto
- Usuarios afectados: [Número]
- Datos comprometidos: [Descripción]
- Downtime: [Duración]
- Pérdida estimada: [Si aplica]

## Análisis Técnico
[Detalles técnicos del breach]

## Acciones Tomadas
- [x] Acción 1
- [x] Acción 2
- [ ] Acción pendiente

## Lecciones Aprendidas
[Qué salió mal, qué se puede mejorar]

## Seguimiento
- [ ] Tarea 1
- [ ] Tarea 2
```

---

### PASO 4: ERRADICACIÓN (1-4 horas)

#### 4.1. Eliminar la Amenaza

**Si es malware/backdoor:**
```bash
# 1. Escanear todos los archivos
clamscan -r --bell -i /ruta/al/proyecto

# 2. Buscar archivos modificados recientemente
find . -type f -mtime -1 -ls

# 3. Comparar con último commit conocido bueno
git diff [commit-hash] HEAD

# 4. Restaurar desde backup limpio si es necesario
```

**Si es código vulnerable:**
```bash
# 1. Identificar el código problemático
# 2. Desarrollar y testear el fix
# 3. Desplegar en ambiente de staging primero
# 4. Verificar que el fix funciona
# 5. Desplegar en producción

# Ejemplo: Parche de SQL Injection
git checkout -b hotfix/sql-injection-fix
# [Hacer cambios]
npm run test
git commit -m "fix(security): prevent SQL injection in user queries"
git push origin hotfix/sql-injection-fix
# Merge a main y desplegar
```

#### 4.2. Verificar la Erradicación

**Checklist:**
- [ ] Vulnerabilidad patcheada y verificada
- [ ] Scans de seguridad pasan (npm audit, Snyk)
- [ ] Código malicioso removido
- [ ] Backdoors cerrados
- [ ] Tests de penetración pasados

---

### PASO 5: RECUPERACIÓN (4-24 horas)

#### 5.1. Restaurar Servicios

**Orden de recuperación:**

1. **Base de datos** (si fue afectada)
   ```bash
   # Restaurar desde backup limpio
   psql ecoterra < backup_verified_clean.sql

   # Verificar integridad
   SELECT COUNT(*) FROM "User";
   SELECT COUNT(*) FROM "Sales";
   ```

2. **Backend**
   ```bash
   # Desplegar con nuevas credenciales
   railway up
   railway scale --replicas 2

   # Verificar health
   curl https://api.tu-dominio.com/health
   ```

3. **Frontend**
   ```bash
   # Desplegar frontend
   cd fronted
   npm run build
   railway up
   ```

4. **Servicios Externos**
   - Reconectar SUNAT con nuevas credenciales
   - Reconectar MercadoPago
   - Verificar envío de emails

#### 5.2. Monitoreo Intensivo Post-Recuperación

**Monitorear por 72 horas:**

```bash
# Logs en tiempo real
railway logs --tail

# Métricas de error rate
# (configurar en Railway dashboard)

# Alertas de seguridad
git-secrets --scan-history
npm audit
```

**Indicadores de éxito:**
- [ ] Error rate < 1%
- [ ] Latencia promedio normal
- [ ] No hay intentos de re-breach
- [ ] Usuarios pueden operar normalmente
- [ ] Transacciones procesándose correctamente

---

### PASO 6: POST-MORTEM (24-72 horas después)

#### 6.1. Reunión de Post-Mortem

**Agenda:**
1. **Qué pasó** (15 min)
   - Timeline exacto
   - Cómo se detectó
   - Cómo se contenió

2. **Qué salió bien** (10 min)
   - Acciones efectivas
   - Herramientas que ayudaron

3. **Qué salió mal** (15 min)
   - Delays en detección
   - Gaps en respuesta
   - Fallas de comunicación

4. **Lecciones aprendidas** (15 min)
   - Root cause
   - Factores contribuyentes

5. **Plan de acción** (15 min)
   - Mejoras inmediatas
   - Mejoras a largo plazo
   - Responsables y fechas

#### 6.2. Documento de Post-Mortem

**Template:**

```markdown
# Post-Mortem: Incidente #[NÚMERO]

## Resumen Ejecutivo
[2-3 párrafos describiendo el incidente]

## Impacto
- Duración: [X horas]
- Usuarios afectados: [Número]
- Pérdida estimada: [Monto]
- Reputación: [Impacto]

## Root Cause
[Causa raíz del incidente]

## Timeline Detallado
[Ver tabla en documento de incidente]

## Detección
- Tiempo hasta detección: [X minutos]
- Método de detección: [Automático/Manual]
- Primera alerta: [Qué activó la alerta]

## Respuesta
- Tiempo hasta contención: [X minutos]
- Efectividad de contención: [Alta/Media/Baja]
- Tiempo hasta resolución: [X horas]

## Qué Funcionó Bien
1. [Punto positivo 1]
2. [Punto positivo 2]

## Qué No Funcionó
1. [Punto negativo 1]
2. [Punto negativo 2]

## Action Items
| Acción | Responsable | Deadline | Status |
|--------|-------------|----------|--------|
| [Tarea 1] | [Nombre] | [Fecha] | [ ] |
| [Tarea 2] | [Nombre] | [Fecha] | [ ] |

## Recomendaciones a Largo Plazo
1. [Mejora estructural 1]
2. [Mejora estructural 2]

---

**Aprobado por:** [Nombre], [Fecha]
```

---

## 📞 CONTACTOS DE EMERGENCIA

### Equipo Interno

| Rol | Nombre | Teléfono | Email | Disponibilidad |
|-----|--------|----------|-------|----------------|
| Tech Lead | [Nombre] | [+XX XXXX] | [Email] | 24/7 |
| DevOps Lead | [Nombre] | [+XX XXXX] | [Email] | 24/7 |
| Security Lead | [Nombre] | [+XX XXXX] | [Email] | 24/7 |
| CEO/CTO | [Nombre] | [+XX XXXX] | [Email] | Business hours |

### Servicios Externos

| Servicio | Contacto | URL | SLA |
|----------|----------|-----|-----|
| Railway | Support | https://railway.app/help | 2h response |
| SUNAT | Mesa de ayuda | https://www.sunat.gob.pe | Business hours |
| MercadoPago | Soporte técnico | soporte@mercadopago.com | 4h response |
| Google Cloud | Support console | https://console.cloud.google.com/support | 1h (if premium) |

### Consultores Externos

| Especialidad | Contacto | Disponibilidad |
|--------------|----------|----------------|
| Forensics | [Empresa] | On-demand |
| Legal | [Bufete] | On-demand |
| PR/Comunicación | [Agencia] | On-demand |

---

## 🔒 MEJORAS POST-INCIDENTE REQUERIDAS

### Técnicas
- [ ] Implementar SIEM (Security Information and Event Management)
- [ ] Configurar alertas automáticas de anomalías
- [ ] Habilitar 2FA obligatorio para todos los usuarios
- [ ] Implementar WAF (Web Application Firewall)
- [ ] Configurar intrusion detection system

### Proceso
- [ ] Entrenar al equipo en respuesta a incidentes
- [ ] Realizar simulacros trimestrales
- [ ] Actualizar playbooks de respuesta
- [ ] Documentar runbooks para cada tipo de incidente
- [ ] Establecer SLAs de respuesta por severidad

### Compliance
- [ ] Notificar a autoridades si es requerido (GDPR, etc.)
- [ ] Documentar para auditorías
- [ ] Actualizar política de seguridad
- [ ] Revisar contratos con clientes (breach notifications)

---

**Última actualización:** 2026-02-15
**Próxima revisión:** Trimestral o post-incidente
**Propietario:** Security Team
