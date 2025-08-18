-- CreateEnum
CREATE TYPE "TemplateVersion" AS ENUM ('V1', 'V2');

-- CreateEnum
CREATE TYPE "PublishAdapter" AS ENUM ('LOCAL_STUB');

-- CreateTable
CREATE TABLE "Org" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "version" "TemplateVersion" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "creativeId" INTEGER NOT NULL,
    "uri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishTarget" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "adapter" "PublishAdapter" NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PublishTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishTargetLog" (
    "id" SERIAL NOT NULL,
    "publishTargetId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "runId" INTEGER,

    CONSTRAINT "PublishTargetLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Org_name_deletedAt_key" ON "Org"("name", "deletedAt");

-- CreateIndex
CREATE INDEX "Campaign_orgId_idx" ON "Campaign"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_orgId_name_deletedAt_key" ON "Campaign"("orgId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "Template_campaignId_idx" ON "Template"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_campaignId_version_deletedAt_key" ON "Template"("campaignId", "version", "deletedAt");

-- CreateIndex
CREATE INDEX "Creative_campaignId_idx" ON "Creative"("campaignId");

-- CreateIndex
CREATE INDEX "Creative_templateId_idx" ON "Creative"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "Creative_campaignId_name_deletedAt_key" ON "Creative"("campaignId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "Run_campaignId_idx" ON "Run"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Run_campaignId_name_deletedAt_key" ON "Run"("campaignId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "Asset_runId_idx" ON "Asset"("runId");

-- CreateIndex
CREATE INDEX "Asset_creativeId_idx" ON "Asset"("creativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_runId_uri_deletedAt_key" ON "Asset"("runId", "uri", "deletedAt");

-- CreateIndex
CREATE INDEX "PublishTarget_orgId_idx" ON "PublishTarget"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishTarget_orgId_name_deletedAt_key" ON "PublishTarget"("orgId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "PublishTargetLog_publishTargetId_idx" ON "PublishTargetLog"("publishTargetId");

-- CreateIndex
CREATE INDEX "PublishTargetLog_assetId_idx" ON "PublishTargetLog"("assetId");

-- CreateIndex
CREATE INDEX "PublishTargetLog_runId_idx" ON "PublishTargetLog"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishTargetLog_publishTargetId_assetId_deletedAt_key" ON "PublishTargetLog"("publishTargetId", "assetId", "deletedAt");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishTarget" ADD CONSTRAINT "PublishTarget_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishTargetLog" ADD CONSTRAINT "PublishTargetLog_publishTargetId_fkey" FOREIGN KEY ("publishTargetId") REFERENCES "PublishTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishTargetLog" ADD CONSTRAINT "PublishTargetLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishTargetLog" ADD CONSTRAINT "PublishTargetLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE SET NULL ON UPDATE CASCADE;
