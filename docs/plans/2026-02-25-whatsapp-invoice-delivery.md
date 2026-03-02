# WhatsApp Invoice Delivery — Design

## Problem
After SUNAT accepts a comprobante (factura/boleta), there's no way to send it to the client. The PDF exists but stays in the system.

## Solution
Automatic + manual WhatsApp delivery of comprobante PDFs to clients using the existing WhatsApp module (Baileys).

## Data Flow

```
executeSale() → triggerSunatIfNeeded() → SunatService.sendDocument()
  → SunatTransmission.status = ACCEPTED
  → EventEmitter.emit('sale.sunat-accepted', payload)
  → AutomationService.@OnEvent('sale.sunat-accepted')
    → Check: company.whatsappAutoSendInvoice === true
    → Check: WhatsAppSession.status === CONNECTED
    → Check: client.phone exists
    → Send PDF as DOCUMENT message + text message with link
    → Store WhatsAppMessage (salesId + invoiceId)
    → Broadcast via WebSocket
```

Fire-and-forget: WhatsApp failure never blocks sales flow.

## Schema Change

```prisma
// Company model
whatsappAutoSendInvoice  Boolean @default(false)
```

## Backend Changes

### 1. Emit event in `sunat.service.ts`
After updating SunatTransmission to ACCEPTED:
```typescript
this.eventEmitter.emit('sale.sunat-accepted', {
  saleId, organizationId, companyId,
  invoiceType, serie, correlativo, total
});
```

### 2. Handler in `automation.service.ts`
```typescript
@OnEvent('sale.sunat-accepted')
async handleSunatAccepted(payload)
```
1. Verify company.whatsappAutoSendInvoice
2. Verify WhatsApp session CONNECTED
3. Verify client.phone
4. Build PDF path + public URL
5. Send DOCUMENT (PDF) + TEXT (link + details) to client.phone
6. Save WhatsAppMessage with salesId reference

### 3. Manual endpoint in `whatsapp.controller.ts`
```
POST /whatsapp/send-invoice/:saleId
```
Same logic as automatic handler, triggered manually.

### 4. New template in `predefined-templates.ts`
Category: "comprobantes"
```
Hola {{clientName}},

Su {{invoiceType}} {{serie}}-{{correlativo}} por {{total}} ha sido
emitida y aceptada por SUNAT.

Le adjuntamos el comprobante electrónico.

{{companyName}}
Gracias por su preferencia.
```

## Frontend Changes

### 1. Button in `sale-detail-dialog.tsx`
- "Enviar por WhatsApp" button (visible if sunatAccepted + has invoice)
- Disabled if client has no phone (show warning)
- Loading state while sending
- Success badge after sent

### 2. API function in `sales.api.tsx`
```typescript
export async function sendInvoiceWhatsApp(saleId: number)
```

### 3. Toggle in `company-sunat-tab.tsx`
Switch for `whatsappAutoSendInvoice` with warning if WhatsApp not connected.

### 4. Visual indicators
- Gallery/table: WhatsApp icon (green=sent, gray=not sent) next to comprobante
- Detail dialog: sent status badge

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `whatsappAutoSendInvoice` to Company |
| `sunat/sunat.service.ts` | Emit `sale.sunat-accepted` event |
| `whatsapp/automation/automation.service.ts` | `@OnEvent` handler + `sendInvoice()` |
| `whatsapp/whatsapp.controller.ts` | `POST /send-invoice/:saleId` |
| `whatsapp/templates/predefined-templates.ts` | Comprobante template |
| `sales/components/sale-detail-dialog.tsx` | WhatsApp send button |
| `sales/sales.api.tsx` | `sendInvoiceWhatsApp()` |
| `tenancy/.../company-sunat-tab.tsx` | Auto-send toggle |

## What's NOT Included (YAGNI)
- No retry queue (manual resend is enough)
- No template editor UI (predefined template suffices)
- No phone validation on sale creation (too invasive)
- No separate WhatsApp history in sale detail (already in WhatsApp module)
