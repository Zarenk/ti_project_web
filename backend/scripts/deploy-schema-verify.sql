-- =====================================================
-- SCRIPT DE SEGURIDAD PARA MIGRACIONES EN PRODUCCIÓN
-- =====================================================
-- Este script consolida TODOS los cambios manuales que hemos aplicado
-- Es IDEMPOTENTE: se puede ejecutar múltiples veces sin causar errores
-- Ejecutar ANTES de aplicar prisma migrate deploy
-- =====================================================

-- Registro de ejecución
DO $$
BEGIN
    RAISE NOTICE '=== Iniciando verificación y corrección de schema ===';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- =====================================================
-- 1. TABLA ENTRY - Columnas SUNAT y Guías
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas en tabla Entry...';

    -- Añadir columnas de guía de remisión si no existen
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaCorrelativo" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaDestinatario" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaFechaEmision" TIMESTAMP(3);
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaFechaEntregaTransportista" TIMESTAMP(3);
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaMotivoTraslado" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaPesoBrutoTotal" DOUBLE PRECISION;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaPesoBrutoUnidad" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaPuntoLlegada" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaPuntoPartida" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaSerie" TEXT;
    ALTER TABLE "Entry" ADD COLUMN IF NOT EXISTS "guiaTransportista" TEXT;

    RAISE NOTICE '✓ Columnas de Entry verificadas';
END $$;

-- =====================================================
-- 2. TABLA SUNATTRANSMISSION - Columnas CDR
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas en tabla SunatTransmission...';

    ALTER TABLE "SunatTransmission" ADD COLUMN IF NOT EXISTS "cdrCode" TEXT;
    ALTER TABLE "SunatTransmission" ADD COLUMN IF NOT EXISTS "cdrDescription" TEXT;
    ALTER TABLE "SunatTransmission" ADD COLUMN IF NOT EXISTS "cdrNotes" TEXT[];
    ALTER TABLE "SunatTransmission" ADD COLUMN IF NOT EXISTS "cdrXml" TEXT;

    RAISE NOTICE '✓ Columnas de SunatTransmission verificadas';
END $$;

-- =====================================================
-- 3. TABLA BRAND - OrganizationId
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas en tabla Brand...';

    ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;

    -- Actualizar marcas sin organizationId
    UPDATE "Brand"
    SET "organizationId" = (
      SELECT id FROM "Organization"
      ORDER BY "createdAt" ASC
      LIMIT 1
    )
    WHERE "organizationId" IS NULL;

    RAISE NOTICE '✓ Columnas de Brand verificadas';
END $$;

-- =====================================================
-- 4. TABLA ACCOUNT - Multi-tenancy y AccountType
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas en tabla Account...';

    -- Crear enum AccountType si no existe
    BEGIN
        CREATE TYPE "AccountType" AS ENUM ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO');
        RAISE NOTICE '✓ Enum AccountType creado';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '✓ Enum AccountType ya existe';
    END;

    -- Añadir columnas
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "accountType" "AccountType";
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "companyId" INTEGER;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

    -- Asegurar que createdAt y updatedAt no sean NULL
    UPDATE "Account" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
    UPDATE "Account" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

    -- Ahora hacerlas NOT NULL
    ALTER TABLE "Account" ALTER COLUMN "createdAt" SET NOT NULL;
    ALTER TABLE "Account" ALTER COLUMN "updatedAt" SET NOT NULL;
    ALTER TABLE "Account" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Account" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

    -- Actualizar level con valor por defecto si es NULL
    UPDATE "Account" SET "level" = 0 WHERE "level" IS NULL;
    ALTER TABLE "Account" ALTER COLUMN "level" SET DEFAULT 0;

    -- Actualizar cuentas sin organizationId
    UPDATE "Account"
    SET "organizationId" = (
      SELECT id FROM "Organization"
      ORDER BY "createdAt" ASC
      LIMIT 1
    )
    WHERE "organizationId" IS NULL;

    RAISE NOTICE '✓ Columnas de Account verificadas';
END $$;

-- =====================================================
-- 5. TABLA USER - Columnas de contexto, demo y verificación
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando columnas en tabla User...';

    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastCompanyId" INTEGER;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastContextHash" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastContextUpdatedAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastOrgId" INTEGER;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN DEFAULT false;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPublicSignup" BOOLEAN DEFAULT false;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountingMode" TEXT DEFAULT 'simple';

    RAISE NOTICE 'Verificando tablas de contexto de usuario...';

    -- Crear tabla UserContextPreference si no existe
    CREATE TABLE IF NOT EXISTS "UserContextPreference" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "orgId" INTEGER NOT NULL,
        "companyId" INTEGER,
        "totalSelections" INTEGER NOT NULL DEFAULT 1,
        "lastSelectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserContextPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    -- Crear tabla UserContextHistory si no existe
    CREATE TABLE IF NOT EXISTS "UserContextHistory" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "orgId" INTEGER NOT NULL,
        "companyId" INTEGER,
        "device" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserContextHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

    RAISE NOTICE '✓ Columnas de User verificadas';
