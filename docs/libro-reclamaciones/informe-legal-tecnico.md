# Informe Legal-Técnico: Libro de Reclamaciones Digital

**Versión:** 2.0 (corregida)
**Fecha:** 2026-03-11
**Estado:** Aprobado para diseño técnico
**Destinatario:** Comité legal/técnico

---

## 1. Marco Normativo Completo

| # | Norma | Fecha | Propósito |
|---|-------|-------|-----------|
| 1 | **Ley N° 29571** — Código de Protección y Defensa del Consumidor | Sep 2010 | Art. 150-151: obligación de libro de reclamaciones (físico o virtual) |
| 2 | **DS N° 011-2011-PCM** — Reglamento del Libro de Reclamaciones | Feb 2011 | Reglamento original: 15 artículos, Anexo I (formato hoja), Anexo II (aviso) |
| 3 | **DS N° 006-2014-PCM** — Primera modificación | Ene 2014 | Ajustes al reglamento |
| 4 | **DS N° 058-2017-PCM** — Segunda modificación | 2017 | Mejoras de eficiencia |
| 5 | **DS N° 101-2022-PCM** — Tercera modificación | Ago 2022 | Implementa 15 días hábiles, modifica Art. 3.4, Art. 6, Art. 6-A.2(b), agrega Art. 6-B, **modifica Anexo I** |
| 6 | **Ley N° 31435** | 2022 | Reduce plazo de respuesta de 30 a 15 días hábiles improrrogables |
| 7 | **Ley N° 32495** | Nov 2025 | Extiende obligación a todas las plataformas de comercio electrónico |
| 8 | **Resolución 119-2014/INDECOPI-COD** — Directiva SIREC | 2014 | Regula Sistema de Reportes de Reclamaciones |

**Fuentes oficiales verificadas:**
- Ley 29571: https://www.gob.pe/institucion/presidencia/normas-legales/541080-011-2011-pcm
- DS 011-2011-PCM: https://www.gob.pe/institucion/presidencia/normas-legales/541080-011-2011-pcm
- DS 006-2014-PCM: https://www.gob.pe/institucion/indecopi/normas-legales/5585125-006-2014-pcm
- DS 058-2017-PCM: https://www.gob.pe/institucion/indecopi/normas-legales/3462483-decreto-supremo-n-058-2017-pcm
- DS 101-2022-PCM: https://www.gob.pe/institucion/pcm/normas-legales/3346742-101-2022-pcm
- Anexo I (DS 101-2022-PCM): https://spij.minjus.gob.pe/Graficos/Peru/2022/Agosto/16/DS-101-2022-PCM_ANEXO.pdf
- SIREC: https://www.gob.pe/14120-acceder-al-sistema-de-reporte-de-reclamaciones-del-indecopi
- Directiva SIREC: https://www.gob.pe/institucion/indecopi/normas-legales/1683494-119-2014-indecopi-cod
- UIT 2026: https://www.gob.pe/435-valor-de-la-uit-en-el-ano-2026
- INDECOPI sobre Ley 32495: https://www.gob.pe/institucion/indecopi/noticias/1286430

---

## 2. Validez Legal del Formato Virtual

El Art. 150 de la Ley 29571 permite explícitamente el libro **"en forma física o virtual"**.

**Requisitos para formato virtual:**
- Debe estar en la **página de inicio** del portal web del proveedor
- Enlace/botón **claramente identificable y permanentemente visible**
- Debe permitir **impresión** de la hoja de reclamación
- Debe enviar **copia automática por email** al consumidor con fecha y hora
- Se debe ofrecer **soporte técnico** al consumidor
- Para e-commerce (Ley 32495): obligación extendida a plataformas digitales

**Requisito de respaldo:**
- En establecimientos físicos, se debe tener un **libro físico de respaldo** cuando el sistema virtual no esté disponible
- El libro virtual **NO requiere registro ni certificación** ante INDECOPI

---

## 3. Campos Oficiales — Anexo I Modificado por DS 101-2022-PCM

> **FUENTE**: Documento oficial firmado digitalmente por INDECOPI (Peña Cardoza Ana, FAU 20133840533, 27.06.2022 / Urillus Soriano Julio Martín, FAU 20133840533, 23.06.2022)

