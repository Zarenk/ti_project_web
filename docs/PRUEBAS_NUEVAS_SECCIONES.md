# 🧪 Guía de Pruebas - Nuevas Secciones del Chatbot

**Fecha:** 2026-02-13
**Versión:** 1.0.0
**Commit:** `be0bc62`

---

## 📋 Resumen

Pruebas completas para verificar la integración de dos nuevas secciones del chatbot:

1. **Settings** (`/dashboard/options`) - 14 entradas
2. **Public Store** (`/store`, `/cart`) - 13 entradas

---

## 🤖 Pruebas Automatizadas

### Ejecutar Tests

```bash
# Desde la raíz del proyecto frontend
cd fronted

# Ejecutar solo los tests de las nuevas secciones
npm test -- new-sections.test.ts

# Ejecutar todos los tests del chatbot
npm test -- help

# Ejecutar con coverage
npm test -- --coverage new-sections.test.ts
```

### Qué Cubren los Tests Automatizados

✅ **Registro de Secciones** (2 tests)
- Settings section está registrada
- Public Store section está registrada

✅ **Detección de Rutas** (8 tests)
- `/dashboard/options` → `settings`
- `/store` → `public-store`
- `/cart` → `public-store`
- Nombres amigables de secciones

✅ **Matching de Queries - Settings** (10 tests)
- Configuración de empresa
- Cambio de logo
- Modo oscuro
- Respaldos
- Restauración
- Facturación electrónica
- Impresoras
- Moneda
- Impuestos
- Fuzzy matching con typos

✅ **Matching de Queries - Public Store** (11 tests)
- Navegación de productos
- Búsqueda
- Filtros
- Detalles de producto
- Carrito de compras
- Stock
- Precios
- Favoritos
- Métodos de pago
- Delivery
- Lenguaje orientado al cliente

✅ **Sugerencias Contextuales** (2 tests)
- Settings tiene 3 sugerencias relevantes
- Public Store tiene 3 sugerencias relevantes

✅ **Explicaciones de Sección** (3 tests)
- Generación de explicación para settings
- Generación de explicación para public-store
- Detección de preguntas sobre la sección

✅ **Validación de Queries** (2 tests)
- Queries de settings son válidas
- Queries de store son válidas

✅ **Análisis de Cobertura** (4 tests)
- Settings cubre 10+ temas principales
- Public Store cubre flujo completo de compra
- Todas las entradas tienen campos requeridos
- 80%+ de entradas tienen aliases

✅ **Tests de Integración** (3 tests)
- Settings integra sin conflictos
- Public Store integra sin conflictos
- Rutas no tienen conflictos con secciones existentes

✅ **Escenarios del Mundo Real** (5 tests)
- Admin configura empresa
- Admin personaliza branding
- Cliente busca producto
- Cliente compra producto
- Cliente pregunta por delivery

✅ **Tests de Performance** (2 tests)
- Búsqueda en settings < 100ms
- Búsqueda en store < 100ms

✅ **Salud General del Sistema** (4 tests)
- 20+ secciones totales
- 200+ entradas totales
- IDs únicos
- Todas las secciones tienen entradas

**Total: 60+ tests automatizados**

---

## 👨‍💻 Pruebas Manuales

### 1️⃣ Tooltip del Botón Flotante

**Objetivo:** Verificar que el tooltip aparece al pasar el mouse

**Pasos:**
1. Abre cualquier página del sistema (ej: `/dashboard`)
2. Localiza el botón flotante del chatbot (esquina inferior derecha)
3. Pasa el mouse sobre el botón (NO hagas clic)
4. **Esperado:** Debe aparecer un tooltip a la izquierda con el texto:
   - "Asistente de ayuda - Haz clic para abrir" (cuando está cerrado)
   - "Cerrar asistente" (cuando está abierto)
5. El tooltip debe tener animación smooth (fade-in)