END $$;

-- =====================================================
-- 6. ÍNDICES Y CONSTRAINTS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando índices y constraints...';

    -- Eliminar índice único antiguo de Account si existe
    DROP INDEX IF EXISTS "Account_code_key";

    -- Crear índices si no existen
    CREATE UNIQUE INDEX IF NOT EXISTS "Account_code_organizationId_key" ON "Account"("code", "organizationId");
    CREATE INDEX IF NOT EXISTS "Account_organizationId_idx" ON "Account"("organizationId");
    CREATE INDEX IF NOT EXISTS "Account_companyId_idx" ON "Account"("companyId");
    CREATE INDEX IF NOT EXISTS "Account_accountType_idx" ON "Account"("accountType");

    -- User índices
    CREATE INDEX IF NOT EXISTS "User_lastOrgId_idx" ON "User"("lastOrgId");
    CREATE INDEX IF NOT EXISTS "User_lastCompanyId_idx" ON "User"("lastCompanyId");
    CREATE INDEX IF NOT EXISTS "User_lastActiveAt_idx" ON "User"("lastActiveAt");
    CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

    -- UserContextPreference índices
    CREATE UNIQUE INDEX IF NOT EXISTS "user_context_preference_unique" ON "UserContextPreference"("userId", "orgId", "companyId");
    CREATE INDEX IF NOT EXISTS "UserContextPreference_userId_lastSelectedAt_idx" ON "UserContextPreference"("userId", "lastSelectedAt");

    -- UserContextHistory índices
    CREATE INDEX IF NOT EXISTS "UserContextHistory_userId_createdAt_idx" ON "UserContextHistory"("userId", "createdAt");

    RAISE NOTICE '✓ Índices verificados';
END $$;

-- =====================================================
-- 7. FOREIGN KEYS
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando foreign keys...';

    -- Account -> Organization
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Account_organizationId_fkey'
    ) THEN
        ALTER TABLE "Account"
        ADD CONSTRAINT "Account_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE '✓ FK Account_organizationId_fkey creada';
    ELSE
        RAISE NOTICE '✓ FK Account_organizationId_fkey ya existe';
    END IF;

    -- Account -> Company
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Account_companyId_fkey'
    ) THEN
        ALTER TABLE "Account"
        ADD CONSTRAINT "Account_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE '✓ FK Account_companyId_fkey creada';
    ELSE
        RAISE NOTICE '✓ FK Account_companyId_fkey ya existe';
    END IF;

    -- Brand -> Organization
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Brand_organizationId_fkey'
    ) THEN
        ALTER TABLE "Brand"
        ADD CONSTRAINT "Brand_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE '✓ FK Brand_organizationId_fkey creada';
    ELSE
        RAISE NOTICE '✓ FK Brand_organizationId_fkey ya existe';
    END IF;

    -- User -> Company (lastCompanyId)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_lastCompanyId_fkey'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_lastCompanyId_fkey"
        FOREIGN KEY ("lastCompanyId") REFERENCES "Company"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE '✓ FK User_lastCompanyId_fkey creada';
    ELSE
        RAISE NOTICE '✓ FK User_lastCompanyId_fkey ya existe';
    END IF;

    -- User -> Organization (lastOrgId)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_lastOrgId_fkey'
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_lastOrgId_fkey"
        FOREIGN KEY ("lastOrgId") REFERENCES "Organization"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE '✓ FK User_lastOrgId_fkey creada';
    ELSE
        RAISE NOTICE '✓ FK User_lastOrgId_fkey ya existe';
    END IF;

    RAISE NOTICE '✓ Foreign keys verificadas';
END $$;