### Encabezado

| Campo | Formato Oficial | Obligatorio |
|-------|-----------------|-------------|
| Título | "LIBRO DE RECLAMACIONES — HOJA DE RECLAMACIÓN" | Sí |
| Número correlativo | `Nº 000000001-202X` (9 dígitos + año) | Sí |
| Fecha | DÍA / MES / AÑO | Sí |
| Nombre o razón social del proveedor | Texto libre | Sí |
| RUC del proveedor | Numérico | Sí |
| Domicilio del establecimiento | Texto libre | Sí |
| Código de identificación | Alfanumérico | Sí |

### Sección 1: Identificación del Consumidor Reclamante

| Campo | Formato | Obligatorio |
|-------|---------|-------------|
| NOMBRE | Texto libre (nombre completo) | **Sí (indispensable)** |
| DOMICILIO | Dirección completa | **Sí (indispensable — o email)** |
| DNI / CE | Documento de identidad | **Sí (indispensable)** |
| TELÉFONO / E-MAIL | Contacto | Sí (INDECOPI ha dictaminado que teléfono no es indispensable por sí solo) |
| PADRE O MADRE | Para menores de edad | Condicional |

### Sección 2: Identificación del Bien Contratado

| Campo | Formato | Obligatorio |
|-------|---------|-------------|
| Tipo: PRODUCTO / SERVICIO | Selección (radio/checkbox) | Sí |
| MONTO RECLAMADO | Numérico con moneda | Sí |
| DESCRIPCIÓN | Texto libre | Sí |

### Sección 3: Detalle de la Reclamación y Pedido del Consumidor

| Campo | Formato | Obligatorio |
|-------|---------|-------------|
| Tipo: RECLAMO¹ / QUEJA² | Selección obligatoria | **Sí (indispensable)** |
| DETALLE | Texto libre extenso | **Sí (indispensable)** |
| PEDIDO | Texto libre (pedido concreto) | Sí |
| FIRMA DEL CONSUMIDOR | En virtual: checkbox/botón de confirmación | Sí |

### Sección 4: Observaciones y Acciones del Proveedor

| Campo | Formato | Obligatorio |
|-------|---------|-------------|
| Observaciones/acciones | Texto libre | Para respuesta del proveedor |
| FECHA DE COMUNICACIÓN DE LA RESPUESTA | DÍA / MES / AÑO | Al momento de responder |
| FIRMA DEL PROVEEDOR | En virtual: registro del usuario respondedor | Al momento de responder |

### Pie de página obligatorio (literal del Anexo I)

> ¹ **RECLAMO**: Disconformidad relacionada a los productos o servicios.
>
> ² **QUEJA**: Disconformidad no relacionada a los productos o servicios; o, malestar o descontento respecto a la atención al público.
>
> Destinatario (consumidor, proveedor o INDECOPI según corresponda)
>
> *La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
>
> *El proveedor debe dar respuesta al reclamo o queja en un plazo no mayor a quince (15) días hábiles, el cual es improrrogable.

### Campos mínimos indispensables (sin ellos = "no presentado")

1. Nombre del consumidor
2. DNI / CE
3. Domicilio **o** email
4. Fecha
5. Detalle del reclamo/queja

---

## 4. Diferencia: Reclamo vs Queja

| Aspecto | Reclamo | Queja |
|---------|---------|-------|
| **Definición oficial** | Disconformidad relacionada a los **productos o servicios** | Disconformidad **no relacionada** a productos/servicios; o malestar respecto a la **atención al público** |
| **Ejemplo** | Producto defectuoso, servicio no prestado, publicidad engañosa | Personal descortés, demoras excesivas, instalaciones inadecuadas |
| **Plazo respuesta** | **15 días hábiles improrrogables** | **15 días hábiles improrrogables** (desde DS 101-2022-PCM, Art. 6-B) |
| **Reclasificación** | N/A | Si una "queja" es en realidad un reclamo, el proveedor debe tratarla como reclamo |

---

## 5. Plazos y Obligaciones

