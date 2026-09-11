-- Additive production migration for the view deduplication release.
-- Existing historical views retain NULL keys and are not deleted.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "ProductView" ADD COLUMN "dedupKey" TEXT;
CREATE UNIQUE INDEX "ProductView_dedupKey_key" ON "ProductView"("dedupKey");
COMMIT;
