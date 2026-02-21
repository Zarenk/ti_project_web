# CLAUDE.md - TI Projecto Web

## Descripción del Proyecto
Sistema integral de gestión empresarial multi-tenant con contabilidad de doble partida integrada, diseñado para el mercado peruano. Soporta múltiples verticales de negocio (General, Retail, Restaurantes, Servicios, Manufactura, Computación, Estudio de Abogados) con configuración dinámica por empresa. Incluye módulos de inventario, ventas, compras, cotizaciones, contabilidad PCGE, facturación SUNAT, gestión legal, pedidos de restaurante, e-commerce, sistema de suscripciones y más.

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
- Middleware de tenant en backend (`TenantHeaderMiddleware` + `TenantSlugResolverMiddleware`)
- Decorador `@CurrentTenant()` para extraer `organizationId` y `companyId` en controllers
- Context de tenant selection en frontend (`TenantSelectionContext`)
- Restauración automática de último contexto usado (`context-restore.service.ts`)
- Permisos por módulo en JSON (`OrganizationMembership.modulePermissions`)

### Business Verticals
Sistema de verticales de negocio que adapta la UI y funcionalidades según el tipo de empresa:

- **Enum `BusinessVertical`:** GENERAL, RESTAURANTS, RETAIL, SERVICES, MANUFACTURING, COMPUTERS, LAW_FIRM
- **Configuración por empresa:** `CompanyVerticalOverride` + `OrganizationVerticalOverride`
- **Feature flags:** `VerticalConfigService` → `TenantFeaturesContext` en frontend
- **Theming:** Variables CSS dinámicas por vertical (`vertical-css-variables.ts` + `vertical-css-provider.tsx`)
- **Patrón de archivo (archive/rollback):** Al cambiar vertical, los datos específicos se archivan a modelos `Archived*` (no se eliminan), con snapshot para rollback
- **Guard de módulo:** `@ModulePermission('legal')` en backend + `ModulePermissionGuard` en frontend
- **Hook `use-vertical-config.ts`:** Retorna la configuración activa de la vertical

**Ejemplo:** Una empresa `LAW_FIRM` ve módulo legal, no ve módulo restaurante. Si cambia a `RESTAURANTS`, los datos legales se archivan y se habilitan mesas/cocina.

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

#### Paginación (Componente Unificado)
- **SIEMPRE** usar el componente unificado de `@/components/data-table-pagination`
- **NO** crear componentes de paginación nuevos ni usar los obsoletos (`simple-pagination`, `catalog-pagination`)
- Dos modos disponibles:
  - `DataTablePagination` — para tablas con TanStack React Table (`table` prop)
  - `ManualPagination` — para paginación manual/server-side (`currentPage`, `totalPages`, `pageSize`, `onPageChange`, `onPageSizeChange`)
- Incluye: page pills con ellipsis, first/last, prev/next, selector de items por página, info text responsive
- Ejemplo de uso manual:
```typescript
import { ManualPagination } from "@/components/data-table-pagination"

<ManualPagination
  currentPage={page}
  totalPages={totalPages}
  pageSize={pageSize}
  totalItems={total}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
  pageSizeOptions={[10, 20, 30, 50]} // opcional
/>
```

#### Estilos
- Tailwind CSS para todo el styling
- Componentes shadcn/ui para UI consistente
- No usar CSS modules ni styled-components
- Clases utilitarias antes que CSS personalizado
- **Cursor pointer obligatorio:** Todos los elementos interactivos (botones, links, selects, checkboxes, switches, tabs, dropdowns, cards clickeables, etc.) deben tener `cursor-pointer` para indicar que son interactivos
- **Errores inline obligatorios:** Los mensajes de error de validación deben mostrarse siempre debajo del input/combobox/select correspondiente (además del toast si aplica). No depender solo del toast para comunicar errores de campo

#### Diseño Responsive Mobile (CRÍTICO)