-- =====================================================
-- 8. TABLAS FALTANTES - Invoice, Help
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Verificando tablas faltantes...';

    -- Crear enums de Help si no existen
    BEGIN CREATE TYPE "HelpMessageRole" AS ENUM ('USER', 'ASSISTANT');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE TYPE "HelpMessageSource" AS ENUM ('STATIC', 'AI', 'PROMOTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE TYPE "HelpFeedback" AS ENUM ('POSITIVE', 'NEGATIVE');
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN CREATE TYPE "HelpCandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- InvoiceTemplate (parent de InvoiceSample)
    CREATE TABLE IF NOT EXISTS "InvoiceTemplate" (
        "id" SERIAL PRIMARY KEY,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "providerId" INTEGER,
        "providerName" TEXT,
        "documentType" TEXT NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "priority" INTEGER NOT NULL DEFAULT 100,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "checksum" TEXT,
        "regexRules" JSONB,
        "fieldMappings" JSONB,
        "extractionHints" JSONB,
        "sampleFilename" TEXT,
        "notes" TEXT,
        "createdById" INTEGER,
        "updatedById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- InvoiceSample (parent de InvoiceExtractionLog)
    CREATE TABLE IF NOT EXISTS "InvoiceSample" (
        "id" SERIAL PRIMARY KEY,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "entryId" INTEGER,
        "invoiceTemplateId" INTEGER,
        "originalFilename" TEXT NOT NULL,
        "storagePath" TEXT NOT NULL,
        "mimeType" TEXT,
        "fileSize" BIGINT,
        "sha256" TEXT NOT NULL,
        "extractionStatus" TEXT NOT NULL DEFAULT 'PENDING',
        "extractionResult" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSample_hash_org_unique" ON "InvoiceSample"("sha256", "organizationId");
    CREATE INDEX IF NOT EXISTS "InvoiceSample_organizationId_companyId_idx" ON "InvoiceSample"("organizationId", "companyId");
    CREATE INDEX IF NOT EXISTS "InvoiceSample_entryId_idx" ON "InvoiceSample"("entryId");
    CREATE INDEX IF NOT EXISTS "InvoiceSample_invoiceTemplateId_idx" ON "InvoiceSample"("invoiceTemplateId");

    -- InvoiceExtractionLog
    CREATE TABLE IF NOT EXISTS "InvoiceExtractionLog" (
        "id" SERIAL PRIMARY KEY,
        "sampleId" INTEGER NOT NULL,
        "level" TEXT NOT NULL DEFAULT 'INFO',
        "message" TEXT NOT NULL,
        "context" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "InvoiceExtractionLog_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "InvoiceSample"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "InvoiceExtractionLog_sampleId_level_idx" ON "InvoiceExtractionLog"("sampleId", "level");

    -- HelpConversation
    CREATE TABLE IF NOT EXISTS "HelpConversation" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HelpConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "HelpConversation_userId_idx" ON "HelpConversation"("userId");

    -- HelpMessage
    CREATE TABLE IF NOT EXISTS "HelpMessage" (
        "id" SERIAL PRIMARY KEY,
        "conversationId" INTEGER NOT NULL,
        "role" "HelpMessageRole" NOT NULL,
        "content" TEXT NOT NULL,
        "source" "HelpMessageSource",
        "section" TEXT,
        "route" TEXT,
        "score" DOUBLE PRECISION,
        "feedback" "HelpFeedback",
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HelpMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "HelpConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "HelpMessage_conversationId_idx" ON "HelpMessage"("conversationId");
    CREATE INDEX IF NOT EXISTS "HelpMessage_feedback_idx" ON "HelpMessage"("feedback");

    -- HelpKBCandidate
    CREATE TABLE IF NOT EXISTS "HelpKBCandidate" (
        "id" SERIAL PRIMARY KEY,
        "question" TEXT NOT NULL,
        "questionNorm" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "section" TEXT NOT NULL,
        "positiveVotes" INTEGER NOT NULL DEFAULT 0,
        "negativeVotes" INTEGER NOT NULL DEFAULT 0,
        "status" "HelpCandidateStatus" NOT NULL DEFAULT 'PENDING',
        "approvedById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt" TIMESTAMP(3),
        CONSTRAINT "HelpKBCandidate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "HelpKBCandidate_questionNorm_section_key" ON "HelpKBCandidate"("questionNorm", "section");
    CREATE INDEX IF NOT EXISTS "HelpKBCandidate_status_idx" ON "HelpKBCandidate"("status");
    CREATE INDEX IF NOT EXISTS "HelpKBCandidate_section_idx" ON "HelpKBCandidate"("section");

    -- HelpEmbedding
    CREATE TABLE IF NOT EXISTS "HelpEmbedding" (
        "id" SERIAL PRIMARY KEY,
        "sourceType" TEXT NOT NULL,
        "sourceId" TEXT NOT NULL,
        "section" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "embedding" DOUBLE PRECISION[] NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "HelpEmbedding_sourceType_sourceId_key" ON "HelpEmbedding"("sourceType", "sourceId");
    CREATE INDEX IF NOT EXISTS "HelpEmbedding_section_idx" ON "HelpEmbedding"("section");

    RAISE NOTICE '✓ Tablas faltantes verificadas';
END $$;

-- =====================================================
-- REPORTE FINAL
-- =====================================================
DO $$
DECLARE
    entry_count INTEGER;
    brand_count INTEGER;
    account_count INTEGER;
    org_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO entry_count FROM "Entry";
    SELECT COUNT(*) INTO brand_count FROM "Brand";
    SELECT COUNT(*) INTO account_count FROM "Account";
    SELECT COUNT(*) INTO org_count FROM "Organization";

    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICACIÓN COMPLETADA ===';
    RAISE NOTICE 'Entries: %', entry_count;
    RAISE NOTICE 'Brands: %', brand_count;
    RAISE NOTICE 'Accounts: %', account_count;
    RAISE NOTICE 'Organizations: %', org_count;
    RAISE NOTICE '';
    RAISE NOTICE '✓ El schema está listo para prisma migrate deploy';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;
