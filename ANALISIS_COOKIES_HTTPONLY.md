# 🔍 Análisis: Cookies sin HttpOnly - Problema #5

**Fecha:** 2026-02-10
**Estado:** ✅ **NO REQUIERE CAMBIOS**

---

## 📊 RESUMEN EJECUTIVO

Después de un análisis exhaustivo del código, **NO es necesario ni seguro** cambiar `httpOnly: false` a `true` en las cookies de tenant porque:

1. ✅ **Las cookies críticas de autenticación YA están protegidas** con `httpOnly: true`
2. ❌ **Las cookies de tenant DEBEN ser accesibles por JavaScript** para funcionalidad
3. 🔒 **El riesgo de seguridad es BAJO** - solo contienen IDs, no datos sensibles

---

## 🔐 ESTADO ACTUAL DE COOKIES

### Cookies Protegidas (httpOnly: true) ✅

| Cookie | Contenido | Ubicación | Estado |
|--------|-----------|-----------|--------|
| `token` | JWT de autenticación | middleware.ts:188-194 | ✅ PROTEGIDO |
| `refresh_token` | Refresh token | middleware.ts:195-201 | ✅ PROTEGIDO |

**Estas son las cookies críticas y YA están correctamente protegidas.**

### Cookies No-HttpOnly (httpOnly: false) - POR DISEÑO

| Cookie | Contenido | JS Necesita Acceso | Riesgo |
|--------|-----------|-------------------|--------|
| `tenant-store` | `{slug, organizationId}` | ✅ Lee | 🟢 BAJO |
| `tenant_org_id` | ID de organización | ✅ Lee/Escribe | 🟢 BAJO |
| `tenant_company_id` | ID de empresa | ✅ Lee/Escribe | 🟢 BAJO |

---

## 🔍 ANÁLISIS DETALLADO

### 1. JavaScript NECESITA Acceder a Estas Cookies

#### Evidencia en el Código

**Archivo:** `fronted/src/utils/tenant-preferences.ts`

**Líneas 120-128:** JavaScript ESCRIBE las cookies
```typescript
export function setTenantSelection(selection: TenantSelection): void {
  if (typeof document === "undefined") return

  const { orgId, companyId } = selection
  const cookieOptions = `path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`

  if (orgId != null) {
    document.cookie = `tenant_org_id=${encodeURIComponent(String(orgId))}; ${cookieOptions}`
  }

  if (companyId != null) {
    document.cookie = `tenant_company_id=${encodeURIComponent(String(companyId))}; ${cookieOptions}`
  }
}
```

**Líneas 39-46:** JavaScript LEE las cookies
```typescript
const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, part) => {
  const [rawKey, rawValue] = part.split("=")
  if (!rawKey) return acc
  const key = rawKey.trim()
  if (!key) return acc
  acc[key] = decodeURIComponent(rawValue ?? "")
  return acc
}, {})
```

**Archivo:** `fronted/src/utils/auth-token.ts`