**PROBLEMA COMÚN:** Componentes que se expanden más allá de los límites de la pantalla en mobile, causando scroll horizontal no deseado.

**REGLAS OBLIGATORIAS para prevenir overflow:**

1. **Overflow Control en Contenedores**
   ```typescript
   // ✅ CORRECTO - Card con overflow control
   <Card className="border shadow-md w-full min-w-0 overflow-hidden">
     <CardContent className="overflow-hidden">
       {/* contenido */}
     </CardContent>
   </Card>

   // ❌ INCORRECTO - Sin overflow control
   <Card className="border shadow-md">
     <CardContent>
       {/* contenido puede expandirse */}
     </CardContent>
   </Card>
   ```

2. **Width Control: SIEMPRE usar `w-full min-w-0`**
   ```typescript
   // ✅ CORRECTO - Contenedores con width control
   <div className="flex flex-col gap-2 w-full min-w-0 overflow-hidden">
     <div className="flex items-start gap-2 w-full min-w-0">
       {/* contenido */}
     </div>
   </div>

   // ❌ INCORRECTO - Sin width control
   <div className="flex flex-col gap-2">
     <div className="flex items-start gap-2">
       {/* puede expandirse */}
     </div>
   </div>
   ```

3. **Evitar Layouts Condicionales Complejos**
   ```typescript
   // ✅ CORRECTO - Layout simple apilado
   <div className="flex flex-col gap-2">
     <div className="flex items-start gap-2">
       <Icon className="flex-shrink-0" />
       <p className="break-words">{longText}</p>
     </div>
   </div>

   // ❌ INCORRECTO - Conditional layout propenso a overflow
   <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
     <div className="sm:flex-1 sm:min-w-0">
       <p className="truncate">{longText}</p>
     </div>
     <div className="sm:min-w-[6rem]">{/* puede romper mobile */}</div>
   </div>
   ```

4. **Texto: `break-words` para contenido largo**
   ```typescript
   // ✅ CORRECTO - Texto que se ajusta
   <p className="font-semibold text-sm sm:text-base break-words">
     {productName}
   </p>

   // ❌ INCORRECTO - Solo truncate puede no ser suficiente
   <p className="font-semibold truncate">
     {productName}
   </p>
   ```

5. **NUNCA usar `min-width` sin `max-width` correspondiente**
   ```typescript
   // ✅ CORRECTO - Width fijo sin min-width
   <div className="w-8 sm:w-12 flex-shrink-0">
     {ranking}
   </div>

   // ❌ INCORRECTO - min-width puede forzar overflow
   <div className="min-w-[6rem] flex-shrink-0">
     {content}
   </div>
   ```

6. **Iconos y Elementos Fijos: usar `flex-shrink-0`**
   ```typescript
   // ✅ CORRECTO - Iconos que no se comprimen
   <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
   <Badge className="text-xs flex-shrink-0">SKU</Badge>

   // ❌ INCORRECTO - Pueden comprimirse y distorsionarse
   <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
   ```

7. **Texto Responsive: Mobile-first**
   ```typescript
   // ✅ CORRECTO - Tamaños que escalan
   <p className="text-xs sm:text-sm">Metadata</p>
   <p className="text-sm sm:text-base">Content</p>
   <p className="text-base sm:text-lg">Emphasis</p>

   // ❌ INCORRECTO - Tamaños fijos grandes
   <p className="text-lg">Content</p>
   ```

8. **Grid Layouts: Usar `min-w-0` en columnas**
   ```typescript
   // ✅ CORRECTO - Grid que respeta límites
   <div className="grid gap-6 md:grid-cols-2 w-full min-w-0">
     <Component1 />
     <Component2 />
   </div>

   // ❌ INCORRECTO - Puede expandirse
   <div className="grid gap-6 md:grid-cols-2">
     <Component1 />
     <Component2 />
   </div>
   ```

