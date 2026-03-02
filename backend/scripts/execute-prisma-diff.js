const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:wZdoEryWAmhQQmswQDtlBSHUEhOMJlhn@nozomi.proxy.rlwy.net:18918/railway',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();

  try {
    // ============================================================
    // PHASE 1: CREATE ALL MISSING TABLES (exact Prisma schema)
    // ============================================================
    console.log('=== PHASE 1: Creating missing tables ===');

    const createTables = [
      // OrganizationVerticalOverride
      `CREATE TABLE IF NOT EXISTS "OrganizationVerticalOverride" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "configJson" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "OrganizationVerticalOverride_pkey" PRIMARY KEY ("id")
      )`,
      // SubscriptionPlan
      `CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
        "id" SERIAL NOT NULL,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "interval" "SubscriptionInterval" NOT NULL DEFAULT 'MONTHLY',
        "price" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "currency" TEXT NOT NULL DEFAULT 'PEN',
        "trialDays" INTEGER DEFAULT 14,
        "features" JSONB,
        "quotas" JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
      )`,
      // BillingPaymentMethod
      `CREATE TABLE IF NOT EXISTS "BillingPaymentMethod" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "provider" "BillingPaymentProvider" NOT NULL DEFAULT 'STRIPE',
        "externalId" TEXT NOT NULL,
        "brand" TEXT,
        "last4" TEXT,
        "expMonth" INTEGER,
        "expYear" INTEGER,
        "country" TEXT,
        "status" "BillingPaymentMethodStatus" NOT NULL DEFAULT 'ACTIVE',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BillingPaymentMethod_pkey" PRIMARY KEY ("id")
      )`,
      // Subscription
      `CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" SERIAL NOT NULL,
        "planId" INTEGER NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
        "billingCustomerId" TEXT,
        "trialEndsAt" TIMESTAMP(3),
        "currentPeriodStart" TIMESTAMP(3),
        "currentPeriodEnd" TIMESTAMP(3),
        "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
        "canceledAt" TIMESTAMP(3),
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "defaultPaymentMethodId" INTEGER,
        CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
      )`,
      // SubscriptionInvoice
      `CREATE TABLE IF NOT EXISTS "SubscriptionInvoice" (
        "id" SERIAL NOT NULL,
        "subscriptionId" INTEGER NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "paymentMethodId" INTEGER,
        "providerInvoiceId" TEXT,
        "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'PENDING',
        "amount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "currency" TEXT NOT NULL DEFAULT 'PEN',
        "billingPeriodStart" TIMESTAMP(3),
        "billingPeriodEnd" TIMESTAMP(3),
        "dueDate" TIMESTAMP(3),
        "paidAt" TIMESTAMP(3),
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "companyId" INTEGER NOT NULL,
        CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
      )`,
      // OnboardingProgress
      `CREATE TABLE IF NOT EXISTS "OnboardingProgress" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "currentStep" INTEGER NOT NULL DEFAULT 1,
        "companyProfile" JSONB,
        "storeSetup" JSONB,
        "sunatSetup" JSONB,
        "dataImport" JSONB,
        "demoStatus" "DemoDataStatus" NOT NULL DEFAULT 'NONE',
        "demoSeededAt" TIMESTAMP(3),
        "demoClearedAt" TIMESTAMP(3),
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "wizardDismissedAt" TIMESTAMP(3),
        CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
      )`,
      // PublicSignupAttempt
      `CREATE TABLE IF NOT EXISTS "PublicSignupAttempt" (
        "id" SERIAL NOT NULL,
        "email" TEXT NOT NULL,
        "domain" TEXT NOT NULL,
        "ip" TEXT,
        "deviceHash" TEXT,
        "userAgent" TEXT,
        "status" "SignupAttemptStatus" NOT NULL DEFAULT 'PENDING',
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PublicSignupAttempt_pkey" PRIMARY KEY ("id")
      )`,
      // SignupBlocklist
      `CREATE TABLE IF NOT EXISTS "SignupBlocklist" (
        "id" SERIAL NOT NULL,
        "ip" TEXT,
        "deviceHash" TEXT,
        "domain" TEXT,
        "reason" TEXT,
        "blockedUntil" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SignupBlocklist_pkey" PRIMARY KEY ("id")
      )`,
      // TaxRate
      `CREATE TABLE IF NOT EXISTS "TaxRate" (
        "id" SERIAL NOT NULL,
        "countryCode" TEXT NOT NULL,
        "regionCode" TEXT,
        "rate" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
        "description" TEXT,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
      )`,
      // OrganizationDataExport
      `CREATE TABLE IF NOT EXISTS "OrganizationDataExport" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "requestedBy" INTEGER,
        "status" "OrganizationDataExportStatus" NOT NULL DEFAULT 'PENDING',
        "filePath" TEXT,
        "errorMessage" TEXT,
        "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP(3),
        "cleanupStatus" "OrganizationCleanupStatus" NOT NULL DEFAULT 'PENDING',
        "cleanupCompletedAt" TIMESTAMP(3),
        "expiresAt" TIMESTAMP(3),
        CONSTRAINT "OrganizationDataExport_pkey" PRIMARY KEY ("id")
      )`,
      // VerticalChangeAudit
      `CREATE TABLE IF NOT EXISTS "VerticalChangeAudit" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "userId" INTEGER,
        "oldVertical" "BusinessVertical" NOT NULL,
        "newVertical" "BusinessVertical" NOT NULL,
        "changeReason" TEXT,
        "warningsJson" JSONB,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VerticalChangeAudit_pkey" PRIMARY KEY ("id")
      )`,
      // VerticalRollbackSnapshot
      `CREATE TABLE IF NOT EXISTS "VerticalRollbackSnapshot" (
        "id" TEXT NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "snapshotData" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "VerticalRollbackSnapshot_pkey" PRIMARY KEY ("id")
      )`,
      // CompanyVerticalOverride
      `CREATE TABLE IF NOT EXISTS "CompanyVerticalOverride" (
        "companyId" INTEGER NOT NULL,
        "configJson" JSONB,
        CONSTRAINT "CompanyVerticalOverride_pkey" PRIMARY KEY ("companyId")
      )`,
      // CompanyVerticalChangeAudit
      `CREATE TABLE IF NOT EXISTS "CompanyVerticalChangeAudit" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "userId" INTEGER,
        "oldVertical" "BusinessVertical" NOT NULL,
        "newVertical" "BusinessVertical" NOT NULL,
        "changeReason" TEXT,
        "warningsJson" JSONB,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CompanyVerticalChangeAudit_pkey" PRIMARY KEY ("id")
      )`,
      // CompanyVerticalRollbackSnapshot
      `CREATE TABLE IF NOT EXISTS "CompanyVerticalRollbackSnapshot" (
        "id" TEXT NOT NULL,
        "companyId" INTEGER NOT NULL,
        "organizationId" INTEGER NOT NULL,
        "snapshotData" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CompanyVerticalRollbackSnapshot_pkey" PRIMARY KEY ("id")
      )`,
      // MonitoringAlert
      `CREATE TABLE IF NOT EXISTS "MonitoringAlert" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "alertType" TEXT NOT NULL,
        "providerName" TEXT,
        "entityType" TEXT,
        "entityId" INTEGER,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "failureCount" INTEGER NOT NULL DEFAULT 0,
        "lastFailureAt" TIMESTAMP(3),
        "resolvedAt" TIMESTAMP(3),
        "metadata" JSONB,
        "identifier" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id")
      )`,
      // MonitoringAlertEvent
      `CREATE TABLE IF NOT EXISTS "MonitoringAlertEvent" (
        "id" SERIAL NOT NULL,
        "alertId" INTEGER,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "alertType" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "severity" TEXT NOT NULL DEFAULT 'INFO',
        "message" TEXT NOT NULL,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MonitoringAlertEvent_pkey" PRIMARY KEY ("id")
      )`,
      // RestaurantTable
      `CREATE TABLE IF NOT EXISTS "RestaurantTable" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "name" TEXT NOT NULL,
        "code" TEXT,
        "capacity" INTEGER,
        "area" TEXT,
        "status" "RestaurantTableStatus" NOT NULL DEFAULT 'AVAILABLE',
        "currentOrderId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
      )`,
      // KitchenStation
      `CREATE TABLE IF NOT EXISTS "KitchenStation" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
      )`,
      // Ingredient
      `CREATE TABLE IF NOT EXISTS "Ingredient" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "name" TEXT NOT NULL,
        "unit" TEXT NOT NULL,
        "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "minStock" DOUBLE PRECISION DEFAULT 0,
        "cost" DOUBLE PRECISION,
        "status" TEXT DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
      )`,
      // RecipeItem
      `CREATE TABLE IF NOT EXISTS "RecipeItem" (
        "id" SERIAL NOT NULL,
        "productId" INTEGER NOT NULL,
        "ingredientId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "unit" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
      )`,
      // RestaurantOrder
      `CREATE TABLE IF NOT EXISTS "RestaurantOrder" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "storeId" INTEGER,
        "tableId" INTEGER,
        "clientId" INTEGER,
        "createdById" INTEGER,
        "status" "RestaurantOrderStatus" NOT NULL DEFAULT 'OPEN',
        "orderType" "RestaurantOrderType" NOT NULL DEFAULT 'DINE_IN',
        "subtotal" DOUBLE PRECISION DEFAULT 0,
        "tax" DOUBLE PRECISION DEFAULT 0,
        "serviceCharge" DOUBLE PRECISION DEFAULT 0,
        "total" DOUBLE PRECISION DEFAULT 0,
        "notes" TEXT,
        "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "closedAt" TIMESTAMP(3),
        "salesId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
      )`,
      // RestaurantOrderItem
      `CREATE TABLE IF NOT EXISTS "RestaurantOrderItem" (
        "id" SERIAL NOT NULL,
        "orderId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "notes" TEXT,
        "stationId" INTEGER,
        "status" "KitchenItemStatus" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
      )`,
      // IngredientMovement
      `CREATE TABLE IF NOT EXISTS "IngredientMovement" (
        "id" SERIAL NOT NULL,
        "ingredientId" INTEGER NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "type" "IngredientMovementType" NOT NULL,
        "quantity" DOUBLE PRECISION NOT NULL,
        "unit" TEXT NOT NULL,
        "orderId" INTEGER,
        "notes" TEXT,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IngredientMovement_pkey" PRIMARY KEY ("id")
      )`,
      // PosStation
      `CREATE TABLE IF NOT EXISTS "PosStation" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "stationCode" TEXT NOT NULL,
        "stationName" TEXT NOT NULL,
        "ipAddress" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastHeartbeat" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "PosStation_pkey" PRIMARY KEY ("id")
      )`,
      // BillOfMaterials
      `CREATE TABLE IF NOT EXISTS "BillOfMaterials" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        "componentId" INTEGER NOT NULL,
        "quantity" DECIMAL(10,4) NOT NULL,
        "unit" TEXT NOT NULL,
        "wastagePercent" DECIMAL(5,2),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "BillOfMaterials_pkey" PRIMARY KEY ("id")
      )`,
      // WorkOrder
      `CREATE TABLE IF NOT EXISTS "WorkOrder" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "woNumber" TEXT NOT NULL,
        "productId" INTEGER NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "scheduledDate" TIMESTAMP(3) NOT NULL,
        "completedDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
      )`,
      // ArchivedRestaurantTable
      `CREATE TABLE IF NOT EXISTS "ArchivedRestaurantTable" (
        "id" SERIAL NOT NULL,
        "originalId" INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        "organizationId" INTEGER,
        "name" TEXT NOT NULL,
        "code" TEXT,
        "capacity" INTEGER,
        "area" TEXT,
        "status" TEXT NOT NULL,
        "currentOrderId" INTEGER,
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "archivedReason" TEXT,
        CONSTRAINT "ArchivedRestaurantTable_pkey" PRIMARY KEY ("id")
      )`,
      // ArchivedKitchenStation
      `CREATE TABLE IF NOT EXISTS "ArchivedKitchenStation" (
        "id" SERIAL NOT NULL,
        "originalId" INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        "organizationId" INTEGER,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL,
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "archivedReason" TEXT,
        CONSTRAINT "ArchivedKitchenStation_pkey" PRIMARY KEY ("id")
      )`,
      // ArchivedPosStation
      `CREATE TABLE IF NOT EXISTS "ArchivedPosStation" (
        "id" SERIAL NOT NULL,
        "originalId" INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        "stationCode" TEXT NOT NULL,
        "stationName" TEXT NOT NULL,
        "ipAddress" TEXT,
        "isActive" BOOLEAN NOT NULL,
        "lastHeartbeat" TIMESTAMP(3),
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "archivedReason" TEXT,
        CONSTRAINT "ArchivedPosStation_pkey" PRIMARY KEY ("id")
      )`,
      // ArchivedBillOfMaterials
      `CREATE TABLE IF NOT EXISTS "ArchivedBillOfMaterials" (
        "id" SERIAL NOT NULL,
        "originalId" INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        "componentId" INTEGER NOT NULL,
        "quantity" DECIMAL(10,4) NOT NULL,
        "unit" TEXT NOT NULL,
        "wastagePercent" DECIMAL(5,2),
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "archivedReason" TEXT,
        CONSTRAINT "ArchivedBillOfMaterials_pkey" PRIMARY KEY ("id")
      )`,
      // ArchivedWorkOrder
      `CREATE TABLE IF NOT EXISTS "ArchivedWorkOrder" (
        "id" SERIAL NOT NULL,
        "originalId" INTEGER NOT NULL,
        "companyId" INTEGER NOT NULL,
        "woNumber" TEXT NOT NULL,
        "productId" INTEGER NOT NULL,
        "quantity" DECIMAL(10,2) NOT NULL,
        "status" TEXT NOT NULL,
        "scheduledDate" TIMESTAMP(3) NOT NULL,
        "completedDate" TIMESTAMP(3),
        "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "archivedReason" TEXT,
        CONSTRAINT "ArchivedWorkOrder_pkey" PRIMARY KEY ("id")
      )`,
      // CompanyDocumentSequence
      `CREATE TABLE IF NOT EXISTS "CompanyDocumentSequence" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "documentType" TEXT NOT NULL,
        "serie" TEXT NOT NULL,
        "nextCorrelative" INTEGER NOT NULL DEFAULT 1,
        "correlativeLength" INTEGER NOT NULL DEFAULT 3,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "CompanyDocumentSequence_pkey" PRIMARY KEY ("id")
      )`,
      // QuoteSequence
      `CREATE TABLE IF NOT EXISTS "QuoteSequence" (
        "id" SERIAL NOT NULL,
        "companyId" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "current" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("id")
      )`,
      // Quote
      `CREATE TABLE IF NOT EXISTS "Quote" (
        "id" SERIAL NOT NULL,
        "organizationId" INTEGER,
        "companyId" INTEGER,
        "clientId" INTEGER,
        "createdById" INTEGER,
        "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
        "quoteNumber" TEXT,
        "quoteYear" INTEGER,
        "quoteSequence" INTEGER,
        "issuedAt" TIMESTAMP(3),
        "cancelledAt" TIMESTAMP(3),
        "currency" TEXT NOT NULL,
        "validity" TEXT NOT NULL,
        "conditions" TEXT,
        "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "marginAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "clientNameSnapshot" TEXT,
        "contactSnapshot" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
      )`,
      // QuoteItem
      `CREATE TABLE IF NOT EXISTS "QuoteItem" (
        "id" SERIAL NOT NULL,
        "quoteId" INTEGER NOT NULL,
        "productId" INTEGER,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "specs" JSONB,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "costPrice" DOUBLE PRECISION,
        "quantity" INTEGER NOT NULL,
        "lineTotal" DOUBLE PRECISION NOT NULL,
        "type" "QuoteItemType" NOT NULL DEFAULT 'PRODUCT',
        "category" "QuoteItemCategory" NOT NULL DEFAULT 'HARDWARE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
      )`,
      // HelpLearningSession
      `CREATE TABLE IF NOT EXISTS "HelpLearningSession" (
        "id" SERIAL NOT NULL,
        "userId" INTEGER NOT NULL,
        "query" TEXT NOT NULL,
        "queryNorm" TEXT NOT NULL,
        "section" TEXT,
        "matchFound" BOOLEAN NOT NULL,
        "matchedFaqId" TEXT,
        "confidence" DOUBLE PRECISION,
        "wasHelpful" BOOLEAN,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "hasSteps" BOOLEAN NOT NULL DEFAULT false,
        "isContextual" BOOLEAN NOT NULL DEFAULT false,
        "isInvalidQuery" BOOLEAN NOT NULL DEFAULT false,
        "isMetaQuestion" BOOLEAN NOT NULL DEFAULT false,
        "responseTimeMs" INTEGER,
        "source" TEXT,
        "urgency" TEXT,
        "userType" TEXT,
        CONSTRAINT "HelpLearningSession_pkey" PRIMARY KEY ("id")
      )`,
      // HelpSynonymRule
      `CREATE TABLE IF NOT EXISTS "HelpSynonymRule" (
        "id" SERIAL NOT NULL,
        "canonical" TEXT NOT NULL,
        "synonym" TEXT NOT NULL,
        "section" TEXT,
        "autoLearned" BOOLEAN NOT NULL DEFAULT false,
        "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        "createdById" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HelpSynonymRule_pkey" PRIMARY KEY ("id")
      )`,
    ];

    for (let i = 0; i < createTables.length; i++) {
      try {
        await client.query(createTables[i]);
        const match = createTables[i].match(/CREATE TABLE IF NOT EXISTS "(\w+)"/);
        console.log(`  [${i+1}/${createTables.length}] Created: ${match ? match[1] : 'unknown'}`);
      } catch (err) {
        console.error(`  [${i+1}] ERROR: ${err.message}`);
      }
    }

    // ============================================================
    // PHASE 2: ALTER ENUM (BusinessVertical - add new values)
    // Now safe because VerticalChangeAudit and CompanyVerticalChangeAudit exist
    // ============================================================
    console.log('\n=== PHASE 2: AlterEnum BusinessVertical ===');
    try {
      await client.query('BEGIN');
      await client.query(`CREATE TYPE "BusinessVertical_new" AS ENUM ('GENERAL', 'RESTAURANTS', 'RETAIL', 'SERVICES', 'MANUFACTURING', 'COMPUTERS')`);
      await client.query(`ALTER TABLE "public"."Company" ALTER COLUMN "businessVertical" DROP DEFAULT`);
      await client.query(`ALTER TABLE "public"."Organization" ALTER COLUMN "businessVertical" DROP DEFAULT`);
      await client.query(`ALTER TABLE "Organization" ALTER COLUMN "businessVertical" TYPE "BusinessVertical_new" USING ("businessVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TABLE "Company" ALTER COLUMN "businessVertical" TYPE "BusinessVertical_new" USING ("businessVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TABLE "VerticalChangeAudit" ALTER COLUMN "oldVertical" TYPE "BusinessVertical_new" USING ("oldVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TABLE "VerticalChangeAudit" ALTER COLUMN "newVertical" TYPE "BusinessVertical_new" USING ("newVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TABLE "CompanyVerticalChangeAudit" ALTER COLUMN "oldVertical" TYPE "BusinessVertical_new" USING ("oldVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TABLE "CompanyVerticalChangeAudit" ALTER COLUMN "newVertical" TYPE "BusinessVertical_new" USING ("newVertical"::text::"BusinessVertical_new")`);
      await client.query(`ALTER TYPE "BusinessVertical" RENAME TO "BusinessVertical_old"`);
      await client.query(`ALTER TYPE "BusinessVertical_new" RENAME TO "BusinessVertical"`);
      await client.query(`DROP TYPE "public"."BusinessVertical_old"`);
      await client.query(`ALTER TABLE "Company" ALTER COLUMN "businessVertical" SET DEFAULT 'GENERAL'`);
      await client.query(`ALTER TABLE "Organization" ALTER COLUMN "businessVertical" SET DEFAULT 'GENERAL'`);
      await client.query('COMMIT');
      console.log('  AlterEnum BusinessVertical: OK');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('  AlterEnum ERROR:', err.message);
      // Maybe already has the values - try adding individually
      if (err.message.includes('already exists')) {
        console.log('  Enum may already have the values, continuing...');
      }
    }

    // ============================================================
    // PHASE 3: DROP FOREIGN KEYS (to allow AlterTable changes)
    // ============================================================
    console.log('\n=== PHASE 3: Drop old foreign keys ===');
    const dropFKs = [
      `ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_parentId_fkey"`,
      `ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_creativeId_fkey"`,
      `ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_runId_fkey"`,
      `ALTER TABLE "Brand" DROP CONSTRAINT IF EXISTS "Brand_organizationId_fkey"`,
      `ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_orgId_fkey"`,
      `ALTER TABLE "CashTransactionPaymentMethod" DROP CONSTRAINT IF EXISTS "CashTransactionPaymentMethod_cashTransactionId_fkey"`,
      `ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_clientId_fkey"`,
      `ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_senderId_fkey"`,
      `ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_userId_fkey"`,
      `ALTER TABLE "Creative" DROP CONSTRAINT IF EXISTS "Creative_campaignId_fkey"`,
      `ALTER TABLE "Creative" DROP CONSTRAINT IF EXISTS "Creative_templateId_fkey"`,
      `ALTER TABLE "DocumentLink" DROP CONSTRAINT IF EXISTS "DocumentLink_entryId_fkey"`,
      `ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_productId_fkey"`,
      `ALTER TABLE "Favorite" DROP CONSTRAINT IF EXISTS "Favorite_userId_fkey"`,
      `ALTER TABLE "InventoryHistory" DROP CONSTRAINT IF EXISTS "InventoryHistory_inventoryId_fkey"`,
      `ALTER TABLE "JournalLine" DROP CONSTRAINT IF EXISTS "JournalLine_entryId_fkey"`,
      `ALTER TABLE "OrderTracking" DROP CONSTRAINT IF EXISTS "OrderTracking_orderId_fkey"`,
      `ALTER TABLE "ProductFeature" DROP CONSTRAINT IF EXISTS "ProductFeature_productId_fkey"`,
      `ALTER TABLE "ProductSpecification" DROP CONSTRAINT IF EXISTS "ProductSpecification_productId_fkey"`,
      `ALTER TABLE "PublishTarget" DROP CONSTRAINT IF EXISTS "PublishTarget_orgId_fkey"`,
      `ALTER TABLE "PublishTargetLog" DROP CONSTRAINT IF EXISTS "PublishTargetLog_assetId_fkey"`,
      `ALTER TABLE "PublishTargetLog" DROP CONSTRAINT IF EXISTS "PublishTargetLog_publishTargetId_fkey"`,
      `ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_productId_fkey"`,
      `ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey"`,
      `ALTER TABLE "Run" DROP CONSTRAINT IF EXISTS "Run_campaignId_fkey"`,
      `ALTER TABLE "SalePayment" DROP CONSTRAINT IF EXISTS "SalePayment_salesId_fkey"`,
      `ALTER TABLE "Store" DROP CONSTRAINT IF EXISTS "Store_companyId_fkey"`,
      `ALTER TABLE "StoreOnInventory" DROP CONSTRAINT IF EXISTS "StoreOnInventory_inventoryId_fkey"`,
      `ALTER TABLE "StoreOnInventory" DROP CONSTRAINT IF EXISTS "StoreOnInventory_storeId_fkey"`,
      `ALTER TABLE "Template" DROP CONSTRAINT IF EXISTS "Template_campaignId_fkey"`,
    ];

    for (const sql of dropFKs) {
      try {
        await client.query(sql);
      } catch (err) {
        // Ignore - constraint may not exist
      }
    }
    console.log(`  Dropped ${dropFKs.length} foreign key constraints`);

    // ============================================================
    // PHASE 4: DROP OLD INDEXES
    // ============================================================
    console.log('\n=== PHASE 4: Drop old indexes ===');
    const dropIndexes = [
      `DROP INDEX IF EXISTS "Brand_name_key"`,
      `DROP INDEX IF EXISTS "InvoiceSales_tipoComprobante_serie_nroCorrelativo_key"`,
      `DROP INDEX IF EXISTS "Product_organizationId_name_idx"`,
      `DROP INDEX IF EXISTS "Provider_documentNumber_key"`,
      `DROP INDEX IF EXISTS "Store_name_key"`,
      `DROP INDEX IF EXISTS "Store_organizationId_name_idx"`,
      `DROP INDEX IF EXISTS "cash_registers_name_key"`,
    ];

    for (const sql of dropIndexes) {
      try {
        await client.query(sql);
      } catch (err) { }
    }
    console.log(`  Dropped ${dropIndexes.length} old indexes`);

    // ============================================================
    // PHASE 5: ALTER EXISTING TABLES (set NOT NULL, change types)
    // ============================================================
    console.log('\n=== PHASE 5: Alter existing tables ===');
    const alterTables = [
      // Account
      `DO $$ BEGIN
        ALTER TABLE "Account" ALTER COLUMN "accountType" SET NOT NULL;
        ALTER TABLE "Account" ALTER COLUMN "organizationId" SET NOT NULL;
        ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP DEFAULT;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Account alter: %', SQLERRM; END $$`,
      // Category
      `DO $$ BEGIN ALTER TABLE "Category" ALTER COLUMN "isDemo" SET NOT NULL; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Category: %', SQLERRM; END $$`,
      // Client
      `DO $$ BEGIN ALTER TABLE "Client" ALTER COLUMN "isDemo" SET NOT NULL; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Client: %', SQLERRM; END $$`,
      // Company
      `DO $$ BEGIN
        ALTER TABLE "Company" ALTER COLUMN "businessVertical" SET NOT NULL;
        ALTER TABLE "Company" ALTER COLUMN "productSchemaEnforced" SET NOT NULL;
        ALTER TABLE "Company" ALTER COLUMN "defaultQuoteMargin" SET NOT NULL;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Company: %', SQLERRM; END $$`,
      // Entry
      `DO $$ BEGIN
        ALTER TABLE "Entry" ALTER COLUMN "guiaFechaEmision" SET DATA TYPE TEXT;
        ALTER TABLE "Entry" ALTER COLUMN "guiaFechaEntregaTransportista" SET DATA TYPE TEXT;
        ALTER TABLE "Entry" ALTER COLUMN "guiaPesoBrutoTotal" SET DATA TYPE TEXT;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Entry: %', SQLERRM; END $$`,
      // HelpEmbedding
      `DO $$ BEGIN ALTER TABLE "HelpEmbedding" ALTER COLUMN "updatedAt" DROP DEFAULT; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'HelpEmbedding: %', SQLERRM; END $$`,
      // InvoiceSales
      `DO $$ BEGIN ALTER TABLE "InvoiceSales" ALTER COLUMN "companyId" SET NOT NULL; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'InvoiceSales: %', SQLERRM; END $$`,
      // InvoiceSample
      `DO $$ BEGIN ALTER TABLE "InvoiceSample" ALTER COLUMN "updatedAt" DROP DEFAULT; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'InvoiceSample: %', SQLERRM; END $$`,
      // InvoiceTemplate
      `DO $$ BEGIN ALTER TABLE "InvoiceTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'InvoiceTemplate: %', SQLERRM; END $$`,
      // JournalEntry
      `DO $$ BEGIN
        ALTER TABLE "JournalEntry" ALTER COLUMN "correlativo" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "correlativo" DROP DEFAULT;
        ALTER TABLE "JournalEntry" ALTER COLUMN "createdAt" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "cuo" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "cuo" DROP DEFAULT;
        ALTER TABLE "JournalEntry" ALTER COLUMN "moneda" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "organizationId" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "source" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "sunatStatus" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "tipoCambio" SET DATA TYPE DECIMAL(65,30);
        ALTER TABLE "JournalEntry" ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE "JournalEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'JournalEntry: %', SQLERRM; END $$`,
      // Organization
      `DO $$ BEGIN
        ALTER TABLE "Organization" ALTER COLUMN "businessVertical" SET NOT NULL;
        ALTER TABLE "Organization" ALTER COLUMN "productSchemaEnforced" SET NOT NULL;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Organization: %', SQLERRM; END $$`,
      // Product
      `DO $$ BEGIN
        ALTER TABLE "Product" ALTER COLUMN "isDemo" SET NOT NULL;
        ALTER TABLE "Product" ALTER COLUMN "isVerticalMigrated" SET NOT NULL;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Product: %', SQLERRM; END $$`,
      // SalePayment
      `DO $$ BEGIN ALTER TABLE "SalePayment" ALTER COLUMN "companyId" SET NOT NULL; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SalePayment: %', SQLERRM; END $$`,
      // Sales
      `DO $$ BEGIN
        ALTER TABLE "Sales" ALTER COLUMN "exemptTotal" SET NOT NULL;
        ALTER TABLE "Sales" ALTER COLUMN "igvTotal" SET NOT NULL;
        ALTER TABLE "Sales" ALTER COLUMN "taxableTotal" SET NOT NULL;
        ALTER TABLE "Sales" ALTER COLUMN "unaffectedTotal" SET NOT NULL;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Sales: %', SQLERRM; END $$`,
      // SalesDetail
      `DO $$ BEGIN ALTER TABLE "SalesDetail" ALTER COLUMN "companyId" SET NOT NULL; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SalesDetail: %', SQLERRM; END $$`,
      // SunatTransmission
      `DO $$ BEGIN
        ALTER TABLE "SunatTransmission" DROP COLUMN IF EXISTS "cdrNotes";
        ALTER TABLE "SunatTransmission" DROP COLUMN IF EXISTS "cdrXml";
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'SunatTransmission: %', SQLERRM; END $$`,
      // User
      `DO $$ BEGIN
        ALTER TABLE "User" ALTER COLUMN "isDemo" SET NOT NULL;
        ALTER TABLE "User" ALTER COLUMN "isPublicSignup" SET NOT NULL;
      EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'User: %', SQLERRM; END $$`,
    ];

    for (const sql of alterTables) {
      try {
        await client.query(sql);
        const match = sql.match(/ALTER TABLE "(\w+)"/);
        console.log(`  Altered: ${match ? match[1] : 'table'}`);
      } catch (err) {
        console.error(`  AlterTable ERROR: ${err.message}`);
      }
    }

    // ============================================================
    // PHASE 6: CREATE ALL INDEXES
    // ============================================================
    console.log('\n=== PHASE 6: Create indexes ===');
    const createIndexes = [
      // New table indexes
      `CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationVerticalOverride_organizationId_key" ON "OrganizationVerticalOverride"("organizationId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code")`,
      `CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx" ON "SubscriptionPlan"("isActive")`,
      `CREATE INDEX IF NOT EXISTS "BillingPaymentMethod_organizationId_status_idx" ON "BillingPaymentMethod"("organizationId", "status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BillingPaymentMethod_organizationId_externalId_key" ON "BillingPaymentMethod"("organizationId", "externalId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_organizationId_key" ON "Subscription"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status")`,
      `CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_subscriptionId_idx" ON "SubscriptionInvoice"("subscriptionId")`,
      `CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_organizationId_idx" ON "SubscriptionInvoice"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_companyId_idx" ON "SubscriptionInvoice"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "OnboardingProgress_organizationId_key" ON "OnboardingProgress"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "OnboardingProgress_updatedAt_idx" ON "OnboardingProgress"("updatedAt")`,
      `CREATE INDEX IF NOT EXISTS "PublicSignupAttempt_email_createdAt_idx" ON "PublicSignupAttempt"("email", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "PublicSignupAttempt_domain_createdAt_idx" ON "PublicSignupAttempt"("domain", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "PublicSignupAttempt_ip_createdAt_idx" ON "PublicSignupAttempt"("ip", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "PublicSignupAttempt_deviceHash_createdAt_idx" ON "PublicSignupAttempt"("deviceHash", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "SignupBlocklist_ip_idx" ON "SignupBlocklist"("ip")`,
      `CREATE INDEX IF NOT EXISTS "SignupBlocklist_deviceHash_idx" ON "SignupBlocklist"("deviceHash")`,
      `CREATE INDEX IF NOT EXISTS "SignupBlocklist_domain_idx" ON "SignupBlocklist"("domain")`,
      `CREATE INDEX IF NOT EXISTS "SignupBlocklist_blockedUntil_idx" ON "SignupBlocklist"("blockedUntil")`,
      `CREATE INDEX IF NOT EXISTS "TaxRate_countryCode_regionCode_idx" ON "TaxRate"("countryCode", "regionCode")`,
      `CREATE INDEX IF NOT EXISTS "TaxRate_isDefault_idx" ON "TaxRate"("isDefault")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TaxRate_countryCode_regionCode_key" ON "TaxRate"("countryCode", "regionCode")`,
      `CREATE INDEX IF NOT EXISTS "OrganizationDataExport_organizationId_status_idx" ON "OrganizationDataExport"("organizationId", "status")`,
      `CREATE INDEX IF NOT EXISTS "VerticalChangeAudit_organizationId_idx" ON "VerticalChangeAudit"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "VerticalChangeAudit_createdAt_idx" ON "VerticalChangeAudit"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "VerticalRollbackSnapshot_organizationId_idx" ON "VerticalRollbackSnapshot"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "VerticalRollbackSnapshot_expiresAt_idx" ON "VerticalRollbackSnapshot"("expiresAt")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalChangeAudit_companyId_idx" ON "CompanyVerticalChangeAudit"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalChangeAudit_organizationId_idx" ON "CompanyVerticalChangeAudit"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalChangeAudit_createdAt_idx" ON "CompanyVerticalChangeAudit"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalRollbackSnapshot_companyId_idx" ON "CompanyVerticalRollbackSnapshot"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalRollbackSnapshot_organizationId_idx" ON "CompanyVerticalRollbackSnapshot"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "CompanyVerticalRollbackSnapshot_expiresAt_idx" ON "CompanyVerticalRollbackSnapshot"("expiresAt")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MonitoringAlert_identifier_key" ON "MonitoringAlert"("identifier")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringAlert_alertType_status_idx" ON "MonitoringAlert"("alertType", "status")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringAlert_organizationId_companyId_status_idx" ON "MonitoringAlert"("organizationId", "companyId", "status")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringAlertEvent_organizationId_companyId_alertType_idx" ON "MonitoringAlertEvent"("organizationId", "companyId", "alertType")`,
      `CREATE INDEX IF NOT EXISTS "MonitoringAlertEvent_alertId_idx" ON "MonitoringAlertEvent"("alertId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_currentOrderId_key" ON "RestaurantTable"("currentOrderId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantTable_organizationId_idx" ON "RestaurantTable"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantTable_companyId_idx" ON "RestaurantTable"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantTable_status_idx" ON "RestaurantTable"("status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_companyId_code_key" ON "RestaurantTable"("companyId", "code")`,
      `CREATE INDEX IF NOT EXISTS "KitchenStation_organizationId_idx" ON "KitchenStation"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "KitchenStation_companyId_idx" ON "KitchenStation"("companyId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "KitchenStation_companyId_code_key" ON "KitchenStation"("companyId", "code")`,
      `CREATE INDEX IF NOT EXISTS "Ingredient_organizationId_idx" ON "Ingredient"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "Ingredient_companyId_idx" ON "Ingredient"("companyId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Ingredient_companyId_name_key" ON "Ingredient"("companyId", "name")`,
      `CREATE INDEX IF NOT EXISTS "RecipeItem_ingredientId_idx" ON "RecipeItem"("ingredientId")`,
      `CREATE INDEX IF NOT EXISTS "RecipeItem_organizationId_idx" ON "RecipeItem"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "RecipeItem_companyId_idx" ON "RecipeItem"("companyId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "RecipeItem_productId_ingredientId_key" ON "RecipeItem"("productId", "ingredientId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOrder_salesId_key" ON "RestaurantOrder"("salesId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_organizationId_idx" ON "RestaurantOrder"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_companyId_idx" ON "RestaurantOrder"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_storeId_idx" ON "RestaurantOrder"("storeId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_tableId_idx" ON "RestaurantOrder"("tableId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_status_idx" ON "RestaurantOrder"("status")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_openedAt_idx" ON "RestaurantOrder"("openedAt")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrder_companyId_openedAt_idx" ON "RestaurantOrder"("companyId", "openedAt")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_orderId_idx" ON "RestaurantOrderItem"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_productId_idx" ON "RestaurantOrderItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_stationId_idx" ON "RestaurantOrderItem"("stationId")`,
      `CREATE INDEX IF NOT EXISTS "RestaurantOrderItem_status_idx" ON "RestaurantOrderItem"("status")`,
      `CREATE INDEX IF NOT EXISTS "IngredientMovement_ingredientId_idx" ON "IngredientMovement"("ingredientId")`,
      `CREATE INDEX IF NOT EXISTS "IngredientMovement_organizationId_idx" ON "IngredientMovement"("organizationId")`,
      `CREATE INDEX IF NOT EXISTS "IngredientMovement_companyId_idx" ON "IngredientMovement"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "IngredientMovement_orderId_idx" ON "IngredientMovement"("orderId")`,
      `CREATE INDEX IF NOT EXISTS "IngredientMovement_type_idx" ON "IngredientMovement"("type")`,
      `CREATE INDEX IF NOT EXISTS "PosStation_companyId_isActive_idx" ON "PosStation"("companyId", "isActive")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "PosStation_companyId_stationCode_key" ON "PosStation"("companyId", "stationCode")`,
      `CREATE INDEX IF NOT EXISTS "BillOfMaterials_companyId_productId_idx" ON "BillOfMaterials"("companyId", "productId")`,
      `CREATE INDEX IF NOT EXISTS "BillOfMaterials_componentId_idx" ON "BillOfMaterials"("componentId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BillOfMaterials_companyId_productId_componentId_key" ON "BillOfMaterials"("companyId", "productId", "componentId")`,
      `CREATE INDEX IF NOT EXISTS "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status")`,
      `CREATE INDEX IF NOT EXISTS "WorkOrder_productId_idx" ON "WorkOrder"("productId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrder_companyId_woNumber_key" ON "WorkOrder"("companyId", "woNumber")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedRestaurantTable_companyId_idx" ON "ArchivedRestaurantTable"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedRestaurantTable_originalId_idx" ON "ArchivedRestaurantTable"("originalId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedRestaurantTable_archivedAt_idx" ON "ArchivedRestaurantTable"("archivedAt")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedKitchenStation_companyId_idx" ON "ArchivedKitchenStation"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedKitchenStation_originalId_idx" ON "ArchivedKitchenStation"("originalId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedKitchenStation_archivedAt_idx" ON "ArchivedKitchenStation"("archivedAt")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedPosStation_companyId_idx" ON "ArchivedPosStation"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedPosStation_originalId_idx" ON "ArchivedPosStation"("originalId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedPosStation_archivedAt_idx" ON "ArchivedPosStation"("archivedAt")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedBillOfMaterials_companyId_idx" ON "ArchivedBillOfMaterials"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedBillOfMaterials_originalId_idx" ON "ArchivedBillOfMaterials"("originalId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedBillOfMaterials_archivedAt_idx" ON "ArchivedBillOfMaterials"("archivedAt")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedBillOfMaterials_productId_idx" ON "ArchivedBillOfMaterials"("productId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedBillOfMaterials_componentId_idx" ON "ArchivedBillOfMaterials"("componentId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedWorkOrder_companyId_idx" ON "ArchivedWorkOrder"("companyId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedWorkOrder_originalId_idx" ON "ArchivedWorkOrder"("originalId")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedWorkOrder_archivedAt_idx" ON "ArchivedWorkOrder"("archivedAt")`,
      `CREATE INDEX IF NOT EXISTS "ArchivedWorkOrder_productId_idx" ON "ArchivedWorkOrder"("productId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyDocumentSequence_companyId_documentType_key" ON "CompanyDocumentSequence"("companyId", "documentType")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "QuoteSequence_companyId_year_key" ON "QuoteSequence"("companyId", "year")`,
      `CREATE INDEX IF NOT EXISTS "Quote_organizationId_companyId_status_idx" ON "Quote"("organizationId", "companyId", "status")`,
      `CREATE INDEX IF NOT EXISTS "Quote_companyId_createdAt_idx" ON "Quote"("companyId", "createdAt")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Quote_companyId_quoteNumber_key" ON "Quote"("companyId", "quoteNumber")`,
      `CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId")`,
      `CREATE INDEX IF NOT EXISTS "QuoteItem_productId_idx" ON "QuoteItem"("productId")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_userId_timestamp_idx" ON "HelpLearningSession"("userId", "timestamp")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_section_matchFound_idx" ON "HelpLearningSession"("section", "matchFound")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_timestamp_idx" ON "HelpLearningSession"("timestamp")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_source_idx" ON "HelpLearningSession"("source")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_isMetaQuestion_idx" ON "HelpLearningSession"("isMetaQuestion")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_queryNorm_idx" ON "HelpLearningSession"("queryNorm")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_section_matchFound_timestamp_idx" ON "HelpLearningSession"("section", "matchFound", "timestamp")`,
      `CREATE INDEX IF NOT EXISTS "HelpLearningSession_wasHelpful_timestamp_idx" ON "HelpLearningSession"("wasHelpful", "timestamp")`,
      `CREATE INDEX IF NOT EXISTS "HelpSynonymRule_canonical_idx" ON "HelpSynonymRule"("canonical")`,
      `CREATE INDEX IF NOT EXISTS "HelpSynonymRule_section_idx" ON "HelpSynonymRule"("section")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "HelpSynonymRule_canonical_synonym_section_key" ON "HelpSynonymRule"("canonical", "synonym", "section")`,
      // Indexes on existing tables
      `CREATE INDEX IF NOT EXISTS "Account_parentId_idx" ON "Account"("parentId")`,
      `CREATE INDEX IF NOT EXISTS "Account_isPosting_idx" ON "Account"("isPosting")`,
      `CREATE INDEX IF NOT EXISTS "Brand_organizationId_idx" ON "Brand"("organizationId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Brand_organizationId_name_key" ON "Brand"("organizationId", "name")`,
      `CREATE INDEX IF NOT EXISTS "Client_email_idx" ON "Client"("email")`,
      `CREATE INDEX IF NOT EXISTS "Client_typeNumber_idx" ON "Client"("typeNumber")`,
      `CREATE INDEX IF NOT EXISTS "HelpMessage_source_idx" ON "HelpMessage"("source")`,
      `CREATE INDEX IF NOT EXISTS "HelpMessage_conversationId_createdAt_idx" ON "HelpMessage"("conversationId", "createdAt" DESC)`,
      `CREATE INDEX IF NOT EXISTS "HelpMessage_section_source_feedback_idx" ON "HelpMessage"("section", "source", "feedback")`,
      `CREATE INDEX IF NOT EXISTS "HelpMessage_role_feedback_idx" ON "HelpMessage"("role", "feedback")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSales_companyId_tipoComprobante_serie_nroCorrelativo_key" ON "InvoiceSales"("companyId", "tipoComprobante", "serie", "nroCorrelativo")`,
      `CREATE INDEX IF NOT EXISTS "InvoiceTemplate_organizationId_companyId_idx" ON "InvoiceTemplate"("organizationId", "companyId")`,
      `CREATE INDEX IF NOT EXISTS "InvoiceTemplate_providerId_idx" ON "InvoiceTemplate"("providerId")`,
      `CREATE INDEX IF NOT EXISTS "InvoiceTemplate_documentType_idx" ON "InvoiceTemplate"("documentType")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceTemplate_organizationId_companyId_providerId_documen_key" ON "InvoiceTemplate"("organizationId", "companyId", "providerId", "documentType", "version")`,
      `CREATE INDEX IF NOT EXISTS "JournalEntry_date_idx" ON "JournalEntry"("date")`,
      `CREATE INDEX IF NOT EXISTS "JournalEntry_status_idx" ON "JournalEntry"("status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "JournalEntry_correlativo_organizationId_periodId_key" ON "JournalEntry"("correlativo", "organizationId", "periodId")`,
      `CREATE INDEX IF NOT EXISTS "Organization_businessVertical_idx" ON "Organization"("businessVertical")`,
      `CREATE INDEX IF NOT EXISTS "Period_status_idx" ON "Period"("status")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Store_organizationId_name_key" ON "Store"("organizationId", "name")`,
      `CREATE INDEX IF NOT EXISTS "SunatTransmission_subscriptionInvoiceId_idx" ON "SunatTransmission"("subscriptionInvoiceId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "cash_registers_storeId_name_key" ON "cash_registers"("storeId", "name")`,
    ];

    let idxCreated = 0;
    for (const sql of createIndexes) {
      try {
        await client.query(sql);
        idxCreated++;
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error(`  Index ERROR: ${err.message.substring(0, 100)}`);
        } else {
          idxCreated++;
        }
      }
    }
    console.log(`  Created/verified ${idxCreated}/${createIndexes.length} indexes`);

    // ============================================================
    // PHASE 7: ADD ALL FOREIGN KEYS
    // ============================================================
    console.log('\n=== PHASE 7: Add foreign keys ===');
    const addFKs = [
      `ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ProductFeature" ADD CONSTRAINT "ProductFeature_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "OrganizationVerticalOverride" ADD CONSTRAINT "OrganizationVerticalOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "BillingPaymentMethod" ADD CONSTRAINT "BillingPaymentMethod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_defaultPaymentMethodId_fkey" FOREIGN KEY ("defaultPaymentMethodId") REFERENCES "BillingPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "BillingPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "SunatTransmission" ADD CONSTRAINT "SunatTransmission_subscriptionInvoiceId_fkey" FOREIGN KEY ("subscriptionInvoiceId") REFERENCES "SubscriptionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "OrganizationDataExport" ADD CONSTRAINT "OrganizationDataExport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "OrganizationDataExport" ADD CONSTRAINT "OrganizationDataExport_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "VerticalChangeAudit" ADD CONSTRAINT "VerticalChangeAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "VerticalChangeAudit" ADD CONSTRAINT "VerticalChangeAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "VerticalRollbackSnapshot" ADD CONSTRAINT "VerticalRollbackSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalOverride" ADD CONSTRAINT "CompanyVerticalOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalChangeAudit" ADD CONSTRAINT "CompanyVerticalChangeAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalRollbackSnapshot" ADD CONSTRAINT "CompanyVerticalRollbackSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyVerticalRollbackSnapshot" ADD CONSTRAINT "CompanyVerticalRollbackSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceTemplate" ADD CONSTRAINT "InvoiceTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "MonitoringAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "MonitoringAlertEvent" ADD CONSTRAINT "MonitoringAlertEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Store" ADD CONSTRAINT "Store_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "StoreOnInventory" ADD CONSTRAINT "StoreOnInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "StoreOnInventory" ADD CONSTRAINT "StoreOnInventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "InventoryHistory" ADD CONSTRAINT "InventoryHistory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_currentOrderId_fkey" FOREIGN KEY ("currentOrderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "IngredientMovement" ADD CONSTRAINT "IngredientMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "PosStation" ADD CONSTRAINT "PosStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedRestaurantTable" ADD CONSTRAINT "ArchivedRestaurantTable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedRestaurantTable" ADD CONSTRAINT "ArchivedRestaurantTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedKitchenStation" ADD CONSTRAINT "ArchivedKitchenStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedKitchenStation" ADD CONSTRAINT "ArchivedKitchenStation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedPosStation" ADD CONSTRAINT "ArchivedPosStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedBillOfMaterials" ADD CONSTRAINT "ArchivedBillOfMaterials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ArchivedWorkOrder" ADD CONSTRAINT "ArchivedWorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceSales" ADD CONSTRAINT "InvoiceSales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CompanyDocumentSequence" ADD CONSTRAINT "CompanyDocumentSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "QuoteSequence" ADD CONSTRAINT "QuoteSequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceSample" ADD CONSTRAINT "InvoiceSample_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceSample" ADD CONSTRAINT "InvoiceSample_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceSample" ADD CONSTRAINT "InvoiceSample_invoiceTemplateId_fkey" FOREIGN KEY ("invoiceTemplateId") REFERENCES "InvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "InvoiceSample" ADD CONSTRAINT "InvoiceSample_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
      `ALTER TABLE "OrderTracking" ADD CONSTRAINT "OrderTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "CashTransactionPaymentMethod" ADD CONSTRAINT "CashTransactionPaymentMethod_cashTransactionId_fkey" FOREIGN KEY ("cashTransactionId") REFERENCES "cash_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Template" ADD CONSTRAINT "Template_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Creative" ADD CONSTRAINT "Creative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Creative" ADD CONSTRAINT "Creative_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Run" ADD CONSTRAINT "Run_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Asset" ADD CONSTRAINT "Asset_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Asset" ADD CONSTRAINT "Asset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "PublishTarget" ADD CONSTRAINT "PublishTarget_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "PublishTargetLog" ADD CONSTRAINT "PublishTargetLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "PublishTargetLog" ADD CONSTRAINT "PublishTargetLog_publishTargetId_fkey" FOREIGN KEY ("publishTargetId") REFERENCES "PublishTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "Account" ADD CONSTRAINT "Account_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
      `ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    ];

    let fkCreated = 0;
    for (const sql of addFKs) {
      try {
        await client.query(sql);
        fkCreated++;
      } catch (err) {
        if (!err.message.includes('already exists')) {
          console.error(`  FK ERROR: ${err.message.substring(0, 120)}`);
        } else {
          fkCreated++;
        }
      }
    }
    console.log(`  Created/verified ${fkCreated}/${addFKs.length} foreign keys`);

    // ============================================================
    // PHASE 8: RENAME INDEXES
    // ============================================================
    console.log('\n=== PHASE 8: Rename indexes ===');
    try {
      await client.query(`ALTER INDEX IF EXISTS "InvoiceSample_hash_org_unique" RENAME TO "InvoiceSample_sha256_organizationId_key"`);
      console.log('  Renamed InvoiceSample index');
    } catch (err) {
      console.log('  InvoiceSample index rename:', err.message.substring(0, 80));
    }
    try {
      await client.query(`ALTER INDEX IF EXISTS "user_context_preference_unique" RENAME TO "UserContextPreference_userId_orgId_companyId_key"`);
      console.log('  Renamed UserContextPreference index');
    } catch (err) {
      console.log('  UserContextPreference index rename:', err.message.substring(0, 80));
    }

    // ============================================================
    // FINAL: Verify tables created
    // ============================================================
    console.log('\n=== VERIFICATION ===');
    const { rows: tableCount } = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`Total tables in database: ${tableCount[0].count}`);

    const newTables = [
      'OrganizationVerticalOverride', 'SubscriptionPlan', 'BillingPaymentMethod',
      'Subscription', 'SubscriptionInvoice', 'OnboardingProgress', 'PublicSignupAttempt',
      'SignupBlocklist', 'TaxRate', 'OrganizationDataExport', 'VerticalChangeAudit',
      'VerticalRollbackSnapshot', 'CompanyVerticalOverride', 'CompanyVerticalChangeAudit',
      'CompanyVerticalRollbackSnapshot', 'MonitoringAlert', 'MonitoringAlertEvent',
      'RestaurantTable', 'KitchenStation', 'Ingredient', 'RecipeItem', 'RestaurantOrder',
      'RestaurantOrderItem', 'IngredientMovement', 'PosStation', 'BillOfMaterials',
      'WorkOrder', 'ArchivedRestaurantTable', 'ArchivedKitchenStation', 'ArchivedPosStation',
      'ArchivedBillOfMaterials', 'ArchivedWorkOrder', 'CompanyDocumentSequence',
      'QuoteSequence', 'Quote', 'QuoteItem', 'HelpLearningSession', 'HelpSynonymRule'
    ];

    let found = 0;
    let missing = [];
    for (const t of newTables) {
      const { rows } = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, [t]
      );
      if (rows.length > 0) found++;
      else missing.push(t);
    }
    console.log(`New tables found: ${found}/${newTables.length}`);
    if (missing.length > 0) console.log('Missing:', missing.join(', '));

    console.log('\n=== ALL PHASES COMPLETE ===');

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
