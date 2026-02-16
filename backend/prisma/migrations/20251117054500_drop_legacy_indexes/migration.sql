-- Drop legacy indexes that enforced global uniqueness outside Prisma schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'CatalogCover_isActive_idx'
  ) THEN
    EXECUTE 'DROP INDEX "CatalogCover_isActive_idx"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'EntryDetailSeries_serial_key'
  ) THEN
    EXECUTE 'DROP INDEX "EntryDetailSeries_serial_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'InvoiceSales_tipoComprobante_serie_nroCorrelativo_key'
  ) THEN
    EXECUTE 'DROP INDEX "InvoiceSales_tipoComprobante_serie_nroCorrelativo_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'Product_name_key'
  ) THEN
    EXECUTE 'DROP INDEX "Product_name_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'TipoCambio_fecha_moneda_key'
  ) THEN
    EXECUTE 'DROP INDEX "TipoCambio_fecha_moneda_key"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'TipoCambio_fecha_moneda_idx'
  ) THEN
    EXECUTE 'DROP INDEX "TipoCambio_fecha_moneda_idx"';
  END IF;
END $$;
