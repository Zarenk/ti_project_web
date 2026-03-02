# Sistema de Automatización WhatsApp

## Descripción General

El sistema de WhatsApp integrado permite enviar mensajes automáticos y manuales a clientes basándose en eventos del negocio (ventas, pagos, inventario, etc.). Utiliza **Baileys** (biblioteca WhatsApp Web) para conexión directa sin costo de API externa.

### Características Principales

- ✅ Conexión directa con WhatsApp Web (sin costos de API)
- ✅ Mensajería manual y automática
- ✅ Plantillas de mensajes reutilizables
- ✅ Automatizaciones basadas en eventos
- ✅ WebSocket para actualizaciones en tiempo real
- ✅ Historial completo de mensajes
- ✅ Multi-tenant (aislamiento por organización/empresa)
- ✅ Sin límite de mensajes (solo límites de WhatsApp)

---

## Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Conectar WhatsApp](#conectar-whatsapp)
3. [Envío de Mensajes](#envío-de-mensajes)
4. [Plantillas](#plantillas)
5. [Automatizaciones](#automatizaciones)
6. [WebSocket en Tiempo Real](#websocket-en-tiempo-real)
7. [API Reference](#api-reference)
8. [Eventos Disponibles](#eventos-disponibles)
9. [Troubleshooting](#troubleshooting)

---

## Configuración Inicial

### 1. Variables de Entorno (Opcional)

Agregar en `backend/.env`:

```bash
# WhatsApp Configuration
WHATSAPP_TIMEOUT=60000                    # Timeout para conexión (ms)
WHATSAPP_MAX_RETRIES=3                    # Reintentos automáticos
ADMIN_WHATSAPP_PHONE=51999999999          # Teléfono admin para alertas
```

### 2. Verificar Módulo Registrado

El módulo `WhatsAppModule` debe estar importado en `app.module.ts`:

```typescript
import { WhatsAppModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    // ... otros módulos
    WhatsAppModule,
  ],
})
export class AppModule {}
```

### 3. Base de Datos

Las siguientes tablas son creadas automáticamente por Prisma:

- `WhatsAppSession` - Sesiones de conexión por organización/empresa
- `WhatsAppMessage` - Historial de mensajes enviados/recibidos
- `WhatsAppTemplate` - Plantillas de mensajes
- `WhatsAppAutomation` - Reglas de automatización
- `WhatsAppAutomationLog` - Logs de ejecución de automatizaciones

---

## Conectar WhatsApp

### Paso 1: Iniciar Conexión

**Endpoint:** `POST /whatsapp/connect`

**Headers:**
```
Authorization: Bearer <token>
X-Organization-Id: 1
X-Company-Id: 1
```

**Response:**
```json
{
  "success": true,
  "message": "Scan QR code to connect",
  "qrCode": "data:image/png;base64,..."
}
```

### Paso 2: Escanear QR Code

El código QR se retorna como base64. En el frontend:

```typescript
const response = await fetch('/api/whatsapp/connect', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

const { qrCode } = await response.json();

// Mostrar imagen
<img src={qrCode} alt="WhatsApp QR Code" />
```

### Paso 3: Verificar Conexión

**Endpoint:** `GET /whatsapp/status`

**Response (Conectado):**
```json
{
  "success": true,
  "isConnected": true,
  "phoneNumber": "51999999999",
  "session": {
    "id": 1,
    "status": "CONNECTED",
    "phoneNumber": "51999999999",
    "lastConnected": "2026-02-21T10:30:00Z"
  }
}
```

### Paso 4: Desconectar (Opcional)

**Endpoint:** `POST /whatsapp/disconnect`

---

## Envío de Mensajes

### Mensaje Simple

**Endpoint:** `POST /whatsapp/send`

**Body:**
```json
{
  "to": "51999999999",
  "content": "Hola, este es un mensaje de prueba",
  "clientId": 123,        // Opcional - vincular con cliente
  "salesId": 456          // Opcional - vincular con venta
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "3EB0ABC123",
  "timestamp": "2026-02-21T10:35:00Z"
}
```

### Mensaje Masivo (Bulk)

**Endpoint:** `POST /whatsapp/send-bulk`

**Body:**
```json
{
  "recipients": ["51999999999", "51988888888", "51977777777"],
  "content": "Promoción especial: 20% de descuento este fin de semana"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "recipient": "51999999999", "success": true },
    { "recipient": "51988888888", "success": true },
    { "recipient": "51977777777", "success": false, "error": "Invalid number" }
  ],
  "sent": 2,
  "failed": 1
}
```

### Usando Plantilla

**Endpoint:** `POST /whatsapp/send-template`

**Body:**
```json
{
  "to": "51999999999",
  "templateName": "sale_confirmation",
  "variables": {
    "clientName": "Juan Pérez",
    "saleId": "001-0001234",
    "products": "- Laptop Dell (x1)\n- Mouse Logitech (x2)",
    "total": "1,500.00",
    "storeName": "Tienda Centro"
  }
}
```

---

## Plantillas

### Crear Plantilla

**Endpoint:** `POST /whatsapp/templates`

**Body:**
```json
{
  "name": "payment_reminder",
  "displayName": "Recordatorio de Pago",
  "content": "Hola {{clientName}}, tu factura {{invoiceNumber}} de S/ {{amount}} vence el {{dueDate}}. Por favor realiza el pago a la brevedad.",
  "description": "Recordatorio automático de pago",
  "category": "pagos",
  "variables": ["clientName", "invoiceNumber", "amount", "dueDate"]
}
```

### Listar Plantillas

**Endpoint:** `GET /whatsapp/templates`

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "name": "sale_confirmation",
      "displayName": "Confirmación de Pedido",
      "category": "ventas",
      "usageCount": 245
    },
    // ... más plantillas
  ],
  "count": 15
}
```

### Plantillas Predefinidas

El sistema incluye 20+ plantillas listas para usar en categorías:

- **Ventas:** Confirmación de pedido, pedido listo, en camino
- **Pagos:** Recordatorios, confirmaciones
- **Inventario:** Alertas de stock, reabastecimientos
- **Cotizaciones:** Envío, recordatorios de vencimiento
- **Restaurante:** Confirmación de pedido, mesa lista, reservas
- **Legal:** Recordatorios de audiencias, actualizaciones de casos
- **General:** Bienvenida, agradecimiento, citas, cumpleaños
- **Soporte:** Tickets recibidos, tickets resueltos

Importar plantillas predefinidas:

```typescript
import { PREDEFINED_TEMPLATES, createTemplatesForOrganization } from './templates/predefined-templates';

// Crear plantillas de una categoría específica
const salesTemplates = createTemplatesForOrganization(
  organizationId,
  companyId,
  ['ventas', 'pagos']
);
```

---

## Automatizaciones

### Crear Automatización

**Endpoint:** `POST /whatsapp/automations`

**Body:**
```json
{
  "name": "Confirmación automática de venta",
  "description": "Envía confirmación cuando se crea una venta",
  "triggerEvent": "sale.created",
  "triggerFilters": {
    "storeId": 1
  },
  "recipients": ["client"],
  "templateId": 1,
  "delayMinutes": 0,
  "isActive": true
}
```

**Campos:**

- `triggerEvent`: Nombre del evento (ver [Eventos Disponibles](#eventos-disponibles))
- `triggerFilters`: Filtros opcionales para el payload del evento
- `recipients`: Array de destinatarios:
  - `"client"` - Cliente asociado al evento
  - `"admin"` - Teléfono configurado en `ADMIN_WHATSAPP_PHONE`
  - `"51999999999"` - Número específico
- `templateId`: ID de plantilla a usar (opcional, si no usa plantilla envía mensaje genérico)
- `delayMinutes`: Retraso antes de enviar (0 = inmediato)

### Listar Automatizaciones

**Endpoint:** `GET /whatsapp/automations`

**Response:**
```json
{
  "success": true,
  "automations": [
    {
      "id": 1,
      "name": "Confirmación automática de venta",
      "triggerEvent": "sale.created",
      "isActive": true,
      "lastTriggered": "2026-02-21T09:15:00Z",
      "triggerCount": 127,
      "template": {
        "id": 1,
        "name": "sale_confirmation"
      }
    }
  ],
  "count": 5
}
```

### Ver Logs de Automatización

**Endpoint:** `GET /whatsapp/automations/:id/logs?limit=50`

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "automationId": 1,
      "triggeredBy": "sale.created",
      "payload": { "saleId": 123, "organizationId": 1 },
      "recipient": "51999999999",
      "messageSent": true,
      "executedAt": "2026-02-21T09:15:30Z"
    },
    {
      "id": 2,
      "automationId": 1,
      "triggeredBy": "sale.created",
      "recipient": "51988888888",
      "messageSent": false,
      "errorMessage": "Client has no phone number",
      "executedAt": "2026-02-21T09:20:45Z"
    }
  ],
  "count": 2
}
```

### Actualizar Automatización

**Endpoint:** `POST /whatsapp/automations/:id`

**Body:**
```json
{
  "isActive": false,
  "delayMinutes": 5
}
```

### Eliminar Automatización

**Endpoint:** `DELETE /whatsapp/automations/:id`

---

## WebSocket en Tiempo Real

El módulo emite eventos en tiempo real vía WebSocket en el namespace `/whatsapp`.

### Frontend: Conectar al WebSocket

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000/whatsapp', {
  withCredentials: true,
});

// Unirse a la sala del tenant
socket.emit('join', {
  organizationId: 1,
  companyId: 1,
});

socket.on('joined', (data) => {
  console.log('Joined room:', data.room);
});
```

### Eventos Recibidos

#### 1. QR Code Generado
```typescript
socket.on('qr', (data) => {
  // data.qrCode: string (base64)
  // data.timestamp: string
  setQrCode(data.qrCode);
});
```

#### 2. Conexión Exitosa
```typescript
socket.on('connected', (data) => {
  // data.phoneNumber: string
  // data.status: "CONNECTED"
  // data.timestamp: string
  setStatus('connected');
  setPhoneNumber(data.phoneNumber);
});
```

#### 3. Desconexión
```typescript
socket.on('disconnected', (data) => {
  // data.status: "DISCONNECTED"
  // data.reason: string (opcional)
  setStatus('disconnected');
});
```

#### 4. Mensaje Recibido
```typescript
socket.on('message', (data) => {
  // data.id: number
  // data.remoteJid: string
  // data.content: string
  // data.messageType: string
  // data.sentAt: Date
  addMessageToList(data);
});
```

#### 5. Mensaje Enviado
```typescript
socket.on('message-sent', (data) => {
  // data.id: number
  // data.to: string
  // data.content: string
  // data.status: "SENT"
  updateMessageStatus(data.id, 'sent');
});
```

#### 6. Error al Enviar Mensaje
```typescript
socket.on('message-failed', (data) => {
  // data.error: string
  // data.to: string
  showError(`Failed to send to ${data.to}: ${data.error}`);
});
```

#### 7. Automatización Ejecutada
```typescript
socket.on('automation-triggered', (data) => {
  // data.id: number
  // data.name: string
  // data.event: string
  // data.recipient: string
  showNotification(`Automation "${data.name}" triggered`);
});
```

---

## API Reference

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp/connect` | POST | Iniciar conexión WhatsApp |
| `/whatsapp/disconnect` | POST | Cerrar sesión WhatsApp |
| `/whatsapp/status` | GET | Estado de conexión actual |
| `/whatsapp/qr` | GET | Obtener último QR code |

### Messaging

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp/send` | POST | Enviar mensaje simple |
| `/whatsapp/send-template` | POST | Enviar mensaje con plantilla |
| `/whatsapp/send-bulk` | POST | Enviar mensaje masivo |
| `/whatsapp/messages` | GET | Historial de mensajes |

**Query params para `/messages`:**
- `clientId` (number, opcional) - Filtrar por cliente
- `salesId` (number, opcional) - Filtrar por venta
- `limit` (number, opcional) - Límite de resultados (default: 100)

### Templates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp/templates` | GET | Listar plantillas |
| `/whatsapp/templates` | POST | Crear plantilla |
| `/whatsapp/templates/:id` | GET | Obtener plantilla |
| `/whatsapp/templates/:id` | DELETE | Eliminar plantilla |

### Automations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp/automations` | GET | Listar automatizaciones |
| `/whatsapp/automations` | POST | Crear automatización |
| `/whatsapp/automations/:id` | GET | Obtener automatización |
| `/whatsapp/automations/:id` | POST | Actualizar automatización |
| `/whatsapp/automations/:id` | DELETE | Eliminar automatización |
| `/whatsapp/automations/:id/logs` | GET | Logs de automatización |

### Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/whatsapp/stats` | GET | Estadísticas de mensajes |

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalMessages": 1523,
    "sentMessages": 1200,
    "receivedMessages": 323,
    "failedMessages": 15,
    "activeAutomations": 8
  }
}
```

---

## Eventos Disponibles

Los siguientes eventos están disponibles para automatizaciones:

### 1. `sale.created`

Emitido cuando se crea una venta.

**Payload:**
```typescript
{
  saleId: number;
  organizationId: number;
  companyId: number;
}
```

**Variables disponibles en template:**
- `clientName` - Nombre del cliente
- `saleId` - ID de la venta
- `products` - Lista de productos (string con formato)
- `total` - Total de la venta

**Ejemplo de automatización:**
```json
{
  "triggerEvent": "sale.created",
  "recipients": ["client"],
  "templateId": 1  // "sale_confirmation"
}
```

### 2. `payment.overdue`

Emitido cuando un pago está vencido.

**Payload:**
```typescript
{
  invoiceId: number;
  organizationId: number;
  companyId: number;
}
```

**Variables disponibles:**
- `clientName`
- `invoiceNumber` - Serie + correlativo
- `total` - Monto total
- `fechaEmision` - Fecha de emisión

### 3. `inventory.low-stock`

Emitido cuando un producto alcanza el stock mínimo.

**Payload:**
```typescript
{
  productId: number;
  currentStock: number;
  minStock: number;
  organizationId: number;
  companyId: number;
}
```

**Variables disponibles:**
- `productName`
- `currentStock`
- `minStock`

**Nota:** Este evento se envía al teléfono admin (`ADMIN_WHATSAPP_PHONE`), no al cliente.

### 4. `quote.created`

Emitido cuando se crea una cotización.

**Payload:**
```typescript
{
  quoteId: number;
  organizationId: number;
  companyId: number;
}
```

**Variables disponibles:**
- `clientName`
- `quoteNumber`
- `items` - Lista de productos
- `subtotal`, `tax`, `total`
- `validity` - Fecha de validez

### 5. Emitir Eventos Personalizados

En tu código del backend, emite eventos usando `EventEmitter`:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(private eventEmitter: EventEmitter2) {}

async myBusinessLogic() {
  // Tu lógica de negocio

  // Emitir evento
  this.eventEmitter.emit('sale.created', {
    saleId: 123,
    organizationId: 1,
    companyId: 1,
  });
}
```

