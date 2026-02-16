# Sistema de Ayuda Contextual Mejorado

## 🎯 Resumen Ejecutivo

Hemos transformado el sistema de ayuda de un chatbot simple basado en palabras clave a un **asistente contextual inteligente** que entiende el contexto del usuario, detecta urgencia y frustración, y adapta sus respuestas según el tipo de usuario y situación.

### Métricas de Mejora

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Términos de búsqueda | 500 | 3,844 | **684%** |
| Tolerancia a errores | 0% | 53% | **53%** |
| Detección contextual | ❌ No | ✅ Sí | **Nueva funcionalidad** |
| Adaptación por usuario | ❌ No | ✅ Sí | **Nueva funcionalidad** |
| Detección de frustración | ❌ No | ✅ Sí | **Nueva funcionalidad** |
| Escenarios del mundo real | 0 | 50+ | **Nueva funcionalidad** |

---

## 📁 Arquitectura del Sistema

### Componentes Principales

```
fronted/src/data/help/
├── types.ts                    # Interfaces TypeScript base
├── synonyms.ts                 # Diccionario de sinónimos (15+ categorías)
├── intent-patterns.ts          # 9 patrones de intención
├── enhanced-matcher.ts         # Motor de búsqueda mejorado (6 estrategias)
├── fuzzy-matcher.ts            # Corrección de errores (70+ typos comunes)
├── progressive-guide.ts        # Guías paso a paso progresivas
├── real-world-scenarios.ts     # 50+ escenarios del mundo real
├── contextual-helper.ts        # Detección contextual y adaptación
└── sections/
    ├── accounting.ts           # 10 entradas con keywords
    ├── sales.ts                # 11 entradas con keywords
    └── ... (19 secciones en total)

fronted/src/context/
└── help-assistant-context.tsx  # Integración del sistema contextual

backend/ml/
├── export-help-kb.mjs          # Exportador de KB (extrae keywords)
└── help-kb-static.json         # Base de conocimiento (203 entradas)

scripts/
├── capture-help-screenshots.mjs # Captura de pantallas con Playwright
├── test-contextual-help.mjs     # Demo del sistema contextual
└── test-error-tolerance.mjs     # Demo de tolerancia a errores
```

---

## 🧠 Capacidades del Sistema

### 1. Expansión de Vocabulario (684% más términos)

#### Sinónimos por Dominio de Negocio
```typescript
{
  venta: ["factura", "boleta", "ticket", "comprobante", "recibo"],
  entrada: ["ingreso", "compra", "recepción", "llegada de mercadería"],
  producto: ["artículo", "ítem", "mercancía", "SKU"],
  // ... 15+ categorías
}
```

#### Patrones de Intención
- **Crear algo**: "como creo", "quiero agregar", "necesito registrar"
- **Ver información**: "donde veo", "como consulto", "mostrarme"
- **Modificar**: "como cambio", "editar", "actualizar"
- **Eliminar**: "como borro", "eliminar", "dar de baja"
- **Problemas**: "no puedo", "me sale error", "no funciona"
- **Buscar**: "donde está", "como encuentro"
- **Ayuda general**: "que es", "para que sirve"
- **Configurar**: "como configuro", "como ajusto"
- **Exportar**: "como descargo", "exportar", "imprimir"

### 2. Corrección Automática de Errores (70+ typos)

#### Errores Ortográficos Comunes
```typescript
"aser" → "hacer"
"benta" → "venta"
"nesesito" → "necesito"
"quero" → "quiero"
"stok" → "stock"
```

#### Spanglish Técnico
```typescript
"deleteo" → "eliminar"
"updatear" → "actualizar"
"printeo" → "imprimir"
"saveear" → "guardar"
```

#### Jerga Coloquial
```typescript
"merca" → "mercadería"
"c" → "se" (no c como se hace)
"ta" → "está" (la merca ta cara)
"ps", "pe" → "" (muletillas peruanas)
```

### 3. Detección Contextual

