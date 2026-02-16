# Schema de Base de Datos para Sistema de Auto-Aprendizaje

## 📋 Tablas Necesarias (Opcional - Para Producción)

El sistema actualmente funciona con **localStorage** en el frontend. Para producción a gran escala, agrega estas tablas a tu schema de Prisma.

---

## 1. **HelpLearningSession** - Sesiones de Interacción

```prisma
model HelpLearningSession {
  id               Int       @id @default(autoincrement())
  userId           Int
  query            String
  normalizedQuery  String
  matchFound       Boolean
  matchScore       Float?
  matchedEntryId   String?
  userFeedback     HelpFeedback?
  section          String
  timestamp        BigInt
  createdAt        DateTime  @default(now())

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([matchFound])
  @@index([section])
  @@index([timestamp])
  @@map("help_learning_sessions")
}
```

---

## 2. **SuggestedAlias** - Aliases Sugeridos por el Sistema

```prisma
model SuggestedAlias {
  id              Int       @id @default(autoincrement())
  entryId         String    // ID de la entrada a la que se sugiere el alias
  suggestedAlias  String
  confidence      Float
  frequency       Int
  sources         String[]  // Array de queries originales
  status          SuggestionStatus @default(PENDING)
  reviewedById    Int?
  createdAt       DateTime  @default(now())
  reviewedAt      DateTime?

  reviewedBy      User?     @relation(fields: [reviewedById], references: [id])

  @@index([status])
  @@index([entryId])
  @@map("help_suggested_aliases")
}

enum SuggestionStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## 3. **SuggestedEntry** - Nuevas Entradas FAQ Sugeridas

```prisma
model SuggestedEntry {
  id              Int       @id @default(autoincrement())
  question        String
  suggestedAnswer String?
  section         String
  relatedEntries  String[]  // IDs de entradas relacionadas
  frequency       Int
  sources         String[]  // Queries que llevaron a esta sugerencia
  status          SuggestionStatus @default(PENDING)
  reviewedById    Int?
  createdAt       DateTime  @default(now())
  reviewedAt      DateTime?

  reviewedBy      User?     @relation(fields: [reviewedById], references: [id])

  @@index([status])
  @@index([section])
  @@map("help_suggested_entries")
}
```

---

## 4. **PromotedAnswer** - Respuestas Mejoradas por Feedback

```prisma
model PromotedAnswer {
  id              Int       @id @default(autoincrement())
  entryId         String    @unique
  originalAnswer  String    @db.Text
  promotedAnswer  String    @db.Text
  positiveVotes   Int       @default(0)
  negativeVotes   Int       @default(0)
  confidence      Float     @default(0.5)
  approvedById    Int?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  approvedBy      User?     @relation(fields: [approvedById], references: [id])

  @@index([confidence])
  @@index([entryId])
  @@map("help_promoted_answers")
}
```

---

## 5. **SynonymMap** - Mapa de Sinónimos Aprendidos

```prisma
model SynonymMap {
  id              Int       @id @default(autoincrement())
  keyword         String    @unique
  synonyms        String[]  // Array de sinónimos aprendidos
  frequency       Int       @default(1)
  confidence      Float     @default(0.5)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([keyword])
  @@map("help_synonym_map")
}
```

---

## 6. **PatternLearning** - Patrones Detectados

```prisma
model PatternLearning {
  id              Int       @id @default(autoincrement())
  pattern         String
  queries         String[]  // Queries que siguen este patrón
  frequency       Int
  suggestedIntent String
  confidence      Float
  status          SuggestionStatus @default(PENDING)
  reviewedById    Int?
  createdAt       DateTime  @default(now())
  reviewedAt      DateTime?

  reviewedBy      User?     @relation(fields: [reviewedById], references: [id])

  @@index([status])
  @@map("help_pattern_learning")
}
```

---

## 🔧 Migración de Prisma

### Paso 1: Agregar al Schema

Copia los modelos anteriores a tu archivo `backend/prisma/schema.prisma`.

### Paso 2: Crear Migración

```bash
cd backend
npx prisma migrate dev --name add_learning_system
```

### Paso 3: Generar Cliente

```bash
npx prisma generate
```

### Paso 4: Aplicar en Producción

```bash
npx prisma migrate deploy
```

---

## 📊 Índices Importantes

Los índices ya están definidos en los modelos, pero aquí están los más críticos:

```sql
-- Índices de performance
CREATE INDEX idx_learning_sessions_timestamp ON help_learning_sessions(timestamp DESC);
CREATE INDEX idx_learning_sessions_match ON help_learning_sessions(matchFound, matchScore);
CREATE INDEX idx_suggested_aliases_status ON help_suggested_aliases(status);
CREATE INDEX idx_promoted_answers_confidence ON help_promoted_answers(confidence DESC);

