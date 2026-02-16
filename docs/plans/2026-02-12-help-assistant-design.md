# Diseno: Asistente de Ayuda Inteligente para el Dashboard

**Fecha:** 2026-02-12
**Estado:** Aprobado

---

## Resumen

Asistente inteligente integrado en el dashboard que sirve como documentacion interactiva. Combina una mascota robot animada (Lottie 2D) con un panel de chat que responde preguntas sobre la plataforma usando un motor hibrido: base de conocimiento estatica (70-80% de consultas) con fallback a IA (Claude API) para preguntas no previstas.

## Decisiones de Diseno

| Aspecto | Decision |
|---------|----------|
| UI | Mascota animada (Lottie 2D) + panel de chat flotante |
| Motor | Hibrido: base estatica + IA fallback (Claude API) |
| Estilo visual | Robot/asistente 2D con 4 estados de animacion |
| Contexto | Totalmente contextual: detecta ruta, seccion y rol del usuario |
| Tips proactivos | Si, en primera visita a cada seccion |

---

## Arquitectura General

### Flujo del Usuario

```
Usuario navega a /dashboard/inventory
  -> Mascota detecta la ruta y carga contexto "inventario"
  -> Si es primera visita: mascota saluda con tip proactivo
  -> Click en mascota -> abre panel de chat
  -> Escribe pregunta
  -> Busqueda en knowledge base estatica
  -> Si match (score > 0.6): respuesta instantanea
  -> Si no match: fallback a API de IA (1-3s)
```

### Componentes Principales

| Componente | Responsabilidad |
|-----------|----------------|
| `HelpAssistantProvider` | Context provider: ruta, seccion, rol, estado, historial |
| `HelpMascot` | Lottie robot con estados: idle, waving, thinking, responding |
| `HelpChatPanel` | Panel de chat con input, mensajes, quick actions |
| `HelpKnowledgeBase` | Motor de busqueda estatica sobre archivos TS por seccion |
| Backend `HelpModule` | POST /api/help/ask: fallback IA + rate limiting + cache |

---

## La Mascota (HelpMascot)

**Posicion:** `position: fixed`, esquina inferior derecha (`bottom-6 right-6`).
**Tamano:** 56x56px desktop, 48x48px mobile.

### Estados de Animacion

| Estado | Cuando | Animacion |
|--------|--------|-----------|
| `idle` | Panel cerrado, sin actividad | Robot respira, parpadea cada ~4s |
| `waving` | Primera visita a seccion nueva | Robot saluda, muestra tooltip |
| `thinking` | Procesando pregunta | Robot mira arriba, puntos suspensivos |
| `responding` | Respuesta lista | Robot sonrie, gesto eureka |

### Interacciones
- Click: abre/cierra panel
- Hover: scale-up 1.05 con Framer Motion
- Pulse ring: cuando hay tip proactivo pendiente (animate-ping)

### Tooltip Proactivo
Primera visita a seccion -> tooltip encima de mascota con tip de 1-2 lineas + boton "Entendido". Secciones visitadas se trackean en localStorage.

---

## Panel de Chat (HelpChatPanel)

**Dimensiones:** 360px x 480px desktop. 100vw x 70vh mobile (Sheet bottom).

### Elementos
1. **Header**: nombre asistente + badge seccion actual + boton cerrar
2. **Bienvenida contextual**: cambia segun ruta. "Estas en [Seccion]..."
3. **Quick action chips**: 3-5 acciones comunes de la seccion (desde KB)
4. **Area de mensajes**: ScrollArea con burbujas. Markdown ligero
5. **Input**: Textarea autoexpandible + boton enviar
6. **Indicador de fuente**: sutil debajo de cada respuesta ("Base de conocimiento" / "IA")

### Comportamiento
- Historial persiste durante la sesion (no entre sesiones)
- Chips se actualizan al cambiar de pagina
- Respuestas estaticas: efecto typing (50ms/char)
- Respuestas IA: skeleton + "Pensando..."

---

## Knowledge Base Estatica

### Estructura de Archivos

```
fronted/src/data/help/
  types.ts          - Tipos: HelpEntry, HelpSection
  search.ts         - Motor de busqueda fuzzy + scoring
  index.ts          - Registry + route map + exports
  sections/
    inventory.ts    - 17 archivos, uno por seccion
    products.ts
    sales.ts
    ...
    general.ts      - Preguntas generales
```

### Tipos