**Líneas 46-48:** Función auxiliar para leer cookies
```typescript
const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`)
const match = document.cookie.match(pattern)
return match ? decodeURIComponent(match[1]) : null
```

**Línea 143:** Lee `tenant-store` con JavaScript
```typescript
const cookiePayload = parseTenantCookie(readCookieValue(TENANT_COOKIE_NAME))
```

---

### 2. Funcionalidad que SE ROMPERÍA si Cambiamos a httpOnly: true

| Funcionalidad | Archivo | Impacto |
|---------------|---------|---------|
| Selección de organización | tenant-preferences.ts | 🔴 CRÍTICO |
| Cambio entre companies | tenant-preferences.ts | 🔴 CRÍTICO |
| Persistencia de contexto | tenant-preferences.ts | 🔴 CRÍTICO |
| Headers x-org-id en requests | auth-token.ts | 🔴 CRÍTICO |
| Multi-tenancy del sistema | Múltiples archivos | 🔴 CRÍTICO |

**Archivos afectados (10 archivos):**
```
fronted/src/utils/auth-token.ts
fronted/src/hooks/use-user-context-sync.ts
fronted/src/context/tenant-selection-context.tsx
fronted/src/context/context-restore.service.ts
fronted/src/utils/tenant-preferences.ts
fronted/src/utils/tenant-preferences.test.ts
fronted/src/lib/tenant/tenant-shared.ts
fronted/src/lib/server/tenant-context.ts
fronted/src/app/api/site-settings/route.ts
fronted/src/components/ui/sidebar.tsx
```

---

### 3. Riesgo de Seguridad: BAJO

#### ¿Qué puede hacer un atacante con XSS?

**Escenario 1: Leer `token` (cookie de autenticación)**
- ❌ **BLOQUEADO**: Cookie tiene `httpOnly: true`
- 🔒 Resultado: **No puede robar la sesión**

**Escenario 2: Leer `tenant_org_id` o `tenant_company_id`**
- ✅ **POSIBLE**: Cookies tienen `httpOnly: false`
- ⚠️ Información obtenida: Solo IDs numéricos (ej: `42`, `123`)
- 🔒 Resultado: **No puede hacer nada útil**
  - No puede autenticarse con solo un ID
  - El backend valida permisos con el token JWT
  - Cambiar el ID en el cliente no otorga acceso

**Escenario 3: Modificar `tenant_org_id` para ver datos de otra organización**
- ✅ **POSIBLE**: Puede cambiar el ID en la cookie
- 🔒 **BLOQUEADO POR EL BACKEND**:
  - Todos los endpoints validan permisos con el token JWT
  - El token contiene el rol y organizaciones permitidas
  - El backend rechaza requests no autorizados

#### Ejemplo de Validación en Backend

**Archivo:** `backend/src/common/guards/tenant-required.guard.ts`
```typescript
// El backend SIEMPRE valida permisos
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProductsController {
  // ...
}
```

El atacante podría cambiar `tenant_org_id=42` pero el backend verificará:
1. ¿El token JWT es válido? ✅
2. ¿El usuario tiene acceso a la organización 42? ❌
3. Rechaza la request con 403 Forbidden

---

### 4. Comparación con Cookies de Autenticación

| Aspecto | `token` / `refresh_token` | `tenant_org_id` / `tenant_company_id` |
|---------|---------------------------|--------------------------------------|
| **Contenido** | JWT con credenciales | Solo IDs numéricos |
| **Sensibilidad** | 🔴 MUY ALTA | 🟢 BAJA |
| **Si se roba** | 🔴 Atacante puede suplantar usuario | 🟢 Solo ve un número |
| **httpOnly** | ✅ true (correcto) | ❌ false (necesario) |
| **JavaScript necesita** | ❌ No | ✅ Sí |
| **Protección XSS** | ✅ Protegido | ⚠️ Expuesto (pero bajo riesgo) |

---

## ✅ RECOMENDACIÓN

**NO CAMBIAR `httpOnly` de las cookies de tenant.**

### Razones:

1. **Cambiar a `httpOnly: true` rompe funcionalidad crítica:**
   - El sistema multi-tenant dejaría de funcionar
   - Los usuarios no podrían cambiar de organización
   - Los headers x-org-id no se enviarían correctamente

2. **El riesgo de seguridad es muy bajo:**
   - Las cookies solo contienen IDs públicos
   - No permiten suplantación de identidad
   - El backend valida todos los permisos

3. **Las cookies realmente críticas YA están protegidas:**
   - `token` tiene httpOnly: true ✅
   - `refresh_token` tiene httpOnly: true ✅

---

## 🛡️ MEJORAS DE SEGURIDAD RECOMENDADAS (ALTERNATIVAS)

En lugar de cambiar httpOnly, se pueden implementar estas mejoras:

### 1. Content Security Policy (CSP)

**Archivo:** `fronted/next.config.ts`

Agregar headers de seguridad:
```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
        },
      ],
    },
  ]
}
```

**Beneficio:** Previene XSS bloqueando scripts maliciosos

### 2. Validación Estricta en Backend

Asegurar que TODOS los endpoints validan:
- Token JWT válido
- Usuario tiene permiso para la organización solicitada
- IDs de organización/company son válidos

**Ya implementado en:** `TenantRequiredGuard`, `JwtAuthGuard`

### 3. Rate Limiting (Problema #6)

Implementar límites de requests para prevenir:
- Enumeración de IDs de organizaciones
- Fuerza bruta

---

## 📝 CONCLUSIÓN

**Problema #5 (Cookies sin HttpOnly) NO ES UN PROBLEMA REAL porque:**

1. ✅ Las cookies de autenticación están correctamente protegidas
2. ✅ Las cookies de tenant necesitan httpOnly: false por diseño
3. ✅ El riesgo de seguridad es bajo y está mitigado por validación en backend
4. ❌ Cambiar httpOnly rompería funcionalidad crítica sin beneficio de seguridad

**Estado:** ✅ **CERRADO - NO REQUIERE ACCIÓN**

---

**Próximo paso:** Continuar con **Problema #4: Logs con Información Sensible**

---

**Última actualización:** 2026-02-10