| Obligación | Plazo | Base Legal |
|------------|-------|------------|
| Respuesta a reclamo | **15 días hábiles, improrrogable** | Ley 31435 + DS 101-2022-PCM Art. 6 |
| Respuesta a queja | **15 días hábiles, improrrogable** | DS 101-2022-PCM Art. 6-B |
| Canal de respuesta | El que indicó el consumidor (email o carta) | DS 011-2011-PCM Art. 6 |
| Conservación de registros | **Mínimo 2 años** desde la fecha | DS 011-2011-PCM |
| Envío de copia al consumidor | **Inmediato** (email automático con fecha/hora) | DS 011-2011-PCM Art. 5 (virtual) |

---

## 6. Reporte a INDECOPI — Sistema SIREC

| Aspecto | Detalle |
|---------|---------|
| **Obligatorio para** | Empresas con ingresos anuales >= **3,000 UIT** (S/ 16,500,000 en 2026) |
| **Sistema** | SIREC — plataforma web de INDECOPI ("Controla tus Reclamos") |
| **Modalidad** | Carga individual o masiva vía web |
| **API pública** | **No existe** — solo interfaz web |
| **Carácter del reporte** | Declaración jurada |
| **Bajo el umbral** | No obligatorio, pero INDECOPI puede solicitar registros en cualquier momento |
| **Normativa** | Resolución 119-2014/INDECOPI-COD (Directiva SIREC) |

> **Nota**: El plazo exacto de reporte desde obtención de credenciales requiere verificación contra el texto íntegro de la Directiva 004-2014/DIR-COD-INDECOPI. Las fuentes secundarias mencionan 30 días calendario, pero se recomienda confirmar con el documento original antes de establecer como requisito firme.

---

## 7. Sanciones por Incumplimiento

> **NOTA**: Los rangos son **referenciales**. El Código de Protección al Consumidor (Ley 29571, Art. 110-112) clasifica infracciones por **gravedad** y aplica **criterios de graduación**. Las multas finales dependen del caso concreto.

| Calificación | Multa máxima | Equivalente 2026 (UIT = S/ 5,500) |
|--------------|-------------|-----------------------------------|
| **Leves** | Hasta 50 UIT | Hasta **S/ 275,000** |
| **Graves** | Hasta 150 UIT | Hasta **S/ 825,000** |
| **Muy graves** | Hasta 450 UIT | Hasta **S/ 2,475,000** |

**Infracciones típicas relacionadas al libro de reclamaciones:**

| Conducta | Calificación referencial |
|----------|------------------------|
| No tener libro de reclamaciones | Grave |
| No exhibir aviso/enlace visible | Leve a Grave |
| No responder en 15 días hábiles | Grave |
| Campos obligatorios faltantes (ej. sin correlativo) | Leve a Grave (caso Interbank: 3.3 UIT) |
| No reportar a SIREC (si obligado) | Grave |
| Obstaculizar el registro de reclamación | Grave a Muy grave |
| Incumplir mandato de INDECOPI | Mínimo 3 UIT, doblando sucesivamente hasta 200 UIT |

---

## 8. Matriz: Requisito Legal → Requisito Funcional → Evidencia → Riesgo

### 8.1 Formulario Público

| # | Requisito Legal | Requisito Funcional | Evidencia de Cumplimiento | Riesgo por Incumplimiento |
|---|----------------|--------------------|--------------------------|--------------------------|
| F1 | Enlace visible en página de inicio (DS 011-2011-PCM Art. 5; Ley 32495) | Botón/banner "Libro de Reclamaciones" en homepage y catálogo público, siempre visible | Captura de pantalla de la homepage mostrando el enlace | Hasta 150 UIT (grave) |
| F2 | Campos del Anexo I modificado por DS 101-2022-PCM | Formulario con TODOS los campos de las secciones 1-3 del Anexo I | Formulario en producción vs checklist del Anexo I | Hasta 150 UIT — caso Interbank: sanción por campos faltantes |
| F3 | Número correlativo secuencial (Anexo I: `Nº 000000001-202X`) | Auto-generación de correlativo único por empresa (tenant), formato `NNNNNNNNN-YYYY` | Tabla de BD con constraint UNIQUE, logs de generación | Sancionable (INDECOPI ha multado específicamente por falta de correlativo) |
| F4 | Selección Reclamo / Queja (Anexo I sección 3) | Radio buttons obligatorios: "Reclamo" y "Queja" con definiciones visibles | UI con ambas opciones + definiciones al pie | Formulario incompleto = sancionable |
| F5 | Firma del consumidor o equivalente virtual | Checkbox de confirmación: "Declaro que la información es veraz" + botón de envío | Log del timestamp de aceptación | Hoja sin validez |
| F6 | Datos del proveedor pre-llenados (razón social, RUC, domicilio) | Auto-fill desde modelo Company del tenant | Datos visibles en el formulario renderizado | Formulario incompleto |
| F7 | Soporte a menores de edad (Anexo I: "PADRE O MADRE") | Campo condicional para datos del apoderado | Campo visible cuando se marca "menor de edad" | Formulario incompleto |
| F8 | Tipo de bien: Producto / Servicio (Anexo I sección 2) | Radio buttons + monto reclamado + descripción | UI con ambas opciones | Formulario incompleto |

