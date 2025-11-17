-- Ensure Category uniqueness is scoped to organizationId
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Category_name_key'
  ) THEN
    EXECUTE 'DROP INDEX "Category_name_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Category_organizationId_name_key'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX "Category_organizationId_name_key" ON "Category"("organizationId", "name")';
  END IF;
END $$;
