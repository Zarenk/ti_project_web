/**
 * Predefined WhatsApp Message Templates
 *
 * These templates can be created via API or seeded into the database
 * for immediate use by organizations.
 *
 * Variable substitution: Use {{variableName}} syntax
 * Example: "Hola {{clientName}}, tu pedido #{{orderId}} está listo"
 */

export interface TemplateDefinition {
  name: string;
  displayName: string;
  content: string;
  description: string;
  category: string;
  variables: string[];
}

export const PREDEFINED_TEMPLATES: TemplateDefinition[] = [
  // ============================================================================
  // VENTAS - Sales Templates
  // ============================================================================
  {
    name: 'sale_confirmation',
    displayName: 'Confirmación de Pedido',
    description: 'Confirma un pedido de venta al cliente',
    category: 'ventas',
    variables: ['clientName', 'saleId', 'products', 'total', 'storeName'],
    content: `🎉 *Pedido Confirmado*

Hola {{clientName}},

Tu pedido #{{saleId}} ha sido confirmado en {{storeName}}.

📦 *Productos:*
{{products}}

💰 *Total:* S/ {{total}}

¡Gracias por tu compra! 🙏

Si tienes alguna pregunta, no dudes en contactarnos.`,
  },
  {
    name: 'sale_ready_pickup',
    displayName: 'Pedido Listo para Recoger',
    description: 'Notifica que el pedido está listo para recoger',
    category: 'ventas',
    variables: ['clientName', 'saleId', 'storeAddress', 'storePhone'],
    content: `✅ *Pedido Listo*

Hola {{clientName}},

Tu pedido #{{saleId}} está listo para recoger.

📍 *Dirección:*
{{storeAddress}}

📞 *Teléfono:*
{{storePhone}}

*Horario de atención:* Lunes a Sábado de 9:00 AM a 7:00 PM

Te esperamos 😊`,
  },
  {
    name: 'sale_delivery_dispatched',
    displayName: 'Pedido en Camino',
    description: 'Notifica que el pedido fue despachado para delivery',
    category: 'ventas',
    variables: ['clientName', 'saleId', 'estimatedTime', 'driverName', 'driverPhone'],
    content: `🚚 *Pedido en Camino*

Hola {{clientName}},

Tu pedido #{{saleId}} está en camino.

🕐 *Tiempo estimado:* {{estimatedTime}}
👤 *Repartidor:* {{driverName}}
📱 *Teléfono:* {{driverPhone}}

Estamos cerca 🙂`,
  },

  // ============================================================================
  // PAGOS - Payment Templates
  // ============================================================================
  {
    name: 'payment_reminder',
    displayName: 'Recordatorio de Pago',
    description: 'Recuerda al cliente sobre un pago pendiente',
    category: 'pagos',
    variables: ['clientName', 'invoiceNumber', 'amount', 'dueDate', 'daysOverdue'],
    content: `⚠️ *Recordatorio de Pago*

Hola {{clientName}},

Tu factura {{invoiceNumber}} tiene un saldo pendiente.

💰 *Monto:* S/ {{amount}}
📅 *Vencimiento:* {{dueDate}}
⏰ *Días de retraso:* {{daysOverdue}}

Por favor, procede con el pago a la brevedad para evitar inconvenientes.

Métodos de pago: Transferencia, Yape, Plin, Efectivo`,
  },
  {
    name: 'payment_received',
    displayName: 'Confirmación de Pago Recibido',
    description: 'Confirma la recepción de un pago',
    category: 'pagos',
    variables: ['clientName', 'amount', 'invoiceNumber', 'paymentDate', 'paymentMethod'],
    content: `✅ *Pago Recibido*

Hola {{clientName}},

Confirmamos la recepción de tu pago:

💰 *Monto:* S/ {{amount}}
📄 *Factura:* {{invoiceNumber}}
📅 *Fecha:* {{paymentDate}}
💳 *Método:* {{paymentMethod}}

¡Gracias por tu pago! Tu cuenta está al día.`,
  },

  // ============================================================================
  // INVENTARIO - Inventory Templates
  // ============================================================================
  {
    name: 'low_stock_alert',
    displayName: 'Alerta de Stock Bajo',
    description: 'Notifica al administrador sobre stock bajo',
    category: 'inventario',
    variables: ['productName', 'currentStock', 'minStock', 'storeName'],
    content: `🚨 *Alerta de Stock Bajo*

Producto: *{{productName}}*
Tienda: {{storeName}}

📦 Stock actual: {{currentStock}} unidades
⚠️ Stock mínimo: {{minStock}}

Se recomienda reabastecer pronto.`,
  },
  {
    name: 'stock_replenished',
    displayName: 'Stock Reabastecido',
    description: 'Confirma que un producto fue reabastecido',
    category: 'inventario',
    variables: ['productName', 'quantity', 'newStock', 'providerName'],
    content: `✅ *Stock Reabastecido*

Producto: *{{productName}}*

📦 Cantidad ingresada: {{quantity}} unidades
📊 Stock actual: {{newStock}} unidades
🏢 Proveedor: {{providerName}}

Inventario actualizado.`,
  },

  // ============================================================================
  // COTIZACIONES - Quotes Templates
  // ============================================================================
  {
    name: 'quote_sent',
    displayName: 'Cotización Enviada',
    description: 'Envía una cotización al cliente',
    category: 'cotizaciones',
    variables: ['clientName', 'quoteNumber', 'items', 'subtotal', 'tax', 'total', 'validUntil'],
    content: `📋 *Nueva Cotización*

Hola {{clientName}},

Hemos generado la cotización {{quoteNumber}} para ti.

*Productos:*
{{items}}

*Subtotal:* S/ {{subtotal}}
*IGV (18%):* S/ {{tax}}
*Total:* S/ {{total}}

📅 Válida hasta: {{validUntil}}

¿Tienes alguna pregunta sobre esta cotización?`,
  },
  {
    name: 'quote_expiring_soon',
    displayName: 'Cotización por Vencer',
    description: 'Recuerda que una cotización está por vencer',
    category: 'cotizaciones',
    variables: ['clientName', 'quoteNumber', 'total', 'expiresInDays'],
    content: `⏰ *Cotización por Vencer*

Hola {{clientName}},

Tu cotización {{quoteNumber}} está por vencer.

💰 Monto: S/ {{total}}
⏳ Vence en: {{expiresInDays}} días

¿Te gustaría proceder con el pedido?`,
  },

  // ============================================================================
  // RESTAURANTE - Restaurant Templates
  // ============================================================================
  {
    name: 'restaurant_order_received',
    displayName: 'Pedido de Restaurante Recibido',
    description: 'Confirma la recepción de un pedido de restaurante',
    category: 'restaurante',
    variables: ['clientName', 'orderId', 'orderType', 'items', 'total', 'estimatedTime'],
    content: `🍽️ *Pedido Recibido*

Hola {{clientName}},

Tu pedido #{{orderId}} ha sido recibido.

📋 *Tipo:* {{orderType}}
🕐 *Tiempo estimado:* {{estimatedTime}}

*Ítems:*
{{items}}

💰 *Total:* S/ {{total}}

¡Tu pedido está siendo preparado! 👨‍🍳`,
  },
  {
    name: 'restaurant_order_ready',
    displayName: 'Pedido de Restaurante Listo',
    description: 'Notifica que el pedido de restaurante está listo',
    category: 'restaurante',
    variables: ['clientName', 'orderId', 'orderType', 'tableNumber'],
    content: `✅ *Pedido Listo*

Hola {{clientName}},

Tu pedido #{{orderId}} está listo.

{{#if tableNumber}}
🪑 Mesa: {{tableNumber}}
{{else}}
{{#if orderType === 'TAKEAWAY'}}
📦 Pasa por caja para recogerlo
{{/if}}
{{/if}}

¡Buen provecho! 😋`,
  },
  {
    name: 'table_reservation_confirmed',
    displayName: 'Reserva de Mesa Confirmada',
    description: 'Confirma una reserva de mesa',
    category: 'restaurante',
    variables: ['clientName', 'tableNumber', 'reservationDate', 'reservationTime', 'partySize', 'restaurantName', 'restaurantPhone'],
    content: `✅ *Reserva Confirmada*

Hola {{clientName}},

Tu reserva en {{restaurantName}} ha sido confirmada.

🪑 Mesa: {{tableNumber}}
👥 Personas: {{partySize}}
📅 Fecha: {{reservationDate}}
🕐 Hora: {{reservationTime}}

📞 Teléfono: {{restaurantPhone}}

¡Te esperamos! 🍽️`,
  },

  // ============================================================================
  // LEGAL - Law Firm Templates
  // ============================================================================
  {
    name: 'hearing_reminder',
    displayName: 'Recordatorio de Audiencia',
    description: 'Recuerda al cliente sobre una audiencia próxima',
    category: 'legal',
    variables: ['clientName', 'hearingType', 'hearingDate', 'hearingTime', 'courtName', 'courtAddress', 'lawyerName'],
    content: `⚖️ *Recordatorio de Audiencia*

Hola {{clientName}},

Tienes una audiencia próxima:

📋 *Tipo:* {{hearingType}}
📅 *Fecha:* {{hearingDate}}
🕐 *Hora:* {{hearingTime}}

🏛️ *Juzgado:* {{courtName}}
📍 *Dirección:* {{courtAddress}}

👨‍⚖️ *Abogado:* {{lawyerName}}

Por favor, llega 15 minutos antes. No olvides tu DNI.`,
  },
  {
    name: 'case_update',
    displayName: 'Actualización de Expediente',
    description: 'Notifica al cliente sobre avances en su caso',
    category: 'legal',
    variables: ['clientName', 'caseNumber', 'updateType', 'updateDescription', 'nextSteps', 'lawyerName'],
    content: `📋 *Actualización de Expediente*

Hola {{clientName}},

Tenemos una actualización sobre tu caso {{caseNumber}}:

📌 *Tipo:* {{updateType}}

*Detalles:*
{{updateDescription}}

*Próximos pasos:*
{{nextSteps}}

👨‍⚖️ *Abogado a cargo:* {{lawyerName}}

Si tienes preguntas, estamos a tu disposición.`,
  },

  // ============================================================================
  // GENERAL - General Templates
  // ============================================================================
  {
    name: 'welcome_message',
    displayName: 'Mensaje de Bienvenida',
    description: 'Da la bienvenida a un nuevo cliente',
    category: 'general',
    variables: ['clientName', 'companyName', 'companyPhone', 'companyWebsite'],
    content: `👋 *¡Bienvenido!*

Hola {{clientName}},

Gracias por elegir {{companyName}}.

Estamos aquí para ayudarte. Si tienes alguna consulta, no dudes en contactarnos:

📞 {{companyPhone}}
🌐 {{companyWebsite}}

¡Esperamos servirte pronto! 😊`,
  },
  {
    name: 'thank_you_message',
    displayName: 'Mensaje de Agradecimiento',
    description: 'Agradece al cliente por su compra/servicio',
    category: 'general',
    variables: ['clientName', 'companyName'],
    content: `🙏 *¡Gracias!*

Hola {{clientName}},

Gracias por confiar en {{companyName}}.

Tu satisfacción es nuestra prioridad. Esperamos verte pronto.

¿Nos ayudarías con una reseña? Tu opinión es muy valiosa para nosotros.`,
  },
  {
    name: 'appointment_reminder',
    displayName: 'Recordatorio de Cita',
    description: 'Recuerda al cliente sobre una cita programada',
    category: 'general',
    variables: ['clientName', 'appointmentDate', 'appointmentTime', 'appointmentType', 'location', 'contactPhone'],
    content: `📅 *Recordatorio de Cita*

Hola {{clientName}},

Te recordamos tu cita:

📋 *Tipo:* {{appointmentType}}
📅 *Fecha:* {{appointmentDate}}
🕐 *Hora:* {{appointmentTime}}
📍 *Lugar:* {{location}}

📞 Para reprogramar: {{contactPhone}}

¡Te esperamos! 😊`,
  },
  {
    name: 'birthday_greeting',
    displayName: 'Saludo de Cumpleaños',
    description: 'Saluda al cliente en su cumpleaños',
    category: 'general',
    variables: ['clientName', 'companyName', 'discountCode', 'discountPercent'],
    content: `🎂 *¡Feliz Cumpleaños!*

Hola {{clientName}},

Todo el equipo de {{companyName}} te desea un feliz cumpleaños.

🎁 Como regalo, usa el código:
*{{discountCode}}*
Para obtener {{discountPercent}}% de descuento en tu próxima compra.

¡Que tengas un día increíble! 🎉`,
  },

  // ============================================================================
  // SOPORTE - Support Templates
  // ============================================================================
  {
    name: 'support_ticket_received',
    displayName: 'Ticket de Soporte Recibido',
    description: 'Confirma la recepción de un ticket de soporte',
    category: 'soporte',
    variables: ['clientName', 'ticketNumber', 'issueType', 'estimatedResponse'],
    content: `🎫 *Ticket Recibido*

Hola {{clientName}},

Hemos recibido tu solicitud de soporte.

🔢 *Ticket:* #{{ticketNumber}}
📋 *Tipo:* {{issueType}}
🕐 *Respuesta estimada:* {{estimatedResponse}}

Nuestro equipo está revisando tu caso y te contactaremos pronto.

Gracias por tu paciencia.`,
  },
  {
    name: 'support_ticket_resolved',
    displayName: 'Ticket de Soporte Resuelto',
    description: 'Notifica que un ticket fue resuelto',
    category: 'soporte',
    variables: ['clientName', 'ticketNumber', 'resolution', 'satisfactionSurveyLink'],
    content: `✅ *Ticket Resuelto*

Hola {{clientName}},

Tu ticket #{{ticketNumber}} ha sido resuelto.

*Solución:*
{{resolution}}

¿Quedaste satisfecho con la atención?
Califícanos aquí: {{satisfactionSurveyLink}}

Estamos aquí si necesitas más ayuda.`,
  },

  // ============================================================================
  // COMPROBANTES - SUNAT Invoice Templates
  // ============================================================================
  {
    name: 'invoice_sunat_accepted',
    displayName: 'Comprobante Aceptado por SUNAT',
    description: 'Notifica al cliente que su comprobante fue aceptado por SUNAT',
    category: 'comprobantes',
    variables: ['clientName', 'invoiceType', 'serie', 'correlativo', 'total', 'companyName'],
    content: `Hola {{clientName}},

Su {{invoiceType}} {{serie}}-{{correlativo}} por S/ {{total}} ha sido emitida y aceptada por SUNAT.

Le adjuntamos el comprobante electronico.

{{companyName}}
Gracias por su preferencia.`,
  },
];

/**
 * Helper function to create templates for an organization
 * Can be used in seed scripts or migration files
 */
export function createTemplatesForOrganization(
  organizationId: number,
  companyId: number,
  selectedCategories?: string[],
): Array<{
  organizationId: number;
  companyId: number;
  name: string;
  displayName: string;
  content: string;
  description: string;
  category: string;
  variables: string[];
}> {
  let templates = PREDEFINED_TEMPLATES;

  if (selectedCategories && selectedCategories.length > 0) {
    templates = templates.filter((t) =>
      selectedCategories.includes(t.category),
    );
  }

  return templates.map((template) => ({
    organizationId,
    companyId,
    ...template,
  }));
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: string,
): TemplateDefinition[] {
  return PREDEFINED_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): string[] {
  return Array.from(new Set(PREDEFINED_TEMPLATES.map((t) => t.category)));
}