9. **Patrón de 3 Filas Apiladas (Recomendado para Listas)**
   ```typescript
   // ✅ PATRÓN RECOMENDADO - Simple y seguro
   <div className="flex flex-col gap-2 p-2 sm:p-3 rounded-lg border w-full min-w-0 overflow-hidden">
     {/* Fila 1: Indicador + Título */}
     <div className="flex items-start gap-2 w-full min-w-0">
       <Icon className="w-4 h-4 flex-shrink-0" />
       <p className="font-semibold text-sm sm:text-base break-words">{title}</p>
     </div>

     {/* Fila 2: Metadata */}
     <div className="flex flex-wrap items-center gap-2 text-xs pl-6">
       <Badge>Tag</Badge>
       <span className="whitespace-nowrap">Info</span>
     </div>

     {/* Fila 3: Acción/Valor */}
     <div className="flex justify-between items-center pl-6 pt-1 border-t">
       <p className="text-xs text-muted-foreground">Label</p>
       <p className="text-base font-bold">Value</p>
     </div>
   </div>
   ```

10. **Verificación Obligatoria**
    - Antes de commitear, probar SIEMPRE en viewport mobile (375px width)
    - Verificar que NO aparezca scroll horizontal
    - Usar DevTools responsive mode para validar
    - Probar con nombres de productos/texto largo

**NUNCA:**
- ❌ Usar `flex-col sm:flex-row` en items de lista sin overflow control estricto
- ❌ Usar `min-w-[Xrem]` sin validación mobile
- ❌ Confiar solo en `truncate` para texto largo en containers flex
- ❌ Omitir `overflow-hidden` en Cards o contenedores principales
- ❌ Dejar elementos sin `w-full min-w-0` en flex containers

**REFERENCIAS:**
- Componentes de ejemplo: `TopProfitableProducts.tsx`, `LowProfitProducts.tsx`
- Problema documentado: 2026-02-21 - Overflow en dashboard de ventas

### Backend (NestJS)

#### Módulos (~59 módulos NestJS)
- Un módulo por dominio de negocio
- Estructura: controller, service, entity (Prisma model)
- DTOs con class-validator para validación (`@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsOptional()`, `@IsDateString()`)
- Guards para autenticación y permisos (`JwtAuthGuard`, `RolesGuard`, `TenantRequiredGuard`)
- Decoradores: `@Roles(...)`, `@ModulePermission('...')`, `@CurrentTenant('organizationId')`
- Módulos principales: `products`, `sales`, `entries`, `inventory`, `accounting`, `legal-matters`, `legal-documents`, `legal-events`, `restaurant-orders`, `restaurant-tables`, `kitchen-stations`, `ingredients`, `subscriptions`, `chat`, `help`, `ml`

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
- Sistema dual: modo simplificado (`AccEntry`/`AccPeriod`) y modo completo de doble partida (`JournalEntry`/`JournalLine`/`Account`)
- Cambio de modo via `User.accountingMode` + `AccountingModeContext` en frontend
- Plan Contable General Empresarial (PCGE) peruano
- Hooks post-transaccionales para generar asientos automáticos desde ventas y compras
- Libro Diario, Mayor, Balance de Comprobación
- Exportación PLE para SUNAT (generación asíncrona por cola)
- Cuentas contables con tipos: ACTIVO, PASIVO, PATRIMONIO, INGRESO, GASTO

#### Estudio de Abogados (Legal Vertical)
- **Expedientes** (`LegalMatter`): gestión de casos legales con código interno, área, estado, prioridad
- **Partes** (`LegalMatterParty`): demandantes, demandados, abogados, peritos con roles configurables
- **Documentos** (`LegalDocument`): upload con cadena de custodia (SHA-256), descarga por streaming, tipos: demanda, contestación, recurso, sentencia, etc.
- **Eventos** (`LegalEvent`): audiencias, plazos, reuniones con calendario integrado y recordatorios
- **Notas** (`LegalNote`): notas del expediente con opción de privacidad
- **Horas** (`LegalTimeEntry`): registro de horas facturables por abogado con tarifa configurable
- Edición inline en todas las entidades (patrón `editingId` + formulario compartido crear/editar)
- Backend: 3 módulos NestJS (`legal-matters`, `legal-documents`, `legal-events`)
- Frontend: `/dashboard/legal`, `/dashboard/legal/new`, `/dashboard/legal/[id]`, `/dashboard/legal/calendar`, `/dashboard/legal/documents`