### 8.2 Notificación al Consumidor

| # | Requisito Legal | Requisito Funcional | Evidencia de Cumplimiento | Riesgo por Incumplimiento |
|---|----------------|--------------------|--------------------------|--------------------------|
| N1 | Envío automático de copia por email con fecha/hora (DS 011-2011-PCM Art. 5) | Email transaccional inmediato con PDF adjunto de la hoja de reclamación | Log de envío de email + delivery receipt | Hasta 150 UIT |
| N2 | Permitir impresión de la hoja (DS 011-2011-PCM Art. 5) | Botón "Imprimir" + generación de PDF descargable post-envío | PDF generado con `@react-pdf/renderer` | Hasta 150 UIT |
| N3 | Código de seguimiento (DS 011-2011-PCM) | Código único visible en confirmación + email + consulta pública | Pantalla de confirmación + email con código | Dificulta seguimiento del consumidor |
| N4 | Registro de fecha y hora de envío | Timestamp automático en BD (createdAt) + incluido en email | Campo `createdAt` en modelo + contenido del email | Hoja sin validez temporal |

### 8.3 Gestión y Respuesta (Panel del Proveedor)

| # | Requisito Legal | Requisito Funcional | Evidencia de Cumplimiento | Riesgo por Incumplimiento |
|---|----------------|--------------------|--------------------------|--------------------------|
| G1 | Respuesta en ≤15 días hábiles improrrogables (Ley 31435 + DS 101-2022-PCM) | Dashboard con listado, estado, días restantes, alertas de vencimiento | Timestamps de creación y respuesta en BD | Hasta 150 UIT por cada reclamo no atendido |
| G2 | Respuesta por el canal indicado por el consumidor | Email automático de respuesta al consumidor | Log de envío + contenido de la respuesta | Respuesta no válida |
| G3 | Sección 4 del Anexo I: observaciones y acciones del proveedor | Formulario de respuesta con campos de observaciones + fecha | Registro en BD con timestamp | Hoja incompleta |
| G4 | Conservación mínima 2 años (DS 011-2011-PCM) | Política de retención en BD: soft-delete, nunca hard-delete antes de 2 años | Registros en BD con `createdAt` + política documentada | Hasta 150 UIT + imposibilidad de defender ante INDECOPI |
| G5 | Disponibilidad ante fiscalización INDECOPI | Exportación masiva (Excel/CSV) de todas las hojas con sus respuestas | Endpoint de exportación en dashboard | Obstrucción a fiscalización |
| G6 | Reclasificación queja→reclamo si corresponde | Flag en UI para que el proveedor reclasifique + log de auditoría | Campo `reclassified` + `reclassifiedAt` en BD | Tratamiento inadecuado |

### 8.4 Sistema de Alertas

| # | Requisito Legal | Requisito Funcional | Evidencia de Cumplimiento | Riesgo por Incumplimiento |
|---|----------------|--------------------|--------------------------|--------------------------|
| A1 | Plazo 15 días hábiles (improrrogable) | Cálculo automático de días hábiles (excl. feriados peruanos) + alerta al día 10, 13 y 15 | Cron job + notificaciones en dashboard + email al admin | Vencimiento inadvertido → multa |
| A2 | Feriados peruanos | Calendario de feriados nacionales integrado (actualizable anualmente) | Tabla de feriados en BD o config | Cálculo incorrecto de plazos |

