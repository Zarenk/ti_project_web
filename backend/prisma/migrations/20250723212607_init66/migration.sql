/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Orders_code_key" ON "Orders"("code");