#### Restaurante (Restaurant Vertical)
- **Pedidos** (`RestaurantOrder`): DINE_IN, TAKEAWAY, DELIVERY con estado en tiempo real
- **Mesas** (`RestaurantTable`): gestión de mesas con estado (libre, ocupada, reservada)
- **Cocina** (`KitchenStation`): estaciones de cocina con ruteo de ítems y display en tiempo real (WebSocket)
- **Ingredientes** (`Ingredient`): control de stock de ingredientes con movimientos
- **Recetas** (`RecipeItem`): relación producto ↔ ingredientes con cantidades
- Frontend: `/dashboard/restaurant-orders`, `/dashboard/kitchen`, `/dashboard/tables`, `/dashboard/ingredients`

#### E-commerce y Publicidad
- **Catálogo público** (`catalog`): productos publicados para tienda web
- **Pedidos web** (`websales`, `ordertracking`): ventas por canal web con seguimiento
- **Campañas** (`campaigns`, `ads`, `adslab`): gestión de campañas publicitarias
- **Creativos** (`Creative`, `Template`, `Asset`): plantillas y assets para anuncios
- **Publicación** (`PublishTarget`): adaptadores de publicación multi-canal

#### Suscripciones y Facturación de Plataforma
- **Planes** (`SubscriptionPlan`): planes de suscripción con cuotas por módulo
- **Suscripciones** (`Subscription`): ciclo de vida completo (TRIAL → ACTIVE → PAST_DUE → CANCELED)
- **Facturación** (`SubscriptionInvoice`): facturas de plataforma
- **Dunning automático** (`dunning-cron.service.ts`): cobro automático con reintentos
- **Trial automático** (`trial-cron.service.ts`): gestión de período de prueba
- **Webhook Mercado Pago**: integración de pagos
- Frontend: `/dashboard/account/plan`, `/dashboard/account/billing`

#### Caja Registradora
- **Cajas** (`CashRegister`): apertura/cierre de caja con balance
- **Transacciones** (`CashTransaction`): movimientos de entrada/salida por método de pago
- **Cierres** (`CashClosure`): cortes de caja con conciliación
- Frontend: `/dashboard/cashregister`

#### Sistema de Ayuda Inteligente
- **Embeddings vectoriales** (`HelpEmbedding`): búsqueda semántica de respuestas
- **Aprendizaje** (`HelpLearningSession`, `HelpSynonymRule`): mejora continua del KB
- **Candidatos KB** (`HelpKBCandidate`): promoción de buenas respuestas al knowledge base
- Componente `HelpAssistant` con worker en background (`use-help-worker.ts`)

#### Extracción de Facturas (ML)
- **Módulo ML** (`ml/`): bridge NestJS → Python (`predict.py`, `train_model.py`)
- **Templates** (`InvoiceTemplate`, `InvoiceSample`): plantillas por proveedor para extracción
- **Logs** (`InvoiceExtractionLog`): auditoría de extracciones
- Extracción de datos desde PDF de factura de proveedor

### Permisos y Roles
- **Roles de usuario:** ADMIN, EMPLOYEE, CLIENT, GUEST, SUPER_ADMIN_GLOBAL, SUPER_ADMIN_ORG
- **Roles de membresía:** OWNER, ADMIN, MEMBER, VIEWER, SUPER_ADMIN
- Sistema basado en módulos con permisos JSON en `OrganizationMembership.modulePermissions`
- Guard `ModulePermissionGuard` en frontend (oculta UI si no tiene permiso)
- Guard `DeleteActionsGuard` para operaciones destructivas
- Backend: `@Roles(...)` + `@ModulePermission(...)` decoradores en controllers
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

