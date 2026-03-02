# WhatsApp Auto-Responder — Design Document

**Date:** 2026-02-26
**Status:** Approved

---

## Summary

Automatic reply system for incoming WhatsApp messages. Uses a hybrid matching pipeline: custom rules first, then KB semantic search, then AI (Claude/OpenAI) fallback. Configurable per company with rate limits per contact.

## Decisions

| Decision | Choice |
|----------|--------|
| Intelligence level | Hybrid: KB first, AI fallback |
| Configuration scope | Company-level toggle + rules |
| Business hours | Always active (24/7 when enabled) |
| Escalation | Friendly fallback message + log unanswered |

## Matching Pipeline

```
Incoming WhatsApp Message
    |
1. Is auto-reply enabled for this company? → NO → stop
    |
2. Daily limit reached for this contact? → YES → stop
    |
3. Is this a greeting? → YES → send greetingMessage
    |
4. Match custom Q&A rules (keyword match) → HIT → send rule answer
    |
5. Search Help KB embeddings (cosine >= 0.65) → HIT → send KB answer
    |
6. AI with RAG context (if aiEnabled) → OK → send AI answer
    |
7. No match → send fallbackMessage
    |
8. Log to WhatsAppAutoReplyLog
```

## Schema

### WhatsAppAutoReplyConfig

One per company. Controls the auto-responder behavior.

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| id | Int (PK) | auto | |
| organizationId | Int | — | Tenant |
| companyId | Int | — | Tenant |
| isEnabled | Boolean | false | Master toggle |
| greetingMessage | String | "Hola! Soy el asistente virtual..." | Reply to greetings |
| fallbackMessage | String | "No tengo esa informacion..." | When nothing matches |
| maxRepliesPerContactPerDay | Int | 10 | Anti-spam per contact |
| aiEnabled | Boolean | true | Allow AI fallback |
| createdAt | DateTime | now() | |
| updatedAt | DateTime | auto | |

Constraint: `@@unique([organizationId, companyId])`

### WhatsAppAutoReplyRule

Custom Q&A pairs. Keywords trigger the answer.

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| id | Int (PK) | auto | |
| configId | Int (FK) | — | Parent config |
| keywords | String[] | — | Trigger words (any match) |
| answer | String | — | Response text |
| priority | Int | 0 | Higher = checked first |
| isActive | Boolean | true | Toggle without deleting |
| createdAt | DateTime | now() | |

### WhatsAppAutoReplyLog

Audit trail of every auto-reply sent.

| Field | Type | Purpose |
|-------|------|---------|
| id | Int (PK) | |
| organizationId | Int | Tenant |
| companyId | Int | Tenant |
| contactPhone | String | Who asked |
| incomingMessage | String | What they asked |
| replyMessage | String | What we replied |
| matchType | String | 'greeting' / 'rule' / 'kb' / 'ai' / 'fallback' |
| matchScore | Float? | Cosine similarity (KB matches) |
| ruleId | Int? | Which rule matched |
| createdAt | DateTime | |

Indexes: `[organizationId, companyId, createdAt]`, `[contactPhone, createdAt]`

## Backend — AutoReplyService

New file: `backend/src/whatsapp/auto-reply/auto-reply.service.ts`

### Dependencies

- PrismaService (DB access)
- WhatsAppService (send messages)
- HelpEmbeddingService (KB search)
- AiProviderManager (AI fallback)

### Event Handler

```typescript
@OnEvent('whatsapp.message.received')
async handleIncomingMessage(payload: {
  organizationId: number;
  companyId: number;
  from: string;
  content: string;
  messageType: string;
})
```

Only processes TEXT messages. Ignores IMAGE, AUDIO, etc.

### Greeting Detection

Normalized message checked against: `hola`, `buenas`, `hi`, `hello`, `buenos dias`, `buenas tardes`, `buenas noches`, `hey`, `ola`, `buen dia`.

### Rule Matching

```sql
SELECT * FROM WhatsAppAutoReplyRule
WHERE configId = ? AND isActive = true
ORDER BY priority DESC
```

For each rule, check if any keyword appears in the normalized (lowercased, trimmed) message. First match wins.

### KB Search

Uses existing `HelpEmbeddingService.searchSimilar()` with threshold 0.65. Returns top result's answer if available.

### AI Fallback

System prompt:
```
Eres el asistente virtual de {companyName} en WhatsApp.
Responde de forma breve y amigable (max 500 caracteres).
Si no sabes la respuesta, di que un agente contactara al cliente.
No inventes informacion sobre productos, precios o politicas.
```

### Safety

- All replies go through `sendMessage()` (respects existing rate limits)
- In-memory daily reply counter per contact (resets at midnight)
- Max 10 replies per contact per day (configurable)
- Only TEXT messages trigger replies
- Group messages already filtered (previous audit)
- Deduplication: 60s window prevents double-processing

## API Endpoints

All under `@Controller('whatsapp/auto-reply')` with same guards as WhatsApp controller.

| Method | Path | Purpose |
|--------|------|---------|
| GET | /whatsapp/auto-reply/config | Get config (create default if none) |
| PUT | /whatsapp/auto-reply/config | Update config |
| GET | /whatsapp/auto-reply/rules | List rules |
| POST | /whatsapp/auto-reply/rules | Create rule |
| PUT | /whatsapp/auto-reply/rules/:id | Update rule |
| DELETE | /whatsapp/auto-reply/rules/:id | Delete rule |
| GET | /whatsapp/auto-reply/logs | Get logs (paginated) |

## Frontend — Auto-respuestas Tab

8th tab in WhatsApp UI. Three stacked cards:

### 1. Config Card
- Switch toggle (isEnabled) with animated state
- Textareas for greeting and fallback messages
- Number input for max replies per contact
- Switch for AI enabled/disabled
- Save button

### 2. Rules Card
- "Nueva regla" button opens dialog
- Rule cards with: keyword badges, answer preview, priority, active toggle, delete
- Dialog form: keywords input (comma-separated → array), answer textarea, priority number

### 3. Logs Card
- Scrollable list (max-height: 400px)
- Each log: phone, incoming message, reply, match type badge, timestamp
- Badge colors: green=rule, blue=KB, purple=AI, amber=fallback, gray=greeting
- Empty state when no logs

## Files to Create/Modify

### New Files
- `backend/src/whatsapp/auto-reply/auto-reply.service.ts`
- `backend/src/whatsapp/auto-reply/auto-reply.controller.ts`
- `backend/src/whatsapp/auto-reply/dto/auto-reply.dto.ts`
- `fronted/src/app/dashboard/whatsapp/components/auto-reply-panel.tsx`
- `fronted/src/app/api/whatsapp/auto-reply/config/route.ts`
- `fronted/src/app/api/whatsapp/auto-reply/rules/route.ts`
- `fronted/src/app/api/whatsapp/auto-reply/rules/[id]/route.ts`
- `fronted/src/app/api/whatsapp/auto-reply/logs/route.ts`

### Modified Files
- `backend/prisma/schema.prisma` — 3 new models
- `backend/src/whatsapp/whatsapp.module.ts` — register AutoReplyService + Controller
- `fronted/src/app/dashboard/whatsapp/whatsapp-client.tsx` — add 8th tab

## Order of Implementation

1. Prisma schema (3 models) + db push + generate
2. Backend DTOs
3. Backend AutoReplyService
4. Backend AutoReplyController
5. Register in WhatsAppModule
6. Frontend API proxy routes
7. Frontend auto-reply-panel.tsx
8. Add tab to whatsapp-client.tsx
9. TypeScript verification