Luego crea la automatización desde el frontend para responder a `sale.created`.

---

## Troubleshooting

### Problema: QR Code no se genera

**Síntomas:**
- Endpoint `/whatsapp/connect` retorna sin `qrCode`
- Status queda en `CONNECTING`

**Soluciones:**
1. Verificar que no haya sesión activa:
   ```bash
   DELETE /whatsapp/disconnect
   ```
2. Reiniciar servidor backend
3. Revisar logs del backend para errores de Baileys

### Problema: Mensajes no se envían

**Síntomas:**
- Endpoint `/whatsapp/send` retorna 500 o error

**Soluciones:**
1. Verificar conexión activa:
   ```bash
   GET /whatsapp/status
   ```
   Debe retornar `isConnected: true`

2. Verificar formato de número:
   - Debe ser formato internacional sin `+` ni espacios
   - Ejemplo correcto: `51999999999`
   - Ejemplo incorrecto: `+51 999 999 999`

3. Verificar que el número no esté bloqueado en WhatsApp

4. Revisar logs de `WhatsAppMessage` con status `FAILED`

### Problema: Automatizaciones no se ejecutan

**Síntomas:**
- Evento se emite pero no llega mensaje

**Soluciones:**
1. Verificar que la automatización esté activa:
   ```bash
   GET /whatsapp/automations
   ```
   `isActive: true`

