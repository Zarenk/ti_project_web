# Ad Generator — Product-to-Social-Media Pipeline

> **Estado:** Aprobado — pendiente de implementacion
> **Fecha:** 2026-02-21
> **Branch:** crear desde `develop` al iniciar

---

## Resumen Ejecutivo

Sistema semi-automatico que genera publicidad para redes sociales a partir de productos del inventario. Usa Gemini Flash para generar copy + imagenes, ofrece editor drag-and-drop (react-konva) para personalizar, y publica a Facebook, Instagram y TikTok.

**Flujo:** Producto creado -> panel inline "Promocionar" -> IA genera 3 opciones -> usuario edita en canvas visual -> selecciona redes -> publica.

---

## Decisiones de Diseno

| Decision | Eleccion | Razon |
|----------|---------|-------|
| Flujo | Semi-automatico | Control del usuario sin ser tedioso |
| Contenido IA | Copy + imagen editada por IA | Imagenes unicas, diferenciador premium |
| Proveedor IA | Google Gemini Flash | Barato, Vision nativo, tier gratuito generoso |
| Redes sociales | Facebook + Instagram + TikTok | Cobertura completa |
| UX principal | Panel inline post-creacion | No intrusivo, accesible tambien desde lista |
| Editor | Drag-and-drop con react-konva | Editor real tipo Canva lite |
| Imagenes | Gemini Image generation | Imagenes unicas ~$0.04/imagen |

---

## Costos Estimados por Generacion

| Operacion | Costo |
|-----------|-------|
| Gemini Vision (analizar imagen) | ~$0.00015 |
| Gemini Text (3 variaciones copy) | ~$0.0005 |
| Gemini Image (3 imagenes) | ~$0.12 |
| **Total por producto** | **~$0.12 (~S/ 0.45)** |

100 productos/mes = ~$12/mes | 500 productos/mes = ~$60/mes

---

## Arquitectura Backend

```
POST /ads/generate-from-product
Body: { productId, tone?, style? }
        |
        v
  AdsService.generateFromProduct()
        |
        v
  GeminiAdapter (NUEVO)
  |-- analyzeProduct(image, data)   -> Vision: analiza imagen + datos
  |-- generateAdCopy(analysis, tone) -> 3 variaciones (titulo, desc, hashtags, CTA)
  |-- generateAdImage(image, style)  -> 3 imagenes publicitarias
        |
        v
  Guarda 3 Creatives en BD -> retorna al frontend

POST /ads/publish
Body: { creativeId, networks: ['facebook','instagram','tiktok'] }
        |
        v
  PublishService (existente)
  |-- Queue (BullMQ) -> Worker
  |-- facebook.adapter.ts  (Meta Graph API)
  |-- instagram.adapter.ts (Container -> Publish flow)
  |-- tiktok.adapter.ts    (Content Posting API)
```

### Archivos Backend

| Archivo | Accion | Proposito |
|---------|--------|-----------|
| `ads/providers/gemini.adapter.ts` | Crear | Integracion Gemini: Vision + Text + Image |
| `ads/providers/interfaces.ts` | Modificar | Agregar interface para text/image generation |
| `ads/ads.service.ts` | Modificar | Implementar generateFromProduct() |
| `ads/ads.controller.ts` | Modificar | Endpoint POST /ads/generate-from-product |
| `publish/adapters/facebook.adapter.ts` | Implementar | Meta Graph API page post |
| `publish/adapters/instagram.adapter.ts` | Implementar | Meta Graph API container + publish |
| `publish/adapters/tiktok.adapter.ts` | Implementar | TikTok Content Posting API |
| `ads/ads.queue.ts` | Modificar | Conectar publicacion a adapters reales |

### Gemini Adapter — Detalle

```typescript
// ads/providers/gemini.adapter.ts
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiAdapter {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  // 1. Vision: analiza producto
  async analyzeProduct(imageUrl: string, productData: ProductContext): Promise<ProductAnalysis> {
    // Gemini Flash con imagen + datos del producto
    // Retorna: colores dominantes, tipo de producto, mood, audiencia objetivo
  }

  // 2. Text: genera 3 variaciones de copy
  async generateAdCopy(
    analysis: ProductAnalysis,
    productData: ProductContext,
    tone: 'profesional' | 'casual' | 'urgente' | 'aspiracional',
  ): Promise<AdCopyVariation[]> {
    // Prompt contextualizado al mercado peruano (soles, jerga local)
    // Retorna 3 variaciones: { title, description, hashtags, cta }
  }

  // 3. Image: genera imagenes publicitarias
  async generateAdImage(
    imageUrl: string,
    style: 'moderno' | 'minimalista' | 'vibrante' | 'elegante',
    copyText: string,
  ): Promise<string[]> {
    // Gemini Imagen: producto + diseno publicitario
    // Retorna URLs de 3 imagenes generadas
  }
}

interface ProductContext {
  name: string;
  description?: string;
  price: number;
  priceSell?: number;
  brand?: string;
  category?: string;
  features?: Array<{ title: string; description?: string }>;
  images: string[];
}

interface AdCopyVariation {
  title: string;        // Max 60 chars (FB limit)
  description: string;  // Max 200 chars
  hashtags: string[];   // 5-10 relevantes
  cta: string;          // Call to action
  tone: string;         // Tono usado
}
```

