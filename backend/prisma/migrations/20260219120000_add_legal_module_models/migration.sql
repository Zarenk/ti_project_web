-- CreateEnum
CREATE TYPE "LegalMatterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED', 'CLOSED', 'WON', 'LOST', 'SETTLED');

-- CreateEnum
CREATE TYPE "LegalArea" AS ENUM ('CIVIL', 'PENAL', 'LABORAL', 'COMERCIAL', 'TRIBUTARIO', 'ADMINISTRATIVO', 'CONSTITUCIONAL', 'FAMILIA', 'AMBIENTAL', 'ADUANERO', 'MIGRATORIO', 'OTRO');

-- CreateEnum
CREATE TYPE "LegalMatterPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LegalPartyRole" AS ENUM ('DEMANDANTE', 'DEMANDADO', 'TERCERO', 'LITISCONSORTE', 'MINISTERIO_PUBLICO', 'TESTIGO', 'PERITO', 'OTRO');

-- CreateEnum
CREATE TYPE "LegalEventType" AS ENUM ('AUDIENCIA', 'PLAZO_PROCESAL', 'NOTIFICACION', 'DILIGENCIA', 'VENCIMIENTO', 'RESOLUCION', 'SENTENCIA', 'APELACION', 'CASACION', 'OTRO');

-- CreateEnum
CREATE TYPE "LegalEventStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('DEMANDA', 'CONTESTACION', 'RECURSO', 'ESCRITO', 'RESOLUCION', 'SENTENCIA', 'CARTA_NOTARIAL', 'CONTRATO', 'PODER', 'ACTA', 'PERICIA', 'DICTAMEN', 'OTRO');

-- AlterEnum
ALTER TYPE "BusinessVertical" ADD VALUE 'LAW_FIRM';

-- CreateTable
CREATE TABLE "LegalMatter" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "companyId" INTEGER,
    "title" TEXT NOT NULL,
    "internalCode" TEXT,
    "externalCode" TEXT,
    "description" TEXT,
    "area" "LegalArea" NOT NULL DEFAULT 'CIVIL',
    "status" "LegalMatterStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "LegalMatterPriority" NOT NULL DEFAULT 'MEDIUM',
    "court" TEXT,
    "judge" TEXT,
    "jurisdiction" TEXT,
    "caseValue" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "nextDeadline" TIMESTAMP(3),
    "assignedToId" INTEGER,
    "clientId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalMatter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalMatterParty" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "role" "LegalPartyRole" NOT NULL DEFAULT 'OTRO',
    "name" TEXT NOT NULL,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "lawyerName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalMatterParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "type" "LegalDocumentType" NOT NULL DEFAULT 'OTRO',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "filePath" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "sha256Hash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" INTEGER,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEvent" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "type" "LegalEventType" NOT NULL DEFAULT 'OTRO',
    "status" "LegalEventStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalTimeEntry" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalNote" (
    "id" SERIAL NOT NULL,
    "matterId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalMatter_organizationId_companyId_idx" ON "LegalMatter"("organizationId", "companyId");

-- CreateIndex
CREATE INDEX "LegalMatter_status_idx" ON "LegalMatter"("status");

-- CreateIndex
CREATE INDEX "LegalMatter_area_idx" ON "LegalMatter"("area");

-- CreateIndex
CREATE INDEX "LegalMatter_assignedToId_idx" ON "LegalMatter"("assignedToId");

-- CreateIndex
CREATE INDEX "LegalMatter_clientId_idx" ON "LegalMatter"("clientId");

-- CreateIndex
CREATE INDEX "LegalMatter_nextDeadline_idx" ON "LegalMatter"("nextDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "LegalMatter_organizationId_internalCode_key" ON "LegalMatter"("organizationId", "internalCode");

-- CreateIndex
CREATE INDEX "LegalMatterParty_matterId_idx" ON "LegalMatterParty"("matterId");

-- CreateIndex
CREATE INDEX "LegalMatterParty_documentNumber_idx" ON "LegalMatterParty"("documentNumber");

-- CreateIndex
CREATE INDEX "LegalDocument_matterId_idx" ON "LegalDocument"("matterId");

-- CreateIndex
CREATE INDEX "LegalDocument_organizationId_idx" ON "LegalDocument"("organizationId");

-- CreateIndex
CREATE INDEX "LegalDocument_type_idx" ON "LegalDocument"("type");

-- CreateIndex
CREATE INDEX "LegalDocument_parentId_idx" ON "LegalDocument"("parentId");

-- CreateIndex
CREATE INDEX "LegalEvent_matterId_idx" ON "LegalEvent"("matterId");

-- CreateIndex
CREATE INDEX "LegalEvent_scheduledAt_idx" ON "LegalEvent"("scheduledAt");

-- CreateIndex
CREATE INDEX "LegalEvent_status_idx" ON "LegalEvent"("status");

-- CreateIndex
CREATE INDEX "LegalEvent_assignedToId_idx" ON "LegalEvent"("assignedToId");

-- CreateIndex
CREATE INDEX "LegalEvent_type_idx" ON "LegalEvent"("type");

-- CreateIndex
CREATE INDEX "LegalTimeEntry_matterId_idx" ON "LegalTimeEntry"("matterId");

-- CreateIndex
CREATE INDEX "LegalTimeEntry_userId_idx" ON "LegalTimeEntry"("userId");

-- CreateIndex
CREATE INDEX "LegalTimeEntry_date_idx" ON "LegalTimeEntry"("date");

-- CreateIndex
CREATE INDEX "LegalTimeEntry_billable_idx" ON "LegalTimeEntry"("billable");

-- CreateIndex
CREATE INDEX "LegalNote_matterId_idx" ON "LegalNote"("matterId");

-- CreateIndex
CREATE INDEX "LegalNote_createdById_idx" ON "LegalNote"("createdById");

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalMatterParty" ADD CONSTRAINT "LegalMatterParty_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvent" ADD CONSTRAINT "LegalEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvent" ADD CONSTRAINT "LegalEvent_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvent" ADD CONSTRAINT "LegalEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTimeEntry" ADD CONSTRAINT "LegalTimeEntry_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalTimeEntry" ADD CONSTRAINT "LegalTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNote" ADD CONSTRAINT "LegalNote_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNote" ADD CONSTRAINT "LegalNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