**Criterios de Éxito:**
- ✅ Tooltip aparece al hacer hover
- ✅ Tooltip desaparece al quitar el mouse
- ✅ Tooltip se posiciona a la izquierda del botón
- ✅ Animación es suave y sin glitches
- ✅ Texto es legible y con buen contraste

---

### 2️⃣ Detección de Sección - Settings

**Objetivo:** Verificar que el chatbot detecta `/dashboard/options`

**Pasos:**
1. Navega a `/dashboard/options`
2. Abre el chatbot (clic en el botón flotante)
3. **Esperado:** El chatbot debe mostrar:
   - LocationIndicator con "Estás en **Configuración**"
   - 3 sugerencias contextuales:
     * "¿Cómo configuro la empresa?"
     * "¿Dónde cambio el logo?"
     * "¿Cómo activo la facturación electrónica?"

**Criterios de Éxito:**
- ✅ LocationIndicator muestra "Configuración"
- ✅ Se muestran 3 sugerencias relevantes
- ✅ Al hacer clic en una sugerencia, envía la query
- ✅ No muestra sugerencias genéricas de otras secciones

---

### 3️⃣ Detección de Sección - Public Store

**Objetivo:** Verificar que el chatbot detecta `/store`

**Pasos:**
1. Navega a `/store`
2. Abre el chatbot (clic en el botón flotante)
3. **Esperado:** El chatbot debe mostrar:
   - LocationIndicator con "Estás en **Tienda en Línea**"
   - 3 sugerencias contextuales:
     * "¿Cómo busco un producto?"
     * "¿Cómo filtro por categoría o precio?"
     * "¿Cómo funciona el carrito de compras?"

**Criterios de Éxito:**
- ✅ LocationIndicator muestra "Tienda en Línea"
- ✅ Se muestran 3 sugerencias relevantes para clientes
- ✅ Sugerencias son diferentes a las de settings
- ✅ Contexto cambia si navegas de /store a /cart

---

### 4️⃣ Queries de Settings - Configuración de Empresa

**Objetivo:** Probar matching de queries sobre configuración

**Queries a Probar:**

| Query | Resultado Esperado | Entry ID |
|-------|-------------------|----------|
| "cómo configuro mi empresa" | Explicación de configuración de empresa | `settings-company` |
| "cambiar el logo" | Instrucciones para subir logo | `settings-logo` |
| "modo oscuro" | Cómo cambiar tema | `settings-theme` |
| "hacer un respaldo" | Proceso de backup | `settings-backup` |
| "restaurar backup" | Proceso de restore | `settings-restore` |
| "facturación electrónica" | Setup de SUNAT | `settings-invoice` |
| "configurar impresora" | Config de impresoras | `settings-printer` |
| "cambiar moneda" | Cambio de divisa | `settings-currency` |
| "configurar impuestos" | Setup de IGV/IVA | `settings-tax` |
| "resetear configuración" | Restaurar defaults | `settings-reset` |

**Criterios de Éxito:**
- ✅ Todas las queries encuentran respuesta relevante
- ✅ Score de confianza > 0.7
- ✅ Respuestas son específicas y accionables
- ✅ Incluyen pasos cuando es apropiado

---

### 5️⃣ Queries de Public Store - Proceso de Compra

**Objetivo:** Probar matching de queries orientadas al cliente

**Queries a Probar:**

| Query | Resultado Esperado | Entry ID |
|-------|-------------------|----------|
| "cómo busco productos" | Uso del buscador | `store-search` |
| "filtrar por precio" | Uso de filtros | `store-filter` |
| "ver detalles del producto" | Página de detalles | `store-product-details` |
| "agregar al carrito" | Cómo usar el carrito | `store-cart` |
| "hay stock disponible" | Verificación de stock | `store-stock` |
| "precio con impuestos" | Información de precios | `store-prices` |
| "guardar favoritos" | Lista de deseos | `store-favorites` |
| "métodos de pago" | Formas de pago | `store-payment-methods` |
| "envío a domicilio" | Delivery | `store-delivery` |
| "contactar tienda" | Canales de contacto | `store-contact` |