---

## Arquitectura Frontend

### Panel Post-Creacion (Fase 2)

Aparece inline despues de guardar producto. NO es modal (el usuario acaba de completar un form largo).

```
+--------------------------------------------------------------------+
|  Producto "Laptop ASUS ROG" creado correctamente                    |
|                                                                      |
|  +----------------------------------------------------------------+ |
|  | Promocionar este producto                                       | |
|  |                                                                 | |
|  | Tono: [Profesional v]   Estilo: [Moderno v]                   | |
|  | [Generar 3 opciones]                      [Ahora no]           | |
|  +----------------------------------------------------------------+ |
|                                                                      |
|  +----------------+  +----------------+  +----------------+         |
|  | [Imagen IA #1] |  | [Imagen IA #2] |  | [Imagen IA #3] |         |
|  | Titulo copy #1 |  | Titulo copy #2 |  | Titulo copy #3 |         |
|  | #hashtags      |  | #hashtags      |  | #hashtags      |         |
|  | [Editar] [Usar]|  | [Editar] [Usar]|  | [Editar] [Usar]|         |
|  +----------------+  +----------------+  +----------------+         |
|                                                                      |
|  Publicar en: [x] Facebook [x] Instagram [ ] TikTok                |
|  [Publicar ahora]    [Programar]    [Guardar borrador]              |
+--------------------------------------------------------------------+
```

### Editor Drag-and-Drop (Fase 3)

Se abre al hacer click en "Editar" en cualquier card. Layout 3 columnas:

```
+------------------------------------------------------------------+
| Editor de Publicidad                                       [X]    |
|                                                                   |
| Capas:       |  Canvas react-konva          | Propiedades:       |
| = Titulo     |  +----------------------+    | Seleccionado:      |
| = Subtitulo  |  |                      |    | "Titulo"           |
| = Precio     |  |  [PRODUCTO]          |    |                    |
| = CTA        |  |  (draggable)         |    | Texto: [...]       |
| = Producto   |  |                      |    | Fuente: [Inter v]  |
| = Fondo      |  |  "Titulo" (drag)     |    | Tamano: [32]       |
|              |  |  "S/ 3,499" (drag)   |    | Color: [#FFF]      |
| [+ Texto]    |  |  [CTA btn] (drag)    |    | Rotacion: [0]      |
| [+ Forma]    |  |                      |    | Opacidad: [100%]   |
| [+ Imagen]   |  +----------------------+    |                    |
|              |                               | Posicion:          |
| Ratio:       |                               | X: [120] Y: [340]  |
| [1:1][4:5]   |                               |                    |
| [9:16][16:9] |                               |                    |
|              |                                                    |
| [Templates]  [Regenerar IA]  [Guardar]  [Exportar PNG]           |
+------------------------------------------------------------------+
```

**Tecnologia:** react-konva (MIT license, React-native canvas)
- Stage + Layer para el canvas
- Draggable nodes para cada elemento
- Transformer para resize/rotate
- stage.toDataURL() para export

### Archivos Frontend

| Archivo | Accion | Proposito |
|---------|--------|-----------|
| `products/new/components/ad-generator-panel.tsx` | Crear | Panel inline post-creacion |
| `products/new/components/ad-option-card.tsx` | Crear | Card con preview de opcion |
| `components/ads/ad-editor.tsx` | Crear | Editor principal react-konva |
| `components/ads/layers-panel.tsx` | Crear | Lista de capas (reorder) |
| `components/ads/properties-panel.tsx` | Crear | Sidebar de propiedades |
| `components/ads/canvas-elements.tsx` | Crear | Elementos draggable (text, img, shape) |
| `components/ads/network-selector.tsx` | Crear | Checkboxes de redes |
| `components/ads/templates/` | Crear | 3-5 templates predefinidos |
| `products/ads.api.tsx` | Crear | API client para generacion/publicacion |
| `app/api/ads/generate/route.ts` | Crear | Proxy al backend |
| `app/api/ads/publish/route.ts` | Crear | Proxy al backend |
| `products/new/product-form.tsx` | Modificar | Integrar AdGeneratorPanel |

### Animaciones

- Panel aparece: `animate-in fade-in slide-in-from-bottom-4 duration-500`
- Cards opciones: entrada escalonada `delay-100`, `delay-200`, `delay-300`
- Card seleccionada: `ring-2 ring-primary scale-[1.02] transition-all`
- Loading: skeleton pulses mientras Gemini genera (~5-8 seg)
- Editor abre: `animate-in fade-in zoom-in-95 duration-300`

---

## Fases de Implementacion

### Fase 1 — Backend Gemini + Generacion

**Objetivo:** POST /ads/generate-from-product devuelve 3 variaciones.

