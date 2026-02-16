# CLAUDE.md - TI Projecto Web

## Descripción del Proyecto
Sistema integral de gestión empresarial multi-tenant con contabilidad integrada, diseñado para el mercado peruano. Incluye módulos de inventario, ventas, compras, cotizaciones, contabilidad y más.

## Stack Tecnológico

### Backend
- **Framework:** NestJS (Node.js)
- **ORM:** Prisma 7
- **Base de datos:** PostgreSQL
- **WebSockets:** Socket.IO (barcode gateway, chat)
- **Validaciones:** Class-validator, DTOs

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript (strict mode)
- **Estilos:** Tailwind CSS
- **Componentes UI:** shadcn/ui
- **Validaciones:** Zod
- **Forms:** react-hook-form
- **PDFs:** react-pdf, @react-pdf/renderer
- **Estado:** React Context API
- **HTTP:** fetch nativo

## Arquitectura del Proyecto

### Estructura de Directorios
```
/backend          # API NestJS
  /src
    /[module]     # Módulos por dominio
    /prisma       # Schema y migraciones
/fronted          # Cliente Next.js (SÍ, con 'd')
  /src
    /app          # App Router de Next.js
      /api        # API Routes (proxy al backend)
      /dashboard  # Área administrativa
    /components   # Componentes reutilizables
    /context      # Contexts de React
    /hooks        # Custom hooks
    /lib          # Utilidades
/docs             # Documentación del proyecto
```

### Multi-tenancy
- Sistema multi-tenant con `tenantId` en todas las entradas
- Schema enforcement configurable por organización
- Middleware de tenant en backend
- Context de tenant selection en frontend

## Convenciones de Código

### Reglas Generales
1. **TypeScript estricto:** Siempre tipar correctamente, evitar `any`
2. **Nombrado consistente:**
   - Componentes: PascalCase (`ProductForm.tsx`)
   - Archivos API: kebab-case (`product-details.api.tsx`)
   - Hooks: camelCase con prefijo `use` (`useAuth.ts`)
   - Contexts: PascalCase con sufijo Context (`AuthContext`)

3. **Imports organizados:**
   - React primero
   - Librerías externas
   - Imports relativos
   - Tipos al final

### Frontend (Next.js)

#### Componentes
- **Server Components por defecto** (Next.js 14)
- **Client Components** solo cuando sea necesario:
  - Hooks de React (useState, useEffect, etc.)
  - Event handlers
  - Context consumers
  - Browser APIs
- Marcar explícitamente con `'use client'` al inicio del archivo

#### API Routes
- Usar API routes en `/app/api/*` como proxy al backend
- Incluir manejo de errores consistente
- Validar datos con Zod antes de enviar al backend
- Patrón estándar:
```typescript
export async function GET/POST/PUT/DELETE(request: Request) {
  try {
    const token = cookies().get('authToken')?.value
    const response = await fetch(`${BACKEND_URL}/endpoint`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return Response.json(await response.json())
  } catch (error) {
    return Response.json({ error: 'mensaje' }, { status: 500 })
  }
}
```

#### Archivos API Separados
- Crear archivos `*.api.ts` o `*.api.tsx` para lógica de llamadas al backend
- No incluir lógica de API dentro de componentes
- Ejemplo: `products.api.tsx`, `sales.api.tsx`

#### Validaciones
- Usar Zod para esquemas de validación
- Definir schemas cerca de donde se usan
- Validar en cliente Y servidor

#### Estilos
- Tailwind CSS para todo el styling
- Componentes shadcn/ui para UI consistente
- No usar CSS modules ni styled-components
- Clases utilitarias antes que CSS personalizado

### Backend (NestJS)

#### Módulos
- Un módulo por dominio de negocio
- Estructura: controller, service, entity (Prisma model)
- DTOs con class-validator para validación
- Guards para autenticación y permisos

#### Base de Datos (Prisma)
- Migraciones con nombre descriptivo
- Siempre incluir `tenantId` en modelos multi-tenant
- Índices en campos de búsqueda frecuente
- Soft deletes preferidos sobre hard deletes

#### Seguridad
- JWT para autenticación
- Cookies httpOnly para tokens
- CORS configurado correctamente
- Rate limiting en endpoints sensibles
- Validación de permisos por módulo

## Reglas de Negocio Específicas

