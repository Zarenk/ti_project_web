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
-- 5. ÍNDICES Y CONSTRAINTS
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

    RAISE NOTICE '✓ Índices verificados';
END $$;

-- =====================================================
-- 6. FOREIGN KEYS
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

    RAISE NOTICE '✓ Foreign keys verificadas';
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
