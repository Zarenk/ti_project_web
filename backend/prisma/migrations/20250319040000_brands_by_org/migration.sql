-- Add organization scoping for brands (guarded if Brand table exists)
DO $$
BEGIN
  IF to_regclass('public."Brand"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Brand'
        AND column_name = 'organizationId'
    ) THEN
      ALTER TABLE "Brand" ADD COLUMN "organizationId" INTEGER;
    END IF;

    -- Drop global unique index on name so brands can repeat across orgs
    DROP INDEX IF EXISTS "Brand_name_key";

    -- Add org scoping and indexes
    CREATE UNIQUE INDEX IF NOT EXISTS "Brand_organizationId_name_key" ON "Brand"("organizationId", "name");
    CREATE INDEX IF NOT EXISTS "Brand_organizationId_idx" ON "Brand"("organizationId");

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'Brand_organizationId_fkey'
    ) THEN
      ALTER TABLE "Brand"
        ADD CONSTRAINT "Brand_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