**Criterios de Éxito:**
- ✅ Todas las queries encuentran respuesta
- ✅ Lenguaje orientado al cliente (no admin)
- ✅ Respuestas cubren flujo completo de compra
- ✅ Información clara sobre disponibilidad y precios

---

### 6️⃣ Pregunta Sobre la Sección Actual

**Objetivo:** Verificar que "qué hace esta sección" funciona

**Prueba en /dashboard/options:**
1. Navega a `/dashboard/options`
2. Abre el chatbot
3. Escribe: "qué hace esta sección"
4. **Esperado:** Respuesta debe incluir:
   ```
   📍 **Configuración** permite personalizar el sistema:
   • Configurar datos de la empresa
   • Cambiar logo y colores
   • Activar módulos y funcionalidades
   • Gestionar facturación electrónica

   **¿Necesitas ayuda con algo específico de esta sección?**
   ```

**Prueba en /store:**
1. Navega a `/store`
2. Abre el chatbot
3. Escribe: "para qué sirve esta parte"
4. **Esperado:** Respuesta debe incluir:
   ```
   📍 **Tienda en Línea** es el catálogo público para clientes:
   • Buscar y filtrar productos
   • Ver detalles y especificaciones
   • Agregar productos al carrito
   • Realizar compras en línea
   • Seguimiento de pedidos

   **¿Necesitas ayuda con algo específico de esta sección?**
   ```

**Criterios de Éxito:**
- ✅ Detecta variaciones: "qué hace esta sección", "para qué sirve", "dónde estoy"
- ✅ Respuesta es específica a la sección actual
- ✅ Incluye emoji 📍 y formateo con bullets
- ✅ No da respuesta genérica

---

### 7️⃣ Fuzzy Matching y Typos

**Objetivo:** Verificar que maneja errores ortográficos

**Queries con Typos:**

| Query con Error | Debe Encontrar |
|----------------|----------------|
| "konfigurar enpreza" | settings-company |
| "kanviar logo" | settings-logo |
| "buskar produkto" | store-search |
| "agrgar karrito" | store-cart |
| "rrespaldo datos" | settings-backup |

**Criterios de Éxito:**
- ✅ Encuentra respuesta correcta a pesar del typo
- ✅ Score puede ser más bajo pero > 0.6
- ✅ Puede mostrar "¿Quisiste decir...?"

---

### 8️⃣ Priorización por Sección Actual

**Objetivo:** Verificar boost de +15% para sección actual

**Pasos:**
1. Navega a `/dashboard/options`
2. Escribe query ambigua: "cómo cambio la configuración"
3. **Esperado:** Debe priorizar entries de `settings` sobre otras secciones
4. Navega a `/store`
5. Escribe query ambigua: "ver productos"
6. **Esperado:** Debe priorizar `store-browse` sobre `products` (admin)

**Criterios de Éxito:**
- ✅ Entries de la sección actual aparecen primero
- ✅ Score de sección actual es ~15% mayor
- ✅ Cambio de sección cambia los resultados

---

### 9️⃣ Aliases y Sinónimos

**Objetivo:** Verificar que aliases mejoran el matching

**Queries usando Aliases:**

**Settings:**
- "datos de la empresa" → settings-company
- "personalizar logo" → settings-logo
- "dark mode" → settings-theme
- "copia de seguridad" → settings-backup

**Public Store:**
- "catálogo de productos" → store-browse
- "encontrar artículo" → store-search
- "ordenar productos" → store-filter
- "shopping cart" → store-cart

**Criterios de Éxito:**
- ✅ Aliases funcionan tan bien como pregunta principal
- ✅ Score alto (> 0.8) para aliases
- ✅ Maneja términos en inglés cuando apropiado

---

### 🔟 Multi-Step Queries (Conversación)

**Objetivo:** Verificar contexto de conversación

