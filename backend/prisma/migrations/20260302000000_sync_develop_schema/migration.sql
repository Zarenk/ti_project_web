-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "JurisprudenceSourceType" AS ENUM ('SCRAPED', 'MANUAL', 'IMPORTED');

-- CreateEnum
CREATE TYPE "JurisprudenceProcessingStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'EXTRACTING', 'OCR_REQUIRED', 'OCR_IN_PROGRESS', 'EMBEDDING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'MANUAL_REQUIRED');

-- CreateEnum
CREATE TYPE "JurisprudenceScrapeType" AS ENUM ('MANUAL', 'SCHEDULED', 'ONDEMAND');

-- CreateEnum
CREATE TYPE "JurisprudenceJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'MANUAL_REQUIRED');

-- CreateEnum
CREATE TYPE "JurisprudenceStructureType" AS ENUM ('SUMILLA', 'FUNDAMENTOS', 'FALLO', 'OTROS');

-- CreateEnum
CREATE TYPE "SnapshotType" AS ENUM ('ACTUAL', 'CALCULATED');

-- CreateEnum
CREATE TYPE "GymMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GymMembershipStatus" AS ENUM ('PROSPECT', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'FROZEN', 'PENDING_CANCEL', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GymTrainerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "GymBookingStatus" AS ENUM ('BOOKED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "WhatsAppSessionStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'QR_PENDING', 'FAILED');

-- AlterEnum
ALTER TYPE "BusinessVertical" ADD VALUE 'GYM';

-- DropIndex
DROP INDEX "Client_typeNumber_idx";

-- DropIndex
DROP INDEX "Client_typeNumber_key";

-- SafeFill: Account.accountType based on PCGE code prefix (no-op on clean data)
UPDATE "Account" SET "accountType" = 'ACTIVO' WHERE "accountType" IS NULL AND LEFT("code", 1) IN ('1','2','3');
UPDATE "Account" SET "accountType" = 'PASIVO' WHERE "accountType" IS NULL AND LEFT("code", 1) = '4';
UPDATE "Account" SET "accountType" = 'PATRIMONIO' WHERE "accountType" IS NULL AND LEFT("code", 1) = '5';
UPDATE "Account" SET "accountType" = 'GASTO' WHERE "accountType" IS NULL AND LEFT("code", 1) IN ('6','9');
UPDATE "Account" SET "accountType" = 'INGRESO' WHERE "accountType" IS NULL AND LEFT("code", 1) IN ('7','8');
UPDATE "Account" SET "accountType" = 'ACTIVO' WHERE "accountType" IS NULL;

-- SafeFill: Account.organizationId from first organization (no-op on clean data)
UPDATE "Account" SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1) WHERE "organizationId" IS NULL;

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "accountType" SET NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "whatsappAutoSendInvoice" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "EntryDetailSeries" ADD COLUMN     "storeId" INTEGER;

-- AlterTable
ALTER TABLE "HelpEmbedding" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "organizationId" INTEGER;

-- AlterTable
ALTER TABLE "HelpLearningSession" ADD COLUMN     "hasSteps" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isContextual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isInvalidQuery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMetaQuestion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseTimeMs" INTEGER,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "urgency" TEXT,
ADD COLUMN     "userType" TEXT;

-- AlterTable
ALTER TABLE "InvoiceSales" ADD COLUMN     "verificationCode" TEXT;

-- AlterTable: JournalEntry — add columns as nullable first for safety
ALTER TABLE "JournalEntry" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "correlativo" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cuo" TEXT,
ADD COLUMN     "moneda" TEXT NOT NULL DEFAULT 'PEN',
ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sunatStatus" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "tipoCambio" DECIMAL(65,30),
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- SafeFill: JournalEntry nullable NOT NULL columns (no-op on empty table)
UPDATE "JournalEntry" SET "correlativo" = LPAD(CAST("id" AS TEXT), 8, '0') WHERE "correlativo" IS NULL;
UPDATE "JournalEntry" SET "cuo" = 'M' || LPAD(CAST("id" AS TEXT), 8, '0') WHERE "cuo" IS NULL;
UPDATE "JournalEntry" SET "organizationId" = (SELECT "id" FROM "Organization" LIMIT 1) WHERE "organizationId" IS NULL;
UPDATE "JournalEntry" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "JournalEntry" ALTER COLUMN "correlativo" SET NOT NULL,
ALTER COLUMN "cuo" SET NOT NULL,
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "RestaurantTable" ADD COLUMN     "positionX" DOUBLE PRECISION,
ADD COLUMN     "positionY" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Sales" ADD COLUMN     "annulledAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "ShippingGuide" ADD COLUMN     "companyId" INTEGER,
ADD COLUMN     "destinationStoreId" INTEGER,
ADD COLUMN     "guideData" JSONB,
ADD COLUMN     "isInterStore" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modalidadTraslado" TEXT,
ADD COLUMN     "organizationId" INTEGER,
ADD COLUMN     "pesoBrutoTotal" DOUBLE PRECISION,
ADD COLUMN     "pesoBrutoUnidad" TEXT,
ADD COLUMN     "puntoLlegadaDireccion" TEXT,
ADD COLUMN     "puntoLlegadaUbigeo" TEXT,
ADD COLUMN     "puntoPartidaDireccion" TEXT,
ADD COLUMN     "puntoPartidaUbigeo" TEXT,
ADD COLUMN     "remitenteRazonSocial" TEXT,
ADD COLUMN     "remitenteRuc" TEXT,
ADD COLUMN     "sourceStoreId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "transferIds" INTEGER[],
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "district" TEXT,
ADD COLUMN     "ubigeo" TEXT;

-- AlterTable
ALTER TABLE "SunatTransmission" ADD COLUMN     "creditNoteId" INTEGER,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "serials" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shippingGuideId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "refreshTokenHash" TEXT;

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalInventoryValue" DOUBLE PRECISION NOT NULL,
    "totalProducts" INTEGER NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "snapshotType" "SnapshotType" NOT NULL DEFAULT 'ACTUAL',
    "calculatedAt" TIMESTAMP(3),
    "dataSourcePeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosStation" (
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
);

-- CreateTable
CREATE TABLE "BillOfMaterials" (
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
);

-- CreateTable
CREATE TABLE "WorkOrder" (
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
);

-- CreateTable
CREATE TABLE "ArchivedRestaurantTable" (
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
);

-- CreateTable
CREATE TABLE "ArchivedKitchenStation" (
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
);

-- CreateTable
CREATE TABLE "ArchivedPosStation" (
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
);

-- CreateTable
CREATE TABLE "ArchivedBillOfMaterials" (
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
);

-- CreateTable
CREATE TABLE "ArchivedWorkOrder" (
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
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "originalSaleId" INTEGER NOT NULL,
    "originalInvoiceId" INTEGER NOT NULL,
    "serie" TEXT NOT NULL,
    "correlativo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "codigoMotivo" TEXT NOT NULL DEFAULT '01',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "fechaEmision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpPerformanceLog" (
    "id" SERIAL NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "section" TEXT,
    "similarity" DOUBLE PRECISION,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HelpPerformanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceDocument" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "court" TEXT NOT NULL,
    "chamber" TEXT,
    "expediente" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "publishDate" TIMESTAMP(3),
    "sourceType" "JurisprudenceSourceType" NOT NULL DEFAULT 'SCRAPED',
    "sourceUrl" TEXT,
    "sourceDocId" TEXT,
    "pdfPath" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "fileHash" TEXT NOT NULL,
    "processingStatus" "JurisprudenceProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failedReason" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisprudenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceDocumentPage" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "rawText" TEXT,
    "hasText" BOOLEAN NOT NULL DEFAULT false,
    "ocrRequired" BOOLEAN NOT NULL DEFAULT false,
    "ocrCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ocrJobId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisprudenceDocumentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceDocumentSection" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "structureType" "JurisprudenceStructureType" NOT NULL,
    "sectionName" TEXT NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "sectionText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceDocumentSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceEmbedding" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "embedding" BYTEA NOT NULL,
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "embeddingVersion" TEXT NOT NULL DEFAULT 'v1',
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceQuery" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "legalMatterId" INTEGER,
    "query" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "hasValidCitations" BOOLEAN NOT NULL DEFAULT false,
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "documentsUsed" JSONB NOT NULL,
    "userFeedback" JSONB,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "responseTime" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceScrapeJob" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "court" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "scrapeType" "JurisprudenceScrapeType" NOT NULL DEFAULT 'MANUAL',
    "status" "JurisprudenceJobStatus" NOT NULL DEFAULT 'PENDING',
    "documentsFound" INTEGER NOT NULL DEFAULT 0,
    "documentsDownloaded" INTEGER NOT NULL DEFAULT 0,
    "documentsFailed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceScrapeJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceOcrJob" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "status" "JurisprudenceJobStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "pagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "pagesTotal" INTEGER NOT NULL,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceOcrJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceUsageStats" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "queriesCount" INTEGER NOT NULL DEFAULT 0,
    "documentsIndexed" INTEGER NOT NULL DEFAULT 0,
    "embeddingsCreated" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurisprudenceUsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisprudenceConfig" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "ragEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scrapingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scrapingFrequency" TEXT NOT NULL DEFAULT 'monthly',
    "courtsEnabled" JSONB NOT NULL,
    "maxDocumentsPerMonth" INTEGER NOT NULL DEFAULT 1000,
    "maxQueriesPerDay" INTEGER NOT NULL DEFAULT 100,
    "chatModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "embeddingModel" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "embeddingVersion" TEXT NOT NULL DEFAULT 'v1',
    "topK" INTEGER NOT NULL DEFAULT 5,
    "minSimilarity" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "minYear" INTEGER NOT NULL DEFAULT 2015,
    "ocrProvider" TEXT NOT NULL DEFAULT 'tesseract',
    "ocrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisprudenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarNote" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "date" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "color" VARCHAR(7),
    "reminderAt" TIMESTAMP(3),
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMember" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dni" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "medicalConditions" TEXT,
    "injuries" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "photo" TEXT,
    "status" "GymMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymMembership" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "planName" TEXT NOT NULL,
    "status" "GymMembershipStatus" NOT NULL DEFAULT 'PROSPECT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "freezesUsed" INTEGER NOT NULL DEFAULT 0,
    "maxFreezes" INTEGER NOT NULL DEFAULT 0,
    "frozenAt" TIMESTAMP(3),
    "scheduledCancelDate" TIMESTAMP(3),
    "pastDueSince" TIMESTAMP(3),
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 7,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymCheckin" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "membershipId" INTEGER,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkoutAt" TIMESTAMP(3),
    "method" TEXT,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymTrainer" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "specialty" TEXT,
    "bio" TEXT,
    "photo" TEXT,
    "status" "GymTrainerStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymTrainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassSchedule" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "trainerId" INTEGER,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymClassSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymClassBooking" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "status" "GymBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "companyId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppSession" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "phoneNumber" TEXT,
    "status" "WhatsAppSessionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "qrCode" TEXT,
    "authData" JSONB,
    "lastConnected" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "remoteJid" TEXT NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "isFromMe" BOOLEAN NOT NULL DEFAULT true,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "quotedMessageId" INTEGER,
    "clientId" INTEGER,
    "salesId" INTEGER,
    "invoiceId" INTEGER,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomation" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerEvent" TEXT NOT NULL,
    "triggerFilters" JSONB,
    "recipients" TEXT[],
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomationLog" (
    "id" SERIAL NOT NULL,
    "automationId" INTEGER NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "recipient" TEXT NOT NULL,
    "messageSent" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAutomationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutoReplyConfig" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "greetingMessage" TEXT NOT NULL DEFAULT 'Hola! Soy el asistente virtual. En que puedo ayudarte?',
    "fallbackMessage" TEXT NOT NULL DEFAULT 'No tengo esa informacion en este momento. Un agente te contactara pronto.',
    "maxRepliesPerContactPerDay" INTEGER NOT NULL DEFAULT 10,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutoReplyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutoReplyRule" (
    "id" SERIAL NOT NULL,
    "configId" INTEGER NOT NULL,
    "keywords" TEXT[],
    "answer" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAutoReplyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutoReplyLog" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "incomingMessage" TEXT NOT NULL,
    "replyMessage" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "ruleId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppAutoReplyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdGeneration" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "productId" INTEGER NOT NULL,
    "analysis" JSONB,
    "variations" JSONB NOT NULL,
    "imageUrls" TEXT[],
    "selectedIndex" INTEGER,
    "editorState" JSONB,
    "exportedImage" TEXT,
    "publishedTo" TEXT[],
    "publishStatus" JSONB,
    "publishedAt" TIMESTAMP(3),
    "tone" TEXT,
    "style" TEXT,
    "costUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySnapshot_organizationId_year_month_idx" ON "InventorySnapshot"("organizationId", "year", "month");

-- CreateIndex
CREATE INDEX "InventorySnapshot_companyId_year_month_idx" ON "InventorySnapshot"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "InventorySnapshot_snapshotType_idx" ON "InventorySnapshot"("snapshotType");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySnapshot_organizationId_companyId_year_month_key" ON "InventorySnapshot"("organizationId", "companyId", "year", "month");

-- CreateIndex
CREATE INDEX "PosStation_companyId_isActive_idx" ON "PosStation"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PosStation_companyId_stationCode_key" ON "PosStation"("companyId", "stationCode");

-- CreateIndex
CREATE INDEX "BillOfMaterials_companyId_productId_idx" ON "BillOfMaterials"("companyId", "productId");

-- CreateIndex
CREATE INDEX "BillOfMaterials_componentId_idx" ON "BillOfMaterials"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "BillOfMaterials_companyId_productId_componentId_key" ON "BillOfMaterials"("companyId", "productId", "componentId");

-- CreateIndex
CREATE INDEX "WorkOrder_companyId_status_idx" ON "WorkOrder"("companyId", "status");

-- CreateIndex
CREATE INDEX "WorkOrder_productId_idx" ON "WorkOrder"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_companyId_woNumber_key" ON "WorkOrder"("companyId", "woNumber");

-- CreateIndex
CREATE INDEX "ArchivedRestaurantTable_companyId_idx" ON "ArchivedRestaurantTable"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedRestaurantTable_originalId_idx" ON "ArchivedRestaurantTable"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedRestaurantTable_archivedAt_idx" ON "ArchivedRestaurantTable"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedKitchenStation_companyId_idx" ON "ArchivedKitchenStation"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedKitchenStation_originalId_idx" ON "ArchivedKitchenStation"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedKitchenStation_archivedAt_idx" ON "ArchivedKitchenStation"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedPosStation_companyId_idx" ON "ArchivedPosStation"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedPosStation_originalId_idx" ON "ArchivedPosStation"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedPosStation_archivedAt_idx" ON "ArchivedPosStation"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedBillOfMaterials_companyId_idx" ON "ArchivedBillOfMaterials"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedBillOfMaterials_originalId_idx" ON "ArchivedBillOfMaterials"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedBillOfMaterials_archivedAt_idx" ON "ArchivedBillOfMaterials"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedBillOfMaterials_productId_idx" ON "ArchivedBillOfMaterials"("productId");

-- CreateIndex
CREATE INDEX "ArchivedBillOfMaterials_componentId_idx" ON "ArchivedBillOfMaterials"("componentId");

-- CreateIndex
CREATE INDEX "ArchivedWorkOrder_companyId_idx" ON "ArchivedWorkOrder"("companyId");

-- CreateIndex
CREATE INDEX "ArchivedWorkOrder_originalId_idx" ON "ArchivedWorkOrder"("originalId");

-- CreateIndex
CREATE INDEX "ArchivedWorkOrder_archivedAt_idx" ON "ArchivedWorkOrder"("archivedAt");

-- CreateIndex
CREATE INDEX "ArchivedWorkOrder_productId_idx" ON "ArchivedWorkOrder"("productId");

-- CreateIndex
CREATE INDEX "CreditNote_organizationId_idx" ON "CreditNote"("organizationId");

-- CreateIndex
CREATE INDEX "CreditNote_originalSaleId_idx" ON "CreditNote"("originalSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_companyId_serie_correlativo_key" ON "CreditNote"("companyId", "serie", "correlativo");

-- CreateIndex
CREATE INDEX "HelpPerformanceLog_createdAt_idx" ON "HelpPerformanceLog"("createdAt");

-- CreateIndex
CREATE INDEX "HelpPerformanceLog_source_idx" ON "HelpPerformanceLog"("source");

-- CreateIndex
CREATE INDEX "JurisprudenceDocument_organizationId_companyId_idx" ON "JurisprudenceDocument"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "JurisprudenceDocument_organizationId_court_year_idx" ON "JurisprudenceDocument"("organizationId", "court", "year");

-- CreateIndex
CREATE INDEX "JurisprudenceDocument_processingStatus_idx" ON "JurisprudenceDocument"("processingStatus");

-- CreateIndex
CREATE INDEX "JurisprudenceDocument_fileHash_idx" ON "JurisprudenceDocument"("fileHash");

-- CreateIndex
CREATE INDEX "JurisprudenceDocument_deletedAt_idx" ON "JurisprudenceDocument"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "JurisprudenceDocument_organizationId_sourceUrl_fileHash_key" ON "JurisprudenceDocument"("organizationId", "sourceUrl", "fileHash");

-- CreateIndex
CREATE INDEX "JurisprudenceDocumentPage_documentId_idx" ON "JurisprudenceDocumentPage"("documentId");

-- CreateIndex
CREATE INDEX "JurisprudenceDocumentPage_ocrRequired_ocrCompleted_idx" ON "JurisprudenceDocumentPage"("ocrRequired", "ocrCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "JurisprudenceDocumentPage_documentId_pageNumber_key" ON "JurisprudenceDocumentPage"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "JurisprudenceDocumentSection_documentId_structureType_idx" ON "JurisprudenceDocumentSection"("documentId", "structureType");

-- CreateIndex
CREATE INDEX "JurisprudenceEmbedding_documentId_idx" ON "JurisprudenceEmbedding"("documentId");

-- CreateIndex
CREATE INDEX "JurisprudenceEmbedding_organizationId_companyId_idx" ON "JurisprudenceEmbedding"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "JurisprudenceEmbedding_embeddingModel_embeddingVersion_idx" ON "JurisprudenceEmbedding"("embeddingModel", "embeddingVersion");

-- CreateIndex
CREATE INDEX "JurisprudenceQuery_organizationId_userId_idx" ON "JurisprudenceQuery"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "JurisprudenceQuery_legalMatterId_idx" ON "JurisprudenceQuery"("legalMatterId");

-- CreateIndex
CREATE INDEX "JurisprudenceQuery_confidence_idx" ON "JurisprudenceQuery"("confidence");

-- CreateIndex
CREATE INDEX "JurisprudenceQuery_needsHumanReview_idx" ON "JurisprudenceQuery"("needsHumanReview");

-- CreateIndex
CREATE INDEX "JurisprudenceQuery_createdAt_idx" ON "JurisprudenceQuery"("createdAt");

-- CreateIndex
CREATE INDEX "JurisprudenceScrapeJob_status_idx" ON "JurisprudenceScrapeJob"("status");

-- CreateIndex
CREATE INDEX "JurisprudenceScrapeJob_organizationId_companyId_idx" ON "JurisprudenceScrapeJob"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "JurisprudenceScrapeJob_createdAt_idx" ON "JurisprudenceScrapeJob"("createdAt");

-- CreateIndex
CREATE INDEX "JurisprudenceOcrJob_status_idx" ON "JurisprudenceOcrJob"("status");

-- CreateIndex
CREATE INDEX "JurisprudenceOcrJob_organizationId_companyId_idx" ON "JurisprudenceOcrJob"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "JurisprudenceUsageStats_date_idx" ON "JurisprudenceUsageStats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JurisprudenceUsageStats_organizationId_companyId_date_key" ON "JurisprudenceUsageStats"("organizationId", "companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "JurisprudenceConfig_organizationId_key" ON "JurisprudenceConfig"("organizationId");

-- CreateIndex
CREATE INDEX "CalendarNote_organizationId_companyId_date_idx" ON "CalendarNote"("organizationId", "companyId", "date");

-- CreateIndex
CREATE INDEX "CalendarNote_reminderAt_reminderSent_idx" ON "CalendarNote"("reminderAt", "reminderSent");

-- CreateIndex
CREATE INDEX "CalendarNote_createdById_idx" ON "CalendarNote"("createdById");

-- CreateIndex
CREATE INDEX "GymMember_organizationId_companyId_idx" ON "GymMember"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymMember_companyId_status_idx" ON "GymMember"("companyId", "status");

-- CreateIndex
CREATE INDEX "GymMember_lastName_firstName_idx" ON "GymMember"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "GymMember_companyId_dni_key" ON "GymMember"("companyId", "dni");

-- CreateIndex
CREATE UNIQUE INDEX "GymMember_companyId_email_key" ON "GymMember"("companyId", "email");

-- CreateIndex
CREATE INDEX "GymMembership_companyId_status_idx" ON "GymMembership"("companyId", "status");

-- CreateIndex
CREATE INDEX "GymMembership_companyId_memberId_idx" ON "GymMembership"("companyId", "memberId");

-- CreateIndex
CREATE INDEX "GymMembership_endDate_idx" ON "GymMembership"("endDate");

-- CreateIndex
CREATE INDEX "GymMembership_status_endDate_idx" ON "GymMembership"("status", "endDate");

-- CreateIndex
CREATE INDEX "GymMembership_organizationId_companyId_idx" ON "GymMembership"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymCheckin_companyId_checkinAt_idx" ON "GymCheckin"("companyId", "checkinAt");

-- CreateIndex
CREATE INDEX "GymCheckin_memberId_checkinAt_idx" ON "GymCheckin"("memberId", "checkinAt");

-- CreateIndex
CREATE INDEX "GymCheckin_organizationId_companyId_idx" ON "GymCheckin"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymTrainer_companyId_status_idx" ON "GymTrainer"("companyId", "status");

-- CreateIndex
CREATE INDEX "GymTrainer_organizationId_companyId_idx" ON "GymTrainer"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymClass_companyId_isActive_idx" ON "GymClass"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "GymClass_organizationId_companyId_idx" ON "GymClass"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymClassSchedule_companyId_dayOfWeek_idx" ON "GymClassSchedule"("companyId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "GymClassSchedule_classId_idx" ON "GymClassSchedule"("classId");

-- CreateIndex
CREATE INDEX "GymClassSchedule_trainerId_idx" ON "GymClassSchedule"("trainerId");

-- CreateIndex
CREATE INDEX "GymClassSchedule_organizationId_companyId_idx" ON "GymClassSchedule"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "GymClassBooking_companyId_bookingDate_idx" ON "GymClassBooking"("companyId", "bookingDate");

-- CreateIndex
CREATE INDEX "GymClassBooking_memberId_idx" ON "GymClassBooking"("memberId");

-- CreateIndex
CREATE INDEX "GymClassBooking_organizationId_companyId_idx" ON "GymClassBooking"("organizationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "GymClassBooking_scheduleId_memberId_bookingDate_key" ON "GymClassBooking"("scheduleId", "memberId", "bookingDate");

-- CreateIndex
CREATE INDEX "WhatsAppSession_status_idx" ON "WhatsAppSession"("status");

-- CreateIndex
CREATE INDEX "WhatsAppSession_organizationId_companyId_idx" ON "WhatsAppSession"("organizationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppSession_organizationId_companyId_key" ON "WhatsAppSession"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_sessionId_idx" ON "WhatsAppMessage"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_remoteJid_idx" ON "WhatsAppMessage"("remoteJid");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_companyId_idx" ON "WhatsAppMessage"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_clientId_idx" ON "WhatsAppMessage"("clientId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_salesId_idx" ON "WhatsAppMessage"("salesId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_organizationId_companyId_idx" ON "WhatsAppTemplate"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_category_idx" ON "WhatsAppTemplate"("category");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_organizationId_companyId_name_key" ON "WhatsAppTemplate"("organizationId", "companyId", "name");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_sessionId_idx" ON "WhatsAppAutomation"("sessionId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_organizationId_companyId_idx" ON "WhatsAppAutomation"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_triggerEvent_idx" ON "WhatsAppAutomation"("triggerEvent");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_isActive_idx" ON "WhatsAppAutomation"("isActive");

-- CreateIndex
CREATE INDEX "WhatsAppAutomationLog_automationId_idx" ON "WhatsAppAutomationLog"("automationId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomationLog_executedAt_idx" ON "WhatsAppAutomationLog"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutoReplyConfig_organizationId_companyId_key" ON "WhatsAppAutoReplyConfig"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "WhatsAppAutoReplyRule_configId_idx" ON "WhatsAppAutoReplyRule"("configId");

-- CreateIndex
CREATE INDEX "WhatsAppAutoReplyLog_organizationId_companyId_createdAt_idx" ON "WhatsAppAutoReplyLog"("organizationId", "companyId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppAutoReplyLog_contactPhone_createdAt_idx" ON "WhatsAppAutoReplyLog"("contactPhone", "createdAt");

-- CreateIndex
CREATE INDEX "AdGeneration_organizationId_productId_idx" ON "AdGeneration"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "AdGeneration_productId_idx" ON "AdGeneration"("productId");

-- CreateIndex
CREATE INDEX "SocialAccount_organizationId_idx" ON "SocialAccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_organizationId_platform_accountId_key" ON "SocialAccount"("organizationId", "platform", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_organizationId_typeNumber_key" ON "Client"("organizationId", "typeNumber");

-- CreateIndex
CREATE INDEX "EntryDetailSeries_storeId_idx" ON "EntryDetailSeries"("storeId");

-- CreateIndex
CREATE INDEX "HelpEmbedding_organizationId_section_idx" ON "HelpEmbedding"("organizationId", "section");

-- CreateIndex
CREATE INDEX "HelpLearningSession_source_idx" ON "HelpLearningSession"("source");

-- CreateIndex
CREATE INDEX "HelpLearningSession_isMetaQuestion_idx" ON "HelpLearningSession"("isMetaQuestion");

-- CreateIndex
CREATE INDEX "HelpLearningSession_queryNorm_idx" ON "HelpLearningSession"("queryNorm");

-- CreateIndex
CREATE INDEX "HelpLearningSession_section_matchFound_timestamp_idx" ON "HelpLearningSession"("section", "matchFound", "timestamp");

-- CreateIndex
CREATE INDEX "HelpLearningSession_wasHelpful_timestamp_idx" ON "HelpLearningSession"("wasHelpful", "timestamp");

-- CreateIndex
CREATE INDEX "HelpMessage_conversationId_createdAt_idx" ON "HelpMessage"("conversationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "HelpMessage_section_source_feedback_idx" ON "HelpMessage"("section", "source", "feedback");

-- CreateIndex
CREATE INDEX "HelpMessage_role_feedback_idx" ON "HelpMessage"("role", "feedback");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceSales_verificationCode_key" ON "InvoiceSales"("verificationCode");

-- CreateIndex
CREATE INDEX "JournalEntry_organizationId_idx" ON "JournalEntry"("organizationId");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_idx" ON "JournalEntry"("companyId");

-- CreateIndex
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "JournalEntry_source_idx" ON "JournalEntry"("source");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_correlativo_organizationId_periodId_key" ON "JournalEntry"("correlativo", "organizationId", "periodId");

-- CreateIndex
CREATE INDEX "Sales_status_idx" ON "Sales"("status");

-- CreateIndex
CREATE INDEX "ShippingGuide_organizationId_createdAt_idx" ON "ShippingGuide"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "SunatTransmission_creditNoteId_idx" ON "SunatTransmission"("creditNoteId");

-- CreateIndex
CREATE INDEX "Transfer_shippingGuideId_idx" ON "Transfer"("shippingGuideId");

-- AddForeignKey
ALTER TABLE "SunatTransmission" ADD CONSTRAINT "SunatTransmission_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryDetailSeries" ADD CONSTRAINT "EntryDetailSeries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySnapshot" ADD CONSTRAINT "InventorySnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_shippingGuideId_fkey" FOREIGN KEY ("shippingGuideId") REFERENCES "ShippingGuide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosStation" ADD CONSTRAINT "PosStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfMaterials" ADD CONSTRAINT "BillOfMaterials_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedRestaurantTable" ADD CONSTRAINT "ArchivedRestaurantTable_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedRestaurantTable" ADD CONSTRAINT "ArchivedRestaurantTable_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedKitchenStation" ADD CONSTRAINT "ArchivedKitchenStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedKitchenStation" ADD CONSTRAINT "ArchivedKitchenStation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedPosStation" ADD CONSTRAINT "ArchivedPosStation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedBillOfMaterials" ADD CONSTRAINT "ArchivedBillOfMaterials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedWorkOrder" ADD CONSTRAINT "ArchivedWorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_originalSaleId_fkey" FOREIGN KEY ("originalSaleId") REFERENCES "Sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "InvoiceSales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingGuide" ADD CONSTRAINT "ShippingGuide_sourceStoreId_fkey" FOREIGN KEY ("sourceStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingGuide" ADD CONSTRAINT "ShippingGuide_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocument" ADD CONSTRAINT "JurisprudenceDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocument" ADD CONSTRAINT "JurisprudenceDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocument" ADD CONSTRAINT "JurisprudenceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocumentPage" ADD CONSTRAINT "JurisprudenceDocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "JurisprudenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocumentPage" ADD CONSTRAINT "JurisprudenceDocumentPage_ocrJobId_fkey" FOREIGN KEY ("ocrJobId") REFERENCES "JurisprudenceOcrJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceDocumentSection" ADD CONSTRAINT "JurisprudenceDocumentSection_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "JurisprudenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceEmbedding" ADD CONSTRAINT "JurisprudenceEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "JurisprudenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceQuery" ADD CONSTRAINT "JurisprudenceQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceQuery" ADD CONSTRAINT "JurisprudenceQuery_legalMatterId_fkey" FOREIGN KEY ("legalMatterId") REFERENCES "LegalMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceScrapeJob" ADD CONSTRAINT "JurisprudenceScrapeJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurisprudenceConfig" ADD CONSTRAINT "JurisprudenceConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMember" ADD CONSTRAINT "GymMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMember" ADD CONSTRAINT "GymMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembership" ADD CONSTRAINT "GymMembership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembership" ADD CONSTRAINT "GymMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymMembership" ADD CONSTRAINT "GymMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckin" ADD CONSTRAINT "GymCheckin_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckin" ADD CONSTRAINT "GymCheckin_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "GymMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckin" ADD CONSTRAINT "GymCheckin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymCheckin" ADD CONSTRAINT "GymCheckin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymTrainer" ADD CONSTRAINT "GymTrainer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymTrainer" ADD CONSTRAINT "GymTrainer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClass" ADD CONSTRAINT "GymClass_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "GymClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "GymTrainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassSchedule" ADD CONSTRAINT "GymClassSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "GymClassSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "GymMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymClassBooking" ADD CONSTRAINT "GymClassBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "Sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "InvoiceSales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "WhatsAppMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomationLog" ADD CONSTRAINT "WhatsAppAutomationLog_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "WhatsAppAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoReplyConfig" ADD CONSTRAINT "WhatsAppAutoReplyConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoReplyConfig" ADD CONSTRAINT "WhatsAppAutoReplyConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoReplyRule" ADD CONSTRAINT "WhatsAppAutoReplyRule_configId_fkey" FOREIGN KEY ("configId") REFERENCES "WhatsAppAutoReplyConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoReplyLog" ADD CONSTRAINT "WhatsAppAutoReplyLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutoReplyLog" ADD CONSTRAINT "WhatsAppAutoReplyLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdGeneration" ADD CONSTRAINT "AdGeneration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdGeneration" ADD CONSTRAINT "AdGeneration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