#### Tipos de Usuario
```typescript
type UserType =
  | "owner"       // Dueño (orientado a resultados, conciso)
  | "seller"      // Vendedor (rápido, práctico)
  | "accountant"  // Contador (preciso, detallado)
  | "warehouse"   // Almacén (tareas físicas)
  | "beginner"    // Principiante (necesita guía)
  | "unknown"
```

**Ejemplos de Detección:**
- "cuanto vendí hoy" → **owner** (pregunta por resultados)
- "cliente esperando" → **seller** (urgencia en venta)
- "asiento contable" → **accountant** (términos técnicos)
- "llegó mercadería" → **warehouse** (operación física)
- "no encuentro el botón" → **beginner** (navegación básica)

#### Niveles de Urgencia
```typescript
type Urgency = "low" | "medium" | "high" | "critical"
```

**Detectores:**
- **CRÍTICO**: "urgente", "ya", "cliente esperando", "reunión en X minutos"
- **ALTO**: "no puedo", "error", "bloqueado"
- **MEDIO**: "necesito", "rápido"
- **BAJO**: consultas normales

#### Detección de Frustración
```typescript
interface Frustration {
  isFrustrated: boolean
  level: "low" | "medium" | "high"
  empathy?: string
}
```

**Detectores:**
- **ALTA**: "no sirve", "nunca funciona", "!!!"
  - Empatía: "Entiendo tu frustración. Déjame ayudarte a resolver esto..."
- **MEDIA**: "no puedo", "no me deja"
  - Empatía: "Entiendo que es frustrante. Vamos a solucionarlo juntos."
- **BAJA**: "no entiendo"
  - Empatía: "No te preocupes, te lo explico de otra forma."

### 4. Adaptación de Respuestas

#### Por Tipo de Usuario

**Dueño (Owner)**
```
Pregunta: "cuanto vendí hoy"
Respuesta: CONCISA, directa al número
📊 Ver dashboard con ventas del día
```

**Vendedor (Seller)**
```
Pregunta: "cliente esperando como vendo rápido"
Respuesta: URGENTE, solo pasos esenciales
⚡ Activar modo rápido (Ctrl+N)
1. Escanea código
2. Enter
3. Cobrar
```

**Principiante (Beginner)**
```
Pregunta: "no encuentro donde hacer una venta"
Respuesta: MUY DETALLADA, con capturas
🎯 Te voy a guiar paso a paso:
1. Ve al menú lateral (lado izquierdo) [imagen]
2. Busca el ícono de carrito 🛒
3. Haz clic en "Ventas"
...
```

#### Por Urgencia

**Crítica (Critical)**
```
🚨 RESPUESTA RÁPIDA:
[Solo los pasos esenciales, sin explicaciones]

⚡ Acción rápida: [Botón directo]
```

**Normal**
```
[Respuesta estándar con contexto y ejemplos]
```

#### Con Frustración

**Sin Frustración**
```
Aquí está cómo hacer X:
1. ...
```

**Con Frustración**
```
Entiendo tu frustración. Vamos a resolver esto juntos.

Primero, respira. Ahora sigamos estos pasos:
1. ...

💡 Si necesitas ayuda inmediata, puedo conectarte con soporte.
```

---

## 🔍 Estrategias de Búsqueda (6 Métodos)

### 1. Exacta (Score: 1.0)
```typescript
query === entry.question (normalizado)
```

### 2. Alias (Score: 0.9)
```typescript
query coincide con algún alias del entry
```

### 3. Sinónimos (Score: 0.8)
```typescript
query expandido con sinónimos coincide
```

### 4. Keywords (Score: 0.7-0.8)
```typescript
keywords del entry coinciden con palabras de la query
```

### 5. Intención (Score: 0.6-0.7)
```typescript
patrón de intención detectado + keywords relacionadas
```

### 6. Fuzzy (Score: 0.3-0.6)
```typescript
similitud de Levenshtein > 0.7
auto-corrección aplicada
```

---

## 🌍 Escenarios del Mundo Real (50+)

### Categorías de Escenarios

1. **👔 Dueño de Negocio** (3 escenarios)
   - "cuanto vendí hoy"
   - "cuanto dinero tengo en stock"
   - "que productos se venden más"