**Escenario 1 - Settings:**
1. Usuario: "cómo configuro la empresa"
   - Esperado: settings-company
2. Usuario: "y el logo?"
   - Esperado: Debe entender que sigue hablando de configuración → settings-logo
3. Usuario: "puedo cambiar los colores también?"
   - Esperado: settings-theme

**Escenario 2 - Store:**
1. Usuario: "cómo busco productos"
   - Esperado: store-search
2. Usuario: "puedo filtrar por precio?"
   - Esperado: store-filter
3. Usuario: "y cómo compro?"
   - Esperado: store-cart

**Criterios de Éxito:**
- ✅ Mantiene contexto entre mensajes
- ✅ Entiende referencias ("y el logo?", "también?")
- ✅ No pierde el hilo de la conversación

---

## 📊 Checklist Final

### ✅ Funcionalidades Core
- [ ] Tooltip aparece en botón flotante
- [ ] Detección de `/dashboard/options` → settings
- [ ] Detección de `/store` → public-store
- [ ] Detección de `/cart` → public-store
- [ ] LocationIndicator muestra sección correcta
- [ ] Sugerencias contextuales son relevantes

### ✅ Settings Section (14 entradas)
- [ ] settings-company
- [ ] settings-logo
- [ ] settings-theme
- [ ] settings-layout
- [ ] settings-backup
- [ ] settings-restore
- [ ] settings-database-clean
- [ ] settings-modules
- [ ] settings-notifications
- [ ] settings-invoice
- [ ] settings-printer
- [ ] settings-currency
- [ ] settings-tax
- [ ] settings-reset

### ✅ Public Store Section (13 entradas)
- [ ] store-browse
- [ ] store-search
- [ ] store-filter
- [ ] store-product-details
- [ ] store-cart
- [ ] store-stock
- [ ] store-prices
- [ ] store-compare
- [ ] store-favorites
- [ ] store-login-benefits
- [ ] store-payment-methods
- [ ] store-delivery
- [ ] store-contact

### ✅ Características Avanzadas
- [ ] Fuzzy matching con typos
- [ ] Aliases funcionan correctamente
- [ ] Priorización por sección actual (+15%)
- [ ] Explicación de sección ("qué hace esta sección")
- [ ] Contexto de conversación multi-step
- [ ] Performance < 100ms por búsqueda

---

## 🐛 Reporte de Bugs

Si encuentras problemas, documenta:

**Formato:**
```markdown
### Bug: [Título descriptivo]

**Sección:** Settings / Public Store / Tooltip / Routing

**Pasos para Reproducir:**
1. ...
2. ...
3. ...

**Resultado Esperado:**
...

**Resultado Actual:**
...

**Severidad:** 🔴 Crítico / 🟡 Moderado / 🟢 Menor

**Screenshots:**
[Adjuntar si es posible]
```

---

## 📈 Métricas de Éxito

| Métrica | Objetivo | Método de Medición |
|---------|----------|-------------------|
| Tests Pasados | 100% | Suite automatizada |
| Coverage de Settings | 14/14 entradas | Test manual |
| Coverage de Store | 13/13 entradas | Test manual |
| Precisión de Matching | > 90% | 10 queries aleatorias |
| Tiempo de Respuesta | < 100ms | Performance tests |
| Tooltip Funcional | 100% | Test visual |
| Detección de Sección | 100% | Test de routing |

---

## ✅ Criterios de Aprobación

Para dar como aprobada esta feature:

- ✅ **60+ tests automatizados** pasan sin errores
- ✅ **Todas las pruebas manuales** (10 escenarios) completas
- ✅ **Tooltip** funciona en todos los navegadores
- ✅ **Detección de rutas** 100% precisa
- ✅ **No hay regresiones** en secciones existentes
- ✅ **Performance** dentro de límites (<100ms)
- ✅ **Cobertura** completa de ambas secciones

---

**Generado por:** Claude Sonnet 4.5
**Última actualización:** 2026-02-13
