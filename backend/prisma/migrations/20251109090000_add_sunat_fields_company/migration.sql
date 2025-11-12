-- Add SUNAT credential fields per company to support multi-tenant configuration
ALTER TABLE "Company"
    ADD COLUMN "sunatEnvironment" TEXT NOT NULL DEFAULT 'BETA',
    ADD COLUMN "sunatRuc" TEXT,
    ADD COLUMN "sunatSolUserBeta" TEXT,
    ADD COLUMN "sunatSolPasswordBeta" TEXT,
    ADD COLUMN "sunatCertPathBeta" TEXT,
    ADD COLUMN "sunatKeyPathBeta" TEXT,
    ADD COLUMN "sunatSolUserProd" TEXT,
    ADD COLUMN "sunatSolPasswordProd" TEXT,
    ADD COLUMN "sunatCertPathProd" TEXT,
    ADD COLUMN "sunatKeyPathProd" TEXT;
