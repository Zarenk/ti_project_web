-- AlterTable: Add payment enforcement fields to Subscription
-- paymentEnforced: marks new orgs (public signup) as subject to auto-charge and graduated blocking
-- pastDueSince: explicit delinquency timestamp for grace tier calculation

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "paymentEnforced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pastDueSince" TIMESTAMP(3);