### Contexto Peruano
- **Monedas:** PEN (Soles) y USD (Dólares)
- **Tipo de cambio:** Actualizable por usuario
- **Impuestos:** IGV 18% (configurable)
- **Documentos:** Facturas, Boletas (según SUNAT)

### Módulos Principales

#### Inventario
- Control de stock por tienda
- Alertas de stock mínimo
- Múltiples unidades de medida
- Trazabilidad de movimientos

#### Ventas
- Cotizaciones → Órdenes → Ventas completadas
- Generación de PDFs (facturas, boletas)
- Múltiples métodos de pago
- Integración con caja registradora

#### Entradas/Compras
- Registro de compras a proveedores
- Extracción de datos desde PDF de factura
- Actualización automática de inventario
- Generación de guías de remisión

#### Contabilidad
- Sistema híbrido simplificado/completo
- Registro de compras y ventas
- Conciliación bancaria
- Reportes SUNAT

### Permisos y Roles
- Sistema basado en módulos
- Guard `ModulePermissionGuard` en frontend
- Guard `DeleteActionsGuard` para operaciones destructivas
- Verificar permisos en backend siempre

## Patrones y Mejores Prácticas

### Performance
- Lazy loading de componentes pesados
- Debouncing en búsquedas
- Paginación en listados grandes
- Optimistic updates donde sea apropiado
- React.memo para componentes costosos

### Multi-Agent Orchestration

**Cuándo Usar Agentes Especializados:**

Usar el sistema de agentes (Task tool) para maximizar eficiencia y paralelismo en tareas complejas:

#### Tipos de Agentes Disponibles

1. **Explore Agent** - Exploración rápida de codebase
   - Búsquedas de código por patrones
   - Encontrar archivos específicos
   - Responder preguntas sobre arquitectura
   - Thoroughness: "quick", "medium", "very thorough"

2. **Plan Agent** - Diseño de implementación
   - Planificar estrategias de implementación
   - Identificar archivos críticos
   - Analizar trade-offs arquitectónicos
   - Usar ANTES de escribir código complejo

3. **Bash Agent** - Operaciones de terminal
   - Git operations
   - Ejecución de comandos
   - Scripts de automatización

4. **General-Purpose Agent** - Tareas multi-paso complejas
   - Búsquedas que requieren múltiples intentos
   - Investigación profunda
   - Tareas que combinan múltiples herramientas

#### Cuándo Paralelizar vs. Secuencial

**USAR PARALELIZACIÓN (múltiples agentes en paralelo):**
```typescript
// ✅ Múltiples búsquedas independientes
Task("buscar componentes auth", "Explore")
Task("buscar configuración CORS", "Explore")
Task("buscar validators JWT", "Explore")

// ✅ Investigación de múltiples archivos
Task("analizar products.service.ts", "Explore")
Task("analizar inventory.service.ts", "Explore")

// ✅ Operaciones Git independientes
Task("git status", "Bash")
Task("git diff", "Bash")
Task("git log", "Bash")
```

**EJECUTAR SECUENCIALMENTE:**
```typescript
// ❌ NO paralelizar - operaciones dependientes
await Task("git add .", "Bash")
await Task("git commit", "Bash")  // Depende del add
await Task("git push", "Bash")    // Depende del commit

// ❌ NO paralelizar - lectura antes de edición
await Task("leer archivo config", "Explore")
// Luego usar Edit tool con información obtenida
```

#### Mejores Prácticas

1. **Siempre paralelizar búsquedas independientes**
   - Si buscas 3 archivos diferentes, usa 3 agentes en paralelo
   - Si investigas múltiples módulos, paraleliza

2. **Usar Explore Agent para búsquedas amplias**
   - Si no sabes exactamente dónde buscar
   - Si necesitas buscar en múltiples ubicaciones
   - Si la búsqueda puede requerir varios intentos

3. **Usar Plan Agent ANTES de implementaciones complejas**
   - Features nuevas con múltiples archivos
   - Refactors arquitectónicos
   - Cambios que afectan múltiples módulos

4. **Delegar, no duplicar**
   - Si delegas una búsqueda a un agente, NO la hagas tú también
   - Espera el resultado del agente y úsalo

5. **Descripción clara del task**
   - 3-5 palabras descriptivas
   - Específico sobre qué debe hacer
   - Incluir contexto necesario en el prompt

#### Ejemplos de Uso Efectivo