## React Contexts (`fronted/src/context/`)

| Context | Propósito |
|---------|-----------|
| `AuthContext` | Estado de autenticación y sesión del usuario |
| `TenantSelectionContext` | Cambio de organización/empresa activa |
| `TenantFeaturesContext` | Feature flags por vertical de negocio |
| `AccountingModeContext` | Alterna entre contabilidad simplificada y completa |
| `SiteSettingsContext` | Configuración global del sitio (Zod schema) |
| `CartContext` | Carrito de compras (e-commerce) |
| `MessagesContext` | Estado del chat en tiempo real |
| `HelpAssistantContext` | Asistente de ayuda contextual |

## Custom Hooks (`fronted/src/hooks/`)

| Hook | Propósito |
|------|-----------|
| `use-module-permission` | Verifica permiso del usuario para un módulo |
| `use-enforced-module-permission` | Redirige si no tiene permiso |
| `use-delete-action-visibility` | Controla visibilidad de botones de eliminación |
| `use-vertical-config` | Retorna configuración de vertical activa |
| `use-kitchen-socket` | WebSocket para cocina de restaurante |
| `use-help-worker` | Worker de fondo para asistente de ayuda |
| `use-chat-user-id` | Resolución de ID de usuario para chat |
| `use-mobile` | Detección responsive/mobile |
| `use-user-context-sync` | Sincroniza último contexto usado al backend |

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
4. **WebSockets:** Gateway de barcode + gateway de cocina (restaurante) + gateway de chat
5. **PDFs:** Generación server-side con @react-pdf/renderer
6. **Imágenes:** Upload a `/storage` con validación de tamaño
7. **Documentos legales:** Upload a `./uploads/legal-documents/` con hash SHA-256 para cadena de custodia
8. **API Proxy:** Frontend NUNCA llama al backend directamente — siempre pasa por `/app/api/*` route handlers que reenvían con cookie `authToken`
9. **Archivos API co-locados:** Cada sección del dashboard tiene un `*.api.tsx` hermano (ej: `sales.api.tsx`, `legal-matters.api.tsx`)
10. **Prisma schema:** ~80+ modelos definidos en `/backend/prisma/schema.prisma`

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

## Reglas Críticas - NO VIOLAR

### Queries de Productos
1. **NUNCA agregar `take: 500` ni límites hardcoded** en `products.service.ts findAll()`. Las organizaciones pueden tener 500+ productos y un límite silenciosamente oculta productos antiguos de todas las búsquedas (entries, sales, products page). Bug descubierto 2026-02-17.
2. **Siempre verificar `organizationId !== null`** antes de queries. `WHERE organizationId = NULL` devuelve 0 resultados.
3. **useEffect que carga productos** en el frontend DEBE depender del `selection` (contexto de tenant), no solo de filtros locales.

### Sistema Contable
4. **AccountingSummaryService usa `journalLine`** (NO `accEntryLine`). Migrado 2026-02-17.
5. **Nunca cambiar** el servicio de summary para usar `accEntryLine` - ese es el sistema antiguo vacío.

## Flujo Crítico: Entradas y Salidas de Inventario

> **PRECAUCIÓN MÁXIMA**: Los módulos de Entradas (compras) y Ventas (salidas) son el corazón transaccional del sistema. Un error aquí corrompe inventario, contabilidad y datos SUNAT simultáneamente. **SIEMPRE leer los archivos involucrados antes de tocar cualquier cosa.**

### Arquitectura del Flujo

