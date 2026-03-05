# TI Projecto Web - Sistema Integral de Gestión Empresarial

Sistema ERP multi-tenant con contabilidad de doble partida integrada, diseñado específicamente para el mercado peruano. Soporta múltiples verticales de negocio con configuración dinámica por empresa.

![Version](https://img.shields.io/badge/version-2.0-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.x-red)
![Next.js](https://img.shields.io/badge/Next.js-14.x-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

## 📋 Tabla de Contenidos

- [Características Principales](#características-principales)
- [Verticales de Negocio](#verticales-de-negocio)
- [Stack Tecnológico](#stack-tecnológico)
- [Módulos del Sistema](#módulos-del-sistema)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Documentación](#documentación)

## 🚀 Características Principales

### Multi-Tenancy
- **Arquitectura multi-tenant** con aislamiento completo de datos por organización y empresa
- **Middleware de contexto** para validación automática de tenant en cada request
- **Restauración automática** del último contexto usado por usuario
- **Permisos granulares** por módulo en formato JSON

### Contabilidad Dual
- **Modo simplificado**: Para empresas pequeñas (AccEntry/AccPeriod)
- **Modo completo**: Contabilidad de doble partida con PCGE peruano
  - Plan Contable General Empresarial
  - Libro Diario, Mayor, Balance de Comprobación
  - Exportación PLE para SUNAT
  - Hooks post-transaccionales para asientos automáticos

### Business Verticals
Sistema adaptativo que modifica UI y funcionalidades según el tipo de empresa:
- **GENERAL**: Configuración base para cualquier negocio
- **RETAIL**: Gestión de tiendas minoristas
- **RESTAURANTS**: Pedidos, cocina en tiempo real, mesas
- **SERVICES**: Empresas de servicios profesionales
- **MANUFACTURING**: Control de producción e ingredientes
- **COMPUTERS**: Venta y reparación de equipos
- **LAW_FIRM**: Gestión de casos legales y jurisprudencia

### Integración SUNAT
- **Facturación electrónica** (Facturas, Boletas, Notas de Crédito/Débito)
- **Transmisión a SUNAT** con validación de respuesta
- **Generación de PDFs** con código QR
- **Secuencias automáticas** por serie y tipo de documento
- **Validación RUC/DNI** en línea

## 🎯 Verticales de Negocio

### General (GENERAL)
Módulos básicos para cualquier tipo de negocio:
- Inventario multi-almacén
- Ventas y cotizaciones
- Compras y proveedores
- Caja registradora
- Contabilidad

### Restaurantes (RESTAURANTS)
Especializado para servicios de comida:
- **Gestión de mesas** (libre, ocupada, reservada)
- **Pedidos** (DINE_IN, TAKEAWAY, DELIVERY)
- **Cocina en tiempo real** con WebSocket
- **Estaciones de cocina** con ruteo de ítems
- **Control de ingredientes** y recetas
- **Menú público** para clientes

### Estudio de Abogados (LAW_FIRM)
Sistema completo para gestión legal:
- **Expedientes legales** con áreas, prioridad, estados
- **Partes procesales** (demandantes, demandados, abogados)
- **Documentos legales** con cadena de custodia (SHA-256)
- **Eventos y audiencias** con calendario integrado
- **Registro de horas** facturables por abogado
- **Jurisprudencia RAG** con IA (NUEVO ✨)
  - Upload de PDFs de sentencias/casaciones
  - Procesamiento automático con embeddings vectoriales
  - Asistente conversacional con citas obligatorias
  - Búsqueda semántica con OpenAI
  - Filtros avanzados por juzgado, año, área legal

### Retail (RETAIL)
Optimizado para tiendas minoristas:
- **Catálogo público** para e-commerce
- **Gestión de marcas** y categorías
- **Control de stock** por tienda
- **Pedidos web** con seguimiento
- **Campañas publicitarias**

### Computación (COMPUTERS)
Para venta y reparación de equipos:
- **Gestión de series/números de serie**
- **Seguimiento de reparaciones**
- **Inventario de partes y componentes**

## 🛠 Stack Tecnológico

### Backend
- **Framework**: NestJS 10.x (Node.js)
- **ORM**: Prisma 7
- **Base de datos**: PostgreSQL 15+
- **WebSockets**: Socket.IO (cocina, chat, barcodes)
- **Validaciones**: class-validator, DTOs
- **Autenticación**: JWT con httpOnly cookies
- **Colas**: BullMQ + Redis (procesamiento asíncrono)
- **AI/ML**: OpenAI API (embeddings + GPT-4o-mini)
- **PDF**: Puppeteer para generación

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript (strict mode)
- **Estilos**: Tailwind CSS + shadcn/ui
- **Validaciones**: Zod + react-hook-form
- **Estado**: React Context API
- **PDF Viewer**: react-pdf
- **Charts**: Recharts
- **3D**: Three.js + @react-three/fiber (visualizaciones)

### DevOps & Infraestructura
- **Deployment**: Railway (backend + PostgreSQL)
- **Storage**: Local filesystem + upload folders
- **Logs**: Winston + custom telemetry
- **Monitoring**: Custom health checks

## 📦 Módulos del Sistema

### Core Business
| Módulo | Descripción | Vertical |
|--------|-------------|----------|
| **Inventario** | Control de stock multi-almacén, alertas, trazabilidad | Todos |
| **Productos** | Catálogo, marcas, categorías, unidades de medida | Todos |
| **Ventas** | Cotizaciones, órdenes, facturas, métodos de pago | Todos |
| **Compras** | Registro de compras, extracción de datos desde PDF | Todos |
| **Caja** | Apertura/cierre, transacciones, conciliación | Todos |
| **Proveedores** | Gestión de proveedores y contactos | Todos |

### Contabilidad
| Módulo | Descripción |
|--------|-------------|
| **Contabilidad Simple** | AccEntry/AccPeriod para empresas pequeñas |
| **Contabilidad Dual** | JournalEntry, PCGE, Libro Diario, Mayor, Balance |
| **Exportación PLE** | Generación asíncrona de reportes SUNAT |
| **Hooks Contables** | Asientos automáticos desde ventas/compras |

### Legal (LAW_FIRM)
| Módulo | Descripción |
|--------|-------------|
| **Expedientes** | Gestión de casos con partes, documentos, eventos |
| **Documentos Legales** | Upload con cadena de custodia (SHA-256) |
| **Jurisprudencia RAG** | Sistema RAG con OpenAI para consultas legales |
| **Calendario Legal** | Audiencias, plazos, recordatorios |
| **Horas Facturables** | Registro de tiempo por abogado |

### Restaurante (RESTAURANTS)
| Módulo | Descripción |
|--------|-------------|
| **Pedidos** | DINE_IN, TAKEAWAY, DELIVERY con estados |
| **Mesas** | Gestión de mesas con estado en tiempo real |
| **Cocina** | Display en tiempo real con WebSocket |
| **Ingredientes** | Control de stock de ingredientes |
| **Recetas** | Relación producto ↔ ingredientes |

### E-commerce & Marketing
| Módulo | Descripción |
|--------|-------------|
| **Catálogo Público** | Productos publicados para web |
| **Pedidos Web** | Ventas por canal web con seguimiento |
| **Campañas** | Gestión de campañas publicitarias |
| **Creativos** | Plantillas y assets para anuncios |

### Suscripciones & Facturación
| Módulo | Descripción |
|--------|-------------|
| **Planes** | Suscripciones con cuotas por módulo |
| **Facturación** | Facturas de plataforma |
| **Dunning** | Cobro automático con reintentos |
| **Trial** | Gestión de período de prueba |
| **Mercado Pago** | Integración de pagos |

### Sistema & Utilidades
| Módulo | Descripción |
|--------|-------------|
| **Usuarios** | Gestión de usuarios, roles, permisos |
| **Organizaciones** | Multi-tenant, empresas, membresías |
| **Chat** | Mensajería en tiempo real (WebSocket) |
| **Ayuda Inteligente** | RAG con embeddings para KB |
| **ML/IA** | Extracción de datos de facturas, predicciones |
| **Barcode Gateway** | WebSocket para lectores de código de barras |

## 🔧 Instalación

### Prerrequisitos
- Node.js 18+ (recomendado 20.x)
- PostgreSQL 15+
- Redis (opcional, para colas BullMQ)
- OpenAI API Key (opcional, para jurisprudencia RAG)

### Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
npx prisma migrate deploy

# (Opcional) Seed inicial
npx prisma db seed

# Iniciar servidor de desarrollo
npm run start:dev
```

El backend estará disponible en `http://localhost:4000`

### Frontend

```bash
cd fronted  # Sí, con 'd'

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con la URL del backend

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## ⚙️ Configuración

### Variables de Entorno - Backend

```bash
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET="tu-secret-muy-seguro"

# SUNAT
SUNAT_API_URL="https://api.sunat.gob.pe/v1/"
SUNAT_RUC="tu-ruc"
SUNAT_USER="tu-usuario-sol"
SUNAT_PASSWORD="tu-password-sol"

# OpenAI (Opcional - Para jurisprudencia RAG)
OPENAI_API_KEY="sk-proj-..."

# Redis (Opcional - Para colas)
REDIS_HOST="localhost"
REDIS_PORT=6379

# Contabilidad
ACCOUNTING_URL="http://localhost:4000"
ACCOUNTING_HOOK_ENABLED=true
ACCOUNTING_HOOK_PURCHASE_ENABLED=false

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"

# Mercado Pago (Opcional)
MERCADOPAGO_ACCESS_TOKEN="tu-access-token"
```

### Variables de Entorno - Frontend

```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📁 Estructura del Proyecto

```
/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── [module]/          # ~60 módulos NestJS
│   │   ├── common/            # Guards, decorators, utils
│   │   ├── config/            # Configuraciones
│   │   └── prisma/            # Cliente Prisma
│   ├── prisma/
│   │   ├── schema.prisma      # ~80+ modelos
│   │   └── migrations/        # Migraciones SQL
│   ├── uploads/               # Storage de archivos
│   │   ├── products/
│   │   ├── legal-documents/
│   │   └── jurisprudence/     # PDFs de jurisprudencia
│   └── docs/                  # Documentación técnica
│
├── fronted/                    # Cliente Next.js (SÍ, con 'd')
│   ├── src/
│   │   ├── app/               # App Router
│   │   │   ├── api/           # API Routes (proxy)
│   │   │   └── dashboard/     # Área administrativa
│   │   ├── components/        # Componentes reutilizables
│   │   ├── context/           # React Contexts
│   │   ├── hooks/             # Custom hooks
│   │   └── lib/               # Utilidades
│   ├── public/                # Assets estáticos
│   └── docs/                  # Documentación frontend
│
└── docs/                       # Documentación del proyecto
    ├── plans/                 # Planes de implementación
    ├── architecture/          # Diagramas de arquitectura
    └── guides/                # Guías de uso
```

## 📚 Documentación

### Backend
- [Multi-Tenancy Implementation](backend/docs/tenancy-multi-company-implementation.md)
- [Business Verticals Guide](backend/docs/business-verticals-implementation-plan.md)
- [SUNAT Integration](backend/docs/multi-tenant-sunat.md)
- [ML Models](backend/docs/ml-models.md)
- [Subscription System](backend/docs/subscription-onboarding-plan.md)
- [Jurisprudence RAG System](backend/JURISPRUDENCE-STATUS.md)

### Frontend
- [Jurisprudence Frontend Status](fronted/JURISPRUDENCE-FRONTEND-STATUS.md)

### Guías de Uso
Ver archivos en `/fronted/public/help/`

## 🆕 Novedades Recientes

### Sistema de Jurisprudencia RAG (Feb 2026)
Sistema completo de gestión de jurisprudencia legal con IA:
- ✅ **40+ endpoints** para gestión de documentos y consultas
- ✅ **Upload manual de PDFs** de sentencias/casaciones
- ✅ **Procesamiento automático**: extracción de texto + embeddings vectoriales
- ✅ **Asistente conversacional** con OpenAI GPT-4o-mini
- ✅ **Citas obligatorias** formato [FUENTE X, pág. Y]
- ✅ **Indicadores de confianza** (ALTA/MEDIA/BAJA/NO_CONCLUYENTE)
- ✅ **Filtros avanzados** por juzgado, año, área legal
- ✅ **Dashboard de cobertura** con estadísticas
- ✅ **Sistema de feedback** para mejorar resultados

**Costos estimados OpenAI:**
- Indexación inicial (10k docs): ~$79 (one-time)
- Scraping mensual (500 docs): ~$4/mes
- Queries (1,000/mes): ~$0.86/mes

## 🔐 Seguridad

- **JWT Authentication** con cookies httpOnly
- **CORS** configurado correctamente
- **Rate limiting** en endpoints sensibles
- **Validación de permisos** por módulo
- **Cadena de custodia** en documentos legales (SHA-256)
- **Tenant isolation** estricto en base de datos
- **SQL injection protection** via Prisma ORM
- **XSS protection** en frontend

## 👥 Roles y Permisos

### Roles de Usuario
- **SUPER_ADMIN_GLOBAL**: Acceso total al sistema
- **SUPER_ADMIN_ORG**: Admin de organización
- **ADMIN**: Administrador de empresa
- **EMPLOYEE**: Empleado con permisos limitados
- **CLIENT**: Cliente externo
- **GUEST**: Usuario invitado

### Permisos por Módulo
Sistema granular basado en módulos en `OrganizationMembership.modulePermissions`:
```json
{
  "inventory": true,
  "sales": true,
  "accounting": true,
  "legal": true,
  "catalog": true,
  ...
}
```

## 🧪 Testing

### Backend
```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage
```

### Frontend
```bash
cd fronted
npm run test          # Vitest unit tests
npm run test:e2e      # Cypress E2E
```

### Testing Jurisprudence System
```bash
cd backend
bash test-jurisprudence-full.sh
```

## 🚢 Deployment

### Backend (Railway)
```bash
# Railway CLI
railway login
railway up

# O via GitHub
git push origin main
# Railway auto-deploys
```

### Frontend (Vercel)
```bash
# Vercel CLI
vercel --prod

# O via GitHub
git push origin main
# Vercel auto-deploys
```

## 🤝 Contribución

Este es un proyecto privado. Para contribuir:
1. Crear branch desde `develop`
2. Hacer cambios siguiendo las convenciones en `CLAUDE.md`
3. Crear PR hacia `develop`
4. Review y merge por admin

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 📞 Soporte

Para reportar bugs o solicitar features, contactar al equipo de desarrollo.

---

**Última actualización**: Febrero 2026
**Versión**: 2.0
**Módulos**: 60+
**Modelos de BD**: 80+
**Endpoints**: 300+