### 8.5 Acceso Público y Respaldo

| # | Requisito Legal | Requisito Funcional | Evidencia de Cumplimiento | Riesgo por Incumplimiento |
|---|----------------|--------------------|--------------------------|--------------------------|
| P1 | Libro físico de respaldo en establecimiento presencial | Nota informativa al proveedor en su dashboard: "Debe tener libro físico de respaldo" | Aviso persistente en configuración | Multa si sistema cae y no hay respaldo |
| P2 | Consulta de estado por consumidor | Página pública de consulta con código de seguimiento (sin login) | URL pública + formulario de consulta | Dificulta ejercicio de derechos del consumidor |

---

## 9. Notas de Implementación para ERP Multi-Tenant

### 9.1 Modelo de Datos (consideraciones)

- Cada **tenant (Company)** tiene su propio libro con **numeración correlativa independiente**
- El correlativo debe ser **atómico** (race condition safe) — usar secuencia de BD o locking
- Formato sugerido: `{companyCode}-{sequential9digits}-{year}` ej: `ECO-000000001-2026`
- Los datos del proveedor (razón social, RUC, dirección) ya existen en el modelo `Company`
- **Soft delete obligatorio**: nunca eliminar registros antes de 2 años
- Campo `businessDays` calculado para tracking de plazo

### 9.2 Acceso Público

- El formulario público iría en una ruta tipo `/reclamos/{companySlug}` o integrado en `/menu/{slug}`
- El enlace debe ser visible en la página de inicio del catálogo/menú público
- **No requiere autenticación** del consumidor (es un formulario público)
- reCAPTCHA o similar para prevenir spam/abuso

### 9.3 Panel de Gestión (Dashboard)

- Nueva sección en sidebar: "Libro de Reclamaciones"
- Vista de lista con filtros: estado (pendiente/respondido/vencido), tipo (reclamo/queja), fecha
- Indicador visual de días restantes (verde/amarillo/rojo)
- Acción de respuesta con campos del Anexo I sección 4
- Exportación para fiscalización INDECOPI

### 9.4 Notificaciones

- Email transaccional al consumidor (envío de copia inmediata)
- Email transaccional al consumidor (respuesta del proveedor)
- Alertas internas al proveedor (días 10, 13, 15)
- Generación de PDF con `@react-pdf/renderer` (ya en nuestro stack)

### 9.5 Verticales de Negocio

- Aplica a **todas las verticales** (GENERAL, RETAIL, RESTAURANTS, SERVICES, etc.)
- No es un módulo opcional — es obligación legal para todo proveedor
- Podría estar habilitado por defecto para todos los tenants

### 9.6 SIREC (futuro)

- No es prioritario para MVP (aplica solo a empresas >= 3,000 UIT de ingresos)
- Nuestros clientes típicos están bajo ese umbral
- Si se requiere: exportación en formato compatible con carga masiva SIREC

---

## 10. Alcance Recomendado para MVP

| Fase | Funcionalidad | Prioridad |
|------|--------------|-----------|
| **MVP** | Formulario público con todos los campos del Anexo I | Alta |
| **MVP** | Correlativo automático por tenant | Alta |
| **MVP** | Email automático al consumidor con PDF | Alta |
| **MVP** | Panel de gestión con listado y respuesta | Alta |
| **MVP** | Cálculo de días hábiles + alertas básicas | Alta |
| **MVP** | Consulta pública por código de seguimiento | Alta |
| **MVP** | Botón visible en homepage/menú público | Alta |
| **v2** | Calendario de feriados peruanos configurable | Media |
| **v2** | Exportación masiva para fiscalización | Media |
| **v2** | Reclasificación queja→reclamo con auditoría | Media |
| **v2** | Dashboard analítico (métricas, tendencias) | Baja |
| **v2** | Exportación formato SIREC | Baja |

---

**Documento preparado para revisión del comité legal/técnico.**
**Última actualización:** 2026-03-11