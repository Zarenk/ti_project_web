# Guía de Testing - Sistema de Jurisprudencia

## ✅ Estado del Backend

**Backend corriendo:** ❌ Requiere correcciones TypeScript
**Módulos registrados:** ✅ 4 módulos de jurisprudencia
**Base de datos:** ✅ Sincronizada

---

## 🧪 PRUEBAS RÁPIDAS (Sin Auth)

### 1. Verificar que el backend responde
```bash
curl http://localhost:4000/api/
```
**Esperado:** Respuesta del servidor

---

## 🔐 PRUEBAS CON AUTENTICACIÓN

### Paso 1: Obtener Token JWT

**Opción A: Login con usuario existente**
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@example.com",
    "password": "tu-password"
  }'
```

**Opción B: Crear usuario y login**

1. Primero, verifica si necesitas crear un usuario en la base de datos
2. O usa un usuario admin existente del sistema

**Guardar el token:**
```bash
# Copiar el token de la respuesta y guardarlo en variable
TOKEN="eyJhbGc..."
```

---

### Paso 2: Probar Endpoints de Jurisprudencia

#### A. Verificar Coverage (debe estar vacío inicialmente)
```bash
curl -X GET http://localhost:4000/api/jurisprudence-admin/coverage \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "coverage": {
    "totalDocuments": 0,
    "withText": 0,
    "withTextPercentage": 0,
    "withEmbeddings": 0,
    "failed": 0,
    "byYear": {},
    "byCourt": {}
  }
}
```

#### B. Listar Documentos (debe estar vacío)
```bash
curl -X GET "http://localhost:4000/api/jurisprudence-documents?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "documents": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

#### C. Health Check del Sistema
```bash
curl -X GET http://localhost:4000/api/jurisprudence-admin/health \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "documents": {
    "total": 0,
    "pending": 0,
    "failed": 0,
    "completed": 0,
    "completionRate": 0,
    "failureRate": 0
  },
  "queries": {
    "total": 0,
    "last24h": 0
  },
  "health": "HEALTHY"
}
```

---

## 📤 PRUEBA COMPLETA: Upload y Query

### 1. Crear un PDF de prueba

Crear archivo `ejemplo-jurisprudencia.pdf` con contenido legal de prueba.

### 2. Upload del PDF
```bash
curl -X POST http://localhost:4000/api/jurisprudence-documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ejemplo-jurisprudencia.pdf" \
  -F "title=Casación N° 1234-2020-Lima" \
  -F "court=Corte Suprema" \
  -F "expediente=1234-2020" \
  -F "year=2020" \
  -F "publishDate=2020-05-15"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "title": "Casación N° 1234-2020-Lima",
    "court": "Corte Suprema",
    "processingStatus": "PENDING",
    ...
  },
  "message": "Document uploaded successfully and queued for processing"
}
```

### 3. Trigger Procesamiento
```bash
curl -X POST http://localhost:4000/api/jurisprudence-documents/1/process \
  -H "Authorization: Bearer $TOKEN"
```

**NOTA:** Esto requiere que `OPENAI_API_KEY` esté configurado en `.env`

### 4. Verificar Documento Procesado
```bash
curl -X GET http://localhost:4000/api/jurisprudence-documents/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Hacer una Query Conversacional
```bash
curl -X POST http://localhost:4000/api/jurisprudence-assistant/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Cuál es el plazo de prescripción mencionado en el documento?"
  }'
```

**Respuesta esperada** (con documento procesado):
```json
{
  "success": true,
  "answer": "[CONFIANZA: ALTA]\\n\\nSegún la Casación N° 1234-2020-Lima [FUENTE 1, pág. 5]...",
  "confidence": "ALTA",
  "sources": [
    {
      "sourceId": "[FUENTE 1]",
      "documentId": 1,
      "title": "Casación N° 1234-2020-Lima",
      "court": "Corte Suprema",
      "similarity": 0.89,
      "citedInAnswer": true
    }
  ],
  "tokensUsed": 2500,
  "costUsd": 0.00045,
  "responseTime": 1850
}
```

---

## 🔧 TROUBLESHOOTING

### Error: "OPENAI_API_KEY not set"
**Solución:**
```bash
# Agregar a backend/.env
OPENAI_API_KEY=sk-proj-tu-key-aqui
```

### Error: "Unauthorized" o 401
**Solución:**
1. Verificar que el token JWT no haya expirado
2. Hacer login nuevamente para obtener nuevo token
3. Verificar que el header `Authorization: Bearer TOKEN` esté correcto

### Error: "Module 'legal' not enabled"
**Solución:**
Crear `JurisprudenceConfig` para la organización:
```sql
INSERT INTO "JurisprudenceConfig" (
  "organizationId",
  "ragEnabled",
  "scrapingEnabled",
  "courtsEnabled",
  "createdAt",
  "updatedAt"
) VALUES (
  1,  -- Tu organization ID
  true,
  true,
  '["Corte Suprema", "Corte Superior de Lima"]'::json,
  NOW(),
  NOW()
);
```

### Error: "vector type not found" o embedding errors
**Solución:**
Esto es esperado si pgvector no está instalado. El sistema funciona con `Bytes` temporalmente.
Para instalar pgvector, ver [PGVECTOR-SETUP.md](./PGVECTOR-SETUP.md)

---

## 📱 USAR CON EXTENSIONES DE VSCODE

### Thunder Client / REST Client

1. Abrir archivo `jurisprudence-tests.http`
2. Actualizar variable `@token` con tu token JWT
3. Click en "Send Request" sobre cualquier endpoint
4. Ver respuesta en panel derecho

### Postman / Insomnia

1. Importar la collection desde `jurisprudence-tests.http` (o crear manualmente)
2. Configurar variable de entorno `token` con el JWT
3. Ejecutar requests en orden

---

## 🎯 CHECKLIST DE PRUEBAS

- [ ] Backend inicia sin errores
- [ ] Login funciona y retorna token JWT
- [ ] Coverage endpoint responde (vacío está OK)
- [ ] List documents responde (vacío está OK)
- [ ] Health check responde con status HEALTHY
- [ ] Upload de PDF funciona
- [ ] Procesamiento de PDF se ejecuta (requiere OPENAI_API_KEY)
- [ ] Query conversacional funciona (requiere docs procesados)
- [ ] Query statistics endpoint responde
- [ ] Failed documents endpoint responde

---

## 📊 LOGS DEL BACKEND

Ver logs en tiempo real:
```bash
cd backend
npm run start:dev
```

Buscar mensajes específicos:
- `[JurisprudenceEmbeddingService]` - Procesamiento de embeddings
- `[JurisprudenceRagService]` - Queries conversacionales
- `[JurisprudenceScraperService]` - Scraping de documentos
- `[JurisprudenceCoverageService]` - Coverage stats

---

**Si todo funciona:** ¡El backend está 100% operativo! 🎉
**Si algo falla:** Revisar logs y esta guía de troubleshooting.
