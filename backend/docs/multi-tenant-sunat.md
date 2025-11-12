Plan inicial para la actualización SUNAT:

Modelo y migraciones

Extender Company con campos SUNAT (credenciales dev/prod, modo activo, rutas de certificado/llave, opcionalmente fecha de expiración).
Crear migración Prisma + ajustar CompanyEntity/DTOs del backend.
### Avance 1 (2025-05-11) Modelo y migraciones

### Avance 2 (2025-05-11) Carga de certificados SUNAT

- ``POST /companies/:id/sunat/upload`` permite subir certificados/llaves para beta o produccion bajo la organizacion activa.
### Avance 3 (2025-05-11) UI y API en frontend

- `tenancy.api.ts` ahora expone todos los campos SUNAT y agrega `uploadCompanySunatFile` para enviar certificados/llaves.
- El formulario de edicion de empresas permite seleccionar el ambiente activo, editar credenciales SOL y subir certificados/keys para beta y produccion.
### Avance 4 (2025-05-11) Backend usa credenciales por empresa

- `SunatController` exige contexto de tenant y resuelve la empresa desde `companyId` o la seleccion activa.
- `SunatService.sendDocument` obtiene credenciales/certificados segun el ambiente (beta/prod), valida archivos y usa el RUC configurado antes de firmar/enviar.
- Nuevo `sunat.service.spec.ts` cubre la seleccion de credenciales y errores cuando falta configuracion.
### Avance 5 (2025-05-11) Registro de envios

- Prisma incorpora `SunatTransmission` (migracion `20251109103000_add_sunat_transmissions`) para auditar cada envio a SUNAT.
- `SunatService` crea/actualiza registros con ambiente, serie, estado y respuesta/error devuelta.
- Nuevas pruebas unitarias (`sunat.service.spec.ts`) cubren la seleccion de credenciales y el logging por envio.



- `TenancyService.updateCompanySunatFile` valida el tenant y actualiza las rutas correspondientes en la empresa.
- Nuevas pruebas unitarias cubren la creacion/actualizacion de credenciales y la carga de archivos.

- Prisma Company ahora define:
  - sunatEnvironment (BETA por defecto) y sunatRuc.
  - Credenciales beta: sunatSolUserBeta, sunatSolPasswordBeta, sunatCertPathBeta, sunatKeyPathBeta.
  - Credenciales produccion: sunatSolUserProd, sunatSolPasswordProd, sunatCertPathProd, sunatKeyPathProd.
- Migracion 20251109090000_add_sunat_fields_company agrega las columnas en la tabla Company.

API backend

Actualizar controller/service de tenancy (/api/companies/:id) para aceptar los nuevos campos con validaciones y scoping por TenantContext.
Añadir endpoints seguros para subir/gestionar certificados y llaves por empresa (almacenamiento separado por companyId + ambiente).
Lógica SUNAT

Modificar SunatService.sendDocument para recibir companyId y tomar credenciales según el ambiente seleccionado (beta/prod), incluyendo URL, usuario SOL, password, paths CRT/KEY.
Registrar cada envío y su respuesta (ticket/CDR) en DB para trazabilidad; manejar reintentos/errores.
Frontend Tenancy

Extender tenancy.api.ts (UpdateCompanyPayload) y CompanyEditForm con secciones “SUNAT Beta” y “SUNAT Producción” (usuario, clave, RUC opcional, uploads CRT/KEY, selector de ambiente activo).
Agregar UI para mostrar estado/expiración de certificados, permitir descarga y reemplazo.
Seguridad y permisos

Limitar edición de credenciales SUNAT a roles específicos; almacenar contraseñas cifradas.
Auditar cambios (quién modificó credenciales y cuándo).
Pruebas y documentación

Preparar scripts de prueba en beta (MODDATOS) y producción (credenciales reales).
Documentar pasos para convertir certificados (.pfx → .pem/.key) y cargar en el sistema.
Este backlog deja la estructura lista para implementar la funcionalidad sin bloquear otros equipos.

### Avance 6 (2025-05-11) Envios SUNAT UI`n`n- GET /companies/:id/sunat/transmissions expone el historial para cada empresa.`n- 	enancy.api.ts obtiene los registros y el formulario muestra la seccion ***Envios SUNAT*** con el icono de envio de tarjeta.


### Avance 7 (2025-05-11) Reintentos de Envio`n`n- SunatTransmission guarda el payload y estado, permitiendo 
etryTransmission.`n- POST /sunat/transmissions/:id/retry reenvia un comprobante respetando los permisos del tenant.`n- La UI de Envios SUNAT agrega el boton **Reintentar** para envios fallidos.


### Avance 8 (2025-05-11) Envio automatico desde Ventas`n`n- SalesService invoca SunatService.sendDocument despues de crear una factura/boleta.`n- Logs de transmisiones registran cada env�o autom�tico con su payload y estado.`n- El frontend refleja el historial en la seccion Envios SUNAT para cada empresa.


### Avance 9 (2025-05-11) Estado SUNAT en ventas y �rdenes

- SunatTransmission ahora referencia la venta (`saleId`) para trazar cada env�o y permitir reintentos contextualizados.
- SalesService y WebSalesService devuelven el �ltimo estado SUNAT y el historial reciente de transmisiones asociados a cada venta/orden.
- La tabla de ventas, el modal de detalle y las pantallas de �rdenes muestran badges con el estado SUNAT, ticket y mensajes de error cuando aplica.
- Las �rdenes tienen un resumen dedicado con el hist�rico de transmisiones para facilitar soporte sin abandonar el flujo comercial.