```
ENTRADAS (Compras)                          SALIDAS (Ventas)
─────────────────                          ────────────────
Entry                                      Sales
 ├─ EntryDetail (líneas)                    ├─ SalesDetail (líneas)
 │   ├─ EntryDetailSeries (series S/N)     │   ├─ entryDetailId → EntryDetail
 │   └─ inventoryId → Inventory            │   ├─ storeOnInventoryId → StoreOnInventory
 ├─ Invoice (factura proveedor)            │   └─ series: String[] (series vendidas)
 └─ Journal (asiento contable)             ├─ SalePayment → CashTransaction → CashRegister
                                           ├─ InvoiceSales (comprobante SUNAT)
    Inventory                              └─ SunatTransmission
     └─ StoreOnInventory
         ├─ stock: Int (STOCK REAL)        JournalEntry (contabilidad)
         └─ InventoryHistory (auditoría)    └─ JournalLine (debe/haber)
```

### Archivos Clave — Leer ANTES de Modificar

| Archivo | Responsabilidad | Riesgo |
|---------|----------------|--------|
| `backend/src/entries/entries.service.ts` | `createEntry()` — transacción principal de compras | CRÍTICO: stock, series, contabilidad |
| `backend/src/sales/sales.service.ts` | `createSale()`, `deleteSale()` — ventas completas | CRÍTICO: stock, pagos, SUNAT |
| `backend/src/utils/sales-helper.ts` | `executeSale()` — transacción atómica de venta | CRÍTICO: reduce stock, registra pagos |
| `backend/src/products/products.service.ts` | `createWithInitialStock()` — producto + entrada | ALTO: llama a `createEntry()` |
| `backend/src/inventory/inventory.service.ts` | Excel import, consultas de stock, transferencias | ALTO: crea entries en bulk |
| `backend/src/accounting/hooks/sale-posted.controller.ts` | Hook async: genera asiento contable de venta | MEDIO: contabilidad post-venta |
| `backend/src/accounting/hooks/purchase-posted.controller.ts` | Hook async: genera asiento contable de compra | MEDIO: contabilidad post-compra |
| `backend/src/accounting/services/journal-entry.service.ts` | `create()` — crea JournalEntry + JournalLines | MEDIO: correlativo, CUO, período |
| `backend/src/accounting/accounting.service.ts` | `createJournalForInventoryEntry()` | MEDIO: asientos de compras |

### Reglas de Seguridad del Flujo

#### 1. NUNCA romper la transacción atómica
- `createEntry()` usa una **transacción Prisma** que crea Entry + Details + Series + actualiza Stock + InventoryHistory **todo junto**
- `executeSale()` usa una **transacción Prisma** que crea Sale + Details + reduce Stock + marca Series + registra Pagos + CashRegister **todo junto**
- **Si agregas un paso nuevo, DEBE estar DENTRO de la transacción existente** (no después)
- Si el paso nuevo puede fallar independientemente (como contabilidad), va FUERA de la transacción como post-operación no-bloqueante

#### 2. Stock: StoreOnInventory es la fuente de verdad
- `StoreOnInventory.stock` es el **único campo** que contiene el stock real
- Entradas: `stock: { increment: quantity }` (atómico)
- Ventas: `stock: storeInventory.stock - detail.quantity` (dentro de transacción)
- **NUNCA** hacer `stock = X` directo — siempre usar increment/decrement o calcular desde el valor leído dentro de la misma transacción
- `@@unique([productId, storeId])` en Inventory — un registro por producto por tienda

#### 3. Series (Números de Serie) son únicos por organización
- Constraint: `@@unique([organizationId, serial])` en `EntryDetailSeries`
- Al crear entrada: status = `"active"`
- Al vender: status = `"inactive"` (y serial va al array `SalesDetail.series`)
- Al eliminar venta: status vuelve a `"active"`
- **NUNCA** eliminar registros de EntryDetailSeries — solo cambiar status
- Endpoint de validación: `POST /api/series/check`

#### 4. Eliminación de ventas requiere reversión completa
- `deleteSale()` revierte TODO: stock, series, pagos, CashRegister, contabilidad
- **Ventas transmitidas a SUNAT NO se pueden eliminar** — requieren nota de crédito
- Verificación: `SunatTransmission` con status `'ACCEPTED'`