```typescript
interface HelpEntry {
  id: string                    // "inventory-view-stock"
  question: string              // Pregunta canonica
  aliases: string[]             // Variaciones
  answer: string                // Respuesta markdown
  relatedActions?: string[]     // IDs relacionados
  route?: string                // Ruta donde aplica
  roles?: string[]              // Roles que ven esta entrada
}

interface HelpSection {
  id: string
  label: string
  description: string
  welcomeMessage: string
  quickActions: string[]        // IDs de entries para chips
  entries: HelpEntry[]
}
```

### Motor de Busqueda
- Normaliza texto (sin acentos, lowercase, trim)
- Score: exact match (1.0) > partial word (0.7) > substring (0.4)
- Bonus +0.2 si entry pertenece a seccion actual
- Score > 0.6: respuesta estatica
- Score <= 0.6: fallback a IA

### Cobertura
~15-20 entries por seccion x 17 secciones = ~300 preguntas predefinidas.

---

## Backend - Fallback IA

### Endpoint

```
POST /api/help/ask
Auth: JWT requerido
Body: { question: string, section: string, route: string }
Response: { answer: string, source: "ai" }
```

### Rate Limiting
5 consultas IA por minuto por usuario. Respuestas estaticas no cuentan.

### Cache
Respuestas cacheadas en memoria por 1 hora. Clave: `section + normalized_question`.

### System Prompt Template

```
Eres el asistente de ayuda de ADSLab.
Respondes SOLO sobre funcionalidades del sistema.
El usuario esta en la seccion: {sectionLabel}
Su rol es: {userRole}
Funcionalidades disponibles: {sectionDescription}
Acciones principales: {actionsList}
Responde concisamente (max 150 palabras).
```

### Costo Estimado
Con Claude Haiku: ~$0.001-0.003 por consulta. ~$0.05-0.10/mes por usuario activo.

---

## Sistema de Contexto

### HelpAssistantProvider State

```typescript
{
  currentRoute: string          // usePathname()
  currentSection: string        // derivado de ruta
  sectionMeta: HelpSection      // de knowledge base
  userRole: string              // de useAuth()
  userPermissions: string[]     // de auth context
  isOpen: boolean               // panel abierto/cerrado
  mascotState: string           // idle, waving, thinking, responding
  messages: ChatMessage[]       // historial de sesion
  visitedSections: Set<string>  // desde localStorage
}
```

### Deteccion de Seccion
Mapa de rutas -> seccion. Match por ruta mas especifica primero.

### Flujo de Cambio de Ruta
1. usePathname() cambia
2. resolveSection() determina nueva seccion
3. Carga sectionMeta (import dinamico)
4. Si primera visita: mascotState = "waving" + tooltip
5. Si panel abierto: actualiza header y chips

### Integracion en Layout

```
TenantSelectionProvider
  -> TenantFeaturesProvider
    -> HelpAssistantProvider        <- nuevo
      -> AppSidebar + SidebarInset
```

---

## Plan de Archivos

### Crear (31 archivos)

**Frontend Core (4):**
1. `fronted/src/context/help-assistant-context.tsx` (~150 lineas)
2. `fronted/src/components/help/HelpMascot.tsx` (~100 lineas)
3. `fronted/src/components/help/HelpChatPanel.tsx` (~200 lineas)
4. `fronted/src/components/help/HelpAssistant.tsx` (~60 lineas)

**Frontend Knowledge Base (19):**
5. `fronted/src/data/help/types.ts` (~30 lineas)
6. `fronted/src/data/help/search.ts` (~80 lineas)
7. `fronted/src/data/help/index.ts` (~40 lineas)
8-24. `fronted/src/data/help/sections/*.ts` (17 archivos, ~60 lineas c/u)

**Backend (3):**
25. `backend/src/help/help.controller.ts` (~60 lineas)
26. `backend/src/help/help.service.ts` (~100 lineas)
27. `backend/src/help/help.module.ts` (~15 lineas)

**Assets (4):**
28-31. `fronted/public/lottie/help-robot-*.json` (4 animaciones Lottie)

### Modificar (2)
32. `fronted/src/app/dashboard/layout.tsx` - agregar provider + componente
33. `backend/src/app.module.ts` - registrar HelpModule

### Orden de Implementacion

| Fase | Tarea | Dependencia |
|------|-------|-----------|
| 1 | Tipos + search + route map | - |
| 2 | HelpAssistantProvider | Fase 1 |
| 3 | HelpMascot (Lottie) | Assets |
| 4 | HelpChatPanel | Fase 1, 2 |
| 5 | Wrapper + layout | Fase 2, 3, 4 |
| 6 | Backend HelpModule | - (paralelo) |
| 7 | Conectar frontend-backend | Fase 5, 6 |
| 8 | Poblar 17 secciones KB | Fase 1 |
