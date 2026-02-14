# Dise�o: Trazabilidad de Cotizaciones

Fecha: 2026-02-11

## Objetivo
Agregar trazabilidad completa de cotizaciones (borrador, emitida, cancelada) con numeracion secuencial por año y empresa, y un historial consultable desde el frontend.

## Alcance
- Backend: modelos, endpoints y logica de secuencia.
- Frontend: ruta de historial ` /dashboard/quotes/history `, acciones basicas y vinculacion desde la seccion de cotizaciones.

## Modelo de datos
### Quote
- id
- companyId
- organizationId
- status: `DRAFT | ISSUED | CANCELLED`
- quoteNumber: `COT-YYYY-000001` (solo al emitir)
- issuedAt, cancelledAt, createdAt, updatedAt
- currency, validity, conditions, taxRate
- subtotal, taxAmount, marginAmount, total
- clientId (opcional), clientNameSnapshot, contactSnapshot
- createdById

### QuoteItem
- id, quoteId
- productId (nullable)
- name, description, specs (snapshot)
- unitPrice, costPrice, quantity, lineTotal
- type: `PRODUCT | SERVICE | WARRANTY`
- category: `PC | LAPTOP | HARDWARE | SERVICE | WARRANTY`

### QuoteSequence
- id
- companyId
- year
- current

## Reglas clave
- La numeracion se genera al emitir, por empresa y año.
- La informacion de items se congela al emitir (snapshot).
- Borradores pueden modificarse; emitidas no.
- Canceladas conservan historial completo.

## Endpoints
- `POST /quotes` crear borrador
- `PUT /quotes/:id` actualizar borrador
- `POST /quotes/:id/issue` emitir (genera numero)
- `POST /quotes/:id/cancel` cancelar
- `GET /quotes` listado con filtros
- `GET /quotes/:id` detalle

Opcionales:
- `GET /quotes/sequence/next` previsualizar numero (sin reservar)
- `POST /quotes/:id/pdf` generar PDF en backend

## UI/UX
- Nueva ruta: ` /dashboard/quotes/history `
- Acceso desde seccion de cotizaciones: boton Ver Historial de Cotizaciones.
- Tabla con columnas: Nro, Cliente, Fecha, Estado, Total.
- Filtros por estado, rango de fecha, cliente, numero.
- Acciones: ver detalle, imprimir, reenviar, duplicar.

## Errores y validaciones
- 400: datos minimos faltantes o sin items.
- 404: cotizacion no existe o no pertenece a la empresa.
- 409: emitir cotizacion ya emitida/cancelada.
- 422: cantidades invalidas.

## Seguridad
- Guardas: JwtAuthGuard, RolesGuard, TenantRequiredGuard.
- Permiso: modulo `sales`.
- Validar pertenencia a empresa/organizacion.

## Pruebas
- Unit: secuencia por empresa/año, generacion de numero, transiciones de estado.
- Integration: flujo completo (crear -> editar -> emitir -> listar -> cancelar).
- UI: filtros y acciones en historial.
