-- DropForeignKey
ALTER TABLE "EntryDetail" DROP CONSTRAINT "EntryDetail_entryId_fkey";

-- AddForeignKey
ALTER TABLE "EntryDetail" ADD CONSTRAINT "EntryDetail_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