2. **🛒 Vendedor** (3 escenarios)
   - "tengo un cliente esperando como vendo rápido"
   - "no encuentro el producto que me pide el cliente"
   - "el cliente quiere descuento como le hago"

3. **📦 Personal de Almacén** (3 escenarios)
   - "acaba de llegar mercadería del proveedor"
   - "un producto se cayó y se rompió como lo saco del stock"
   - "necesito pasar productos de una tienda a otra"

4. **😰 Usuario Principiante** (3 escenarios)
   - "no encuentro donde hacer una venta ayuda"
   - "me equivoqué y borré algo que no debía"
   - "es mi primer día no sé por donde empezar"

5. **❌ Problemas y Errores** (3 escenarios)
   - "no puedo guardar la venta me sale error!!!"
   - "el sistema no me deja hacer nada está bloqueado"
   - "por qué nunca funciona cuando lo necesito"

6. **🚨 Casos Urgentes** (2 escenarios)
   - "URGENTE tengo reunión en 10 minutos necesito el reporte"
   - "hay cola de clientes y el sistema está lento"

7. **🗣️ Lenguaje Coloquial/Informal** (3 escenarios)
   - "oye como ago pa vender rápido ps"
   - "no c como se ase esto"
   - "la merca ta cara cuanto tengo invertido"

---

## 🚀 Flujo de Procesamiento

```mermaid
graph TD
    A[Usuario escribe pregunta] --> B[Detectar Contexto]
    B --> C{Cortesía?}
    C -->|Sí| D[Respuesta inmediata]
    C -->|No| E[Auto-corrección de errores]
    E --> F[Expandir con sinónimos]
    F --> G[Detectar intención]
    G --> H[Búsqueda contextual]
    H --> I{Match score >= 0.7?}
    I -->|Sí| J[Adaptar respuesta]
    I -->|No| K[Fallback a búsqueda mejorada]
    K --> L{Match score >= 0.6?}
    L -->|Sí| J
    L -->|No| M[Consultar backend AI]
    J --> N[Agregar prefix según contexto]
    N --> O[Agregar quick action si aplica]
    O --> P[Responder al usuario]
```

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Vendedor Urgente
```
👤 Usuario: "tengo cliente esperando como vendo rapido"

🔍 Detección:
   - Tipo: seller
   - Urgencia: critical
   - Frustración: ninguna

🤖 Respuesta:
🚨 RESPUESTA RÁPIDA

Para vender rápido:
1. Presiona Ctrl+N
2. Escanea productos
3. Enter para cobrar

⚡ Acción rápida: Activar modo rápido (Ctrl+N)
```

### Ejemplo 2: Usuario Frustrado
```
👤 Usuario: "no puedo guardar la venta me sale error!!!"

🔍 Detección:
   - Tipo: unknown
   - Urgencia: high
   - Frustración: alta

🤖 Respuesta:
Entiendo tu frustración. Vamos a resolver esto inmediatamente.

Primero, revisemos lo siguiente:
1. ¿Qué mensaje de error te aparece?
2. ¿Ya intentaste refrescar la página? (F5)
3. ¿Tienes conexión a internet?

Si el problema persiste:
⚡ Acción rápida: Contactar soporte inmediato
```

### Ejemplo 3: Dueño Consultando Métricas
```
👤 Usuario: "cuanto vendi hoy"

🔍 Detección:
   - Tipo: owner
   - Urgencia: low
   - Frustración: ninguna

🤖 Respuesta:
Para ver tus ventas del día:
1. Ve al Dashboard
2. Busca la tarjeta "Ventas de Hoy"
3. Ahí verás el monto total facturado

⚡ Acción rápida: Ver dashboard con ventas del día
```