2. Verificar logs de automatización:
   ```bash
   GET /whatsapp/automations/:id/logs
   ```

3. Verificar que el cliente tenga teléfono registrado

4. Verificar filtros (`triggerFilters`) de la automatización

### Problema: WebSocket no se conecta

**Síntomas:**
- Frontend no recibe eventos en tiempo real

**Soluciones:**
1. Verificar URL del WebSocket:
   ```typescript
   const socket = io('http://localhost:4000/whatsapp', {
     withCredentials: true,
   });
   ```

2. Verificar CORS en backend (`whatsapp.gateway.ts`):
   ```typescript
   cors: {
     origin: ['http://localhost:3000'],
     credentials: true,
   }
   ```

3. Asegurarse de hacer `join` a la sala:
   ```typescript
   socket.emit('join', { organizationId, companyId });
   ```

4. Revisar consola del navegador para errores de conexión

### Problema: Sesión se desconecta frecuentemente

**Síntomas:**
- Hay que reconectar cada pocas horas

**Soluciones:**
1. WhatsApp puede detectar uso de WhatsApp Web en múltiples lugares
   - Solo mantener una sesión activa por número
   - No escanear el QR desde otro dispositivo

2. Verificar que `authData` se guarde correctamente en BD

3. Implementar auto-reconexión en el frontend:
   ```typescript
   socket.on('disconnected', () => {
     setTimeout(() => {
       fetch('/api/whatsapp/connect', { method: 'POST' });
     }, 5000);
   });
   ```

