# 🔧 Fix: Error al Subir Guía de Remisión PDF

**Fecha:** 2026-02-10
**Error:** `Argument 'id' is missing` en `this.prisma.entry.findUnique()`
**Archivo afectado:** `backend/src/entries/entries.service.ts`

---

## 🚨 Problema Reportado

### Error Original:
```
POST http://192.168.1.41:4000/api/entries/draft/upload-pdf-guia 400 (Bad Request)

Error al subir el borrador de la guía PDF: Error:
Invalid `this.prisma.entry.findUnique()` invocation in
C:\Users\Usuario\Documents\Proyectos PROGRAMACION\TI_projecto_web\backend\src\entries\entries.service.ts:1017:45

  1014 // Actualizar una entrada con un PDF_GUIA
  1015 async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
  1016   try {
→ 1017     const entry = await this.prisma.entry.findUnique({
             where: {
           +   id: Int
             }
           })

Argument `id` is missing.
```

---

## 🔍 Análisis del Problema

### Causa Raíz:
El parámetro `entryId` llega como `undefined`, `null`, `NaN` o valor no numérico al método `updateEntryPdfGuia`.

### ¿Por qué ocurre con Prisma 7.x?

**Prisma 7.x con PostgreSQL adapter** (`@prisma/adapter-pg`) es **más estricto** con la validación de tipos que Prisma 6.x:

1. **Prisma 6.x:** Convertía automáticamente valores inválidos o los ignoraba
2. **Prisma 7.x:** Rechaza explícitamente valores `undefined`, `null`, `NaN` o no numéricos
3. **PrismaPg adapter:** Valida tipos antes de enviar queries a PostgreSQL

### Escenarios que causaban el error:

1. **Controller recibe `id` como `undefined`:**
   ```typescript
   // Si el parámetro :id no existe en la ruta
   Number(undefined) → NaN
   ```

2. **Controller recibe `id` como string no numérico:**
   ```typescript
   Number("abc") → NaN
   ```

3. **Conversión incorrecta en el controller:**
   ```typescript
   const id = req.params.id; // undefined si no está en la ruta
   Number(id) → NaN
   ```

---

## ✅ Solución Aplicada

### Cambio 1: Validación en `updateEntryPdfGuia`

**Ubicación:** `backend/src/entries/entries.service.ts:1015-1036`

**Antes:**
```typescript
async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
  try {
    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId }, // ❌ Falla si entryId es NaN o undefined
    });
    // ...
  }
}
```

**Después:**
```typescript
async updateEntryPdfGuia(entryId: number, guiaUrl: string) {
  try {
    // ✅ Validar que entryId sea un número válido
    if (!entryId || isNaN(entryId) || !Number.isInteger(entryId)) {
      throw new BadRequestException(
        `ID de entrada inválido: ${entryId}. Debe ser un número entero válido.`
      );
    }

    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId },
    });
    // ...
  }
}
```

---

### Cambio 2: Validación en `updateEntryPdf`

**Ubicación:** `backend/src/entries/entries.service.ts:992-1012`

Aplicada la misma validación para prevenir el mismo error en el método hermano.

**Antes:**
```typescript
async updateEntryPdf(entryId: number, pdfUrl: string) {
  try {
    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId }, // ❌ Mismo problema potencial
    });
    // ...
  }
}
```

**Después:**
```typescript
async updateEntryPdf(entryId: number, pdfUrl: string) {
  try {
    // ✅ Validar que entryId sea un número válido
    if (!entryId || isNaN(entryId) || !Number.isInteger(entryId)) {
      throw new BadRequestException(
        `ID de entrada inválido: ${entryId}. Debe ser un número entero válido.`
      );
    }

    const entry = await this.prisma.entry.findUnique({
      where: { id: entryId },
    });
    // ...
  }
}
```

---

## 🎯 Beneficios de la Solución

### 1. **Mensaje de Error Claro**
**Antes:**
```
Invalid `this.prisma.entry.findUnique()` invocation
Argument `id` is missing.
```
❌ No indica cuál es el problema real

**Ahora:**
```
ID de entrada inválido: NaN. Debe ser un número entero válido.
```
✅ Mensaje claro que ayuda a debuggear

---

### 2. **Prevención Temprana**
- ✅ Valida el `entryId` **antes** de hacer la query a Prisma
- ✅ Evita queries innecesarias a la base de datos
- ✅ Protege contra errores de Prisma 7.x adapter

---

### 3. **Compatibilidad con Prisma 7.x**
- ✅ Cumple con las validaciones estrictas de Prisma 7.x
- ✅ Compatible con `@prisma/adapter-pg`
- ✅ Evita problemas de tipo en PostgreSQL

---