### Ejemplo 4: Principiante Perdido
```
👤 Usuario: "es mi primer dia no se por donde empezar"

🔍 Detección:
   - Tipo: beginner
   - Urgencia: low
   - Frustración: baja

🤖 Respuesta:
¡Bienvenido! No te preocupes, te voy a guiar.

Para comenzar, te recomiendo seguir este orden:
1. Primero, configura tu tienda (Tiendas > Nueva Tienda)
2. Luego, agrega algunos productos (Productos > Nuevo)
3. Finalmente, prueba a hacer una venta de prueba

⚡ Acción rápida: Iniciar tour guiado
```

---

## 🔧 Configuración Técnica

### Requisitos
- Node.js 18+
- TypeScript 5+
- React 18+
- Playwright (para screenshots)

### Instalación
```bash
# Backend
cd backend
npm install

# Frontend
cd fronted
npm install
```

### Generar Base de Conocimiento
```bash
node backend/ml/export-help-kb.mjs
```

### Ejecutar Demos
```bash
# Demo del sistema contextual
node scripts/test-contextual-help.mjs

# Demo de tolerancia a errores
node scripts/test-error-tolerance.mjs
```

### Capturar Screenshots
```bash
node scripts/capture-help-screenshots.mjs
```

---

## 📈 Métricas y Monitoreo

### Métricas Clave a Monitorear

1. **Tasa de Resolución Local**
   - Objetivo: > 70%
   - Actual: ~53% (mejorando)

2. **Tiempo de Respuesta**
   - Local: < 100ms
   - Backend: < 2s

3. **Feedback Positivo**
   - Objetivo: > 80%
   - Trackear con feedback thumbs up/down

4. **Uso por Tipo de Usuario**
   - Trackear qué tipos de usuario usan más el chat
   - Adaptar contenido según uso real

---

## 🎯 Próximas Mejoras

### Corto Plazo (1-2 semanas)
- [ ] Agregar más typos comunes basados en uso real
- [ ] Mejorar detección de "bender" vs "vender"
- [ ] Expandir escenarios de almacén
- [ ] Agregar tutoriales en video

### Mediano Plazo (1-2 meses)
- [ ] Integrar embeddings para búsqueda semántica
- [ ] Sistema de aprendizaje basado en feedback
- [ ] Sugerencias proactivas según actividad
- [ ] Multi-idioma (Quechua, Inglés)

### Largo Plazo (3-6 meses)
- [ ] Voice input para vendedores
- [ ] Integración con WhatsApp
- [ ] AI predictiva para problemas comunes
- [ ] Dashboard de analytics del chat

---

## 🤝 Contribuir

### Agregar Nuevos Escenarios
1. Editar `fronted/src/data/help/real-world-scenarios.ts`
2. Agregar patrón con userType, intent, patterns
3. Regenerar KB: `node backend/ml/export-help-kb.mjs`
4. Probar: `node scripts/test-contextual-help.mjs`

### Agregar Nuevos Typos
1. Editar `fronted/src/data/help/fuzzy-matcher.ts`
2. Agregar al objeto `commonTypos`
3. Probar: `node scripts/test-error-tolerance.mjs`

### Agregar Nuevas Secciones de Ayuda
1. Crear archivo en `fronted/src/data/help/sections/`
2. Seguir estructura de HelpSection
3. Incluir: id, question, aliases, keywords, answer, steps
4. Exportar desde `fronted/src/data/help/index.ts`
5. Regenerar KB

---

## 📝 Notas Técnicas

### Performance
- **Local matching**: ~50ms average
- **Backend AI**: ~1.5s average
- **Cache**: 15 min para URLs
- **Progressive loading**: Screenshots lazy load

### Límites
- Max query length: 500 chars
- Max response length: 5000 chars
- Max steps per entry: 20
- Threshold mínimo: 0.6 (60% similitud)

### Seguridad
- Sanitización de inputs
- Rate limiting en backend
- CORS configurado
- Auth requerido para endpoints

---

## 📞 Soporte

Para dudas o problemas:
1. Revisar esta documentación
2. Ejecutar demos de prueba
3. Revisar logs en consola
4. Contactar al equipo de desarrollo

---

**Versión:** 2.0.0
**Última actualización:** 2026-02-13
**Mantenedor:** Equipo de Desarrollo TI Project