---

## Limitaciones de WhatsApp

### Límites de Envío

WhatsApp impone límites para prevenir spam:

- **Primeras 24h de uso:** ~50-100 mensajes/día
- **Después de verificación:** ~1,000 mensajes/día
- **Cuentas antiguas/verificadas:** Sin límite claro, pero envío masivo puede banear

**Recomendaciones:**
- No enviar más de 100 mensajes/hora en cuentas nuevas
- Esperar 2-3 segundos entre envíos masivos
- Evitar mensajes idénticos a múltiples destinatarios
- Personalizar mensajes con nombre del cliente

### Contenido Prohibido

WhatsApp puede banear números que envíen:
- Spam o contenido no solicitado
- Mensajes a números que te bloquearon
- Contenido ilegal o engañoso
- Enlaces acortados sospechosos

### Recomendaciones de Uso

1. **Obtener consentimiento:** Asegúrate que clientes acepten recibir mensajes
2. **Opt-out:** Permite que clientes puedan darse de baja
3. **Horarios:** Envía mensajes en horario comercial (9 AM - 7 PM)
4. **Relevancia:** Solo envía mensajes relevantes al cliente
5. **Frecuencia:** No satures con mensajes diarios

---

## Mejores Prácticas

### 1. Plantillas con Variables

Siempre usa variables para personalizar:

```
❌ Mal:
"Hola cliente, tu pedido está listo"

✅ Bien:
"Hola {{clientName}}, tu pedido #{{saleId}} está listo"
```

### 2. Emojis Moderados

Los emojis aumentan engagement, pero no abuses:

```
✅ Bien:
"🎉 Pedido confirmado - Gracias por tu compra"

❌ Mal:
"🎉🎊🥳 PEDIDO 🛒 CONFIRMADO 💯💯💯"
```

### 3. Mensajes Concisos

WhatsApp es mensajería rápida, sé breve:

```
✅ Bien:
"Tu pedido #123 está en camino. Llega en 30 min."

❌ Mal:
"Estimado cliente, queremos informarle que su pedido número 123 ha sido despachado desde nuestras instalaciones ubicadas en [dirección larga] y se encuentra actualmente en proceso de entrega..."
```

### 4. Llamados a la Acción Claros

Si esperas respuesta, dilo explícitamente:

```
✅ Bien:
"¿Confirmas la cita para mañana a las 3 PM? Responde SÍ o NO"

❌ Mal:
"Tu cita es mañana a las 3 PM"
```

### 5. Automatizaciones con Delays

Para eventos urgentes (venta confirmada): delay = 0
Para recordatorios (pago pendiente): delay = 60-1440 minutos