-- Índices de búsqueda
CREATE INDEX idx_synonym_map_keyword ON help_synonym_map(keyword);
CREATE INDEX idx_suggested_entries_section ON help_suggested_entries(section);
```

---

## 🔄 Actualizar Métodos del Service

Una vez que tengas las tablas, actualiza los métodos en `help.service.ts`:

### Ejemplo: recordLearningSession

```typescript
async recordLearningSession(session: {
  query: string;
  normalizedQuery: string;
  matchFound: boolean;
  matchScore?: number;
  matchedEntryId?: string;
  userFeedback?: 'POSITIVE' | 'NEGATIVE';
  section: string;
  userId: number;
  timestamp: number;
}): Promise<void> {
  // ✅ Persistir en DB
  await this.prisma.helpLearningSession.create({
    data: session
  });

  // Trigger análisis cada 10 sesiones
  const recentCount = await this.prisma.helpLearningSession.count({
    where: { createdAt: { gte: new Date(Date.now() - 3600000) } } // Última hora
  });

  if (recentCount % 10 === 0) {
    this.analyzePatterns().catch(err => this.logger.error('Pattern analysis failed:', err));
  }
}
```

### Ejemplo: generateLearningInsights

```typescript
async generateLearningInsights(): Promise<{
  totalSessions: number;
  failureRate: number;
  topFailedQueries: Array<{ query: string; count: number }>;
  suggestedImprovements: number;
  autoApprovedCount: number;
  pendingReviewCount: number;
  learningVelocity: number;
}> {
  const totalSessions = await this.prisma.helpLearningSession.count();

  const failedSessions = await this.prisma.helpLearningSession.count({
    where: {
      OR: [
        { matchFound: false },
        { matchScore: { lt: 0.6 } }
      ]
    }
  });

  const failureRate = totalSessions > 0 ? failedSessions / totalSessions : 0;

  // Top queries fallidas
  const failedQueries = await this.prisma.helpLearningSession.groupBy({
    by: ['query'],
    where: {
      OR: [
        { matchFound: false },
        { matchScore: { lt: 0.6 } }
      ]
    },
    _count: { query: true },
    orderBy: { _count: { query: 'desc' } },
    take: 10
  });

  const topFailedQueries = failedQueries.map(q => ({
    query: q.query,
    count: q._count.query
  }));

  const suggestedAliases = await this.prisma.suggestedAlias.count();
  const suggestedEntries = await this.prisma.suggestedEntry.count();

  const autoApprovedCount = await this.prisma.suggestedAlias.count({
    where: { status: 'APPROVED' }
  }) + await this.prisma.suggestedEntry.count({
    where: { status: 'APPROVED' }
  });

  const pendingReviewCount = await this.prisma.suggestedAlias.count({
    where: { status: 'PENDING' }
  }) + await this.prisma.suggestedEntry.count({
    where: { status: 'PENDING' }
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const learningVelocity = await this.prisma.suggestedAlias.count({
    where: { createdAt: { gte: weekAgo } }
  }) + await this.prisma.suggestedEntry.count({
    where: { createdAt: { gte: weekAgo } }
  });

  return {
    totalSessions,
    failureRate,
    topFailedQueries,
    suggestedImprovements: suggestedAliases + suggestedEntries,
    autoApprovedCount,
    pendingReviewCount,
    learningVelocity
  };
}
```

---

## ✅ Checklist de Implementación

### Frontend (Ya Completado ✅)
- [x] Sistema de learning en `adaptive-learning.ts`
- [x] Integración en `help-assistant-context.tsx`
- [x] Dashboard en `help-learning.tsx`
- [x] Componente agregado a página de usuarios

### Backend (Completado ✅)
- [x] Controller con endpoints en `help.controller.ts`
- [x] Service con métodos stub en `help.service.ts`

### Base de Datos (Opcional - Para Producción)
- [ ] Agregar modelos al `schema.prisma`
- [ ] Crear migración con `prisma migrate dev`
- [ ] Actualizar métodos del service con queries reales
- [ ] Aplicar migración en producción

### Testing
- [ ] Test unitarios para algoritmo de clustering
- [ ] Test de integración del learning loop
- [ ] Test E2E del dashboard de admin

---

## 🚀 Alternativa Sin Base de Datos

Si prefieres mantener el sistema completamente en el frontend sin DB:

1. ✅ **Ya está funcionando** - Todo usa localStorage
2. **Limitaciones:**
   - Los datos se pierden si el usuario limpia el navegador
   - No hay sincronización entre usuarios
   - No hay backup automático

3. **Solución:**
   - Implementar exportación manual regular (ya incluido)
   - Los admins pueden descargar y respaldar los datos
   - Funciona perfectamente para equipos pequeños

---

**Recomendación:** Para proyectos en producción con múltiples usuarios, implementa la persistencia en DB. Para prototipado o equipos pequeños, localStorage es suficiente.