**Ejemplo 1: Investigación de Bug**
```typescript
// ✅ CORRECTO - Paralelo
Task("buscar todos los usos de ProductsService", "Explore", "medium")
Task("buscar implementaciones de barcode gateway", "Explore", "quick")
Task("buscar configuraciones de WebSocket", "Explore", "quick")
```

**Ejemplo 2: Implementación de Feature**
```typescript
// Paso 1: Planear
Task("diseñar sistema de notificaciones", "Plan")

// Paso 2: Después del plan, investigar en paralelo
Task("buscar patrones de notificación existentes", "Explore")
Task("buscar configuración de email", "Explore")

// Paso 3: Implementar basado en plan e investigación
```

**Ejemplo 3: Debugging Multi-Módulo**
```typescript
// ✅ Investigar todos los módulos relacionados en paralelo
Task("analizar flujo en auth.service.ts", "Explore", "medium")
Task("analizar flujo en users.service.ts", "Explore", "medium")
Task("analizar middleware de tenant", "Explore", "medium")
```

#### Indicadores de Cuándo Usar Agentes

**Usar Explore Agent si:**
- Necesitas buscar más de 2 archivos/patrones
- No sabes exactamente dónde está el código
- La búsqueda puede requerir múltiples intentos
- Necesitas entender arquitectura/flujo

**Usar Plan Agent si:**
- El cambio afecta 3+ archivos
- Hay múltiples enfoques posibles
- Requiere decisiones arquitectónicas
- Es una feature nueva o refactor grande

**NO usar agentes si:**
- Sabes el archivo exacto (usa Read directamente)
- Es una búsqueda simple (usa Grep/Glob directamente)
- Es un cambio trivial (edita directamente)

### Manejo de Errores
- Try-catch en todas las llamadas API
- Mensajes de error amigables al usuario
- Toast/notifications para feedback
- Logging de errores en backend

### Datos Sensibles
- **NUNCA** commitear:
  - `.env` files
  - Credenciales
  - Tokens
  - Archivos de backup de BD
- Usar variables de entorno para configuración
- `.gitignore` actualizado

### Testing
- Cypress para E2E (configurado en `/fronted`)
- Tests unitarios para lógica crítica
- Validar flujos completos de negocio

## Sistema de Ayuda Contextual

El proyecto incluye un sistema de ayuda contextual inteligente:
- Ubicado en `/fronted/src/data/help/`
- Búsqueda fuzzy y por intención
- Screenshots en `/fronted/public/help/`
- Componente `HelpAssistant` para asistencia en tiempo real

## Comandos Útiles

```bash
# Backend
cd backend
npm run start:dev        # Desarrollo
npm run migration:dev    # Crear migración
npm run migration:run    # Aplicar migraciones

# Frontend
cd fronted
npm run dev             # Desarrollo
npm run build           # Build producción
npm run lint            # Linting
npx cypress open        # Tests E2E
```

## Notas Importantes

1. **Nombre del directorio:** Es `fronted` (con 'd'), NO `frontend`
2. **Prisma:** Versión 7 con nuevas características
3. **Autenticación:** Tokens en cookies httpOnly, no localStorage
4. **WebSockets:** Gateway de barcode en puerto específico
5. **PDFs:** Generación server-side con @react-pdf/renderer
6. **Imágenes:** Upload a `/storage` con validación de tamaño

## Cuando Hagas Cambios

### Antes de Implementar
- Leer archivos relacionados antes de modificar
- Entender el contexto del módulo
- Verificar dependencias entre módulos
- Revisar si existe patrón similar en otro módulo

### Al Crear Código
- Seguir patrones existentes en el proyecto
- Mantener consistencia con código similar
- No sobre-ingenierizar soluciones simples
- Comentar solo lógica compleja, no código obvio
- Evitar duplicación de código

### Después de Implementar
- Verificar que no rompiste funcionalidad existente
- Revisar imports no usados
- Confirmar que tipos TypeScript son correctos
- Probar en desarrollo antes de confirmar

## Recursos del Proyecto

- Documentación en `/docs`
- Guías de ayuda en `/fronted/public/help`
- Schemas de Prisma en `/backend/prisma/schema.prisma`
- Tipos compartidos generados desde Prisma

---

**Última actualización:** 2026-02-15
**Versión:** 1.1

Este archivo debe actualizarse cuando cambien convenciones, patrones o reglas importantes del proyecto.