#### 5. Contabilidad es post-transaccional y no-bloqueante
- Los hooks de contabilidad (`postSale`, `postPurchase`) se ejecutan DESPUÉS de la transacción principal
- Usan 3 reintentos con backoff exponencial
- **Si fallan, la venta/entrada YA se creó** — la contabilidad se puede regenerar
- Cuentas PCGE usadas:
  - Ventas: 1041/1011 (cobro), 7011 (ingreso), 4011 (IGV), 6911 (costo venta), 2011 (inventario)
  - Compras: 2011 (inventario), 4011 (IGV), 1011/4211 (pago/cuenta por pagar)

#### 6. Validaciones que NO debes eliminar
- Stock suficiente antes de vender (`BadRequestException` si `stock < quantity`)
- Serie no duplicada antes de crear (`checkSeries` endpoint)
- Balance contable cuadrado (`debitTotal === creditTotal`) antes de crear JournalEntry
- `referenceId` único en Entry y Sales (evita duplicados por retry)

### Qué Verificar al Modificar Estos Módulos

**Antes de tocar entradas (`entries.service.ts`):**
- [ ] ¿El cambio está DENTRO o FUERA de la transacción? ¿Dónde debe estar?
- [ ] ¿Afecta la creación de `StoreOnInventory`? Verificar que el increment sea correcto
- [ ] ¿Toca `EntryDetailSeries`? Respetar el constraint unique por organización
- [ ] ¿El `InventoryHistory` refleja el cambio correctamente?
- [ ] ¿La contabilidad post-transacción sigue recibiendo los datos correctos?

**Antes de tocar ventas (`sales.service.ts`, `sales-helper.ts`):**
- [ ] ¿El cambio está DENTRO del `executeSale()` transaction block?
- [ ] ¿Afecta la reducción de stock? Verificar que sea consistente
- [ ] ¿Toca pagos/CashRegister? El balance debe ser correcto
- [ ] ¿`deleteSale()` puede revertir tu cambio correctamente?
- [ ] ¿Afecta InvoiceSales o CompanyDocumentSequence? Los correlativos son irrecuperables

**Antes de tocar contabilidad (`accounting/hooks/`, `journal-entry.service.ts`):**
- [ ] ¿Las cuentas PCGE son correctas para el tipo de operación?
- [ ] ¿El asiento cuadra (debe = haber)?
- [ ] ¿El `correlativo` se genera correctamente por organización y período?
- [ ] ¿Hay duplicados? Verificar detección de entries existentes

### Tablas Afectadas por Operación

| Operación | Tablas modificadas (en orden) |
|-----------|-------------------------------|
| **Crear entrada** | Entry → EntryDetail → EntryDetailSeries → Inventory (upsert) → StoreOnInventory (increment) → InventoryHistory → *AccEntry* → *JournalEntry* |
| **Crear venta** | Sales → SalesDetail → EntryDetailSeries (status→inactive) → StoreOnInventory (decrement) → InventoryHistory → SalePayment → CashTransaction → CashRegister (increment balance) → InvoiceSales → *JournalEntry* |
| **Eliminar venta** | StoreOnInventory (increment) → InventoryHistory → EntryDetailSeries (status→active) → CashRegister (decrement) → CashTransaction (delete) → SalePayment (delete) → SalesDetail (delete) → Sales (delete) → AccEntry (void) |
| **Producto con stock** | Product → (llama createEntry completo) |
| **Import Excel** | Por cada fila: Product (upsert) → Entry → EntryDetail → Inventory → StoreOnInventory → EntryDetailSeries |

*Cursiva = post-transacción, no-bloqueante*

## Recursos del Proyecto

- Documentación en `/docs`
- Guías de ayuda en `/fronted/public/help`
- Schemas de Prisma en `/backend/prisma/schema.prisma`
- Tipos compartidos generados desde Prisma

---

**Última actualización:** 2026-02-21
**Versión:** 1.5

Este archivo debe actualizarse cuando cambien convenciones, patrones o reglas importantes del proyecto.