| # | Tarea | Dependencia |
|---|-------|-------------|
| 1.1 | Instalar `@google/genai` en backend | API key Gemini |
| 1.2 | Crear GeminiAdapter con analyzeProduct() | 1.1 |
| 1.3 | Implementar generateAdCopy() — 3 variaciones | 1.2 |
| 1.4 | Implementar generateAdImage() — 3 imagenes | 1.2 |
| 1.5 | Implementar AdsService.generateFromProduct() | 1.2-1.4 |
| 1.6 | Endpoint en controller + proxy route frontend | 1.5 |
| 1.7 | Guardar creatives en BD (modelo existente) | 1.5 |

**Verificacion:** curl al endpoint retorna 3 variaciones con copy + URLs de imagenes.

### Fase 2 — Panel Post-Creacion

**Objetivo:** UI basica para ver opciones y seleccionar.

| # | Tarea |
|---|-------|
| 2.1 | AdGeneratorPanel con selectors de tono/estilo |
| 2.2 | AdOptionCard con preview imagen + copy |
| 2.3 | Integrar en product-form.tsx (onSuccess callback) |
| 2.4 | API client (ads.api.tsx) |
| 2.5 | Loading states + animaciones |
| 2.6 | Boton "Promocionar" en lista de productos |

**Verificacion:** Crear producto -> ver 3 cards -> seleccionar una.

### Fase 3 — Editor Drag-and-Drop

**Objetivo:** Editor visual completo con react-konva.

| # | Tarea |
|---|-------|
| 3.1 | Instalar react-konva + setup canvas base |
| 3.2 | Implementar draggable text elements |
| 3.3 | Implementar draggable image elements |
| 3.4 | Layers panel (lista + reorder) |
| 3.5 | Properties sidebar (fuente, color, posicion, opacidad) |
| 3.6 | Aspect ratio switcher (1:1, 4:5, 9:16, 16:9) |
| 3.7 | Export a PNG/JPG (stage.toDataURL) |
| 3.8 | 3-5 templates predefinidos |
| 3.9 | Boton "Regenerar con IA" dentro del editor |

**Verificacion:** Abrir editor -> drag elementos -> cambiar estilos -> exportar PNG.

### Fase 4 — Publicacion a Redes Sociales

**Objetivo:** Publicar diseno aprobado a FB, IG, TikTok.

| # | Tarea |
|---|-------|
| 4.1 | Implementar facebook.adapter.ts (Meta Graph API) |
| 4.2 | Implementar instagram.adapter.ts (Container -> Publish) |
| 4.3 | Implementar tiktok.adapter.ts (Content Posting API) |
| 4.4 | NetworkSelector UI + boton publicar |
| 4.5 | Conectar BullMQ queue a adapters reales |
| 4.6 | Status de publicacion (success/error UI) |
| 4.7 | Configuracion de cuentas de redes por organizacion |

**Verificacion:** Publicar -> ver confirmacion con link al post en la red.

### Dependencias Externas (critico)

| Red | Requisito | Tiempo estimado |
|-----|-----------|-----------------|
| Facebook | Facebook App con permiso `pages_manage_posts` | 1-2 semanas review |
| Instagram | Misma Facebook App + `instagram_content_publish` | Incluido en FB review |
| TikTok | TikTok for Business developer account | 2-4 semanas review |
| Gemini | API key (se obtiene al instante) | Inmediato |

**Recomendacion:** Iniciar proceso de app review de Facebook/TikTok en paralelo con Fase 1-2.

---

## Modelos de Datos

### Existentes (reutilizar)

El schema Prisma ya tiene modelos `Campaign`, `Creative`, `PublishLog` que se reutilizan.

### Nuevos campos sugeridos

```prisma
// Agregar a Creative existente o crear modelo aparte
model AdGeneration {
  id              Int       @id @default(autoincrement())
  organizationId  Int?
  productId       Int
  product         Product   @relation(fields: [productId], references: [id])

  // Gemini outputs
  analysis        Json?     // ProductAnalysis de Vision
  variations      Json      // Array de 3 AdCopyVariation
  imageUrls       String[]  // URLs de imagenes generadas

  // Editor state
  selectedIndex   Int?      // Cual variacion eligio el usuario
  editorState     Json?     // Estado del canvas Konva (serializado)
  exportedImage   String?   // URL de imagen final exportada

  // Publishing
  publishedTo     String[]  // ['facebook', 'instagram']
  publishStatus   Json?     // { facebook: 'success', instagram: 'error' }
  publishedAt     DateTime?

  // Meta
  tone            String?   // Tono usado
  style           String?   // Estilo usado
  costUsd         Float?    // Costo de generacion

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization    Organization? @relation(fields: [organizationId], references: [id])

  @@index([organizationId, productId])
  @@index([productId])
}
```

---

## Consideraciones de Seguridad

- API key de Gemini en `.env` (nunca en frontend)
- Tokens de redes sociales encriptados en BD por organizacion
- Rate limiting por organizacion (max 50 generaciones/dia default)
- Validacion de imagen antes de enviar a Gemini (tamano, formato)
- Los adapters de redes sociales usan tokens de la organizacion, no globales

---

*Documento generado: 2026-02-21*
*Aprobado para implementacion*
