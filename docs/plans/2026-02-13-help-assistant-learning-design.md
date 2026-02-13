# Diseno: Sistema de Auto-Aprendizaje para Asistente de Ayuda

## Contexto

El asistente de ayuda actual tiene un motor hibrido (KB estatica + IA fallback) pero no persiste conversaciones, no recolecta feedback, y no aprende de las interacciones. Este diseno agrega: historial completo por usuario, feedback con thumbs up/down, y promocion semi-automatica de respuestas IA a la KB.

## Decisiones

- **Memoria**: Historial completo por usuario (persistido en BD, ultimos 10 mensajes como contexto para IA)
- **Aprobacion**: Semi-automatica (3+ votos positivos → candidata PENDING → SUPER_ADMIN revisa/aprueba)
- **Panel admin**: Pestana "Asistente" en /dashboard/users, solo visible para SUPER_ADMIN global

---

## 1. Modelo de Datos

### HelpConversation
- `id`, `userId`, `createdAt`, `lastMessageAt`
- Relacion: User 1→N HelpConversation, HelpConversation 1→N HelpMessage

### HelpMessage
- `id`, `conversationId`, `role` (USER/ASSISTANT), `content`, `source` (STATIC/AI/PROMOTED)
- `section`, `route`, `score`, `feedback` (POSITIVE/NEGATIVE/null), `createdAt`

### HelpKBCandidate
- `id`, `question`, `answer`, `section`, `positiveVotes`, `negativeVotes`
- `status` (PENDING/APPROVED/REJECTED), `approvedBy`, `createdAt`, `reviewedAt`

---

## 2. API Endpoints

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| GET | /help/conversation | JWT | Historial completo del usuario |
| POST | /help/ask | JWT + rate limit | Pregunta (ahora persiste y usa contexto) |
| POST | /help/feedback | JWT | Calificar respuesta (thumbs up/down) |
| GET | /help/admin/analytics | JWT + SUPER_ADMIN | Metricas + candidatos |
| PATCH | /help/admin/candidates/:id | JWT + SUPER_ADMIN | Aprobar/rechazar candidato |

---

## 3. Contexto Conversacional

- System prompt existente + ultimos 10 mensajes como historial
- Candidatos aprobados de la seccion actual inyectados como conocimiento verificado
- Busqueda hibrida: KB estatica (frontend) → candidatos aprobados (BD) → IA (con contexto)

---

## 4. Frontend

- HelpChatPanel: botones feedback (ThumbsUp/ThumbsDown) en cada respuesta del asistente
- HelpAssistantProvider: carga historial al montar via GET /help/conversation
- Busqueda centralizada en backend (frontend solo para quick-actions y welcome)
- Source badge: "Base de conocimiento", "IA", "Respuesta verificada" (promoted)

---

## 5. Panel Admin (SUPER_ADMIN)

- Pestana "Asistente" en /dashboard/users
- 4 metric cards: consultas 7d/30d, % KB, satisfaccion
- Top 10 preguntas sin respuesta estatica
- Top 10 preguntas con feedback negativo
- Tabla de candidatos PENDING con acciones: aprobar (editable), rechazar

---

## 6. Ciclo de Auto-Aprendizaje

1. Usuario pregunta → backend busca KB → candidatos aprobados → IA
2. Usuario califica (thumbs up/down)
3. 3+ positivos en misma pregunta normalizada → HelpKBCandidate(PENDING)
4. SUPER_ADMIN revisa y aprueba/rechaza
5. Aprobada → se usa como respuesta directa sin IA

---

## Archivos

### Modificar (6)
1. backend/prisma/schema.prisma
2. backend/src/help/help.service.ts
3. backend/src/help/help.controller.ts
4. backend/src/help/help.module.ts
5. fronted/src/context/help-assistant-context.tsx
6. fronted/src/components/help/HelpChatPanel.tsx
7. fronted/src/data/help/types.ts

### Crear (2)
8. fronted/src/app/dashboard/users/help-admin-tab.tsx
9. fronted/src/app/dashboard/users/help-admin.api.ts