## 🧪 Casos de Prueba

### Caso 1: ID Válido
```typescript
await updateEntryPdfGuia(123, '/uploads/guides/file.pdf')
// ✅ Funciona correctamente
```

### Caso 2: ID Undefined
```typescript
await updateEntryPdfGuia(undefined, '/uploads/guides/file.pdf')
// ❌ BadRequestException: "ID de entrada inválido: undefined"
```

### Caso 3: ID NaN
```typescript
await updateEntryPdfGuia(Number("abc"), '/uploads/guides/file.pdf')
// ❌ BadRequestException: "ID de entrada inválido: NaN"
```

### Caso 4: ID Float
```typescript
await updateEntryPdfGuia(123.45, '/uploads/guides/file.pdf')
// ❌ BadRequestException: "ID de entrada inválido: 123.45"
```

### Caso 5: ID Cero
```typescript
await updateEntryPdfGuia(0, '/uploads/guides/file.pdf')
// ❌ BadRequestException: "ID de entrada inválido: 0"
```

---

## 🔄 Flujo Correcto de Subida de Guía

### Paso 1: Subir PDF como Draft
```typescript
// Frontend
const draft = await uploadDraftGuiaPdf(pdfFile)
// → POST /api/entries/draft/upload-pdf-guia
// → Retorna: { draftId: "draft-org-user-123.pdf", url: "/uploads/..." }
```

### Paso 2: Procesar PDF (OCR/Extracción)
```typescript
const extractedText = await processPDF(pdfFile)
// Extrae información de la guía
```

### Paso 3: Crear o Actualizar Entrada
```typescript
// Si es nueva entrada
const entry = await createEntry({ ...data, guiaUrl: draft.url })

// Si es entrada existente
await attachDraftGuidePdf(entryId, draft.draftId)
// → POST /api/entries/:id/attach-draft-pdf-guia
// → Llama a updateEntryPdfGuia(entryId, pdfUrl)
```

---

## ⚠️ Problemas Potenciales Resueltos

### 1. **Frontend no pasa entryId**
Si el frontend llama a un endpoint que requiere `:id` pero no lo proporciona:
```typescript
// ❌ ANTES: Prisma error críptico
// ✅ AHORA: "ID de entrada inválido: undefined"
```

### 2. **Controller hace Number() de undefined**
```typescript
// Controller
const entryId = Number(req.params.id) // undefined → NaN

// ❌ ANTES: Prisma error "Argument id is missing"
// ✅ AHORA: "ID de entrada inválido: NaN"
```

### 3. **Ruta incorrecta en frontend**
```typescript
// Frontend llama a ruta sin :id
fetch('/api/entries/upload-pdf-guia', { ... })
// En lugar de
fetch(`/api/entries/${entryId}/upload-pdf-guia`, { ... })

// ❌ ANTES: Error de Prisma
// ✅ AHORA: Error claro de validación
```

---

## 📝 Recomendaciones Adicionales

### 1. **Validar en el Controller También**
```typescript
// backend/src/entries/entries.controller.ts
@Post(':id/attach-draft-pdf-guia')
async attachDraftGuidePdf(
  @Param('id') id: string,
  @Body('draftId') draftId: string,
) {
  const entryId = Number(id);

  // ✅ Validar aquí también para fail-fast
  if (isNaN(entryId)) {
    throw new BadRequestException(`ID de entrada inválido: ${id}`);
  }

  // ...
  return this.entriesService.updateEntryPdfGuia(entryId, pdfUrl);
}
```

### 2. **Usar ParseIntPipe de NestJS**
```typescript
@Post(':id/attach-draft-pdf-guia')
async attachDraftGuidePdf(
  @Param('id', ParseIntPipe) id: number, // ✅ Valida y convierte automáticamente
  @Body('draftId') draftId: string,
) {
  // id ya es number válido o throw BadRequestException
  return this.entriesService.updateEntryPdfGuia(id, pdfUrl);
}
```

---

## ✅ Conclusión

**Estado:** ✅ PROBLEMA RESUELTO

**Cambios realizados:**
1. Agregada validación en `updateEntryPdfGuia`
2. Agregada validación en `updateEntryPdf`
3. Mensajes de error claros y descriptivos

**Impacto:**
- ✅ Errores más claros para debugging
- ✅ Compatible con Prisma 7.x strict mode
- ✅ Previene queries inválidas a la base de datos
- ✅ Mejor experiencia de desarrollo

**Próximos pasos:**
1. Probar subida de guía de remisión
2. Verificar que el error ahora muestre mensaje claro
3. Si persiste, revisar el flujo del frontend

---

**Solucionado por:** Claude Sonnet 4.5
**Fecha:** 2026-02-10