```json
{
  "triggerEvent": "sale.created",
  "delayMinutes": 0  // Inmediato
}

{
  "triggerEvent": "payment.overdue",
  "delayMinutes": 1440  // 24 horas después
}
```

---

## Ejemplos de Uso Completos

### Ejemplo 1: Confirmación de Venta

**Backend:** Emitir evento al crear venta

```typescript
// sales.service.ts
async createSale(dto: CreateSaleDto) {
  const sale = await this.prisma.sales.create({ data: dto });

  // Emitir evento
  this.eventEmitter.emit('sale.created', {
    saleId: sale.id,
    organizationId: sale.organizationId,
    companyId: sale.companyId,
  });

  return sale;
}
```

**Automatización:** Crear desde frontend

```typescript
await fetch('/api/whatsapp/automations', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Confirmación de venta',
    triggerEvent: 'sale.created',
    recipients: ['client'],
    templateId: 1,  // "sale_confirmation"
    isActive: true,
  }),
});
```

**Resultado:** Cliente recibe mensaje automáticamente al crear venta.

### Ejemplo 2: Recordatorio de Pago Manual

```typescript
// Enviar recordatorio manual a cliente específico
const client = await prisma.client.findUnique({ where: { id: 123 } });

if (client.phone) {
  await fetch('/api/whatsapp/send-template', {
    method: 'POST',
    body: JSON.stringify({
      to: client.phone,
      templateName: 'payment_reminder',
      variables: {
        clientName: client.name,
        invoiceNumber: 'F001-00001234',
        amount: '1,500.00',
        dueDate: '20/02/2026',
      },
    }),
  });
}
```

### Ejemplo 3: Alerta de Stock Bajo

**Backend:** Verificar stock al vender

```typescript
// sales.service.ts
async createSale(dto: CreateSaleDto) {
  // ... crear venta

  // Verificar stock después de venta
  for (const detail of sale.salesDetails) {
    const inventory = await this.prisma.storeOnInventory.findFirst({
      where: { productId: detail.productId },
      include: { product: true },
    });

    if (inventory.stock <= inventory.product.minStock) {
      this.eventEmitter.emit('inventory.low-stock', {
        productId: inventory.productId,
        currentStock: inventory.stock,
        minStock: inventory.product.minStock,
        organizationId: sale.organizationId,
        companyId: sale.companyId,
      });
    }
  }
}
```

**Automatización:**

```json
{
  "name": "Alerta de stock bajo",
  "triggerEvent": "inventory.low-stock",
  "recipients": ["admin"],
  "templateId": 5,  // "low_stock_alert"
  "isActive": true
}
```

---

## Seguridad y Privacidad

### Multi-Tenancy

Todas las operaciones están aisladas por `organizationId` y `companyId`:

- Cada organización tiene su propia sesión WhatsApp
- Los mensajes solo se vinculan a clientes de la misma organización
- Las plantillas no se comparten entre organizaciones

### Almacenamiento de Credenciales

- `authData` (credenciales de WhatsApp) se almacena encriptado en `WhatsAppSession`
- Nunca se expone en la API

### Validación de Números

- Los números de teléfono se validan antes de enviar
- Formato: sin `+`, sin espacios, código de país + número

### Rate Limiting

Considera implementar rate limiting para evitar spam:

```typescript
// En un guardia personalizado
if (messagesInLastHour > 100) {
  throw new TooManyRequestsException('Rate limit exceeded');
}
```

---

## Próximas Mejoras

- [ ] Soporte para imágenes y archivos adjuntos
- [ ] WhatsApp Business API (mensajes a gran escala)
- [ ] Estadísticas avanzadas de engagement
- [ ] Chatbot con respuestas automáticas
- [ ] Integración con n8n para workflows complejos
- [ ] Plantillas con condicionales (if/else)
- [ ] Envío programado (schedule para fecha específica)
- [ ] Grupos de WhatsApp

---

## Soporte

Para reportar bugs o solicitar features:
- Email: soporte@ejemplo.com
- Documentación: `/docs`

---

**Última actualización:** 2026-02-21
**Versión del módulo:** 1.0.0
